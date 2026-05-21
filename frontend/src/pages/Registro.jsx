import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { User, Phone, Lock, Check, ChevronRight, ArrowLeft } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--verde-900) 0%, var(--verde-700) 50%, var(--verde-600) 100%)',
      padding: 'var(--sp-4)',
    }}>
      <div className="card animate-fade-in-up" style={{ width: '100%', maxWidth: 460, padding: 'var(--sp-8)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--verde-800)', margin: 0, fontSize: '2rem' }}>
            La Esperanza
          </h1>
          <p className="text-muted text-sm" style={{ marginTop: 'var(--sp-1)' }}>Plataforma de comercio agrícola directo</p>
        </div>

        {/* Indicador de Pasos */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--sp-6)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: '25%', right: '25%', height: 2, background: step >= 2 ? 'var(--verde-600)' : 'var(--gris-200)', zIndex: 0 }} />
          {[1, 2].map((n) => (
            <div key={n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '.875rem', transition: 'all 0.3s ease',
                background: step >= n ? 'var(--verde-700)' : 'var(--gris-200)',
                color: step >= n ? 'var(--blanco)' : 'var(--gris-500)',
              }}>
                {step > n ? <Check size={16} strokeWidth={3} /> : n}
              </div>
              <div style={{
                fontSize: '.75rem', marginTop: 'var(--sp-2)',
                color: step >= n ? 'var(--verde-800)' : 'var(--gris-400)',
                fontWeight: step === n ? 600 : 400
              }}>
                {n === 1 ? 'Tipo de cuenta' : 'Datos personales'}
              </div>
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
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--sp-4)', color: 'var(--gris-800)' }}>
              ¿Cómo usarás la plataforma?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
              {ROLES.map(r => {
                const isSelected = form.rol === r.value;
                return (
                  <div key={r.value}
                    onClick={() => { setForm(f => ({ ...f, rol: r.value })); setError(''); }}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--verde-600)' : 'var(--gris-200)'}`,
                      borderRadius: 12, padding: 'var(--sp-4)', cursor: 'pointer',
                      background: isSelected ? 'var(--verde-50)' : 'var(--blanco)',
                      transition: 'all .2s ease', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: isSelected ? 'var(--verde-800)' : 'var(--gris-800)' }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: '.8125rem', color: 'var(--gris-500)', marginTop: 2 }}>{r.desc}</div>
                    </div>
                    {isSelected && (
                      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: 'var(--verde-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blanco)' }}>
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
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--sp-4)', color: 'var(--gris-800)' }}>
              Crea tu credencial de acceso
            </h2>
            
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
      </div>
    </div>
  );
}


