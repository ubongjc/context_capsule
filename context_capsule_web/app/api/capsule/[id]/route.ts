import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Verify ownership before delete
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

    // Delete capsule (artifacts will be deleted via cascade)
    await prisma.capsule.delete({
      where: { id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_CAPSULE',
        resource: id,
        metadata: { title: capsule.title },
      },
    })

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

    // Update capsule
    const updated = await prisma.capsule.update({
      where: { id },
      data: {
        title: body.title ?? capsule.title,
        description: body.description ?? capsule.description,
      },
      include: {
        artifacts: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
