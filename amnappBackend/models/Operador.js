const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const operadorSchema = new mongoose.Schema({
  numero_empleado: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  supervisor: {
    type: String,
    required: true,
    trim: true
  },
  activo: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Método para hashear password antes de guardar
operadorSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 8);
  }
  next();
});

// Método para comparar passwords
operadorSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Método para generar token JWT
operadorSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      _id: this._id.toString(),
      numero_empleado: this.numero_empleado,
      nombre: this.nombre
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

const Operador = mongoose.model('Operador', operadorSchema);

module.exports = Operador; 