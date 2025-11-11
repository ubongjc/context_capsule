import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Fetch capsule with all artifacts
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

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESTORE_CAPSULE',
        resource: id,
        metadata: { title: capsule.title },
      },
    })

    // Return capsule data for restoration
    // Client will handle decryption and actual restoration
    return NextResponse.json({
      capsule: {
        id: capsule.id,
        title: capsule.title,
        description: capsule.description,
        snapshotMeta: capsule.snapshotMeta,
      },
      artifacts: capsule.artifacts.map((artifact: { id: string; kind: string; title: string | null; encryptedBlob: string | null; metadata: any; storageUrl: string | null }) => ({
        id: artifact.id,
        kind: artifact.kind,
        title: artifact.title,
        encryptedBlob: artifact.encryptedBlob,
        metadata: artifact.metadata,
        storageUrl: artifact.storageUrl,
      })),
    })
  } catch (error) {
    console.error('Error restoring capsule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
