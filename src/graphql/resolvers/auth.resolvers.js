import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from "google-auth-library";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
import 'dotenv/config'

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

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          throw new Error("Invalid password");
        }

        const token = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );

        return { token, user };
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

      const token = jwt.sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      return { user, token };
    }
  }
}