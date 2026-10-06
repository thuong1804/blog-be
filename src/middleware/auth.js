import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

export const JWT_ISSUER = process.env.JWT_ISSUER || "blog-tech";
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "blog-fe";
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

function getSecret(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env ${name}`);
    }
    return value;
}

function warnIfWeakSecret(name, value) {
    // Require >= 32 bytes of entropy. Plain ASCII strings count 1 byte/char.
    const bytes = Buffer.byteLength(value, "utf8");
    if (bytes < 32) {
        console.warn(
            `[security] ${name} is weaker than 32 bytes (${bytes} bytes). ` +
                "Set a random >=32-byte secret. See .env.sample.",
        );
    }
}

try {
    if (process.env.ACCESS_TOKEN_SECRET) {
        warnIfWeakSecret(
            "ACCESS_TOKEN_SECRET",
            process.env.ACCESS_TOKEN_SECRET,
        );
    }
    if (process.env.ACCESS_TOKEN_SECRET_REFRESH) {
        warnIfWeakSecret(
            "ACCESS_TOKEN_SECRET_REFRESH",
            process.env.ACCESS_TOKEN_SECRET_REFRESH,
        );
    }
    if (process.env.RESET_SECRET) {
        warnIfWeakSecret("RESET_SECRET", process.env.RESET_SECRET);
    }
} catch {
    // never crash import on warn path
}

function baseSignOptions() {
    return {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        algorithm: "HS256",
    };
}

export const generateAccessToken = (payload) => {
    const secret = getSecret("ACCESS_TOKEN_SECRET");
    const { userId, email, provider } = payload || {};
    if (!userId) throw new Error("generateAccessToken: userId required");
    return jwt.sign(
        { userId, email: email || undefined, provider: provider || undefined },
        secret,
        { ...baseSignOptions(), expiresIn: ACCESS_TTL },
    );
};

export const generateRefreshToken = (payload) => {
    const secret = getSecret("ACCESS_TOKEN_SECRET_REFRESH");
    const userId = typeof payload === "object" ? payload?.userId : payload;
    if (!userId) throw new Error("generateRefreshToken: userId required");
    return jwt.sign({ userId, jti: randomJti() }, secret, {
        ...baseSignOptions(),
        expiresIn: REFRESH_TTL,
    });
};

function randomJti() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : crypto.randomBytes(16).toString("hex");
}

function verifyWithClaims(token, secret) {
    // Pin algorithm; check iss/aud only when the token carries them so
    // legacy tokens issued before iss/aud rollout still verify, while new
    // tokens with a wrong iss/aud are rejected.
    const decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (decoded && typeof decoded === "object") {
        if (
            decoded.iss !== undefined &&
            decoded.iss !== JWT_ISSUER
        ) {
            throw new jwt.JsonWebTokenError("invalid issuer");
        }
        if (decoded.aud !== undefined) {
            const aud = decoded.aud;
            const ok = Array.isArray(aud)
                ? aud.includes(JWT_AUDIENCE)
                : aud === JWT_AUDIENCE;
            if (!ok) throw new jwt.JsonWebTokenError("invalid audience");
        }
    }
    return decoded;
}

export const verifyAccessToken = (token) => {
    const secret = getSecret("ACCESS_TOKEN_SECRET");
    return verifyWithClaims(token, secret);
};

export const verifyRefreshToken = async (refreshToken) => {
    const privateKey = getSecret("ACCESS_TOKEN_SECRET_REFRESH");
    try {
        const tokenDetails = verifyWithClaims(refreshToken, privateKey);
        return tokenDetails;
    } catch (error) {
        return Promise.reject({
            error: true,
            message: "Invalid refresh token",
        });
    }
};

function parseCookies(cookieHeader) {
    const out = {};
    if (!cookieHeader) return out;
    const parts = String(cookieHeader).split(";");
    for (const part of parts) {
        const idx = part.indexOf("=");
        if (idx === -1) continue;
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key) out[key] = decodeURIComponent(val);
    }
    return out;
}

export function extractBearerToken(req) {
    if (!req) return null;
    const header =
        req.headers?.authorization || req.headers?.Authorization || "";
    if (typeof header === "string" && header.startsWith("Bearer ")) {
        const token = header.slice("Bearer ".length).trim();
        if (token) return token;
    }
    // httpOnly cookie fallback (Apollo client uses credentials: "include").
    const cookies =
        req.cookies && typeof req.cookies === "object"
            ? req.cookies
            : parseCookies(req.headers?.cookie);
    if (cookies?.accessToken) return String(cookies.accessToken);
    return null;
}

export const getUserFromToken = (authHeaderOrToken) => {
    if (!authHeaderOrToken) return null;

    let token = String(authHeaderOrToken).trim();
    if (token.startsWith("Bearer ")) {
        token = token.slice("Bearer ".length).trim();
    }
    if (!token) return null;

    try {
        const decoded = verifyAccessToken(token);
        return decoded; // { userId, email, provider, iat, exp, iss, aud }
    } catch {
        return null;
    }
};

export function getUserFromRequest(req) {
    const token = extractBearerToken(req);
    if (!token) return null;
    try {
        return verifyAccessToken(token);
    } catch {
        return null;
    }
}

/** Throw a GraphQL auth error when the request is unauthenticated. */
export function requireAuth(context) {
    const user = context?.user;
    if (!user?.userId) {
        throw new Error("Unauthorized. Vui lòng đăng nhập.");
    }
    return user;
}
