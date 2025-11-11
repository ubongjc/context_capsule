import validator from 'validator'
import { z } from 'zod'

// Input sanitization
export function sanitizeString(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '')

  // Escape special characters
  sanitized = validator.escape(sanitized)

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}

// File validation
export interface FileValidationResult {
  valid: boolean
  error?: string
}

const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Text
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export function validateFile(contentType: string, fileName: string, fileSize?: number): FileValidationResult {
  // Check content type
  if (!ALLOWED_FILE_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: 'File type not allowed'
    }
  }

  // Check file size
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  // Check file extension matches content type
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) {
    return {
      valid: false,
      error: 'Invalid file name'
    }
  }

  const typeToExtMap: Record<string, string[]> = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'text/plain': ['txt'],
    'text/markdown': ['md', 'markdown'],
    'application/zip': ['zip'],
  }

  const allowedExts = typeToExtMap[contentType]
  if (allowedExts && !allowedExts.includes(ext)) {
    return {
      valid: false,
      error: 'File extension does not match content type'
    }
  }

  return { valid: true }
}

// Request validation schemas
export const capsuleSchemas = {
  create: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    snapshotMeta: z.record(z.string(), z.any()).optional(),
    artifacts: z.array(
      z.object({
        kind: z.enum(['TAB', 'NOTE', 'FILE', 'SELECTION', 'SCROLL_POSITION']),
        title: z.string().max(255).optional(),
        encryptedBlob: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        storageUrl: z.string().url().optional(),
      })
    ).max(100).optional(), // Limit to 100 artifacts per capsule
  }),

  update: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
  }),

  list: z.object({
    limit: z.coerce.number().min(1).max(100).default(10),
    offset: z.coerce.number().min(0).default(0),
    search: z.string().max(100).optional(),
  }),
}

export const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  artifactId: z.string().optional(),
})

// ID validation
export function isValidId(id: string): boolean {
  // Validate CUID2 format (24-32 lowercase alphanumeric chars)
  return /^[a-z0-9]{24,32}$/.test(id)
}

// Email validation
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email)
}

// URL validation
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })
}

// Dangerous patterns detection - enhanced with unicode normalization and entity decoding
const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /eval\(/gi,
  /document\.cookie/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /<embed/gi,
  /<object/gi,
  /&#x/gi, // Hex entities
  /&#\d/gi, // Decimal entities
]

export function containsDangerousContent(content: string): boolean {
  // Normalize unicode to prevent evasion via unicode tricks
  const normalized = content.normalize('NFKC')

  // Remove null bytes
  const cleaned = normalized.replace(/\0/g, '')

  // Decode common HTML entities to catch obfuscated attacks
  const decoded = cleaned
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x3c;/gi, '<')
    .replace(/&#60;/gi, '<')
    .replace(/&#x3e;/gi, '>')
    .replace(/&#62;/gi, '>')

  // Test against patterns (case-insensitive already via /gi flag)
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(decoded))
}

// Validate artifact blob size
const MAX_BLOB_SIZE = 10 * 1024 * 1024 // 10MB for encrypted blobs

export function validateArtifactBlob(encryptedBlob: string): FileValidationResult {
  // Validate base64 format and decode with error handling
  try {
    // Test if valid base64
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encryptedBlob)) {
      return {
        valid: false,
        error: 'Invalid base64 format'
      }
    }

    const size = Buffer.from(encryptedBlob, 'base64').length

    if (size > MAX_BLOB_SIZE) {
      return {
        valid: false,
        error: `Encrypted blob exceeds maximum size of ${MAX_BLOB_SIZE / 1024 / 1024}MB`
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid base64 encoding'
    }
  }
}
