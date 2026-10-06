import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import "dotenv/config";
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from "../../middleware/auth.js";
import {
    BCRYPT_COST,
    GENERIC_AUTH_MESSAGE,
    checkRateLimit,
    getClientIp,
    isValidEmail,
    sha256Hex,
    validatePasswordPolicy,
} from "../../utils/security.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
const { TokenExpiredError } = jwt;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Dummy hash for timing-equalized "user not found" path (bcrypt cost 10,
// precomputed for "$2b$10$dummy..."). Compared when email doesn't exist so
// response time doesn't reveal account existence.
const DUMMY_HASH =
    "$2b$10$C6UzMDM/HZSRv9oJcS1B8u6FHJ2BvGxY3QwErTyUiOpAsDfGhJkL012";

async function issueTokenPair(userId, extraAccessClaims = {}) {
    const token = generateAccessToken({
        userId,
        email: extraAccessClaims.email,
        provider: extraAccessClaims.provider,
    });
    const refreshToken = generateRefreshToken({ userId });
    const decoded = jwt.decode(refreshToken);
    const jti =
        decoded && typeof decoded === "object" && decoded.jti
            ? String(decoded.jti)
            : null;
    const expSec =
        decoded && typeof decoded === "object" && decoded.exp
            ? Number(decoded.exp)
            : Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    if (jti) {
        await prisma.refreshToken.create({
            data: {
                jti,
                userId,
                tokenHash: sha256Hex(refreshToken),
                expiresAt: new Date(expSec * 1000),
            },
        });
    }
    return { token, refreshToken };
}

async function revokeAllUserRefreshTokens(userId) {
    await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
    });
}

function loginRateLimited(context) {
    const req = context?.req;
    const ip = getClientIp(req);
    const ipCheck = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipCheck.allowed) {
        throw new Error(
            `Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau ${ipCheck.retryAfterSec}s.`,
        );
    }
}

