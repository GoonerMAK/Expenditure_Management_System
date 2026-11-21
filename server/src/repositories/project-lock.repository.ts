import { Prisma } from '@prisma/client';

type Db = Prisma.TransactionClient;

const isProjectId = (id: string | undefined): id is string => Boolean(id);

export const lockProjects = async (db: Db, ...project_ids: (string | undefined)[]) => {
    const ids = [...new Set(project_ids.filter(isProjectId))].sort();
    for (const id of ids) {
        await db.$executeRaw`SELECT 1 FROM "Project" WHERE id = ${id} FOR NO KEY UPDATE`;
    }
};
