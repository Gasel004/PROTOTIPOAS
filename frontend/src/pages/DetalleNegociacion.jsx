import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { useModalA11y } from '../hooks/useModalA11y';

const ACCIONES_CANCELAR = ['pendiente', 'en_proceso', 'acuerdo_pendiente', 'en_transito'];

function normalizeNeg(n) {
  return {
    ...n,
    titulo: n.publicacion?.titulo ?? n.titulo ?? 'Negociación',
    cantidad_solicitada: Number(n.cantidad_solicitada ?? 0),
    precio_acordado: n.precio_acordado == null ? null : Number(n.precio_acordado),
    unidad_medida: n.publicacion?.unidad_medida ?? n.unidad_medida ?? 'unidad',
    created_at: n.created_at ? String(n.created_at).slice(0, 10) : '',
    fecha_entrega_acordada: n.fecha_entrega_acordada ? String(n.fecha_entrega_acordada).slice(0, 10) : null,
    productor: {
      ...n.productor,
      nombre: n.productor?.usuario?.nombre ?? n.productor?.nombre,
      telefono: n.productor?.usuario?.telefono ?? n.productor?.telefono,
    },
    comprador: {
      ...n.comprador,
      nombre: n.comprador?.usuario?.nombre ?? n.comprador?.nombre,
      telefono: n.comprador?.usuario?.telefono ?? n.comprador?.telefono,
    },
  };
}

function normalizeMsg(m) {
  return {
    ...m,
    remitente: m.remitente?.nombre ?? m.remitente ?? 'Usuario',
    created_at: m.created_at ? String(m.created_at).replace('T', ' ').slice(0, 16) : '',
  };
}

const PASOS_FLUJO = ['pendiente', 'en_proceso', 'acuerdo_pendiente', 'en_transito', 'completada'];
const PASO_LABELS = {
  pendiente: 'Solicitud',
  en_proceso: 'Negociando',
  acuerdo_pendiente: 'Confirmando',
  en_transito: 'En tránsito',
  completada: 'Completada',
};

const ESTADO_CFG = {
  pendiente:         'badge-oro',
  en_proceso:        'badge-azul',
  acuerdo_pendiente: 'badge-azul',
  en_transito:       'badge-azul',
  aceptada:          'badge-verde',
  rechazada:         'badge-rojo',
  completada:        'badge-verde',
  cancelada:         'badge-gris',
};

