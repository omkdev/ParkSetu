import type { Prisma } from "../generated/prisma/client.js";
import type { VehicleType } from "../generated/prisma/enums.js";

type Db = Prisma.TransactionClient;

/** Number of whole hours billed (minimum 1). */
export function billedHours(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000));
}

/** Active slots in a lot that have no confirmed booking overlapping [start, end). */
export async function findFreeSlots(
  db: Db,
  lotId: string,
  start: Date,
  end: Date,
  vehicleType?: VehicleType,
) {
  return db.parkingSlot.findMany({
    where: {
      lotId,
      isActive: true,
      ...(vehicleType ? { vehicleType } : {}),
      bookings: {
        none: {
          status: "CONFIRMED",
          startTime: { lt: end },
          endTime: { gt: start },
        },
      },
    },
    orderBy: { label: "asc" },
  });
}
