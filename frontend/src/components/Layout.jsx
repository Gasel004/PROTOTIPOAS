import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/auth.store';
import {
  LayoutDashboard, Package, PlusCircle, Handshake, Truck, CreditCard,
  User, Bell, LogOut, Leaf, Store, Menu, X
} from 'lucide-react';

const NAV_ITEMS = {
  productor: [
    { label:'Inicio',            to:'/dashboard',          icon:<LayoutDashboard size={18}/> },
    { label:'Mis Publicaciones', to:'/mis-publicaciones',  icon:<Package size={18}/> },
    { label:'Nueva Publicación', to:'/publicaciones/nueva',icon:<PlusCircle size={18}/> },
    { label:'Negociaciones',     to:'/negociaciones',      icon:<Handshake size={18}/> },
    { label:'Entregas',          to:'/entregas',           icon:<Truck size={18}/> },
    { label:'Pagos',             to:'/pagos',              icon:<CreditCard size={18}/> },
  ],
  comprador: [
    { label:'Inicio',        to:'/dashboard',     icon:<LayoutDashboard size={18}/> },
    { label:'Publicaciones', to:'/publicaciones', icon:<Store size={18}/> },
    { label:'Negociaciones', to:'/negociaciones', icon:<Handshake size={18}/> },
    { label:'Entregas',      to:'/entregas',      icon:<Truck size={18}/> },
    { label:'Pagos',         to:'/pagos',         icon:<CreditCard size={18}/> },
  ],
  asociacion: [
    { label:'Inicio',        to:'/dashboard',     icon:<LayoutDashboard size={18}/> },
    { label:'Publicaciones', to:'/publicaciones', icon:<Store size={18}/> },
    { label:'Negociaciones', to:'/negociaciones', icon:<Handshake size={18}/> },
    { label:'Entregas',      to:'/entregas',      icon:<Truck size={18}/> },
    { label:'Pagos',         to:'/pagos',         icon:<CreditCard size={18}/> },
  ],
};

const PAGE_TITLES = {
  '/dashboard':'Inicio','/publicaciones':'Publicaciones',
  '/mis-publicaciones':'Mis Publicaciones','/publicaciones/nueva':'Nueva Publicación',
  '/negociaciones':'Negociaciones','/entregas':'Entregas',
  '/pagos':'Pagos','/perfil':'Mi Perfil',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = window.location.pathname;
  const pageTitle = PAGE_TITLES[path] ?? 'La Esperanza';
  const items = NAV_ITEMS[user?.rol] ?? NAV_ITEMS.comprador;
  const initials = user?.nombre ? user.nombre.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'U';
  const roleLabel = { productor:'Productor', comprador:'Comprador', asociacion:'Asociación' };

  return (
    <div className="app-layout">
      {mobileOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <button className="mobile-close" onClick={() => setMobileOpen(false)} title="Cerrar menú">
          <X size={20} />
        </button>
        <div className="sidebar-brand">
          <Leaf size={22} strokeWidth={2} style={{ color:'var(--verde-300)', flexShrink:0 }} />
          <div>
            <h2 style={{ margin:0 }}>La Esperanza</h2>
            <span>Gestión Agrícola</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Menú principal</div>
          {items.map(item => (
            <NavLink key={item.to} to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section-label" style={{ marginTop:'1.5rem' }}>Cuenta</div>
          <NavLink to="/perfil" onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon"><User size={18}/></span>
            Mi Perfil
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => { logout(); navigate('/login'); }} title="Cerrar sesión">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name truncate">{user?.nombre ?? 'Usuario'}</div>
              <div className="user-role">{roleLabel[user?.rol] ?? ''} · Salir</div>
            </div>
            <LogOut size={16} style={{ color:'var(--gris-400)', marginLeft:'auto' }} />
          </div>
        </div>
      </aside>

      <header className="topbar app-topbar">
        <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} title="Abrir menú">
            <Menu size={20} />
          </button>
          <span className="topbar-title">{pageTitle}</span>
        </div>
        <div className="topbar-actions">
          <button className="notif-btn" title="Notificaciones">
            <Bell size={20} />
            <span className="notif-badge">3</span>
          </button>
          <NavLink to="/perfil" className="btn btn-ghost btn-sm">{initials}</NavLink>
        </div>
      </header>

      <main className="app-content"><Outlet /></main>

      <nav className="mobile-bottom-nav">
        {items.slice(0, 4).map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>
            {item.icon}
            <span>{item.label.replace('Mis ', '').replace('Nueva Publicación', 'Nueva')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
