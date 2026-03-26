import NextAuth, { User, Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword, upgradePasswordHash, hashPassword } from '@/lib/password-service';

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

        // --- DEMO ACCOUNT JIT PROVISIONING ---
        // Ensure the test@test.ai account exists so demo logins work reliably
        if (normalizedEmail === 'test@test.ai') {
          try {
            const demoUser = await prisma.user.findUnique({ where: { email: 'test@test.ai' } });
            if (!demoUser) {
              const hashedPassword = await hashPassword('test');
              await prisma.user.create({
                data: {
                  email: 'test@test.ai',
                  password: hashedPassword,
                  name: 'Demo Architect',
                  role: 'USER',
                  passwordHashAlgorithm: 'argon2id', // Use Argon2id for new demo account
                }
              });
              console.log('Demo user test@test.ai auto-created for the database.');
            }
          } catch (e) {
            console.error('Failed to auto-provision demo user:', e);
          }
        }
        // ------------------------------------

        // Standard logic for all users
        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              role: true,
              passwordHashAlgorithm: true,
              credits: true,
            },
          });

          if (!user || !user.password) {
            return null;
          }

          // Verify password with algorithm-aware verification
          const algorithm = (user.passwordHashAlgorithm || 'bcrypt') as 'bcrypt' | 'argon2id';
          const { valid, needsUpgrade } = await verifyPassword(
            inputPassword,
            user.password,
            algorithm
          );

          if (!valid) return null;

          // Transparent password upgrade (non-blocking)
          if (needsUpgrade) {
            upgradePasswordHash(user.id, inputPassword).catch((error) => {
              console.error('Failed to upgrade password hash:', error);
              // Don't block login if upgrade fails
            });
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            credits: user.credits,
          } as any;
        } catch (dbError) {
          console.error("Database connection failure during authorization:", dbError);
          return null; // Force graceful "Invalid Credentials" rejection securely
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.isSuperuser = (user as any).isSuperuser;
        token.isTestUser = (user as any).isTestUser;
        token.credits = (user as any).credits;
      }
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).isSuperuser = !!token.isSuperuser;
        (session.user as any).isTestUser = !!token.isTestUser;
        (session.user as any).credits = token.credits as number;
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
