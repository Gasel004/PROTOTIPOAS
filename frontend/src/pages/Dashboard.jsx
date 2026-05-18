import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate  = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [recientes,setRecientes]= useState([]);
  const [loading,  setLoading]  = useState(true);

  const isProductor = user?.rol === 'productor';
  const isComprador = user?.rol === 'comprador';
  const hora    = new Date().getHours();
  const saludo  = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    async function load() {
      try {
        const [sRes, nRes] = await Promise.all([
          api.get('/dashboard/stats').catch(() => ({ data: mockStats(user?.rol) })),
          api.get('/negociaciones?limit=5').catch(() => ({ data: { data: mockNeg() } })),
        ]);
        setStats(sRes.data);
        setRecientes(nRes.data?.data ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  function mockStats(rol) {
    if (rol === 'productor') return { publicaciones:8, negociaciones_activas:3, entregas_pendientes:2, ingresos_mes:12450 };
    return { publicaciones_vistas:45, negociaciones_activas:5, entregas_pendientes:1, gasto_mes:8900 };
  }
  function mockNeg() {
    return [
      { id:1, titulo:'Maíz blanco 50 qq',       estado:'pendiente',  contraparte:'Juan Pérez',       fecha:'2025-05-08' },
      { id:2, titulo:'Frijol negro 20 qq',       estado:'aceptada',   contraparte:'Comercial Sur',    fecha:'2025-05-07' },
      { id:3, titulo:'Tomate cherry 10 cajas',   estado:'en_proceso', contraparte:'Mercado Central',  fecha:'2025-05-06' },
    ];
  }

  const estadoBadge = e => {
    const m = { pendiente:'badge-oro', aceptada:'badge-verde', rechazada:'badge-rojo',
                en_proceso:'badge-azul', completada:'badge-verde', cancelada:'badge-gris' };
    return m[e] ?? 'badge-gris';
  };

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up">

      {/* Hero bienvenida */}
      <div style={{
        background:'linear-gradient(135deg, var(--verde-900) 0%, var(--verde-700) 100%)',
        borderRadius:'var(--radius-xl)', padding:'var(--sp-8)',
        marginBottom:'var(--sp-8)', color:'var(--blanco)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute',top:-40,right:-40,width:200,height:200,background:'rgba(255,255,255,.05)',borderRadius:'50%' }} />
        <div style={{ position:'absolute',bottom:-60,right:80,width:140,height:140,background:'rgba(255,255,255,.04)',borderRadius:'50%' }} />
        <p style={{ fontSize:'.875rem', opacity:.75, marginBottom:'var(--sp-1)' }}>{saludo},</p>
        <h1 style={{ color:'var(--blanco)', marginBottom:'var(--sp-2)' }}>{user?.nombre ?? 'Bienvenido'} 👋</h1>
        <p style={{ opacity:.75, maxWidth:500, fontSize:'.9375rem' }}>
          {isProductor
            ? 'Gestiona tus publicaciones, revisa negociaciones activas y mantén al día tus entregas.'
            : 'Explora las mejores ofertas agrícolas y negocia directamente con productores.'}
        </p>
        <div style={{ marginTop:'var(--sp-5)', display:'flex', gap:'var(--sp-3)', flexWrap:'wrap' }}>
          {isProductor
            ? <button className="btn btn-oro" onClick={() => navigate('/publicaciones/nueva')}>➕ Nueva publicación</button>
            : <button className="btn btn-oro" onClick={() => navigate('/publicaciones')}>🌾 Ver publicaciones</button>}
          <button className="btn" style={{ background:'rgba(255,255,255,.15)', color:'var(--blanco)', border:'1px solid rgba(255,255,255,.3)' }}
            onClick={() => navigate('/negociaciones')}>🤝 Negociaciones</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:'var(--sp-8)' }}>
        {isProductor ? <>
          <StatCard icon="📋" label="Publicaciones activas" value={stats?.publicaciones ?? 0} color="verde" />
          <StatCard icon="🤝" label="Negociaciones activas" value={stats?.negociaciones_activas ?? 0} color="oro" />
          <StatCard icon="📦" label="Entregas pendientes"   value={stats?.entregas_pendientes ?? 0} color="tierra" />
          <StatCard icon="💰" label="Ingresos este mes"     value={`Q${(stats?.ingresos_mes??0).toLocaleString()}`} color="azul" delta="+12%" up />
        </> : <>
          <StatCard icon="👁"  label="Publicaciones vistas"  value={stats?.publicaciones_vistas ?? 0} color="verde" />
          <StatCard icon="🤝" label="Negociaciones activas"  value={stats?.negociaciones_activas ?? 0} color="oro" />
          <StatCard icon="📦" label="Entregas pendientes"    value={stats?.entregas_pendientes ?? 0} color="tierra" />
          <StatCard icon="💳" label="Gasto este mes"         value={`Q${(stats?.gasto_mes??0).toLocaleString()}`} color="azul" />
        </>}
      </div>

      {/* Panel inferior */}
      <div className="grid-2">

        {/* Negociaciones recientes */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Negociaciones recientes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/negociaciones')}>Ver todas →</button>
          </div>
          {recientes.length === 0
            ? <div className="empty-state"><p>Sin negociaciones aún</p></div>
            : recientes.map(n => (
              <div key={n.id}
                onClick={() => navigate(`/negociaciones/${n.id}`)}
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'var(--sp-4) var(--sp-6)', borderBottom:'1px solid var(--gris-100)',
                  cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--gris-50)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}
              >
                <div>
                  <div style={{ fontWeight:600, fontSize:'.9rem', marginBottom:3 }}>{n.titulo}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)' }}>
                    🧑‍💼 {n.contraparte} · {n.fecha}
                  </div>
                </div>
                <span className={`badge ${estadoBadge(n.estado)}`}>{n.estado}</span>
              </div>
            ))}
        </div>

        {/* Accesos rápidos + tip */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
          <div className="card">
            <div className="card-header"><h3>Accesos rápidos</h3></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                {isProductor && <button className="btn btn-secondary btn-full" onClick={()=>navigate('/publicaciones/nueva')}>➕ Publicar</button>}
                {isComprador && <button className="btn btn-secondary btn-full" onClick={()=>navigate('/publicaciones')}>🌾 Explorar</button>}
                <button className="btn btn-ghost btn-full" onClick={()=>navigate('/negociaciones')}>🤝 Negociaciones</button>
                <button className="btn btn-ghost btn-full" onClick={()=>navigate('/entregas')}>📦 Entregas</button>
                <button className="btn btn-ghost btn-full" onClick={()=>navigate('/pagos')}>💳 Pagos</button>
                <button className="btn btn-ghost btn-full" onClick={()=>navigate('/perfil')}>👤 Perfil</button>
              </div>
            </div>
          </div>
          <div className="card" style={{ background:'linear-gradient(135deg, var(--verde-50), var(--oro-50))', border:'1px solid var(--verde-100)' }}>
            <div className="card-body">
              <div style={{ fontSize:'2rem', marginBottom:'var(--sp-2)' }}>🌱</div>
              <h4 style={{ marginBottom:'var(--sp-2)', color:'var(--verde-900)' }}>Tip del día</h4>
              <p style={{ fontSize:'.875rem', color:'var(--verde-800)', lineHeight:1.6 }}>
                {isProductor
                  ? 'Las publicaciones con foto tienen 3× más consultas. ¡Agrega una imagen a tu próxima oferta!'
                  : 'Responde rápido a los mensajes del productor para cerrar la negociación antes.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, delta, up }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}><span>{icon}</span></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {delta && <div className={`stat-delta ${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'} {delta}</div>}
      </div>
    </div>
  );
}
