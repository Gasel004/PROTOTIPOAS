const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generarToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  );
}

async function register({ nombre, email, password, rol, telefono }) {
  if (!nombre || !email || !password || !rol)
    throw Object.assign(new Error('Datos requeridos faltantes'), { status: 400 });

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) throw Object.assign(new Error('El correo ya está registrado'), { status: 409 });

  const password_hash = await bcrypt.hash(password, 10);
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password_hash, rol, telefono }
  });

  // Crear perfil según rol
  if (rol === 'productor')
    await prisma.productor.create({ data: { usuario_id: usuario.id } });
  else if (rol === 'comprador')
    await prisma.comprador.create({ data: { usuario_id: usuario.id } });
  else if (rol === 'asociacion')
    await prisma.asociacion.create({ data: { usuario_id: usuario.id, nombre } });

  const token = generarToken(usuario);
  return { user: { id:usuario.id, nombre:usuario.nombre, email:usuario.email, rol:usuario.rol }, token };
}

async function login({ email, password }) {
  if (!email || !password)
    throw Object.assign(new Error('Email y contraseña requeridos'), { status: 400 });

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });
  if (!usuario.activo) throw Object.assign(new Error('Cuenta desactivada'), { status: 403 });

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) throw Object.assign(new Error('Credenciales incorrectas'), { status: 401 });

  const token = generarToken(usuario);
  return { user: { id:usuario.id, nombre:usuario.nombre, email:usuario.email, rol:usuario.rol }, token };
}

async function me(id) {
  const u = await prisma.usuario.findUnique({
    where: { id },
    include: { productor:true, comprador:true, asociacion:true }
  });
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  const { password_hash, ...rest } = u;
  return rest;
}

module.exports = { register, login, me };
