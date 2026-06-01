import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getFullImageUrl } from '../api/utils';
import { PlusCircle, Pencil, Pause, Play, Trash2, Eye, Package } from 'lucide-react';

const ESTADO_OPTS = ['Todos', 'activa', 'pausada', 'cerrada', 'vencida'];

function normalizePub(p) {
  return {
    ...p,
    producto: p.producto?.nombre ?? p.producto ?? 'Producto',
    precio_unitario: Number(p.precio_unitario ?? 0),
    cantidad_disponible: Number(p.cantidad_disponible ?? 0),
    negociaciones: Array.isArray(p.negociaciones) ? p.negociaciones.length : Number(p.negociaciones ?? 0),
    created_at: p.created_at ? String(p.created_at).slice(0, 10) : '',
  };
}

export default function MisPublicaciones() {
  const navigate = useNavigate();
  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/publicaciones/mis-publicaciones')
      .then(r => {
        setPubs((r.data?.data ?? []).map(normalizePub));
        setError('');
      })
      .catch(err => {
        setPubs([]);
        setError(err.response?.data?.message ?? 'No se pudieron cargar tus publicaciones.');
      })
      .finally(() => setLoading(false));
  }, []);

  async function cambiarEstado(id, nuevoEstado) {
    try {
      await api.patch(`/publicaciones/${id}/estado`, { estado: nuevoEstado });
      setPubs(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
    } catch { alert('Error al cambiar estado'); }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/publicaciones/${id}`);
      setPubs(prev => prev.filter(p => p.id !== id));
      setConfirm(null);
    } catch { alert('Error al eliminar'); }
  }

  const estadoBadge = e => ({ activa: 'badge-verde', pausada: 'badge-oro', cerrada: 'badge-gris', vencida: 'badge-rojo' }[e] ?? 'badge-gris');
  const filtradas = filtro === 'Todos' ? pubs : pubs.filter(p => p.estado === filtro);
  const totales = { activa: pubs.filter(p => p.estado === 'activa').length, pausada: pubs.filter(p => p.estado === 'pausada').length, cerrada: pubs.filter(p => p.estado === 'cerrada').length };

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Mis Publicaciones</h1>
          <p className="text-muted">{pubs.length} publicacion{pubs.length !== 1 ? 'es' : ''} en total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/publicaciones/nueva')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={16} /> Nueva publicación
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }}>{error}</div>}

      {/* Mini stats */}
      <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
        {[['Activas', totales.activa, 'var(--verde-800)', 'var(--verde-50)'],
          ['Pausadas', totales.pausada, '#92400E', 'var(--oro-50)'],
          ['Cerradas', totales.cerrada, 'var(--gris-500)', 'var(--gris-100)']].map(([lbl, val, color, bg]) => (
          <div key={lbl} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 'var(--radius)',
            padding: 'var(--sp-3) var(--sp-5)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{val}</span>
            <span style={{ fontSize: '.875rem', color, fontWeight: 500 }}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        {ESTADO_OPTS.map(op => (
          <button key={op} className={filtro === op ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
         onClick={()=>setFiltro(op)}>
            {op.charAt(0).toUpperCase() + op.slice(1)}
          </button>
        ))}
      </div>

      {filtradas.length === 0
        ? <div className="empty-state" style={{ padding: 'var(--sp-16)' }}>
            <Package size={48} style={{ color: 'var(--gris-300)', marginBottom: 'var(--sp-4)' }} />
            <h3>Sin publicaciones {filtro !== 'Todos' ? `con estado "${filtro}"` : ''}</h3>
            <p style={{ marginBottom: 'var(--sp-5)' }}>Crea tu primera oferta y llega a compradores de todo el país</p>
            <button className="btn btn-primary" onClick={() => navigate('/publicaciones/nueva')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={16} /> Crear publicación
            </button>
          </div>
        : <div className="table-wrap" style={{ border:'1px solid var(--verde-100)' }}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th><th>Precio</th><th>Disponible</th>
                  <th>Estado</th><th>Negociaciones</th><th>Publicado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                        {p.imagen_url ? (
                          <img
                            src={getFullImageUrl(p.imagen_url)}
                            alt={p.titulo}
                            loading="lazy"
                            className="table-thumbnail"
                          />
                        ) : (
                          <div className="table-thumbnail-placeholder">
                            <Package size={16} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.titulo}</div>
                          <div style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}>{p.producto}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--verde-800)' }}>
                        Q{p.precio_unitario}
                      </span>
                      <span style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}> /{p.unidad_medida}</span>
                    </td>
                    <td>{p.cantidad_disponible} {p.unidad_medida}s</td>
                    <td><span className={`badge ${estadoBadge(p.estado)}`}>{p.estado}</span></td>
                    <td>
                      <span style={{ fontWeight: 600, color: p.negociaciones > 0 ? 'var(--verde-800)' : 'var(--gris-500)' }}>
                        {p.negociaciones}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>{p.created_at}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button className="btn btn-ghost btn-sm" title="Ver" onClick={() => navigate(`/publicaciones/${p.id}`)}><Eye size={15} /></button>
                        <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => navigate(`/publicaciones/${p.id}/editar`)}><Pencil size={15} /></button>
                        {p.estado === 'activa'
                          ? <button className="btn btn-ghost btn-sm" title="Pausar" onClick={() => cambiarEstado(p.id, 'pausada')}><Pause size={15} /></button>
                          : p.estado === 'pausada'
                          ? <button className="btn btn-ghost btn-sm" title="Activar" onClick={() => cambiarEstado(p.id, 'activa')}><Play size={15} /></button>
                          : null}
                        <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: 'var(--rojo)' }} onClick={() => setConfirm(p.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      }

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>¿Eliminar publicación?</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>La publicación dejará de aparecer en tu lista y no estará disponible para nuevas negociaciones.</p>
            </div>
            <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={() => eliminar(confirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
