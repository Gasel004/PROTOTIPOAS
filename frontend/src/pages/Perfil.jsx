import { useState, useEffect } from 'react';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

export default function Perfil() {
  const { user, setUser } = useAuthStore();
  const isProductor = user?.rol === 'productor';
  const isComprador = user?.rol === 'comprador';

  const [tab,      setTab]      = useState('datos');
  const [form,     setForm]     = useState({ nombre:'', telefono:'', municipio:'', departamento:'', descripcion:'', hectareas:'', razon_social:'', nit:'' });
  const [pwForm,   setPwForm]   = useState({ actual:'', nueva:'', confirmar:'' });
  const [saving,   setSaving]   = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msgOk,    setMsgOk]    = useState('');
  const [msgErr,   setMsgErr]   = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/auth/me');
        const d = res.data?.data ?? {};
        setForm({
          nombre:       d.nombre ?? user?.nombre ?? '',
          telefono:     d.telefono ?? '',
          municipio:    d.productor?.municipio ?? d.comprador?.municipio ?? '',
          departamento: d.productor?.departamento ?? d.comprador?.departamento ?? '',
          descripcion:  d.productor?.descripcion ?? '',
          hectareas:    d.productor?.hectareas ?? '',
          razon_social: d.comprador?.razon_social ?? '',
          nit:          d.comprador?.nit ?? d.asociacion?.nit ?? '',
        });
      } catch {
        setForm(f => ({ ...f, nombre: user?.nombre ?? '', email: user?.email ?? '' }));
      }
    }
    load();
  }, []);

  function flash(ok, msg) {
    if (ok) { setMsgOk(msg); setTimeout(() => setMsgOk(''), 3500); }
    else     { setMsgErr(msg); setTimeout(() => setMsgErr(''), 4000); }
  }

  async function guardarDatos(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = isProductor ? `/productores/${user?.id}` : isComprador ? `/compradores/${user?.id}` : `/asociaciones/${user?.id}`;
      await api.put(endpoint, form);
      setUser({ ...user, nombre: form.nombre });
      flash(true, 'Perfil actualizado correctamente ✅');
    } catch (err) {
      flash(false, err.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    if (pwForm.nueva !== pwForm.confirmar) { flash(false, 'Las contraseñas no coinciden'); return; }
    if (pwForm.nueva.length < 8)           { flash(false, 'La nueva contraseña debe tener al menos 8 caracteres'); return; }
    setSavingPw(true);
    try {
      await api.put('/auth/password', { password_actual: pwForm.actual, password_nueva: pwForm.nueva });
      setPwForm({ actual:'', nueva:'', confirmar:'' });
      flash(true, 'Contraseña actualizada correctamente ✅');
    } catch (err) {
      flash(false, err.response?.data?.message ?? 'Error al cambiar contraseña');
    } finally { setSavingPw(false); }
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const ROL_LABEL = { productor:'Productor agrícola', comprador:'Comprador', asociacion:'Asociación' };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth:720, margin:'0 auto' }}>
      <h1 style={{ marginBottom:'var(--sp-6)' }}>👤 Mi Perfil</h1>

      {/* Card avatar */}
      <div className="card" style={{ marginBottom:'var(--sp-6)' }}>
        <div className="card-body" style={{ display:'flex', alignItems:'center', gap:'var(--sp-6)' }}>
          <div style={{
            width:80, height:80, borderRadius:'50%',
            background:'linear-gradient(135deg, var(--verde-800), var(--verde-600))',
            color:'var(--blanco)', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'2rem', fontWeight:700, fontFamily:'var(--font-display)', flexShrink:0,
          }}>
            {initials}
          </div>
          <div>
            <h2 style={{ marginBottom:'var(--sp-1)' }}>{user?.nombre}</h2>
            <div style={{ display:'flex', gap:'var(--sp-3)', flexWrap:'wrap' }}>
              <span className="badge badge-verde">{ROL_LABEL[user?.rol] ?? user?.rol}</span>
              <span style={{ fontSize:'.875rem', color:'var(--gris-500)' }}>📧 {user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {msgOk  && <div className="alert alert-success" style={{ marginBottom:'var(--sp-4)' }}>{msgOk}</div>}
      {msgErr && <div className="alert alert-error"   style={{ marginBottom:'var(--sp-4)' }}>{msgErr}</div>}

      {/* Tabs */}
      <div style={{ display:'flex', gap:'var(--sp-2)', marginBottom:'var(--sp-5)' }}>
        {[['datos','📝 Datos personales'],['seguridad','🔒 Seguridad']].map(([k,lbl]) => (
          <button key={k}
            className={tab === k ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
            onClick={() => setTab(k)}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Tab: Datos ─────────────────────────────── */}
      {tab === 'datos' && (
        <form onSubmit={guardarDatos}>
          {/* Datos básicos */}
          <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
            <div className="card-header"><h4>Información básica</h4></div>
            <div className="card-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre completo <span style={{ color:'var(--rojo)' }}>*</span></label>
                  <input className="form-input" value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Tu nombre completo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="502 XXXX-XXXX" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input className="form-input" value={user?.email ?? ''} disabled
                  style={{ background:'var(--gris-100)', cursor:'not-allowed' }} />
                <p className="form-hint">El correo no puede modificarse</p>
              </div>
            </div>
          </div>

          {/* Datos específicos por rol */}
          {isProductor && (
            <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
              <div className="card-header"><h4>🌾 Información de productor</h4></div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <input className="form-input" value={form.departamento}
                      onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}
                      placeholder="Chiquimula" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Municipio</label>
                    <input className="form-input" value={form.municipio}
                      onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
                      placeholder="Chiquimula" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hectáreas de tierra</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.hectareas}
                    onChange={e => setForm(f => ({ ...f, hectareas: e.target.value }))}
                    placeholder="Ej: 12.5" />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label">Descripción de la actividad</label>
                  <textarea className="form-textarea" rows={3} value={form.descripcion}
                    onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Produce maíz, frijol y güicoy desde 2010. Cultivo orgánico sin agroquímicos..." />
                </div>
              </div>
            </div>
          )}

          {isComprador && (
            <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
              <div className="card-header"><h4>🧑‍💼 Información comercial</h4></div>
              <div className="card-body">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Razón social</label>
                    <input className="form-input" value={form.razon_social}
                      onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))}
                      placeholder="Comercial S.A." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIT</label>
                    <input className="form-input" value={form.nit}
                      onChange={e => setForm(f => ({ ...f, nit: e.target.value }))}
                      placeholder="12345678-9" />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Departamento</label>
                    <input className="form-input" value={form.departamento}
                      onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Municipio</label>
                    <input className="form-input" value={form.municipio}
                      onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </form>
      )}

      {/* ── Tab: Seguridad ─────────────────────────── */}
      {tab === 'seguridad' && (
        <form onSubmit={cambiarPassword}>
          <div className="card" style={{ marginBottom:'var(--sp-5)' }}>
            <div className="card-header"><h4>🔒 Cambiar contraseña</h4></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Contraseña actual <span style={{ color:'var(--rojo)' }}>*</span></label>
                <input className="form-input" type="password" value={pwForm.actual}
                  onChange={e => setPwForm(f => ({ ...f, actual: e.target.value }))}
                  placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña <span style={{ color:'var(--rojo)' }}>*</span></label>
                <input className="form-input" type="password" value={pwForm.nueva}
                  onChange={e => setPwForm(f => ({ ...f, nueva: e.target.value }))}
                  placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Confirmar nueva contraseña <span style={{ color:'var(--rojo)' }}>*</span></label>
                <input className="form-input" type="password" value={pwForm.confirmar}
                  onChange={e => setPwForm(f => ({ ...f, confirmar: e.target.value }))}
                  placeholder="Repite la nueva contraseña" />
                {pwForm.nueva && pwForm.confirmar && pwForm.nueva !== pwForm.confirmar && (
                  <p className="form-error">Las contraseñas no coinciden</p>
                )}
              </div>
            </div>
          </div>

          {/* Seguridad info */}
          <div className="alert alert-info" style={{ marginBottom:'var(--sp-5)' }}>
            🔐 Usa una contraseña de al menos 8 caracteres combinando letras, números y símbolos.
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPw || !pwForm.actual || !pwForm.nueva}>
              {savingPw ? '⏳ Actualizando...' : '🔒 Cambiar contraseña'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
