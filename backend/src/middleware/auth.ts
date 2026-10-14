import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../lib/errors.js";
import type { Role } from "../generated/prisma/enums.js";

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({}, env.jwtSecret, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(unauthorized("Missing bearer token"));
  }

  let userId: string;
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret, {
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
    if (!payload.sub) throw new Error("no subject");
    userId = payload.sub;
  } catch {
    return next(unauthorized("Invalid or expired token"));
  }

  try {
    // Always use the current role from the database, not the one in the token,
    // so deleted users and role changes take effect immediately.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) return next(unauthorized("User no longer exists"));
    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden("Insufficient permissions"));
    next();
  };
