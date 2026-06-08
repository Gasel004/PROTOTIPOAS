import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/skeletons';
import { useModalA11y } from '../hooks/useModalA11y';
import useAuthStore from '../store/auth.store';
import { CreditCard, CheckCircle, Clock, XCircle, RefreshCw, PlusCircle, DollarSign } from 'lucide-react';

const METODOS = ['efectivo', 'transferencia', 'cheque', 'otro'];
const ESTADO_CFG = {
  pendiente:   { badge: 'badge-oro',   icon: <Clock size={13} />,       label: 'Pendiente' },
  completado:  { badge: 'badge-verde', icon: <CheckCircle size={13} />, label: 'Completado' },
  fallido:     { badge: 'badge-rojo',  icon: <XCircle size={13} />,     label: 'Fallido' },
  reembolsado: { badge: 'badge-azul',  icon: <RefreshCw size={13} />,   label: 'Reembolsado' },
};

function normalizePago(p, user) {
  const isProductor = user?.rol === 'productor';
  const contraparte = isProductor
    ? p.negociacion?.comprador?.usuario?.nombre
    : p.negociacion?.productor?.usuario?.nombre;
  return {
    ...p,
    titulo_neg: p.negociacion?.publicacion?.titulo ?? p.titulo_neg ?? 'Negociación',
    contraparte: contraparte ?? p.contraparte ?? 'Contraparte',
    monto: Number(p.monto ?? 0),
    fecha_pago: p.fecha_pago ? String(p.fecha_pago).slice(0, 10) : null,
  };
}

