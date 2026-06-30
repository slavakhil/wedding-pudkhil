import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Нужна авторизация администратора." });
    return;
  }

  try {
    jwt.verify(header.slice("Bearer ".length), config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Сессия истекла. Войдите снова." });
  }
}
