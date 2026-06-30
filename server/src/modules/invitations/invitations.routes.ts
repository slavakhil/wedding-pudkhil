import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { config } from "../../config.js";
import { prisma } from "../../prisma/client.js";

const createInvitationSchema = z.object({
  displayName: z.string().min(1),
  internalName: z.string().optional(),
  guestType: z.enum(["single", "couple", "family"]).default("single")
});

const updateInvitationSchema = createInvitationSchema.extend({
  isActive: z.boolean()
});

export const publicInvitationsRouter = Router();
export const adminInvitationsRouter = Router();

publicInvitationsRouter.get("/invitations/:slug", async (req, res) => {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    select: {
      slug: true,
      displayName: true,
      guestType: true,
      isActive: true
    }
  });

  if (!invitation || !invitation.isActive) {
    res.status(404).json({ message: "Приглашение не найдено." });
    return;
  }

  res.json({
    slug: invitation.slug,
    displayName: invitation.displayName,
    guestType: invitation.guestType
  });
});

adminInvitationsRouter.get("/invitations", async (_req, res) => {
  const invitations = await prisma.invitation.findMany({
    include: {
      guests: {
        orderBy: { updatedAt: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    invitations: invitations.map((invitation) => ({
      ...invitation,
      url: `${config.publicSiteUrl}/invite/${invitation.slug}`,
      hasResponse: invitation.guests.length > 0
    }))
  });
});

adminInvitationsRouter.post("/invitations", async (req, res) => {
  const parsed = createInvitationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Укажите имя приглашенных." });
    return;
  }

  const invitation = await prisma.invitation.create({
    data: {
      ...parsed.data,
      slug: nanoid(10)
    }
  });

  res.status(201).json({
    invitation,
    url: `${config.publicSiteUrl}/invite/${invitation.slug}`
  });
});

adminInvitationsRouter.put("/invitations/:id", async (req, res) => {
  const parsed = updateInvitationSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Некорректные данные приглашения." });
    return;
  }

  const invitation = await prisma.invitation.update({
    where: { id: req.params.id },
    data: parsed.data
  });

  res.json({ invitation });
});

adminInvitationsRouter.delete("/invitations/:id", async (req, res) => {
  await prisma.invitation.delete({
    where: { id: req.params.id }
  });

  res.status(204).send();
});
