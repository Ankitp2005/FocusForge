const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      createdAt: true,
      reminders: {
        select: {
          id: true,
          remindAt: true,
          status: true,
        }
      }
    }
  });
  console.log('--- LAST 5 TASKS ---');
  console.log(JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
