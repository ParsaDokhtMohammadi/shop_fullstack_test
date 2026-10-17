import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';

export interface JwtPayload {
  sub: string; // user id
  phoneNumber: string;
  role: string;
}

// Pinned on both sides rather than left to the default, so signing and
// verifying cannot drift apart later. This is hygiene, not a fix: jsonwebtoken
// already refuses `alg: none` and refuses an asymmetric algorithm against a
// string secret, so there is no algorithm-confusion hole to close — but
// without this, a token asking for HS384 verifies happily, and the only reason
// that is harmless today is that nothing here ever signs one.
const ALGORITHM: jwt.Algorithm = 'HS256';

// The shortest secret worth having. jsonwebtoken will sign with "abc" without
// complaint, and an HMAC key that short can be brute-forced offline from a
// single captured cookie — which here means minting an admin session.
const MIN_SECRET_LENGTH = 32;

const logger = new Logger('Jwt');

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.jwt.secret, {
    algorithm: ALGORITHM,
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, env.jwt.secret, {
      algorithms: [ALGORITHM],
    }) as JwtPayload;
  } catch {
    return null;
  }
};

// Called once from main.ts, before the app is built. Every JWT
// misconfiguration here is fatal but invisible until someone tries to log in:
// an empty secret makes sign() throw, and so does a JWT_EXPIRES_IN of "7dd".
// Both turn into a 500 on the login endpoint of a server that started up
// looking perfectly healthy, which is the same failure mode SmsModule and
// PaymentsModule already refuse to allow.
//
// Deliberately not thrown from a module provider: the seed scripts boot
// AppModule and never sign a token, and asking someone to generate a JWT
// secret before they can create the first admin would be a pointless wall.
export const assertJwtConfig = (): void => {
  if (!env.jwt.secret)
    throw new Error(
      'JWT_SECRET is empty — nobody can log in without it. Generate one with:\n' +
        `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );

  if (env.jwt.secret.length < MIN_SECRET_LENGTH) {
    const tooShort = `JWT_SECRET is ${env.jwt.secret.length} characters; use at least ${MIN_SECRET_LENGTH}. A short HMAC key can be recovered offline from one captured session cookie, and forging a token here means forging an admin.`;

    // Fatal in production, a warning in development: a throwaway secret is a
    // reasonable thing to have on a laptop, and never a reasonable thing to
    // deploy.
    if (env.isProduction) throw new Error(tooShort);
    logger.warn(tooShort);
  }

  // Signs and verifies a throwaway token with the real settings. The explicit
  // checks above cannot catch a malformed JWT_EXPIRES_IN, and only the library
  // knows what it accepts — so the cheapest honest test is to do it once.
  try {
    const probe = signToken({ sub: 'boot-check', phoneNumber: '', role: '' });
    if (!verifyToken(probe)) throw new Error('the token did not verify');
  } catch (error) {
    throw new Error(
      `JWT configuration is unusable — logging in would fail: ${(error as Error).message}`,
    );
  }
};
