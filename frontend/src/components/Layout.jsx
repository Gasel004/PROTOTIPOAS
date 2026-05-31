import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/auth.store';
import api from '../api/client';
import {
  LayoutDashboard, Package, PlusCircle, Handshake, Truck, CreditCard,
  User, Users, Bell, LogOut, Leaf, Store, Menu, X, PackageSearch
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
    { label:'Productores',   to:'/miembros',      icon:<Users size={18}/> },
    { label:'Catálogo',      to:'/catalogo',      icon:<PackageSearch size={18}/> },
    { label:'Publicaciones', to:'/publicaciones', icon:<Store size={18}/> },
  ],
};

const PAGE_TITLES = {
  '/dashboard':'Inicio','/publicaciones':'Publicaciones',
  '/mis-publicaciones':'Mis Publicaciones','/publicaciones/nueva':'Nueva Publicación',
  '/negociaciones':'Negociaciones','/entregas':'Entregas',
  '/pagos':'Pagos','/perfil':'Mi Perfil','/miembros':'Productores','/catalogo':'Catálogo',
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

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notificaciones');
        if (res.data?.success) {
          setNotifications(res.data.data ?? []);
          setUnreadCount(res.data.noLeidas ?? 0);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(false);
    };
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const handleMarkAsRead = async (id, leida) => {
    if (leida) return;
    try {
      const res = await api.patch(`/notificaciones/${id}/leer`);
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await api.patch('/notificaciones/leer-todas');
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

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
          <div className="notif-dropdown-container" onClick={e => e.stopPropagation()}>
            <button className="notif-btn" title="Notificaciones" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            
            {dropdownOpen && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <h4>Notificaciones</h4>
                  {unreadCount > 0 && (
                    <button className="notif-dropdown-clear" onClick={handleMarkAllAsRead}>
                      Marcar todo leído
                    </button>
                  )}
                </div>
                
                <div className="notif-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty animate-fade-in">
                      <Bell size={24} style={{ color: 'var(--gris-400)' }} />
                      <p>No tienes notificaciones</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.leida ? 'unread' : ''}`}
                        onClick={() => handleMarkAsRead(n.id, n.leida)}
                      >
                        <div className="notif-item-content">
                          <div className="notif-item-title">{n.titulo}</div>
                          <div className="notif-item-text">{n.mensaje}</div>
                          <span className="notif-item-time">
                            {new Date(n.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {!n.leida && <span className="notif-unread-dot" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
