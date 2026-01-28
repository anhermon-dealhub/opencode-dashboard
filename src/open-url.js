export async function openUrl(url) {
  const platform = process.platform

  let cmd
  if (platform === 'darwin') {
    cmd = ['open', url]
  } else if (platform === 'win32') {
    // "start" requires a window title argument.
    cmd = ['cmd', '/c', 'start', '', url]
  } else {
    // Most Linux desktops.
    cmd = ['xdg-open', url]
  }

  const proc = Bun.spawn({
    cmd,
    stdout: 'ignore',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error(err.trim() || `Failed to open URL (exit ${exitCode})`)
  }
}
