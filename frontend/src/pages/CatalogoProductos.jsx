import { useEffect, useState } from 'react';
import api from '../api/client';
import { PlusCircle, Package, Pencil, CheckCircle, XCircle, Save, Search } from 'lucide-react';

const EMPTY = { nombre:'', categoria:'', unidad_medida:'quintal', descripcion:'', activo:true };
const UNIDADES = ['quintal','libra','kilogramo','caja','docena','unidad','saco','arroba'];
const CATEGORIAS = ['Granos básicos','Frutas','Verduras','Hortalizas','Tubérculos','Especias'];

export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const res = await api.get('/productos?activo=false');
      setProductos(res.data?.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo cargar el catálogo');
    } finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, []);

  function edit(p) {
    setEditing(p.id);
    setForm({
      nombre: p.nombre ?? '',
      categoria: p.categoria ?? '',
      unidad_medida: p.unidad_medida ?? 'quintal',
      descripcion: p.descripcion ?? '',
      activo: Boolean(p.activo),
    });
    setMsg(''); setError('');
  }

  function reset() {
    setEditing(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setError('');
    if (!form.nombre.trim() || !form.unidad_medida) {
      setError('Nombre y unidad de medida son requeridos.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put('/productos/' + editing, form);
        setMsg('Producto actualizado correctamente');
      } else {
        await api.post('/productos', form);
        setMsg('Producto agregado al catálogo');
      }
      reset();
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo guardar el producto');
    } finally { setSaving(false); }
  }

  const filtrados = productos.filter(p => !search || p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.categoria ?? '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="assoc-members-hero catalog-hero">
        <div>
          <span className="eyebrow">Catálogo agrícola</span>
          <h1>Productos del sistema</h1>
          <p>Administra los productos que los productores podrán usar al crear publicaciones de venta.</p>
        </div>
        <div className="assoc-members-summary">
          <strong>{productos.length}</strong>
          <span>productos registrados</span>
        </div>
      </div>

      <div className="catalog-layout">
        <form className="assoc-link-panel catalog-form" onSubmit={submit}>
          <div className="assoc-link-icon"><Package size={22}/></div>
          <h3>{editing ? 'Editar producto' : 'Agregar producto'}</h3>
          <p>Solo las asociaciones pueden modificar este catálogo.</p>

          <div className="form-group">
            <label className="form-label">Nombre <span>*</span></label>
            <input className="form-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre:e.target.value }))} placeholder="Ej: Café" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria:e.target.value }))}>
                <option value="">Sin categoría</option>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unidad <span>*</span></label>
              <select className="form-select" value={form.unidad_medida} onChange={e => setForm(f => ({ ...f, unidad_medida:e.target.value }))}>
                {UNIDADES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" rows={3} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion:e.target.value }))} placeholder="Descripción del producto" />
          </div>
          <label className="catalog-toggle">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo:e.target.checked }))} />
            <span>{form.activo ? 'Producto activo' : 'Producto inactivo'}</span>
          </label>
          <div className="flex gap-3">
            <button className="btn btn-primary btn-full" disabled={saving}><Save size={15}/> {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar'}</button>
            {editing && <button type="button" className="btn btn-ghost" onClick={reset}>Cancelar</button>}
          </div>
          {msg && <div className="alert alert-success">{msg}</div>}
          {error && <div className="alert alert-error">{error}</div>}
        </form>

        <section className="catalog-list-panel">
          <div className="catalog-toolbar">
            <div>
              <span className="eyebrow">Listado</span>
              <h2>Catálogo completo</h2>
            </div>
            <div className="input-icon-wrap catalog-search">
              <Search size={16}/>
              <input className="form-input" placeholder="Buscar producto" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? <div className="loader-wrap"><div className="spinner" /></div> : filtrados.length === 0 ? (
            <div className="empty-state"><Package size={42}/><h3>Sin productos</h3><p>Agrega el primer producto al catálogo.</p></div>
          ) : (
            <div className="catalog-product-grid">
              {filtrados.map(p => (
                <article className="catalog-product-card" key={p.id}>
                  <div className="catalog-product-icon"><Package size={20}/></div>
                  <div>
                    <div className="catalog-product-head">
                      <h3>{p.nombre}</h3>
                      <span className={p.activo ? 'ok' : 'off'}>{p.activo ? <CheckCircle size={13}/> : <XCircle size={13}/>} {p.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <p>{p.categoria ?? 'Sin categoría'} · {p.unidad_medida}</p>
                    {p.descripcion && <small>{p.descripcion}</small>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(p)}><Pencil size={14}/> Editar</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
