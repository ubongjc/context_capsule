import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitConfig } from '@/lib/rate-limit'
import { capsuleSchemas, sanitizeString, containsDangerousContent } from '@/lib/validation'

const standardRateLimit = rateLimit(rateLimitConfig.standard)
const strictRateLimit = rateLimit(rateLimitConfig.strict)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = await standardRateLimit(req)
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

    const { id } = await params

    const capsule = await prisma.capsule.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        artifacts: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!capsule) {
      return NextResponse.json(
        { error: 'Capsule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(capsule)
  } catch (error) {
    console.error('Error fetching capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = await strictRateLimit(req)
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

    const { id } = await params

    // Use atomic deleteMany to prevent race conditions (TOCTOU)
    // Include userId in WHERE clause for atomic ownership check
    const result = await prisma.capsule.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Capsule not found' },
        { status: 404 }
      )
    }

    // Log audit (best effort - don't fail delete if audit fails)
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'DELETE_CAPSULE',
          resource: id,
          metadata: {},
          ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
          userAgent: req.headers.get('user-agent') || null,
        },
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResult = await standardRateLimit(req)
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

    const { id } = await params
    const body = await req.json()

    // Validate and sanitize input
    const validatedData = capsuleSchemas.update.parse(body)

    // Sanitize inputs if provided
    const sanitizedTitle = validatedData.title ? sanitizeString(validatedData.title) : undefined
    const sanitizedDescription = validatedData.description !== undefined
      ? (validatedData.description ? sanitizeString(validatedData.description) : null)
      : undefined

    // Check for dangerous content
    if (sanitizedTitle && containsDangerousContent(sanitizedTitle)) {
      return NextResponse.json(
        { error: 'Title contains potentially dangerous patterns' },
        { status: 400 }
      )
    }

    if (sanitizedDescription && containsDangerousContent(sanitizedDescription)) {
      return NextResponse.json(
        { error: 'Description contains potentially dangerous patterns' },
        { status: 400 }
      )
    }

    // Verify ownership before update
    const capsule = await prisma.capsule.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!capsule) {
      return NextResponse.json(
        { error: 'Capsule not found' },
        { status: 404 }
      )
    }

    // Build update data with proper undefined handling
    const updateData: { title?: string; description?: string | null } = {}
    if (sanitizedTitle !== undefined) {
      updateData.title = sanitizedTitle
    }
    if (sanitizedDescription !== undefined) {
      updateData.description = sanitizedDescription
    }

    // Update capsule
    const updated = await prisma.capsule.update({
      where: { id },
      data: updateData,
      include: {
        artifacts: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as any).errors },
        { status: 400 }
      )
    }

    console.error('Error updating capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
