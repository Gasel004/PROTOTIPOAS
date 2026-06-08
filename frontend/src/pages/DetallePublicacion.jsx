import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { getFullImageUrl } from '../api/utils';
import { useModalA11y } from '../hooks/useModalA11y';



function normalizePub(p) {
  return {
    ...p,
    producto: p.producto?.nombre ?? p.producto ?? 'Producto',
    categoria: p.producto?.categoria ?? p.categoria ?? '',
    precio_unitario: Number(p.precio_unitario ?? 0),
    cantidad_disponible: Number(p.cantidad_disponible ?? 0),
    fecha_cosecha: p.fecha_cosecha ? String(p.fecha_cosecha).slice(0, 10) : p.fecha_cosecha,
    productor: {
      id: p.productor?.id,
      nombre: p.productor?.usuario?.nombre ?? p.productor?.nombre ?? 'Productor',
      municipio: p.productor?.municipio ?? p.municipio ?? '',
      departamento: p.productor?.departamento ?? p.departamento ?? '',
      calificacion: Number(p.productor?.calificacion ?? 0),
      publicaciones: p.productor?.publicaciones ?? '—',
      negociaciones_completadas: p.productor?.negociaciones_completadas ?? '—',
    },
  };
}

export default function DetallePublicacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isGuest = !user;                          // visitante sin sesión
  const isPublicRoute = location.pathname.startsWith('/catalogo-publico');
  const isComprador = user?.rol === 'comprador';

  const [pub, setPub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modalNeg, setModalNeg] = useState(false);
  const cerrarModalNeg = () => { if (!sending) setModalNeg(false); };
  const modalNegRef = useModalA11y(modalNeg, cerrarModalNeg);
  const [negForm, setNegForm] = useState({ cantidad_solicitada: '', precio_propuesto: '', condiciones: '' });
  const [negFormError, setNegFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [negOk, setNegOk] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setLoadError('');
    api.get(`/publicaciones/${id}`, { signal: ac.signal })
      .then(r => setPub(r.data?.data ? normalizePub(r.data.data) : null))
      .catch(err => {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setLoadError(err.response?.data?.message ?? 'No se pudo cargar la publicación');
        setPub(null);
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => { ac.abort(); if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [id]);

  function abrirModalNeg() {
    setNegForm({ cantidad_solicitada: '', precio_propuesto: '', condiciones: '' });
    setNegFormError('');
    setSendError('');
    setNegOk(false);
    setModalNeg(true);
  }

  async function iniciarNegociacion(e) {
    e.preventDefault();
    if (!negForm.cantidad_solicitada || Number(negForm.cantidad_solicitada) <= 0) {
      setNegFormError('Ingresa una cantidad válida');
      return;
    }
    if (Number(negForm.cantidad_solicitada) > pub.cantidad_disponible) {
      setNegFormError('La cantidad solicitada supera el disponible');
      return;
    }
    const precioPropuesto = negForm.precio_propuesto ? Number(negForm.precio_propuesto) : undefined;
    if (precioPropuesto !== undefined && (!Number.isFinite(precioPropuesto) || precioPropuesto <= 0)) {
      setNegFormError('Ingresa un precio válido mayor a 0');
      return;
    }
    setNegFormError('');
    setSendError('');
    setSending(true);
    try {
      await api.post('/negociaciones', {
        publicacion_id: Number(id),
        cantidad_solicitada: Number(negForm.cantidad_solicitada),
        precio_acordado: precioPropuesto,
        condiciones: negForm.condiciones,
      });
      setNegOk(true);
      timerRef.current = setTimeout(() => { setModalNeg(false); navigate('/negociaciones'); }, 1800);
    } catch (err) {
      setSendError(err.response?.data?.message ?? 'No se pudo iniciar la negociación');
    } finally { setSending(false); }
  }

  if (loading) return <div className="loader-wrap"><div className="spinner" /></div>;
  if (loadError) return <div className="empty-state card"><h3>No se pudo cargar la publicación</h3><p>{loadError}</p></div>;
  if (!pub) return <div className="empty-state"><h3>Publicación no encontrada</h3></div>;

  const total = pub.precio_unitario * pub.cantidad_disponible;

  return (
    <div className="animate-fade-in-up">
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <button className="btn btn-ghost btn-sm"
          onClick={() => isPublicRoute ? navigate('/catalogo-publico') : (window.history.length > 1 ? navigate(-1) : navigate('/publicaciones'))}>
          Volver
        </button>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Columna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {/* Info principal */}
          <div className="card scale-in">
            {pub.imagen_url && (
              <div className="detalle-pub-image-wrap">
                <img
                  src={getFullImageUrl(pub.imagen_url)}
                  alt={pub.titulo}
                  loading="lazy"
                  className="detalle-pub-image"
                />
              </div>
            )}
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
                  [' Cosecha', pub.fecha_cosecha ?? 'No especificada'],
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

              {isGuest ? (
                /* ── Visitante sin sesión ── */
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--gris-600)', fontSize: '.9rem', marginBottom: 'var(--sp-4)', lineHeight: 1.6 }}>
                    Para negociar o comprar este producto necesitas una cuenta.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    <button className="btn btn-primary btn-full btn-lg"
                      onClick={() => navigate('/registro')}>
                      Crear cuenta gratis
                    </button>
                    <button className="btn btn-ghost btn-full"
                      onClick={() => navigate('/login')}>
                      Ya tengo cuenta — Iniciar sesión
                    </button>
                  </div>
                </div>
              ) : isComprador && pub.estado === 'activa' ? (
                <button className="btn btn-primary btn-full btn-lg" onClick={abrirModalNeg}>
                  Iniciar negociación
                </button>
              ) : !isComprador ? (
                <div className="alert alert-info" style={{ textAlign: 'center', fontSize: '.875rem' }}>
                  Solo los compradores pueden iniciar negociaciones
                </div>
              ) : (
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
        <div className="modal-overlay" onClick={cerrarModalNeg}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalNegRef}>
            <div className="modal-header">
              <h3> Iniciar negociación</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cerrarModalNeg} disabled={sending}>✕</button>
            </div>
            {negOk
              ? <div className="modal-body" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}></div>
                <h3>¡Negociación iniciada!</h3>
                <p className="text-muted">El productor recibirá una notificación. Redirigiendo...</p>
              </div>
              : <form onSubmit={iniciarNegociacion} noValidate>
                <div className="modal-body">
                  {sendError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{sendError}</div>}
                  <div className="form-group">
                    <label className="form-label">Cantidad solicitada ({pub.unidad_medida}s) <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <input className="form-input" type="number" min="1" max={pub.cantidad_disponible}
                  value={negForm.cantidad_solicitada}
                  onChange={e => {
                    setNegForm(f => ({ ...f, cantidad_solicitada: e.target.value }));
                    if (negFormError) setNegFormError('');
                  }}
                  placeholder={`Máx: ${pub.cantidad_disponible}`}
                  aria-invalid={negFormError ? 'true' : 'false'} />
                    <p className="form-hint">Disponibles: {pub.cantidad_disponible} {pub.unidad_medida}s</p>
                    {negFormError && <p className="form-error">{negFormError}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tu precio propuesto (Q/{pub.unidad_medida})</label>
                    <div style={{ marginBottom: 'var(--sp-2)', fontSize: '.8125rem', color: 'var(--gris-500)' }}>
                      Precio original de la publicación: <strong style={{ color: 'var(--verde-800)' }}>Q{pub.precio_unitario.toLocaleString()}/{pub.unidad_medida}</strong>
                    </div>
                    <div className="input-group">
                      <span className="input-prefix">Q</span>
                      <input className="form-input" type="number" min="0.01" step="0.01"
                        value={negForm.precio_propuesto}
                        onChange={e => setNegForm(f => ({ ...f, precio_propuesto: e.target.value }))}
                        placeholder={`Precio original: ${pub.precio_unitario}`} />
                    </div>
                    <p className="form-hint">Deja vacío para negociar el precio después</p>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Condiciones iniciales</label>
                    <textarea className="form-textarea" rows={3}
                      value={negForm.condiciones}
                      onChange={e => setNegForm(f => ({ ...f, condiciones: e.target.value }))}
                      placeholder="Pago al contado, recojo en finca, requiero factura..." />
                  </div>
                  {negForm.cantidad_solicitada && !negFormError && (
                    <div className="alert alert-success">
                      {negForm.precio_propuesto
                        ? <>Total con tu precio: <strong>Q{(Number(negForm.precio_propuesto) * Number(negForm.cantidad_solicitada)).toLocaleString()}</strong></>
                        : <>Total al precio original: <strong>Q{(pub.precio_unitario * Number(negForm.cantidad_solicitada)).toLocaleString()}</strong></>
                      }
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={cerrarModalNeg} disabled={sending}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={sending || !!negFormError}>
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

