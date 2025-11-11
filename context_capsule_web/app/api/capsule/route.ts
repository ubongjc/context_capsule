import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCapsuleSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  snapshotMeta: z.record(z.any()).optional(),
  artifacts: z.array(
    z.object({
      kind: z.enum(['TAB', 'NOTE', 'FILE', 'SELECTION', 'SCROLL_POSITION']),
      title: z.string().optional(),
      encryptedBlob: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      storageUrl: z.string().optional(),
    })
  ).optional(),
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

    // Get user from database
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
    const validatedData = createCapsuleSchema.parse(body)

    // Create capsule with artifacts
    const capsule = await prisma.capsule.create({
      data: {
        userId: user.id,
        title: validatedData.title,
        description: validatedData.description,
        snapshotMeta: validatedData.snapshotMeta || {},
        artifacts: {
          create: validatedData.artifacts?.map(artifact => ({
            kind: artifact.kind,
            title: artifact.title,
            encryptedBlob: artifact.encryptedBlob,
            metadata: artifact.metadata || {},
            storageUrl: artifact.storageUrl,
          })) || [],
        },
      },
      include: {
        artifacts: true,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_CAPSULE',
        resource: capsule.id,
        metadata: { title: capsule.title },
      },
    })

    return NextResponse.json(capsule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const capsules = await prisma.capsule.findMany({
      where: { userId: user.id },
      include: {
        artifacts: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.capsule.count({
      where: { userId: user.id },
    })

    return NextResponse.json({
      capsules,
      pagination: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching capsules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
