-- Defense in depth for hosted Postgres (e.g. Supabase).
--
-- Supabase exposes tables in the "public" schema through its REST API using the
-- public anon key. Enabling row level security with NO policies makes those
-- tables inaccessible to the anon/authenticated API roles.
--
-- The backend connects through Prisma as the table owner (the "postgres" role),
-- which bypasses RLS, so the application is unaffected.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParkingLot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParkingSlot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
