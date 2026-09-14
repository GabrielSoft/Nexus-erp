import { PrismaClient, RoleName } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const permissionsByRole: Record<RoleName, string[]> = {
  ADMIN: ['users.manage', 'customers.manage', 'products.manage', 'sales.manage', 'finance.manage', 'reports.view', 'audit.view'],
  MANAGER: ['customers.manage', 'products.manage', 'sales.manage', 'finance.manage', 'reports.view'],
  EMPLOYEE: ['customers.manage', 'products.manage', 'sales.manage'],
};

async function main() {
  const permissions = [...new Set(Object.values(permissionsByRole).flat())];
  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: code },
      create: { code, description: code },
    });
  }

  for (const name of Object.values(RoleName)) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
    const rolePermissions = await prisma.permission.findMany({ where: { code: { in: permissionsByRole[name] } } });
    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: { set: rolePermissions.map(({ id }) => ({ id })) } },
    });
  }

  const admin = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@nexuserp.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Nexus@123';

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { active: true, roleId: admin.id },
    create: {
      name: 'Administrador Nexus',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      roleId: admin.id,
    },
  });

  console.log(`Seed concluído. Usuário administrador: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
