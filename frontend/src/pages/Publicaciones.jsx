import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { getFullImageUrl } from '../api/utils';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { GridSkeleton } from '../components/skeletons';
import { Search, MapPin, Tag, DollarSign, ArrowUpDown, Star, Package } from 'lucide-react';

const DEPARTAMENTOS = ['Todos', 'Alta Verapaz', 'Baja Verapaz', 'Chimaltenango', 'Chiquimula', 'El Progreso', 'Escuintla', 'Guatemala', 'Huehuetenango', 'Izabal', 'Jalapa', 'Jutiapa', 'Petén', 'Quetzaltenango', 'Quiché', 'Retalhuleu', 'Sacatepéquez', 'San Marcos', 'Santa Rosa', 'Sololá', 'Suchitepéquez', 'Totonicapán', 'Zacapa'];
const CATEGORIAS = ['Todos', 'Granos básicos', 'Frutas', 'Verduras', 'Hortalizas', 'Tubérculos', 'Especias'];

function normalizePub(p) {
  return {
    ...p,
    producto: p.producto?.nombre ?? p.producto ?? 'Producto',
    categoria: p.producto?.categoria ?? p.categoria ?? '',
    precio_unitario: Number(p.precio_unitario ?? 0),
    cantidad_disponible: Number(p.cantidad_disponible ?? 0),
    productor: p.productor?.usuario?.nombre ?? p.productor ?? 'Productor',
    calificacion: Number(p.productor?.calificacion ?? p.calificacion ?? 0),
    fecha_entrega_acordada: p.fecha_entrega_acordada ?? null,
  };
}

export default function Publicaciones() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPublicRoute = location.pathname.startsWith('/catalogo-publico');
  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [depto, setDepto] = useState('Todos');
  const [categoria, setCategoria] = useState('Todos');
  const [precioMax, setPrecioMax] = useState('');
  const [orden, setOrden] = useState('reciente');

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (depto !== 'Todos') params.set('departamento', depto);
        if (categoria !== 'Todos') {
          params.set('categoria', categoria);
        }
        if (precioMax) params.set('precio_max', precioMax);
        const res = await api.get(`/publicaciones?${params}`, { signal: ac.signal });
        if (!cancelled) setPubs((res.data?.data ?? []).map(normalizePub));
      } catch (err) {
        if (ac.signal.aborted || cancelled) return;
        setPubs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; ac.abort(); };
  }, [depto, categoria, precioMax]);

  const busquedaDebounced = useDebouncedValue(busqueda, 300);

  const filtradas = useMemo(() => {
    const busq = busquedaDebounced.toLowerCase();
    return pubs
      .filter(p => !busq || p.titulo.toLowerCase().includes(busq))
      .sort((a, b) => {
        if (orden === 'precio_asc') return a.precio_unitario - b.precio_unitario;
        if (orden === 'precio_desc') return b.precio_unitario - a.precio_unitario;
        if (orden === 'calificacion') return b.calificacion - a.calificacion;
        return b.id - a.id;
      });
  }, [pubs, busquedaDebounced, orden]);

  return (
    <div className="animate-fade-in-up">
      <div className="page-header" style={{ marginBottom: 'var(--sp-5)' }}>
        <div>
          <h1>Publicaciones</h1>
          <p className="text-muted">Encuentra los mejores productos agrícolas directos del campo</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-6)', padding: 'var(--sp-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 'var(--sp-4)', alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="form-label" htmlFor="buscar-pub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Search size={13} /> Buscar</label>
            <input id="buscar-pub" className="form-input" placeholder="Maíz, frijol, tomate..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoComplete="off" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
            <label className="form-label" htmlFor="filtro-depto" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> Departamento</label>
            <select id="filtro-depto" className="form-select" value={depto} onChange={e => setDepto(e.target.value)}>
              {DEPARTAMENTOS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filtro-categoria" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={13} /> Categoría</label>
            <select id="filtro-categoria" className="form-select" value={categoria} onChange={e => setCategoria(e.target.value)}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filtro-precio" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DollarSign size={13} /> Precio máx (Q)</label>
            <input id="filtro-precio" className="form-input" type="number" placeholder="Sin límite" value={precioMax} onChange={e => setPrecioMax(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="filtro-orden" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ArrowUpDown size={13} /> Ordenar</label>
            <select id="filtro-orden" className="form-select" value={orden} onChange={e => setOrden(e.target.value)}>
              <option value="reciente">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="calificacion">Mejor calificación</option>
            </select>
          </div>
        </div>
      </div>

      {loading
        ? <GridSkeleton count={6} />
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
              {filtradas.map((p, i) => <div key={p.id} className="stagger-item" style={{ animationDelay: `${i * 0.04}s` }}><PubCard pub={p} onClick={() => navigate(isPublicRoute ? `/catalogo-publico/${p.id}` : `/publicaciones/${p.id}`)} /></div>)}
            </div>
          </>
      }
    </div>
  );
}

function PubCard({ pub, onClick }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="pub-card scale-in" onClick={onClick}>
      <div className="pub-card-image-wrap">
        {pub.imagen_url && !imgError ? (
          <img
            src={getFullImageUrl(pub.imagen_url)}
            alt={pub.titulo}
            loading="lazy"
            className="pub-card-image"
            onError={() => setImgError(true)}
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
        <div className="pub-card-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <MapPin size={12} /> {pub.municipio}, {pub.departamento}
          <span style={{ margin: '0 4px' }}>·</span>
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

