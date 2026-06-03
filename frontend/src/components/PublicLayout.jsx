import { Outlet, useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function PublicLayout() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gris-50)' }}>
      {/* Topbar público */}
      <header style={{
        background: 'var(--verde-900)',
        color: 'var(--blanco)',
        padding: '0 var(--sp-6)',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', cursor: 'pointer' }}
          onClick={() => navigate('/catalogo-publico')}>
          <Leaf size={22} strokeWidth={2} style={{ color: 'var(--verde-300)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--blanco)' }}>
            La Esperanza
          </span>
          <span style={{ fontSize: '.8rem', color: 'var(--verde-300)', fontWeight: 500 }}>
            · Catálogo
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm"
            style={{ color: 'var(--verde-200)', borderColor: 'var(--verde-600)' }}
            onClick={() => navigate('/login')}>
            Iniciar sesión
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/registro')}>
            Registrarse
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: 'var(--sp-6) var(--sp-6) var(--sp-10)' }}>
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
