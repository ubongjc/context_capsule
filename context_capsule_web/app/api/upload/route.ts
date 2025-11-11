import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStorageKey, getSignedUploadUrl } from '@/lib/r2'
import { validateFile } from '@/lib/validation'
import { rateLimit, rateLimitConfig } from '@/lib/rate-limit'
import { z } from 'zod'

const uploadRateLimit = rateLimit(rateLimitConfig.upload)

const uploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  artifactId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await uploadRateLimit(req)
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { fileName, contentType, artifactId } = uploadRequestSchema.parse(body)

    // Validate file type
    const fileValidation = validateFile(contentType, fileName)
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error },
        { status: 400 }
      )
    }

    // Generate unique storage key
    const storageKey = generateStorageKey(user.id, fileName)

    // Get signed upload URL (valid for 1 hour)
    const uploadUrl = await getSignedUploadUrl(storageKey, contentType, 3600)

    // If artifactId is provided, verify ownership and update the artifact with the storage URL
    if (artifactId) {
      const artifact = await prisma.artifact.findFirst({
        where: { id: artifactId },
        include: { capsule: true },
      })

      if (!artifact || artifact.capsule.userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this artifact' },
          { status: 403 }
        )
      }

      await prisma.artifact.update({
        where: { id: artifactId },
        data: {
          storageUrl: storageKey,
        },
      })
    }

    return NextResponse.json({
      uploadUrl,
      storageKey,
      expiresIn: 3600,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error generating upload URL:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
