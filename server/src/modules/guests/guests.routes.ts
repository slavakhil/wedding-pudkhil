import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../prisma/client.js";

const rsvpSchema = z
  .object({
    invitationSlug: z.string().min(1),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().min(5),
    foodPreferences: z.array(z.string()).default([]),
    alcoholPreferences: z.array(z.string()).default([]),
    questionAnswers: z.record(z.array(z.string())).default({}),
    hasChild: z.boolean().default(false),
    comment: z.string().optional(),
    moneyGiftEnabled: z.boolean().default(false),
    moneyGiftAmount: z.number().int().positive().optional()
  })
  .superRefine((data, ctx) => {
    if (data.moneyGiftEnabled && !data.moneyGiftAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["moneyGiftAmount"],
        message: "Укажите сумму денежного подарка."
      });
    }
  });

export const publicGuestsRouter = Router();
export const adminGuestsRouter = Router();

publicGuestsRouter.post("/rsvp", async (req, res) => {
  const parsed = rsvpSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      message: "Проверьте данные формы.",
      errors: parsed.error.flatten()
    });
    return;
  }

  const invitation = await prisma.invitation.findUnique({
    where: { slug: parsed.data.invitationSlug }
  });

  if (!invitation || !invitation.isActive) {
    res.status(404).json({ message: "Приглашение не найдено." });
    return;
  }

  const guest = await prisma.guest.upsert({
    where: {
      invitationId_phone: {
        invitationId: invitation.id,
        phone: parsed.data.phone
      }
    },
    update: {
      firstName: parsed.data.firstName ?? (invitation.internalName || invitation.displayName),
      lastName: parsed.data.lastName ?? "-",
      foodPreferences: parsed.data.foodPreferences,
      alcoholPreferences: parsed.data.alcoholPreferences,
      questionAnswers: parsed.data.questionAnswers,
      hasChild: parsed.data.hasChild,
      comment: parsed.data.comment,
      moneyGiftEnabled: parsed.data.moneyGiftEnabled,
      moneyGiftAmount: parsed.data.moneyGiftEnabled ? parsed.data.moneyGiftAmount : null
    },
    create: {
      invitationId: invitation.id,
      firstName: parsed.data.firstName ?? (invitation.internalName || invitation.displayName),
      lastName: parsed.data.lastName ?? "-",
      phone: parsed.data.phone,
      foodPreferences: parsed.data.foodPreferences,
      alcoholPreferences: parsed.data.alcoholPreferences,
      questionAnswers: parsed.data.questionAnswers,
      hasChild: parsed.data.hasChild,
      comment: parsed.data.comment,
      moneyGiftEnabled: parsed.data.moneyGiftEnabled,
      moneyGiftAmount: parsed.data.moneyGiftEnabled ? parsed.data.moneyGiftAmount : null
    },
    include: {
      invitation: true
    }
  });

  res.status(201).json({ guest });
});

const updateGuestSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
    foodPreferences: z.array(z.string()).default([]),
    alcoholPreferences: z.array(z.string()).default([]),
    questionAnswers: z.record(z.array(z.string())).default({}),
    hasChild: z.boolean(),
    comment: z.string().optional(),
    moneyGiftEnabled: z.boolean().default(false),
    moneyGiftAmount: z.number().int().positive().nullable().optional()
  })
  .superRefine((data, ctx) => {
    if (data.moneyGiftEnabled && !data.moneyGiftAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["moneyGiftAmount"],
        message: "Укажите сумму денежного подарка."
      });
    }
  });

adminGuestsRouter.get("/guests", async (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";

  const guests = await prisma.guest.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { invitation: { displayName: { contains: search, mode: "insensitive" } } }
          ]
        }
      : undefined,
    include: {
      invitation: true
    },
    orderBy: { updatedAt: "desc" }
  });

  res.json({ guests });
});

adminGuestsRouter.put("/guests/:id", async (req, res) => {
  const parsed = updateGuestSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Некорректные данные гостя." });
    return;
  }

  const guest = await prisma.guest.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      comment: parsed.data.comment ?? "",
      moneyGiftAmount: parsed.data.moneyGiftEnabled ? parsed.data.moneyGiftAmount : null
    },
    include: {
      invitation: true
    }
  });

  res.json({ guest });
});

adminGuestsRouter.delete("/guests/:id", async (req, res) => {
  await prisma.guest.delete({
    where: { id: req.params.id }
  });

  res.status(204).send();
});
