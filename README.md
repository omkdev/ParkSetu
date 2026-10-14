# ParkSetu

Parking discovery and booking platform.

| Folder | Stack |
| --- | --- |
| `backend/` | Express 5, TypeScript, Prisma 7 (PostgreSQL), JWT auth, Zod |
| `frontend/` | React 19, Vite, Tailwind 4, React Query, Recharts |
| `mobile/` | Flutter, Riverpod, go_router, Dio |

## Roles

- **Driver** – search lots, book a slot for a time window, cancel bookings.
- **Owner** – create/manage parking lots and slots, see bookings and revenue.
- **Admin** – everything an owner can see across all lots, plus the user list.

## Setup

### Backend

```bash
cd backend
cp .env.example .env        # set DATABASE_URL and JWT_SECRET (32+ random chars, required)
npm install                 # also runs `prisma generate`
npm run db:deploy           # apply migrations (or `npm run db:migrate` in dev)
npm run db:seed             # optional demo data
npm run dev                 # http://localhost:5000
```

Seed logins (password `Password@123`): `admin@parksetu.dev`, `owner@parksetu.dev`, `driver@parksetu.dev`.

> **Never run `npm run db:seed` against a production database** - it creates an admin account with a publicly known password.

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

#### Security notes

- The server refuses to start without a strong `JWT_SECRET`.
- API errors are generic unless `NODE_ENV=development`.
- Login is limited to 10 failed attempts per 15 minutes per IP, registration to 10 per hour, and the API to 600 requests per 15 minutes.
- The user's role is read from the database on every request, so deleted users and role changes apply immediately.
- A migration enables row level security on all tables so Supabase's public REST API cannot read them; Prisma connects as the table owner and is unaffected.
- If the API runs behind a reverse proxy, set `app.set("trust proxy", 1)` so rate limiting sees real client IPs.

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173, proxies /api to :5000
```

### Mobile

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://<host>:5000/api   # optional override
```

The Android emulator defaults to `http://10.0.2.2:5000/api`.

#### Run on the Android emulator (Windows)

iOS simulators are not available on Windows, so use the Android emulator. `flutter run` does not start one by itself; start it first.

```powershell
flutter emulators                          # list emulators (e.g. Pixel_7)
flutter emulators --launch Pixel_7         # start it and wait for the home screen
flutter devices                            # should list emulator-5554
```

Then run the app (the backend must already be running on port 5000):

```powershell
cd D:\ParkSetu\mobile
flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:5000/api
```

- `10.0.2.2` is the emulator's alias for your PC's `localhost`. On a real phone on the same Wi-Fi, use your PC's LAN IP instead (e.g. `http://192.168.x.x:5000/api`).
- If the Android build complains about licenses, run `flutter doctor --android-licenses`.
- If you pick `windows`/`chrome`/`edge` in the `flutter run` device prompt, you get a desktop/web build, not the emulator.

## API overview

| Method | Path | Access |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | any user |
| GET | `/api/lots?q&city&vehicleType&start&end` | public |
| GET | `/api/lots/:id?start&end` | public |
| GET | `/api/lots/mine` | owner, admin |
| POST/PATCH/DELETE | `/api/lots`, `/api/lots/:id` | owner (own lots), admin |
| POST | `/api/lots/:id/slots` | owner, admin |
| POST | `/api/bookings` | any user |
| GET | `/api/bookings/mine` | any user |
| GET | `/api/bookings/lot/:lotId` | owner, admin |
| POST | `/api/bookings/:id/cancel` | booking user, lot owner, admin |
| GET | `/api/admin/stats` | owner, admin |
| GET | `/api/admin/users` | admin |

Double-booking is prevented by assigning slots inside a `Serializable` transaction.
