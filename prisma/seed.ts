import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo project
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
    },
  });

  console.log(`✅ Created project: ${project.name}`);

  // Create columns with sparse ordering (1000, 2000, 3000, 4000)
  const columnNames = ['To Do', 'In Progress', 'Review', 'Done'];
  const columns = [];

  for (let i = 0; i < columnNames.length; i++) {
    const column = await prisma.column.create({
      data: {
        projectId: project.id,
        name: columnNames[i],
        order: (i + 1) * 1000,
      },
    });
    columns.push(column);
    console.log(`✅ Created column: ${column.name} (order: ${column.order})`);
  }

  // Create tasks in each column with sparse ordering
  const tasksByColumn = [
    [
      { title: 'Setup project', description: 'Initialize the codebase' },
      { title: 'Design database schema', description: 'Define models' },
      { title: 'Write documentation', description: 'Create PRD and SAD' },
    ],
    [
      { title: 'Implement API routes', description: 'Build tRPC routers' },
      { title: 'Build UI components', description: 'Create React components' },
    ],
    [
      { title: 'Code review', description: 'Review PR #123' },
    ],
    [
      { title: 'Deploy to staging', description: 'Test deployment' },
      { title: 'Write tests', description: 'Add unit tests' },
    ],
  ];

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const tasksData = tasksByColumn[colIdx] || [];
    for (let taskIdx = 0; taskIdx < tasksData.length; taskIdx++) {
      const task = await prisma.task.create({
        data: {
          columnId: columns[colIdx].id,
          title: tasksData[taskIdx].title,
          description: tasksData[taskIdx].description,
          order: (taskIdx + 1) * 1000,
        },
      });
      console.log(
        `✅ Created task: "${task.title}" in ${columns[colIdx].name} (order: ${task.order})`
      );
    }
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

