import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { billedHours, findFreeSlots } from "../services/availability.js";
import type { Booking, ParkingLot, ParkingSlot } from "../generated/prisma/client.js";

const router = Router();
router.use(requireAuth);

const createSchema = z
  .object({
    lotId: z.uuid(),
    vehicleType: z.enum(["TWO_WHEELER", "FOUR_WHEELER"]),
    vehicleNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9 -]{4,15}$/, "Invalid vehicle number"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });

const MAX_HOURS = 24 * 7;

const dto = (b: Booking & { lot?: ParkingLot; slot?: ParkingSlot }) => ({
  ...b,
  totalAmount: Number(b.totalAmount),
  lot: b.lot && { id: b.lot.id, name: b.lot.name, address: b.lot.address, city: b.lot.city },
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const now = Date.now();
    if (data.startTime.getTime() < now - 5 * 60_000) {
      throw badRequest("startTime cannot be in the past");
    }
    const hours = billedHours(data.startTime, data.endTime);
    if (hours > MAX_HOURS) throw badRequest("Bookings are limited to 7 days");

    const booking = await prisma.$transaction(
      async (tx) => {
        const lot = await tx.parkingLot.findUnique({ where: { id: data.lotId } });
        if (!lot || !lot.isActive) throw notFound("Parking lot not found");

        const [slot] = await findFreeSlots(tx, lot.id, data.startTime, data.endTime, data.vehicleType);
        if (!slot) throw conflict("No slots available for the selected time and vehicle type");

        const rate = Number(
          data.vehicleType === "TWO_WHEELER" ? lot.twoWheelerRate : lot.fourWheelerRate,
        );
        return tx.booking.create({
          data: {
            userId: req.user!.id,
            lotId: lot.id,
            slotId: slot.id,
            vehicleType: data.vehicleType,
            vehicleNumber: data.vehicleNumber,
            startTime: data.startTime,
            endTime: data.endTime,
            totalAmount: rate * hours,
          },
          include: { lot: true, slot: true },
        });
      },
      // Serializable prevents two concurrent requests from taking the same slot.
      { isolationLevel: "Serializable" },
    );
    res.status(201).json({ success: true, data: dto(booking) });
  }),
);

router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      include: { lot: true, slot: true },
      orderBy: { startTime: "desc" },
    });
    res.json({ success: true, data: bookings.map(dto) });
  }),
);

router.get(
  "/lot/:lotId",
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const lot = await prisma.parkingLot.findUnique({ where: { id: String(req.params.lotId) } });
    if (!lot) throw notFound("Parking lot not found");
    if (req.user!.role !== "ADMIN" && lot.ownerId !== req.user!.id) throw forbidden();

    const bookings = await prisma.booking.findMany({
      where: { lotId: lot.id },
      include: { lot: true, slot: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { startTime: "desc" },
    });
    res.json({ success: true, data: bookings.map((b) => ({ ...dto(b), user: b.user })) });
  }),
);

router.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({
      where: { id: String(req.params.id) },
      include: { lot: true },
    });
    if (!booking) throw notFound("Booking not found");
    const isOwner = booking.lot.ownerId === req.user!.id;
    if (booking.userId !== req.user!.id && !isOwner && req.user!.role !== "ADMIN") {
      throw forbidden();
    }
    if (booking.status !== "CONFIRMED") throw conflict(`Booking is already ${booking.status.toLowerCase()}`);
    if (booking.endTime.getTime() <= Date.now()) throw conflict("Booking has already ended");

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
      include: { lot: true, slot: true },
    });
    res.json({ success: true, data: dto(updated) });
  }),
);

export default router;
