export function StatCard({ icon, label, value, color, delta, up, onClick }) {
  const colorClass = color ? `stat-card-${color}` : '';
  const Component = onClick ? 'button' : 'div';
  return (
    <Component type={onClick ? 'button' : undefined} onClick={onClick} className={`stat-card ${colorClass} hover-lift ${onClick ? 'stat-card-action' : ''}`}>
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {delta && <div className={`stat-delta ${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'} {delta}</div>}
      </div>
    </Component>
  );
}

export function QuickBtn({ icon, label, onClick, primary }) {
  return (
    <button className={`btn ${primary ? 'btn-secondary' : 'btn-ghost'} btn-full hover-lift`}
      onClick={onClick} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
      {icon} {label}
    </button>
  );
}