export default function DetalleNegociacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const chatRef = useRef(null);
  const pollingRef = useRef(null);

  const [neg, setNeg] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [chatLive, setChatLive] = useState(false);
  const [estadoError, setEstadoError] = useState('');
  const [sendError, setSendError] = useState('');
  const [accionMsg, setAccionMsg] = useState('');

  const [modalOferta, setModalOferta] = useState(false);
  const cerrarModalOferta = () => { if (!sending) setModalOferta(false); };
  const modalOfertaRef = useModalA11y(modalOferta, cerrarModalOferta);
  const [precioForm, setPrecioForm] = useState('');

  const [confirmandoCierre, setConfirmandoCierre] = useState(false);

  const cargarNeg = useCallback(async () => {
    try {
      const res = await api.get(`/negociaciones/${id}`);
      setNeg(res.data?.data ? normalizeNeg(res.data.data) : null);
    } catch { }
  }, [id]);

  const cargarMensajes = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/negociaciones/${id}/mensajes`);
      const nuevos = (res.data?.data ?? []).map(normalizeMsg);
      setMsgs(prev => {
        const prevKey = prev.map(m => `${m.id}:${m.leido}`).join('|');
        const nextKey = nuevos.map(m => `${m.id}:${m.leido}`).join('|');
        return prevKey === nextKey ? prev : nuevos;
      });
      setChatLive(true);
      if (!silent) await api.patch(`/negociaciones/${id}/mensajes/leer`).catch(() => {});
    } catch {
      setChatLive(false);
    }
  }, [id]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError(null);
    Promise.all([
      api.get(`/negociaciones/${id}`, { signal: ac.signal }),
      api.get(`/negociaciones/${id}/mensajes`, { signal: ac.signal }),
    ]).then(([nRes, mRes]) => {
      if (ac.signal.aborted) return;
      setNeg(nRes.data?.data ? normalizeNeg(nRes.data.data) : null);
      setMsgs((mRes.data?.data ?? []).map(normalizeMsg));
      setChatLive(true);
    }).catch(err => {
      if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return;
      setLoadError(err.response?.data?.message ?? 'No se pudo cargar la negociación');
      setNeg(null);
    }).finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [id]);

  useEffect(() => {
    const start = () => {
      if (pollingRef.current) return;
      pollingRef.current = window.setInterval(() => {
        if (document.visibilityState === 'visible') cargarMensajes({ silent: true });
      }, 2000);
    };
    const stop = () => {
      if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { cargarMensajes({ silent: true }); start(); }
      else stop();
    };
    const onFocus = () => cargarMensajes({ silent: true });
    start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('focus', onFocus); };
  }, [cargarMensajes]);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (isAtBottom) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  async function enviarMensaje() {
    if (!texto.trim()) return;
    setSending(true);
    setSendError('');
    const textoEnviar = texto;
    const optimista = { id: Date.now(), remitente_id: user?.id, remitente: user?.nombre, contenido: textoEnviar, created_at: 'Ahora', leido: false };
    setMsgs(prev => [...prev, optimista]);
    setTexto('');
    try {
      const res = await api.post(`/negociaciones/${id}/mensajes`, { contenido: textoEnviar });
      setMsgs(prev => prev.map(m => m.id === optimista.id ? normalizeMsg(res.data?.data ?? m) : m));
      cargarMensajes({ silent: true });
    } catch (err) {
      setMsgs(prev => prev.filter(m => m.id !== optimista.id));
      setTexto(textoEnviar);
      setSendError(err.response?.data?.message ?? 'No se pudo enviar el mensaje');
    } finally { setSending(false); }
  }

  async function cambiarEstado(nuevoEstado) {
    setEstadoError('');
    try {
      await api.patch(`/negociaciones/${id}/estado`, { estado: nuevoEstado });
      setNeg(prev => ({ ...prev, estado: nuevoEstado }));
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'No se pudo cambiar el estado');
    }
  }

  async function enviarOferta() {
    const precioNum = parseFloat(precioForm);
    if (!precioForm || isNaN(precioNum) || precioNum <= 0) return;
    setSending(true);
    setEstadoError('');
    try {
      const res = await api.post(`/negociaciones/${id}/ofertar`, { precio: precioNum });
      setNeg(prev => normalizeNeg({ ...prev, ...res.data.data }));
      setAccionMsg(res.data.message ?? 'Oferta enviada');
      setModalOferta(false);
      setPrecioForm('');
      setTimeout(() => setAccionMsg(''), 4000);
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'No se pudo enviar la oferta');
    } finally { setSending(false); }
  }

  async function confirmarCierre() {
    setConfirmandoCierre(true);
    setEstadoError('');
    try {
      const res = await api.post(`/negociaciones/${id}/confirmar-cierre`);
      setNeg(prev => normalizeNeg({ ...prev, ...res.data.data }));
      setAccionMsg(res.data.message ?? 'Confirmación registrada');
      setTimeout(() => setAccionMsg(''), 5000);
      await cargarNeg();
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'Error al confirmar');
    } finally { setConfirmandoCierre(false); }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (loadError) return <div className="empty-state card"><h3>No se pudo cargar la negociación</h3><p>{loadError}</p></div>;
  if (!neg) return <div className="empty-state"><h3>Negociación no encontrada</h3></div>;

  const isProductor = user?.rol === 'productor';
  const isComprador = user?.rol === 'comprador';
  const miId = user?.id;
  const total = neg.precio_acordado ? neg.precio_acordado * neg.cantidad_solicitada : null;

  const yoConfirmeCierre = isProductor ? neg.confirma_cierre_productor : neg.confirma_cierre_comprador;
  const otroConfirmoCierre = isProductor ? neg.confirma_cierre_comprador : neg.confirma_cierre_productor;

  const estadoNormalizado = neg.estado === 'aceptada' ? 'acuerdo_pendiente' : neg.estado;
  const curIdx = PASOS_FLUJO.indexOf(estadoNormalizado);

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/negociaciones')}>Volver a negociaciones</button>
      </div>

      {estadoError && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }} role="alert">{estadoError}</div>
      )}
      {accionMsg && (
        <div className="alert alert-success" style={{ marginBottom: 'var(--sp-4)' }} role="status">{accionMsg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--sp-6)', alignItems: 'start' }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-5)' }}>
                <div>
                  <h2 style={{ margin: 0 }}>{neg.titulo}</h2>
                  <div style={{ display: 'flex', gap: 'var(--sp-4)', marginTop: 'var(--sp-2)', fontSize: '.875rem', color: 'var(--gris-500)' }}>
                    <span>{neg.publicacion?.titulo}</span>
                    <span>{neg.created_at}</span>
                  </div>
                </div>
                <span className={`badge ${ESTADO_CFG[neg.estado] ?? 'badge-gris'}`} style={{ fontSize: '.875rem' }}>
                  {neg.estado}
                </span>
              </div>

              <div className="steps">
                {PASOS_FLUJO.map((e, i) => {
                  const isDone = i < curIdx;
                  const isActive = e === estadoNormalizado;
                  return (
                    <div key={e} className={`step-item${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                      <div className="step-circle">{isDone ? '✓' : i + 1}</div>
                      <div className="step-label">{PASO_LABELS[e]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {(neg.estado === 'pendiente' || neg.estado === 'en_proceso' || neg.estado === 'acuerdo_pendiente') &&
           (isProductor || isComprador) && (
            <div className="card">
              <div className="card-header">
                <h4>Negociación de precio</h4>
              </div>
              <div className="card-body">
                {neg.precio_acordado && (
                  <div style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--azul-50)', borderRadius: 'var(--radius)', border: '1px solid var(--azul-100)' }}>
                    <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 2 }}>Última oferta</div>
                    <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--azul-800)' }}>
                      Q{neg.precio_acordado}/{neg.unidad_medida}
                    </div>
                    {total && (
                      <div style={{ fontSize: '.875rem', color: 'var(--gris-600)', marginTop: 2 }}>
                        Total: Q{total.toLocaleString()} (por {neg.cantidad_solicitada} {neg.unidad_medida})
                      </div>
                    )}
                  </div>
                )}
                <button className="btn btn-primary btn-full" onClick={() => { setPrecioForm(neg.precio_acordado ? String(neg.precio_acordado) : ''); setModalOferta(true); }}>
                  {neg.precio_acordado ? 'Contra-ofertar precio' : 'Proponer precio'}
                </button>
                {neg.estado === 'acuerdo_pendiente' && (
                  <div style={{ marginTop: 'var(--sp-3)', fontSize: '.8125rem', color: 'var(--verde-700)', background: 'var(--verde-50)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius)' }}>
                    Precio acordado. Confirma el trato en el panel de acciones.
                  </div>
                )}
              </div>
            </div>
          )}

          {neg.estado === 'acuerdo_pendiente' && (isProductor || isComprador) && (
            <div className="card" style={{ border: '2px solid var(--verde-200)' }}>
              <div className="card-header">
                <h4>Confirmar trato</h4>
              </div>
              <div className="card-body">
                <p style={{ marginBottom: 'var(--sp-4)', color: 'var(--gris-700)' }}>
                  Precio acordado: <strong>Q{neg.precio_acordado}/{neg.unidad_medida}</strong> — 
                  Cantidad: <strong>{neg.cantidad_solicitada} {neg.unidad_medida}</strong> — 
                  Total: <strong>Q{total?.toLocaleString() ?? '—'}</strong>
                </p>
                <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)', fontSize: '.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: neg.confirma_cierre_productor ? 'var(--verde-700)' : 'var(--gris-400)' }}>
                      {neg.confirma_cierre_productor ? '✓' : '○'}
                    </span>
                    <span>Productor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: neg.confirma_cierre_comprador ? 'var(--verde-700)' : 'var(--gris-400)' }}>
                      {neg.confirma_cierre_comprador ? '✓' : '○'}
                    </span>
                    <span>Comprador</span>
                  </div>
                </div>
                {yoConfirmeCierre ? (
                  <div className="alert alert-success">
                    Ya confirmaste. {otroConfirmoCierre ? 'Ambos confirmaron.' : 'Esperando al otro participante...'}
                  </div>
                ) : (
                  <button className="btn btn-primary btn-full" onClick={confirmarCierre} disabled={confirmandoCierre}>
                    {confirmandoCierre ? 'Confirmando...' : 'Confirmar trato'}
                  </button>
                )}
              </div>
            </div>
          )}

          {neg.estado === 'en_transito' && (
            <div className="card" style={{ border: '2px solid var(--azul-100)' }}>
              <div className="card-header"><h4>Entrega en tránsito</h4></div>
              <div className="card-body">
                <p style={{ color: 'var(--gris-700)', fontSize: '.875rem', marginBottom: 'var(--sp-4)' }}>
                  El trato está cerrado. Gestiona la confirmación de entrega desde la sección de Entregas.
                </p>
                <button className="btn btn-primary btn-full" onClick={() => navigate('/entregas')}>
                  Ir a Entregas
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between gap-3">
                <h4>Mensajes privados</h4>
                <span className={`chat-live ${chatLive ? 'on' : 'off'}`}>
                  {chatLive ? 'En vivo' : 'Reconectando'}
                </span>
              </div>
            </div>
            <div className="chat-wrap" style={{ border: 'none', borderRadius: 0, height: 400 }}>
              <div className="chat-messages" ref={chatRef}>
                {msgs.length === 0
                  ? <div style={{ textAlign: 'center', color: 'var(--gris-500)', padding: 'var(--sp-8)' }}>Sin mensajes aún. Inicia la conversación.</div>
                  : msgs.map(m => {
                    const isMine = m.remitente_id === miId;
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        {!isMine && <div style={{ fontSize: '.75rem', color: 'var(--gris-500)', marginBottom: 4, paddingLeft: 'var(--sp-2)' }}>{m.remitente}</div>}
                        <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'}`}>
                          {m.contenido}
                          <div className="msg-time">{m.created_at}</div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
              <div className="chat-input-wrap">
                <textarea className="chat-input" rows={1} placeholder="Escribe un mensaje..."
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
                />
                <button className="btn btn-primary" onClick={enviarMensaje} disabled={sending || !texto.trim()}>
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
              {sendError && <div className="alert alert-error" style={{ marginTop: 'var(--sp-2)' }} role="alert">{sendError}</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          <div className="card">
            <div className="card-header"><h4>Resumen</h4></div>
            <div className="card-body">
              {[
                ['Cantidad', `${neg.cantidad_solicitada} ${neg.unidad_medida}`],
                ['Precio acordado', neg.precio_acordado ? `Q${neg.precio_acordado}/${neg.unidad_medida}` : 'Sin acordar'],
                ['Total estimado', total ? `Q${total.toLocaleString()}` : '—'],
                ['Entrega', neg.fecha_entrega_acordada ?? 'Sin definir'],
                ['Condiciones', neg.condiciones ?? 'Sin condiciones'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ marginBottom: 'var(--sp-4)' }}>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 3 }}>{lbl}</div>
                  <div style={{ fontWeight: 600, fontSize: '.9375rem' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h4>Participantes</h4></div>
            <div className="card-body">
              {[
                ['Productor', neg.productor?.nombre, neg.productor?.telefono],
                ['Comprador', neg.comprador?.nombre, neg.comprador?.telefono],
              ].map(([rol, nombre, tel]) => (
                <div key={rol} style={{ marginBottom: 'var(--sp-4)' }}>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 4 }}>{rol}</div>
                  <div style={{ fontWeight: 600 }}>{nombre}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}>{tel}</div>
                </div>
              ))}
            </div>
          </div>

          {ACCIONES_CANCELAR.includes(neg.estado) && (
            <div className="card">
              <div className="card-header"><h4>Acciones</h4></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {neg.estado === 'pendiente' && isProductor && (
                  <button className="btn btn-danger btn-full" onClick={() => cambiarEstado('rechazada')}>
                    Rechazar solicitud
                  </button>
                )}
                <button className="btn btn-ghost btn-full" style={{ color: 'var(--gris-500)' }}
                  onClick={() => cambiarEstado('cancelada')}>
                  Cancelar negociación
                </button>
              </div>
            </div>
          )}

          {neg.estado === 'en_transito' && (
            <button className="btn btn-oro btn-full" onClick={() => navigate('/pagos')}>
              Ver / registrar pago
            </button>
          )}
        </div>
      </div>

      {modalOferta && (
        <div className="modal-overlay" onClick={cerrarModalOferta}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalOfertaRef}>
            <div className="modal-header">
              <h3>{neg.precio_acordado ? 'Contra-ofertar' : 'Proponer precio'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalOferta} disabled={sending}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Precio por {neg.unidad_medida} <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <div className="input-group">
                  <span className="input-prefix">Q</span>
                  <input 
                    className="form-input" 
                    type="text" 
                    inputMode="decimal"
                    value={precioForm} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const partes = val.split('.');
                      const sanitizado = partes[0] + (partes[1] !== undefined ? '.' + partes[1].slice(0,2) : '');
                      setPrecioForm(sanitizado);
                    }}
                    placeholder="0.00" 
                    autoFocus 
                  />
                </div>
              </div>
              {precioForm && parseFloat(precioForm) > 0 && (
                <div className="alert alert-success">
                  Cantidad: {neg.cantidad_solicitada} {neg.unidad_medida} x Q{parseFloat(precioForm).toLocaleString()} = <strong>Q{(parseFloat(precioForm) * neg.cantidad_solicitada).toLocaleString()}</strong>
                </div>
              )}
              {neg.precio_acordado && precioForm && parseFloat(precioForm) === neg.precio_acordado && (
                <div className="alert alert-success" style={{ marginTop: 'var(--sp-2)' }}>
                  Este precio coincide con la oferta actual. Se cerrará el acuerdo al confirmar.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalOferta} disabled={sending}>Cancelar</button>
              <button className="btn btn-primary"
                onClick={enviarOferta}
                disabled={!precioForm || parseFloat(precioForm) <= 0 || sending}>
                {sending ? 'Enviando...' : 'Enviar oferta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
