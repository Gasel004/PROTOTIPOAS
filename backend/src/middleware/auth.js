const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success:false, message:'Token requerido' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ success:false, message: msg });
  }
}

async function verificarUsuarioActivo(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { activo: true },
    });
    if (!usuario?.activo) {
      return res.status(403).json({ success: false, message: 'Cuenta desactivada. Contacta al administrador.' });
    }
    next();
  } catch (e) { next(e); }
}

async function verificarProductorActivo(req, res, next) {
  if (req.user.rol !== 'productor') return next();
  try {
    const productor = await prisma.productor.findUnique({
      where: { usuario_id: req.user.id },
      select: { suspendido_definitivo: true, suspendido_hasta: true },
    });
    if (!productor) return next();
    if (productor.suspendido_definitivo) {
      return res.status(403).json({ success: false, message: 'Tu cuenta de productor ha sido suspendida definitivamente.' });
    }
    if (productor.suspendido_hasta && new Date(productor.suspendido_hasta) > new Date()) {
      return res.status(403).json({
        success: false,
        message: `Tu cuenta de productor está suspendida hasta ${productor.suspendido_hasta.toISOString().slice(0, 10)}.`,
      });
    }
    next();
  } catch (e) { next(e); }
}

function soloRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol))
      return res.status(403).json({ success:false, message:'No tienes permiso para esta acción' });
    next();
  };
}

module.exports = { verificarToken, verificarUsuarioActivo, verificarProductorActivo, soloRoles };
