import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { ListSkeleton } from '../components/skeletons';
import { useModalA11y } from '../hooks/useModalA11y';
import api from '../api/client';
import { Truck, CheckCircle, XCircle, Clock, AlertTriangle, User, MapPin, Star } from 'lucide-react';

const ESTADO_CFG = {
  pendiente: { badge: 'badge-oro', label: 'Pendiente', icon: <Clock size={16} /> },
  en_transito: { badge: 'badge-azul', label: 'En tránsito', icon: <Truck size={16} /> },
  entregado: { badge: 'badge-verde', label: 'Entregado', icon: <CheckCircle size={16} /> },
  con_problema: { badge: 'badge-rojo', label: 'Con problema', icon: <AlertTriangle size={16} /> },
};

function normalizeEntrega(e, user) {
  const isProductor = user?.rol === 'productor';
  const confirmaciones = e.confirmaciones ?? [];
  const productorUserId = e.negociacion?.productor?.usuario_id;
  const compradorUserId = e.negociacion?.comprador?.usuario_id;
  const confirmacion_productor = e.confirmacion_productor ?? confirmaciones.some(c => c.usuario_id === productorUserId || c.rol_confirmador === 'productor');
  const confirmacion_comprador = e.confirmacion_comprador ?? confirmaciones.some(c => c.usuario_id === compradorUserId || c.rol_confirmador === 'comprador');
  const contraparte = isProductor
    ? e.negociacion?.comprador?.usuario?.nombre
    : e.negociacion?.productor?.usuario?.nombre;

  return {
    ...e,
    titulo: e.negociacion?.publicacion?.titulo ?? e.titulo ?? 'Entrega',
    contraparte: contraparte ?? e.contraparte ?? 'Contraparte',
    fecha_programada: e.fecha_programada ? String(e.fecha_programada).slice(0, 10) : '',
    confirmacion_productor,
    confirmacion_comprador,
  };
}

