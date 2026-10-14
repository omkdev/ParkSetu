import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { conflict, unauthorized } from "../lib/errors.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

const tooMany = { success: false, message: "Too many attempts, please try again later." };

// Slow down password guessing. Successful logins don't count against the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany,
});

// Limit account creation spam.
const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: tooMany,
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((e) => e.toLowerCase()),
  phone: z.string().trim().min(7).max(20).optional(),
  password: z
    .string()
    .min(8)
    .max(72) // bcrypt ignores everything after 72 bytes
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
  // Admins can't self-register.
  role: z.enum(["DRIVER", "OWNER"]).default("DRIVER"),
});

const loginSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(1),
});

const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw conflict("Email is already registered");

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        passwordHash: await bcrypt.hash(data.password, 10),
      },
      select: publicUser,
    });
    res.status(201).json({ success: true, data: { user, token: signToken(user) } });
  }),
);

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const found = await prisma.user.findUnique({ where: { email: data.email } });
    if (!found || !(await bcrypt.compare(data.password, found.passwordHash))) {
      throw unauthorized("Invalid email or password");
    }
    const { passwordHash: _omit, ...user } = found;
    res.json({ success: true, data: { user, token: signToken(user) } });
  }),
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: publicUser,
    });
    if (!user) throw unauthorized("User no longer exists");
    res.json({ success: true, data: { user } });
  }),
);

export default router;
