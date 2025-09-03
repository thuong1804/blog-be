import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from "google-auth-library";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
import 'dotenv/config'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../middleware/auth.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authResolvers = {
  Mutation: {
    login: async (_, { email, password }) => {
      try {
        if (password.length < 8 || password.length > 15) {
          throw new Error("Password must be between 8 and 15 characters");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          throw new Error("User not found");
        }

        const provider = await prisma.oAuthAccount.findUnique({ where: {
          provider_providerAccountId: {
            provider: "credentials",
            providerAccountId: email,
          },
        }});

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error("Invalid password");
        }

        const token = generateAccessToken({ userId: user.id, email: user.email, provider: provider.provider })
        const refreshToken = generateRefreshToken({ userId: user.id})

        return { token, refreshToken, user };
      } catch (error) {
        console.error("Login error:", error);
        throw new Error(error.message || "Login failed");
      }
    },
    signup: async (_, args) => {
      const { email, password, name, handle } = args;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error("Email already registered");
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let finalHandle = handle;

      if (!finalHandle) {
        finalHandle = email.split("@")[0];
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

      const token = jwt.sign(
        { userId: user.id,},
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      return {
        user,
        token,
      };
    },
    loginWithGoogle: async (_, { idToken }) => {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      const { sub: googleId, email, name, picture } = payload;

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

      const token = jwt.sign({ userId: user.id, provider: account.provider}, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      return { user, token };
    },
    changePassword: async (_, { id, password }) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id },
          data: { password: hashedPassword },
        });

        return {
          success: true,
          message: "Change password success",
        };
      } catch (err) {
        console.error("Update user error:", err);
        return {
          success: false,
          message: "Failed to update user details",
        };
      }
    },
    validatePassword: async (_, { id, password }) => {
      try {
        if (!id || !password) {
          return {
            success: false,
            message: "User ID and password are required",
          };
        }

        const user = await prisma.user.findUnique({
          where: { id },
          select: { password: true },
        });

        if (!user) {
          return {
            success: false,
            message: "User not found",
          };
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return {
            success: false,
            message: "Invalid password",
          };
        }

        return {
          success: true,
          message: "Password is correct",
        };
      } catch (err) {
        console.error("Error validating password:", err);
        return {
          success: false,
          message: "An error occurred while validating the password",
        };
      }
    },
    refreshToken: async (_, { refreshToken }) => {
      try {
        const decoded = verifyRefreshToken(refreshToken)

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) throw new Error("User not found");

        const newAccessToken = generateRefreshToken(user);

        return {
          token: newAccessToken,
          user,
        };
      } catch (err) {
        throw new Error("Invalid refresh token");
      }
    }
  }
}