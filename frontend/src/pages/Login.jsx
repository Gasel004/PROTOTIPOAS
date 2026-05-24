import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import { Leaf, Lock, Phone, Sprout } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ telefono: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function formatTelefono(val) {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 4) return digits.slice(0, 4) + '-' + digits.slice(4);
    return digits;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.telefono || !form.password) { setError('Completa todos los campos'); return; }
    if (!/^\d{4}-\d{4}$/.test(form.telefono)) { setError('El teléfono debe tener el formato 4256-1234'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', form);
      const { user, token } = res.data?.data ?? {};
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Credenciales incorrectas');
    } finally { setLoading(false); }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel animate-fade-in">
        <div className="auth-brand">
          <div className="auth-mark">
            <Leaf size={24} />
          </div>
          <div>
            <h1>
              La Esperanza
            </h1>
            <p>Plataforma de gestión agrícola</p>
          </div>
        </div>

        <div className="auth-heading">
          <span className="eyebrow">Acceso seguro</span>
          <h2>
            Iniciar sesión
          </h2>
          <p>Entra para publicar cosechas, negociar entregas y revisar tus pagos.</p>
        </div>

        {error && (
          <div className="alert alert-error auth-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Número de teléfono</label>
            <div className="input-icon-wrap">
              <Phone size={17} />
              <input className="form-input" type="tel" placeholder="4256-1234"
                value={form.telefono}
                onChange={e=>setForm(f => ({ ...f, telefono: formatTelefono(e.target.value) }))}
                autoComplete="tel" autoFocus maxLength={9} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-icon-wrap">
              <Lock size={17} />
              <input className="form-input" type="password" placeholder="********"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password" />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg auth-submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta?{' '}
          <Link to="/registro">Regístrate</Link>
        </p>
      </section>

      <section className="auth-field" aria-hidden="true">
        <div className="sun" />
        <div className="cloud cloud-one" />
        <div className="cloud cloud-two" />
        <div className="field-copy">
          <span>Cosecha conectada</span>
          <strong>Del surco al mercado, con la comunidad al centro.</strong>
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
