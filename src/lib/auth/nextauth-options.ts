import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("MissingCredentials");
        }

        const userRecs = await db.select().from(users).where(eq(users.username, credentials.username));
        const user = userRecs[0];

        if (!user) throw new Error("UserNotFound");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("InvalidPassword");

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock_google_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_google_secret",
      authorization: { params: { prompt: "select_account" } },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "mock_fb_id",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "mock_fb_secret",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "mock_apple_id",
      clientSecret: process.env.APPLE_SECRET || "mock_apple_secret",
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "mock_ms_id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "mock_ms_secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "mock_tenant",
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async signIn() {
      return true;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 giờ = 1 ca làm việc
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_homepro_12345!@#",
  pages: {
    signIn: '/pwr/station/login',
    error: '/pwr/station/login',
  }
};
