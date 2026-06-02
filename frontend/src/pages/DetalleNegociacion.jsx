import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { useModalA11y } from '../hooks/useModalA11y';

const ESTADO_SIGUIENTES = {
  pendiente: [{ estado: 'aceptada', label: ' Aceptar', cls: 'btn-primary' }, { estado: 'rechazada', label: ' Rechazar', cls: 'btn-danger' }],
  en_proceso: [{ estado: 'aceptada', label: ' Confirmar acuerdo', cls: 'btn-primary' }],
  aceptada: [],
  rechazada: [],
  completada: [],
  cancelada: [],
};

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
  const [modalAcept, setModalAcept] = useState(false);
  const cerrarModalAcept = () => { if (!sending) setModalAcept(false); };
  const modalAceptRef = useModalA11y(modalAcept, cerrarModalAcept);
  const [precioForm, setPrecioForm] = useState('');
  const [chatLive, setChatLive] = useState(false);
  const [estadoError, setEstadoError] = useState('');
  const [sendError, setSendError] = useState('');

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

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
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

  async function cambiarEstado(nuevoEstado, extras = {}) {
    try {
      await api.patch(`/negociaciones/${id}/estado`, { estado: nuevoEstado, ...extras });
      setNeg(prev => ({ ...prev, estado: nuevoEstado, ...extras }));
      setModalAcept(false);
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'No se pudo cambiar el estado');
    }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (loadError) return <div className="empty-state card"><h3>No se pudo cargar la negociación</h3><p>{loadError}</p></div>;
  if (!neg) return <div className="empty-state"><h3>Negociación no encontrada</h3></div>;

  const isProductor = user?.rol === 'productor';
  const miId = user?.id;
  const acciones = ESTADO_SIGUIENTES[neg.estado] ?? [];
  const total = neg.precio_acordado ? neg.precio_acordado * neg.cantidad_solicitada : null;

  const ESTADO_CFG = {
    pendiente: 'badge-oro', en_proceso: 'badge-azul', aceptada: 'badge-verde',
    rechazada: 'badge-rojo', completada: 'badge-verde', cancelada: 'badge-gris',
  };

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/negociaciones')}> Volver a negociaciones</button>
      </div>

      {estadoError && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{estadoError}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--sp-6)', alignItems: 'start' }}>

        {/* ── Chat principal ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Header */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                <div>
                  <h2 style={{ marginBottom: 'var(--sp-1)' }}>{neg.titulo}</h2>
                  <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '.875rem', color: 'var(--gris-500)', flexWrap: 'wrap' }}>
                    <span> {neg.publicacion?.titulo}</span>
                    <span> {neg.created_at}</span>
                  </div>
                </div>
                <span className={`badge ${ESTADO_CFG[neg.estado] ?? 'badge-gris'}`} style={{ fontSize: '.875rem' }}>
                  {neg.estado}
                </span>
              </div>

              {/* Steps de progreso */}
              <div className="steps">
                {['pendiente', 'en_proceso', 'aceptada', 'completada'].map((e, i) => {
                  const estados = ['pendiente', 'en_proceso', 'aceptada', 'completada'];
                  const curIdx = estados.indexOf(neg.estado);
                  const isDone = i < curIdx;
                  const isActive = e === neg.estado;
                  return (
                    <div key={e} className={`step-item${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                      <div className="step-circle">{isDone ? '' : i + 1}</div>
                      <div className="step-label">{{ pendiente: 'Solicitud', en_proceso: 'En proceso', aceptada: 'Aceptada', completada: 'Completada' }[e]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between gap-3">
                <h4> Mensajes privados</h4>
                <span className={`chat-live ${chatLive ? 'on' : 'off'}`}>
                  {chatLive ? 'En vivo' : 'Reconectando'}
                </span>
              </div>
            </div>
            <div className="chat-wrap" style={{ border: 'none', borderRadius: 0, height: 400 }}>
              <div className="chat-messages" ref={chatRef}>
                {msgs.length === 0
                  ? <div style={{ textAlign: 'center', color: 'var(--gris-500)', padding: 'var(--sp-8)' }}>
                    Sin mensajes aún. Inicia la conversación.
                  </div>
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
              {sendError && (
                <div className="alert alert-error" style={{ marginTop: 'var(--sp-2)' }} role="alert">{sendError}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Panel lateral ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>

          {/* Resumen */}
          <div className="card">
            <div className="card-header"><h4> Resumen</h4></div>
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

          {/* Participantes */}
          <div className="card">
            <div className="card-header"><h4> Participantes</h4></div>
            <div className="card-body">
              {[
                [' Productor', neg.productor?.nombre, neg.productor?.telefono],
                ['‍ Comprador', neg.comprador?.nombre, neg.comprador?.telefono],
              ].map(([rol, nombre, email]) => (
                <div key={rol} style={{ marginBottom: 'var(--sp-4)' }}>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 4 }}>{rol}</div>
                  <div style={{ fontWeight: 600 }}>{nombre}</div>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}>{email}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          {acciones.length > 0 && (
            <div className="card">
              <div className="card-header"><h4> Acciones</h4></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {acciones.map(acc => (
                  <button key={acc.estado}
                    className={`btn ${acc.cls} btn-full`}
                    onClick={() => acc.estado === 'aceptada' ? setModalAcept(true) : cambiarEstado(acc.estado)}>
                    {acc.label}
                  </button>
                ))}
                {neg.estado !== 'cancelada' && neg.estado !== 'completada' && neg.estado !== 'rechazada' && (
                  <button className="btn btn-ghost btn-full" style={{ color: 'var(--gris-500)' }}
                    onClick={() => cambiarEstado('cancelada')}>
                    Cancelar negociación
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Entrega */}
          {neg.estado === 'aceptada' && (
            <button className="btn btn-oro btn-full" onClick={() => navigate(`/entregas`)}>
              Gestionar entrega
            </button>
          )}
        </div>
      </div>

      {/* Modal aceptar */}
      {modalAcept && (
        <div className="modal-overlay" onClick={cerrarModalAcept}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalAceptRef}>
            <div className="modal-header">
              <h3> Aceptar negociación</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalAcept} disabled={sending}></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Precio acordado (Q/{neg.unidad_medida}) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <div className="input-group">
                  <span className="input-prefix">Q</span>
                  <input className="form-input" type="number" min="0" step="0.01"
                    value={precioForm} onChange={e => setPrecioForm(e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              {precioForm && (
                <div className="alert alert-success">
                  Total: <strong>Q{(Number(precioForm) * neg.cantidad_solicitada).toLocaleString()}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalAcept} disabled={sending}>Cancelar</button>
              <button className="btn btn-primary"
                onClick={() => cambiarEstado('aceptada', { precio_acordado: Number(precioForm) })}
                disabled={!precioForm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
