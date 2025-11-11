import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3'

export async function GET() {
  const services: Record<string, string> = {
    api: 'operational',
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    services.database = 'connected'
  } catch (error) {
    console.error('Database health check failed:', error)
    services.database = 'disconnected'
  }

  try {
    // Check R2 storage connectivity (only if env vars are set)
    if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
      const r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })

      await r2Client.send(new HeadBucketCommand({
        Bucket: process.env.R2_BUCKET_NAME,
      }))

      services.storage = 'connected'
    } else {
      services.storage = 'not_configured'
    }
  } catch (error) {
    console.error('R2 storage health check failed:', error)
    services.storage = 'disconnected'
  }

  const allHealthy = Object.values(services).every(status => status === 'connected' || status === 'operational' || status === 'not_configured')

  return NextResponse.json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services
  }, {
    status: allHealthy ? 200 : 503
  })
}
