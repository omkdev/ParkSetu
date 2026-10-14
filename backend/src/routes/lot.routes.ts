import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../lib/async-handler.js";
import { forbidden, notFound } from "../lib/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { findFreeSlots } from "../services/availability.js";
import type { VehicleType } from "../generated/prisma/enums.js";
import type { ParkingLot } from "../generated/prisma/client.js";

const router = Router();

const lotFields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().min(3).max(300),
  city: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  twoWheelerRate: z.number().nonnegative().max(100000),
  fourWheelerRate: z.number().nonnegative().max(100000),
};

const createLotSchema = z.object({
  ...lotFields,
  twoWheelerSlots: z.number().int().min(0).max(1000).default(0),
  fourWheelerSlots: z.number().int().min(0).max(1000).default(0),
});

const updateLotSchema = z
  .object({ ...lotFields, isActive: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

const addSlotsSchema = z.object({
  vehicleType: z.enum(["TWO_WHEELER", "FOUR_WHEELER"]),
  count: z.number().int().min(1).max(500),
});

const searchSchema = z
  .object({
    city: z.string().trim().optional(),
    q: z.string().trim().optional(),
    vehicleType: z.enum(["TWO_WHEELER", "FOUR_WHEELER"]).optional(),
    start: z.coerce.date().optional(),
    end: z.coerce.date().optional(),
  })
  .refine((v) => (v.start && v.end) || (!v.start && !v.end), "Provide both start and end")
  .refine((v) => !v.start || !v.end || v.end > v.start, "end must be after start");

const prefix = (t: VehicleType) => (t === "TWO_WHEELER" ? "2W" : "4W");

function buildSlots(lotId: string, type: VehicleType, from: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    lotId,
    vehicleType: type,
    label: `${prefix(type)}-${String(from + i + 1).padStart(3, "0")}`,
  }));
}

function lotDto(lot: ParkingLot) {
  return {
    ...lot,
    twoWheelerRate: Number(lot.twoWheelerRate),
    fourWheelerRate: Number(lot.fourWheelerRate),
  };
}

async function getOwnedLot(lotId: string, user: { id: string; role: string }) {
  const lot = await prisma.parkingLot.findUnique({ where: { id: lotId } });
  if (!lot) throw notFound("Parking lot not found");
  if (user.role !== "ADMIN" && lot.ownerId !== user.id) {
    throw forbidden("You do not own this parking lot");
  }
  return lot;
}

// Public: search lots, optionally with availability for a time window.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const f = searchSchema.parse(req.query);
    const lots = await prisma.parkingLot.findMany({
      where: {
        isActive: true,
        ...(f.city ? { city: { equals: f.city, mode: "insensitive" } } : {}),
        ...(f.q
          ? {
              OR: [
                { name: { contains: f.q, mode: "insensitive" } },
                { address: { contains: f.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { slots: { where: { isActive: true }, select: { vehicleType: true } } },
      orderBy: { createdAt: "desc" },
    });

    const data = await Promise.all(
      lots.map(async ({ slots, ...lot }) => {
        const total = {
          TWO_WHEELER: slots.filter((s) => s.vehicleType === "TWO_WHEELER").length,
          FOUR_WHEELER: slots.filter((s) => s.vehicleType === "FOUR_WHEELER").length,
        };
        let available = total;
        if (f.start && f.end) {
          const free = await findFreeSlots(prisma, lot.id, f.start, f.end);
          available = {
            TWO_WHEELER: free.filter((s) => s.vehicleType === "TWO_WHEELER").length,
            FOUR_WHEELER: free.filter((s) => s.vehicleType === "FOUR_WHEELER").length,
          };
        }
        return { ...lotDto(lot), totalSlots: total, availableSlots: available };
      }),
    );

    const filtered = f.vehicleType ? data.filter((l) => l.availableSlots[f.vehicleType!] > 0) : data;
    res.json({ success: true, data: filtered });
  }),
);

// Owner: lots I manage.
router.get(
  "/mine",
  requireAuth,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const lots = await prisma.parkingLot.findMany({
      where: req.user!.role === "ADMIN" ? {} : { ownerId: req.user!.id },
      include: { _count: { select: { slots: true, bookings: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      success: true,
      data: lots.map(({ _count, ...lot }) => ({
        ...lotDto(lot),
        slotCount: _count.slots,
        bookingCount: _count.bookings,
      })),
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const f = searchSchema.parse(req.query);
    const lot = await prisma.parkingLot.findUnique({
      where: { id: String(req.params.id) },
      include: { slots: { where: { isActive: true }, orderBy: { label: "asc" } } },
    });
    if (!lot || !lot.isActive) throw notFound("Parking lot not found");

    let freeIds: Set<string> | null = null;
    if (f.start && f.end) {
      freeIds = new Set((await findFreeSlots(prisma, lot.id, f.start, f.end)).map((s) => s.id));
    }
    const { slots, ...rest } = lot;
    res.json({
      success: true,
      data: {
        ...lotDto(rest),
        slots: slots.map((s) => ({ ...s, available: freeIds ? freeIds.has(s.id) : null })),
      },
    });
  }),
);

router.post(
  "/",
  requireAuth,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const { twoWheelerSlots, fourWheelerSlots, ...data } = createLotSchema.parse(req.body);
    const lot = await prisma.$transaction(async (tx) => {
      const created = await tx.parkingLot.create({ data: { ...data, ownerId: req.user!.id } });
      await tx.parkingSlot.createMany({
        data: [
          ...buildSlots(created.id, "TWO_WHEELER", 0, twoWheelerSlots),
          ...buildSlots(created.id, "FOUR_WHEELER", 0, fourWheelerSlots),
        ],
      });
      return created;
    });
    res.status(201).json({ success: true, data: lotDto(lot) });
  }),
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    await getOwnedLot(String(req.params.id), req.user!);
    const lot = await prisma.parkingLot.update({
      where: { id: String(req.params.id) },
      data: updateLotSchema.parse(req.body),
    });
    res.json({ success: true, data: lotDto(lot) });
  }),
);

// Soft delete so booking history is preserved.
router.delete(
  "/:id",
  requireAuth,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    await getOwnedLot(String(req.params.id), req.user!);
    await prisma.parkingLot.update({
      where: { id: String(req.params.id) },
      data: { isActive: false },
    });
    res.json({ success: true, message: "Parking lot deactivated" });
  }),
);

router.post(
  "/:id/slots",
  requireAuth,
  requireRole("OWNER", "ADMIN"),
  asyncHandler(async (req, res) => {
    const lot = await getOwnedLot(String(req.params.id), req.user!);
    const { vehicleType, count } = addSlotsSchema.parse(req.body);
    const existing = await prisma.parkingSlot.count({ where: { lotId: lot.id, vehicleType } });
    const result = await prisma.parkingSlot.createMany({
      data: buildSlots(lot.id, vehicleType, existing, count),
    });
    res.status(201).json({ success: true, data: { created: result.count } });
  }),
);

export default router;
