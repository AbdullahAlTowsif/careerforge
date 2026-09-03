import { Response } from "express";

interface IApiResponse<T> {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data?: T;
}

const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  const response: Record<string, unknown> = {
    success: data.success,
    message: data.message,
  };

  if (data.meta) response.meta = data.meta;
  if (data.data !== undefined) response.data = data.data;

  res.status(data.statusCode).json(response);
};

export default sendResponse;
