import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _numeroEmpleadoController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nombreController = TextEditingController();
  final _supervisorController = TextEditingController();
  
  bool _isLogin = true;
  bool _isLoading = false;
  String _errorMessage = '';
  String _successMessage = '';

  final AuthService _authService = AuthService();

  @override
  void dispose() {
    _numeroEmpleadoController.dispose();
    _passwordController.dispose();
    _nombreController.dispose();
    _supervisorController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = '';
      _successMessage = '';
    });

    try {
      Map<String, dynamic> result;
      
      if (_isLogin) {
        result = await _authService.login(
          _numeroEmpleadoController.text,
          _passwordController.text,
        );
      } else {
        result = await _authService.register(
          _numeroEmpleadoController.text,
          _nombreController.text,
          _passwordController.text,
          _supervisorController.text,
        );
      }

      if (result['success']) {
        if (_isLogin) {
          setState(() {
            _successMessage = 'Login exitoso';
          });
          // Navegar a la pantalla principal después de un breve delay
          Future.delayed(const Duration(milliseconds: 800), () {
            if (mounted) {
              Navigator.pushReplacementNamed(context, '/checador');
            }
          });
        } else {
          setState(() {
            _successMessage = result['message'];
            _isLogin = true; // Cambiar a modo login
          });
        }
      } else {
        setState(() {
          _errorMessage = result['message'];
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error inesperado: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _toggleMode() {
    setState(() {
      _isLogin = !_isLogin;
      _errorMessage = '';
      _successMessage = '';
      _numeroEmpleadoController.clear();
      _passwordController.clear();
      _nombreController.clear();
      _supervisorController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Card(
              elevation: 8,
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo o título
                      Icon(
                        Icons.location_on,
                        size: 64,
                        color: Colors.blue[600],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _isLogin ? 'Iniciar Sesión' : 'Registrar Usuario',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'AMN Control de Calidad',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Número de empleado
                      TextFormField(
                        controller: _numeroEmpleadoController,
                        decoration: const InputDecoration(
                          labelText: 'Número de Empleado',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.badge),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Por favor ingrese el número de empleado';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),

                      // Nombre (solo en registro)
                      if (!_isLogin) ...[
                        TextFormField(
                          controller: _nombreController,
                          decoration: const InputDecoration(
                            labelText: 'Nombre Completo',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.person),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Por favor ingrese su nombre';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Supervisor (solo en registro)
                      if (!_isLogin) ...[
                        TextFormField(
                          controller: _supervisorController,
                          decoration: const InputDecoration(
                            labelText: 'Supervisor',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.work),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Por favor ingrese el supervisor';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Contraseña
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Contraseña',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.lock),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Por favor ingrese la contraseña';
                          }
                          if (!_isLogin && value.length < 6) {
                            return 'La contraseña debe tener al menos 6 caracteres';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),

                      // Mensajes de error/éxito
                      if (_errorMessage.isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red[50],
                            border: Border.all(color: Colors.red[200]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _errorMessage,
                            style: TextStyle(color: Colors.red[700]),
                          ),
                        ),

                      if (_successMessage.isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.green[50],
                            border: Border.all(color: Colors.green[200]!),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _successMessage,
                            style: TextStyle(color: Colors.green[700]),
                          ),
                        ),

                      if (_errorMessage.isNotEmpty || _successMessage.isNotEmpty)
                        const SizedBox(height: 16),

                      // Botón de envío
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleSubmit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue[600],
                            foregroundColor: Colors.white,
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(_isLogin ? 'Iniciar Sesión' : 'Registrar'),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Cambiar modo
                      TextButton(
                        onPressed: _isLoading ? null : _toggleMode,
                        child: Text(
                          _isLogin
                              ? '¿No tienes cuenta? Regístrate'
                              : '¿Ya tienes cuenta? Inicia sesión',
                          style: TextStyle(color: Colors.blue[600]),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
} 