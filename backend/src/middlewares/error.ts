import type {
  NextFunction,
  Request,
  Response,
  RequestHandler,
} from 'express';

import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function asyncHandler(
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
): RequestHandler {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    void Promise.resolve(
      handler(req, res, next),
    ).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  void next;

  if (err instanceof ZodError) {
    return res.status(422).json({
      message: 'Dados inválidos',
      errors: err.flatten(),
    });
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError
  ) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        message:
          'Já existe um registro com esse valor único.',
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        message:
          'Registro não encontrado.',
      });
    }

    if (err.code === 'P2003') {
      return res.status(409).json({
        message:
          'Não é possível remover ou alterar este registro porque ele está relacionado a outros dados.',
      });
    }
  }

  console.error(err);

  return res.status(500).json({
    message:
      'Erro interno do servidor',
  });
}