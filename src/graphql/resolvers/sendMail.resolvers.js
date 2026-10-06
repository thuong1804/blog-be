import { sendEmail } from "../../services/mailService.js";
import { getTemplate } from "../../utils/index.js";
import {
    checkRateLimit,
    getClientIp,
    isValidEmail,
    stripHtml,
} from "../../utils/security.js";

function sanitizeContactField(value, max) {
    return stripHtml(value, max);
}

export const sendMailResolvers = {
    Mutation: {
        contact: async (_, { name, email, phone, subject, message }, context) => {
            try {
                const rl = checkRateLimit(
                    `contact:ip:${getClientIp(context?.req)}`,
                    10,
                    60 * 60 * 1000,
                );
                if (!rl.allowed) {
                    return false;
                }
                if (!isValidEmail(email)) return false;

                const safeName = sanitizeContactField(name, 100);
                const safeSubject = sanitizeContactField(subject, 200);
                const safeMessage = sanitizeContactField(message, 2000);
                const safePhone = phone
                    ? sanitizeContactField(phone, 30)
                    : "N/A";

                if (
                    !safeName ||
                    !safeSubject ||
                    !safeMessage ||
                    safeMessage.length === 0
                ) {
                    return false;
                }

                await sendEmail({
                    to: process.env.EMAIL_USER,
                    subject: `📩 Contact: ${safeSubject}`,
                    html: `
            <h3>New contact message</h3>
            <p><b>Name:</b> ${safeName}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${safePhone}</p>
            <p><b>Message:</b></p>
            <p>${safeMessage}</p>
          `,
                });
                return true;
            } catch (err) {
                console.error("Contact send error");
                return false;
            }
        },
        subscribeSubmit: async (_, { email }, context) => {
            try {
                const rl = checkRateLimit(
                    `subscribe:ip:${getClientIp(context?.req)}`,
                    10,
                    60 * 60 * 1000,
                );
                if (!rl.allowed) {
                    return false;
                }
                if (!isValidEmail(email)) return false;
                const htmlContent = getTemplate(
                    "welcomeTemplate.html",
                    {
                        year: new Date().getFullYear(),
                    },
                    "src/template-html",
                );

                await sendEmail({
                    to: email,
                    subject: "🎉 Thanks for subscribing to our newsletter!",
                    html: htmlContent,
                });

                return true;
            } catch (err) {
                console.error("Subscribe send error");
                return false;
            }
        },
    },
};
