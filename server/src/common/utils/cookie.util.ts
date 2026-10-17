import { Response } from 'express';
import { env } from '../../config/env.config';

export const AUTH_COOKIE = 'access_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    maxAge: SEVEN_DAYS_MS,
    path: '/',
  });
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  });
};
