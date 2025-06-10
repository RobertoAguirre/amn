const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const Operador = require('../models/Operador');
const { auth, validateRequest } = require('../middleware/auth');

// Validaciones para registro
const registerValidation = [
  body('numero_empleado')
    .notEmpty().withMessage('El número de empleado es requerido')
    .isString().withMessage('El número de empleado debe ser texto'),
  body('nombre')
    .notEmpty().withMessage('El nombre es requerido')
    .isString().withMessage('El nombre debe ser texto'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('supervisor')
    .notEmpty().withMessage('El supervisor es requerido')
    .isString().withMessage('El supervisor debe ser texto')
];

// Validaciones para login
const loginValidation = [
  body('numero_empleado')
    .notEmpty().withMessage('El número de empleado es requerido'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
];

// POST /api/auth/register
router.post('/register', registerValidation, validateRequest, async (req, res) => {
  try {
    const { numero_empleado, nombre, password, supervisor } = req.body;

    // Verificar si el operador ya existe
    const operadorExistente = await Operador.findOne({ numero_empleado });
    if (operadorExistente) {
      return res.status(400).json({
        error: true,
        message: 'El número de empleado ya está registrado'
      });
    }

    // Crear nuevo operador
    const operador = new Operador({
      numero_empleado,
      nombre,
      password,
      supervisor
    });

    await operador.save();

    res.status(201).json({
      error: false,
      message: 'Operador registrado exitosamente',
      data: {
        _id: operador._id,
        numero_empleado: operador.numero_empleado,
        nombre: operador.nombre,
        supervisor: operador.supervisor
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al registrar operador',
      details: error.message
    });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { numero_empleado, password } = req.body;

    // Buscar operador
    const operador = await Operador.findOne({ numero_empleado });
    if (!operador) {
      return res.status(401).json({
        error: true,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar password
    const passwordValido = await operador.comparePassword(password);
    if (!passwordValido) {
      return res.status(401).json({
        error: true,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si está activo
    if (!operador.activo) {
      return res.status(403).json({
        error: true,
        message: 'Cuenta desactivada'
      });
    }

    // Actualizar último login
    operador.last_login = new Date();
    await operador.save();

    // Generar token
    const token = operador.generateAuthToken();

    res.json({
      error: false,
      message: 'Login exitoso',
      data: {
        token,
        operador: {
          _id: operador._id,
          numero_empleado: operador.numero_empleado,
          nombre: operador.nombre,
          supervisor: operador.supervisor
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al iniciar sesión',
      details: error.message
    });
  }
});

module.exports = router; 