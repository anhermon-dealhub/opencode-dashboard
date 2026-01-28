import { describe, test, expect, mock } from 'bun:test'
import { discoverSessions } from '../src/opencode/sessions.js'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('sessions module', () => {
  describe('determineStatus function (via discoverSessions)', () => {
    test('should mark session as busy when age < busyMinutes', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_test1.json', {
        id: 'test1',
        slug: 'test-session',
        title: 'Test Session',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 } // 2 minutes ago
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toHaveLength(1)
      expect(sessions[0].status).toBe('busy')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should mark session as idle when busyMinutes <= age < staleMinutes', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_test2.json', {
        id: 'test2',
        slug: 'idle-session',
        title: 'Idle Session',
        directory: '/test/dir',
        time: { updated: now - 10 * 60000 } // 10 minutes ago
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toHaveLength(1)
      expect(sessions[0].status).toBe('idle')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should mark session as stale when age >= staleMinutes', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_test3.json', {
        id: 'test3',
        slug: 'stale-session',
        title: 'Stale Session',
        directory: '/test/dir',
        time: { updated: now - 45 * 60000 } // 45 minutes ago
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toHaveLength(1)
      expect(sessions[0].status).toBe('stale')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should use custom threshold values', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_test4.json', {
        id: 'test4',
        slug: 'custom-threshold',
        title: 'Custom Threshold',
        directory: '/test/dir',
        time: { updated: now - 8 * 60000 } // 8 minutes ago
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 10,
        staleMinutes: 60
      })

      expect(sessions).toHaveLength(1)
      expect(sessions[0].status).toBe('busy')
      
      await cleanupTestEnvironment(testDir)
    })
  })

  describe('determinePhase function (via discoverSessions)', () => {
    test('should detect research phase from title', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_research.json', {
        id: 'research',
        slug: 'research-session',
        title: 'Research new feature',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('research')
      await cleanupTestEnvironment(testDir)
    })

    test('should detect planning phase from title', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_planning.json', {
        id: 'planning',
        slug: 'planning-session',
        title: 'Plan implementation strategy',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('planning')
      await cleanupTestEnvironment(testDir)
    })

    test('should detect implementing phase from title when busy', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_implementing.json', {
        id: 'implementing',
        slug: 'implementing-session',
        title: 'Implement new feature',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('implementing')
      await cleanupTestEnvironment(testDir)
    })

    test('should detect done phase from title', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_done.json', {
        id: 'done',
        slug: 'done-session',
        title: 'Complete feature verification',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('done')
      await cleanupTestEnvironment(testDir)
    })

    test('should default to implementing when busy with no keyword', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_default.json', {
        id: 'default',
        slug: 'default-session',
        title: 'Working on something',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('implementing')
      await cleanupTestEnvironment(testDir)
    })

    test('should default to done when not busy with no keyword', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_old.json', {
        id: 'old',
        slug: 'old-session',
        title: 'Some old work',
        directory: '/test/dir',
        time: { updated: now - 40 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('done')
      await cleanupTestEnvironment(testDir)
    })

    test('should handle case-insensitive title matching', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_case.json', {
        id: 'case',
        slug: 'case-session',
        title: 'RESEARCH NEW FEATURE',
        directory: '/test/dir',
        time: { updated: now - 2 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].phase).toBe('research')
      await cleanupTestEnvironment(testDir)
    })
  })

  describe('session data parsing', () => {
    test('should parse complete session data correctly', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_complete.json', {
        id: 'complete-id',
        slug: 'complete-slug',
        title: 'Complete Session',
        directory: '/path/to/project',
        time: { updated: now - 5 * 60000 },
        version: '1.0.0',
        summary: {
          additions: 100,
          deletions: 50,
          files: 10
        }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0]).toMatchObject({
        id: 'complete-id',
        slug: 'complete-slug',
        title: 'Complete Session',
        directory: '/path/to/project',
        projectName: 'project',
        version: '1.0.0',
        summary: {
          additions: 100,
          deletions: 50,
          files: 10
        }
      })
      
      await cleanupTestEnvironment(testDir)
    })

    test('should handle missing optional fields', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_minimal.json', {
        id: 'minimal-id',
        time: { updated: now }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0]).toMatchObject({
        id: 'minimal-id',
        slug: 'unknown',
        title: undefined,
        summary: {
          additions: 0,
          deletions: 0,
          files: 0
        },
        parentID: null
      })
      
      await cleanupTestEnvironment(testDir)
    })

    test('should parse subagent information from title', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_subagent.json', {
        id: 'subagent-id',
        slug: 'subagent-session',
        title: 'Task description (@coder subagent)',
        directory: '/test/dir',
        time: { updated: now }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].isSubagent).toBe(true)
      expect(sessions[0].agent).toBe('coder')
      expect(sessions[0].description).toBe('Task description')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should handle regular sessions without subagent marker', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_regular.json', {
        id: 'regular-id',
        slug: 'regular-session',
        title: 'Regular task',
        directory: '/test/dir',
        time: { updated: now }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].isSubagent).toBe(false)
      expect(sessions[0].agent).toBe('general')
      expect(sessions[0].description).toBe('Regular task')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should extract projectName from directory path', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_project.json', {
        id: 'project-id',
        slug: 'project-session',
        title: 'Project task',
        directory: '/Users/test/projects/my-awesome-project',
        time: { updated: now }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].projectName).toBe('my-awesome-project')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should calculate age in minutes correctly', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      const tenMinutesAgo = now - 10 * 60000
      
      await createSessionFile(testDir, 'ses_age.json', {
        id: 'age-id',
        slug: 'age-session',
        title: 'Age test',
        directory: '/test/dir',
        time: { updated: tenMinutesAgo }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions[0].ageMinutes).toBe(10)
      
      await cleanupTestEnvironment(testDir)
    })
  })

  describe('file system operations', () => {
    test('should return empty array when storage root does not exist', async () => {
      const nonExistentPath = join(tmpdir(), 'nonexistent-' + Date.now())
      
      const sessions = await discoverSessions(nonExistentPath, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toEqual([])
    })

    test('should include global directory sessions', async () => {
      const testDir = await createTestEnvironment()
      const globalDir = join(testDir, 'session', 'global')
      await mkdir(globalDir, { recursive: true })
      
      const now = Date.now()
      await writeFile(
        join(globalDir, 'ses_global.json'),
        JSON.stringify({ 
          id: 'global-session', 
          slug: 'global-test',
          title: 'Global Session',
          directory: '/test/global/path',
          time: { created: now, updated: now } 
        })
      )

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions.length).toBe(1)
      expect(sessions[0].id).toBe('global-session')
      expect(sessions[0].projectName).toBe('path')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should skip non-directory items in session path', async () => {
      const testDir = await createTestEnvironment()
      const sessionPath = join(testDir, 'session')
      
      // Create a file instead of directory
      await writeFile(join(sessionPath, 'somefile.txt'), 'content')

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toEqual([])
      
      await cleanupTestEnvironment(testDir)
    })

    test('should skip files that do not match ses_*.json pattern', async () => {
      const testDir = await createTestEnvironment()
      const projectDir = join(testDir, 'session', 'test-project')
      await mkdir(projectDir, { recursive: true })
      
      const now = Date.now()
      await writeFile(
        join(projectDir, 'other_file.json'),
        JSON.stringify({ id: 'other', time: { updated: now } })
      )
      await writeFile(join(projectDir, 'ses_test.txt'), 'not json')

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toEqual([])
      
      await cleanupTestEnvironment(testDir)
    })

    test('should skip unreadable or invalid JSON files', async () => {
      const testDir = await createTestEnvironment()
      const projectDir = join(testDir, 'session', 'test-project')
      await mkdir(projectDir, { recursive: true })
      
      await writeFile(join(projectDir, 'ses_invalid.json'), 'invalid json{')

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toEqual([])
      
      await cleanupTestEnvironment(testDir)
    })

    test('should sort sessions by updated time (newest first)', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      await createSessionFile(testDir, 'ses_old.json', {
        id: 'old',
        slug: 'old-session',
        title: 'Old',
        directory: '/test/dir',
        time: { updated: now - 20 * 60000 }
      })
      
      await createSessionFile(testDir, 'ses_new.json', {
        id: 'new',
        slug: 'new-session',
        title: 'New',
        directory: '/test/dir',
        time: { updated: now - 5 * 60000 }
      })
      
      await createSessionFile(testDir, 'ses_newest.json', {
        id: 'newest',
        slug: 'newest-session',
        title: 'Newest',
        directory: '/test/dir',
        time: { updated: now - 1 * 60000 }
      })

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toHaveLength(3)
      expect(sessions[0].id).toBe('newest')
      expect(sessions[1].id).toBe('new')
      expect(sessions[2].id).toBe('old')
      
      await cleanupTestEnvironment(testDir)
    })

    test('should handle multiple projects with multiple sessions', async () => {
      const testDir = await createTestEnvironment()
      const now = Date.now()
      
      // Project 1
      await createSessionFile(testDir, 'ses_p1_s1.json', {
        id: 'p1-s1',
        slug: 'project1-session1',
        title: 'Project 1 Session 1',
        directory: '/test/project1',
        time: { updated: now }
      }, 'project1')
      
      await createSessionFile(testDir, 'ses_p1_s2.json', {
        id: 'p1-s2',
        slug: 'project1-session2',
        title: 'Project 1 Session 2',
        directory: '/test/project1',
        time: { updated: now - 5 * 60000 }
      }, 'project1')
      
      // Project 2
      await createSessionFile(testDir, 'ses_p2_s1.json', {
        id: 'p2-s1',
        slug: 'project2-session1',
        title: 'Project 2 Session 1',
        directory: '/test/project2',
        time: { updated: now - 10 * 60000 }
      }, 'project2')

      const sessions = await discoverSessions(testDir, {
        busyMinutes: 5,
        staleMinutes: 30
      })

      expect(sessions).toHaveLength(3)
      expect(sessions.map(s => s.id)).toContain('p1-s1')
      expect(sessions.map(s => s.id)).toContain('p1-s2')
      expect(sessions.map(s => s.id)).toContain('p2-s1')
      
      await cleanupTestEnvironment(testDir)
    })
  })
})

// Helper functions
async function createTestEnvironment() {
  const testDir = join(tmpdir(), 'opencode-test-' + Date.now())
  const sessionPath = join(testDir, 'session', 'test-project')
  await mkdir(sessionPath, { recursive: true })
  return testDir
}

async function createSessionFile(testDir, filename, data, projectName = 'test-project') {
  const projectPath = join(testDir, 'session', projectName)
  await mkdir(projectPath, { recursive: true })
  const filePath = join(projectPath, filename)
  await writeFile(filePath, JSON.stringify(data))
}

async function cleanupTestEnvironment(testDir) {
  try {
    await rm(testDir, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors
  }
}
