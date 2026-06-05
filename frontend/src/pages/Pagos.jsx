import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { TableSkeleton } from '../components/skeletons';
import { useModalA11y } from '../hooks/useModalA11y';
import useAuthStore from '../store/auth.store';
import { CreditCard, CheckCircle, Clock, XCircle, RefreshCw, PlusCircle, DollarSign, Truck } from 'lucide-react';

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
    pagado_al_productor: p.pagado_al_productor ?? false,
  };
}

export default function Pagos() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isProductor = user?.rol === 'productor';
  const isComprador = user?.rol === 'comprador';
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [modalNew, setModalNew] = useState(false);
  const [negociaciones, setNegociaciones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const cerrarModalNew = () => { if (!saving) setModalNew(false); };
  const modalNewRef = useModalA11y(modalNew, cerrarModalNew);
  const [form, setForm] = useState({ negociacion_id: '', monto: '', metodo_pago: 'efectivo', referencia: '', fecha_pago: '', notas: '' });
  const [formErrors, setFormErrors] = useState({});

  const [modalPagoProductor, setModalPagoProductor] = useState(null);
  const cerrarModalPagoProductor = () => { if (!saving) setModalPagoProductor(null); };
  const modalPagoProductorRef = useModalA11y(!!modalPagoProductor, cerrarModalPagoProductor);

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
    api.get('/negociaciones', { params: { limit: 100 } })
      .then(r => {
        const todas = r.data?.data ?? [];
        setNegociaciones(todas.filter(n => ['aceptada', 'en_proceso', 'acuerdo_pendiente', 'en_transito', 'completada'].includes(n.estado)));
      })
      .catch(() => setNegociaciones([]));
  }, []);

  const totales = useMemo(() => ({
    completado: pagos.filter(p => p.estado === 'completado').reduce((s, p) => s + p.monto, 0),
    pendiente:  pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0),
  }), [pagos]);

  const filtrados = useMemo(() => filtro === 'Todos' ? pagos : pagos.filter(p => p.estado === filtro), [pagos, filtro]);
  const pag = usePagination(filtrados, 10);
  const negociacionesPendientesPago = useMemo(() => {
    const negociacionesConPagoActivo = new Set(
      pagos
        .filter(p => p.estado !== 'fallido')
        .map(p => Number(p.negociacion_id))
    );
    return negociaciones.filter(n => !negociacionesConPagoActivo.has(Number(n.id)));
  }, [negociaciones, pagos]);

  function abrirModalNuevo() {
    setForm({ negociacion_id: '', monto: '', metodo_pago: 'efectivo', referencia: '', fecha_pago: new Date().toISOString().slice(0,10), notas: '' });
    setFormErrors({});
    setSaveError('');
    setModalNew(true);
  }

  function handleNegociacionChange(e) {
    const negId = e.target.value;
    const neg = negociacionesPendientesPago.find(n => String(n.id) === negId);
    let montoTotal = '';
    if (neg?.precio_acordado && neg?.cantidad_solicitada) {
      const precio = Number(neg.precio_acordado);
      const cantidad = Number(neg.cantidad_solicitada);
      montoTotal = String(precio * cantidad);
    } else if (neg?.precio_acordado) {
      montoTotal = String(neg.precio_acordado);
    }
    setForm(f => ({
      ...f,
      negociacion_id: negId,
      monto: montoTotal,
    }));
  }

  const negSeleccionada = negociacionesPendientesPago.find(n => String(n.id) === String(form.negociacion_id)) ?? null;
  const montoCalculado = negSeleccionada?.precio_acordado && negSeleccionada?.cantidad_solicitada
    ? Number(negSeleccionada.precio_acordado) * Number(negSeleccionada.cantidad_solicitada)
    : null;

  async function guardarPago(e) {
    e.preventDefault();
    const errs = {};
    if (!form.negociacion_id) errs.negociacion_id = 'Selecciona una negociación';
    if (!form.monto || Number(form.monto) <= 0) errs.monto = 'Ingresa un monto válido';
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaveError('');
    setSaving(true);
    try {
      const res = await api.post('/pagos', {
        ...form,
        negociacion_id: Number(form.negociacion_id),
        monto: Number(form.monto),
      });
      const nuevo = normalizePago(res.data?.data ?? { ...form, id: Date.now(), estado: 'pendiente' }, user);
      setPagos(prev => [nuevo, ...prev]);
      setModalNew(false);
    } catch (err) {
      setSaveError(err.response?.data?.message ?? 'No se pudo registrar el pago');
    } finally { setSaving(false); }
  }

  async function actualizarEstado(id, estado) {
    const previo = pagos.find(p => p.id === id)?.estado;
    if (!previo) return;
    setPagos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    try {
      await api.put(`/pagos/${id}`, { estado });
    } catch (err) {
      setPagos(prev => prev.map(p => p.id === id ? { ...p, estado: previo } : p));
      setError(err.response?.data?.message ?? 'No se pudo actualizar el estado del pago');
    }
  }

  async function marcarPagadoAlProductor(pago) {
    setSaving(true);
    try {
      const res = await api.post(`/pagos/${pago.id}/pagar-productor`);
      const actualizado = normalizePago(res.data?.data ?? pago, user);
      setPagos(prev => prev.map(p => p.id === pago.id ? actualizado : p));
      setModalPagoProductor(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo registrar el pago al productor');
    } finally { setSaving(false); }
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
            <div className="stat-label">Total de dinero de pagos obtenidos</div>
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
                <tr>
                  <th>Negociación</th>
                  <th>Contraparte</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Productor pagado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pag.pageItems.map(p => {
                  const cfg = ESTADO_CFG[p.estado] ?? { badge: 'badge-gris', icon: null, label: p.estado };
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/negociaciones/${p.negociacion_id}`)}>
                          {p.titulo_neg}
                        </button>
                      </td>
                      <td style={{ color: 'var(--gris-700)' }}>{p.contraparte}</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--verde-800)' }}>
                          Q{p.monto.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.metodo_pago}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '.8125rem', color: 'var(--gris-500)' }}>
                        {p.referencia ?? '—'}
                      </td>
                      <td style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>{p.fecha_pago ?? '—'}</td>
                      <td>
                        <span className={`badge ${cfg.badge}`} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td>
                        {p.estado === 'completado' ? (
                          p.pagado_al_productor
                            ? <span className="badge badge-verde" style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                                <CheckCircle size={12} /> Si
                              </span>
                            : <span className="badge badge-oro" style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                                <Clock size={12} /> Pendiente
                              </span>
                        ) : (
                          <span style={{ color: 'var(--gris-400)', fontSize: '.8125rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                          {p.estado === 'pendiente' && (
                            <>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--verde-700)', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => actualizarEstado(p.id, 'completado')}>
                                <CheckCircle size={13} /> Completar
                              </button>
                              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--rojo)', display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => actualizarEstado(p.id, 'fallido')}>
                                <XCircle size={13} /> Fallido
                              </button>
                            </>
                          )}
                          {p.estado === 'completado' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--azul)', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => actualizarEstado(p.id, 'reembolsado')}>
                              <RefreshCw size={13} /> Reembolsar
                            </button>
                          )}
                          {p.estado === 'completado' && !p.pagado_al_productor && user?.rol === 'productor' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--verde-700)', display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setModalPagoProductor(p)}
                              title="Confirmar que se recibio el pago">
                              <Truck size={13} /> Pagar productor
                            </button>
                          )}
                        </div>
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
              <h3>Registrar pago simulado</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalNew} disabled={saving}>✕</button>
            </div>
            <form onSubmit={guardarPago} noValidate>
              <div className="modal-body">
                {saveError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{saveError}</div>}

                <div className="form-group">
                  <label className="form-label">Negociación <span style={{ color: 'var(--rojo)' }}>*</span></label>
                  {negociacionesPendientesPago.length === 0
                    ? <p className="text-muted" style={{ fontSize: '.875rem' }}>No tienes pagos pendientes por registrar.</p>
                    : <select className="form-select" value={form.negociacion_id} onChange={handleNegociacionChange}
                        aria-invalid={formErrors.negociacion_id ? 'true' : 'false'}>
                        <option value="">— Selecciona una negociación —</option>
                        {negociacionesPendientesPago.map(n => (
                          <option key={n.id} value={n.id}>
                            #{n.id} — {n.publicacion?.titulo ?? 'Sin título'} - {n.cantidad_solicitada} unidades a Q{Number(n.precio_acordado).toLocaleString()} c/u = Q{(Number(n.precio_acordado) * Number(n.cantidad_solicitada)).toLocaleString()}
                          </option>
                        ))}
                      </select>
                  }
                  {formErrors.negociacion_id && <p className="form-error">{formErrors.negociacion_id}</p>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Monto total (Q) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                    <div className="input-group">
                      <span className="input-prefix">Q</span>
                      <input className="form-input" type="text" inputMode="decimal" placeholder="0.00"
                        value={form.monto}
                        onChange={e => { 
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          if (!montoCalculado) setForm(f => ({ ...f, monto: val }));
                        }}
                        readOnly={!!montoCalculado}
                        style={montoCalculado ? { background: 'var(--gris-50)', color: 'var(--gris-700)', cursor: 'not-allowed' } : {}}
                        aria-invalid={formErrors.monto ? 'true' : 'false'} />
                    </div>
                    {montoCalculado && negSeleccionada && (
                      <p style={{ fontSize: '.8rem', color: 'var(--verde-700)', marginTop: 4, fontWeight: 500 }}>
                        Q{Number(negSeleccionada.precio_acordado).toLocaleString()} x {Number(negSeleccionada.cantidad_solicitada).toLocaleString()} {negSeleccionada.publicacion?.unidad_medida ?? 'unidades'} = Q{montoCalculado.toLocaleString()}
                      </p>
                    )}
                    {formErrors.monto && <p className="form-error">{formErrors.monto}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de pago</label>
                    <select className="form-select" value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}>
                      {METODOS.map(m => <option key={m} value={m} style={{ textTransform: 'capitalize' }}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Referencia</label>
                    <input className="form-input" type="text" placeholder="TRF-001..." value={form.referencia}
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

                <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--verde-50)', borderRadius: 'var(--radius)', border: '1px solid var(--verde-100)', fontSize: '.8125rem', color: 'var(--verde-800)' }}>
                  Este es un pago simulado. Solo cambia el estado en el sistema, no procesa dinero real.
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

      {modalPagoProductor && isProductor && (
        <div className="modal-overlay" onClick={cerrarModalPagoProductor}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalPagoProductorRef}>
            <div className="modal-header">
              <h3>Confirmar pago al productor</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalPagoProductor} disabled={saving}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--sp-4)', color: 'var(--gris-700)' }}>
                ¿Confirmas que el productor ya recibio este pago?
              </p>
              <div style={{ padding: 'var(--sp-4)', background: 'var(--gris-50)', borderRadius: 'var(--radius)', border: '1px solid var(--gris-200)', marginBottom: 'var(--sp-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>Negociación</span>
                  <span style={{ fontWeight: 600 }}>{modalPagoProductor.titulo_neg}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                  <span style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>Monto</span>
                  <span style={{ fontWeight: 700, color: 'var(--verde-800)', fontSize: '1.0625rem' }}>Q{modalPagoProductor.monto.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>Metodo</span>
                  <span style={{ textTransform: 'capitalize' }}>{modalPagoProductor.metodo_pago}</span>
                </div>
              </div>
              <div style={{ padding: 'var(--sp-3)', background: 'var(--azul-50)', borderRadius: 'var(--radius)', border: '1px solid var(--azul-100)', fontSize: '.8125rem', color: 'var(--azul-800)' }}>
                Al confirmar esto, se habilitara la doble confirmacion de entrega en la negociacion correspondiente.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalPagoProductor} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => marcarPagadoAlProductor(modalPagoProductor)} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={15} /> {saving ? 'Confirmando...' : 'Confirmar pago al productor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
