import type { RoleName } from '@prisma/client'; declare global { namespace Express { interface Request { auth?: {id:string;role:RoleName}; } } } export {};
