import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const eventType = evt.type

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data

    // Check email_addresses array has at least one element
    if (!email_addresses || email_addresses.length === 0) {
      console.error('No email addresses provided for user:', id)
      return new Response('Missing email addresses', { status: 400 })
    }

    await prisma.user.upsert({
      where: { clerkId: id },
      create: {
        clerkId: id,
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
      },
      update: {
        email: email_addresses[0].email_address,
        name: `${first_name || ''} ${last_name || ''}`.trim() || null,
      },
    })
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (id) {
      // Log audit before deletion
      try {
        const user = await prisma.user.findUnique({
          where: { clerkId: id }
        })

        if (user) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'DELETE_USER',
              resource: user.id,
              metadata: { clerkId: id, email: user.email },
            }
          })
        }
      } catch (auditError) {
        console.error('Failed to create audit log for user deletion:', auditError)
      }

      // Use deleteMany instead of delete to avoid error if user doesn't exist
      await prisma.user.deleteMany({
        where: { clerkId: id },
      })
    }
  }

  return new Response('', { status: 200 })
}
