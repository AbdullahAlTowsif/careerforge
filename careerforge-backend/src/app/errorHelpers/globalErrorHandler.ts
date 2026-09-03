import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import AppError, { handleAppError } from "./AppError.js";
import { IGenericErrorResponse } from "../interfaces/error.interface.js";

export const handleValidationError = (
  err: mongoose.Error.ValidationError
): IGenericErrorResponse => {
  const errorSources = Object.values(err.errors).map((error) => ({
    path: error.path,
    message: error.message,
  }));

  return {
    statusCode: 400,
    message: "Validation Error",
    errorSources,
  };
};

export const handleCastError = (
  err: mongoose.Error.CastError
): IGenericErrorResponse => {
  return {
    statusCode: 400,
    message: `Invalid ${err.path}: ${err.value}`,
    errorSources: [{ path: err.path, message: err.message }],
  };
};

export const handleDuplicateKeyError = (err: any): IGenericErrorResponse => {
  const field = Object.keys(err?.keyValue || {})[0] || "field";
  return {
    statusCode: 400,
    message: `Duplicate value for ${field}. Please use a different value.`,
    errorSources: [{ path: field, message: `${field} already exists` }],
  };
};

const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let simplifiedError: IGenericErrorResponse = {
    statusCode: 500,
    message: "Something went wrong",
    errorSources: [{ path: "", message: err.message }],
  };

  if (err instanceof AppError) {
    simplifiedError = handleAppError(err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    simplifiedError = handleValidationError(err);
  } else if (err instanceof mongoose.Error.CastError) {
    simplifiedError = handleCastError(err);
  } else if (err && err.code === 11000) {
    simplifiedError = handleDuplicateKeyError(err);
  } else if (err instanceof SyntaxError) {
    simplifiedError = {
      statusCode: 400,
      message: "Invalid JSON payload",
      errorSources: [{ path: "", message: err.message }],
    };
  }

  const stack =
    process.env.NODE_ENV === "development" ? err?.stack : undefined;

  res.status(simplifiedError.statusCode).json({
    success: false,
    message: simplifiedError.message,
    errorSources: simplifiedError.errorSources,
    stack,
  });
};

export default globalErrorHandler;