export default function Pagos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const negociacionIdFromUrl = searchParams.get('negociacion_id');
  const { user } = useAuthStore();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [misNegociaciones, setMisNegociaciones] = useState([]);
  const [modalNew, setModalNew] = useState(false);
  const cerrarModalNew = () => { if (!saving) setModalNew(false); };
  const modalNewRef = useModalA11y(modalNew, cerrarModalNew);
  const [form, setForm] = useState({ negociacion_id: '', monto: '', metodo_pago: 'efectivo', referencia: '', fecha_pago: '', notas: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    api.get('/pagos', { signal: ac.signal })
      .then(r => setPagos((r.data?.data ?? []).map(p => normalizePago(p, user))))
      .catch(err => {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message ?? 'No se pudieron cargar los pagos');
        setPagos([]);
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    api.get('/negociaciones?estado=en_transito', { signal: ac.signal })
      .then(r => setMisNegociaciones(r.data?.data ?? []))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  // Cuando el usuario navega desde DetalleNegociacion con ?negociacion_id=X,
  // abrimos el modal automáticamente y pre-rellenamos negociacion_id y monto.
  // Si ya existe un pago registrado para esa negociación, no reabrimos el
  // modal (evita el bucle al volver a la URL con el mismo negociacion_id).
  useEffect(() => {
    if (loading || !negociacionIdFromUrl) return;
    const idNum = Number(negociacionIdFromUrl);
    const yaTienePago = pagos.some(p => Number(p.negociacion_id) === idNum);
    if (yaTienePago) return;
    const idStr = String(idNum);
    const found = misNegociaciones.find(n => String(n.id) === idStr);
    const total = found?.precio_acordado != null
      ? Number(found.precio_acordado) * Number(found.cantidad_solicitada ?? 0)
      : '';

    if (!modalNew) {
      setForm(f => ({
        ...f,
        negociacion_id: idStr,
        monto: total !== '' ? String(total.toFixed(2)) : f.monto,
      }));
      setFormErrors({});
      setSaveError('');
      setModalNew(true);
    } else if (found && total !== '') {
      setForm(f => ({
        ...f,
        monto: String(total.toFixed(2)),
      }));
    }
  }, [negociacionIdFromUrl, loading, misNegociaciones, pagos]);

  const totales = useMemo(() => ({
    completado: pagos.filter(p => p.estado === 'completado').reduce((s, p) => s + p.monto, 0),
    pendiente:  pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0),
  }), [pagos]);
  const filtrados = useMemo(() => filtro === 'Todos' ? pagos : pagos.filter(p => p.estado === filtro), [pagos, filtro]);
  const pag = usePagination(filtrados, 10);

  function abrirModalNuevo() {
    setForm({ negociacion_id: '', monto: '', metodo_pago: 'efectivo', referencia: '', fecha_pago: '', notas: '' });
    setFormErrors({});
    setSaveError('');
    setModalNew(true);
  }

  async function guardarPago(e) {
    e.preventDefault();
    const errs = {};
    if (!form.negociacion_id) errs.negociacion_id = 'Requerido';
    if (!form.monto || Number(form.monto) <= 0) errs.monto = 'Ingresa un monto válido';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaveError('');
    setSaving(true);
    try {
      const res = await api.post('/pagos', { ...form, negociacion_id: Number(form.negociacion_id), monto: Number(form.monto) });
      const nuevo = res.data?.data ? normalizePago(res.data.data, user) : null;
      if (nuevo) setPagos(prev => [nuevo, ...prev]);
      setModalNew(false);
    } catch (err) {
      setSaveError(err.response?.data?.message ?? 'No se pudo registrar el pago');
    } finally { setSaving(false); }
  }

  async function actualizarEstado(id, estado, redirigirA) {
    const previo = pagos.find(p => p.id === id)?.estado;
    if (!previo) return;
    setPagos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    try {
      await api.put(`/pagos/${id}`, { estado });
      if (redirigirA) navigate(redirigirA);
    } catch (err) {
      setPagos(prev => prev.map(p => p.id === id ? { ...p, estado: previo } : p));
      setError(err.response?.data?.message ?? 'No se pudo actualizar el estado del pago');
    }
  }

  if (loading) return <TableSkeleton rows={6} cols={5} />;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Pagos</h1>
          <p className="text-muted">{pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={abrirModalNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={16} /> Registrar pago
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }}>{error}</div>}

      <div className="grid-2" style={{ marginBottom: 'var(--sp-6)' }}>
        <div className="stat-card">
          <div className="stat-icon verde"><CheckCircle size={22} /></div>
          <div>
            <div className="stat-value">Q{totales.completado.toLocaleString()}</div>
            <div className="stat-label">Total pagos completados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon oro"><Clock size={22} /></div>
          <div>
            <div className="stat-value">Q{totales.pendiente.toLocaleString()}</div>
            <div className="stat-label">Total pagos pendientes</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        {['Todos', 'pendiente', 'completado', 'fallido', 'reembolsado'].map(e => (
          <button key={e} className={filtro === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => { setFiltro(e); pag.reset(); }}>
            {e === 'Todos' ? 'Todos' : ESTADO_CFG[e]?.label ?? e}
          </button>
        ))}
      </div>

      {filtrados.length === 0
        ? <div className="empty-state card" style={{ padding: 'var(--sp-16)' }}>
            <CreditCard size={48} style={{ color: 'var(--gris-300)', marginBottom: 'var(--sp-4)' }} />
            <h3>Sin pagos registrados</h3>
            <p>Registra el pago de tus negociaciones completadas</p>
          </div>
        : <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Negociación</th><th>Contraparte</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {pag.pageItems.map(p => {
                  const cfg = ESTADO_CFG[p.estado] ?? { badge: 'badge-gris', icon: null, label: p.estado };
                  return (
                    <tr key={p.id}>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/negociaciones/${p.negociacion_id}`)}>{p.titulo_neg}</button></td>
                      <td style={{ color: 'var(--gris-700)' }}>{p.contraparte}</td>
                      <td><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--verde-800)' }}>Q{p.monto.toLocaleString()}</span></td>
                      <td style={{ textTransform: 'capitalize' }}>{p.metodo_pago}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '.8125rem', color: 'var(--gris-500)' }}>{p.referencia ?? '—'}</td>
                      <td style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>{p.fecha_pago ?? '—'}</td>
                      <td>
                        <span className={`badge ${cfg.badge}`} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td>
                        {p.estado === 'pendiente' && user?.rol === 'comprador' && (
                          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--verde-700)', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => actualizarEstado(p.id, 'completado')}>
                              <CheckCircle size={13} /> Completar
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rojo)', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => actualizarEstado(p.id, 'fallido')}><XCircle size={13} /> Fallido</button>
                          </div>
                        )}
                        {p.estado === 'completado' && user?.rol === 'productor' && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--verde-700)', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => navigate('/entregas')}>
                            <CheckCircle size={13} /> Recibido
                          </button>
                        )}
                        {p.estado === 'completado' && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--azul)', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => actualizarEstado(p.id, 'reembolsado')}><RefreshCw size={13} /> Reembolsar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
              onPrev={pag.prev} onNext={pag.next} onSetPage={pag.setPage} label="pagos" />
          </div>
      }

      {modalNew && (
        <div className="modal-overlay" onClick={cerrarModalNew}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalNewRef}>
            <div className="modal-header">
              <h3>Registrar pago</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cerrarModalNew} disabled={saving}>✕</button>
            </div>
            <form onSubmit={guardarPago} noValidate>
              <div className="modal-body">
                {saveError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{saveError}</div>}
                <div className="form-group">
                  <label className="form-label">Negociación <span style={{ color: 'var(--rojo)' }}>*</span></label>
                  <select className="form-select" value={form.negociacion_id}
                    onChange={e => {
                      const newId = e.target.value;
                      const found = misNegociaciones.find(n => String(n.id) === String(newId));
                      const total = found?.precio_acordado != null
                        ? Number(found.precio_acordado) * Number(found.cantidad_solicitada ?? 0)
                        : '';
                      setForm(f => ({
                        ...f,
                        negociacion_id: newId,
                        monto: total !== '' ? String(total.toFixed(2)) : f.monto,
                      }));
                    }}
                    aria-invalid={formErrors.negociacion_id ? 'true' : 'false'}>
                    <option value="">Selecciona una negociación</option>
                    {misNegociaciones.map(n => {
                      const total = n.precio_acordado != null
                        ? Number(n.precio_acordado) * Number(n.cantidad_solicitada ?? 0)
                        : null;
                      return (
                        <option key={n.id} value={n.id}>
                          #{n.id} — {n.publicacion?.titulo ?? 'Sin título'} ({n.cantidad_solicitada} {n.publicacion?.unidad_medida ?? ''})
                          {total != null ? ` · Q${total.toLocaleString()}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {formErrors.negociacion_id && <p className="form-error">{formErrors.negociacion_id}</p>}
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Monto (Q) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                    <div className="input-group">
                      <span className="input-prefix">Q</span>
                      <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={form.monto} readOnly
                        style={{ background: 'var(--gris-100)', cursor: 'not-allowed' }}
                        aria-invalid={formErrors.monto ? 'true' : 'false'} />
                    </div>
                    {formErrors.monto && <p className="form-error">{formErrors.monto}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método <span style={{ color: 'var(--rojo)' }}>*</span></label>
                    <select className="form-select" value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                      {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Referencia</label>
                    <input className="form-input" placeholder="TRF-001..." value={form.referencia}
                      onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de pago</label>
                    <input className="form-input" type="date" value={form.fecha_pago}
                      onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" rows={2} placeholder="Observaciones..."
                    value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={cerrarModalNew} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={15} /> {saving ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
