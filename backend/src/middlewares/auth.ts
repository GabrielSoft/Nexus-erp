import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { RoleName } from '@prisma/client';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : null;

    if (!token) return res.status(401).json({ message: 'Token ausente' });

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      sub?: string;
      role?: RoleName;
    };

    if (!payload.sub || !payload.role) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.auth = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

export const allow = (...roles: RoleName[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Permissão insuficiente' });
    }
    return next();
  };
