import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%)',
      padding: '1rem',
    }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {['12rem', '8rem', '16rem'].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: s, height: s, borderRadius: '50%',
            background: 'rgba(255,255,255,.04)',
            top: ['10%', '60%', '30%'][i], left: ['70%', '10%', '85%'][i],
          }} />
        ))}
      </div>

      <div style={{
        background: 'white', borderRadius: '24px', padding: '2.5rem',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,.2)', position: 'relative',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}></div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: '#1B5E20', marginBottom: '.25rem' }}>
            La Esperanza
          </h1>
          <p style={{ color: '#6B7280', fontSize: '.9rem' }}>Plataforma de Gestión Agrícola</p>
        </div>

        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', color: '#111827' }}>
          Iniciar sesión
        </h2>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '.75rem 1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '.875rem', display: 'flex', gap: '.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Número de teléfono</label>
        <input className="form-input" type="tel" placeholder="4256-1234"
          value={form.telefono}
          onChange={e=>setForm(f => ({ ...f, telefono: formatTelefono(e.target.value) }))}
          autoComplete="tel" autoFocus maxLength={9} />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password" />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
         style={{ marginTop:'.5rem' }} disabled={loading}>
            {loading ? ' Ingresando...' : 'Ingresar '}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.9rem', color: '#6B7280' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" style={{ color: '#2E7D32', fontWeight: 600 }}>Regístrate</Link>
        </p>
      </div>
    </div>
  );
}


