require('dotenv').config();
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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use(limiter);

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

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
}); 