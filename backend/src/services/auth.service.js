const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generarToken(user) {
  return jwt.sign(
    { id: user.id, telefono: user.telefono, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

function validarTelefono(telefono) {
  return /^\d{4}-\d{4}$/.test(telefono);
}

async function register({ nombre, telefono, password, rol }) {
  if (!nombre || !telefono || !password || !rol)
    throw Object.assign(new Error('Datos requeridos faltantes'), { status: 400 });

  if (!validarTelefono(telefono))
    throw Object.assign(new Error('El teléfono debe tener el formato 4256-1234'), { status: 400 });

  const existe = await prisma.usuario.findUnique({ where: { telefono } });
  if (existe) throw Object.assign(new Error('El número de teléfono ya está registrado'), { status: 409 });

  const password_hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, telefono, password_hash, rol }
  });

  if (rol === 'productor')
    await prisma.productor.create({ data: { usuario_id: usuario.id } });
  else if (rol === 'comprador')
    await prisma.comprador.create({ data: { usuario_id: usuario.id } });
  else if (rol === 'asociacion')
    await prisma.asociacion.create({ data: { usuario_id: usuario.id, nombre } });

  const token = generarToken(usuario);
  return { user: { id: usuario.id, nombre: usuario.nombre, telefono: usuario.telefono, rol: usuario.rol }, token };
}

async function login({ telefono, password }) {
  if (!telefono || !password)
    throw Object.assign(new Error('Teléfono y contraseña requeridos'), { status: 400 });

  const usuario = await prisma.usuario.findUnique({ where: { telefono } });
  if (!usuario) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });
  if (!usuario.activo) throw Object.assign(new Error('Cuenta desactivada'), { status: 403 });

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });

  const token = generarToken(usuario);
  return { user: { id: usuario.id, nombre: usuario.nombre, telefono: usuario.telefono, rol: usuario.rol }, token };
}

async function me(id) {
  const u = await prisma.usuario.findUnique({
    where: { id },
    include: { productor: true, comprador: true, asociacion: true }
  });
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  const { password_hash, ...rest } = u;
  return rest;
}

async function cambiarPassword(id, { password_actual, password_nueva }) {
  if (!password_actual || !password_nueva)
    throw Object.assign(new Error('Contraseña actual y nueva contraseña son requeridas'), { status: 400 });
  if (password_nueva.length < 8)
    throw Object.assign(new Error('La nueva contraseña debe tener al menos 8 caracteres'), { status: 400 });

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const ok = await bcrypt.compare(password_actual, usuario.password_hash);
  if (!ok) throw Object.assign(new Error('La contraseña actual no es correcta'), { status: 401 });

  const password_hash = await bcrypt.hash(password_nueva, 10);
  await prisma.usuario.update({ where: { id }, data: { password_hash } });
  return { message: 'Contraseña actualizada correctamente' };
}

module.exports = { register, login, me, cambiarPassword };
