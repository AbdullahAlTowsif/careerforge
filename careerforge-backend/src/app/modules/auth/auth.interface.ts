import { Request } from "express";

export interface IAuthUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IAuthUser;
}
