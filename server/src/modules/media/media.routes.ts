import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../../prisma/client.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(dirname, "../../../uploads");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

export const mediaRouter = Router();
export const publicMediaRouter = Router();

publicMediaRouter.get("/media", async (_req, res) => {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" }
  });

  res.json({ assets });
});

mediaRouter.get("/media", async (_req, res) => {
  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: "desc" }
  });

  res.json({ assets });
});

mediaRouter.post("/media", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Файл не загружен." });
    return;
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      key: String(req.body.key ?? "gallery"),
      url: `/uploads/${req.file.filename}`,
      alt: req.body.alt ? String(req.body.alt) : null
    }
  });

  res.status(201).json({ asset });
});

mediaRouter.delete("/media/:id", async (req, res) => {
  await prisma.mediaAsset.delete({
    where: { id: req.params.id }
  });

  res.status(204).send();
});
