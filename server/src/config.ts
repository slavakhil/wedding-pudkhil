import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.SERVER_PORT ?? 4000),
  adminAccessCode: process.env.ADMIN_ACCESS_CODE ?? "change-me",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-too",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? "http://localhost:5173"
};
