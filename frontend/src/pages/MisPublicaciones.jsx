import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { PlusCircle, Pencil, Pause, Play, Trash2, Eye, Package } from 'lucide-react';

const MOCK = [
  { id: 1, titulo: 'Maíz blanco primera calidad', producto: 'Maíz', precio_unitario: 120, unidad_medida: 'quintal', cantidad_disponible: 80, estado: 'activa', created_at: '2025-04-20', negociaciones: 3 },
  { id: 2, titulo: 'Frijol negro seleccionado', producto: 'Frijol', precio_unitario: 280, unidad_medida: 'quintal', cantidad_disponible: 0, estado: 'cerrada', created_at: '2025-03-15', negociaciones: 7 },
  { id: 3, titulo: 'Güicoy tierno grande', producto: 'Güicoy', precio_unitario: 45, unidad_medida: 'caja', cantidad_disponible: 90, estado: 'activa', created_at: '2025-04-30', negociaciones: 1 },
  { id: 4, titulo: 'Chile pimiento rojo', producto: 'Chile', precio_unitario: 65, unidad_medida: 'caja', cantidad_disponible: 50, estado: 'pausada', created_at: '2025-04-10', negociaciones: 2 },
];
const ESTADO_OPTS = ['Todos', 'activa', 'pausada', 'cerrada', 'vencida'];

export default function MisPublicaciones() {
  const navigate = useNavigate();
  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api.get('/publicaciones/mis-publicaciones')
      .then(r => setPubs(r.data?.data ?? []))
      .catch(() => setPubs(MOCK))
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
        ? <div className="empty-state card" style={{ padding: 'var(--sp-16)' }}>
            <Package size={48} style={{ color: 'var(--gris-300)', marginBottom: 'var(--sp-4)' }} />
            <h3>Sin publicaciones {filtro !== 'Todos' ? `con estado "${filtro}"` : ''}</h3>
            <p style={{ marginBottom: 'var(--sp-5)' }}>Crea tu primera oferta y llega a compradores de todo el país</p>
            <button className="btn btn-primary" onClick={() => navigate('/publicaciones/nueva')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PlusCircle size={16} /> Crear publicación
            </button>
          </div>
        : <div className="table-wrap">
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
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.titulo}</div>
                        <div style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}>{p.producto}</div>
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
              <p>Esta acción no se puede deshacer. La publicación será eliminada permanentemente.</p>
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

