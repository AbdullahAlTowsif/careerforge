import { IGenericErrorResponse } from "../interfaces/error.interface.js";

class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string, stack = "") {
    super(message);
    this.statusCode = statusCode;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const handleAppError = (err: AppError): IGenericErrorResponse => {
  return {
    statusCode: err.statusCode,
    message: err.message,
    errorSources: [],
  };
};

export default AppError;
