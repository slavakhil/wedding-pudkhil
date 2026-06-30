import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../prisma/client.js";

const contentItemSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
  type: z.enum(["text", "json", "image"]).default("text")
});

const updateContentSchema = z.object({
  items: z.array(contentItemSchema)
});

export const publicContentRouter = Router();
export const adminContentRouter = Router();

publicContentRouter.get("/content", async (_req, res) => {
  const items = await prisma.siteContent.findMany();
  res.json({
    items: Object.fromEntries(items.map((item) => [item.key, item.value]))
  });
});

adminContentRouter.get("/content", async (_req, res) => {
  const items = await prisma.siteContent.findMany({
    orderBy: { key: "asc" }
  });
  res.json({ items });
});

adminContentRouter.put("/content", async (req, res) => {
  const parsed = updateContentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Некорректные данные контента." });
    return;
  }

  const updated = await prisma.$transaction(
    parsed.data.items.map((item) => {
      const value = item.value as Prisma.InputJsonValue;

      return (
      prisma.siteContent.upsert({
        where: { key: item.key },
        update: { value, type: item.type },
        create: { key: item.key, value, type: item.type }
      })
      );
    })
  );

  res.json({ items: updated });
});
