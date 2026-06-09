import { useEffect, useState } from 'react';
import api from '../api/client';
import { useModalA11y } from '../hooks/useModalA11y';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  UserPlus, Users, Phone, Star, Link2, Unlink, Package, Handshake,
  Ban, CheckCircle, XCircle, Shield, ShoppingBag
} from 'lucide-react';

function initials(nombre = 'P') {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function badgeSuspension(entity) {
  if (entity.suspendido_definitivo) return { label: 'Suspendido definitivo', cls: 'badge-susp-def' };
  if (entity.suspendido_hasta && new Date(entity.suspendido_hasta) > new Date())
    return { label: 'Suspendido hasta ' + new Date(entity.suspendido_hasta).toLocaleDateString(), cls: 'badge-susp-temp' };
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

  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const busquedaDebounced = useDebouncedValue(filtroBusqueda, 350);

  const [confirmRemove, setConfirmRemove] = useState(null);
  const cerrarConfirmRemove = () => { if (!removerSaving) setConfirmRemove(null); };
  const confirmRemoveRef = useModalA11y(!!confirmRemove, cerrarConfirmRemove);

  const [confirmReactivar, setConfirmReactivar] = useState(null);
  const cerrarConfirmReactivar = () => { if (!reactivarSaving) setConfirmReactivar(null); };
  const confirmReactivarRef = useModalA11y(!!confirmReactivar, cerrarConfirmReactivar);

  const [rechazoCal, setRechazoCal] = useState(null);
  const cerrarRechazoCal = () => { if (!rechazoSaving) setRechazoCal(null); };
  const rechazoCalRef = useModalA11y(!!rechazoCal, cerrarRechazoCal);
  const [rechazoMotivo, setRechazoMotivo] = useState('');
  const [rechazoSaving, setRechazoSaving] = useState(false);
  const [reactivarSaving, setReactivarSaving] = useState(false);
  const [removerSaving, setRemoverSaving] = useState(false);

  const [suspender, setSuspender] = useState(null);
  const cerrarSuspender = () => { if (!suspSaving) setSuspender(null); };
  const suspenderRef = useModalA11y(!!suspender, cerrarSuspender);
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
    } finally { setLoading(false); }
  }

  async function cargarCalPendientes() {
    setLoadingCal(true);
    try {
      const res = await api.get('/asociaciones/calificaciones/pendientes');
      setCalPendientes(res.data?.data ?? []);
    } catch { setCalPendientes([]); }
    finally { setLoadingCal(false); }
  }

  async function cargarUsuarios() {
    setLoadingUsuarios(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroBusqueda) params.set('busqueda', filtroBusqueda);
      const res = await api.get('/asociaciones/usuarios?' + params.toString());
      setUsuarios(res.data?.data ?? []);
    } catch { setUsuarios([]); }
    finally { setLoadingUsuarios(false); }
  }

  useEffect(() => {
    cargar();
    cargarCalPendientes();
  }, []);

  useEffect(() => {
    if (tab === 'usuarios') cargarUsuarios();
  }, [tab, filtroTipo, filtroEstado, busquedaDebounced]);

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
      setMsg(res.data?.message ?? 'Usuario vinculado');
      setTelefono('');
      await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo vincular el usuario');
    } finally { setSaving(false); }
  }

  async function remover(id) {
    setMsg(''); setError('');
    setRemoverSaving(true);
    const esComprador = confirmRemove?.tipo === 'comprador';
    try {
      const url = '/asociaciones/miembros/' + id + (esComprador ? '?tipo=comprador' : '');
      await api.delete(url);
      setMsg(esComprador ? 'Comprador removido de la asociación' : 'Productor removido de la asociación');
      setMiembros(prev => prev.filter(m => !(m.id === id && (m.tipo === 'comprador') === esComprador)));
      setConfirmRemove(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'No se pudo remover');
    } finally { setRemoverSaving(false); }
  }

  async function confirmarSuspender() {
    if (!suspMotivo.trim()) { setError('Debes indicar un motivo de suspensión'); return; }
    setSuspSaving(true); setError('');
    try {
      const esComprador = suspender.tipo === 'comprador';
      const url = esComprador
        ? '/asociaciones/compradores/suspender/' + suspender.id
        : '/asociaciones/miembros/suspender/' + suspender.id;
      await api.put(url, {
        temporal: suspTemporal,
        dias: suspTemporal ? suspDias : undefined,
        motivo: suspMotivo,
      });
      setMsg(suspTemporal ? `Usuario suspendido por ${suspDias} día(s)` : 'Usuario suspendido definitivamente');
      setSuspender(null);
      setSuspMotivo('');
      if (tab === 'usuarios') await cargarUsuarios(); else await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al suspender');
    } finally { setSuspSaving(false); }
  }

  async function reactivar(id) {
    setError(''); setMsg('');
    setReactivarSaving(true);
    try {
      const esComprador = confirmReactivar?.tipo === 'comprador';
      const url = esComprador
        ? '/asociaciones/compradores/reactivar/' + id
        : '/asociaciones/miembros/reactivar/' + id;
      await api.put(url);
      setMsg('Usuario reactivado');
      setConfirmReactivar(null);
      if (tab === 'usuarios') await cargarUsuarios(); else await cargar();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al reactivar');
    } finally { setReactivarSaving(false); }
  }

  async function rechazarCalSubmit() {
    if (!rechazoCal) return;
    setRechazoSaving(true);
    setError('');
    try {
      await api.put('/asociaciones/calificaciones/' + rechazoCal.id + '/rechazar', { motivo: rechazoMotivo || '' });
      setCalPendientes(prev => prev.filter(c => c.id !== rechazoCal.id));
      setMsg('Calificación rechazada');
      setRechazoCal(null);
      setRechazoMotivo('');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al rechazar');
    } finally { setRechazoSaving(false); }
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

  function rechazarCal(id) { setRechazoCal({ id }); setRechazoMotivo(''); setError(''); }

  function abrirSuspender(entity) {
    setSuspender(entity);
    setSuspTemporal(true);
    setSuspDias(7);
    setSuspMotivo('');
    setError('');
  }

  const publicaciones = miembros.filter(m => m.tipo === 'productor').reduce((sum, m) => sum + (m._count?.publicaciones ?? 0), 0);
  const negociaciones = miembros.filter(m => m.tipo === 'productor').reduce((sum, m) => sum + (m._count?.negociaciones ?? 0), 0);
  const totalProductores = miembros.filter(m => m.tipo === 'productor').length;
  const totalCompradores = miembros.filter(m => m.tipo === 'comprador').length;

  return (
    <div className="animate-fade-in-up dashboard-page dashboard-asociacion-page">
      <div className="page-header" style={{ marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-4)' }}>
          <div>
            <h1 style={{ marginBottom: 'var(--sp-1)' }}>Administración</h1>
            <p className="text-muted">Gestiona productores miembros, usuarios del sistema y modera calificaciones.</p>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--verde-50)', border: '1px solid var(--verde-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4) var(--sp-6)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--verde-800)', lineHeight: 1 }}>{miembros.length}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--verde-700)', fontWeight: 600, marginTop: 4 }}>miembros vinculados</div>
          </div>
        </div>
      </div>

      <div className="dashboard-kpi-strip assoc-strip">
        <div><Users size={18}/><strong>{totalProductores}</strong><span>Productores</span></div>
        <div><ShoppingBag size={18}/><strong>{totalCompradores}</strong><span>Compradores</span></div>
        <div><Package size={18}/><strong>{publicaciones}</strong><span>Publicaciones</span></div>
        <div><Handshake size={18}/><strong>{negociaciones}</strong><span>Negociaciones</span></div>
      </div>

      <div className="assoc-tab-bar">
        <button className={'assoc-tab' + (tab === 'miembros' ? ' active' : '')} onClick={() => setTab('miembros')}>
          <Users size={16}/> Miembros
        </button>
        <button className={'assoc-tab' + (tab === 'usuarios' ? ' active' : '')} onClick={() => setTab('usuarios')}>
          <Shield size={16}/> Usuarios del sistema
        </button>
        <button className={'assoc-tab' + (tab === 'calificaciones' ? ' active' : '')} onClick={() => { setTab('calificaciones'); cargarCalPendientes(); }}>
          <Star size={16}/> Calificaciones
          {calPendientes.length > 0 && <span className="assoc-tab-badge">{calPendientes.length}</span>}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {tab === 'miembros' && (
        <div className="assoc-members-layout">
          <form className="assoc-link-panel" onSubmit={vincular}>
            <div className="assoc-link-icon"><UserPlus size={22}/></div>
            <h3>Vincular usuario</h3>
            <p>Usa el teléfono de un productor o comprador ya registrado para vincularlo a la asociación.</p>
            <label className="form-label">Teléfono</label>
            <div className="input-icon-wrap">
              <Phone size={17}/>
              <input className="form-input" placeholder="4000-0001" maxLength={9} value={telefono} onChange={e => setTelefono(formatTelefono(e.target.value))}/>
            </div>
            <button className="btn btn-primary btn-full" disabled={saving}>
              <Link2 size={15}/> {saving ? 'Vinculando...' : 'Vincular usuario'}
            </button>
          </form>

          <div className="assoc-member-list">
            {loading ? <div className="loader-wrap"><div className="spinner" /></div> : miembros.length === 0 ? (
              <div className="empty-state">
                <Users size={42}/>
                <h3>Sin miembros vinculados</h3>
                <p>Vincula productores o compradores usando su número de teléfono.</p>
              </div>
            ) : miembros.map(m => {
              const nombre = m.usuario?.nombre ?? 'Usuario';
              const isComprador = m.tipo === 'comprador';
              const susp = badgeSuspension(m);
              return (
                <div className={'assoc-member-card' + (susp ? ' is-suspended' : '')} key={m.tipo + '-' + m.id}>
                  <div className="assoc-member-avatar">{initials(nombre)}</div>
                  <div className="assoc-member-main">
                    <div className="assoc-member-topline">
                      <h3>{nombre}</h3>
                      <span className="assoc-member-rating">
                        {isComprador ? <ShoppingBag size={12}/> : <Star size={12} fill="currentColor"/>}
                        {' '}{isComprador ? 'Comprador' : Number(m.calificacion ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <p>
                      {isComprador
                        ? (m.razon_social ? `${m.razon_social} · ` : '') + (m.municipio ?? 'Sin municipio')
                        : `${m.municipio ?? 'Municipio no definido'}, ${m.departamento ?? 'Departamento no definido'}`
                      }
                    </p>
                    <div className="assoc-member-metrics">
                      <span>{m.usuario?.telefono}</span>
                      {!isComprador && <span>{m._count?.publicaciones ?? 0} publicaciones</span>}
                      {!isComprador && <span>{m._count?.negociaciones ?? 0} negociaciones</span>}
                      {isComprador && m.nit && <span>NIT: {m.nit}</span>}
                      {susp && <span className={susp.cls}><Ban size={12}/> {susp.label}</span>}
                    </div>
                  </div>
                  <div className="assoc-member-actions">
                    {susp ? (
                      <button type="button" className="btn btn-sm btn-success" onClick={() => setConfirmReactivar({ ...m, tipo: m.tipo })} title="Reactivar">
                        <CheckCircle size={14}/> Reactivar
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-warning" onClick={() => abrirSuspender({ ...m, tipo: m.tipo })} title="Suspender">
                        <Ban size={14}/> Suspender
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove({ ...m, tipo: m.tipo, nombre: m.usuario?.nombre })} title="Quitar de asociación">
                      <Unlink size={14}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'usuarios' && (
        <div>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="input-icon-wrap" style={{ flex: 1, maxWidth: 300 }}>
              <input className="form-input" placeholder="Buscar por nombre o teléfono" value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 160 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los roles</option>
              <option value="productor">Productores</option>
              <option value="comprador">Compradores</option>
            </select>
            <select className="form-select" style={{ width: 160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="suspendido">Suspendidos</option>
            </select>
          </div>

          {loadingUsuarios ? <div className="loader-wrap"><div className="spinner" /></div> : usuarios.length === 0 ? (
            <div className="empty-state">
              <Shield size={42}/>
              <h3>Sin usuarios</h3>
              <p>No se encontraron usuarios con esos criterios.</p>
            </div>
          ) : (
            <div className="assoc-member-list">
              {usuarios.map(u => {
                const nombre = u.usuario?.nombre ?? 'Usuario';
                const isComprador = u.tipo === 'comprador';
                const susp = badgeSuspension(u);
                return (
                  <div className={'assoc-member-card' + (susp ? ' is-suspended' : '')} key={u.tipo + '-' + u.id}>
                    <div className="assoc-member-avatar">{initials(nombre)}</div>
                    <div className="assoc-member-main">
                      <div className="assoc-member-topline">
                        <h3>{nombre}</h3>
                        <span className="assoc-member-rating">
                          {isComprador ? <ShoppingBag size={12}/> : <Users size={12}/>}
                          {' '}{isComprador ? 'Comprador' : 'Productor'}
                        </span>
                      </div>
                      <p>{u.usuario?.telefono} · Registrado {new Date(u.usuario?.created_at).toLocaleDateString()}</p>
                      <div className="assoc-member-metrics">
                        {u.asociacion?.nombre && <span>Asoc: {u.asociacion.nombre}</span>}
                        {u.municipio && <span>{u.municipio}, {u.departamento}</span>}
                        {susp && <span className={susp.cls}><Ban size={12}/> {susp.label}</span>}
                        {u.suspension_motivo && susp && <span className="text-muted" style={{ fontSize: '.75rem' }}>Motivo: {u.suspension_motivo}</span>}
                      </div>
                    </div>
                    <div className="assoc-member-actions">
                      {susp ? (
                        <button type="button" className="btn btn-sm btn-success" onClick={() => setConfirmReactivar({ ...u, tipo: u.tipo })} title="Reactivar">
                          <CheckCircle size={14}/> Reactivar
                        </button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-warning" onClick={() => abrirSuspender({ ...u, tipo: u.tipo })} title="Suspender">
                          <Ban size={14}/> Suspender
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                    <button className="btn btn-sm btn-danger" onClick={() => rechazarCal(c)}>
                      <XCircle size={14}/> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal de suspensión (genérico para productor/comprador) ── */}
      {suspender && (
        <div className="modal-overlay" onClick={cerrarSuspender}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={suspenderRef}>
            <div className="modal-header">
              <h3><Ban size={18}/> Suspender a {suspender.usuario?.nombre ?? 'usuario'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarSuspender} disabled={suspSaving}>✕</button>
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
              <button className="btn btn-ghost" onClick={cerrarSuspender} disabled={suspSaving}>Cancelar</button>
              <button className="btn btn-danger" disabled={suspSaving} onClick={confirmarSuspender}>
                <Ban size={16}/> {suspSaving ? 'Suspendiendo...' : 'Suspender'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <div className="modal-overlay" onClick={cerrarConfirmRemove}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={confirmRemoveRef} role="dialog" aria-modal="true" aria-labelledby="modal-remover-title">
            <div className="modal-header">
              <h3 id="modal-remover-title"><Unlink size={18}/> Quitar miembro</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarConfirmRemove} disabled={removerSaving}>✕</button>
            </div>
            <div className="modal-body">
              <p>¿Quitar a <strong>{confirmRemove.usuario?.nombre ?? 'este usuario'}</strong> de la asociación? No será eliminado, solo dejará de estar vinculado.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarConfirmRemove} disabled={removerSaving}>Cancelar</button>
              <button className="btn btn-danger" disabled={removerSaving} onClick={() => remover(confirmRemove.id)}>
                {removerSaving ? 'Removiendo...' : 'Quitar de la asociación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReactivar && (
        <div className="modal-overlay" onClick={cerrarConfirmReactivar}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={confirmReactivarRef} role="dialog" aria-modal="true" aria-labelledby="modal-reactivar-title">
            <div className="modal-header">
              <h3 id="modal-reactivar-title"><CheckCircle size={18}/> Reactivar usuario</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarConfirmReactivar} disabled={reactivarSaving}>✕</button>
            </div>
            <div className="modal-body">
              <p>¿Reactivar a <strong>{confirmReactivar.usuario?.nombre ?? 'este usuario'}</strong>? Volverá a poder operar en el sistema.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarConfirmReactivar} disabled={reactivarSaving}>Cancelar</button>
              <button className="btn btn-success" disabled={reactivarSaving} onClick={() => reactivar(confirmReactivar.id)}>
                {reactivarSaving ? 'Reactivando...' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rechazoCal && (
        <div className="modal-overlay" onClick={cerrarRechazoCal}>
          <div className="modal" onClick={e => e.stopPropagation()} ref={rechazoCalRef} role="dialog" aria-modal="true" aria-labelledby="modal-rechazo-title">
            <div className="modal-header">
              <h3 id="modal-rechazo-title"><XCircle size={18}/> Rechazar calificación</h3>
              <button className="btn btn-ghost btn-sm" onClick={cerrarRechazoCal} disabled={rechazoSaving}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 'var(--sp-4)' }}>Indica el motivo del rechazo. Este mensaje se almacenará para auditoría.</p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Motivo (opcional)</label>
                <textarea className="form-input" rows={3} value={rechazoMotivo} onChange={e => setRechazoMotivo(e.target.value)} placeholder="Describe el motivo..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={cerrarRechazoCal} disabled={rechazoSaving}>Cancelar</button>
              <button className="btn btn-danger" disabled={rechazoSaving} onClick={rechazarCalSubmit}>
                {rechazoSaving ? 'Rechazando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
