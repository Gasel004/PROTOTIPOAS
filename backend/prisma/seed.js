const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Usuarios base ──────────────────────────────────────
  const hash = await bcrypt.hash('Admin1234!', 10);

  const usuarioProd = await prisma.usuario.upsert({
    where:  { email: 'productor@laesperanza.com' },
    update: {},
    create: { nombre:'Juan Pérez', email:'productor@laesperanza.com', password_hash:hash, rol:'productor', telefono:'50299991111' },
  });
  const usuarioComp = await prisma.usuario.upsert({
    where:  { email: 'comprador@laesperanza.com' },
    update: {},
    create: { nombre:'Comercial Sur S.A.', email:'comprador@laesperanza.com', password_hash:hash, rol:'comprador', telefono:'50299992222' },
  });
  const usuarioAsoc = await prisma.usuario.upsert({
    where:  { email: 'asociacion@laesperanza.com' },
    update: {},
    create: { nombre:'Asociación Agrícola del Este', email:'asociacion@laesperanza.com', password_hash:hash, rol:'asociacion' },
  });

  // ── Perfiles ───────────────────────────────────────────
  const asoc = await prisma.asociacion.upsert({
    where:  { usuario_id: usuarioAsoc.id },
    update: {},
    create: { usuario_id:usuarioAsoc.id, nombre:'Asociación Agrícola del Este', departamento:'Chiquimula', municipio:'Chiquimula', descripcion:'Asociación de productores del oriente del país' },
  });

  await prisma.productor.upsert({
    where:  { usuario_id: usuarioProd.id },
    update: {},
    create: { usuario_id:usuarioProd.id, asociacion_id:asoc.id, departamento:'Chiquimula', municipio:'Chiquimula', hectareas:12.5, descripcion:'Productor de granos básicos con 15 años de experiencia', calificacion:4.8 },
  });

  await prisma.comprador.upsert({
    where:  { usuario_id: usuarioComp.id },
    update: {},
    create: { usuario_id:usuarioComp.id, razon_social:'Comercial Sur S.A.', nit:'123456789', departamento:'Guatemala', municipio:'Guatemala', tipo_comprador:'mayorista', calificacion:4.5 },
  });

  // ── Catálogo de productos ──────────────────────────────
  const productos = [
    { nombre:'Maíz',      categoria:'Granos básicos', unidad_medida:'quintal',  descripcion:'Maíz blanco o amarillo' },
    { nombre:'Frijol',    categoria:'Granos básicos', unidad_medida:'quintal',  descripcion:'Frijol negro o rojo' },
    { nombre:'Arroz',     categoria:'Granos básicos', unidad_medida:'quintal',  descripcion:'Arroz granza o pilado' },
    { nombre:'Tomate',    categoria:'Verduras',        unidad_medida:'caja',     descripcion:'Tomate manzano o cherry' },
    { nombre:'Papa',      categoria:'Tubérculos',      unidad_medida:'quintal',  descripcion:'Papa blanca o roja' },
    { nombre:'Cebolla',   categoria:'Verduras',        unidad_medida:'quintal',  descripcion:'Cebolla blanca o morada' },
    { nombre:'Aguacate',  categoria:'Frutas',          unidad_medida:'caja',     descripcion:'Aguacate Hass o criollo' },
    { nombre:'Chile',     categoria:'Verduras',        unidad_medida:'caja',     descripcion:'Chile pimiento o jalapeño' },
    { nombre:'Güicoy',    categoria:'Verduras',        unidad_medida:'caja',     descripcion:'Güicoy tierno o maduro' },
    { nombre:'Zanahoria', categoria:'Hortalizas',      unidad_medida:'libra',    descripcion:'Zanahoria fresca' },
    { nombre:'Repollo',   categoria:'Hortalizas',      unidad_medida:'unidad',   descripcion:'Repollo verde o morado' },
    { nombre:'Ejote',     categoria:'Hortalizas',      unidad_medida:'libra',    descripcion:'Ejote fresco' },
  ];

  for (const p of productos) {
    await prisma.producto.upsert({
      where:  { id: (await prisma.producto.findFirst({ where:{ nombre:p.nombre } }))?.id ?? 0 },
      update: {},
      create: p,
    });
  }

  console.log('✅ Seed completado.');
  console.log('');
  console.log('Cuentas de prueba (contraseña: Admin1234!):');
  console.log('  🌾 Productor:  productor@laesperanza.com');
  console.log('  🧑‍💼 Comprador:  comprador@laesperanza.com');
  console.log('  🏛  Asociación: asociacion@laesperanza.com');
}

main().catch(console.error).finally(() => prisma.$disconnect());
