import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../../config.js";

const loginSchema = z.object({
  code: z.string().min(1)
});

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Введите ключ-код." });
    return;
  }

  if (parsed.data.code !== config.adminAccessCode) {
    res.status(403).json({ message: "Неверный ключ-код." });
    return;
  }

  const token = jwt.sign({ role: "admin" }, config.jwtSecret, {
    expiresIn: "12h"
  });

  res.json({ token });
});
