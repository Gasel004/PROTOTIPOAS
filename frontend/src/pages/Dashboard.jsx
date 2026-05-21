import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { PlusCircle, Store, Handshake, Truck, CreditCard, User,
         TrendingUp, Package, ShoppingCart, DollarSign, ArrowRight,
         Lightbulb, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const isProductor = user?.rol === 'productor';
  const isComprador = user?.rol === 'comprador';
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

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
      { id:1, titulo:'Maíz blanco 50 qq', estado:'Pendiente', contraparte:'Juan Pérez', fecha:'2025-05-08' },
      { id:2, titulo:'Frijol negro 20 qq', estado:'Aceptada', contraparte:'Comercial Sur', fecha:'2025-05-07' },
      { id:3, titulo:'Tomate cherry 10 cajas', estado:'En proceso', contraparte:'Mercado Central', fecha:'2025-05-06' },
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
      {/* Hero */}
      <div style={{
        background:'linear-gradient(135deg, var(--verde-900) 0%, var(--verde-700) 100%)',
        borderRadius:'var(--radius-xl)', padding:'var(--sp-8)',
        marginBottom:'var(--sp-8)', color:'var(--blanco)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute',top:-40,right:-40,width:200,height:200,background:'rgba(255,255,255,.05)',borderRadius:'50%' }} />
        <div style={{ position:'absolute',bottom:-60,right:80,width:140,height:140,background:'rgba(255,255,255,.04)',borderRadius:'50%' }} />
        <p style={{ fontSize:'.875rem', opacity:.75, marginBottom:'var(--sp-1)' }}>{saludo},</p>
        <h1 style={{ color:'var(--blanco)', marginBottom:'var(--sp-2)' }}>{user?.nombre ?? 'Bienvenido'}</h1>
        <p style={{ opacity:.75, maxWidth:500, fontSize:'.9375rem' }}>
          {isProductor
            ? 'Gestiona tus publicaciones, revisa negociaciones activas y mantén al día tus entregas.'
            : 'Explora las mejores ofertas agrícolas y negocia directamente con productores.'}
        </p>
        <div style={{ marginTop:'var(--sp-5)', display:'flex', gap:'var(--sp-3)', flexWrap:'wrap' }}>
          {isProductor
            ? <button className="btn btn-oro" onClick={() => navigate('/publicaciones/nueva')}
                style={{ display:'flex', alignItems:'center', gap:6 }}>
                <PlusCircle size={16}/> Nueva publicación
              </button>
            : <button className="btn btn-oro" onClick={() => navigate('/publicaciones')}
                style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Store size={16}/> Ver publicaciones
              </button>}
          <button className="btn" style={{ background:'rgba(255,255,255,.15)', color:'var(--blanco)', border:'1px solid rgba(255,255,255,.3)', display:'flex', alignItems:'center', gap:6 }}
            onClick={() => navigate('/negociaciones')}>
            <Handshake size={16}/> Negociaciones
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:'var(--sp-8)' }}>
        {isProductor ? <>
          <StatCard icon={<Package size={22}/>} label="Publicaciones activas" value={stats?.publicaciones ?? 0} color="verde" />
          <StatCard icon={<Handshake size={22}/>} label="Negociaciones activas" value={stats?.negociaciones_activas ?? 0} color="oro" />
          <StatCard icon={<Truck size={22}/>} label="Entregas pendientes" value={stats?.entregas_pendientes ?? 0} color="tierra" />
          <StatCard icon={<TrendingUp size={22}/>} label="Ingresos este mes" value={`Q${(stats?.ingresos_mes??0).toLocaleString()}`} color="azul" delta="+12%" up />
        </> : <>
          <StatCard icon={<Store size={22}/>} label="Publicaciones vistas" value={stats?.publicaciones_vistas ?? 0} color="verde" />
          <StatCard icon={<Handshake size={22}/>} label="Negociaciones activas" value={stats?.negociaciones_activas ?? 0} color="oro" />
          <StatCard icon={<Truck size={22}/>} label="Entregas pendientes" value={stats?.entregas_pendientes ?? 0} color="tierra" />
          <StatCard icon={<DollarSign size={22}/>} label="Gasto este mes" value={`Q${(stats?.gasto_mes??0).toLocaleString()}`} color="azul" />
        </>}
      </div>

      {/* Panel inferior */}
      <div className="grid-2">
        {/* Negociaciones recientes */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Negociaciones recientes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/negociaciones')}
              style={{ display:'flex', alignItems:'center', gap:4 }}>
              Ver todas <ArrowRight size={14}/>
            </button>
          </div>
          {recientes.length === 0
            ? <div className="empty-state"><p>Sin negociaciones aún</p></div>
            : recientes.map(n => (
              <div key={n.id} onClick={() => navigate(`/negociaciones/${n.id}`)}
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'var(--sp-4) var(--sp-6)', borderBottom:'1px solid var(--gris-100)', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--gris-50)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'.9rem', marginBottom:3 }}>{n.titulo}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)', display:'flex', alignItems:'center', gap:4 }}>
                    <User size={12}/> {n.contraparte} · {n.fecha}
                  </div>
                </div>
                <span className={`badge ${estadoBadge(n.estado)}`}>{n.estado}</span>
              </div>
            ))}
        </div>

        {/* Accesos rápidos */}
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
          <div className="card">
            <div className="card-header"><h3>Accesos rápidos</h3></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                {isProductor && <QuickBtn icon={<PlusCircle size={15}/>} label="Publicar" onClick={()=>navigate('/publicaciones/nueva')} primary />}
                {isComprador && <QuickBtn icon={<Store size={15}/>} label="Explorar" onClick={()=>navigate('/publicaciones')} primary />}
                <QuickBtn icon={<Handshake size={15}/>} label="Negociaciones" onClick={()=>navigate('/negociaciones')} />
                <QuickBtn icon={<Truck size={15}/>} label="Entregas" onClick={()=>navigate('/entregas')} />
                <QuickBtn icon={<CreditCard size={15}/>} label="Pagos" onClick={()=>navigate('/pagos')} />
                <QuickBtn icon={<User size={15}/>} label="Perfil" onClick={()=>navigate('/perfil')} />
              </div>
            </div>
          </div>

          <div className="card" style={{ background:'linear-gradient(135deg, var(--verde-50), var(--oro-50))', border:'1px solid var(--verde-100)' }}>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', marginBottom:'var(--sp-2)' }}>
                <Lightbulb size={20} style={{ color:'var(--oro-600)' }}/>
                <h4 style={{ margin:0, color:'var(--verde-900)' }}>Tip del día</h4>
              </div>
              <p style={{ fontSize:'.875rem', color:'var(--verde-800)', lineHeight:1.6, margin:0 }}>
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
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {delta && <div className={`stat-delta ${up ? 'up' : 'down'}`}>{up ? '↑' : '↓'} {delta}</div>}
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick, primary }) {
  return (
    <button className={`btn ${primary ? 'btn-secondary' : 'btn-ghost'} btn-full`}
      onClick={onClick} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
      {icon} {label}
    </button>
  );
}
