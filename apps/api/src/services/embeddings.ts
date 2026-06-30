import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const isMockMode = !env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '' || env.GEMINI_API_KEY.startsWith('mock_');
const genAI = isMockMode ? null : new GoogleGenerativeAI(env.GEMINI_API_KEY);

export async function generateEmbedding(text: string): Promise<number[]> {
  if (isMockMode) {
    // Return a mock vector of 1536 dimensions
    return Array.from({ length: 1536 }, (_, i) => Math.sin(i));
  }

  try {
    const model = genAI!.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 1536,
    } as any);
    return result.embedding.values;
  } catch (err) {
    logger.error('Failed to generate embedding', err);
    throw err;
  }
}

export async function saveTaskEmbedding(taskId: string, text: string) {
  try {
    const embedding = await generateEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;

    // Upsert the task embedding using Raw SQL because Prisma doesn't support vector columns natively in standard queries
    const existing: any = await prisma.$queryRaw`
      SELECT id FROM "TaskEmbedding" WHERE "taskId" = ${taskId} LIMIT 1
    `;

    if (Array.isArray(existing) && existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE "TaskEmbedding"
        SET "embedding" = ${vectorStr}::vector, "updatedAt" = NOW()
        WHERE "taskId" = ${taskId}
      `;
    } else {
      const newId = `te_${Math.random().toString(36).substring(2, 11)}`;
      await prisma.$executeRaw`
        INSERT INTO "TaskEmbedding" ("id", "taskId", "embedding", "createdAt", "updatedAt")
        VALUES (${newId}, ${taskId}, ${vectorStr}::vector, NOW(), NOW())
      `;
    }
  } catch (err) {
    logger.error(`Failed to save task embedding for task ${taskId}`, err);
  }
}
