import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStorageKey, getSignedUploadUrl } from '@/lib/r2'
import { z } from 'zod'

const uploadRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  artifactId: z.string().optional(),
})

export async function POST(req: NextRequest) {
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

    // Generate unique storage key
    const storageKey = generateStorageKey(user.id, fileName)

    // Get signed upload URL (valid for 1 hour)
    const uploadUrl = await getSignedUploadUrl(storageKey, contentType, 3600)

    // If artifactId is provided, update the artifact with the storage URL
    if (artifactId) {
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
        { error: 'Validation error', details: error.errors },
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
