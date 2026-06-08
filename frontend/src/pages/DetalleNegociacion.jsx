import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Handshake, Star, Phone } from 'lucide-react';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { useModalA11y } from '../hooks/useModalA11y';

const ESTADO_SIGUIENTES = {
  pendiente: [{ estado: 'en_transito', label: ' Aceptar y proponer precio', cls: 'btn-primary' }, { estado: 'rechazada', label: ' Rechazar', cls: 'btn-danger' }],
  en_proceso: [{ estado: 'en_transito', label: ' Confirmar mi parte del acuerdo', cls: 'btn-primary' }],
  acuerdo_pendiente: [{ estado: 'en_transito', label: ' Confirmar mi parte del acuerdo', cls: 'btn-primary' }],
  en_transito: [],
  aceptada: [{ estado: 'en_transito', label: ' Confirmar acuerdo (legacy)', cls: 'btn-primary' }],
  rechazada: [],
  completada: [],
  cancelada: [],
};

const PASOS_NEGOCIACION = [
  { estado: 'pendiente',         label: 'Solicitud' },
  { estado: 'en_proceso',        label: 'En proceso' },
  { estado: 'acuerdo_pendiente', label: 'Acuerdo pendiente' },
  { estado: 'en_transito',       label: 'En tránsito' },
  { estado: 'completada',        label: 'Completada' },
];

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
  const [searchParams] = useSearchParams();
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
  const [modoModal, setModoModal] = useState('inicial');
  const cerrarModalAcept = () => { if (!sending) setModalAcept(false); };
  const modalAceptRef = useModalA11y(modalAcept, cerrarModalAcept);
  const [precioForm, setPrecioForm] = useState('');
  const [cantidadForm, setCantidadForm] = useState('');
  const [chatLive, setChatLive] = useState(false);
  const [estadoError, setEstadoError] = useState('');
  const [sendError, setSendError] = useState('');
  const [modalPropuesta, setModalPropuesta] = useState(false);
  const propuestaDescartadaKey = useRef(
    (() => { try { return sessionStorage.getItem(`la-esperanza-propuesta-descartada-${id}`) || null; } catch { return null; } })()
  );
  const persistirDescarte = (key) => {
    propuestaDescartadaKey.current = key;
    try { sessionStorage.setItem(`la-esperanza-propuesta-descartada-${id}`, key); } catch {}
  };
  const limpiarDescarte = () => {
    propuestaDescartadaKey.current = null;
    try { sessionStorage.removeItem(`la-esperanza-propuesta-descartada-${id}`); } catch {}
  };
  const cerrarModalPropuesta = () => {
    if (sending) return;
    if (neg) {
      const key = `${neg.precio_acordado}_${neg.confirmacion_productor}_${neg.confirmacion_comprador}_${neg.updated_at}`;
      persistirDescarte(key);
    }
    setModalPropuesta(false);
  };
  const reabrirPropuesta = () => {
    limpiarDescarte();
    setModalPropuesta(true);
  };
  const modalPropuestaRef = useModalA11y(modalPropuesta, cerrarModalPropuesta);

  // ── Calificación ─────────────────────────────────────
  const [modalCalificar, setModalCalificar] = useState(false);
  const cerrarModalCalificar = () => { if (!sending) setModalCalificar(false); };
  const modalCalificarRef = useModalA11y(modalCalificar, cerrarModalCalificar);
  const [puntajeSeleccionado, setPuntajeSeleccionado] = useState(0);
  const [comentarioCalif, setComentarioCalif] = useState('');
  const [califError, setCalifError] = useState('');
  const [califOk, setCalifOk] = useState('');
  const [yaCalificado, setYaCalificado] = useState(false);

  function abrirCalificar() {
    setPuntajeSeleccionado(0);
    setComentarioCalif('');
    setCalifError('');
    setCalifOk('');
    setModalCalificar(true);
  }

  async function enviarCalificacion() {
    if (puntajeSeleccionado < 1) { setCalifError('Selecciona una puntuación'); return; }
    setSending(true);
    setCalifError('');
    try {
      await api.post(`/negociaciones/${id}/calificar`, { puntaje: puntajeSeleccionado, comentario: comentarioCalif || undefined });
      setCalifOk('Calificación enviada. Será revisada por la asociación.');
      setYaCalificado(true);
      setTimeout(() => setModalCalificar(false), 2000);
    } catch (err) {
      setCalifError(err.response?.data?.message ?? 'No se pudo enviar la calificación');
    } finally { setSending(false); }
  }

  // Determinar si puede calificar según rol y estado de la entrega
  const entrega = neg?.entrega;
  const calificarDesdeNotif = searchParams.get('calificar') === '1';
  const puedeCalificarProductor = user?.rol === 'productor' && entrega && entrega.estado === 'entregado' && !yaCalificado && calificarDesdeNotif;
  const puedeCalificarComprador = user?.rol === 'comprador' && entrega && entrega.estado === 'entregado' && !yaCalificado;
  const puedeCalificar = puedeCalificarProductor || puedeCalificarComprador;
  const contraCalificar = user?.rol === 'productor' ? (neg?.comprador?.nombre ?? 'el comprador') : (neg?.productor?.nombre ?? 'el productor');

  // Auto-abrir modal de calificación cuando viene de notificación
  useEffect(() => {
    if (calificarDesdeNotif && user?.rol === 'productor' && entrega?.estado === 'entregado' && !yaCalificado && !modalCalificar) {
      setPuntajeSeleccionado(0);
      setComentarioCalif('');
      setCalifError('');
      setCalifOk('');
      setModalCalificar(true);
    }
  }, [calificarDesdeNotif, entrega?.estado, user?.rol]);

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

  const cargarNegociacion = useCallback(async ({ signal } = {}) => {
    try {
      const res = await api.get(`/negociaciones/${id}`, { signal });
      const data = res.data?.data;
      if (!data) return;
      setNeg(prev => {
        const normalized = normalizeNeg(data);
        if (!prev) return normalized;
        // No-op si el estado y los booleanos no cambiaron
        const changed =
          prev.estado !== normalized.estado ||
          prev.precio_acordado !== normalized.precio_acordado ||
          prev.confirmacion_productor !== normalized.confirmacion_productor ||
          prev.confirmacion_comprador !== normalized.confirmacion_comprador ||
          prev.entrega?.estado !== normalized.entrega?.estado;
        return changed ? { ...prev, ...normalized } : prev;
      });
    } catch (err) {
      if (err?.code === 'ERR_CANCELED') return;
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
        if (document.visibilityState === 'visible') {
          cargarMensajes({ silent: true });
          cargarNegociacion();
        }
      }, 2000);
    };
    const stop = () => {
      if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { cargarMensajes({ silent: true }); cargarNegociacion(); start(); }
      else stop();
    };
    const onFocus = () => { cargarMensajes({ silent: true }); cargarNegociacion(); };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [cargarMensajes, cargarNegociacion]);

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
      const res = await api.patch(`/negociaciones/${id}/estado`, { estado: nuevoEstado, ...extras });
      const updated = res.data?.data;
      if (updated) setNeg(prev => ({ ...prev, ...normalizeNeg(updated) }));
      setModalAcept(false);
      setModalPropuesta(false);
      limpiarDescarte();
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'No se pudo cambiar el estado');
    }
  }

  // Acepta la propuesta de precio actual (la otra parte ya propuso).
  // Llama al backend SIN precio: el controller lo trata como aceptación.
  async function aceptarPropuesta() {
    setSending(true);
    try {
      await api.patch(`/negociaciones/${id}/estado`, { estado: 'en_transito' });
      setNeg(prev => ({
        ...prev,
        confirmacion_productor: user?.rol === 'productor' ? true : prev?.confirmacion_productor,
        confirmacion_comprador: user?.rol === 'comprador' ? true : prev?.confirmacion_comprador,
        estado: 'en_transito',
      }));
      setModalPropuesta(false);
      limpiarDescarte();
    } catch (err) {
      setEstadoError(err.response?.data?.message ?? 'No se pudo aceptar la propuesta');
    } finally { setSending(false); }
  }

  function renegociarPropuesta() {
    setModalPropuesta(false);
    limpiarDescarte();
    setModoModal('renegociar');
    setPrecioForm('');
    setModalAcept(true);
  }

  // useEffect que dispara la mini-ventana cuando la otra parte confirmó
  // un precio y la nuestra todavía no. Respeta el descarte persistido
  // (botón X / sessionStorage) hasta que llegue una propuesta nueva.
  useEffect(() => {
    if (!neg || !user) return;
    const isProductor = user.rol === 'productor';
    const otroConfirmo = isProductor ? neg.confirmacion_comprador : neg.confirmacion_productor;
    const yoConfirme = isProductor ? neg.confirmacion_productor : neg.confirmacion_comprador;
    const hayPrecio = neg.precio_acordado != null;
    const currentKey = `${neg.precio_acordado}_${neg.confirmacion_productor}_${neg.confirmacion_comprador}_${neg.updated_at}`;
    if (otroConfirmo && !yoConfirme && hayPrecio) {
      if (currentKey !== propuestaDescartadaKey.current) {
        setModalPropuesta(true);
      }
    } else {
      setModalPropuesta(false);
      limpiarDescarte();
    }
  }, [neg?.confirmacion_productor, neg?.confirmacion_comprador, neg?.precio_acordado, neg?.updated_at, user?.rol]);

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (loadError) return <div className="empty-state card"><h3>No se pudo cargar la negociación</h3><p>{loadError}</p></div>;
  if (!neg) return <div className="empty-state"><h3>Negociación no encontrada</h3></div>;

  const isProductor = user?.rol === 'productor';
  const miId = user?.id;
  const acciones = ESTADO_SIGUIENTES[neg.estado] ?? [];
  const total = neg.precio_acordado ? neg.precio_acordado * neg.cantidad_solicitada : null;
  const otroConfirmo = isProductor ? neg.confirmacion_comprador : neg.confirmacion_productor;
  const yoConfirme = isProductor ? neg.confirmacion_productor : neg.confirmacion_comprador;
  const hayPropuestaPendiente = !!otroConfirmo && !yoConfirme && neg.precio_acordado != null;
  const propuestaDescartada = propuestaDescartadaKey.current != null;
  const mostrarBannerPropuesta = hayPropuestaPendiente && propuestaDescartada && !modalPropuesta;

  const ESTADO_CFG = {
    pendiente: 'badge-oro', en_proceso: 'badge-azul', en_transito: 'badge-verde',
    aceptada: 'badge-verde', rechazada: 'badge-rojo', completada: 'badge-verde', cancelada: 'badge-gris',
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
          {mostrarBannerPropuesta && (
            <div className="alert" style={{ background: 'var(--verde-50)', border: '1px solid var(--verde-200)', borderRadius: 'var(--radius)', padding: 'var(--sp-3) var(--sp-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--verde-800)' }}>
                <Handshake size={18} /> Tienes una propuesta de precio pendiente de revisar.
              </span>
              <button className="btn btn-primary btn-sm" onClick={reabrirPropuesta}>Ver propuesta</button>
            </div>
          )}
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
                {PASOS_NEGOCIACION.map((paso, i) => {
                  const curIdx = PASOS_NEGOCIACION.findIndex(p => p.estado === neg.estado);
                  const isDone = i < curIdx;
                  const isActive = paso.estado === neg.estado;
                  return (
                    <div key={paso.estado} className={`step-item${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                      <div className="step-circle">{isDone ? '' : i + 1}</div>
                       <div className="step-label">{paso.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Doble confirmación del precio (visible en en_proceso y en_transito) */}
              {(neg.estado === 'en_proceso' || neg.estado === 'en_transito' || neg.estado === 'acuerdo_pendiente' || neg.estado === 'aceptada') && (
                <div style={{ background: 'var(--gris-50)', borderRadius: 'var(--radius)', padding: 'var(--sp-4)', marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
                  <ConfirmBadge label="Productor" done={neg.confirmacion_productor} />
                  <ConfirmBadge label="Comprador" done={neg.confirmacion_comprador} />
                  {neg.confirmacion_productor && neg.confirmacion_comprador
                    ? <span style={{ color: 'var(--verde-700)', fontWeight: 600, fontSize: '.875rem' }}>
                        Ambas partes confirmaron
                      </span>
                    : <span style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>
                        Se necesitan ambas confirmaciones del precio
                      </span>
                  }
                </div>
              )}
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
                [' Productor', neg.productor?.nombre, neg.productor?.telefono, 'productor'],
                ['‍ Comprador', neg.comprador?.nombre, neg.comprador?.telefono, 'comprador'],
              ].map(([rol, nombre, telefono, rolParticipante]) => (
                <div key={rol} style={{ marginBottom: 'var(--sp-4)' }}>
                  <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 4 }}>{rol}</div>
                  <div style={{ fontWeight: 600 }}>{nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: '.8rem', color: 'var(--gris-500)' }}>{telefono}</span>
                    {user?.rol !== rolParticipante && (
                      <button className="btn btn-ghost btn-sm" disabled
                        style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--verde-700)' }}>
                        <Phone size={13} /> Llamar
                      </button>
                    )}
                  </div>
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
                    onClick={() => {
                      if (acc.estado === 'en_transito' || acc.estado === 'aceptada') {
                        // Si la otra parte ya propuso un precio, pre-rellenamos
                        // el input con ese valor; el usuario puede aceptarlo
                        // tal cual o cambiarlo para renegociar.
                        setPrecioForm(neg.precio_acordado != null ? String(neg.precio_acordado) : '');
                        setCantidadForm(String(neg.cantidad_solicitada));
                        setModoModal('inicial');
                        setModalAcept(true);
                      } else {
                        cambiarEstado(acc.estado);
                      }
                    }}>
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

          {/* Calificar contraparte */}
          {puedeCalificar && (
            <div className="card" style={{ borderLeft: '3px solid var(--oro)' }}>
              <div className="card-header"><h4> Calificar a {contraCalificar}</h4></div>
              <div className="card-body">
                <p style={{ fontSize: '.875rem', color: 'var(--gris-600)', margin: '0 0 var(--sp-3)' }}>
                  {puedeCalificarComprador
                    ? 'Ya confirmaste la recepción. Califica al productor.'
                    : 'El comprador confirmó la entrega. Deja una reseña en su perfil.'}
                </p>
                <button className="btn btn-oro btn-full" onClick={abrirCalificar}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <Star size={16} fill="currentColor" /> Calificar
                </button>
              </div>
            </div>
          )}

          {/* Entrega */}
          {neg.estado === 'en_transito' && (
            <button className="btn btn-oro btn-full" onClick={() => navigate(`/entregas`)}>
              Gestionar entrega
            </button>
          )}

          {/* Pago: visible cuando la negociación está en tránsito */}
          {neg.estado === 'en_transito' && (
            <div className="card">
              <div className="card-header"><h4> Pago</h4></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {total ? (
                  <p style={{ fontSize: '.875rem', color: 'var(--gris-700)', margin: 0 }}>
                    Total a pagar: <strong style={{ color: 'var(--verde-800)' }}>Q{total.toLocaleString()}</strong>
                  </p>
                ) : (
                  <p style={{ fontSize: '.875rem', color: 'var(--gris-500)', margin: 0 }}>
                    Aún no hay precio acordado.
                  </p>
                )}
                <p style={{ fontSize: '.8125rem', color: 'var(--gris-500)', margin: 0 }}>
                  La negociación se completará cuando la entrega esté confirmada por ambas partes y el pago esté marcado como completado.
                </p>
                <button className="btn btn-primary btn-full" onClick={() => navigate(`/pagos?negociacion_id=${neg.id}`)}>
                  Ir a registrar pago
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal aceptar (inicial o renegociar) */}
      {modalAcept && (
        <div className="modal-overlay" onClick={cerrarModalAcept}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalAceptRef}>
            <div className="modal-header">
              <h3>{modoModal === 'renegociar' ? ' Contraproponer' : ' Aceptar negociación'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalAcept} disabled={sending}></button>
            </div>
            <div className="modal-body">
              {modoModal === 'renegociar' && neg.precio_acordado != null && (
                <div className="alert" style={{ background: 'var(--gris-100)', marginBottom: 'var(--sp-4)', fontSize: '.875rem' }}>
                  Propuesta actual:{' '}
                  <strong>Q{Number(neg.precio_acordado).toLocaleString()}/{neg.unidad_medida}</strong>
                  {' '}×{' '}
                  <strong>{neg.cantidad_solicitada} {neg.unidad_medida}s</strong>
                  {' '}= Total:{' '}
                  <strong>Q{(Number(neg.precio_acordado) * neg.cantidad_solicitada).toLocaleString()}</strong>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Cantidad ({neg.unidad_medida}s) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <p className="form-hint" style={{ marginBottom: 'var(--sp-1)' }}>
                  Disponible: <strong>{Number(neg.publicacion?.cantidad_disponible ?? 0) + neg.cantidad_solicitada} {neg.unidad_medida}s</strong>
                </p>
                <input className="form-input" type="number" min="1" step="0.01"
                  max={Number(neg.publicacion?.cantidad_disponible ?? 0) + neg.cantidad_solicitada}
                  value={cantidadForm}
                  onChange={e => setCantidadForm(e.target.value)}
                  placeholder={String(neg.cantidad_solicitada)} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {modoModal === 'renegociar' ? 'Tu contrapropuesta (Q/' : 'Precio acordado (Q/'}{neg.unidad_medida}) <span style={{ color: 'var(--rojo)' }}>*</span>
                </label>
                <div className="input-group">
                  <span className="input-prefix">Q</span>
                  <input className="form-input" type="number" min="0" step="0.01"
                    value={precioForm} onChange={e => setPrecioForm(e.target.value)}
                    placeholder="0.00" />
                </div>
              </div>
              {precioForm && (
                <div className="alert alert-success">
                  {(cantidadForm || neg.cantidad_solicitada)} {neg.unidad_medida}s × Q{Number(precioForm).toLocaleString()} ={' '}
                  <strong>Q{(Number(precioForm) * (cantidadForm ? Number(cantidadForm) : neg.cantidad_solicitada)).toLocaleString()}</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalAcept} disabled={sending}>Cancelar</button>
              <button className="btn btn-primary"
                onClick={() => {
                  const precioNum = Number(precioForm);
                  const precioActual = neg.precio_acordado;
                  const cantNum = cantidadForm ? Number(cantidadForm) : undefined;
                  const cantActual = neg.cantidad_solicitada;
                  const mismoPrecio = !!precioActual && precioNum === precioActual;
                  const mismaCantidad = cantNum === undefined || cantNum === cantActual;
                  const esAceptacion = mismoPrecio && mismaCantidad;
                  if (esAceptacion) {
                    cambiarEstado('en_transito');
                  } else {
                    const extras = { precio_acordado: precioNum };
                    if (!mismaCantidad) extras.cantidad_solicitada = cantNum;
                    cambiarEstado('en_transito', extras);
                  }
                }}
                disabled={!precioForm}>
                {modoModal === 'renegociar' ? 'Enviar contrapropuesta' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini-ventana de propuesta de precio pendiente */}
      {modalPropuesta && neg.precio_acordado != null && (() => {
        const isProductor = user?.rol === 'productor';
        const otroNombre = isProductor
          ? (neg.comprador?.nombre ?? 'Comprador')
          : (neg.productor?.nombre ?? 'Productor');
        const otroRol = isProductor ? 'comprador' : 'productor';
        const totalPropuesto = Number(neg.precio_acordado) * Number(neg.cantidad_solicitada);
        return (
          <div className="modal-overlay" onClick={cerrarModalPropuesta}>
            <div className="modal" onClick={e => e.stopPropagation()} ref={modalPropuestaRef}
              style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <h3> Propuesta de precio</h3>
                <button className="btn btn-ghost btn-sm" onClick={cerrarModalPropuesta} disabled={sending}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--gris-700)' }}>
                  El {otroRol} <strong>{otroNombre}</strong> propuso el siguiente precio:
                </p>
                <div style={{ background: 'var(--verde-50)', border: '1px solid var(--verde-200)', borderRadius: 'var(--radius)', padding: 'var(--sp-4)', textAlign: 'center', marginBottom: 'var(--sp-3)' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--gris-600)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                    Precio por {neg.unidad_medida}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--verde-800)', fontFamily: 'var(--font-display)' }}>
                    Q{Number(neg.precio_acordado).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '.875rem', color: 'var(--gris-600)', marginTop: 4 }}>
                    Total: <strong>Q{totalPropuesto.toLocaleString()}</strong>
                    {' '}({neg.cantidad_solicitada} {neg.unidad_medida})
                  </div>
                </div>
                <p style={{ fontSize: '.8125rem', color: 'var(--gris-500)', margin: 0 }}>
                  ¿Aceptas este precio o quieres proponer otro?
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={renegociarPropuesta} disabled={sending}>
                  Renegociar
                </button>
                <button className="btn btn-primary" onClick={aceptarPropuesta} disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sending ? 'Aceptando...' : 'Aceptar este precio'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal calificar */}
      {modalCalificar && (
        <div className="modal-overlay" onClick={cerrarModalCalificar}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalCalificarRef} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3> Calificar a {contraCalificar}</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalCalificar} disabled={sending}>✕</button>
            </div>
            {califOk ? (
              <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}><Star size={48} fill="var(--oro)" stroke="var(--oro)" /></div>
                <h3>¡Calificación enviada!</h3>
                <p className="text-muted">{califOk}</p>
              </div>
            ) : (
              <div className="modal-body">
                {califError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{califError}</div>}
                <p style={{ textAlign: 'center', color: 'var(--gris-700)', marginBottom: 'var(--sp-4)' }}>
                  ¿Cómo calificarías a <strong>{contraCalificar}</strong>?
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                      onClick={() => setPuntajeSeleccionado(n)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--sp-1)',
                        transition: 'transform .15s',
                        transform: puntajeSeleccionado >= n ? 'scale(1.15)' : 'scale(1)',
                      }}>
                      <Star size={32} fill={puntajeSeleccionado >= n ? 'var(--oro)' : 'none'}
                        stroke={puntajeSeleccionado >= n ? 'var(--oro)' : 'var(--gris-400)'} />
                    </button>
                  ))}
                </div>
                <p style={{ textAlign: 'center', fontSize: '.875rem', color: 'var(--gris-600)', marginBottom: 'var(--sp-4)' }}>
                  {puntajeSeleccionado === 0 ? 'Selecciona una puntuación' :
                   puntajeSeleccionado === 1 ? 'Muy mala experiencia' :
                   puntajeSeleccionado === 2 ? 'Mala experiencia' :
                   puntajeSeleccionado === 3 ? 'Experiencia regular' :
                   puntajeSeleccionado === 4 ? 'Buena experiencia' :
                   '¡Excelente experiencia!'}
                </p>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Comentario (opcional)</label>
                  <textarea className="form-textarea" rows={3} value={comentarioCalif}
                    onChange={e => setComentarioCalif(e.target.value)}
                    placeholder="Describe tu experiencia con esta contraparte..." />
                </div>
              </div>
            )}
            {!califOk && (
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={cerrarModalCalificar} disabled={sending}>Cancelar</button>
                <button className="btn btn-primary" onClick={enviarCalificacion} disabled={sending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {sending ? 'Enviando...' : 'Enviar calificación'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmBadge({ label, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
      {done
        ? <CheckCircle size={18} style={{ color: 'var(--verde-700)' }} />
        : <XCircle size={18} style={{ color: 'var(--gris-400)' }} />
      }
      <span style={{ fontSize: '.875rem', fontWeight: 500, color: done ? 'var(--verde-800)' : 'var(--gris-500)' }}>
        {label}
      </span>
    </div>
  );
}
