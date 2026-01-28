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
 * Create a simple cache with TTL and size limits.
 * 
 * @returns {Object} Cache with get/set methods
 */
export function createCache() {
  const cache = new Map()
  const TTL_MS = 5 * 60 * 1000 // 5 minutes
  const MAX_SIZE = 1000
  
  return {
    get(key) {
      const entry = cache.get(key)
      if (!entry) return undefined
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > TTL_MS) {
        cache.delete(key)
        return undefined
      }
      
      return entry.value
    },
    
    set(key, value) {
      // Simple LRU: if cache is full, delete oldest entry
      if (cache.size >= MAX_SIZE) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }
      
      cache.set(key, {
        value,
        timestamp: Date.now()
      })
    },
    
    clear() {
      cache.clear()
    },
    
    size() {
      return cache.size
    }
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
  const cacheKey = `${session.id}_${session.updated}`
  
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
