import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/errors.js";
import { env } from "../config/env.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message, details: err.details });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Malformed JSON body" });
  }
  // Prisma: write conflict under Serializable isolation (concurrent booking of the same slot).
  if (err?.code === "P2034") {
    return res
      .status(409)
      .json({ success: false, message: "That slot was just taken. Please try again." });
  }
  if (err?.code === "P2002") {
    return res.status(409).json({ success: false, message: "Record already exists" });
  }
  console.error(err);
  res.status(500).json({
    success: false,
    message: env.isProd ? "Internal server error" : String(err?.message ?? err),
  });
};
