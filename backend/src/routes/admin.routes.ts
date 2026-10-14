import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Dashboard stats. Admins see everything; owners see only their own lots.
router.get(
  "/stats",
  requireRole("ADMIN", "OWNER"),
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === "ADMIN";
    const lotWhere = isAdmin ? {} : { ownerId: req.user!.id };
    const bookingWhere = isAdmin ? {} : { lot: { ownerId: req.user!.id } };

    const [lots, slots, bookings, revenue, byStatus, recent] = await Promise.all([
      prisma.parkingLot.count({ where: lotWhere }),
      prisma.parkingSlot.count({ where: { lot: lotWhere, isActive: true } }),
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { ...bookingWhere, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.booking.groupBy({ by: ["status"], where: bookingWhere, _count: true }),
      prisma.booking.findMany({
        where: {
          ...bookingWhere,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
        },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    const daily = new Map<string, { date: string; bookings: number; revenue: number }>();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      daily.set(date, { date, bookings: 0, revenue: 0 });
    }
    for (const b of recent) {
      const row = daily.get(b.createdAt.toISOString().slice(0, 10));
      if (row) {
        row.bookings += 1;
        row.revenue += Number(b.totalAmount);
      }
    }

    const users = isAdmin ? await prisma.user.count() : undefined;
    res.json({
      success: true,
      data: {
        lots,
        slots,
        bookings,
        users,
        revenue: Number(revenue._sum.totalAmount ?? 0),
        bookingsByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        daily: [...daily.values()],
      },
    });
  }),
);

router.get(
  "/users",
  requireRole("ADMIN"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: users });
  }),
);

export default router;
