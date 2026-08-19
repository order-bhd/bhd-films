export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={34} strokeWidth={1.5} />}
      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14.5 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12.5 }}>{subtitle}</div>}
      {action}
    </div>
  )
}
