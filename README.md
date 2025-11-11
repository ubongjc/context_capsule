# Context Capsule

One-tap 'save my brain state' for task switching; restores tabs, notes, selection state, and context graph across devices.

## Overview

Context Capsule is a productivity application that allows users to capture and restore their entire working context with a single tap. It's designed for multitaskers who need to frequently switch between different projects and contexts.

### Key Features

- 🧠 **Instant Context Capture**: Save your current browser tabs, notes, and work state
- 🔐 **Client-Side Encryption**: All sensitive data is encrypted before leaving your device
- 🔑 **Passkey Authentication**: Modern, passwordless authentication using WebAuthn
- 📱 **Cross-Platform**: Web and iOS applications with seamless sync
- 🔄 **Smart Restore**: Restore your entire working context with a single tap
- 📊 **Context Graph**: Semantic search and organization of your work contexts

## Project Structure

```
context_capsule/
├── context_capsule_web/     # Next.js web application
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── sign-in/        # Authentication pages
│   │   └── sign-up/
│   ├── components/         # React components
│   ├── lib/                # Utilities and shared code
│   │   ├── prisma.ts       # Database client
│   │   ├── r2.ts           # Cloudflare R2 storage
│   │   └── utils.ts        # Helper functions
│   └── prisma/
│       └── schema.prisma   # Database schema
│
└── context_capsule_ios/    # iOS SwiftUI application
    └── ContextCapsule/
        ├── App/            # App entry point
        ├── Features/       # Feature modules
        │   ├── Authentication/
        │   ├── Capsules/
        │   ├── Main/
        │   └── Settings/
        ├── Networking/     # API client
        ├── Crypto/         # Encryption utilities
        └── Models/         # Data models
```

## Tech Stack

### Web Application
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL 16 + Prisma 5
- **Vector Search**: pgvector (for semantic search)
- **Storage**: Cloudflare R2 (S3-compatible)
- **Authentication**: Clerk (WebAuthn/Passkeys)
- **Payments**: Stripe
- **Observability**: Sentry + OpenTelemetry

### iOS Application
- **Framework**: SwiftUI
- **Architecture**: MVVM with Combine
- **Networking**: URLSession with async/await
- **Encryption**: CryptoKit (AES-GCM)
- **Authentication**: AuthenticationServices (Passkeys)

## Getting Started

### Prerequisites

- Node.js 18+ (for web)
- PostgreSQL 16+ (for database)
- Xcode 15+ (for iOS)
- Clerk account (for authentication)
- Cloudflare R2 account (for storage)

### Web Application Setup

1. **Navigate to the web directory**:
   ```bash
   cd context_capsule_web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your credentials:
   - Database URL (PostgreSQL)
   - Clerk authentication keys
   - Cloudflare R2 credentials
   - Stripe keys
   - Sentry DSN

4. **Set up the database**:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### iOS Application Setup

1. **Navigate to the iOS directory**:
   ```bash
   cd context_capsule_ios
   ```

2. **Open in Xcode**:
   ```bash
   open ContextCapsule.xcodeproj
   ```

3. **Configure the API endpoint**:
   - Set the `API_BASE_URL` environment variable or update `APIClient.swift`

4. **Run on simulator or device**:
   - Select your target device
   - Press Cmd+R to build and run

## API Documentation

### Authentication

All API endpoints (except `/api/health` and webhooks) require authentication via Clerk.

### Core Endpoints

#### Health Check
```
GET /api/health
```

#### Capsules
```
POST   /api/capsule          - Create a new capsule
GET    /api/capsule          - List user's capsules
GET    /api/capsule/:id      - Get a specific capsule
PATCH  /api/capsule/:id      - Update a capsule
DELETE /api/capsule/:id      - Delete a capsule
```

#### Restore
```
POST   /api/restore/:id      - Restore a capsule's state
```

#### Upload
```
POST   /api/upload           - Get signed upload URL for R2
```

## Data Model

### Capsule
Represents a saved context state:
- `id`: Unique identifier
- `userId`: Owner of the capsule
- `title`: Human-readable name
- `description`: Optional description
- `snapshotMeta`: Metadata about when/where captured
- `artifacts`: Array of captured items

### Artifact
Individual items within a capsule:
- `id`: Unique identifier
- `kind`: Type (TAB, NOTE, FILE, SELECTION, SCROLL_POSITION)
- `encryptedBlob`: Client-side encrypted content
- `metadata`: Additional context
- `storageUrl`: R2 URL for large files

## Security

### Client-Side Encryption
All sensitive data (artifact blobs) are encrypted using AES-GCM before being sent to the server. The server only stores ciphertext.

- **Web**: Uses Web Crypto API
- **iOS**: Uses CryptoKit

### Authentication
- Primary: Passkeys/WebAuthn (passwordless)
- Fallback: Magic links
- Multi-factor authentication supported via Clerk

### Privacy
- End-to-end encryption for sensitive content
- Server cannot read encrypted artifacts
- Users can export all their data
- Users can delete all their data

## Deployment

### Web Application
Recommended deployment platform: Vercel

```bash
npm run build
```

### iOS Application
Distribute via TestFlight or App Store:
1. Archive in Xcode
2. Upload to App Store Connect
3. Submit for review

## Environment Variables

### Required (Web)
```
DATABASE_URL
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

### Optional (Web)
```
STRIPE_SECRET_KEY
SENTRY_DSN
NODE_ENV
```

## Contributing

This is a private project. Please contact the maintainers for contribution guidelines.

## License

Proprietary - All rights reserved

## Support

For issues and questions, please contact support@contextcapsule.app
