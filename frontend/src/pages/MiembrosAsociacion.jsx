import { useEffect, useState } from 'react';
import api from '../api/client';
import {
  UserPlus, Users, Phone, Star, Link2, Unlink, Package, Handshake,
  Ban, CheckCircle, XCircle
} from 'lucide-react';

function initials(nombre = 'P') {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function badgeSuspension(m) {
  if (m.suspendido_definitivo) return { label:'Suspendido definitivo', cls:'badge-susp-def' };
  if (m.suspendido_hasta && new Date(m.suspendido_hasta) > new Date())
    return { label:'Suspendido hasta ' + new Date(m.suspendido_hasta).toLocaleDateString(), cls:'badge-susp-temp' };
  return null;
}

export default function MiembrosAsociacion() {
  const [miembros, setMiembros] = useState([]);
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [tab, setTab] = useState('miembros');
  const [calPendientes, setCalPendientes] = useState([]);
  const [loadingCal, setLoadingCal] = useState(false);

  const [suspender, setSuspender] = useState(null);
  const [suspTemporal, setSuspTemporal] = useState(true);
  const [suspDias, setSuspDias] = useState(7);
  const [suspMotivo, setSuspMotivo] = useState('');
  const [suspSaving, setSuspSaving] = useState(false);

  function formatTelefono(val) {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return digits.slice(0, 4) + '-' + digits.slice(4);
    return digits;
  }

  async function cargar() {
    setLoading(true);
    try {
      const res = await api.get('/asociaciones/miembros');
      setMiembros(res.data?.data ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudieron cargar los productores');
    } finally {
      setLoading(false);
    }
  }

  async function cargarCalPendientes() {
    setLoadingCal(true);
    try {
      const res = await api.get('/asociaciones/calificaciones/pendientes');
      setCalPendientes(res.data?.data ?? []);
    } catch {
      setCalPendientes([]);
    } finally {
      setLoadingCal(false);
    }
  }

  useEffect(() => {
    cargar();
    cargarCalPendientes();
  }, []);

  async function vincular(e) {
    e.preventDefault();
    setMsg(''); setError('');
    if (!/^\d{4}-\d{4}$/.test(telefono)) {
      setError('Ingresa un teléfono válido, por ejemplo 4000-0001.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/asociaciones/miembros', { telefono });
      setMsg(res.data?.message ?? 'Productor vinculado');
      setTelefono('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo vincular el productor');
    } finally {
      setSaving(false);
    }
  }

  async function remover(id) {
    if (!confirm('¿Quitar este productor de la asociación?')) return;
    setMsg(''); setError('');
    try {
      await api.delete('/asociaciones/miembros/' + id);
      setMsg('Productor removido de la asociación');
      setMiembros(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo remover el productor');
    }
  }

  async function confirmarSuspender() {
    if (!suspMotivo.trim()) { setError('Debes indicar un motivo de suspensión'); return; }
    setSuspSaving(true); setError('');
    try {
      await api.put('/asociaciones/miembros/suspender/' + suspender.id, {
        temporal: suspTemporal,
        dias: suspTemporal ? suspDias : undefined,
        motivo: suspMotivo,
      });
      setMsg(suspTemporal ? `Productor suspendido por ${suspDias} día(s)` : 'Productor suspendido definitivamente');
      setSuspender(null);
      setSuspMotivo('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al suspender');
    } finally {
      setSuspSaving(false);
    }
  }

  async function reactivar(id) {
    if (!confirm('¿Reactivar este productor?')) return;
    setError(''); setMsg('');
    try {
      await api.put('/asociaciones/miembros/reactivar/' + id);
      setMsg('Productor reactivado');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al reactivar');
    }
  }

  async function aprobarCal(id) {
    try {
      await api.put('/asociaciones/calificaciones/' + id + '/aprobar');
      setCalPendientes(prev => prev.filter(c => c.id !== id));
      setMsg('Calificación aprobada');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al aprobar');
    }
  }

  async function rechazarCal(id) {
    const motivo = prompt('Motivo del rechazo (opcional):');
    try {
      await api.put('/asociaciones/calificaciones/' + id + '/rechazar', { motivo: motivo || '' });
      setCalPendientes(prev => prev.filter(c => c.id !== id));
      setMsg('Calificación rechazada');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al rechazar');
    }
  }

  const publicaciones = miembros.reduce((sum, m) => sum + (m._count?.publicaciones ?? 0), 0);
  const negociaciones = miembros.reduce((sum, m) => sum + (m._count?.negociaciones ?? 0), 0);

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="assoc-members-hero">
        <div>
          <span className="eyebrow">Red de productores</span>
          <h1>Productores miembros</h1>
          <p>Administra la red de productores vinculados a tu asociación y supervisa su actividad comercial.</p>
        </div>
        <div className="assoc-members-summary">
          <strong>{miembros.length}</strong>
          <span>miembros activos</span>
        </div>
      </div>

      <div className="dashboard-kpi-strip assoc-strip">
        <div><Users size={18}/><strong>{miembros.length}</strong><span>Productores</span></div>
        <div><Package size={18}/><strong>{publicaciones}</strong><span>Publicaciones</span></div>
        <div><Handshake size={18}/><strong>{negociaciones}</strong><span>Negociaciones</span></div>
      </div>

      <div className="assoc-tab-bar">
        <button className={'assoc-tab' + (tab === 'miembros' ? ' active' : '')} onClick={() => setTab('miembros')}>
          <Users size={16}/> Miembros
        </button>
        <button className={'assoc-tab' + (tab === 'calificaciones' ? ' active' : '')} onClick={() => { setTab('calificaciones'); cargarCalPendientes(); }}>
          <Star size={16}/> Calificaciones pendientes
          {calPendientes.length > 0 && <span className="assoc-tab-badge">{calPendientes.length}</span>}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'miembros' && (
        <div className="assoc-members-layout">
          <form className="assoc-link-panel" onSubmit={vincular}>
            <div className="assoc-link-icon"><UserPlus size={22}/></div>
            <h3>Vincular productor</h3>
            <p>Usa el teléfono de una cuenta de productor ya registrada para sumarla a la asociación.</p>
            <label className="form-label">Teléfono del productor</label>
            <div className="input-icon-wrap">
              <Phone size={17}/>
              <input className="form-input" placeholder="4000-0001" maxLength={9} value={telefono} onChange={e => setTelefono(formatTelefono(e.target.value))}/>
            </div>
            <button className="btn btn-primary btn-full" disabled={saving}>
              <Link2 size={15}/> {saving ? 'Vinculando...' : 'Vincular productor'}
            </button>
          </form>

          <div className="assoc-member-list">
            {loading ? <div className="loader-wrap"><div className="spinner" /></div> : miembros.length === 0 ? (
              <div className="empty-state">
                <Users size={42}/>
                <h3>Sin productores vinculados</h3>
                <p>Vincula el primer productor usando su número de teléfono.</p>
              </div>
            ) : miembros.map(m => {
              const nombre = m.usuario?.nombre ?? 'Productor';
              const susp = badgeSuspension(m);
              return (
                <div className={'assoc-member-card' + (susp ? ' is-suspended' : '')} key={m.id}>
                  <div className="assoc-member-avatar">{initials(nombre)}</div>
                  <div className="assoc-member-main">
                    <div className="assoc-member-topline">
                      <h3>{nombre}</h3>
                      <span className="assoc-member-rating"><Star size={12} fill="currentColor"/> {Number(m.calificacion ?? 0).toFixed(1)}</span>
                    </div>
                    <p>{m.municipio ?? 'Municipio no definido'}, {m.departamento ?? 'Departamento no definido'}</p>
                    <div className="assoc-member-metrics">
                      <span>{m.usuario?.telefono}</span>
                      <span>{m._count?.publicaciones ?? 0} publicaciones</span>
                      <span>{m._count?.negociaciones ?? 0} negociaciones</span>
                      {susp && <span className={susp.cls}><Ban size={12}/> {susp.label}</span>}
                    </div>
                  </div>
                  <div className="assoc-member-actions">
                    {susp ? (
                      <button type="button" className="btn btn-sm btn-success" onClick={() => reactivar(m.id)} title="Reactivar">
                        <CheckCircle size={14}/> Reactivar
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-warning" onClick={() => setSuspender(m)} title="Suspender">
                        <Ban size={14}/> Suspender
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remover(m.id)} title="Quitar de asociación">
                      <Unlink size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'calificaciones' && (
        <div className="assoc-cal-list">
          <h2>Calificaciones pendientes de moderación</h2>
          <p className="assoc-cal-sub">Revisa y aprueba o rechaza las calificaciones que productores y compradores se han otorgado mutuamente.</p>
          {loadingCal ? <div className="loader-wrap"><div className="spinner" /></div> : calPendientes.length === 0 ? (
            <div className="empty-state">
              <Star size={42}/>
              <h3>Sin calificaciones pendientes</h3>
              <p>Todas las calificaciones han sido revisadas.</p>
            </div>
          ) : (
            <div className="assoc-cal-grid">
              {calPendientes.map(c => (
                <div className="assoc-cal-card" key={c.id}>
                  <div className="assoc-cal-head">
                    <strong>{c.evaluador?.nombre}</strong>
                    <span className="assoc-cal-rol">{c.evaluador?.rol}</span>
                    <span className="assoc-cal-arrow">→</span>
                    <strong>{c.evaluado?.nombre}</strong>
                    <span className="assoc-cal-rol">{c.evaluado?.rol}</span>
                  </div>
                  <div className="assoc-cal-score">{c.puntaje}/5</div>
                  {c.comentario && <p className="assoc-cal-comment">"{c.comentario}"</p>}
                  <div className="assoc-cal-actions">
                    <button className="btn btn-sm btn-success" onClick={() => aprobarCal(c.id)}>
                      <CheckCircle size={14}/> Aprobar
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => rechazarCal(c.id)}>
                      <XCircle size={14}/> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal de suspensión ─────────────────────────────── */}
      {suspender && (
        <div className="modal-overlay" onClick={() => setSuspender(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Ban size={18}/> Suspender a {suspender.usuario?.nombre}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSuspender(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Tipo de suspensión</label>
                <div className="assoc-susp-type">
                  <label className="radio-label">
                    <input type="radio" checked={suspTemporal} onChange={() => setSuspTemporal(true)}/>
                    Temporal
                  </label>
                  <label className="radio-label">
                    <input type="radio" checked={!suspTemporal} onChange={() => setSuspTemporal(false)}/>
                    Definitiva
                  </label>
                </div>
              </div>
              {suspTemporal && (
                <div className="form-group">
                  <label className="form-label">Días de suspensión</label>
                  <input className="form-input" type="number" min={1} max={365} value={suspDias} onChange={e => setSuspDias(Number(e.target.value))}/>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Motivo de la suspensión</label>
                <textarea className="form-input" rows={3} value={suspMotivo} onChange={e => setSuspMotivo(e.target.value)} placeholder="Describe el motivo..."/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSuspender(null)}>Cancelar</button>
              <button className="btn btn-danger" disabled={suspSaving} onClick={confirmarSuspender}>
                <Ban size={16}/> {suspSaving ? 'Suspendiendo...' : 'Suspender'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
