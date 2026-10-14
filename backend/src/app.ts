import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import lotRoutes from "./routes/lot.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: "100kb" }));

// Baseline limit for the whole API. Auth routes add stricter limits of their own.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "ParkSetu API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/lots", lotRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
