import { useState, useEffect } from 'react';
import api from '../api/client';
import Pagination from '../components/Pagination';
import { ScrollText, Search, Calendar, Filter, User } from 'lucide-react';

const ACCIONES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'reactivacion', label: 'Reactivación' },
  { value: 'rechazo_calificacion', label: 'Rechazo de calificación' },
];

function formatDate(d) {
  return new Date(d).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AuditoriaAsociacion() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  async function cargar(p = 1) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (filtroAccion) params.set('accion', filtroAccion);
      if (filtroUsuario) params.set('usuario', filtroUsuario);
      if (filtroDesde) params.set('fecha_desde', filtroDesde);
      if (filtroHasta) params.set('fecha_hasta', filtroHasta);
      const res = await api.get('/auditoria?' + params.toString());
      setRegistros(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo cargar el historial de auditoría');
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(1); }, []);

  function handleSubmit(e) { e.preventDefault(); cargar(1); }

  function accionLabel(a) {
    const map = { suspension: 'Suspensión', reactivacion: 'Reactivación', rechazo_calificacion: 'Rechazo calificación' };
    return map[a] ?? a;
  }

  function entidadLabel(e) {
    const map = { productor: 'Productor', comprador: 'Comprador', calificacion: 'Calificación' };
    return map[e] ?? e;
  }

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="page-header" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
          <div>
            <h1 style={{ marginBottom: 'var(--sp-1)' }}>Historial de auditoría</h1>
            <p className="text-muted">Registro inmutable de acciones críticas del sistema. Solo lectura.</p>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--verde-50)', border: '1px solid var(--verde-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4) var(--sp-6)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--verde-800)', lineHeight: 1 }}>{total}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--verde-700)', fontWeight: 600, marginTop: 4 }}>registros totales</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><Filter size={14}/> Acción</label>
          <select className="form-select" value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
            {ACCIONES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><User size={14}/> Usuario</label>
          <input className="form-input" placeholder="Nombre o teléfono" value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} style={{ width: 180 }} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><Calendar size={14}/> Desde</label>
          <input className="form-input" type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label"><Calendar size={14}/> Hasta</label>
          <input className="form-input" type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
        </div>
        <button className="btn btn-primary" type="submit" style={{ marginBottom: 0 }}>
          <Search size={16}/> Filtrar
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <div className="loader-wrap"><div className="spinner" /></div> : registros.length === 0 ? (
        <div className="empty-state">
          <ScrollText size={42}/>
          <h3>Sin registros de auditoría</h3>
          <p>No se encontraron registros con esos criterios.</p>
        </div>
      ) : (
        <div className="auditoria-table-wrap">
          <table className="estadisticas-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Entidad</th>
                <th>ID Entidad</th>
                <th>Realizado por</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.id}>
                  <td>{formatDate(r.created_at)}</td>
                  <td><span className="audit-accion-badge">{accionLabel(r.accion)}</span></td>
                  <td>{entidadLabel(r.entidad)}</td>
                  <td>#{r.entidad_id}</td>
                  <td>{r.usuario?.nombre ?? 'Sistema'}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.detalle ? (
                      typeof r.detalle === 'string' ? r.detalle : JSON.stringify(r.detalle)
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={page} totalPages={totalPages} total={total}
            onPrev={() => cargar(page - 1)} onNext={() => cargar(page + 1)}
            onSetPage={cargar} label="registros" />
        </div>
      )}
    </div>
  );
}
