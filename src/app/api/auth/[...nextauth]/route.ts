import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const userRecs = await db.select().from(users).where(eq(users.username, credentials.username));
        const user = userRecs[0];
        
        if (!user) return null;
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        
        return { 
          id: user.id.toString(), 
          name: user.name, 
          email: user.email, 
          // You can attach more fields to JWT here if needed
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock_google_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_google_secret",
      authorization: {
        params: {
          prompt: "select_account", // Fix Flaw #1: Force account selection on shared devices
        },
      },
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
      authorization: {
        params: {
          prompt: "select_account", // Fix Flaw #1 for MS as well
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Fix Flaw #2 (Database Pollution):
      // Here we will eventually intercept the sign-in and check the `pwrStationUsers` table.
      // If the email does not exist, we redirect to a custom challenge page (Invite Code).
      // For now, we allow it to pass so the UI buttons work and trigger the flow.
      return true; 
    },
    async session({ session, token }) {
      // Fix Flaw #4 (Shift Turnover):
      // We limit the session lifetime to exactly 8 hours to prevent the next shift 
      // from accidentally using the previous worker's account.
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours = length of 1 factory shift
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_homepro_12345!@#",
  pages: {
    signIn: '/pwr/station/login',
    error: '/pwr/station/login', // Redirect back on error (Fix Flaw #3: Fallback UI)
  }
});

export { handler as GET, handler as POST };
