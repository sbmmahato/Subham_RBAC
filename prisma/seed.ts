import { PrismaClient, Role, UserStatus, TransactionType } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      email: "viewer@example.com",
      passwordHash,
      name: "Demo Viewer",
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: "analyst@example.com" },
    update: {},
    create: {
      email: "analyst@example.com",
      passwordHash,
      name: "Demo Analyst",
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      name: "Demo Admin",
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.financialRecord.deleteMany({
    where: { userId: { in: [viewer.id, analyst.id] } },
  });

  const base = new Date();
  base.setMonth(base.getMonth() - 1);

  await prisma.financialRecord.createMany({
    data: [
      {
        userId: viewer.id,
        amount: 5000,
        type: TransactionType.INCOME,
        category: "Salary",
        date: new Date(base.getFullYear(), base.getMonth(), 1),
        notes: "Monthly salary",
      },
      {
        userId: viewer.id,
        amount: 120,
        type: TransactionType.EXPENSE,
        category: "Food",
        date: new Date(base.getFullYear(), base.getMonth(), 5),
        notes: "Groceries",
      },
      {
        userId: analyst.id,
        amount: 800,
        type: TransactionType.INCOME,
        category: "Consulting",
        date: new Date(base.getFullYear(), base.getMonth(), 10),
        notes: "Side project",
      },
      {
        userId: analyst.id,
        amount: 200,
        type: TransactionType.EXPENSE,
        category: "Software",
        date: new Date(base.getFullYear(), base.getMonth(), 12),
        notes: "Subscriptions",
      },
    ],
  });

  console.log("Seed OK:", { viewer: viewer.email, analyst: analyst.email, admin: admin.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
