import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib.js';
import { env } from '../config/env.js';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function tokens(id: string, role: string) {
  return {
    accessToken: jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
      subject: id,
      expiresIn: ACCESS_TTL_SECONDS,
    }),
    refreshToken: jwt.sign({}, env.JWT_REFRESH_SECRET, {
      subject: id,
      expiresIn: '7d',
    }),
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { role: true },
  });

  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const tokenSet = tokens(user.id, user.role.name);
  await prisma.refreshToken.create({
    data: {
      token: tokenSet.refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      role: { name: user.role.name },
    },
    ...tokenSet,
  };
}

export async function refresh(token: string) {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub?: string };
    if (!payload.sub) throw new Error('INVALID_TOKEN');

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { role: true } } },
    });

    if (!stored || stored.userId !== payload.sub || stored.expiresAt <= new Date() || !stored.user.active) {
      throw new Error('INVALID_TOKEN');
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokenSet = tokens(stored.user.id, stored.user.role.name);
    await prisma.refreshToken.create({
      data: {
        token: tokenSet.refreshToken,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return tokenSet;
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_TOKEN') throw error;
    throw new Error('INVALID_TOKEN');
  }
}
