/**
 * Password Service
 *
 * Handles password hashing with support for transparent migration from bcrypt to Argon2id.
 * Uses OWASP-recommended Argon2id for new passwords and existing bcrypt passwords.
 */

import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Argon2id configuration (OWASP recommended)
const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2, // 2 iterations
  parallelism: 1,
};

export type HashAlgorithm = 'bcrypt' | 'argon2id';

export interface VerificationResult {
  valid: boolean;
  needsUpgrade: boolean;
}

/**
 * Hashes a password using Argon2id (for new users and upgrades).
 *
 * @param plainPassword - The plain text password
 * @returns Hashed password string
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hash = await argon2.hash(plainPassword, ARGON2_CONFIG);
    return hash;
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Verifies a password against a hash, supporting both bcrypt and Argon2id.
 * Returns whether the password is valid and if the hash needs upgrading.
 *
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The stored hash
 * @param algorithm - The hashing algorithm used ('bcrypt' or 'argon2id')
 * @returns Object with validation result and upgrade recommendation
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  algorithm: HashAlgorithm
): Promise<VerificationResult> {
  try {
    let valid = false;

    if (algorithm === 'bcrypt') {
      // Verify with bcrypt
      valid = await bcrypt.compare(plainPassword, hashedPassword);

      return {
        valid,
        needsUpgrade: valid, // If valid, recommend upgrade to Argon2id
      };
    } else if (algorithm === 'argon2id') {
      // Verify with Argon2id
      valid = await argon2.verify(hashedPassword, plainPassword);

      // Check if the hash needs rehashing (e.g., if cost parameters changed)
      const needsRehash = valid && argon2.needsRehash(hashedPassword, ARGON2_CONFIG);

      return {
        valid,
        needsUpgrade: needsRehash,
      };
    } else {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }
  } catch (error) {
    // If verification fails (e.g., invalid hash format), return invalid
    console.error('Password verification error:', error);
    return {
      valid: false,
      needsUpgrade: false,
    };
  }
}

/**
 * Upgrades a user's password hash from bcrypt to Argon2id.
 * This should be called in the background after successful login.
 *
 * @param userId - The user ID
 * @param plainPassword - The plain text password (from login attempt)
 * @returns True if upgrade was successful
 */
export async function upgradePasswordHash(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  try {
    // Hash with Argon2id
    const newHash = await hashPassword(plainPassword);

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        passwordHashAlgorithm: 'argon2id',
      },
    });

    console.log(`Password hash upgraded to Argon2id for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to upgrade password hash:', error);
    return false;
  }
}

/**
 * Hashes a password using bcrypt (for backward compatibility testing only).
 * NOT recommended for production use - use hashPassword() instead.
 *
 * @deprecated Use hashPassword() for Argon2id
 * @param plainPassword - The plain text password
 * @returns Hashed password string
 */
export async function hashPasswordBcrypt(plainPassword: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Checks if a password meets minimum security requirements.
 *
 * @param password - The password to validate
 * @returns Object with validation result and error message if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one letter',
    };
  }

  return { valid: true };
}
