import { Request, Response } from "express";
import sendResponse from "../../helpers/sendResponse.js";
import { catchAsync } from "../../helpers/catchAsync.js";
import { AuthServices } from "./auth.service.js";
import type { AuthenticatedRequest } from "./auth.interface.js";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from "../../config/cookie.js";

const register = catchAsync(async (req: Request, res: Response) => {
  const { publicUser, authUser } = await AuthServices.register(req.body);
  AuthServices.setAuthCookies(res, authUser);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Account created successfully",
    data: publicUser,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { publicUser, authUser } = await AuthServices.login(req.body);
  AuthServices.setAuthCookies(res, authUser);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged in successfully",
    data: publicUser,
  });
});

const refresh = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
  const { accessToken } = await AuthServices.refresh(refreshToken);

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions());

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token refreshed successfully",
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  AuthServices.logout(req, res);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logged out successfully",
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const me = await AuthServices.getMe(user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User fetched successfully",
    data: me,
  });
});

export const AuthController = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
