import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma.js";

function slots(type: "TWO_WHEELER" | "FOUR_WHEELER", n: number) {
  const p = type === "TWO_WHEELER" ? "2W" : "4W";
  return Array.from({ length: n }, (_, i) => ({
    vehicleType: type,
    label: `${p}-${String(i + 1).padStart(3, "0")}`,
  }));
}

async function main() {
  const passwordHash = await bcrypt.hash("Password@123", 10);
  const upsert = (name: string, email: string, role: "ADMIN" | "OWNER" | "DRIVER") =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email, role, passwordHash },
    });

  await upsert("ParkSetu Admin", "admin@parksetu.dev", "ADMIN");
  const owner = await upsert("Demo Owner", "owner@parksetu.dev", "OWNER");
  await upsert("Demo Driver", "driver@parksetu.dev", "DRIVER");

  if ((await prisma.parkingLot.count()) === 0) {
    const demo = [
      { name: "City Center Parking", address: "MG Road", city: "Pune", twoWheelerRate: 10, fourWheelerRate: 40 },
      { name: "Station Plaza Parking", address: "Station Road", city: "Pune", twoWheelerRate: 15, fourWheelerRate: 50 },
      { name: "Lakeview Parking", address: "Lake Road", city: "Mumbai", twoWheelerRate: 20, fourWheelerRate: 80 },
    ];
    for (const l of demo) {
      await prisma.parkingLot.create({
        data: {
          ...l,
          ownerId: owner.id,
          slots: { create: [...slots("TWO_WHEELER", 10), ...slots("FOUR_WHEELER", 10)] },
        },
      });
    }
  }
  console.log("Seeded. Demo logins (password: Password@123): admin@/owner@/driver@parksetu.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
