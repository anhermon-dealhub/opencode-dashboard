# opencode-dashboard

A lightweight local dashboard for browsing OpenCode sessions.

## Requirements

- Bun
- OpenCode installed and producing session files
- (Optional) OpenCode web UI running (default: `http://localhost:4096`)

## Quick start

1. Install dependencies:

   - `task install`

2. Run the dashboard:

   - `task dev`

3. Open `http://localhost:3003`

## Configuration

Configuration is via environment variables. See `.env.example` for all options.

Common overrides:

- `PORT`: dashboard port
- `HOST`: bind address
- `OPENCODE_STORAGE_PATH`: OpenCode storage root (contains `session/`)
- `OPENCODE_WEB_URL`: base URL of OpenCode web UI

## Tasks

- `task dev`: run with file watching
- `task run`: run without watching
- `task build`: bundle to `dist/`
- `task test`: run tests
- `task ci`: install (frozen), test, build

## License

MIT. See `LICENSE`.
