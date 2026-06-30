import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const url = process.env.TURSO_DATABASE_URL!
const authToken = process.env.TURSO_AUTH_TOKEN

const isVercel = process.env.VERCEL === '1'
const adapterUrl = (isVercel && url) ? url.replace('libsql://', 'https://').replace('wss://', 'https://') : (url || 'file:./dev.db')

const adapter = new PrismaLibSql({
  url: adapterUrl,
  authToken,
})

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

