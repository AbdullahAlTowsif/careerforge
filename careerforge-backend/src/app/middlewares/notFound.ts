import { NextFunction, Request, Response } from "express";

const notFound = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    errorSources: [
      {
        path: _req.originalUrl,
        message: `Route ${_req.originalUrl} does not exist`,
      },
    ],
  });
};

export default notFound;
