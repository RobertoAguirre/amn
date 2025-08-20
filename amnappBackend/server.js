require('dotenv').config();

// Configurar zona horaria para México (UTC-6)
process.env.TZ = 'America/Mexico_City';

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// Configuración del logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Validar variables de entorno requeridas
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Faltan las siguientes variables de entorno: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();

// Middleware
app.use(helmet());

// Configuración mejorada de CORS para dispositivos móviles
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como apps móviles)
    if (!origin) return callback(null, true);
    
    // Permitir localhost y IPs de red local
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://192.168.0.109:5173',
      'http://192.168.0.109:3000',
      'capacitor://localhost',
      'ionic://localhost'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado para origin: ${origin}`);
      callback(null, true); // Permitir temporalmente para pruebas
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting más permisivo para apps móviles
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // Aumentado para apps móviles
  message: {
    error: true,
    message: 'Demasiadas requests, intente más tarde'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware para logging de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('✅ Conexión exitosa a MongoDB');
    logger.info(`📦 Base de datos: ${process.env.MONGODB_URI.split('/').pop()}`);
    logger.info(`🔌 Puerto: ${process.env.PORT || 3000}`);
    logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
  })
  .catch(err => {
    logger.error('❌ Error conectando a MongoDB:', err);
    process.exit(1);
  });

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/registro', require('./routes/registro'));
app.use('/api/turnos', require('./routes/turnos'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/geocercas', require('./routes/geocercas'));

// Endpoint MVP para checador (ubicación de dispositivos)
app.use('/api/checador', require('./routes/checador_mvp'));

// Endpoint de salud para verificar que el servidor esté funcionando
app.get('/api/health', (req, res) => {
  res.json({
    error: false,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error en ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: true,
    message: 'Ruta no encontrada'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`🌐 Accesible en: http://localhost:${PORT}`);
  logger.info(`📱 Para dispositivos móviles: http://192.168.0.109:${PORT}`);
}); 