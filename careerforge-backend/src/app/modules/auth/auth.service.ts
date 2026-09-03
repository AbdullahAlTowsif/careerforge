import bcrypt from "bcrypt";
import { Response } from "express";
import type { HydratedDocument } from "mongoose";
import { User } from "../user/user.model.js";
import AppError from "../../errorHelpers/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../config/jwt.js";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  clearCookieOptions,
  refreshTokenCookieOptions,
} from "../../config/cookie.js";
import type { RegisterUserInput, LoginUserInput } from "../user/user.validation.js";
import type { IAuthUser } from "./auth.interface.js";
import type { IUser } from "../user/user.interface.js";

const publicUser = (user: HydratedDocument<IUser>): Partial<IUser> => {
  const { passwordHash: _passwordHash, ...rest } = user.toObject();
  return rest;
};

const setAuthCookies = (res: Response, user: IAuthUser): void => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions());
};

const register = async (payload: RegisterUserInput) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new AppError(409, `An account with email ${payload.email} already exists`);
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);

  const user = await User.create({
    fullName: payload.fullName,
    email: payload.email,
    passwordHash,
    ...(payload.educationLevel !== undefined && {
      educationLevel: payload.educationLevel,
    }),
    ...(payload.experienceLevel !== undefined && {
      experienceLevel: payload.experienceLevel,
    }),
    ...(payload.preferredTrack !== undefined && {
      preferredTrack: payload.preferredTrack,
    }),
  });

  const authUser: IAuthUser = {
    userId: user._id.toString(),
    email: user.email,
  };

  return { publicUser: publicUser(user), authUser };
};

const login = async (payload: LoginUserInput) => {
  const user = await User.findOne({ email: payload.email }).select("+passwordHash");

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const authUser: IAuthUser = {
    userId: user._id.toString(),
    email: user.email,
  };

  return { publicUser: publicUser(user), authUser };
};

const refresh = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    throw new AppError(401, "Refresh token is required");
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError(401, "User no longer exists");
  }

  const authUser: IAuthUser = {
    userId: user._id.toString(),
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(authUser),
    authUser,
  };
};

const logout = (_req: unknown, res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
};

const getMe = async (user: IAuthUser) => {
  const foundUser = await User.findById(user.userId);
  if (!foundUser) {
    throw new AppError(404, "User not found");
  }
  return publicUser(foundUser);
};

export const AuthServices = {
  setAuthCookies,
  register,
  login,
  refresh,
  logout,
  getMe,
};
