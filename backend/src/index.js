require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');

const app  = express();
const PORT = process.env.PORT ?? 3000;

// ── Middlewares globales ───────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',').map(s => s.trim()) ?? [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8081',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));
// Servir archivos estáticos del directorio uploads
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/v1/auth',          require('./routes/auth.routes'));
app.use('/api/v1/productores',   require('./routes/productores.routes'));
app.use('/api/v1/compradores',   require('./routes/compradores.routes'));
app.use('/api/v1/asociaciones',  require('./routes/asociaciones.routes'));
app.use('/api/v1/productos',     require('./routes/productos.routes'));
app.use('/api/v1/publicaciones', require('./routes/publicaciones.routes'));
app.use('/api/v1/negociaciones', require('./routes/negociaciones.routes'));
app.use('/api/v1/entregas',      require('./routes/entregas.routes'));
app.use('/api/v1/pagos',         require('./routes/pagos.routes'));
app.use('/api/v1/notificaciones',require('./routes/notificaciones.routes'));
app.use('/api/v1/dashboard',      require('./routes/dashboard.routes'));
app.use('/api/v1/uploads',        require('./routes/uploads.routes'));

// ── Health check ──────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => res.json({ status:'ok', timestamp: new Date() }));

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success:false, message:'Ruta no encontrada' }));

// ── Error handler global ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status ?? 500).json({ success:false, message: err.message ?? 'Error interno del servidor' });
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}/api/v1`));
