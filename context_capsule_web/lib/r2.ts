import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomBytes } from 'crypto'
import path from 'path'

// Validate required environment variables at module load
const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.R2_BUCKET_NAME!

export async function uploadToR2(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: data,
    ContentType: contentType,
  })

  await r2Client.send(command)

  // Return the public URL if available, otherwise return the key
  const publicUrl = process.env.R2_PUBLIC_URL
  return publicUrl ? `${publicUrl}/${key}` : key
}

export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(r2Client, command, { expiresIn })
}

export async function getSignedUploadUrl(
  key: string,
  contentType?: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  })

  return await getSignedUrl(r2Client, command, { expiresIn })
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

// Generate a unique key for storing files
export function generateStorageKey(userId: string, fileName: string): string {
  // Validate userId format (CUID2: 24-32 chars, alphanumeric)
  const cuid2Regex = /^[a-z0-9]{24,32}$/
  if (!cuid2Regex.test(userId)) {
    throw new Error('Invalid userId format')
  }

  // Use cryptographically secure random
  const random = randomBytes(16).toString('hex')
  const timestamp = Date.now()

  // Extract basename to prevent directory traversal
  const basename = path.basename(fileName)

  // Remove null bytes and prevent directory traversal
  const cleanName = basename.replace(/\0/g, '').replace(/\.\./g, '')

  // Sanitize filename - allow only safe characters
  const sanitizedFileName = cleanName.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Prevent hidden files
  const finalName = sanitizedFileName.startsWith('.') ? `_${sanitizedFileName}` : sanitizedFileName

  return `${userId}/${timestamp}-${random}-${finalName}`
}
