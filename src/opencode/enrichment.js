import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

/**
 * Detect the agent type from the first message in a session.
 * 
 * @param {string} sessionID - The session ID to detect agent for
 * @param {string} storagePath - Root storage path (contains message/ directory)
 * @returns {Promise<string>} Agent type or 'general' as fallback
 */
export async function detectAgent(sessionID, storagePath) {
  try {
    const messagePath = join(storagePath, 'message', sessionID)
    
    // Read all message files in the session directory
    let files
    try {
      files = await readdir(messagePath)
    } catch {
      // Directory doesn't exist or can't be read
      return 'general'
    }
    
    // Filter and sort message files (msg_*.json pattern)
    const messageFiles = files
      .filter(f => f.startsWith('msg_') && f.endsWith('.json'))
      .sort() // Lexicographic sort (msg_ files are timestamped)
    
    if (messageFiles.length === 0) {
      return 'general'
    }
    
    // Read the first message file
    const firstMessagePath = join(messagePath, messageFiles[0])
    const messageContent = await readFile(firstMessagePath, 'utf-8')
    const message = JSON.parse(messageContent)
    
    // Extract agent field from message metadata
    const agent = message.agent || 'general'
    
    // Normalize agent name (lowercase, trim whitespace)
    return agent.toString().toLowerCase().trim()
    
  } catch (error) {
    // Any error during detection should fallback gracefully
    return 'general'
  }
}

/**
 * Extract first sentence from text, or truncate to maxLength
 */
function extractFirstSentenceOrTruncate(text, maxLength = 60) {
  if (!text || typeof text !== 'string') return ''

  // Clean up: remove extra whitespace, newlines
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''

  // Try to find first sentence (ending with . ! ?)
  const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]/)
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim()
    if (sentence.length <= maxLength) {
      return sentence
    }
  }

  // Fallback: truncate to maxLength
  if (cleaned.length <= maxLength) {
    return cleaned
  }

  // Truncate at word boundary
  const truncated = cleaned.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > maxLength * 0.7) {
    // Only use word boundary if it's not too far back
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}

/**
 * Extract semantic title from first user message in session
 * 
 * @param {string} sessionID - Session ID
 * @param {string} storagePath - Root storage path
 * @returns {Promise<string|null>} Extracted title or null if not found
 */
export async function extractSemanticTitle(sessionID, storagePath) {
  try {
    // Read messages for this session
    const messagePath = join(storagePath, 'message', sessionID)
    let messageFiles

    try {
      messageFiles = await readdir(messagePath)
    } catch {
      // No messages directory
      return null
    }

    // Find all message files
    const messages = []
    for (const file of messageFiles) {
      if (!file.startsWith('msg_') || !file.endsWith('.json')) continue

      try {
        const content = await readFile(join(messagePath, file), 'utf-8')
        const message = JSON.parse(content)
        messages.push({ ...message, filename: file })
      } catch {
        // Skip invalid message files
        continue
      }
    }

    // Sort by creation time to find first message
    messages.sort((a, b) => (a.time?.created || 0) - (b.time?.created || 0))

    // Find first user message
    const firstUserMessage = messages.find((m) => m.role === 'user')
    if (!firstUserMessage) return null

    // Read message parts to get text content
    const partPath = join(storagePath, 'part', firstUserMessage.id)
    let partFiles

    try {
      partFiles = await readdir(partPath)
    } catch {
      // No parts directory
      return null
    }

    // Find text part
    for (const file of partFiles) {
      if (!file.startsWith('prt_') || !file.endsWith('.json')) continue

      try {
        const content = await readFile(join(partPath, file), 'utf-8')
        const part = JSON.parse(content)

        if (part.type === 'text' && part.text) {
          // Extract semantic title from text
          const extracted = extractFirstSentenceOrTruncate(part.text)
          return extracted || null
        }
      } catch {
        // Skip invalid part files
        continue
      }
    }

    return null
  } catch (error) {
    // Silently fail and return null
    return null
  }
}

/**
 * Simple in-memory cache with TTL
 */
export function createCache(ttlMs = 5 * 60 * 1000, maxSize = 1000) {
  const cache = new Map()

  return {
    get(key) {
      const entry = cache.get(key)
      if (!entry) return undefined

      const now = Date.now()
      if (now - entry.timestamp > ttlMs) {
        cache.delete(key)
        return undefined
      }

      return entry.value
    },

    set(key, value) {
      // Simple LRU: delete oldest if at capacity
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }

      cache.set(key, {
        value,
        timestamp: Date.now(),
      })
    },

    clear() {
      cache.clear()
    },

    size() {
      return cache.size
    },
  }
}

/**
 * Enrich a session with actual agent type from message metadata.
 * 
 * @param {Object} session - Session object to enrich
 * @param {string} storagePath - Root storage path
 * @param {Object} cache - Cache instance
 * @returns {Promise<Object>} Enriched session
 */
export async function enrichSessionAgent(session, storagePath, cache) {
  // Create cache key from session ID and updated timestamp
  const cacheKey = `agent_${session.id}_${session.updated}`
  
  // Check cache first
  const cachedAgent = cache.get(cacheKey)
  if (cachedAgent !== undefined) {
    return {
      ...session,
      agent: cachedAgent
    }
  }
  
  // Detect agent from messages
  const detectedAgent = await detectAgent(session.id, storagePath)
  
  // Update cache
  cache.set(cacheKey, detectedAgent)
  
  // Return enriched session
  return {
    ...session,
    agent: detectedAgent
  }
}

/**
 * Enrich session with semantic title
 * 
 * @param {object} session - Session object
 * @param {string} storagePath - Root storage path
 * @param {object} cache - Cache instance
 * @returns {Promise<object>} Enriched session
 */
export async function enrichSessionTitle(session, storagePath, cache) {
  // Check if original title looks like a generic timestamp
  const title = session.title || ''
  const isGenericTitle =
    title.startsWith('New session - ') || title.match(/^\d{4}-\d{2}-\d{2}/) || !title

  // Skip enrichment if title looks semantic already
  if (!isGenericTitle) {
    return session
  }

  // Check cache first
  const cacheKey = `title_${session.id}_${session.time?.updated || 0}`
  const cachedTitle = cache.get(cacheKey)
  if (cachedTitle !== undefined) {
    return {
      ...session,
      title: cachedTitle || session.title,
    }
  }

  // Extract semantic title
  const semanticTitle = await extractSemanticTitle(session.id, storagePath)

  // Update cache
  cache.set(cacheKey, semanticTitle)

  // Return enriched session or original if extraction failed
  return {
    ...session,
    title: semanticTitle || session.title,
  }
}
