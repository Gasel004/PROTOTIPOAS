import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/auth.store';
import api from '../api/client';

const ROLES = [
  { value:'productor',  label:'🌾 Productor',  desc:'Publico y vendo mis cosechas' },
  { value:'comprador',  label:'🧑‍💼 Comprador', desc:'Compro productos agrícolas' },
  { value:'asociacion', label:'🏛 Asociación',  desc:'Administro una asociación de productores' },
];

export default function Registro() {
  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState({ nombre:'', email:'', password:'', confirmar:'', rol:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  function validarPaso1() {
    if (!form.rol) { setError('Selecciona un tipo de cuenta'); return false; }
    return true;
  }
  function validarPaso2() {
    if (!form.nombre.trim())   { setError('El nombre es requerido'); return false; }
    if (!form.email.trim())    { setError('El correo es requerido'); return false; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return false; }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return false; }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validarPaso2()) return;
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/register', {
        nombre: form.nombre, email: form.email,
        password: form.password, rol: form.rol,
      });
      const { user, token } = res.data?.data ?? {};
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al registrarse');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #388E3C 100%)',
      padding:'1rem',
    }}>
      <div style={{
        background:'white', borderRadius:'24px', padding:'2.5rem',
        width:'100%', maxWidth:'460px',
        boxShadow:'0 20px 60px rgba(0,0,0,.2)',
      }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🌿</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:'1.5rem', fontWeight:700, color:'#1B5E20' }}>
            La Esperanza
          </h1>
        </div>

        {/* Pasos */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:'1.75rem', gap:0 }}>
          {[1,2].map((n) => (
            <div key={n} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', position:'relative' }}>
              {n < 2 && <div style={{ position:'absolute', top:16, left:'50%', width:'100%', height:2, background: step >= 2 ? '#2E7D32' : '#D1D5DB', zIndex:0 }} />}
              <div style={{
                width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:'.875rem', position:'relative', zIndex:1,
                background: step >= n ? '#1B5E20' : '#D1D5DB',
                color: 'white',
              }}>{step > n ? '✓' : n}</div>
              <div style={{ fontSize:'.75rem', color: step >= n ? '#1B5E20' : '#9CA3AF', marginTop:4, fontWeight: step === n ? 600 : 400 }}>
                {n === 1 ? 'Tipo de cuenta' : 'Datos personales'}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:'.75rem 1rem', marginBottom:'1rem', color:'#DC2626', fontSize:'.875rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Paso 1: Selección de rol */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize:'1.0625rem', fontWeight:600, marginBottom:'1rem', color:'#111827' }}>
              ¿Cómo usarás el sistema?
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'.75rem', marginBottom:'1.5rem' }}>
              {ROLES.map(r => (
                <div key={r.value}
                  onClick={() => { setForm(f => ({ ...f, rol: r.value })); setError(''); }}
                  style={{
                    border: `2px solid ${form.rol === r.value ? '#2E7D32' : '#E5E7EB'}`,
                    borderRadius:12, padding:'1rem',
                    cursor:'pointer',
                    background: form.rol === r.value ? '#F0FDF4' : 'white',
                    transition:'all .2s',
                    display:'flex', alignItems:'center', gap:'1rem',
                  }}
                >
                  <div style={{ fontSize:'1.5rem' }}>{r.label.split(' ')[0]}</div>
                  <div>
                    <div style={{ fontWeight:600, color: form.rol === r.value ? '#1B5E20' : '#111827' }}>
                      {r.label.split(' ').slice(1).join(' ')}
                    </div>
                    <div style={{ fontSize:'.8125rem', color:'#6B7280' }}>{r.desc}</div>
                  </div>
                  {form.rol === r.value && <div style={{ marginLeft:'auto', color:'#2E7D32', fontWeight:700 }}>✓</div>}
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-full btn-lg"
              onClick={() => { if (validarPaso1()) setStep(2); }}>
              Continuar →
            </button>
          </div>
        )}

        {/* Paso 2: Datos personales */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize:'1.0625rem', fontWeight:600, marginBottom:'1rem', color:'#111827' }}>
              Crea tu cuenta
            </h2>
            <div className="form-group">
              <label className="form-label">Nombre completo <span style={{ color:'#DC2626' }}>*</span></label>
              <input className="form-input" name="nombre" value={form.nombre}
                onChange={handleChange} placeholder="Tu nombre completo" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Correo electrónico <span style={{ color:'#DC2626' }}>*</span></label>
              <input className="form-input" type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="tu@correo.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña <span style={{ color:'#DC2626' }}>*</span></label>
              <input className="form-input" type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar contraseña <span style={{ color:'#DC2626' }}>*</span></label>
              <input className="form-input" type="password" name="confirmar" value={form.confirmar}
                onChange={handleChange} placeholder="Repite tu contraseña" />
            </div>
            <div style={{ display:'flex', gap:'.75rem', marginTop:'.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} disabled={loading}>← Volver</button>
              <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={loading}>
                {loading ? '⏳ Creando cuenta...' : '🚀 Crear cuenta'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign:'center', marginTop:'1.25rem', fontSize:'.875rem', color:'#6B7280' }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color:'#2E7D32', fontWeight:600 }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
