import nodemailer from "nodemailer";
import "dotenv/config";

export function normalizeAppPassword(pass) {
    return String(pass || "").replace(/\s+/g, "");
}

export function getMailConfig() {
    const smtpHost = (process.env.MAIL_HOST || "").trim();

    if (smtpHost) {
        const port = Number(process.env.MAIL_PORT || 587);
        const user = (process.env.MAIL_USER || "").trim();
        const pass = String(process.env.MAIL_PASS || "");
        if (!user || !pass) return { configured: false };
        return {
            configured: true,
            provider: `smtp:${smtpHost}:${port}`,
            from:
                process.env.MAIL_FROM ||
                `"${process.env.MAIL_FROM_NAME || "TechNews"}" <${user}>`,
            transport: {
                host: smtpHost,
                port,
                secure:
                    String(
                        process.env.MAIL_SECURE || "",
                    ).toLowerCase() === "true" || port === 465,
                auth: { user, pass },
                connectionTimeout: 10_000,
                greetingTimeout: 10_000,
                socketTimeout: 20_000,
                pool: true,
                maxConnections: 3,
            },
        };
    }

    const user = (process.env.EMAIL_USER || "").trim();
    const pass = normalizeAppPassword(process.env.EMAIL_PASS);
    if (!user || !pass) return { configured: false };
    return {
        configured: true,
        provider: "gmail",
        from: `"${process.env.MAIL_FROM_NAME || "TechNews"}" <${user}>`,
        transport: {
            service: "gmail",
            auth: { user, pass },
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,
            pool: true,
            maxConnections: 3,
        },
    };
}

let cachedTransporter = null;
let cachedProvider = null;
let verifyLogged = false;

function getTransporter() {
    const cfg = getMailConfig();
    if (!cfg.configured) return null;
    if (cachedTransporter && cachedProvider === cfg.provider) {
        return cachedTransporter;
    }
    cachedTransporter = nodemailer.createTransport(cfg.transport);
    cachedProvider = cfg.provider;
    verifyLogged = false;
    return cachedTransporter;
}

async function ensureVerified(transporter, provider) {
    if (verifyLogged) return;
    verifyLogged = true;
    try {
        await transporter.verify();
        console.log(`[mail] SMTP ready (provider=${provider})`);
    } catch (err) {
        const msg = String(err?.message || err);
        if (/Invalid login|Username and password not accepted|535/i.test(msg)) {
            console.error(
                "[mail] SMTP auth failed. If using Gmail: enable 2-Step Verification, " +
                    "create a new App Password, and copy the 16 characters directly (without spaces) into EMAIL_PASS.",
            );
        } else {
            console.error(`[mail] SMTP verify failed (${provider}): ${msg}`);
        }
        throw err;
    }
}

export const sendEmail = async ({ to, subject, text, html }) => {
    const cfg = getMailConfig();
    if (!cfg.configured) {
        if (process.env.NODE_ENV === "production") {
            throw new Error(
                "Mail is not configured (missing MAIL_HOST/MAIL_USER/MAIL_PASS or EMAIL_USER/EMAIL_PASS).",
            );
        }
        // Dev: runs without mail configuration, prints to console instead of sending.
        console.warn(
            `[mail:dev] SMTP not configured. To=${to} Subject=${subject} Text=${text || ""}`,
        );
        return { dev: true };
    }

    const transporter = getTransporter();
    await ensureVerified(transporter, cfg.provider);

    const info = await transporter.sendMail({
        from: cfg.from,
        to,
        subject,
        text,
        html,
    });

    console.log("Message sent: %s", info.messageId);
    return info;
};
