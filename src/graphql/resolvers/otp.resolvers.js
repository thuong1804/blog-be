import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import "dotenv/config";
import { sendEmail } from "../../services/mailService.js";
import { getTemplate } from "../../utils/index.js";
import jwt from "jsonwebtoken";

export const OTPResolvers = {
    Mutation: {
        sendOTP: async (_, { email }) => {
            try {
                const user = await prisma.user.findUnique({ where: { email } });

                if (!user) {
                    return { success: false, message: "Email not registered" };
                }

                const otp = Math.floor(
                    100000 + Math.random() * 900000,
                ).toString();
                const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

                await prisma.oTP.create({
                    data: {
                        email,
                        code: otp,
                        expiresAt: expiresAt,
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

                await sendEmail({
                    to: email,
                    subject: "Your OTP Code",
                    text: `[TechNews] Your OTP Code: ${otp}\nThis code is valid for 5 minutes.\nIf you did not request this, please ignore this email.\nSupport: support@technews.com`,
                    html: html,
                });

                return {
                    success: true,
                    message: "OTP sent successfully",
                    expiresAt,
                };
            } catch (error) {
                console.error("Error sending OTP:", error);
                return { success: false, message: "Server error" };
            }
        },
        verifyOTP: async (_, { email, code }) => {
            try {
                const record = await prisma.oTP.findFirst({
                    where: { email, code },
                    orderBy: { createdAt: "desc" },
                });

                if (!record) {
                    return { success: false, message: "OTP invalid" };
                }

                if (record.expiresAt < new Date()) {
                    return { success: false, message: "OTP expired" };
                }

                const resetToken = jwt.sign(
                    { email },
                    process.env.RESET_SECRET,
                    {
                        expiresIn: "5m",
                    },
                );

                await prisma.oTP.update({
                    where: { id: record.id },
                    data: { verified: true },
                });

                return { success: true, message: "OTP verified", resetToken };
            } catch (err) {
                console.error(err);
                return { success: false, message: "Server error" };
            }
        },
    },
};
