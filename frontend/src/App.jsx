import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/auth.store';

// Layout
import Layout from './components/Layout';

// Páginas públicas
import Login    from './pages/Login';
import Registro from './pages/Registro';

// Páginas privadas
import Dashboard          from './pages/Dashboard';
import Publicaciones      from './pages/Publicaciones';
import MisPublicaciones   from './pages/MisPublicaciones';
import CrearPublicacion   from './pages/CrearPublicacion';
import DetallePublicacion from './pages/DetallePublicacion';
import Negociaciones      from './pages/Negociaciones';
import DetalleNegociacion from './pages/DetalleNegociacion';
import Entregas           from './pages/Entregas';
import Pagos              from './pages/Pagos';
import Perfil             from './pages/Perfil';
import MiembrosAsociacion from './pages/MiembrosAsociacion';
import CatalogoProductos from './pages/CatalogoProductos';

import './styles/index.css';

// ── Guardia de rutas privadas ──────────────────────────────
function PrivateRoute({ children, roles }) {
  const { user, token } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/dashboard" replace />;

  return children;
}

// ── Guardia de rutas públicas (redirige si ya está logueado) ──
function PublicRoute({ children }) {
  const { token } = useAuthStore();
  return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Rutas públicas ───────────────────────── */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/registro" element={
          <PublicRoute><Registro /></PublicRoute>
        } />

        {/* ── Raíz ─────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Rutas privadas (con layout) ───────────── */}
        <Route element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Perfil */}
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/miembros" element={
            <PrivateRoute roles={['asociacion']}>
              <MiembrosAsociacion />
            </PrivateRoute>
          } />
          <Route path="/catalogo" element={
            <PrivateRoute roles={['asociacion']}>
              <CatalogoProductos />
            </PrivateRoute>
          } />

          {/* Publicaciones — todos los roles pueden ver */}
          <Route path="/publicaciones"       element={<Publicaciones />} />
          <Route path="/publicaciones/:id"   element={<DetallePublicacion />} />

          {/* Solo productores */}
          <Route path="/mis-publicaciones"        element={
            <PrivateRoute roles={['productor']}>
              <MisPublicaciones />
            </PrivateRoute>
          } />
          <Route path="/publicaciones/nueva"      element={
            <PrivateRoute roles={['productor']}>
              <CrearPublicacion />
            </PrivateRoute>
          } />
          <Route path="/publicaciones/:id/editar" element={
            <PrivateRoute roles={['productor']}>
              <CrearPublicacion />
            </PrivateRoute>
          } />

          {/* Negociaciones — participantes directos */}
          <Route path="/negociaciones"      element={
            <PrivateRoute roles={['productor', 'comprador']}>
              <Negociaciones />
            </PrivateRoute>
          } />
          <Route path="/negociaciones/:id"  element={
            <PrivateRoute roles={['productor', 'comprador']}>
              <DetalleNegociacion />
            </PrivateRoute>
          } />

          {/* Entregas y pagos — participantes directos */}
          <Route path="/entregas" element={
            <PrivateRoute roles={['productor', 'comprador']}>
              <Entregas />
            </PrivateRoute>
          } />
          <Route path="/pagos"    element={
            <PrivateRoute roles={['productor', 'comprador']}>
              <Pagos />
            </PrivateRoute>
          } />
        </Route>

        {/* ── 404 ──────────────────────────────────── */}
        <Route path="*" element={
          <div style={{
            minHeight:'100vh', display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-body)', gap:'1rem',
          }}>
            <div style={{ fontSize:'4rem' }}>🌿</div>
            <h1 style={{ fontFamily:'var(--font-display)', color:'var(--verde-900)' }}>Página no encontrada</h1>
            <p style={{ color:'var(--gris-500)' }}>La ruta que buscas no existe</p>
            <a href="/dashboard" style={{
              background:'var(--verde-800)', color:'white',
              padding:'0.75rem 1.5rem', borderRadius:'10px',
              textDecoration:'none', fontWeight:600,
            }}>Ir al inicio</a>
          </div>
        } />

      </Routes>
    </BrowserRouter>
  );
}
