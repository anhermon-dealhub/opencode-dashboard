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
    .sessions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 20px; }
    .session-card { background: #1e293b; border-radius: 12px; padding: 20px; border: 2px solid transparent; transition: all 0.2s; min-height: 280px; display: flex; flex-direction: column; position: relative; }
    .session-card:hover { border-color: #3b82f6; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.1); cursor: pointer; }
    .session-card.busy { border-left: 4px solid #3b82f6; }
    .session-card.idle { border-left: 4px solid #10b981; }
    .session-card.stale { border-left: 4px solid #6b7280; opacity: 0.7; }
    .session-card.subagent-nested { margin-left: 40px; margin-top: -10px; border-left: 3px solid #3730a3; opacity: 0.9; min-height: 200px; }
    .session-card.subagent-nested::before { content: '↳'; position: absolute; left: -30px; color: #64748b; font-size: 20px; top: 20px; }
    .session-description { font-size: 13px; color: #cbd5e1; margin-bottom: 14px; line-height: 1.6; max-height: 7.2em; overflow: hidden; }
    .session-current-task { font-size: 13px; color: #60a5fa; margin-bottom: 14px; padding: 8px 12px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; border-left: 3px solid #3b82f6; display: flex; align-items: center; gap: 8px; }
    .session-current-task::before { content: '⚡'; font-size: 14px; }
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
    .session-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; }
    .session-name { font-size: 18px; font-weight: 700; color: #f1f5f9; line-height: 1.3; }
    .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status-badge.busy { background: #1e40af; color: #93c5fd; }
    .status-badge.idle { background: #065f46; color: #6ee7b7; }
    .status-badge.stale { background: #374151; color: #9ca3af; }
    .session-project { font-size: 14px; color: #94a3b8; margin-bottom: 8px; }
    .session-directory { font-size: 12px; color: #64748b; font-family: 'Monaco', 'Courier New', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 15px; }
    .filter-bar { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 30px; display: flex; flex-direction: column; gap: 15px; }
    .filter-section { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-section label { font-weight: 600; color: #94a3b8; font-size: 14px; min-width: 70px; }
    .filter-btn { padding: 8px 16px; border: 2px solid #334155; background: transparent; color: #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; font-family: inherit; }
    .filter-btn:hover { border-color: #3b82f6; color: #f1f5f9; }
    .filter-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
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

    <div class="filter-bar">
      <div class="filter-section">
        <label>Project:</label>
        <div id="project-filters">
          <button class="filter-btn active" data-filter="project" data-value="all">All Projects</button>
        </div>
      </div>
      <div class="filter-section">
        <label>Status:</label>
        <button class="filter-btn active" data-filter="status" data-value="all">All</button>
        <button class="filter-btn" data-filter="status" data-value="busy">Busy</button>
        <button class="filter-btn" data-filter="status" data-value="idle">Idle</button>
        <button class="filter-btn" data-filter="status" data-value="stale">Stale</button>
      </div>
      <div class="filter-section">
        <label>Phase:</label>
        <button class="filter-btn active" data-filter="phase" data-value="all">All</button>
        <button class="filter-btn" data-filter="phase" data-value="research">Research</button>
        <button class="filter-btn" data-filter="phase" data-value="planning">Planning</button>
        <button class="filter-btn" data-filter="phase" data-value="implementing">Implementing</button>
        <button class="filter-btn" data-filter="phase" data-value="done">Done</button>
      </div>
    </div>

    <div class="refresh-indicator" id="refresh-indicator">Updating...</div>
    <div id="sessions-container"><div class="loading">Loading sessions...</div></div>
  </div>

  <script>
    const OPENCODE_WEB_URL = ${JSON.stringify(opencodeWebUrl)};
    const REFRESH_INTERVAL_MS = ${JSON.stringify(refreshIntervalMs)};
    
    let activeFilters = {
      project: 'all',
      status: 'all',
      phase: 'all'
    };
    
    let allSessions = [];

    function formatTime(minutes) {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      return hours + 'h ago';
    }
    
    function groupSessionsByHierarchy(sessions) {
      const parentSessions = sessions.filter(s => !s.isSubagent)
      const subagents = sessions.filter(s => s.isSubagent)
      
      const grouped = []
      for (const parent of parentSessions) {
        const children = subagents.filter(s => s.parentID === parent.id)
        grouped.push({ session: parent, children })
      }
      
      return grouped
    }
    
    function applyFilters(sessions) {
      return sessions.filter(s => {
        if (activeFilters.project !== 'all' && s.projectName !== activeFilters.project) return false
        if (activeFilters.status !== 'all' && s.status !== activeFilters.status) return false
        if (activeFilters.phase !== 'all' && s.phase !== activeFilters.phase) return false
        return true
      })
    }
    
    function updateProjectFilters(sessions) {
      const projects = [...new Set(sessions.map(s => s.projectName))].sort()
      const container = document.getElementById('project-filters')
      
      const html = '<button class="filter-btn ' + (activeFilters.project === 'all' ? 'active' : '') + '" data-filter="project" data-value="all">All Projects</button>' +
        projects.map(p => 
          '<button class="filter-btn ' + (activeFilters.project === p ? 'active' : '') + '" data-filter="project" data-value="' + p + '">' + p + '</button>'
        ).join('')
      
      container.innerHTML = html
      
      // Add click handlers
      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilterClick)
      })
    }
    
    function handleFilterClick(e) {
      const filter = e.target.dataset.filter
      const value = e.target.dataset.value
      
      // Update active filters
      activeFilters[filter] = value
      
      // Update UI
      document.querySelectorAll(\`.filter-btn[data-filter="\${filter}"]\`).forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === value)
      })
      
      // Save to localStorage
      localStorage.setItem('opencode-filters', JSON.stringify(activeFilters))
      
      // Re-render with filters
      renderSessions(allSessions)
    }
    
    function loadFilters() {
      const saved = localStorage.getItem('opencode-filters')
      if (saved) {
        try {
          activeFilters = JSON.parse(saved)
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }

    function renderSessions(sessions) {
      const container = document.getElementById('sessions-container');

      // Store all sessions
      allSessions = sessions

      if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="empty">No recent OpenCode sessions found</div>';
        return;
      }
      
      // Update project filters
      updateProjectFilters(sessions)

      // Apply filters
      const filtered = applyFilters(sessions)

      // Update stats with filtered counts
      document.getElementById('total-count').textContent = filtered.length;
      document.getElementById('busy-count').textContent = filtered.filter(s => s.status === 'busy').length;
      document.getElementById('idle-count').textContent = filtered.filter(s => s.status === 'idle').length;
      document.getElementById('implementing-count').textContent = filtered.filter(s => s.phase === 'implementing').length;
      document.getElementById('research-count').textContent = filtered.filter(s => s.phase === 'research').length;

      // Group by hierarchy
      const grouped = groupSessionsByHierarchy(filtered)

      const html = '<div class="sessions-grid">' + grouped.map(group => \`
        <!-- Parent session -->
        <div class="session-card \${group.session.status}" onclick="openSession('\${group.session.id}')">
          <div class="session-header">
            <div class="session-name">\${group.session.title || group.session.slug}</div>
            <div class="status-badge \${group.session.status}">\${group.session.status}</div>
          </div>

          \${group.session.description ? \`<div class="session-description">\${group.session.description}</div>\` : ''}
          
          \${group.session.currentTask ? \`<div class="session-current-task">\${group.session.currentTask}</div>\` : ''}

          <div class="session-badges">
            <div class="badge phase-\${group.session.phase}">\${group.session.phase}</div>
            <div class="badge agent">@\${group.session.agent}</div>
            \${group.children.length > 0 ? \`<div class="badge subagent">\${group.children.length} subagent\${group.children.length > 1 ? 's' : ''}</div>\` : ''}
          </div>

          <div class="session-project">Project: \${group.session.projectName}</div>
          <div class="session-directory">\${group.session.directory || ''}</div>

          <div class="session-stats">
            <div class="stat-item">Updated: \${formatTime(group.session.ageMinutes)}</div>
            \${group.session.summary ? \`<div class="stat-item">Files: \${group.session.summary.files}</div>\` : ''}
            \${group.session.summary ? \`<div class="stat-item">+\${group.session.summary.additions}</div>\` : ''}
            \${group.session.summary ? \`<div class="stat-item">-\${group.session.summary.deletions}</div>\` : ''}
          </div>
        </div>
        
        <!-- Subagent sessions (nested) -->
        \${group.children.map(child => \`
          <div class="session-card subagent-nested \${child.status}" onclick="openSession('\${child.id}')">
            <div class="session-header">
              <div class="session-name">\${child.title || child.slug}</div>
              <div class="status-badge \${child.status}">\${child.status}</div>
            </div>

            \${child.description ? \`<div class="session-description">\${child.description}</div>\` : ''}
            
            \${child.currentTask ? \`<div class="session-current-task">\${child.currentTask}</div>\` : ''}

            <div class="session-badges">
              <div class="badge phase-\${child.phase}">\${child.phase}</div>
              <div class="badge agent">@\${child.agent}</div>
              <div class="badge subagent">subagent</div>
            </div>

            <div class="session-stats">
              <div class="stat-item">Updated: \${formatTime(child.ageMinutes)}</div>
              \${child.summary ? \`<div class="stat-item">Files: \${child.summary.files}</div>\` : ''}
              \${child.summary ? \`<div class="stat-item">+\${child.summary.additions}</div>\` : ''}
              \${child.summary ? \`<div class="stat-item">-\${child.summary.deletions}</div>\` : ''}
            </div>
          </div>
        \`).join('')}
      \`).join('') + '</div>';

      container.innerHTML = html;
      
      // Setup filter click handlers
      document.querySelectorAll('.filter-btn').forEach(btn => {
        if (!btn.dataset.filter) return
        btn.addEventListener('click', handleFilterClick)
      })
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
    
    // Load saved filters and add event listeners for status/phase filters
    loadFilters();
    
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.filter-btn[data-filter="status"], .filter-btn[data-filter="phase"]').forEach(btn => {
        btn.addEventListener('click', handleFilterClick)
        // Apply saved filter state
        const filter = btn.dataset.filter
        const value = btn.dataset.value
        if (activeFilters[filter] === value) {
          btn.classList.add('active')
        } else {
          btn.classList.remove('active')
        }
      })
    })

    fetchSessions();
    setInterval(fetchSessions, REFRESH_INTERVAL_MS);
  </script>
</body>
</html>
  `
}
