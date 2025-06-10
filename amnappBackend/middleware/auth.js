const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Token de autenticación requerido'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.operador = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: true,
      message: 'Token inválido o expirado'
    });
  }
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: true,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  auth,
  validateRequest
}; 