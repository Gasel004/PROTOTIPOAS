import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

const MOCK_NEG = {
  id:1, titulo:'Maíz blanco 50 qq', estado:'aceptada', precio_acordado:120,
  cantidad_solicitada:50, unidad_medida:'quintal', condiciones:'Pago al contado, recojo en finca',
  fecha_entrega_acordada:'2025-05-20', created_at:'2025-05-08',
  publicacion:{ id:1, titulo:'Maíz blanco primera calidad', departamento:'Chiquimula' },
  productor:{ id:5, nombre:'Juan Pérez', email:'juan@finca.com' },
  comprador:{ id:3, nombre:'Comercial Sur S.A.', email:'compras@comercialsur.com' },
};
const MOCK_MSGS = [
  { id:1, remitente_id:3, remitente:'Comercial Sur S.A.', contenido:'Hola, ¿puede entregar el lunes 20 de mayo?', created_at:'2025-05-08 09:12', leido:true },
  { id:2, remitente_id:5, remitente:'Juan Pérez',         contenido:'Sí, sin problema. ¿A qué hora?', created_at:'2025-05-08 10:30', leido:true },
  { id:3, remitente_id:3, remitente:'Comercial Sur S.A.', contenido:'Perfectamente desde las 7am. Llevaremos camión propio.', created_at:'2025-05-08 11:05', leido:true },
  { id:4, remitente_id:5, remitente:'Juan Pérez',         contenido:'De acuerdo. El maíz estará listo y ensacado. Nos vemos.', created_at:'2025-05-08 11:20', leido:false },
];

const ESTADO_SIGUIENTES = {
  pendiente:  [{ estado:'aceptada', label:'✅ Aceptar',  cls:'btn-primary' }, { estado:'rechazada', label:'❌ Rechazar', cls:'btn-danger' }],
  en_proceso: [{ estado:'aceptada', label:'✅ Confirmar acuerdo', cls:'btn-primary' }],
  aceptada:   [],
  rechazada:  [],
  completada: [],
  cancelada:  [],
};