export const authResolvers = {
    Mutation: {
        login: async (_, { email, password }, context) => {
            try {
                loginRateLimited(context);
                const ip = getClientIp(context?.req);
                const emailKey = String(email || "").toLowerCase();
                const emailCheck = checkRateLimit(
                    `login:email:${emailKey}:${ip}`,
                    10,
                    15 * 60 * 1000,
                );
                if (!emailCheck.allowed) {
                    throw new Error(
                        `Quá nhiều lần thử. Vui lòng thử lại sau ${emailCheck.retryAfterSec}s.`,
                    );
                }

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.password) {
                    // Timing-equalize + generic message (anti user-enumeration).
                    try {
                        await bcrypt.compare(password || "", DUMMY_HASH);
                    } catch {
                        /* ignore */
                    }
                    throw new Error(GENERIC_AUTH_MESSAGE);
                }

                const valid = await bcrypt.compare(password, user.password);
                if (!valid) {
                    throw new Error(GENERIC_AUTH_MESSAGE);
                }

                const provider = await prisma.oAuthAccount.findFirst({
                    where: { userId: user.id },
                });

                const { token, refreshToken } = await issueTokenPair(user.id, {
                    email: user.email,
                    provider: provider?.provider,
                });

                return { token, refreshToken, user };
            } catch (error) {
                // Never log passwords / PII.
                console.error("Login error");
                throw new Error(error.message || "Login failed");
            }
        },
        signup: async (_, args, context) => {
            const { email, password, name, handle } = args;

            const ip = getClientIp(context?.req);
            const rl = checkRateLimit(`signup:ip:${ip}`, 10, 60 * 60 * 1000);
            if (!rl.allowed) {
                throw new Error(
                    `Tạo tài khoản quá nhiều. Vui lòng thử lại sau ${rl.retryAfterSec}s.`,
                );
            }

            if (!isValidEmail(email)) {
                throw new Error("Email không hợp lệ.");
            }
            const policy = validatePasswordPolicy(password);
            if (!policy.ok) {
                throw new Error(policy.message);
            }

            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                throw new Error("Email already registered");
            }

            if (handle) {
                const existingHandle = await prisma.user.findUnique({
                    where: { handle },
                });
                if (existingHandle) {
                    throw new Error("Handle already taken");
                }
            }

            const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

            let finalHandle = handle;
            if (!finalHandle) {
                finalHandle = email.split("@")[0];
                const taken = await prisma.user.findUnique({
                    where: { handle: finalHandle },
                });
                if (taken) {
                    finalHandle = `${finalHandle}-${Date.now().toString(36)}`;
                }
            }

            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    handle: finalHandle,
                },
            });

            await prisma.oAuthAccount.create({
                data: {
                    provider: "credentials",
                    providerAccountId: email,
                    userId: user.id,
                },
            });

            const { token, refreshToken } = await issueTokenPair(user.id, {
                email: user.email,
                provider: "credentials",
            });

            return {
                user,
                token,
                refreshToken,
            };
        },
        loginWithGoogle: async (_, { idToken }) => {
            if (!idToken || typeof idToken !== "string") {
                throw new Error("Đăng nhập Google thất bại.");
            }
            const expectedAud = process.env.GOOGLE_CLIENT_ID;
            if (!expectedAud) {
                console.error("Google login misconfigured");
                throw new Error("Đăng nhập Google thất bại.");
            }
            let payload;
            try {
                const ticket = await client.verifyIdToken({
                    idToken,
                    audience: expectedAud,
                });
                payload = ticket.getPayload();
            } catch {
                throw new Error("Đăng nhập Google thất bại.");
            }
            if (!payload) throw new Error("Đăng nhập Google thất bại.");

            // Explicit verify (defense-in-depth even though the library
            // already checks aud/iss/exp).
            const nowSec = Math.floor(Date.now() / 1000);
            if (payload.aud !== expectedAud) {
                throw new Error("Đăng nhập Google thất bại.");
            }
            const issOk =
                payload.iss === "accounts.google.com" ||
                payload.iss === "https://accounts.google.com";
            if (!issOk) {
                throw new Error("Đăng nhập Google thất bại.");
            }
            if (!payload.exp || Number(payload.exp) <= nowSec) {
                throw new Error("Đăng nhập Google thất bại.");
            }
            if (
                payload.email_verified !== undefined &&
                payload.email_verified !== true &&
                payload.email_verified !== "true"
            ) {
                throw new Error("Đăng nhập Google thất bại.");
            }

            const { sub: googleId, email, name, picture } = payload;
            if (!googleId || !email) {
                throw new Error("Đăng nhập Google thất bại.");
            }

            let account = await prisma.oAuthAccount.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "google",
                        providerAccountId: googleId,
                    },
                },
                include: { user: true },
            });

            let user;

            if (account) {
                user = account.user;
            } else {
                user = await prisma.user.findUnique({ where: { email } });

                if (!user) {
                    let handle = email.split("@")[0];
                    const taken = await prisma.user.findUnique({
                        where: { handle },
                    });
                    if (taken) {
                        handle = `${handle}-${Date.now().toString(36)}`;
                    }
                    user = await prisma.user.create({
                        data: {
                            email,
                            name,
                            avatar: picture,
                            handle,
                            password: null,
                        },
                    });
                }

                account = await prisma.oAuthAccount.create({
                    data: {
                        provider: "google",
                        providerAccountId: googleId,
                        userId: user.id,
                    },
                });
            }

            const { token, refreshToken } = await issueTokenPair(user.id, {
                email: user.email,
                provider: account.provider,
            });

            return { user, token, refreshToken };
        },
        changePassword: async (
            _,
            { email, password, oldPassword, newPassword, id },
            context,
        ) => {
            try {
                // New contract: authenticated via token; `newPassword`
                // preferred, `password` kept as deprecated alias.
                // Old contract (email+password, unauthenticated) kept as
                // deprecated fallback until FE migrates.
                const nextPassword = newPassword || password;
                if (!nextPassword) {
                    return {
                        success: false,
                        message: "Mật khẩu mới không hợp lệ.",
                    };
                }
                const policy = validatePasswordPolicy(nextPassword);
                if (!policy.ok) {
                    return { success: false, message: policy.message };
                }

                const authed = context?.user?.userId
                    ? { userId: context.user.userId }
                    : null;

                if (authed) {
                    const user = await prisma.user.findUnique({
                        where: { id: authed.userId },
                    });
                    if (!user) {
                        return {
                            success: false,
                            message: "Đổi mật khẩu thất bại.",
                        };
                    }
                    if (oldPassword && user.password) {
                        const ok = await bcrypt.compare(
                            oldPassword,
                            user.password,
                        );
                        if (!ok) {
                            return {
                                success: false,
                                message: "Mật khẩu cũ không đúng.",
                            };
                        }
                    }
                    const hashedPassword = await bcrypt.hash(
                        nextPassword,
                        BCRYPT_COST,
                    );
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { password: hashedPassword },
                    });
                    return {
                        success: true,
                        message: "Change password success",
                    };
                }

                // Deprecated unauthenticated fallback (rate-limited).
                const req = context?.req;
                const rl = checkRateLimit(
                    `changepw:ip:${getClientIp(req)}`,
                    10,
                    15 * 60 * 1000,
                );
                if (!rl.allowed) {
                    return {
                        success: false,
                        message: "Quá nhiều lần thử. Vui lòng thử lại sau.",
                    };
                }
                // Accept legacy `id` variable name from the old FE document
                // (it sent id instead of email due to a contract mismatch).
                let targetEmail = email;
                if (!targetEmail && id !== undefined && id !== null) {
                    const byId = await prisma.user.findUnique({
                        where: { id: Number(id) },
                    });
                    targetEmail = byId?.email;
                }
                if (!targetEmail) {
                    return {
                        success: false,
                        message: "Đổi mật khẩu thất bại.",
                    };
                }
                const hashedPassword = await bcrypt.hash(
                    nextPassword,
                    BCRYPT_COST,
                );
                await prisma.user.update({
                    where: { email: targetEmail },
                    data: { password: hashedPassword },
                });

                return {
                    success: true,
                    message: "Change password success",
                };
            } catch {
                console.error("Update user error");
                return {
                    success: false,
                    message: "Failed to update user details",
                };
            }
        },
        resetPassword: async (_, { token, newPassword }, context) => {
            try {
                const req = context?.req;
                const rl = checkRateLimit(
                    `resetpw:ip:${getClientIp(req)}`,
                    10,
                    15 * 60 * 1000,
                );
                if (!rl.allowed) {
                    return {
                        success: false,
                        message: "Quá nhiều lần thử. Vui lòng thử lại sau.",
                    };
                }
                const policy = validatePasswordPolicy(newPassword);
                if (!policy.ok) {
                    return { success: false, message: policy.message };
                }
                let decoded;
                try {
                    decoded = jwt.verify(token, process.env.RESET_SECRET, {
                        algorithms: ["HS256"],
                    });
                } catch (err) {
                    if (err instanceof TokenExpiredError) {
                        return { success: false, message: "Token expired" };
                    }
                    return {
                        success: false,
                        message: "Invalid or expired token",
                    };
                }

                if (
                    !decoded ||
                    typeof decoded !== "object" ||
                    !("email" in decoded) ||
                    !("jti" in decoded)
                ) {
                    return {
                        success: false,
                        message: "Invalid or expired token",
                    };
                }

                const email = decoded.email;
                const jti = String(decoded.jti);

                // Single-use + real expiry enforced server-side.
                const stored = await prisma.passwordResetToken.findUnique({
                    where: { jti },
                });
                if (
                    !stored ||
                    stored.used ||
                    stored.email !== email ||
                    stored.expiresAt < new Date()
                ) {
                    return {
                        success: false,
                        message: "Invalid or expired token",
                    };
                }

                const hashedPassword = await bcrypt.hash(
                    newPassword,
                    BCRYPT_COST,
                );

                await prisma.user.update({
                    where: { email },
                    data: { password: hashedPassword },
                });

                await prisma.passwordResetToken.update({
                    where: { jti },
                    data: { used: true },
                });
                // Invalidate any other outstanding reset tokens + sessions.
                await prisma.passwordResetToken.updateMany({
                    where: { email, used: false },
                    data: { used: true },
                });
                const target = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true },
                });
                if (target) {
                    await revokeAllUserRefreshTokens(target.id);
                    await prisma.oTP.deleteMany({ where: { email } });
                }

                return { success: true, message: "Password reset success" };
            } catch {
                console.error("Reset password error");
                return { success: false, message: "Failed to reset password" };
            }
        },
        validatePassword: async (
            _,
            { email, password, id },
            context,
        ) => {
            try {
                if (!password) {
                    return {
                        success: false,
                        message: "Email and password are required",
                    };
                }

                // Prefer token identity; fall back to legacy email/id args.
                let targetId = context?.user?.userId
                    ? Number(context.user.userId)
                    : null;
                let user = null;
                if (targetId) {
                    user = await prisma.user.findUnique({
                        where: { id: targetId },
                        select: { password: true },
                    });
                } else {
                    if (id !== undefined && id !== null) {
                        user = await prisma.user.findUnique({
                            where: { id: Number(id) },
                            select: { password: true },
                        });
                    } else if (email) {
                        user = await prisma.user.findUnique({
                            where: { email },
                            select: { password: true },
                        });
                    }
                }

                if (!user?.password) {
                    return {
                        success: false,
                        message: "Mật khẩu không đúng.",
                    };
                }

                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return {
                        success: false,
                        message: "Mật khẩu không đúng.",
                    };
                }

                return {
                    success: true,
                    message: "Password is correct",
                };
            } catch {
                console.error("Error validating password");
                return {
                    success: false,
                    message: "An error occurred while validating the password",
                };
            }
        },
        refreshToken: async (_, { refreshToken }, context) => {
            const req = context?.req;
            const rl = checkRateLimit(
                `refresh:ip:${getClientIp(req)}`,
                60,
                15 * 60 * 1000,
            );
            if (!rl.allowed) {
                throw new Error("Quá nhiều lần thử. Vui lòng thử lại sau.");
            }
            try {
                const decoded = await verifyRefreshToken(refreshToken);
                const incomingHash = sha256Hex(refreshToken);
                const stored = await prisma.refreshToken.findUnique({
                    where: { tokenHash: incomingHash },
                });

                if (!stored || stored.revoked || stored.expiresAt < new Date()) {
                    // Possible reuse: valid JWT whose DB row is gone/revoked.
                    const reuseJti =
                        decoded && decoded.jti ? String(decoded.jti) : null;
                    if (reuseJti) {
                        const known = await prisma.refreshToken.findUnique({
                            where: { jti: reuseJti },
                        });
                        if (known) {
                            // Reuse detected -> revoke entire chain.
                            await revokeAllUserRefreshTokens(known.userId);
                        }
                    }
                    throw new Error("Refresh token expired or invalid");
                }

                const user = await prisma.user.findUnique({
                    where: { id: stored.userId },
                });

                if (!user) throw new Error("User not found");

                // Rotate: revoke old, issue new pair.
                const pair = await issueTokenPair(user.id, {
                    email: user.email,
                });
                const newDecoded = jwt.decode(pair.refreshToken);
                const newJti =
                    newDecoded && typeof newDecoded === "object"
                        ? String(newDecoded.jti)
                        : null;
                await prisma.refreshToken.update({
                    where: { id: stored.id },
                    data: { revoked: true, replacedBy: newJti },
                });

                return {
                    token: pair.token,
                    refreshToken: pair.refreshToken,
                    user,
                };
            } catch {
                throw new Error("Refresh token expired or invalid");
            }
        },
        logout: async (_, { refreshToken }) => {
            try {
                if (!refreshToken) return false;
                const hash = sha256Hex(refreshToken);
                await prisma.refreshToken.updateMany({
                    where: { tokenHash: hash, revoked: false },
                    data: { revoked: true },
                });
                return true;
            } catch {
                return true;
            }
        },
    },
};
