import { CookieOptions } from "express";
import { env } from "./env.js";

export const ACCESS_TOKEN_COOKIE = "accessToken";
export const REFRESH_TOKEN_COOKIE = "refreshToken";

export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const baseCookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
  maxAge,
});

export const accessTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions(ACCESS_TOKEN_MAX_AGE);

export const refreshTokenCookieOptions = (): CookieOptions =>
  baseCookieOptions(REFRESH_TOKEN_MAX_AGE);

export const clearCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
});
