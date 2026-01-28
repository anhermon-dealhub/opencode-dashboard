import { describe, test, expect } from 'bun:test'
import { discoverSessions } from '../src/opencode/sessions.js'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('session enrichment integration', () => {
  test('should enrich generic session titles with semantic content', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    // Create session with generic title
    const sessionID = 'ses_integration'
    await createSessionFile(testDir, 'ses_integration.json', {
      id: sessionID,
      slug: 'integration-test',
      title: 'New session - 2026-01-28T10:16:06.133Z',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    // Create first user message
    await createMessage(testDir, sessionID, 'msg_1', {
      id: 'msg_1',
      role: 'user',
      time: { created: now - 2 * 60000 },
    })

    await createPart(testDir, 'msg_1', 'prt_1', {
      type: 'text',
      text: 'Implement semantic title extraction from first message!',
    })

    const sessions = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions).toHaveLength(1)
    expect(sessions[0].title).toBe(
      'Implement semantic title extraction from first message!'
    )

    await cleanupTestEnvironment(testDir)
  })

  test('should preserve semantic titles and not override them', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    const sessionID = 'ses_semantic'
    await createSessionFile(testDir, 'ses_semantic.json', {
      id: sessionID,
      slug: 'semantic-test',
      title: 'Build authentication system',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    // Even with message present, semantic title should be preserved
    await createMessage(testDir, sessionID, 'msg_1', {
      id: 'msg_1',
      role: 'user',
      time: { created: now - 2 * 60000 },
    })

    await createPart(testDir, 'msg_1', 'prt_1', {
      type: 'text',
      text: 'Different message content.',
    })

    const sessions = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions).toHaveLength(1)
    expect(sessions[0].title).toBe('Build authentication system')

    await cleanupTestEnvironment(testDir)
  })

  test('should handle sessions without messages gracefully', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    await createSessionFile(testDir, 'ses_nomsg.json', {
      id: 'ses_nomsg',
      slug: 'no-message-test',
      title: 'New session - 2026-01-28T10:16:06.133Z',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    const sessions = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions).toHaveLength(1)
    // Should fallback to original title
    expect(sessions[0].title).toBe('New session - 2026-01-28T10:16:06.133Z')

    await cleanupTestEnvironment(testDir)
  })

  test('should cache titles for performance', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    const sessionID = 'ses_cache'
    await createSessionFile(testDir, 'ses_cache.json', {
      id: sessionID,
      slug: 'cache-test',
      title: 'New session - 2026-01-28T10:16:06.133Z',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    await createMessage(testDir, sessionID, 'msg_1', {
      id: 'msg_1',
      role: 'user',
      time: { created: now - 2 * 60000 },
    })

    await createPart(testDir, 'msg_1', 'prt_1', {
      type: 'text',
      text: 'Cached semantic title.',
    })

    // First discovery - should extract and cache
    const sessions1 = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions1[0].title).toBe('Cached semantic title.')

    // Second discovery - should use cache
    const sessions2 = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions2[0].title).toBe('Cached semantic title.')

    await cleanupTestEnvironment(testDir)
  })

  test('should extract first sentence when message has multiple sentences', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    const sessionID = 'ses_multi'
    await createSessionFile(testDir, 'ses_multi.json', {
      id: sessionID,
      slug: 'multi-sentence',
      title: 'New session - 2026-01-28T10:16:06.133Z',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    await createMessage(testDir, sessionID, 'msg_1', {
      id: 'msg_1',
      role: 'user',
      time: { created: now - 2 * 60000 },
    })

    await createPart(testDir, 'msg_1', 'prt_1', {
      type: 'text',
      text: 'Fix authentication bug. This is causing login failures. Need urgent fix!',
    })

    const sessions = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions[0].title).toBe('Fix authentication bug.')

    await cleanupTestEnvironment(testDir)
  })

  test('should truncate very long first messages', async () => {
    const testDir = await createTestEnvironment()
    const now = Date.now()

    const sessionID = 'ses_long'
    await createSessionFile(testDir, 'ses_long.json', {
      id: sessionID,
      slug: 'long-message',
      title: 'New session - 2026-01-28T10:16:06.133Z',
      directory: '/test/project',
      time: { updated: now - 2 * 60000 },
    })

    await createMessage(testDir, sessionID, 'msg_1', {
      id: 'msg_1',
      role: 'user',
      time: { created: now - 2 * 60000 },
    })

    await createPart(testDir, 'msg_1', 'prt_1', {
      type: 'text',
      text: 'This is a very long message that contains a lot of detailed information about the task at hand and should be truncated appropriately at a reasonable length',
    })

    const sessions = await discoverSessions(testDir, {
      busyMinutes: 5,
      staleMinutes: 30,
    })

    expect(sessions[0].title?.length).toBeLessThanOrEqual(63) // 60 + '...'
    expect(sessions[0].title).toContain('This is a very long message')
    expect(sessions[0].title).toContain('...')

    await cleanupTestEnvironment(testDir)
  })
})

// Helper functions
async function createTestEnvironment() {
  const testDir = join(tmpdir(), 'opencode-integration-' + Date.now())
  const sessionPath = join(testDir, 'session', 'test-project')
  await mkdir(sessionPath, { recursive: true })
  return testDir
}

async function createSessionFile(
  testDir,
  filename,
  data,
  projectName = 'test-project'
) {
  const projectPath = join(testDir, 'session', projectName)
  await mkdir(projectPath, { recursive: true })
  const filePath = join(projectPath, filename)
  await writeFile(filePath, JSON.stringify(data))
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

async function cleanupTestEnvironment(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}
