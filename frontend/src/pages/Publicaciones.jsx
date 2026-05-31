import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { getFullImageUrl } from '../api/utils';
import { Search, MapPin, Tag, DollarSign, ArrowUpDown, Star, Package } from 'lucide-react';

const DEPARTAMENTOS = ['Todos', 'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'];
const CATEGORIAS = ['Todos', 'Granos básicos', 'Frutas', 'Verduras', 'Hortalizas', 'Tubérculos', 'Especias'];
const MOCK_PUBS = [
  { id: 1, titulo: 'Maíz blanco primera calidad', producto: 'Maíz', categoria: 'Granos básicos', precio_unitario: 120, unidad_medida: 'quintal', cantidad_disponible: 80, municipio: 'Chiquimula', departamento: 'Chiquimula', productor: 'Finca San Luis', calificacion: 4.8 },
  { id: 2, titulo: 'Frijol negro seleccionado', producto: 'Frijol', categoria: 'Granos básicos', precio_unitario: 280, unidad_medida: 'quintal', cantidad_disponible: 40, municipio: 'Cobán', departamento: 'Alta Verapaz', productor: 'Cooperativa del Norte', calificacion: 4.5 },
  { id: 3, titulo: 'Tomate manzano fresco', producto: 'Tomate', categoria: 'Verduras', precio_unitario: 85, unidad_medida: 'caja', cantidad_disponible: 120, municipio: 'Antigua', departamento: 'Sacatepéquez', productor: 'Agrícola Antigua', calificacion: 4.9 },
  { id: 4, titulo: 'Papa blanca extra', producto: 'Papa', categoria: 'Tubérculos', precio_unitario: 95, unidad_medida: 'quintal', cantidad_disponible: 200, municipio: 'Patzicía', departamento: 'Chimaltenango', productor: 'Finca El Rosario', calificacion: 4.7 },
  { id: 5, titulo: 'Aguacate Hass orgánico', producto: 'Aguacate', categoria: 'Frutas', precio_unitario: 350, unidad_medida: 'caja', cantidad_disponible: 60, municipio: 'San Marcos', departamento: 'San Marcos', productor: 'Orgánica San Marcos', calificacion: 5.0 },
  { id: 6, titulo: 'Güicoy tierno grande', producto: 'Güicoy', categoria: 'Verduras', precio_unitario: 45, unidad_medida: 'caja', cantidad_disponible: 90, municipio: 'Jalapa', departamento: 'Jalapa', productor: 'Productor Directo', calificacion: 4.3 },
];

function normalizePub(p) {
  return {
    ...p,
    producto: p.producto?.nombre ?? p.producto ?? 'Producto',
    categoria: p.producto?.categoria ?? p.categoria ?? '',
    precio_unitario: Number(p.precio_unitario ?? 0),
    cantidad_disponible: Number(p.cantidad_disponible ?? 0),
    productor: p.productor?.usuario?.nombre ?? p.productor ?? 'Productor',
    calificacion: Number(p.productor?.calificacion ?? p.calificacion ?? 0),
  };
}

export default function Publicaciones() {
  const navigate = useNavigate();
  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [depto, setDepto] = useState('Todos');
  const [categoria, setCategoria] = useState('Todos');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('reciente');

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (depto !== 'Todos') params.set('departamento', depto);
        if (categoria !== 'Todos') {
          params.set('categoria', categoria);
        }
        if (precioMax) params.set('precio_max', precioMax);
        const res = await api.get(`/publicaciones?${params}`);
        setPubs((res.data?.data ?? []).map(normalizePub));
      } catch {
        setPubs(MOCK_PUBS.map(normalizePub));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [depto, categoria, precioMax]);

  const filtradas = pubs
    .filter(p => !busqueda || p.titulo.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (orden === 'precio_asc') return a.precio_unitario - b.precio_unitario;
      if (orden === 'precio_desc') return b.precio_unitario - a.precio_unitario;
      if (orden === 'calificacion') return b.calificacion - a.calificacion;
      return b.id - a.id;
    });

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Publicaciones</h1>
          <p className="text-muted">Encuentra los mejores productos agrícolas directos del campo</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--sp-4)', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Search size={13} /> Buscar</label>
            <input className="form-input" placeholder="Maíz, frijol, tomate..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> Departamento</label>
            <select className="form-select" value={depto} onChange={e => setDepto(e.target.value)}>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={13} /> Categoría</label>
            <select className="form-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} /> Precio máx (Q)</label>
            <input className="form-input" type="number" placeholder="Sin límite" value={precioMax} onChange={e => setPrecioMax(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUpDown size={13} /> Ordenar</label>
            <select className="form-select" value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="reciente">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="calificacion">Mejor calificación</option>
            </select>
          </div>
        </div>
      </div>

      {loading
        ? <div className="loader-wrap"><div className="spinner" /></div>
        : filtradas.length === 0
        ? <div className="empty-state card" style={{ padding: 'var(--sp-16)' }}>
            <Package size={48} style={{ color: 'var(--gris-300)', marginBottom: 'var(--sp-4)' }} />
            <h3>Sin resultados</h3>
            <p>Intenta con otros filtros o términos de búsqueda</p>
          </div>
        : <>
            <p className="text-muted text-sm" style={{ marginBottom: 'var(--sp-4)' }}>
              {filtradas.length} publicación{filtradas.length !== 1 ? 'es' : ''} encontrada{filtradas.length !== 1 ? 's' : ''}
            </p>
            <div className="grid-pub">
              {filtradas.map(p => <PubCard key={p.id} pub={p} onClick={() => navigate(`/publicaciones/${p.id}`)} />)}
            </div>
          </>
      }
    </div>
  );
}

function PubCard({ pub, onClick }) {
  return (
    <div className="pub-card scale-in" onClick={onClick}>
      <div className="pub-card-image-wrap">
        {pub.imagen_url ? (
          <img
            src={getFullImageUrl(pub.imagen_url)}
            alt={pub.titulo}
            className="pub-card-image"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = ''; // Clear source to trigger fallback styling
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div class="pub-card-image-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></div>`;
            }}
          />
        ) : (
          <div className="pub-card-image-placeholder">
            <Package size={28} />
          </div>
        )}
      </div>
      <div className="pub-card-body">
        <div className="pub-card-title">{pub.titulo}</div>
        <div className="pub-card-price">
          Q{pub.precio_unitario.toLocaleString()}
          <span style={{ fontSize: '.875rem', fontWeight: 400, color: 'var(--gris-500)', fontFamily: 'var(--font-body)' }}>
            &nbsp;/{pub.unidad_medida}
          </span>
        </div>
        <div className="pub-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} /> {pub.municipio}, {pub.departamento}
          <br />
          {pub.cantidad_disponible} {pub.unidad_medida}s disponibles
        </div>
      </div>
      <div className="pub-card-footer">
        <span style={{ fontSize: ".8125rem", color: 'var(--gris-500)' }}>{pub.productor}</span>
        <span style={{ fontSize: ".8125rem", color: 'var(--oro-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
          <Star size={12} fill="currentColor" /> {pub.calificacion}
        </span>
      </div>
    </div>
  );
}

