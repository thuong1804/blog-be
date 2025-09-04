import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();

export const generateAccessToken = ({...user}) => {
  return jwt.sign({...user }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET_REFRESH, {
    expiresIn: "7d",
  });
};

export const verifyRefreshToken = async (refreshToken) => {
  const privateKey = process.env.ACCESS_TOKEN_SECRET_REFRESH;
    try {
        const tokenDetails = jwt.verify(refreshToken, privateKey);
        return tokenDetails
    } catch (error) {
        console.error('Error:', error);
        return Promise.reject({ error: true, message: "Invalid refresh token" });
    }
}

export const getUserFromToken = (authHeader) => {
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return decoded; // { userId, email, ... }
    } catch (err) {
        console.error("Invalid token:", err.message);
        return null;
    }
};
