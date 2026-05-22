import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import {
  Users, ClipboardList, Handshake, DollarSign,
  UserPlus, Bell, User, ArrowRight, Star, Plus,
  Truck, CreditCard, Package
} from 'lucide-react';

export default function DashboardAsociacion() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const nombre = user?.nombre ?? 'Asociación';
  const iniciales = nombre.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase();

  useEffect(() => {
    async function load() {
      try {
        const [sRes, nRes] = await Promise.all([
          api.get('/dashboard/stats').catch(() => ({ data: mockStats() })),
          api.get('/negociaciones?limit=5').catch(() => ({ data: { data: mockNeg() } })),
        ]);
        setStats(sRes.data);
        setRecientes(nRes.data?.data ?? []);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  function mockStats() {
    return { miembros:8, publicaciones_activas:24, negociaciones_activas:11, valor_negociado:48200 };
  }
  function mockNeg() {
    return [
      { id:1, titulo:'Maíz blanco 50 qq', estado:'Pendiente', contraparte:'Juan Pérez', fecha:'2025-05-08' },
      { id:2, titulo:'Frijol negro 20 qq', estado:'Aceptada', contraparte:'Comercial Sur', fecha:'2025-05-07' },
      { id:3, titulo:'Tomate cherry 10 cajas', estado:'En proceso', contraparte:'Mercado Central', fecha:'2025-05-06' },
    ];
  }

  const miembros = [
    { iniciales:'JP', nombre:'Juan Pérez', depto:'Chiquimula · Maíz, Frijol', rating:4.8, activo:true },
    { iniciales:'ML', nombre:'María López', depto:'Zacapa · Tomate, Chile', rating:4.5, activo:true },
    { iniciales:'CA', nombre:'Carlos Ajú', depto:'Jalapa · Papa, Cebolla', rating:4.9, activo:true },
    { iniciales:'RG', nombre:'Rosa García', depto:'Chiquimula · Aguacate', rating:4.3, activo:false, nuevo:true },
  ];

  const actividades = [
    { color:'blue', texto:'Nueva negociación de Juan Pérez — Maíz blanco 50 qq con Comercial Sur', tiempo:'Hace 2 horas' },
    { color:'green', texto:'Entrega completada — María López entregó 10 cajas de tomate a Mercado Central', tiempo:'Hace 5 horas' },
    { color:'amber', texto:'Rosa García se unió como nueva productora miembro', tiempo:'Ayer, 14:30' },
    { color:'green', texto:'Carlos Ajú publicó nueva oferta de papa blanca — 200 quintales disponibles', tiempo:'Ayer, 09:15' },
    { color:'blue', texto:'Negociación aceptada — Juan Pérez acordó Q115/qq con ExportFresh', tiempo:'Hace 2 días' },
  ];

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;

  return (
    <div className="animate-fade-in-up dash-asoc">
      {/* Hero */}
      <div className="dash-asoc-hero">
        <div className="dash-asoc-hero-bg" />
        <div className="dash-asoc-hero-bg-2" />
        <p className="dash-asoc-hero-greeting">{saludo},</p>
        <h1 className="dash-asoc-hero-name">{nombre} 🏛</h1>
        <p className="dash-asoc-hero-desc">Administra tus productores miembros, supervisa sus publicaciones y mantén el seguimiento de las negociaciones activas de la asociación.</p>
        <div className="dash-asoc-hero-actions">
          <button className="dash-asoc-btn-hero-pri" onClick={() => navigate('/registro')}>
            <UserPlus size={15} /> Agregar productor
          </button>
          <button className="dash-asoc-btn-hero-sec" onClick={() => navigate('/negociaciones')}>
            Ver negociaciones
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dash-asoc-stats">
        <div className="dash-asoc-stat-card">
          <div className="dash-asoc-stat-icon dash-asoc-ic-green"><Users size={18} /></div>
          <div>
            <div className="dash-asoc-stat-val">{stats?.miembros ?? 8}</div>
            <div className="dash-asoc-stat-lbl">Productores miembros</div>
            <div className="dash-asoc-stat-delta">↑ +1 este mes</div>
          </div>
        </div>
        <div className="dash-asoc-stat-card">
          <div className="dash-asoc-stat-icon dash-asoc-ic-blue"><ClipboardList size={18} /></div>
          <div>
            <div className="dash-asoc-stat-val">{stats?.publicaciones_activas ?? 24}</div>
            <div className="dash-asoc-stat-lbl">Publicaciones activas</div>
          </div>
        </div>
        <div className="dash-asoc-stat-card">
          <div className="dash-asoc-stat-icon dash-asoc-ic-amber"><Handshake size={18} /></div>
          <div>
            <div className="dash-asoc-stat-val">{stats?.negociaciones_activas ?? 11}</div>
            <div className="dash-asoc-stat-lbl">Negociaciones activas</div>
          </div>
        </div>
        <div className="dash-asoc-stat-card">
          <div className="dash-asoc-stat-icon dash-asoc-ic-purple"><DollarSign size={18} /></div>
          <div>
            <div className="dash-asoc-stat-val">Q{(stats?.valor_negociado ?? 48200).toLocaleString()}</div>
            <div className="dash-asoc-stat-lbl">Valor negociado (mes)</div>
            <div className="dash-asoc-stat-delta">↑ +18% vs anterior</div>
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="dash-asoc-panels">
        {/* Productores miembros */}
        <div className="dash-asoc-panel">
          <div className="dash-asoc-panel-head">
            <span className="dash-asoc-panel-title">Productores miembros</span>
            <button className="dash-asoc-btn-sm" onClick={() => navigate('/publicaciones')}>Ver todos →</button>
          </div>
          {miembros.map((m, i) => (
            <div key={i} className="dash-asoc-member-row">
              <div className={`dash-asoc-member-av m${i+1}`}>{m.iniciales}</div>
              <div>
                <div className="dash-asoc-member-name">{m.nombre}</div>
                <div className="dash-asoc-member-dept">{m.depto}</div>
              </div>
              <span className="dash-asoc-rating"><Star size={11} fill="currentColor" /> {m.rating}</span>
              <span className={`dash-asoc-member-badge ${m.nuevo ? 'mb-new' : 'mb-active'}`}>
                {m.nuevo ? 'Nuevo' : 'Activo'}
              </span>
            </div>
          ))}
        </div>

        {/* Actividad reciente */}
        <div className="dash-asoc-panel">
          <div className="dash-asoc-panel-head">
            <span className="dash-asoc-panel-title">Actividad reciente</span>
            <button className="dash-asoc-btn-sm" onClick={() => navigate('/negociaciones')}>Ver todo →</button>
          </div>
          {actividades.map((a, i) => (
            <div key={i} className="dash-asoc-activity-row">
              <div className={`dash-asoc-activity-dot ad-${a.color}`} />
              <div>
                <div className="dash-asoc-activity-text" dangerouslySetInnerHTML={{ __html: a.texto }} />
                <div className="dash-asoc-activity-time">{a.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