export default function Entregas() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isProductor = user?.rol === 'productor';
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confError, setConfError] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [modalConf, setModalConf] = useState(null);
  const cerrarModalConf = () => { if (!confirming) setModalConf(null); };
  const modalConfRef = useModalA11y(!!modalConf, cerrarModalConf);
  const [obs, setObs] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [modalEnviar, setModalEnviar] = useState(null);
  const cerrarModalEnviar = () => { if (!confirming) setModalEnviar(null); };
  const modalEnviarRef = useModalA11y(!!modalEnviar, cerrarModalEnviar);
  const [obsEnviar, setObsEnviar] = useState('');
  const [modalRating, setModalRating] = useState(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError('');
    api.get('/entregas', { signal: ac.signal })
      .then(r => setEntregas((r.data?.data ?? []).map(e => normalizeEntrega(e, user))))
      .catch(err => {
        if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return;
        setError(err.response?.data?.message ?? 'No se pudieron cargar las entregas');
        setEntregas([]);
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, []);

  async function confirmar(entregaId) {
    setConfirming(true);
    setConfError('');
    try {
      const res = await api.post(`/entregas/${entregaId}/confirmar`, { observaciones: obs });
      const data = res.data?.data;
      if (data) {
        const updated = normalizeEntrega(data, user);
        setEntregas(prev => prev.map(e => e.id === entregaId ? updated : e));
        if (updated.estado === 'entregado') {
          setModalRating({
            negociacion_id: updated.negociacion_id,
            titulo: updated.titulo,
            contraparte: updated.contraparte,
          });
        }
      }
      setModalConf(null); setObs('');
    } catch (err) {
      setConfError(err.response?.data?.message ?? 'No se pudo confirmar la entrega');
    } finally { setConfirming(false); }
  }

  async function enviarCalificacion() {
    if (!modalRating || ratingScore < 1) {
      setRatingError('Selecciona una calificación de 1 a 5 estrellas');
      return;
    }
    setRatingSaving(true);
    setRatingError('');
    try {
      await api.post(`/negociaciones/${modalRating.negociacion_id}/calificar`, {
        puntaje: ratingScore,
        comentario: ratingComment,
      });
      setModalRating(null);
      setRatingScore(0);
      setRatingComment('');
    } catch (err) {
      setRatingError(err.response?.data?.message ?? 'No se pudo enviar la calificación');
    } finally { setRatingSaving(false); }
  }

  async function marcarEnviado(entregaId, observaciones) {
    setMarkingId(entregaId);
    setConfError('');
    try {
      const payload = { estado: 'en_transito' };
      if (observaciones) payload.notas = observaciones;
      const res = await api.put(`/entregas/${entregaId}`, payload);
      setEntregas(prev => prev.map(e => e.id === entregaId ? { ...e, estado: res.data?.data?.estado ?? 'en_transito', confirmacion_productor: true } : e));
    } catch (err) {
      setConfError(err.response?.data?.message ?? 'No se pudo marcar como enviado');
    } finally { setMarkingId(null); }
  }

  const filtradas = useMemo(() => filtro === 'Todos' ? entregas : entregas.filter(e => e.estado === filtro), [entregas, filtro]);
  const pag = usePagination(filtradas, 10);
  if (loading) return <ListSkeleton count={4} />;

  return (
    <div className="animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1>Entregas</h1>
          <p className="text-muted">{entregas.length} entrega{entregas.length !== 1 ? 's' : ''} registrada{entregas.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-5)' }}>{error}</div>}
      {confError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{confError}</div>}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
        {['Todos', 'pendiente', 'en_transito', 'entregado', 'con_problema'].map(e => (
          <button key={e} className={filtro === e ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
         onClick={() => { setFiltro(e); pag.reset(); }}>
            {e === 'Todos' ? 'Todas' : ESTADO_CFG[e]?.label ?? e}
          </button>
        ))}
      </div>

      {filtradas.length === 0
        ? <div className="empty-state card" style={{ padding: 'var(--sp-16)' }}>
            <Truck size={48} style={{ color: 'var(--gris-300)', marginBottom: 'var(--sp-4)' }} />
            <h3>Sin entregas</h3>
            <p>Las entregas aparecerán aquí cuando tengas negociaciones aceptadas</p>
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {pag.pageItems.map(e => {
              const cfg = ESTADO_CFG[e.estado] ?? { badge: 'badge-gris', label: e.estado, icon: null };
              const yoConfirm = isProductor ? e.confirmacion_productor : e.confirmacion_comprador;
              const elConfirm = isProductor ? e.confirmacion_comprador : e.confirmacion_productor;
              return (
                <div key={e.id} className="card">
                  <div style={{ padding: 'var(--sp-5) var(--sp-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-1)' }}>
                          {cfg.icon}
                          <h4 style={{ margin: 0 }}>{e.titulo}</h4>
                        </div>
                        <div style={{ fontSize: '.875rem', color: 'var(--gris-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} /> {e.contraparte} · {e.fecha_programada}
                        </div>
                        {e.lugar_entrega && (
                          <div style={{ fontSize: '.875rem', color: 'var(--gris-500)', marginTop: 'var(--sp-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} /> {e.lugar_entrega}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${cfg.badge}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>

                    <div style={{ background: 'var(--gris-50)', borderRadius: 'var(--radius)', padding: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
                      <ConfirmBadge label="Productor" done={e.confirmacion_productor} />
                      <ConfirmBadge label="Comprador" done={e.confirmacion_comprador} />
                      {e.confirmacion_productor && e.confirmacion_comprador
                        ? <span style={{ color: 'var(--verde-700)', fontWeight: 600, fontSize: '.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={14} /> Entrega completada
                          </span>
                        : <span style={{ color: 'var(--gris-500)', fontSize: '.875rem' }}>
                            Se necesitan ambas confirmaciones
                          </span>
                      }
                    </div>

                    {e.estado !== 'entregado' && (
                      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
                        {isProductor && e.estado === 'pendiente' && (
                          <button className="btn btn-oro btn-sm" onClick={() => { setModalEnviar(e); setObsEnviar(''); }}
                            disabled={markingId === e.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Truck size={14} /> {markingId === e.id ? 'Marcando...' : 'Marcar como enviado'}
                          </button>
                        )}
                        {!yoConfirm && !isProductor && e.estado !== 'pendiente' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setModalConf(e)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={14} /> Confirmar entrega
                          </button>
                        )}
                        {isProductor && e.estado === 'en_transito' && (
                          <div className="alert alert-info" style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: '.875rem' }}>
                            <Clock size={14} style={{ marginRight: 6 }} />
                            Esperando confirmación de recibido por el comprador
                          </div>
                        )}
                        {!isProductor && yoConfirm && !elConfirm && e.estado !== 'pendiente' && (
                          <div className="alert alert-info" style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: '.875rem' }}>
                            Esperando confirmación de la otra parte
                          </div>
                        )}
                        {e.estado === 'pendiente' && !isProductor && (
                          <div className="alert alert-info" style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: '.875rem' }}>
                            Esperando que el productor marque el envío
                          </div>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/negociaciones/${e.negociacion_id}`)}>
                          Ver negociación
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <Pagination page={pag.page} totalPages={pag.totalPages} total={pag.total}
              onPrev={pag.prev} onNext={pag.next} onSetPage={pag.setPage} label="entregas" />
          </div>
      }

      {modalConf && (
        <div className="modal-overlay" onClick={cerrarModalConf}>
          <div className="modal" onClick={ev => ev.stopPropagation()} ref={modalConfRef}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} /> Confirmar entrega</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalConf} disabled={confirming}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--sp-4)', color: 'var(--gris-700)' }}>
                Estás confirmando la entrega de <strong>{modalConf.titulo}</strong>. Esta acción no se puede deshacer.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observaciones (opcional)</label>
            <textarea className="form-textarea" rows={3} value={obs} onChange={e=>setObs(e.target.value)}
              placeholder="Todo correcto, producto en buen estado..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalConf} disabled={confirming}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => confirmar(modalConf.id)} disabled={confirming}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={15} /> {confirming ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRating && (
        <div className="modal-overlay" onClick={() => !ratingSaving && setModalRating(null)}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Star size={18} /> Calificar contraparte</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModalRating(null)} disabled={ratingSaving}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--sp-4)', color: 'var(--gris-700)' }}>
                Califica a <strong>{modalRating.contraparte}</strong> por la entrega de <strong>{modalRating.titulo}</strong>.
              </p>
              {ratingError && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>{ratingError}</div>}
              <div className="form-group">
                <label className="form-label">Calificación <span style={{ color: 'var(--rojo)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setRatingScore(score)}
                      aria-label={`${score} estrella${score !== 1 ? 's' : ''}`}
                      style={{ color: score <= ratingScore ? '#F59E0B' : 'var(--gris-300)', padding: '6px 8px' }}>
                      <Star size={26} fill={score <= ratingScore ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Comentario (opcional)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  placeholder="Describe cómo fue la experiencia..." />
              </div>
              <p className="form-hint" style={{ marginTop: 'var(--sp-3)' }}>
                La calificación quedará pendiente de revisión por la asociación.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalRating(null)} disabled={ratingSaving}>Omitir</button>
              <button className="btn btn-primary" onClick={enviarCalificacion} disabled={ratingSaving || ratingScore < 1}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={15} /> {ratingSaving ? 'Enviando...' : 'Enviar calificación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal marcar como enviado */}
      {modalEnviar && (
        <div className="modal-overlay" onClick={cerrarModalEnviar}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={modalEnviarRef} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Truck size={18} /> Marcar como enviado</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarModalEnviar} disabled={markingId}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--gris-700)' }}>
                Marcarás el envío de <strong>{modalEnviar.titulo}</strong>, esta acción no podrá deshacerse.
              </p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Referencia o descripción de la entrega</label>
                <textarea className="form-textarea" rows={3} value={obsEnviar}
                  onChange={e => setObsEnviar(e.target.value)}
                  placeholder="Número de guía, transportista, punto de entrega..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarModalEnviar} disabled={markingId}>Cancelar</button>
              <button className="btn btn-oro" onClick={() => { marcarEnviado(modalEnviar.id, obsEnviar); setModalEnviar(null); setObsEnviar(''); }}
                disabled={markingId}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Truck size={15} /> Realizar envío
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfirmBadge({ label, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
      {done
        ? <CheckCircle size={18} style={{ color: 'var(--verde-700)' }} />
        : <XCircle size={18} style={{ color: 'var(--gris-400)' }} />
      }
    <span style={{ fontSize: '.875rem', fontWeight: 500, color: done ? 'var(--verde-800)' : 'var(--gris-500)' }}>
      {label}
    </span>
    </div>
  );
}

