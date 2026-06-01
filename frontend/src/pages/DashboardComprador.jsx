import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { StatCard, QuickBtn } from '../components/DashboardUI';
import {
  Store, Handshake, Truck, DollarSign, CreditCard, User,
  ShoppingCart, ArrowRight, Lightbulb, MapPin, Star
} from 'lucide-react';

export default function DashboardComprador() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [destacadas, setDestacadas] = useState([]);
  const [loading, setLoading] = useState(true);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      try {
        const [sRes, pRes] = await Promise.all([
          api.get('/dashboard/stats', { signal: ac.signal }).catch(() => null),
          api.get('/publicaciones?limit=3', { signal: ac.signal }).catch(() => null),
        ]);
        if (!ac.signal.aborted) {
          setStats(sRes?.data ?? null);
          setDestacadas(pRes?.data?.data ?? []);
        }
      } finally { if (!ac.signal.aborted) setLoading(false); }
    }
    load();
    return () => ac.abort();
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
    <div className="animate-fade-in-up dashboard-page dashboard-comprador-page">
      <div className="dashboard-hero dashboard-hero-comprador">
        <div className="dashboard-hero-copy">
          <p>{saludo},</p>
          <h1>{user?.nombre ?? 'Comprador'}</h1>
          <span>
            Encuentra los mejores productos del campo directamente del productor.
          </span>
          <div>
            <button className="btn btn-oro" onClick={() => navigate('/publicaciones')}>
              <Store size={16}/> Explorar publicaciones
            </button>
            <button className="btn dashboard-hero-secondary" onClick={() => navigate('/negociaciones')}>
              <Handshake size={16}/> Negociaciones
            </button>
          </div>
        </div>
        <button type="button" className="dashboard-field-card dashboard-field-action" onClick={() => navigate('/publicaciones')}>
          <span>Mercado abierto</span>
          <strong>Oportunidades frescas</strong>
          <small style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
            <span><Store size={12} style={{ marginRight:4 }}/> {stats?.publicaciones_vistas ?? 0} publicaciones</span>
            <span><Handshake size={12} style={{ marginRight:4 }}/> {stats?.negociaciones_activas ?? 0} negociaciones activas</span>
            <span><DollarSign size={12} style={{ marginRight:4 }}/> Q{(stats?.gasto_mes ?? 0).toLocaleString()} este mes</span>
          </small>
        </button>
      </div>

      <div className="dashboard-kpi-grid">
        <StatCard icon={<Store size={22}/>} label="Publicaciones disponibles" value={stats?.publicaciones_vistas ?? 0} color="cielo" onClick={() => navigate('/publicaciones')} />
        <StatCard icon={<Handshake size={22}/>} label="Negociaciones activas" value={stats?.negociaciones_activas ?? 0} color="oro" onClick={() => navigate('/negociaciones')} />
        <StatCard icon={<Truck size={22}/>} label="Entregas pendientes" value={stats?.entregas_pendientes ?? 0} color="tierra" onClick={() => navigate('/entregas')} />
        <StatCard icon={<DollarSign size={22}/>} label="Gasto este mes" value={`Q${(stats?.gasto_mes??0).toLocaleString()}`} color="verde" onClick={() => navigate('/pagos')} />
      </div>

      <div className="dashboard-buyer-market">
        <div className="card card-tint-glass dashboard-buyer-actions">
          <div className="card-header"><h3>Centro de compras</h3></div>
          <div className="card-body">
            <button className="buyer-primary-action" onClick={() => navigate('/publicaciones')}>
              <ShoppingCart size={22}/>
              <span>
                <strong>Comprar producto</strong>
                <small>Explora ofertas activas y abre una negociación.</small>
              </span>
              <ArrowRight size={16}/>
            </button>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-3)', marginTop:'var(--sp-3)' }}>
              <QuickBtn icon={<Handshake size={15}/>} label="Negociaciones" onClick={()=>navigate('/negociaciones')} />
              <QuickBtn icon={<Truck size={15}/>} label="Entregas" onClick={()=>navigate('/entregas')} />
              <QuickBtn icon={<CreditCard size={15}/>} label="Pagos" onClick={()=>navigate('/pagos')} />
              <QuickBtn icon={<User size={15}/>} label="Perfil" onClick={()=>navigate('/perfil')} />
            </div>
          </div>
        </div>

        <div className="card card-tint-cielo card-accent-left-cielo">
          <div className="card-header flex items-center justify-between">
            <h3>Ofertas destacadas</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/publicaciones')}
              style={{ display:'flex', alignItems:'center', gap:4 }}>
              Explorar todas <ArrowRight size={14}/>
            </button>
          </div>
          {destacadas.length === 0
            ? <div className="empty-state"><p>No hay publicaciones disponibles</p></div>
            : destacadas.map(p => {
                const prodName = p.producto?.nombre ?? p.producto ?? 'Producto';
                const prodNameDisplay = p.productor?.usuario?.nombre ?? p.productor ?? 'Productor';
                const rating = Number(p.productor?.calificacion ?? p.calificacion ?? 0);
                return (
                  <div key={p.id} onClick={() => navigate(`/publicaciones/${p.id}`)}
                    style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'var(--sp-4) var(--sp-6)', borderBottom:'1px solid var(--cielo-100)', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--cielo-50)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:'.9rem', marginBottom:3 }}>{p.titulo}</div>
                      <div style={{ fontSize:'.8rem', color:'var(--gris-500)', display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
                        <MapPin size={12}/> {p.municipio}, {p.departamento} · {prodNameDisplay}
                        {rating > 0 && <><Star size={12} style={{ color:'var(--oro-600)' }}/> {rating}</>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--verde-800)' }}>Q{p.precio_unitario}</div>
                      <div style={{ fontSize:'.75rem', color:'var(--gris-500)' }}>/{p.unidad_medida}</div>
                    </div>
                  </div>
                );
              })}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'var(--sp-5)' }}>
          <div className="card" style={{ background:'linear-gradient(135deg, var(--cielo-50), var(--verde-50))', border:'1px solid var(--cielo-100)', borderLeft:'4px solid var(--cielo-500)' }}>
            <div className="card-body">
              <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', marginBottom:'var(--sp-2)' }}>
                <Lightbulb size={20} style={{ color:'var(--oro-600)' }}/>
                <h4 style={{ margin:0, color:'var(--cielo-700)' }}>Tip del día</h4>
              </div>
              <p style={{ fontSize:'.875rem', color:'var(--gris-700)', lineHeight:1.6, margin:0 }}>
                Responde rápido a los mensajes del productor para cerrar la negociación antes de que otro comprador la tome.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
