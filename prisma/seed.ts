import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { GlobalRole, PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const configuredAdminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL é obrigatória para executar o seed.");
}

if (!configuredAdminPassword || configuredAdminPassword.length < 8) {
  throw new Error(
    "SEED_ADMIN_PASSWORD é obrigatória e deve ter ao menos 8 caracteres.",
  );
}

const adminPassword = configuredAdminPassword;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "Super Admin",
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: "Super Admin",
      email: adminEmail.toLowerCase(),
      passwordHash,
      globalRole: GlobalRole.SUPER_ADMIN,
    },
  });

  await prisma.plan.upsert({
    where: { name: "Inicial" },
    update: {
      description: "Plano inicial do Agendaí.",
      monthlyPrice: "49.90",
      annualPrice: "499.00",
      whatsappEnabled: true,
      publicLinkEnabled: true,
      isActive: true,
    },
    create: {
      name: "Inicial",
      description: "Plano inicial do Agendaí.",
      monthlyPrice: "49.90",
      annualPrice: "499.00",
      whatsappEnabled: true,
      publicLinkEnabled: true,
      isActive: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
