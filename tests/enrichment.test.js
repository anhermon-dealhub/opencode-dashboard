import { describe, test, expect, beforeEach } from 'bun:test'
import {
  detectAgent,
  createCache,
  enrichSessionAgent,
  extractSemanticTitle,
  enrichSessionTitle,
} from '../src/opencode/enrichment.js'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('enrichment module', () => {
  describe('detectAgent', () => {
    test('should detect agent from first message', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_test123'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        id: 'msg_001',
        agent: 'build',
        content: 'Test message'
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('build')
      
      await cleanupTestStorage(testDir)
    })

    test('should detect agent from first message when multiple exist', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_multi'
      
      // Create multiple messages - first one should be used
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'plan'
      })
      await createMessageFile(testDir, sessionID, 'msg_002.json', {
        agent: 'build'
      })
      await createMessageFile(testDir, sessionID, 'msg_003.json', {
        agent: 'explore'
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('plan')
      
      await cleanupTestStorage(testDir)
    })

    test('should normalize agent name (lowercase, trim)', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_normalize'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: '  BUILD  '
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('build')
      
      await cleanupTestStorage(testDir)
    })

    test('should return general when agent field is missing', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_noagent'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        id: 'msg_001',
        content: 'Message without agent field'
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('general')
      
      await cleanupTestStorage(testDir)
    })

    test('should return general when message directory does not exist', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_nonexistent'
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('general')
      
      await cleanupTestStorage(testDir)
    })

    test('should return general when no message files exist', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_empty'
      
      // Create directory but no files
      const messagePath = join(testDir, 'message', sessionID)
      await mkdir(messagePath, { recursive: true })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('general')
      
      await cleanupTestStorage(testDir)
    })

    test('should return general when message file has invalid JSON', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_invalid'
      
      const messagePath = join(testDir, 'message', sessionID)
      await mkdir(messagePath, { recursive: true })
      await writeFile(join(messagePath, 'msg_001.json'), 'invalid json{')
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('general')
      
      await cleanupTestStorage(testDir)
    })

    test('should skip non-message files and read correct one', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_mixed'
      
      const messagePath = join(testDir, 'message', sessionID)
      await mkdir(messagePath, { recursive: true })
      
      // Create non-message files
      await writeFile(join(messagePath, 'other.json'), '{}')
      await writeFile(join(messagePath, 'prt_001.json'), '{}')
      
      // Create actual message file
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'explore'
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('explore')
      
      await cleanupTestStorage(testDir)
    })

    test('should handle various agent types', async () => {
      const testDir = await createTestStorage()
      
      const agentTypes = ['build', 'plan', 'explore', 'test', 'coder', 'general']
      
      for (const agentType of agentTypes) {
        const sessionID = `ses_${agentType}`
        await createMessageFile(testDir, sessionID, 'msg_001.json', {
          agent: agentType
        })
        
        const detected = await detectAgent(sessionID, testDir)
        expect(detected).toBe(agentType)
      }
      
      await cleanupTestStorage(testDir)
    })

    test('should handle numeric agent values', async () => {
      const testDir = await createTestStorage()
      const sessionID = 'ses_numeric'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 123
      })
      
      const agent = await detectAgent(sessionID, testDir)
      expect(agent).toBe('123')
      
      await cleanupTestStorage(testDir)
    })
  })

  describe('createCache', () => {
    test('should store and retrieve values', () => {
      const cache = createCache()
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    test('should return undefined for non-existent keys', () => {
      const cache = createCache()
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    test('should respect TTL and expire old entries', async () => {
      const cache = createCache(100) // 100ms TTL
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      await new Promise((resolve) => setTimeout(resolve, 150))
      expect(cache.get('key1')).toBeUndefined()
    })

    test('should enforce max size with LRU eviction', () => {
      const cache = createCache(60000, 3) // 3 item limit

      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')

      expect(cache.size()).toBe(3)

      // Adding 4th item should evict oldest (key1)
      cache.set('key4', 'value4')

      expect(cache.size()).toBe(3)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.get('key4')).toBe('value4')
    })

    test('should clear all entries', () => {
      const cache = createCache()
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      expect(cache.size()).toBe(2)
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
    })

    test('should handle overwrites correctly', () => {
      const cache = createCache()
      
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
      
      cache.set('key1', 'value2')
      expect(cache.get('key1')).toBe('value2')
    })

    test('should track size correctly', () => {
      const cache = createCache()
      
      expect(cache.size()).toBe(0)
      
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
      
      cache.clear()
      expect(cache.size()).toBe(0)
    })
  })

  describe('enrichSessionAgent', () => {
    test('should enrich session with detected agent', async () => {
      const testDir = await createTestStorage()
      const cache = createCache()
      const sessionID = 'ses_enrich1'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'build'
      })
      
      const session = {
        id: sessionID,
        title: 'Test Session',
        updated: Date.now(),
        agent: 'general' // Default value before enrichment
      }
      
      const enriched = await enrichSessionAgent(session, testDir, cache)
      
      expect(enriched.agent).toBe('build')
      expect(enriched.id).toBe(sessionID)
      expect(enriched.title).toBe('Test Session')
      
      await cleanupTestStorage(testDir)
    })

    test('should use cached value on second call', async () => {
      const testDir = await createTestStorage()
      const cache = createCache()
      const sessionID = 'ses_cached'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'plan'
      })
      
      const session = {
        id: sessionID,
        updated: Date.now(),
        agent: 'general'
      }
      
      // First call - should detect from file
      const enriched1 = await enrichSessionAgent(session, testDir, cache)
      expect(enriched1.agent).toBe('plan')
      expect(cache.size()).toBe(1)
      
      // Second call - should use cache
      const enriched2 = await enrichSessionAgent(session, testDir, cache)
      expect(enriched2.agent).toBe('plan')
      expect(cache.size()).toBe(1) // Size shouldn't change
      
      await cleanupTestStorage(testDir)
    })

    test('should create different cache keys for different updates', async () => {
      const testDir = await createTestStorage()
      const cache = createCache()
      const sessionID = 'ses_updates'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'build'
      })
      
      const session1 = {
        id: sessionID,
        updated: 1000000,
        agent: 'general'
      }
      
      const session2 = {
        id: sessionID,
        updated: 2000000,
        agent: 'general'
      }
      
      await enrichSessionAgent(session1, testDir, cache)
      await enrichSessionAgent(session2, testDir, cache)
      
      // Should have 2 cache entries (different timestamps)
      expect(cache.size()).toBe(2)
      
      await cleanupTestStorage(testDir)
    })

    test('should fallback to general when detection fails', async () => {
      const testDir = await createTestStorage()
      const cache = createCache()
      const sessionID = 'ses_nonexistent'
      
      const session = {
        id: sessionID,
        updated: Date.now(),
        agent: 'general'
      }
      
      const enriched = await enrichSessionAgent(session, testDir, cache)
      
      expect(enriched.agent).toBe('general')
      
      await cleanupTestStorage(testDir)
    })

    test('should preserve all session properties', async () => {
      const testDir = await createTestStorage()
      const cache = createCache()
      const sessionID = 'ses_preserve'
      
      await createMessageFile(testDir, sessionID, 'msg_001.json', {
        agent: 'explore'
      })
      
      const session = {
        id: sessionID,
        slug: 'test-slug',
        title: 'Test Title',
        description: 'Test Description',
        directory: '/test/dir',
        projectName: 'test-project',
        updated: Date.now(),
        ageMinutes: 5,
        status: 'busy',
        phase: 'implementing',
        agent: 'general',
        isSubagent: false,
        parentID: null,
        version: '1.0.0',
        summary: { additions: 10, deletions: 5, files: 2 }
      }
      
      const enriched = await enrichSessionAgent(session, testDir, cache)
      
      // Agent should be enriched
      expect(enriched.agent).toBe('explore')
      
      // All other properties should be preserved
      expect(enriched.slug).toBe('test-slug')
      expect(enriched.title).toBe('Test Title')
      expect(enriched.description).toBe('Test Description')
      expect(enriched.directory).toBe('/test/dir')
      expect(enriched.projectName).toBe('test-project')
      expect(enriched.ageMinutes).toBe(5)
      expect(enriched.status).toBe('busy')
      expect(enriched.phase).toBe('implementing')
      expect(enriched.isSubagent).toBe(false)
      expect(enriched.parentID).toBe(null)
      expect(enriched.version).toBe('1.0.0')
      expect(enriched.summary).toEqual({ additions: 10, deletions: 5, files: 2 })
      
      await cleanupTestStorage(testDir)
    })
  })

  describe('extractSemanticTitle', () => {
    test('should extract first sentence from user message', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_123'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Implement remote Allure URL extraction. This is a feature request.',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBe('Implement remote Allure URL extraction.')

      await cleanup(testDir)
    })

    test('should truncate long text without sentence ending', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_456'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      const longText =
        'This is a very long message that does not have any sentence endings and should be truncated at word boundaries'
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: longText,
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toContain('This is a very long message')
      expect(title?.length).toBeLessThanOrEqual(63) // 60 + '...'

      await cleanup(testDir)
    })

    test('should handle text shorter than max length', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_789'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Short task',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBe('Short task')

      await cleanup(testDir)
    })

    test('should skip assistant messages and find first user message', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_multi'

      // Create assistant message first (older timestamp)
      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'assistant',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Assistant response',
      })

      // Create user message second (newer timestamp)
      await createMessage(testDir, sessionID, 'msg_2', {
        id: 'msg_2',
        role: 'user',
        time: { created: 2000 },
      })
      await createPart(testDir, 'msg_2', 'prt_2', {
        type: 'text',
        text: 'User question here.',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBe('User question here.')

      await cleanup(testDir)
    })

    test('should handle multiple parts and find text part', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_parts'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      // Create non-text part
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'image',
        data: 'imagedata',
      })

      // Create text part
      await createPart(testDir, 'msg_1', 'prt_2', {
        type: 'text',
        text: 'Fix the bug in authentication.',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBe('Fix the bug in authentication.')

      await cleanup(testDir)
    })

    test('should clean up whitespace and newlines', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_whitespace'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: '  \n\n  Add   feature  \n  with   tests  \n\n  ',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBe('Add feature with tests')

      await cleanup(testDir)
    })

    test('should return null when session has no messages', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_nomessages'

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })

    test('should return null when message has no parts', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_noparts'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })

    test('should return null when no user messages exist', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_nouser'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'assistant',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Assistant only',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })

    test('should handle invalid JSON gracefully', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_invalid'

      const messagePath = join(testDir, 'message', sessionID)
      await mkdir(messagePath, { recursive: true })
      await writeFile(join(messagePath, 'msg_1.json'), 'invalid json{')

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })

    test('should handle missing directories gracefully', async () => {
      const testDir = await createTestEnv()
      const title = await extractSemanticTitle('nonexistent', testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })

    test('should handle empty text gracefully', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_empty'

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })

      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: '   \n\n   ',
      })

      const title = await extractSemanticTitle(sessionID, testDir)
      expect(title).toBeNull()

      await cleanup(testDir)
    })
  })

  describe('enrichSessionTitle', () => {
    test('should enrich session with generic timestamp title', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_generic'
      const cache = createCache()

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Build new dashboard feature.',
      })

      const session = {
        id: sessionID,
        title: 'New session - 2026-01-28T10:16:06.133Z',
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched.title).toBe('Build new dashboard feature.')
      expect(enriched.id).toBe(sessionID)

      await cleanup(testDir)
    })

    test('should not enrich session with semantic title', async () => {
      const testDir = await createTestEnv()
      const cache = createCache()

      const session = {
        id: 'ses_semantic',
        title: 'Implement user authentication',
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched.title).toBe('Implement user authentication')

      await cleanup(testDir)
    })

    test('should use cache for repeated enrichment', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_cache'
      const cache = createCache()

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Cached title extraction.',
      })

      const session = {
        id: sessionID,
        title: 'New session - 2026-01-28T10:16:06.133Z',
        time: { updated: 123456 },
      }

      // First call - should extract
      const enriched1 = await enrichSessionTitle(session, testDir, cache)
      expect(enriched1.title).toBe('Cached title extraction.')
      expect(cache.size()).toBe(1)

      // Second call - should use cache
      const enriched2 = await enrichSessionTitle(session, testDir, cache)
      expect(enriched2.title).toBe('Cached title extraction.')
      expect(cache.size()).toBe(1)

      await cleanup(testDir)
    })

    test('should fallback to original title when extraction fails', async () => {
      const testDir = await createTestEnv()
      const cache = createCache()

      const session = {
        id: 'ses_nodata',
        title: 'New session - 2026-01-28T10:16:06.133Z',
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched.title).toBe('New session - 2026-01-28T10:16:06.133Z')

      await cleanup(testDir)
    })

    test('should handle session with empty title', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_empty_title'
      const cache = createCache()

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Extracted title.',
      })

      const session = {
        id: sessionID,
        title: '',
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched.title).toBe('Extracted title.')

      await cleanup(testDir)
    })

    test('should preserve all session properties', async () => {
      const testDir = await createTestEnv()
      const cache = createCache()

      const session = {
        id: 'ses_preserve',
        slug: 'test-slug',
        title: 'Implement feature',
        description: 'Task description',
        directory: '/test/dir',
        projectName: 'test-project',
        updated: 123456,
        ageMinutes: 10,
        status: 'busy',
        phase: 'implementing',
        agent: 'general',
        isSubagent: false,
        parentID: null,
        version: '1.0.0',
        summary: { additions: 10, deletions: 5, files: 2 },
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched).toMatchObject({
        id: 'ses_preserve',
        slug: 'test-slug',
        description: 'Task description',
        directory: '/test/dir',
        projectName: 'test-project',
      })

      await cleanup(testDir)
    })

    test('should handle date-like titles', async () => {
      const testDir = await createTestEnv()
      const sessionID = 'ses_date'
      const cache = createCache()

      await createMessage(testDir, sessionID, 'msg_1', {
        id: 'msg_1',
        role: 'user',
        time: { created: 1000 },
      })
      await createPart(testDir, 'msg_1', 'prt_1', {
        type: 'text',
        text: 'Date title test.',
      })

      const session = {
        id: sessionID,
        title: '2026-01-28 work session',
        time: { updated: 123456 },
      }

      const enriched = await enrichSessionTitle(session, testDir, cache)
      expect(enriched.title).toBe('Date title test.')

      await cleanup(testDir)
    })
  })
})

// Helper functions for agent detection tests
async function createTestStorage() {
  const testDir = join(tmpdir(), 'opencode-enrichment-test-' + Date.now())
  await mkdir(testDir, { recursive: true })
  return testDir
}

async function createMessageFile(storageRoot, sessionID, filename, data) {
  const messagePath = join(storageRoot, 'message', sessionID)
  await mkdir(messagePath, { recursive: true })
  const filePath = join(messagePath, filename)
  await writeFile(filePath, JSON.stringify(data))
}

async function cleanupTestStorage(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Helper functions for semantic title tests
async function createTestEnv() {
  const testDir = join(tmpdir(), 'opencode-enrich-test-' + Date.now())
  await mkdir(testDir, { recursive: true })
  return testDir
}

async function createMessage(testDir, sessionID, messageID, data) {
  const messagePath = join(testDir, 'message', sessionID)
  await mkdir(messagePath, { recursive: true })
  await writeFile(join(messagePath, `${messageID}.json`), JSON.stringify(data))
}

async function createPart(testDir, messageID, partID, data) {
  const partPath = join(testDir, 'part', messageID)
  await mkdir(partPath, { recursive: true })
  await writeFile(join(partPath, `${partID}.json`), JSON.stringify(data))
}

async function cleanup(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}
