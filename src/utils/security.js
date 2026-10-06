// src/utils/security.js
// Central security helpers: rate-limit, password policy, sanitization.
import crypto from "crypto";

// ---------------------------------------------------------------------------
// In-memory rate limiter (single-instance). For multi-instance deployments,
// replace with Redis (same key format: `rl:<scope>:<id>`).
// ---------------------------------------------------------------------------
const buckets = new Map(); // key -> { count, resetAt }
const locks = new Map(); // key -> lockedUntil (ms epoch)

function now() {
    return Date.now();
}

function getBucket(key, windowMs) {
    const entry = buckets.get(key);
    if (!entry || entry.resetAt <= now()) {
        const fresh = { count: 0, resetAt: now() + windowMs };
        buckets.set(key, fresh);
        return fresh;
    }
    return entry;
}

/**
 * Sliding fixed-window check.
 * @returns {{ allowed: boolean, remaining: number, retryAfterSec: number }}
 */
export function checkRateLimit(key, limit, windowMs) {
    const bucket = getBucket(key, windowMs);
    if (bucket.count >= limit) {
        const retryAfterSec = Math.max(
            1,
            Math.ceil((bucket.resetAt - now()) / 1000),
        );
        return { allowed: false, remaining: 0, retryAfterSec };
    }
    bucket.count += 1;
    return {
        allowed: true,
        remaining: Math.max(0, limit - bucket.count),
        retryAfterSec: 0,
    };
}

export function isLocked(key) {
    const until = locks.get(key);
    if (!until) return false;
    if (until <= now()) {
        locks.delete(key);
        return false;
    }
    return true;
}

export function lockKey(key, blockMs) {
    locks.set(key, now() + blockMs);
}

export function unlockKey(key) {
    locks.delete(key);
}

// Periodic cleanup to avoid unbounded growth (best-effort).
if (typeof setInterval !== "undefined") {
    const timer = setInterval(() => {
        const t = now();
        for (const [k, v] of buckets) {
            if (v.resetAt <= t) buckets.delete(k);
        }
        for (const [k, until] of locks) {
            if (until <= t) locks.delete(k);
        }
    }, 5 * 60 * 1000);
    // Don't keep the process alive just for cleanup.
    if (typeof timer.unref === "function") timer.unref();
}

// ---------------------------------------------------------------------------
// Client IP (works behind 1 trusted proxy; app should set trust proxy
// appropriately or run behind a proxy that sets x-forwarded-for).
// ---------------------------------------------------------------------------
export function getClientIp(req) {
    if (!req) return "unknown";
    const xff = req.headers?.["x-forwarded-for"];
    if (typeof xff === "string" && xff.length > 0) {
        return xff.split(",")[0].trim().slice(0, 64);
    }
    const ip =
        req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress;
    return String(ip || "unknown").slice(0, 64);
}

// ---------------------------------------------------------------------------
// Password policy: 8+ chars, upper + lower + digit (server-side enforce).
// ---------------------------------------------------------------------------
export function validatePasswordPolicy(password) {
    if (typeof password !== "string" || password.length < 8) {
        return {
            ok: false,
            message: "Password must be at least 8 characters long.",
        };
    }
    if (password.length > 128) {
        return { ok: false, message: "Password is too long." };
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
        return {
            ok: false,
            message: "Password must contain both uppercase and lowercase letters.",
        };
    }
    if (!/[0-9]/.test(password)) {
        return { ok: false, message: "Password must contain at least 1 digit." };
    }
    return { ok: true };
}

export const BCRYPT_COST = 12;

// ---------------------------------------------------------------------------
// Input sanitization for contact / profile fields.
// ---------------------------------------------------------------------------
export function stripHtml(input, maxLength) {
    if (typeof input !== "string") return "";
    // Remove tags, decode nothing (keep simple + deterministic).
    let out = input.replace(/<[^>]*>/g, "");
    out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    out = out.trim();
    if (typeof maxLength === "number" && out.length > maxLength) {
        out = out.slice(0, maxLength);
    }
    return out;
}

export function isValidEmail(email) {
    if (typeof email !== "string") return false;
    if (email.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// Token hashing (store only hashes server-side).
// ---------------------------------------------------------------------------
export function sha256Hex(value) {
    return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function randomJti() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");
}

// ---------------------------------------------------------------------------
// Generic messages (anti user-enumeration). Keep identical wording for
// existent vs non-existent accounts.
// ---------------------------------------------------------------------------
export const GENERIC_AUTH_MESSAGE = "Invalid email or password.";
export const GENERIC_OTP_SEND_MESSAGE =
    "If the email exists, an OTP has been sent. Please check your inbox.";
export const GENERIC_OTP_VERIFY_MESSAGE =
    "Invalid or expired OTP code.";
