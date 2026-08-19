export function getRange(preset, customFrom, customTo) {
  const now = new Date()
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (preset === 'today') {
    return { from: startOfDay(now).toISOString(), to: new Date().toISOString() }
  }
  if (preset === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay())
    return { from: startOfDay(start).toISOString(), to: new Date().toISOString() }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: start.toISOString(), to: new Date().toISOString() }
  }
  if (preset === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom).toISOString(), to: new Date(customTo).toISOString() }
  }
  return { from: null, to: null }
}
