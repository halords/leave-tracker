import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  const adapterUrl = url.startsWith('libsql://')
    ? url.replace('libsql://', 'https://')
    : url.startsWith('wss://')
    ? url.replace('wss://', 'https://')
    : url

  const adapter = new PrismaLibSql({
    url: adapterUrl,
    authToken,
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


