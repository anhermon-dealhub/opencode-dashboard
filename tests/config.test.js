import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { getConfig } from '../src/config.js'
import { homedir } from 'os'
import { join } from 'path'

describe('config module', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env.HOST
    delete process.env.PORT
    delete process.env.OPENCODE_STORAGE_PATH
    delete process.env.OPENCODE_WEB_URL
    delete process.env.REFRESH_INTERVAL_MS
    delete process.env.SESSION_BUSY_THRESHOLD_MIN
    delete process.env.SESSION_STALE_THRESHOLD_MIN
    delete process.env.XDG_DATA_HOME
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  describe('default values', () => {
    test('should return default host when HOST not set', () => {
      const config = getConfig()
      expect(config.server.host).toBe('127.0.0.1')
    })

    test('should return default port when PORT not set', () => {
      const config = getConfig()
      expect(config.server.port).toBe(3003)
    })

    test('should return default refresh interval when not set', () => {
      const config = getConfig()
      expect(config.dashboard.refreshIntervalMs).toBe(5000)
    })

    test('should return default thresholds when not set', () => {
      const config = getConfig()
      expect(config.dashboard.thresholds.busyMinutes).toBe(5)
      expect(config.dashboard.thresholds.staleMinutes).toBe(30)
    })

    test('should return default storage path when not set', () => {
      const config = getConfig()
      const expectedPath = join(homedir(), '.local', 'share', 'opencode', 'storage')
      expect(config.opencode.storagePath).toBe(expectedPath)
    })

    test('should return default web URL when not set', () => {
      const config = getConfig()
      expect(config.opencode.webUrl).toBe('http://localhost:4096')
    })
  })

  describe('environment variable parsing', () => {
    test('should parse HOST from environment', () => {
      process.env.HOST = '0.0.0.0'
      const config = getConfig()
      expect(config.server.host).toBe('0.0.0.0')
    })

    test('should parse PORT from environment', () => {
      process.env.PORT = '8080'
      const config = getConfig()
      expect(config.server.port).toBe(8080)
    })

    test('should parse REFRESH_INTERVAL_MS from environment', () => {
      process.env.REFRESH_INTERVAL_MS = '10000'
      const config = getConfig()
      expect(config.dashboard.refreshIntervalMs).toBe(10000)
    })

    test('should parse thresholds from environment', () => {
      process.env.SESSION_BUSY_THRESHOLD_MIN = '10'
      process.env.SESSION_STALE_THRESHOLD_MIN = '60'
      const config = getConfig()
      expect(config.dashboard.thresholds.busyMinutes).toBe(10)
      expect(config.dashboard.thresholds.staleMinutes).toBe(60)
    })

    test('should handle invalid PORT gracefully', () => {
      process.env.PORT = 'not-a-number'
      const config = getConfig()
      expect(config.server.port).toBe(3003)
    })

    test('should handle empty PORT gracefully', () => {
      process.env.PORT = ''
      const config = getConfig()
      expect(config.server.port).toBe(3003)
    })

    test('should handle invalid integer env vars', () => {
      process.env.REFRESH_INTERVAL_MS = 'invalid'
      process.env.SESSION_BUSY_THRESHOLD_MIN = 'abc'
      const config = getConfig()
      expect(config.dashboard.refreshIntervalMs).toBe(5000)
      expect(config.dashboard.thresholds.busyMinutes).toBe(5)
    })
  })

  describe('home directory expansion', () => {
    test('should expand tilde in OPENCODE_STORAGE_PATH', () => {
      process.env.OPENCODE_STORAGE_PATH = '~/custom/opencode'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe(join(homedir(), 'custom', 'opencode'))
    })

    test('should expand standalone tilde', () => {
      process.env.OPENCODE_STORAGE_PATH = '~'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe(homedir())
    })

    test('should handle absolute paths without expansion', () => {
      process.env.OPENCODE_STORAGE_PATH = '/absolute/path/to/storage'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe('/absolute/path/to/storage')
    })

    test('should handle relative paths without expansion', () => {
      process.env.OPENCODE_STORAGE_PATH = './relative/path'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe('./relative/path')
    })
  })

  describe('XDG_DATA_HOME handling', () => {
    test('should use XDG_DATA_HOME when set', () => {
      process.env.XDG_DATA_HOME = '/custom/xdg/data'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe('/custom/xdg/data/opencode/storage')
    })

    test('should expand tilde in XDG_DATA_HOME', () => {
      process.env.XDG_DATA_HOME = '~/.local/share'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe(join(homedir(), '.local', 'share', 'opencode', 'storage'))
    })

    test('should ignore empty XDG_DATA_HOME', () => {
      process.env.XDG_DATA_HOME = ''
      const config = getConfig()
      const expectedPath = join(homedir(), '.local', 'share', 'opencode', 'storage')
      expect(config.opencode.storagePath).toBe(expectedPath)
    })

    test('should prefer OPENCODE_STORAGE_PATH over XDG_DATA_HOME', () => {
      process.env.XDG_DATA_HOME = '/xdg/data'
      process.env.OPENCODE_STORAGE_PATH = '/custom/storage'
      const config = getConfig()
      expect(config.opencode.storagePath).toBe('/custom/storage')
    })
  })

  describe('OPENCODE_WEB_URL normalization', () => {
    test('should normalize valid URL', () => {
      process.env.OPENCODE_WEB_URL = 'http://localhost:4096/'
      const config = getConfig()
      expect(config.opencode.webUrl).toBe('http://localhost:4096')
    })

    test('should handle URL without trailing slash', () => {
      process.env.OPENCODE_WEB_URL = 'http://example.com:8080'
      const config = getConfig()
      expect(config.opencode.webUrl).toBe('http://example.com:8080')
    })

    test('should handle invalid URL gracefully', () => {
      process.env.OPENCODE_WEB_URL = 'not-a-valid-url'
      const config = getConfig()
      expect(config.opencode.webUrl).toBe('http://localhost:4096')
    })

    test('should handle empty OPENCODE_WEB_URL', () => {
      process.env.OPENCODE_WEB_URL = ''
      const config = getConfig()
      expect(config.opencode.webUrl).toBe('http://localhost:4096')
    })
  })

  describe('config structure', () => {
    test('should return properly structured config object', () => {
      const config = getConfig()
      
      expect(config).toHaveProperty('server')
      expect(config).toHaveProperty('opencode')
      expect(config).toHaveProperty('dashboard')
      
      expect(config.server).toHaveProperty('host')
      expect(config.server).toHaveProperty('port')
      
      expect(config.opencode).toHaveProperty('storagePath')
      expect(config.opencode).toHaveProperty('webUrl')
      
      expect(config.dashboard).toHaveProperty('refreshIntervalMs')
      expect(config.dashboard).toHaveProperty('thresholds')
      expect(config.dashboard.thresholds).toHaveProperty('busyMinutes')
      expect(config.dashboard.thresholds).toHaveProperty('staleMinutes')
    })
  })
})
