const mongoose = require('mongoose');
const Operador = require('./models/Operador');
require('dotenv').config();

async function crearUsuarioPrueba() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear usuario E002 para el nuevo dispositivo
    const usuarioPrueba = new Operador({
      numero_empleado: 'E002',
      nombre: 'María García',
      password: '123456',
      supervisor: 'Sistema',
      activo: true
    });

    await usuarioPrueba.save();
    console.log('✅ Usuario E002 creado exitosamente');
    console.log('📋 Datos para el nuevo dispositivo:');
    console.log('   Número de empleado: E002');
    console.log('   Contraseña: 123456');
    console.log('   Nombre: María García');

  } catch (error) {
    if (error.code === 11000) {
      console.log('⚠️  El usuario E002 ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

crearUsuarioPrueba(); 