import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { Handshake, Store, MessageCircle, Clock, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';

const MOCK = [
  { id:1, titulo:'Maíz blanco 50 qq', contraparte:'Comercial Sur S.A.', cantidad_solicitada:50, precio_acordado:120, estado:'aceptada', created_at:'2025-05-08', mensajes_nuevos:2, unidad_medida:'quintal' },
  { id:2, titulo:'Frijol negro 20 qq', contraparte:'Juan García', cantidad_solicitada:20, precio_acordado:280, estado:'pendiente', created_at:'2025-05-07', mensajes_nuevos:0, unidad_medida:'quintal' },
  { id:3, titulo:'Tomate cherry 10 cajas', contraparte:'Mercado Central', cantidad_solicitada:10, precio_acordado:90, estado:'completada', created_at:'2025-05-01', mensajes_nuevos:0, unidad_medida:'caja' },
  { id:4, titulo:'Papa blanca 30 qq', contraparte:'Distribuidora Norte', cantidad_solicitada:30, precio_acordado:null, estado:'rechazada', created_at:'2025-04-28', mensajes_nuevos:0, unidad_medida:'quintal' },
  { id:5, titulo:'Aguacate Hass 15 cajas', contraparte:'ExportFresh', cantidad_solicitada:15, precio_acordado:350, estado:'en_proceso', created_at:'2025-05-05', mensajes_nuevos:1, unidad_medida:'caja' },
];

const ESTADOS = ['Todos','pendiente','en_proceso','aceptada','rechazada','completada','cancelada'];
const ESTADO_CONFIG = {
  pendiente:  { badge:'badge-oro',   label:'Pendiente',  icon:<Clock size={14}/> },
  en_proceso: { badge:'badge-azul',  label:'En proceso', icon:<Handshake size={14}/> },
  aceptada:   { badge:'badge-verde', label:'Aceptada',   icon:<CheckCircle size={14}/> },
  rechazada:  { badge:'badge-rojo',  label:'Rechazada',  icon:<XCircle size={14}/> },
  completada: { badge:'badge-verde', label:'Completada', icon:<CheckCircle size={14}/> },
  cancelada:  { badge:'badge-gris',  label:'Cancelada',  icon:<XCircle size={14}/> },
};

function normalizeNeg(n, user) {
  const isProductor = user?.rol === 'productor';
  const contraparte = isProductor
    ? n.comprador?.usuario?.nombre
    : n.productor?.usuario?.nombre;
  return {
    ...n,
    titulo: n.publicacion?.titulo ?? n.titulo ?? 'Negociación',
    contraparte: contraparte ?? n.contraparte ?? 'Contraparte',
    cantidad_solicitada: Number(n.cantidad_solicitada ?? 0),
    precio_acordado: n.precio_acordado == null ? null : Number(n.precio_acordado),
    unidad_medida: n.publicacion?.unidad_medida ?? n.unidad_medida ?? 'unidad',
    mensajes_nuevos: Number(n.mensajes_nuevos ?? 0),
    created_at: n.created_at ? String(n.created_at).slice(0, 10) : '',
  };
}

export default function Negociaciones() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isProductor = user?.rol === 'productor';
  const [negs, setNegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');

  useEffect(() => {
    api.get('/negociaciones')
      .then(r => setNegs((r.data?.data ?? []).map(n => normalizeNeg(n, user))))
      .catch(() => setNegs(MOCK.map(n => normalizeNeg(n, user))))
      .finally(() => setLoading(false));
  }, []);

  const filtradas = filtro === 'Todos' ? negs : negs.filter(n => n.estado === filtro);
  const conteos = ESTADOS.reduce((acc, e) => {
    acc[e] = e === 'Todos' ? negs.length : negs.filter(n => n.estado === e).length;
    return acc;
  }, {});

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Negociaciones</h1>
          <p className="text-muted">{negs.length} negociación{negs.length !== 1 ? 'es' : ''} en total</p>
        </div>
        {!isProductor && (
          <button className="btn btn-primary" onClick={() => navigate('/publicaciones')}
            style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Store size={16}/> Explorar publicaciones
          </button>
        )}
      </div>

      <div style={{ display:'flex', gap:'var(--sp-2)', marginBottom:'var(--sp-6)', flexWrap:'wrap' }}>
        {ESTADOS.map(e => (
          <button key={e} className={filtro === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setFiltro(e)}>
            {e === 'Todos' ? 'Todas' : ESTADO_CONFIG[e]?.label ?? e}
            {conteos[e] > 0 && (
              <span style={{
                background: filtro === e ? 'rgba(255,255,255,.3)' : 'var(--verde-50)',
                color: filtro === e ? 'var(--blanco)' : 'var(--verde-800)',
                borderRadius:'var(--radius-full)', padding:'1px 7px', marginLeft:'var(--sp-2)',
                fontSize:'.75rem', fontWeight:700,
              }}>{conteos[e]}</span>
            )}
          </button>
        ))}
      </div>

      {filtradas.length === 0
        ? <div className="empty-state" style={{ padding:'var(--sp-16)' }}>
            <Handshake size={48} style={{ color:'var(--gris-300)', marginBottom:'var(--sp-4)' }}/>
            <h3>Sin negociaciones {filtro !== 'Todos' ? `"${filtro}"` : ''}</h3>
            {!isProductor && filtro === 'Todos' && <>
              <p style={{ marginBottom:'var(--sp-5)' }}>Explora publicaciones de productores y comienza a negociar</p>
              <button className="btn btn-primary" onClick={() => navigate('/publicaciones')}>Ver publicaciones</button>
            </>}
          </div>
        : <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-3)' }}>
            {filtradas.map(neg => {
              const cfg = ESTADO_CONFIG[neg.estado] ?? { badge:'badge-gris', label:neg.estado, icon:null };
              const total = neg.precio_acordado ? neg.precio_acordado * neg.cantidad_solicitada : null;
              return (
                <div key={neg.id} className={`card card-hover ${isProductor ? 'card-tint-verde' : 'card-tint-cielo'}`} style={{ cursor:'pointer' }}
                  onClick={() => navigate(`/negociaciones/${neg.id}`)}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center',
                    gap:'var(--sp-5)', padding:'var(--sp-5) var(--sp-6)' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', marginBottom:'var(--sp-2)' }}>
                        {cfg.icon}
                        <h4 style={{ margin:0 }}>{neg.titulo}</h4>
                        {neg.mensajes_nuevos > 0 && (
                          <span style={{ background:'var(--rojo)', color:'var(--blanco)',
                            borderRadius:'var(--radius-full)', padding:'2px 8px',
                            fontSize:'.75rem', fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                            <MessageCircle size={11}/> {neg.mensajes_nuevos}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:'var(--sp-5)', fontSize:'.875rem', color:'var(--gris-500)', alignItems:'center' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:3 }}><User size={12}/> {neg.contraparte}</span>
                        <span>{neg.cantidad_solicitada} {neg.unidad_medida}</span>
                        <span>{neg.created_at}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {neg.precio_acordado
                        ? <>
                            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', fontWeight:700, color:'var(--verde-800)' }}>
                              Q{neg.precio_acordado}/{neg.unidad_medida}
                            </div>
                            {total && <div style={{ fontSize:'.8rem', color:'var(--gris-500)' }}>Total: Q{total.toLocaleString()}</div>}
                          </>
                        : <div style={{ fontSize:'.875rem', color:'var(--gris-400)', fontStyle:'italic' }}>Sin precio aún</div>
                      }
                    </div>
                    <span className={`badge ${cfg.badge}`} style={{ whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <ChevronRight size={18} style={{ color:'var(--gris-400)' }}/>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
