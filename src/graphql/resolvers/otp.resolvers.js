import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { sendEmail } from "../../services/mailService.js";
import { getTemplate } from "../../utils/index.js";
import jwt from "jsonwebtoken";
import {
    GENERIC_OTP_SEND_MESSAGE,
    GENERIC_OTP_VERIFY_MESSAGE,
    checkRateLimit,
    getClientIp,
    isLocked,
    lockKey,
    unlockKey,
    randomJti,
} from "../../utils/security.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_FAILS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;
const OTP_LOCK_MESSAGE =
    "Too many failed attempts. Please try again after 15 minutes.";

function failKey(email) {
    return `otp:fail:${String(email).toLowerCase()}`;
}

/** Count a failure; lock + return true when the limit is reached. */
function recordOtpFailure(email) {
    const key = failKey(email);
    const check = checkRateLimit(key, OTP_MAX_FAILS, OTP_LOCK_MS);
    if (!check.allowed || check.remaining === 0) {
        lockKey(key, OTP_LOCK_MS);
        return true;
    }
    return false;
}

async function isOtpCodeValid(inputCode, storedCode) {
    const input = String(inputCode || "").trim();
    if (!input || !storedCode) return false;
    if (
        storedCode.startsWith("$2a$") ||
        storedCode.startsWith("$2b$") ||
        storedCode.startsWith("$2y$")
    ) {
        try {
            return await bcrypt.compare(input, storedCode);
        } catch {
            return false;
        }
    }
    // Legacy plaintext rows (pre-hash migration): timing-safe compare.
    const a = Buffer.from(input);
    const b = Buffer.from(String(storedCode));
    if (a.length !== b.length) {
        try {
            await bcrypt.compare(
                input,
                "$2b$10$C6UzMDM/HZSRv9oJcS1B8u6FHJ2BvGxY3QwErTyUiOpAsDfGhJkL012",
            );
        } catch {
            /* ignore */
        }
        return false;
    }
    try {
        return crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

export const OTPResolvers = {
    Mutation: {
        sendOTP: async (_, { email }, context) => {
            try {
                const req = context?.req;
                const ip = getClientIp(req);
                const normalized = String(email || "").toLowerCase().trim();

                const ipCheck = checkRateLimit(
                    `otp:send:ip:${ip}`,
                    20,
                    60 * 60 * 1000,
                );
                if (!ipCheck.allowed) {
                    return {
                        success: false,
                        message: `Too many OTP requests. Please try again after ${ipCheck.retryAfterSec}s.`,
                    };
                }
                const emailCheck = checkRateLimit(
                    `otp:send:email:${normalized}`,
                    5,
                    60 * 60 * 1000,
                );
                if (!emailCheck.allowed) {
                    return {
                        success: false,
                        message: `Too many OTP requests. Please try again after ${emailCheck.retryAfterSec}s.`,
                    };
                }

                const dummyExpiresAt = new Date(Date.now() + OTP_TTL_MS);
                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user) {
                    // Anti-enumeration: same success shape, no email sent.
                    return {
                        success: true,
                        message: GENERIC_OTP_SEND_MESSAGE,
                        expiresAt: dummyExpiresAt,
                    };
                }

                // Secure random 6-digit code (not Math.random).
                const otp = String(crypto.randomInt(100000, 1000000));
                const expiresAt = new Date(Date.now() + OTP_TTL_MS);
                const codeHash = await bcrypt.hash(otp, 10);

                // Invalidate previous codes so only the latest is valid.
                await prisma.oTP.deleteMany({ where: { email } });
                const created = await prisma.oTP.create({
                    data: {
                        email,
                        code: codeHash,
                        expiresAt,
                    },
                });

                const html = getTemplate(
                    "sendOtp.html",
                    {
                        OTP: otp,
                        YEAR: new Date().getFullYear(),
                        SUPPORT_EMAIL: "support@technews.com",
                    },
                    "src/template-html",
                );

                try {
                    await sendEmail({
                        to: email,
                        subject: "Your OTP Code",
                        text: `[TechNews] Your OTP Code: ${otp}\nThis code is valid for 5 minutes.\nIf you did not request this, please ignore this email.\nSupport: support@technews.com`,
                        html,
                    });
                } catch (mailErr) {
                    // If sending email fails, delete the OTP to avoid stranded codes;
                    // log the actual error for production debugging.
                    await prisma.oTP.deleteMany({ where: { id: created.id } });
                    console.error(
                        `Error sending OTP email: ${String(mailErr?.message || mailErr).slice(0, 300)}`,
                    );
                    return {
                        success: false,
                        message:
                            "Failed to send email. Please try again later.",
                    };
                }

                return {
                    success: true,
                    message: GENERIC_OTP_SEND_MESSAGE,
                    expiresAt,
                };
            } catch {
                console.error("Error sending OTP");
                return { success: false, message: "Server error" };
            }
        },
        verifyOTP: async (_, { email, code }, context) => {
            try {
                const req = context?.req;
                const ip = getClientIp(req);
                const normalized = String(email || "").toLowerCase().trim();
                const key = failKey(normalized);

                if (isLocked(key)) {
                    return {
                        success: false,
                        message: OTP_LOCK_MESSAGE,
                    };
                }

                const ipCheck = checkRateLimit(
                    `otp:verify:ip:${ip}`,
                    30,
                    15 * 60 * 1000,
                );
                if (!ipCheck.allowed) {
                    return {
                        success: false,
                        message: `Too many attempts. Please try again after ${ipCheck.retryAfterSec}s.`,
                    };
                }

                const record = await prisma.oTP.findFirst({
                    where: { email },
                    orderBy: { createdAt: "desc" },
                });

                if (!record) {
                    const locked = recordOtpFailure(normalized);
                    return {
                        success: false,
                        message: locked
                            ? OTP_LOCK_MESSAGE
                            : GENERIC_OTP_VERIFY_MESSAGE,
                    };
                }

                if (record.expiresAt < new Date()) {
                    await prisma.oTP.delete({ where: { id: record.id } });
                    const locked = recordOtpFailure(normalized);
                    return {
                        success: false,
                        message: locked
                            ? OTP_LOCK_MESSAGE
                            : GENERIC_OTP_VERIFY_MESSAGE,
                    };
                }

                const ok = await isOtpCodeValid(code, record.code);
                if (!ok) {
                    const locked = recordOtpFailure(normalized);
                    return {
                        success: false,
                        message: locked
                            ? OTP_LOCK_MESSAGE
                            : GENERIC_OTP_VERIFY_MESSAGE,
                    };
                }

                unlockKey(key);
                // Consume: mark verified then remove all codes for this email
                // so each code is single-use.
                await prisma.oTP.deleteMany({ where: { email } });

                const jti = randomJti();
                const resetToken = jwt.sign(
                    { email, jti },
                    process.env.RESET_SECRET,
                    {
                        expiresIn: "5m",
                        algorithm: "HS256",
                    },
                );

                await prisma.passwordResetToken.create({
                    data: {
                        jti,
                        email,
                        expiresAt: new Date(Date.now() + OTP_TTL_MS),
                    },
                });

                return { success: true, message: "OTP verified", resetToken };
            } catch {
                console.error("OTP verify error");
                return { success: false, message: "Server error" };
            }
        },
    },
};
