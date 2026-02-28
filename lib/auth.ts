import NextAuth, { User, Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const normalizedEmail = (credentials.email as string).toLowerCase().trim();
        const inputPassword = credentials.password as string;

        console.log(`Bypass check for: ${normalizedEmail}`);

        // ZERO SECURITY BYPASS - AS REQUESTED
        if (
          (normalizedEmail === 'dualaryan@gmail.com' || normalizedEmail === 'dualarian@gmail.com') &&
          inputPassword === 'password'
        ) {
          console.log("Aryan Bypass triggered");
          return {
            id: 'aryan-fixed-id',
            email: 'dualaryan@gmail.com',
            name: 'Aryan',
            role: 'ADMIN',
          } as any;
        }

        if (normalizedEmail === 'admin@example.com' && inputPassword === 'admin123') {
          console.log("Admin Bypass triggered");
          return {
            id: 'admin-fixed-id',
            email: 'admin@example.com',
            name: 'Admin',
            role: 'ADMIN',
          } as any;
        }

        // Standard logic as fallback
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(inputPassword, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: (user as any).role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
});
