import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitConfig } from '@/lib/rate-limit'
import { capsuleSchemas, sanitizeString, validateArtifactBlob, containsDangerousContent } from '@/lib/validation'

const createRateLimit = rateLimit(rateLimitConfig.create)
const listRateLimit = rateLimit(rateLimitConfig.standard)

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await createRateLimit(req)
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
    const validatedData = capsuleSchemas.create.parse(body)

    // Sanitize title and description
    const sanitizedTitle = sanitizeString(validatedData.title)
    const sanitizedDescription = validatedData.description ? sanitizeString(validatedData.description) : undefined

    // Check for dangerous content
    if (containsDangerousContent(sanitizedTitle) || (sanitizedDescription && containsDangerousContent(sanitizedDescription))) {
      return NextResponse.json(
        { error: 'Content contains potentially dangerous patterns' },
        { status: 400 }
      )
    }

    // Validate artifact blobs
    if (validatedData.artifacts) {
      for (const artifact of validatedData.artifacts) {
        if (artifact.encryptedBlob) {
          const validation = validateArtifactBlob(artifact.encryptedBlob)
          if (!validation.valid) {
            return NextResponse.json(
              { error: validation.error },
              { status: 400 }
            )
          }
        }
      }
    }

    // Create capsule with artifacts
    const capsule = await prisma.capsule.create({
      data: {
        userId: user.id,
        title: sanitizedTitle,
        description: sanitizedDescription,
        snapshotMeta: validatedData.snapshotMeta || {},
        artifacts: {
          create: validatedData.artifacts?.map(artifact => ({
            kind: artifact.kind,
            title: artifact.title ? sanitizeString(artifact.title) : undefined,
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
        ipAddress: req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        userAgent: req.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json(capsule, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: (error as any).errors },
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
  // Apply rate limiting
  const rateLimitResult = await listRateLimit(req)
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

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const search = searchParams.get('search')

    // Build where clause
    const where: any = { userId: user.id }

    // Add search if provided
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeString(search)
      where.OR = [
        { title: { contains: sanitizedSearch, mode: 'insensitive' } },
        { description: { contains: sanitizedSearch, mode: 'insensitive' } },
      ]
    }

    const capsules = await prisma.capsule.findMany({
      where,
      include: {
        artifacts: {
          select: {
            id: true,
            kind: true,
            title: true,
            metadata: true,
            createdAt: true,
            // Exclude encryptedBlob for list view (performance)
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.capsule.count({ where })

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
