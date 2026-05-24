const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed');

  const hash = await bcrypt.hash('Admin1234!', 10);

  const usuarioProd = await prisma.usuario.upsert({
    where:  { telefono: '4000-0001' },
    update: {},
    create: { nombre:'Juan Pérez', telefono:'4000-0001', password_hash:hash, rol:'productor' },
  });
  const usuarioComp = await prisma.usuario.upsert({
    where:  { telefono: '4000-0002' },
    update: {},
    create: { nombre:'Comercial Sur S.A.', telefono:'4000-0002', password_hash:hash, rol:'comprador' },
  });
  const usuarioAsoc = await prisma.usuario.upsert({
    where:  { telefono: '4000-0003' },
    update: {},
    create: { nombre:'Asociación Agrícola del Este', telefono:'4000-0003', password_hash:hash, rol:'asociacion' },
  });

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

  console.log('Seed completado.');
  console.log('');
  console.log('Cuentas de prueba (contraseña: Admin1234!):');
  console.log('Productor:  4000-0001');
  console.log('Comprador:  4000-0002');
  console.log('Asociación: 4000-0003');
}

main().catch(console.error).finally(() => prisma.$disconnect());
