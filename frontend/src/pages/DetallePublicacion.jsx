import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

const MOCK_PUB = {
  id: 1, titulo: 'Maíz blanco primera calidad', producto: 'Maíz', categoria: 'Granos básicos',
  precio_unitario: 120, unidad_medida: 'quintal', cantidad_disponible: 80,
  municipio: 'Chiquimula', departamento: 'Chiquimula', fecha_cosecha: '2025-04-20',
  descripcion: 'Maíz blanco híbrido H-59, cosecha de temporada lluviosa 2025. Grano grande, bien seco (14% humedad), limpio y seleccionado. Excelente para tortilla y masa.',
  estado: 'activa', created_at: '2025-04-20', emoji: '',
  productor: { id: 5, nombre: 'Cooperativa Agrícola San Luis', municipio: 'Chiquimula', departamento: 'Chiquimula', calificacion: 4.8, publicaciones: 12, negociaciones_completadas: 34 },
};

export default function DetallePublicacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isComprador = user?.rol === 'comprador';

  const [pub, setPub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalNeg, setModalNeg] = useState(false);
  const [negForm, setNegForm] = useState({ cantidad_solicitada: '', condiciones: '' });
  const [sending, setSending] = useState(false);
  const [negOk, setNegOk] = useState(false);

  useEffect(() => {
    api.get(`/publicaciones/${id}`)
      .then(r => setPub(r.data?.data ?? null))
      .catch(() => setPub(MOCK_PUB))
      .finally(() => setLoading(false));
  }, [id]);

  async function iniciarNegociacion(e) {
    e.preventDefault();
    if (!negForm.cantidad_solicitada || Number(negForm.cantidad_solicitada) <= 0) {
      alert('Ingresa una cantidad válida'); return;
    }
    setSending(true);
    try {
      await api.post('/negociaciones', {
        publicacion_id: Number(id),
        cantidad_solicitada: Number(negForm.cantidad_solicitada),
        condiciones: negForm.condiciones,
      });
      setNegOk(true);
      setTimeout(() => { setModalNeg(false); navigate('/negociaciones'); }, 1800);
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al iniciar negociación');
    } finally { setSending(false); }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (!pub) return <div className="empty-state"><h3>Publicación no encontrada</h3></div>;

  const total = pub.precio_unitario * pub.cantidad_disponible;

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}> Volver</button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Columna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Info principal */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                <div>
                  <span className={`badge ${pub.estado === 'activa' ? 'badge-verde' : 'badge-gris'}`} style={{ marginBottom: 'var(--sp-2)' }}>
                    {pub.estado}
                  </span>
                  <h2 style={{ marginBottom: 'var(--sp-1)' }}>{pub.titulo}</h2>
                  <p className="text-muted">{pub.producto} · {pub.categoria}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--verde-800)' }}>
                    Q{pub.precio_unitario.toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>por {pub.unidad_medida}</div>
                </div>
              </div>

              <div className="divider" />

              {/* Detalles en grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
                {[
                  [' Disponible', `${pub.cantidad_disponible} ${pub.unidad_medida}s`],
                  [' Ubicación', `${pub.municipio}, ${pub.departamento}`],
                  [' Cosecha', pub.fecha_harvest ?? 'No especificada'],
                  [' Valor total', `Q${total.toLocaleString()}`],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: '.8rem', color: 'var(--gris-500)', marginBottom: 3 }}>{lbl}</div>
                    <div style={{ fontWeight: 600 }}>{val}</div>
                  </div>
                ))}
              </div>

              {pub.descripcion && <>
                <div className="divider" />
            <div>
              <div style={{ fontSize: '.875rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>Descripción</div>
              <p style={{ color: 'var(--gris-700)', fontSize: '.9375rem', lineHeight: 1.7 }}>{pub.descripcion}</p>
            </div>
              </>}
            </div>
          </div>
        </div>

        {/* Columna lateral */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Card acción */}
          <div className="card">
            <div className="card-body">
              <div style={{ textAlign: 'center', marginBottom: 'var(--sp-5)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--verde-800)' }}>
                  Q{pub.precio_unitario.toLocaleString()}
                </div>
                <div style={{ color: 'var(--gris-500)' }}>por {pub.unidad_medida}</div>
                <div style={{ fontSize: '.875rem', color: 'var(--verde-700)', marginTop: 'var(--sp-2)' }}>
                  {pub.cantidad_disponible} {pub.unidad_medida}s disponibles
                </div>
              </div>

              {isComprador && pub.estado === 'activa' && (
                <button className="btn btn-primary btn-full btn-lg" onClick={() => setModalNeg(true)}>
                  Iniciar negociación
                </button>
              )}
              {!isComprador && (
                <div className="alert alert-info" style={{ textAlign: 'center', fontSize: '.875rem' }}>
                  Solo los compradores pueden iniciar negociaciones
                </div>
              )}
              {pub.estado !== 'activa' && (
                <div className="alert alert-warn" style={{ textAlign: 'center' }}>
                  Esta publicación no está disponible
                </div>
              )}
            </div>
          </div>

          {/* Card productor */}
          <div className="card">
            <div className="card-header"><h4> Sobre el productor</h4></div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 'var(--radius-full)',
                  background: 'var(--verde-800)', color: 'var(--blanco)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.375rem', fontWeight: 700,
                }}>
                  {pub.productor?.nombre?.[0] ?? 'P'}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{pub.productor?.nombre}</div>
                  <div style={{ fontSize: '.875rem', color: 'var(--gris-500)' }}>
                    {pub.productor?.municipio}, {pub.productor?.departamento}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                {[
                  [' Calificación', `${pub.productor?.calificacion}/5`],
                  [' Publicaciones', pub.productor?.publicaciones],
                  [' Entregas completadas', pub.productor?.negociaciones_completadas],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ background: 'var(--gris-50)', borderRadius: 'var(--radius)', padding: 'var(--sp-3)' }}>
                    <div style={{ fontSize: '.75rem', color: 'var(--gris-500)' }}>{lbl}</div>
                    <div style={{ fontWeight: 700, color: 'var(--verde-800)', marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal negociación */}
      {modalNeg && (
        <div className="modal-overlay" onClick={() => !sending && setModalNeg(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3> Iniciar negociación</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalNeg(false)} disabled={sending}></button>
            </div>
            {negOk
              ? <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}></div>
                <h3>¡Negociación iniciada!</h3>
                <p className="text-muted">El productor recibirá una notificación. Redirigiendo...</p>
              </div>
              : <form onSubmit={iniciarNegociacion}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Cantidad solicitada ({pub.unidad_medida}s) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <input className="form-input" type="number" min="1" max={pub.cantidad_disponible}
                  value={negForm.cantidad_solicitada}
                  onChange={e=>setNegForm(f => ({ ...f, cantidad_solicitada: e.target.value }))}
                  placeholder={`Máx: ${pub.cantidad_disponible}`} />
                    <p className="form-hint">Disponibles: {pub.cantidad_disponible} {pub.unidad_medida}s</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condiciones iniciales</label>
                    <textarea className="form-textarea" rows={3}
                      value={negForm.condiciones}
                      onChange={e => setNegForm(f => ({ ...f, condiciones: e.target.value }))}
                      placeholder="Pago al contado, recojo en finca, requiero factura..." />
                  </div>
                  {negForm.cantidad_solicitada && (
                    <div className="alert alert-success">
                      Total estimado: <strong>Q{(pub.precio_unitario * Number(negForm.cantidad_solicitada)).toLocaleString()}</strong>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalNeg(false)} disabled={sending}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? ' Enviando...' : ' Enviar solicitud'}
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      )}
    </div>
  );
}


