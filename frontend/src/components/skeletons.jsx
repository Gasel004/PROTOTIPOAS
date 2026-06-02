export function ListSkeleton({ count = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ padding: 'var(--sp-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <div className="skeleton" style={{ height: 16, width: '40%' }} />
              <div className="skeleton" style={{ height: 12, width: '70%' }} />
            </div>
            <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 'var(--radius-sm)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }} aria-busy="true" aria-label="Cargando">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--gris-50)' }}>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} style={{ padding: 'var(--sp-3) var(--sp-4)', textAlign: 'left' }}>
                <div className="skeleton" style={{ height: 12, width: 70 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} style={{ borderTop: '1px solid var(--gris-100)' }}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c} style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                  <div className="skeleton" style={{ height: 14, width: c === 0 ? 110 : 80 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GridSkeleton({ count = 8 }) {
  return (
    <div className="grid-pub" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 0 }} />
          <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <div className="skeleton" style={{ height: 18, width: '75%' }} />
            <div className="skeleton" style={{ height: 12, width: '45%' }} />
            <div className="skeleton" style={{ height: 12, width: '60%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--sp-2)' }}>
              <div className="skeleton" style={{ height: 22, width: 80 }} />
              <div className="skeleton" style={{ height: 22, width: 60 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
