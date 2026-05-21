import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';

const UNIDADES = ['quintal','libra','kilogramo','caja','docena','unidad','saco','arroba'];
const DEPTOS = ['Alta Verapaz','Baja Verapaz','Chimaltenango','Chiquimula','El Progreso',
  'Escuintla','Guatemala','Huehuetenango','Izabal','Jalapa','Jutiapa','Petén',
  'Quetzaltenango','Quiché','Retalhuleu','Sacatepéquez','San Marcos','Santa Rosa',
  'Sololá','Suchitepéquez','Totonicapán','Zacapa'];

export default function CrearPublicacion() {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);

  const [catalogo, setCatalogo] = useState([]);
  const [form, setForm] = useState({
    producto_id:'', titulo:'', descripcion:'',
    cantidad_disponible:'', precio_unitario:'', unidad_medida:'quintal',
    municipio:'', departamento:'', imagen_url:'',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/productos').then(r => setCatalogo(r.data?.data ?? mockCatalogo())).catch(() => setCatalogo(mockCatalogo()));
    if (esEdicion) {
      api.get(`/publicaciones/${id}`)
        .then(r => { const d = r.data?.data ?? {}; setForm({ ...form, ...d, producto_id: d.producto_id ?? '' }); })
        .catch(() => {});
    }
  }, []);

  function mockCatalogo() {
    return [
      { id:1, nombre:'Maíz', unidad_medida:'quintal' },
      { id:2, nombre:'Frijol', unidad_medida:'quintal' },
      { id:3, nombre:'Tomate', unidad_medida:'caja' },
      { id:4, nombre:'Papa', unidad_medida:'quintal' },
      { id:5, nombre:'Aguacate', unidad_medida:'caja' },
      { id:6, nombre:'Chile', unidad_medida:'caja' },
      { id:7, nombre:'Güicoy', unidad_medida:'caja' },
      { id:8, nombre:'Zanahoria', unidad_medida:'libra' },
    ];
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'producto_id') {
      const prod = catalogo.find(p => p.id === Number(value));
      if (prod) setForm(prev => ({ ...prev, producto_id: value, unidad_medida: prod.unidad_medida }));
    }
  }

  function validate() {
    const e = {};
    if (!form.producto_id) e.producto_id = 'Selecciona un producto';
    if (!form.titulo.trim()) e.titulo = 'El título es requerido';
    if (!form.cantidad_disponible || Number(form.cantidad_disponible) <= 0)
      e.cantidad_disponible = 'Ingresa una cantidad válida';
    if (!form.precio_unitario || Number(form.precio_unitario) <= 0)
      e.precio_unitario = 'Ingresa un precio válido';
    if (!form.unidad_medida) e.unidad_medida = 'Selecciona una unidad';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, producto_id: Number(form.producto_id),
        cantidad_disponible: Number(form.cantidad_disponible),
        precio_unitario: Number(form.precio_unitario) };
      if (esEdicion) {
        await api.put(`/publicaciones/${id}`, payload);
      } else {
        await api.post('/publicaciones', payload);
      }
      setSuccess(true);
      setTimeout(() => navigate('/mis-publicaciones'), 1500);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  }

  return (
    <div className="animate-fade-in-up" style={{ maxWidth:760, margin:'0 auto' }}>
      <div className="page-header">
        <div>
          <h1>{esEdicion ? ' Editar publicación' : ' Nueva publicación'}</h1>
          <p className="text-muted">
            {esEdicion ? 'Modifica los datos de tu oferta' : 'Publica tu oferta y llega a compradores de todo el país'}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}> Volver</button>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom:'var(--sp-5)' }}>
          Publicación {esEdicion ? 'actualizada' : 'creada'} correctamente. Redirigiendo...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
          <div className="card-header">
            <h4>1. Información del producto</h4>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Producto <span>*</span></label>
                <select className="form-select" name="producto_id" value={form.producto_id} onChange={handleChange}>
                  <option value="">— Selecciona un producto —</option>
                  {catalogo.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {errors.producto_id && <p className="form-error">{errors.producto_id}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Título de la publicación <span>*</span></label>
                <input className="form-input" name="titulo" value={form.titulo} onChange={handleChange}
                  placeholder="Ej: Maíz blanco primera calidad" />
                {errors.titulo && <p className="form-error">{errors.titulo}</p>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea className="form-textarea" name="descripcion" value={form.descripcion} onChange={handleChange}
                placeholder="Describe la calidad, variedad, condiciones de almacenamiento, etc." rows={3} />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
          <div className="card-header"><h4>2. Precio y disponibilidad</h4></div>
          <div className="card-body">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'var(--sp-5)' }}>
              <div className="form-group">
                <label className="form-label">Precio unitario (Q) <span>*</span></label>
                <div className="input-group">
                  <span className="input-prefix">Q</span>
                  <input className="form-input" type="number" name="precio_unitario" min="0" step="0.01"
                    value={form.precio_unitario} onChange={handleChange} placeholder="0.00" />
                </div>
                {errors.precio_unitario && <p className="form-error">{errors.precio_unitario}</p>}
              </div>
         <div className="form-group"> {/* Inconsistencia 1: Se me fue un tabulador hacia atrás aquí */}
           <label className="form-label">Cantidad disponible <span>*</span></label>
           <input className="form-input" type="number" name="cantidad_disponible" min="1"
             value={form.cantidad_disponible} onChange={handleChange} placeholder="0" />
           {errors.cantidad_disponible && <p className="form-error">{errors.cantidad_disponible}</p>}
         </div>
              <div className="form-group">
                <label className="form-label">Unidad de medida <span>*</span></label>
                <select className="form-select" name="unidad_medida" value={form.unidad_medida} onChange={handleChange}>
                  {UNIDADES.map(u => <option key={u}>{u}</option>)}
                </select>
                {errors.unidad_medida && <p className="form-error">{errors.unidad_medida}</p>}
              </div>
            </div>

            {form.precio_unitario && form.cantidad_disponible && (
              <div style={{
                background:'var(--verde-50)', border:'1px solid var(--verde-100)',
                borderRadius:'var(--radius)', padding:'var(--sp-4)',
                display:'flex', alignItems:'center', gap:'var(--sp-3)',
              }}>
                <span style={{ fontSize:'1.5rem' }}></span>
                <div>
                  <span style={{ color:'var(--gris-500)', fontSize: '.875rem' }}>Valor total estimado: </span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', fontWeight:700, color:'var(--verde-800)' }}>
                    Q{(Number(form.precio_unitario) * Number(form.cantidad_disponible)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
          <div className="card-header"><h4>3. Ubicación</h4></div>
          <div className="card-body">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Departamento</label>
                <select className="form-select" name="departamento" value={form.departamento} onChange={handleChange}>
                  <option value="">— Selecciona —</option>
                  {DEPTOS.map(d=> <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Municipio</label>
                <input className="form-input" name="municipio" value={form.municipio} onChange={handleChange}
                  placeholder="Ej: Chiquimula" />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom:'var(--sp-6)' }}>
          <div className="card-header"><h4>4. Información adicional</h4></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">URL de imagen</label>
              <input className="form-input" name="imagen_url" value={form.imagen_url} onChange={handleChange}
                placeholder="https://..." />
              <p className="form-hint">Enlace a una foto del producto (opcional)</p>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:'var(--sp-3)' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? ' Guardando...' : esEdicion ? ' Guardar cambios' : ' Publicar oferta'}
          </button>
        </div>
      </form>
    </div>
  );
}

