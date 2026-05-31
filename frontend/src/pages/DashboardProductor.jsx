import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { StatCard, QuickBtn } from '../components/DashboardUI';
import {
  PlusCircle, Store, Handshake, Truck, CreditCard, User,
  TrendingUp, Package, ArrowRight, Lightbulb, Leaf
} from 'lucide-react';

export default function DashboardProductor() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    async function load() {
      try {
        const [sRes, nRes] = await Promise.all([
          api.get('/dashboard/stats').catch(() => ({ data: { publicaciones:8, negociaciones_activas:3, entregas_pendientes:2, ingresos_mes:12450 } })),
          api.get('/publicaciones/mis-publicaciones?limit=3').catch(() => ({ data: { data: [
            { id:1, titulo:'Maíz blanco primera calidad', producto:{ nombre:'Maíz' }, precio_unitario:120, unidad_medida:'quintal', cantidad_disponible:80, estado:'activa' },
            { id:2, titulo:'Frijol negro seleccionado', producto:{ nombre:'Frijol' }, precio_unitario:280, unidad_medida:'quintal', cantidad_disponible:40, estado:'activa' },
            { id:3, titulo:'Tomate manzano fresco', producto:{ nombre:'Tomate' }, precio_unitario:85, unidad_medida:'caja', cantidad_disponible:120, estado:'pausada' },
          ] } })),
        ]);
        setStats(sRes.data);
        setRecientes(nRes.data?.data ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="animate-fade-in" style={{ display:'grid', gap:'var(--sp-5)' }}>
      <div className="skeleton" style={{ height:200, borderRadius:'var(--radius-xl)' }} />
      <div className="grid-4">
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:100, borderRadius:'var(--radius)' }} />)}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-productor-page">
      <div className="dashboard-hero dashboard-hero-productor">
        <div className="dashboard-hero-copy">
          <p>{saludo},</p>
          <h1>{user?.nombre ?? 'Productor'}</h1>
          <span>
            Tu cosecha, tu control. Precios, entregas y conversaciones en un solo lugar.
          </span>
          <div>
            <button className="btn btn-oro" onClick={() => navigate('/publicaciones/nueva')}>
              <PlusCircle size={16}/> Nueva publicación
            </button>
            <button className="btn dashboard-hero-secondary" onClick={() => navigate('/negociaciones')}>
              <Handshake size={16}/> Negociaciones
            </button>
          </div>
        </div>
        <button type="button" className="dashboard-field-card dashboard-field-action" onClick={() => navigate('/mis-publicaciones')}>
          <span>Cosecha activa</span>
          <strong>Listo para negociar</strong>
          <small style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
            <span><Leaf size={12} style={{ marginRight:4 }}/> {stats?.publicaciones ?? 0} publicaciones</span>
            <span><Handshake size={12} style={{ marginRight:4 }}/> {stats?.negociaciones_activas ?? 0} negociaciones</span>
            <span><Truck size={12} style={{ marginRight:4 }}/> {stats?.entregas_pendientes ?? 0} entregas pendientes</span>
          </small>
        </button>
      </div>

      <div className="dashboard-kpi-grid">
        <StatCard icon={<Package size={22}/>} label="Publicaciones activas" value={stats?.publicaciones ?? 0} color="verde" onClick={() => navigate('/mis-publicaciones')} />
        <StatCard icon={<Handshake size={22}/>} label="Negociaciones activas" value={stats?.negociaciones_activas ?? 0} color="oro" onClick={() => navigate('/negociaciones')} />
        <StatCard icon={<Truck size={22}/>} label="Entregas pendientes" value={stats?.entregas_pendientes ?? 0} color="tierra" onClick={() => navigate('/entregas')} />
        <StatCard icon={<TrendingUp size={22}/>} label="Ingresos este mes" value={`Q${(stats?.ingresos_mes??0).toLocaleString()}`} color="cielo" delta="+12%" up onClick={() => navigate('/pagos')} />
      </div>

      <div className="dashboard-producer-workbench">
        <div className="card card-tint-verde card-accent-left">
          <div className="card-header flex items-center justify-between">
            <h3>Tus publicaciones recientes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/mis-publicaciones')}
              style={{ display:'flex', alignItems:'center', gap:4 }}>
              Ver todas <ArrowRight size={14}/>
            </button>
          </div>
          {recientes.length === 0
            ? <div className="empty-state"><p>Aún no tienes publicaciones</p></div>
            : recientes.map(p => (
              <div key={p.id} onClick={() => navigate(`/publicaciones/${p.id}`)}
                style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                  padding:'var(--sp-4) var(--sp-6)', borderBottom:'1px solid var(--verde-100)', cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.background='var(--verde-50)'}
                onMouseLeave={e=>e.currentTarget.style.background=''}>
                <div>
                  <div style={{ fontWeight:600, fontSize:'.9rem', marginBottom:3 }}>{p.titulo}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gris-500)' }}>
                    Q{p.precio_unitario ?? p.precio} /{p.unidad_medida} · {p.cantidad_disponible} disp.
                  </div>
                </div>
                <span className={`badge ${p.estado === 'activa' ? 'badge-verde' : p.estado === 'pausada' ? 'badge-oro' : 'badge-gris'}`}>
                  {p.estado}
                </span>
              </div>
            ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
          <div className="card card-tint-oro dashboard-action-panel">
            <div className="card-header"><h3>Accesos rápidos</h3></div>
            <div className="card-body">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)' }}>
                <QuickBtn icon={<PlusCircle size={15}/>} label="Publicar" onClick={()=>navigate('/publicaciones/nueva')} primary />
                <QuickBtn icon={<Handshake size={15}/>} label="Negociaciones" onClick={()=>navigate('/negociaciones')} />
                <QuickBtn icon={<Truck size={15}/>} label="Entregas" onClick={()=>navigate('/entregas')} />
                <QuickBtn icon={<CreditCard size={15}/>} label="Pagos" onClick={()=>navigate('/pagos')} />
                <QuickBtn icon={<User size={15}/>} label="Perfil" onClick={()=>navigate('/perfil')} />
              </div>
            </div>
          </div>

          <div className="card card-tint-glass" style={{ borderLeft:'4px solid var(--oro-500)' }}>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', marginBottom:'var(--sp-2)' }}>
                <Lightbulb size={20} style={{ color:'var(--oro-600)' }}/>
                <h4 style={{ margin:0, color:'var(--verde-900)' }}>Tip del día</h4>
              </div>
              <p style={{ fontSize:'.875rem', color:'var(--verde-800)', lineHeight:1.6, margin:0 }}>
                Las publicaciones con foto tienen 3× más consultas. ¡Agrega una imagen a tu próxima oferta!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