export default function DetalleNegociacion() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuthStore();
  const chatRef       = useRef(null);

  const [neg,       setNeg]       = useState(null);
  const [msgs,      setMsgs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [texto,     setTexto]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [modalAcept,setModalAcept]= useState(false);
  const [precioForm,setPrecioForm]= useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/negociaciones/${id}`).catch(() => ({ data: { data: MOCK_NEG } })),
      api.get(`/negociaciones/${id}/mensajes`).catch(() => ({ data: { data: MOCK_MSGS } })),
    ]).then(([nRes, mRes]) => {
      setNeg(nRes.data?.data ?? MOCK_NEG);
      setMsgs(mRes.data?.data ?? MOCK_MSGS);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs]);

  async function enviarMensaje() {
    if (!texto.trim()) return;
    setSending(true);
    const optimista = { id: Date.now(), remitente_id: user?.id, remitente: user?.nombre, contenido: texto, created_at: 'Ahora', leido: false };
    setMsgs(prev => [...prev, optimista]);
    setTexto('');
    try {
      const res = await api.post(`/negociaciones/${id}/mensajes`, { contenido: texto });
      setMsgs(prev => prev.map(m => m.id === optimista.id ? (res.data?.data ?? m) : m));
    } catch { setMsgs(prev => prev.filter(m => m.id !== optimista.id)); }
    finally { setSending(false); }
  }

  async function cambiarEstado(nuevoEstado, extras = {}) {
    try {
      await api.patch(`/negociaciones/${id}/estado`, { estado: nuevoEstado, ...extras });
      setNeg(prev => ({ ...prev, estado: nuevoEstado, ...extras }));
      setModalAcept(false);
    } catch (err) { alert(err.response?.data?.message ?? 'Error'); }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (!neg)    return <div className="empty-state"><h3>Negociación no encontrada</h3></div>;

  const isProductor = user?.rol === 'productor';
  const miId        = user?.id;
  const acciones    = ESTADO_SIGUIENTES[neg.estado] ?? [];
  const total       = neg.precio_acordado ? neg.precio_acordado * neg.cantidad_solicitada : null;

  const ESTADO_CFG = {
    pendiente:'badge-oro', en_proceso:'badge-azul', aceptada:'badge-verde',
    rechazada:'badge-rojo', completada:'badge-verde', cancelada:'badge-gris',
  };

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom:'var(--sp-4)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/negociaciones')}>← Volver a negociaciones</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'var(--sp-6)', alignItems:'start' }}>

        {/* ── Chat principal ─────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
          {/* Header */}
          <div className="card">
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'var(--sp-4)' }}>
                <div>
                  <h2 style={{ marginBottom:'var(--sp-1)' }}>{neg.titulo}</h2>
                  <div style={{ display:'flex', gap:'var(--sp-4)', fontSize:'.875rem', color:'var(--gris-500)', flexWrap:'wrap' }}>
                    <span>📋 {neg.publicacion?.titulo}</span>
                    <span>📅 {neg.created_at}</span>
                  </div>
                </div>
                <span className={`badge ${ESTADO_CFG[neg.estado] ?? 'badge-gris'}`} style={{ fontSize:'.875rem' }}>
                  {neg.estado}
                </span>
              </div>

              {/* Steps de progreso */}
              <div className="steps">
                {['pendiente','en_proceso','aceptada','completada'].map((e, i) => {
                  const estados = ['pendiente','en_proceso','aceptada','completada'];
                  const curIdx  = estados.indexOf(neg.estado);
                  const isDone  = i < curIdx;
                  const isActive= e === neg.estado;
                  return (
                    <div key={e} className={`step-item${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                      <div className="step-circle">{isDone ? '✓' : i+1}</div>
                      <div className="step-label">{{pendiente:'Solicitud',en_proceso:'En proceso',aceptada:'Aceptada',completada:'Completada'}[e]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="card">
            <div className="card-header">
              <h4>💬 Mensajes privados</h4>
            </div>
            <div className="chat-wrap" style={{ border:'none', borderRadius:0, height:400 }}>
              <div className="chat-messages" ref={chatRef}>
                {msgs.length === 0
                  ? <div style={{ textAlign:'center', color:'var(--gris-500)', padding:'var(--sp-8)' }}>
                      Sin mensajes aún. Inicia la conversación.
                    </div>
                  : msgs.map(m => {
                      const isMine = m.remitente_id === miId;
                      return (
                        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                          {!isMine && <div style={{ fontSize:'.75rem', color:'var(--gris-500)', marginBottom:4, paddingLeft:'var(--sp-2)' }}>{m.remitente}</div>}
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
                  {sending ? '⏳' : '➤'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Panel lateral ──────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>

          {/* Resumen */}
          <div className="card">
            <div className="card-header"><h4>📊 Resumen</h4></div>
            <div className="card-body">
              {[
                ['Cantidad', `${neg.cantidad_solicitada} ${neg.unidad_medida}`],
                ['Precio acordado', neg.precio_acordado ? `Q${neg.precio_acordado}/${neg.unidad_medida}` : 'Sin acordar'],
                ['Total estimado', total ? `Q${total.toLocaleString()}` : '—'],
                ['Entrega', neg.fecha_entrega_acordada ?? 'Sin definir'],
                ['Condiciones', neg.condiciones ?? 'Sin condiciones'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ marginBottom:'var(--sp-4)' }}>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)', marginBottom:3 }}>{lbl}</div>
                  <div style={{ fontWeight:600, fontSize:'.9375rem' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Participantes */}
          <div className="card">
            <div className="card-header"><h4>👥 Participantes</h4></div>
            <div className="card-body">
              {[
                ['🌾 Productor', neg.productor?.nombre, neg.productor?.email],
                ['🧑‍💼 Comprador', neg.comprador?.nombre, neg.comprador?.email],
              ].map(([rol,nombre,email]) => (
                <div key={rol} style={{ marginBottom:'var(--sp-4)' }}>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)', marginBottom:4 }}>{rol}</div>
                  <div style={{ fontWeight:600 }}>{nombre}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)' }}>{email}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          {acciones.length > 0 && (
            <div className="card">
              <div className="card-header"><h4>⚡ Acciones</h4></div>
              <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
                {acciones.map(acc => (
                  <button key={acc.estado}
                    className={`btn ${acc.cls} btn-full`}
                    onClick={() => acc.estado === 'aceptada' ? setModalAcept(true) : cambiarEstado(acc.estado)}>
                    {acc.label}
                  </button>
                ))}
                {neg.estado !== 'cancelada' && neg.estado !== 'completada' && neg.estado !== 'rechazada' && (
                  <button className="btn btn-ghost btn-full" style={{ color:'var(--gris-500)' }}
                    onClick={() => cambiarEstado('cancelada')}>
                    🚫 Cancelar negociación
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Entrega */}
          {neg.estado === 'aceptada' && (
            <button className="btn btn-oro btn-full" onClick={() => navigate(`/entregas`)}>
              📦 Gestionar entrega
            </button>
          )}
        </div>
      </div>

      {/* Modal aceptar */}
      {modalAcept && (
        <div className="modal-overlay" onClick={() => setModalAcept(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✅ Aceptar negociación</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalAcept(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Precio acordado (Q/{neg.unidad_medida}) <span style={{ color:'var(--rojo)' }}>*</span></label>
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
              <button className="btn btn-ghost" onClick={() => setModalAcept(false)}>Cancelar</button>
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
