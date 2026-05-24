const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const data = await authService.register(req.body);
    res.status(201).json({ success:true, data });
  } catch(e) { next(e); }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function me(req, res, next) {
  try {
    const data = await authService.me(req.user.id);
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

async function cambiarPassword(req, res, next) {
  try {
    const data = await authService.cambiarPassword(req.user.id, {
      password_actual: req.body.password_actual,
      password_nueva: req.body.password_nueva,
    });
    res.json({ success:true, data });
  } catch(e) { next(e); }
}

module.exports = { register, login, me, cambiarPassword };
