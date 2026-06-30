import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { requireAdmin } from "./modules/auth/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminContentRouter, publicContentRouter } from "./modules/content/content.routes.js";
import { exportRouter } from "./modules/export/export.routes.js";
import { adminGuestsRouter, publicGuestsRouter } from "./modules/guests/guests.routes.js";
import { adminInvitationsRouter, publicInvitationsRouter } from "./modules/invitations/invitations.routes.js";
import { mediaRouter, publicMediaRouter } from "./modules/media/media.routes.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.resolve(dirname, "../uploads")));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/public", publicContentRouter);
  app.use("/api/public", publicInvitationsRouter);
  app.use("/api/public", publicGuestsRouter);
  app.use("/api/public", publicMediaRouter);

  app.use("/api/admin", authRouter);
  app.use("/api/admin", requireAdmin, adminContentRouter);
  app.use("/api/admin", requireAdmin, adminInvitationsRouter);
  app.use("/api/admin", requireAdmin, adminGuestsRouter);
  app.use("/api/admin", requireAdmin, exportRouter);
  app.use("/api/admin", requireAdmin, mediaRouter);

  return app;
}
