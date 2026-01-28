export function renderDashboardPage(opts) {
  const title = opts.title || 'OpenCode Dashboard'
  const refreshIntervalMs = Number.isFinite(opts.refreshIntervalMs) ? opts.refreshIntervalMs : 5000
  const opencodeWebUrl = opts.opencodeWebUrl || 'http://localhost:4096'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1e293b; }
    h1 { font-size: 32px; color: #f1f5f9; margin-bottom: 10px; }
    .stats { display: flex; gap: 20px; margin-top: 15px; flex-wrap: wrap; }
    .stat { background: #1e293b; padding: 12px 20px; border-radius: 8px; font-size: 14px; }
    .stat-value { font-size: 24px; font-weight: bold; margin-right: 8px; }
    .sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; }
    .session-card { background: #1e293b; border-radius: 12px; padding: 20px; border: 2px solid transparent; transition: all 0.2s; }
    .session-card:hover { border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1); cursor: pointer; }
    .session-card.busy { border-left: 4px solid #3b82f6; }
    .session-card.idle { border-left: 4px solid #10b981; }
    .session-card.stale { border-left: 4px solid #6b7280; opacity: 0.7; }
    .session-description { font-size: 13px; color: #cbd5e1; margin-bottom: 12px; line-height: 1.4; }
    .session-badges { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .badge { padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge.phase-research { background: #1e3a8a; color: #93c5fd; }
    .badge.phase-planning { background: #7c2d12; color: #fdba74; }
    .badge.phase-implementing { background: #065f46; color: #6ee7b7; }
    .badge.phase-done { background: #374151; color: #9ca3af; }
    .badge.agent { background: #581c87; color: #e9d5ff; }
    .badge.subagent { background: #3730a3; color: #c7d2fe; font-size: 10px; }
    .session-stats { display: flex; gap: 12px; font-size: 12px; color: #94a3b8; padding-top: 12px; border-top: 1px solid #334155; }
    .stat-item { display: flex; align-items: center; gap: 4px; }
    .session-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; }
    .session-name { font-size: 20px; font-weight: 600; color: #f1f5f9; }
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-badge.busy { background: #1e40af; color: #93c5fd; }
    .status-badge.idle { background: #065f46; color: #6ee7b7; }
    .status-badge.stale { background: #374151; color: #9ca3af; }
    .session-project { font-size: 14px; color: #94a3b8; margin-bottom: 8px; }
    .session-directory { font-size: 12px; color: #64748b; font-family: 'Monaco', 'Courier New', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 15px; }
    .loading { text-align: center; padding: 60px; font-size: 18px; color: #64748b; }
    .empty { text-align: center; padding: 60px; color: #64748b; }
    .refresh-indicator { position: fixed; top: 20px; right: 20px; background: #1e293b; padding: 10px 20px; border-radius: 8px; font-size: 14px; display: none; }
    .refresh-indicator.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>OpenCode Sessions</h1>
      <div class="stats">
        <div class="stat"><span class="stat-value" id="total-count">-</span><span>Total Sessions</span></div>
        <div class="stat"><span class="stat-value" id="busy-count">-</span><span>Busy</span></div>
        <div class="stat"><span class="stat-value" id="idle-count">-</span><span>Idle</span></div>
        <div class="stat"><span class="stat-value" id="implementing-count">-</span><span>Implementing</span></div>
        <div class="stat"><span class="stat-value" id="research-count">-</span><span>Research</span></div>
      </div>
    </header>

    <div class="refresh-indicator" id="refresh-indicator">Updating...</div>
    <div id="sessions-container"><div class="loading">Loading sessions...</div></div>
  </div>

  <script>
    const OPENCODE_WEB_URL = ${JSON.stringify(opencodeWebUrl)};
    const REFRESH_INTERVAL_MS = ${JSON.stringify(refreshIntervalMs)};

    function formatTime(minutes) {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      return hours + 'h ago';
    }

    function renderSessions(sessions) {
      const container = document.getElementById('sessions-container');

      if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="empty">No recent OpenCode sessions found</div>';
        return;
      }

      document.getElementById('total-count').textContent = sessions.length;
      document.getElementById('busy-count').textContent = sessions.filter(s => s.status === 'busy').length;
      document.getElementById('idle-count').textContent = sessions.filter(s => s.status === 'idle').length;
      document.getElementById('implementing-count').textContent = sessions.filter(s => s.phase === 'implementing').length;
      document.getElementById('research-count').textContent = sessions.filter(s => s.phase === 'research').length;

      const html = '<div class="sessions-grid">' + sessions.map(session => \`
        <div class="session-card \${session.status}" onclick="openSession('\${session.id}')">
          <div class="session-header">
            <div class="session-name">\${session.title || session.slug}</div>
            <div class="status-badge \${session.status}">\${session.status}</div>
          </div>

          <div class="session-description">\${session.description || session.slug}</div>

          <div class="session-badges">
            <div class="badge phase-\${session.phase}">\${session.phase}</div>
            <div class="badge agent">@\${session.agent}</div>
            \${session.isSubagent ? '<div class="badge subagent">subagent</div>' : ''}
          </div>

          <div class="session-project">Project: \${session.projectName}</div>
          <div class="session-directory">\${session.directory || ''}</div>

          <div class="session-stats">
            <div class="stat-item">Updated: \${formatTime(session.ageMinutes)}</div>
            \${session.summary ? \`<div class="stat-item">Files: \${session.summary.files}</div>\` : ''}
            \${session.summary ? \`<div class="stat-item">+\${session.summary.additions}</div>\` : ''}
            \${session.summary ? \`<div class="stat-item">-\${session.summary.deletions}</div>\` : ''}
          </div>
        </div>
      \`).join('') + '</div>';

      container.innerHTML = html;
    }

    async function openSession(sessionId) {
      try {
        const response = await fetch('/api/open-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });

        const result = await response.json();

        if (!result.success) {
          alert('Failed to open session. Make sure OpenCode web is running at ' + OPENCODE_WEB_URL + '.');
        }
      } catch (error) {
        console.error('Error opening session:', error);
        alert('Error opening session. Make sure OpenCode web is running at ' + OPENCODE_WEB_URL + '.');
      }
    }

    async function fetchSessions() {
      const indicator = document.getElementById('refresh-indicator');
      indicator.classList.add('active');

      try {
        const response = await fetch('/api/sessions');
        const sessions = await response.json();
        renderSessions(sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        document.getElementById('sessions-container').innerHTML = '<div class="empty">Error loading sessions</div>';
      }

      setTimeout(() => indicator.classList.remove('active'), 500);
    }

    fetchSessions();
    setInterval(fetchSessions, REFRESH_INTERVAL_MS);
  </script>
</body>
</html>
  `
}
