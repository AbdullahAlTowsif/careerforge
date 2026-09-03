import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const validateRequest =
  (schema: z.ZodType) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // Build a full schema that validates the shape of an incoming request
    const fullSchema = z.object({
      body: schema as z.ZodType,
      query: z.record(z.string(), z.unknown()).optional().default({}),
      params: z.record(z.string(), z.string()).optional().default({}),
      cookies: z.record(z.string(), z.unknown()).optional().default({}),
    });

    try {
      const parsed = await fullSchema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      if (!parsed.success) {
        const errorSources = parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        next({
          statusCode: 400,
          message: "Validation Error",
          errorSources,
        });
        return;
      }

      const data = parsed.data;

      req.body = data.body ?? req.body;
      if (data.params) {
        for (const [key, value] of Object.entries(data.params)) {
          if (value !== undefined) {
            req.params[key] = value;
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default validateRequest;
