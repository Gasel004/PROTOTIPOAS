import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/auth.store';

const NAV_ITEMS = {
  productor: [
    { label: 'Inicio',           to: '/dashboard',           icon: '🏡' },
    { label: 'Mis Publicaciones',to: '/mis-publicaciones',   icon: '📋' },
    { label: 'Nueva Publicación',to: '/publicaciones/nueva', icon: '➕' },
    { label: 'Negociaciones',    to: '/negociaciones',       icon: '🤝' },
    { label: 'Entregas',         to: '/entregas',            icon: '📦' },
    { label: 'Pagos',            to: '/pagos',               icon: '💳' },
  ],
  comprador: [
    { label: 'Inicio',           to: '/dashboard',           icon: '🏡' },
    { label: 'Publicaciones',    to: '/publicaciones',       icon: '🌾' },
    { label: 'Negociaciones',    to: '/negociaciones',       icon: '🤝' },
    { label: 'Entregas',         to: '/entregas',            icon: '📦' },
    { label: 'Pagos',            to: '/pagos',               icon: '💳' },
  ],
  asociacion: [
    { label: 'Inicio',           to: '/dashboard',           icon: '🏡' },
    { label: 'Publicaciones',    to: '/publicaciones',       icon: '🌾' },
    { label: 'Negociaciones',    to: '/negociaciones',       icon: '🤝' },
    { label: 'Entregas',         to: '/entregas',            icon: '📦' },
    { label: 'Pagos',            to: '/pagos',               icon: '💳' },
  ],
};

const PAGE_TITLES = {
  '/dashboard':            'Inicio',
  '/publicaciones':        'Publicaciones',
  '/mis-publicaciones':    'Mis Publicaciones',
  '/publicaciones/nueva':  'Nueva Publicación',
  '/negociaciones':        'Negociaciones',
  '/entregas':             'Entregas',
  '/pagos':                'Pagos',
  '/perfil':               'Mi Perfil',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const path = window.location.pathname;
  const pageTitle = PAGE_TITLES[path] ?? 'La Esperanza';
  const items = NAV_ITEMS[user?.rol] ?? NAV_ITEMS.comprador;

  const initials = user?.nombre
    ? user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const roleLabel = { productor: 'Productor', comprador: 'Comprador', asociacion: 'Asociación' };

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="sidebar app-sidebar">
        <div className="sidebar-brand">
          <h2>🌿 La Esperanza</h2>
          <span>Gestión Agrícola</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menú principal</div>
          {items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="nav-section-label" style={{ marginTop: '1.5rem' }}>Cuenta</div>
          <NavLink to="/perfil" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">👤</span>
            Mi Perfil
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Cerrar sesión">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name truncate">{user?.nombre ?? 'Usuario'}</div>
              <div className="user-role">{roleLabel[user?.rol] ?? ''} · Salir 🚪</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Topbar ──────────────────────────────────── */}
      <header className="topbar app-topbar">
        <span className="topbar-title">{pageTitle}</span>
        <div className="topbar-actions">
          <button className="notif-btn" title="Notificaciones">
            🔔
            <span className="notif-badge">3</span>
          </button>
          <NavLink to="/perfil" className="btn btn-ghost btn-sm">
            {initials}
          </NavLink>
        </div>
      </header>

      {/* ── Contenido ───────────────────────────────── */}
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
