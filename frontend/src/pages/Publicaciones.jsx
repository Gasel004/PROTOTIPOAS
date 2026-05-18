import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const DEPARTAMENTOS = ['Todos','Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula',
  'El Progreso','Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa',
  'Petén','Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez','San Marcos',
  'Santa Rosa','Sololá','Suchitepéquez','Totonicapán','Zacapa'];

const CATEGORIAS = ['Todos','Granos básicos','Frutas','Verduras','Hortalizas','Tubérculos','Especias'];

const MOCK_PUBS = [
  { id:1, titulo:'Maíz blanco primera calidad', producto:'Maíz', categoria:'Granos básicos',
    precio_unitario:120, unidad_medida:'quintal', cantidad_disponible:80,
    municipio:'Chiquimula', departamento:'Chiquimula', fecha_cosecha:'2025-04-20',
    productor:'Finca San Luis', calificacion:4.8, emoji:'🌽' },
  { id:2, titulo:'Frijol negro seleccionado', producto:'Frijol', categoria:'Granos básicos',
    precio_unitario:280, unidad_medida:'quintal', cantidad_disponible:40,
    municipio:'Cobán', departamento:'Alta Verapaz', fecha_cosecha:'2025-04-15',
    productor:'Cooperativa del Norte', calificacion:4.5, emoji:'🫘' },
  { id:3, titulo:'Tomate manzano fresco', producto:'Tomate', categoria:'Verduras',
    precio_unitario:85, unidad_medida:'caja', cantidad_disponible:120,
    municipio:'Antigua', departamento:'Sacatepéquez', fecha_cosecha:'2025-05-01',
    productor:'Agrícola Antigua', calificacion:4.9, emoji:'🍅' },
  { id:4, titulo:'Papa blanca extra', producto:'Papa', categoria:'Tubérculos',
    precio_unitario:95, unidad_medida:'quintal', cantidad_disponible:200,
    municipio:'Patzicía', departamento:'Chimaltenango', fecha_cosecha:'2025-04-28',
    productor:'Finca El Rosario', calificacion:4.7, emoji:'🥔' },
  { id:5, titulo:'Aguacate Hass orgánico', producto:'Aguacate', categoria:'Frutas',
    precio_unitario:350, unidad_medida:'caja', cantidad_disponible:60,
    municipio:'San Marcos', departamento:'San Marcos', fecha_cosecha:'2025-05-05',
    productor:'Orgánica San Marcos', calificacion:5.0, emoji:'🥑' },
  { id:6, titulo:'Güicoy tierno grande', producto:'Güicoy', categoria:'Verduras',
    precio_unitario:45, unidad_medida:'caja', cantidad_disponible:90,
    municipio:'Jalapa', departamento:'Jalapa', fecha_cosecha:'2025-04-30',
    productor:'Productor Directo', calificacion:4.3, emoji:'🥦' },
];

export default function Publicaciones() {
  const navigate = useNavigate();
  const [pubs,       setPubs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [busqueda,   setBusqueda]   = useState('');
  const [depto,      setDepto]      = useState('Todos');
  const [categoria,  setCategoria]  = useState('Todos');
  const [precioMax,  setPrecioMax]  = useState('');
  const [orden,      setOrden]      = useState('reciente');

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (depto !== 'Todos')     params.set('departamento', depto);
        if (categoria !== 'Todos') params.set('categoria', categoria);
        if (precioMax)             params.set('precio_max', precioMax);
        const res = await api.get(`/publicaciones?${params}`);
        setPubs(res.data?.data ?? []);
      } catch {
        setPubs(MOCK_PUBS);
      } finally { setLoading(false); }
    }
    load();
  }, [depto, categoria, precioMax]);

  const filtradas = pubs
    .filter(p => !busqueda || p.titulo.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (orden === 'precio_asc')  return a.precio_unitario - b.precio_unitario;
      if (orden === 'precio_desc') return b.precio_unitario - a.precio_unitario;
      if (orden === 'calificacion')return b.calificacion - a.calificacion;
      return b.id - a.id;
    });

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>🌾 Publicaciones</h1>
          <p className="text-muted">Encuentra los mejores productos agrícolas directos del campo</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom:'var(--sp-6)', padding:'var(--sp-5)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:'var(--sp-4)', alignItems:'end' }}>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Maíz, frijol, tomate..."
              value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Departamento</label>
            <select className="form-select" value={depto} onChange={e=>setDepto(e.target.value)}>
              {DEPARTAMENTOS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoria} onChange={e=>setCategoria(e.target.value)}>
              {CATEGORIAS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Precio máx (Q)</label>
            <input className="form-input" type="number" placeholder="Sin límite"
              value={precioMax} onChange={e=>setPrecioMax(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom:0 }}>
            <label className="form-label">Ordenar por</label>
            <select className="form-select" value={orden} onChange={e=>setOrden(e.target.value)}>
              <option value="reciente">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="calificacion">Mejor calificación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {loading
        ? <div className="loader-wrap"><div className="spinner" /></div>
        : filtradas.length === 0
          ? <div className="empty-state card" style={{ padding:'var(--sp-16)' }}>
              <div className="empty-state-icon">🔍</div>
              <h3>Sin resultados</h3>
              <p>Intenta con otros filtros o términos de búsqueda</p>
            </div>
          : <>
              <p className="text-muted text-sm" style={{ marginBottom:'var(--sp-4)' }}>
                {filtradas.length} publicación{filtradas.length !== 1 ? 'es' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
              </p>
              <div className="grid-pub">
                {filtradas.map(p => (
                  <PubCard key={p.id} pub={p} onClick={() => navigate(`/publicaciones/${p.id}`)} />
                ))}
              </div>
            </>
      }
    </div>
  );
}

function PubCard({ pub, onClick }) {
  return (
    <div className="pub-card" onClick={onClick}>
      <div className="pub-card-img">
        <span style={{ fontSize:'3.5rem', position:'relative', zIndex:1 }}>{pub.emoji ?? '🌿'}</span>
      </div>
      <div className="pub-card-body">
        <div className="pub-card-title">{pub.titulo}</div>
        <div className="pub-card-price">
          Q{pub.precio_unitario.toLocaleString()}
          <span style={{ fontSize:'.875rem', fontWeight:400, color:'var(--gris-500)', fontFamily:'var(--font-body)' }}>
            &nbsp;/{pub.unidad_medida}
          </span>
        </div>
        <div className="pub-card-meta">
          📍 {pub.municipio}, {pub.departamento}
          <br />
          📦 {pub.cantidad_disponible} {pub.unidad_medida}s disponibles
        </div>
      </div>
      <div className="pub-card-footer">
        <span style={{ fontSize:'.8125rem', color:'var(--gris-500)' }}>
          🌾 {pub.productor}
        </span>
        <span style={{ fontSize:'.8125rem', color:'var(--oro-600)', fontWeight:600 }}>
          ★ {pub.calificacion}
        </span>
      </div>
    </div>
  );
}
