const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ success:false, message:'Token requerido' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    const msg = e.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    return res.status(401).json({ success:false, message: msg });
  }
}

function soloRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol))
      return res.status(403).json({ success:false, message:'No tienes permiso para esta acción' });
    next();
  };
}

module.exports = { verificarToken, soloRoles };
