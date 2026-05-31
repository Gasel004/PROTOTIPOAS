import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { User, Phone, Lock, Check, ChevronRight, ArrowLeft, Leaf, Sprout } from 'lucide-react';

const ROLES = [
  { value: 'productor', label: 'Productor', desc: 'Publico y vendo mis cosechas' },
  { value: 'comprador', label: 'Comprador', desc: 'Compro productos agrícolas' },
  { value: 'asociacion', label: 'Asociación', desc: 'Administro una asociación de productores' },
];

export default function Registro() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: '', telefono: '', password: '', confirmar: '', rol: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function formatTelefono(val) {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return digits.slice(0, 4) + '-' + digits.slice(4);
    return digits;
  }

  function handleChange(e) {
    const val = e.target.name === 'telefono' ? formatTelefono(e.target.value) : e.target.value;
    setForm(f => ({ ...f, [e.target.name]: val }));
    setError('');
  }

  function validarPaso1() {
    if (!form.rol) {
      setError('Selecciona un tipo de cuenta para continuar.');
      return false;
    }
    return true;
  }

  function validarPaso2() {
    if (!form.nombre.trim()) { setError('El nombre completo es requerido.'); return false; }
    if (!form.telefono.trim()) { setError('El número de teléfono es requerido.'); return false; }
    if (!/^\d{4}-\d{4}$/.test(form.telefono)) { setError('El teléfono debe tener un formato válido (ej. 4256-1234).'); return false; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return false; }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden.'); return false; }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validarPaso2()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        nombre: form.nombre,
        telefono: form.telefono,
        password: form.password,
        rol: form.rol,
      });
      const { user, token } = res.data?.data ?? {};
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al registrarse. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-scroll animate-fade-in">
        <div className="auth-brand compact">
          <div className="auth-mark">
            <Leaf size={24} />
          </div>
          <div>
            <h1>La Esperanza</h1>
            <p>Plataforma de comercio agrícola directo</p>
          </div>
        </div>

        <div className="auth-heading compact">
          <span className="eyebrow">Nueva cuenta</span>
          <h2>Registro</h2>
          <p>Cuéntanos cómo participas en la cadena agrícola para preparar tu espacio de trabajo.</p>
        </div>

        <div className="auth-steps">
          {[1, 2].map(n => (
            <div key={n} className={`auth-step ${step >= n ? 'done' : ''} ${step === n ? 'current' : ''}`}>
              <span>
                {step > n ? <Check size={16} strokeWidth={3} /> : n}
              </span>
              <small>{n === 1 ? 'Tipo de cuenta' : 'Datos personales'}</small>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="auth-section-title">
              ¿Cómo usarás la plataforma?
            </h3>
            <div className="role-list">
              {ROLES.map(r => {
                const isSelected = form.rol === r.value;
                return (
                  <div key={r.value}
                    onClick={() => { setForm(f => ({ ...f, rol: r.value })); setError(''); }}
                    className={`role-option ${isSelected ? 'selected' : ''}`}
                  >
                    <div>
                      <strong>{r.label}</strong>
                      <p>{r.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="role-check">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => { if (validarPaso1()) setStep(2); }}>
              Continuar <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h3 className="auth-section-title">
              Crea tu credencial de acceso
            </h3>
            
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} /> Nombre completo <span style={{ color: 'var(--rojo)' }}>*</span>
              </label>
              <input className="form-input" name="nombre" value={form.nombre}
                onChange={handleChange} placeholder="Tu nombre completo" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} /> Número de teléfono <span style={{ color: 'var(--rojo)' }}>*</span>
              </label>
              <input className="form-input" type="tel" name="telefono" value={form.telefono}
                onChange={handleChange} placeholder="4256-1234" maxLength={9} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} /> Contraseña <span style={{ color: 'var(--rojo)' }}>*</span>
              </label>
              <input className="form-input" type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Mínimo 8 caracteres" />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={14} /> Confirmar contraseña <span style={{ color: 'var(--rojo)' }}>*</span>
              </label>
              <input className="form-input" type="password" name="confirmar" value={form.confirmar}
                onChange={handleChange} placeholder="Repite tu contraseña" />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ArrowLeft size={16} /> Volver
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Registrarme'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 'var(--sp-5)', fontSize: '.875rem', color: 'var(--gris-500)', marginBottom: 0 }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color: 'var(--verde-700)', fontWeight: 600, textDecoration: 'none' }}>Inicia sesión</Link>
        </p>
      </section>

      <section className="auth-field auth-field-register" aria-hidden="true">
        <div className="sun"><div className="glasses" /><div className="hand" /><div className="arm" /><div className="brow" /><div className="cheek" /><div className="nose" /></div>
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="bird bird-1" />
        <div className="bird bird-2" />
        <div className="bird bird-3" />
        <div className="field-copy">
          <span>Red de productores</span>
          <strong>Una cuenta para sembrar confianza y cerrar mejores tratos.</strong>
        </div>
        <div className="hill hill-back" />
        <div className="hill hill-front" />
        <div className="furrows">
          {Array.from({ length: 10 }).map((_, i) => <span key={i} />)}
        </div>
        <div className="crop-row crop-row-one">
          {Array.from({ length: 9 }).map((_, i) => <Sprout key={i} size={34} />)}
        </div>
        <div className="crop-row crop-row-two">
          {Array.from({ length: 7 }).map((_, i) => <Sprout key={i} size={42} />)}
        </div>
        <div className="tractor">
          <div className="tractor-cabin" />
          <div className="tractor-body" />
          <div className="wheel wheel-big" />
          <div className="wheel wheel-small" />
        </div>
      </section>
    </main>
  );
}

