import { homedir } from 'os'
import { join } from 'path'

function parseIntEnv(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const v = Number.parseInt(raw, 10)
  return Number.isFinite(v) ? v : fallback
}

function envOr(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  return raw
}

function expandHome(p) {
  if (!p) return p
  if (p === '~') return homedir()
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return p
}

function defaultOpenCodeStoragePath() {
  const xdg = process.env.XDG_DATA_HOME
  if (xdg && xdg !== '') return join(expandHome(xdg), 'opencode', 'storage')
  return join(homedir(), '.local', 'share', 'opencode', 'storage')
}

function normalizeBaseUrl(raw, fallback) {
  const value = raw && raw !== '' ? raw : fallback
  try {
    return new URL(value).toString().replace(/\/$/, '')
  } catch {
    return new URL(fallback).toString().replace(/\/$/, '')
  }
}

export function getConfig() {
  const host = envOr('HOST', '127.0.0.1')
  const port = parseIntEnv('PORT', 3003)

  const storagePath = expandHome(envOr('OPENCODE_STORAGE_PATH', defaultOpenCodeStoragePath()))
  const opencodeWebUrl = normalizeBaseUrl(process.env.OPENCODE_WEB_URL, 'http://localhost:4096')

  const refreshIntervalMs = parseIntEnv('REFRESH_INTERVAL_MS', 5000)
  const busyThresholdMin = parseIntEnv('SESSION_BUSY_THRESHOLD_MIN', 5)
  const staleThresholdMin = parseIntEnv('SESSION_STALE_THRESHOLD_MIN', 30)

  return {
    server: {
      host,
      port,
    },
    opencode: {
      storagePath,
      webUrl: opencodeWebUrl,
    },
    dashboard: {
      refreshIntervalMs,
      thresholds: {
        busyMinutes: busyThresholdMin,
        staleMinutes: staleThresholdMin,
      },
    },
  }
}
