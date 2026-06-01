import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import {
  Users, ClipboardList, PackageSearch, UserPlus, Star,
  ArrowRight, Package, Activity, MapPin, Bell
} from 'lucide-react';

function initials(nombre = 'A') {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function normalizeMarket(p) {
  return {
    id: p.id,
    titulo: p.titulo ?? 'Publicación',
    producto: p.producto?.nombre ?? p.producto ?? 'Producto',
    productor: p.productor?.usuario?.nombre ?? p.productor ?? 'Productor',
    ubicacion: [p.municipio, p.departamento].filter(Boolean).join(', '),
  };
}

export default function DashboardAsociacion() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = user?.nombre ?? 'Asociación';

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      try {
        const [sRes, nRes, mRes] = await Promise.all([
          api.get('/dashboard/stats', { signal: ac.signal }).catch(() => null),
          api.get('/publicaciones?limit=5', { signal: ac.signal }).catch(() => null),
          api.get('/asociaciones/miembros', { signal: ac.signal }).catch(() => null),
        ]);
        if (!ac.signal.aborted) {
          setStats(sRes?.data ?? null);
          setRecientes((nRes?.data?.data ?? []).map(normalizeMarket));
          setMiembros(mRes?.data?.data ?? []);
        }
      } finally { if (!ac.signal.aborted) setLoading(false); }
    }
    load();
    return () => ac.abort();
  }, []);

  const safeStats = stats ?? { miembros:0, publicaciones_activas:0, productos_activos:0, notificaciones_no_leidas:0, valor_negociado:0 };
  const promedioPublicaciones = safeStats.miembros ? Math.round((safeStats.publicaciones_activas / safeStats.miembros) * 10) / 10 : 0;

  if (loading) return (
    <div className="dashboard-page dashboard-asociacion-page animate-fade-in" style={{ display:'grid', gap:'var(--sp-5)' }}>
      <div className="skeleton" style={{ height:230, borderRadius:'var(--radius-xl)' }} />
      <div className="grid-4">{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:110 }} />)}</div>
    </div>
  );

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="dashboard-hero dashboard-hero-asociacion">
        <div className="dashboard-hero-copy">
          <p>{saludo},</p>
          <h1>{nombre}</h1>
          <span>Una vista para coordinar productores, cuidar el catálogo común y monitorear el movimiento del marketplace sin invadir operaciones privadas.</span>
          <div>
            <button className="btn btn-oro" onClick={() => navigate('/miembros')}>
              <UserPlus size={16} /> Gestionar productores
            </button>
            <button className="btn dashboard-hero-secondary" onClick={() => navigate('/catalogo')}>
              <PackageSearch size={16} /> Gestionar catálogo
            </button>
          </div>
        </div>
        <div className="association-radar">
          <span>Radar de asociación</span>
          <strong>{safeStats.miembros ?? 0}</strong>
          <small>productores vinculados</small>
          <div className="radar-lines"><i/><i/><i/></div>
        </div>
      </div>

      <div className="dashboard-kpi-strip association-kpis">
        <button type="button" onClick={() => navigate('/miembros')}><Users size={18}/><strong>{safeStats.miembros ?? 0}</strong><span>Miembros</span></button>
        <button type="button" onClick={() => navigate('/publicaciones')}><ClipboardList size={18}/><strong>{safeStats.publicaciones_activas ?? 0}</strong><span>Publicaciones</span></button>
        <button type="button" onClick={() => navigate('/catalogo')}><PackageSearch size={18}/><strong>{safeStats.productos_activos ?? 0}</strong><span>Productos</span></button>
        <button type="button" onClick={() => navigate('/perfil')}><Bell size={18}/><strong>{safeStats.notificaciones_no_leidas ?? 0}</strong><span>Alertas</span></button>
      </div>

      <div className="association-command-grid">
        <section className="association-board span-2">
          <div className="association-board-head">
            <div>
              <span className="eyebrow">Productores</span>
              <h2>Miembros con actividad</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/miembros')}>Gestionar <ArrowRight size={14}/></button>
          </div>
          <div className="member-orbit-list">
            {miembros.slice(0, 4).map(m => {
              const nombreMiembro = m.usuario?.nombre ?? 'Productor';
              return (
                <button key={m.id} className="member-orbit-card" onClick={() => navigate('/miembros')}>
                  <span className="member-orbit-avatar">{initials(nombreMiembro)}</span>
                  <span className="member-orbit-info">
                    <strong>{nombreMiembro}</strong>
                    <small><MapPin size={12}/> {m.municipio ?? 'Sin municipio'}, {m.departamento ?? 'Sin departamento'}</small>
                  </span>
                  <span className="member-orbit-score"><Star size={12} fill="currentColor"/> {Number(m.calificacion ?? 0).toFixed(1)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button type="button" className="association-board association-board-action" onClick={() => navigate('/miembros')}>
          <div className="association-board-head compact">
            <div>
              <span className="eyebrow">Rendimiento</span>
              <h2>Promedio</h2>
            </div>
            <Activity size={20}/>
          </div>
          <div className="association-average">
            <strong>{promedioPublicaciones}</strong>
            <span>publicaciones por productor</span>
            <p>{safeStats.productos_activos ?? 0} productos activos sostienen el catálogo común.</p>
          </div>
        </button>

        <section className="association-board">
          <div className="association-board-head compact">
            <div>
              <span className="eyebrow">Operación</span>
              <h2>Acciones</h2>
            </div>
            <Bell size={20}/>
          </div>
          <div className="association-actions">
            <button onClick={() => navigate('/publicaciones')}><Package size={16}/> Revisar marketplace</button>
            <button onClick={() => navigate('/catalogo')}><PackageSearch size={16}/> Gestionar catálogo</button>
            <button onClick={() => navigate('/miembros')}><Users size={16}/> Administrar miembros</button>
          </div>
        </section>

        <section className="association-board span-2">
          <div className="association-board-head">
            <div>
              <span className="eyebrow">Marketplace</span>
              <h2>Publicaciones recientes</h2>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/publicaciones')}>Ver todo <ArrowRight size={14}/></button>
          </div>
          <div className="association-timeline">
            {recientes.slice(0, 5).map(p => (
              <button key={p.id} onClick={() => navigate('/publicaciones/' + p.id)}>
                <i className="state-aceptada"/>
                <span><strong>{p.titulo}</strong><small>{p.producto} · {p.productor} · {p.ubicacion}</small></span>
                <em>Activa</em>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
