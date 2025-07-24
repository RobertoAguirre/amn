import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class AuthService {
  static const String baseUrl = AppConfig.baseUrl;
  late final Dio _dio;

  AuthService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Agregar interceptor para logging
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        print('🌐 [AuthService] Request: ${options.method} ${options.path}');
        handler.next(options);
      },
      onResponse: (response, handler) {
        print('✅ [AuthService] Response: ${response.statusCode}');
        handler.next(response);
      },
      onError: (error, handler) {
        print('❌ [AuthService] Error: ${error.message}');
        handler.next(error);
      },
    ));
  }

  // Verificar si el usuario está autenticado
  Future<bool> isAuthenticated() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      return token != null;
    } catch (e) {
      print('❌ [AuthService] Error verificando autenticación: $e');
      return false;
    }
  }

  // Obtener datos del usuario actual
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString('user');
      if (userJson != null) {
        return json.decode(userJson);
      }
      return null;
    } catch (e) {
      print('❌ [AuthService] Error obteniendo usuario: $e');
      return null;
    }
  }

  // Login
  Future<Map<String, dynamic>> login(String numeroEmpleado, String password) async {
    try {
      print('🔐 [AuthService] Intentando login para: $numeroEmpleado');
      
      final response = await _dio.post(
        '/auth/login',
        data: {
          'numero_empleado': numeroEmpleado,
          'password': password,
        },
      );

      if (response.statusCode == 200 && response.data['error'] == false) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', response.data['data']['token']);
        await prefs.setString('user', json.encode(response.data['data']['operador']));
        
        print('✅ [AuthService] Login exitoso para: $numeroEmpleado');
        
        return {
          'success': true,
          'data': response.data['data']['operador'],
        };
      } else {
        print('❌ [AuthService] Login fallido: ${response.data['message']}');
        return {
          'success': false,
          'message': response.data['message'] ?? 'Error en el login',
        };
      }
    } on DioException catch (e) {
      print('❌ [AuthService] Error de conexión: ${e.message}');
      
      if (e.type == DioExceptionType.connectionTimeout) {
        return {
          'success': false,
          'message': 'Error de conexión: Tiempo de espera agotado',
        };
      } else if (e.type == DioExceptionType.connectionError) {
        return {
          'success': false,
          'message': 'Error de conexión: No se pudo conectar al servidor',
        };
      } else if (e.response?.statusCode == 401) {
        return {
          'success': false,
          'message': 'Credenciales incorrectas',
        };
      } else if (e.response?.statusCode == 403) {
        return {
          'success': false,
          'message': 'Cuenta desactivada',
        };
      }
      
      return {
        'success': false,
        'message': 'Error de conexión: ${e.message}',
      };
    } catch (e) {
      print('❌ [AuthService] Error inesperado: $e');
      return {
        'success': false,
        'message': 'Error inesperado: $e',
      };
    }
  }

  // Registro
  Future<Map<String, dynamic>> register(String numeroEmpleado, String nombre, String password, String supervisor) async {
    try {
      print('📝 [AuthService] Intentando registro para: $numeroEmpleado');
      
      final response = await _dio.post(
        '/auth/register',
        data: {
          'numero_empleado': numeroEmpleado,
          'nombre': nombre,
          'password': password,
          'supervisor': supervisor,
        },
      );

      if (response.statusCode == 201 && response.data['error'] == false) {
        print('✅ [AuthService] Registro exitoso para: $numeroEmpleado');
        return {
          'success': true,
          'message': 'Usuario registrado exitosamente',
        };
      } else {
        print('❌ [AuthService] Registro fallido: ${response.data['message']}');
        return {
          'success': false,
          'message': response.data['message'] ?? 'Error en el registro',
        };
      }
    } on DioException catch (e) {
      print('❌ [AuthService] Error de conexión en registro: ${e.message}');
      
      if (e.response?.statusCode == 400) {
        return {
          'success': false,
          'message': e.response?.data['message'] ?? 'Error en el registro',
        };
      }
      
      return {
        'success': false,
        'message': 'Error de conexión: ${e.message}',
      };
    } catch (e) {
      print('❌ [AuthService] Error inesperado en registro: $e');
      return {
        'success': false,
        'message': 'Error inesperado: $e',
      };
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      await prefs.remove('user');
      print('🚪 [AuthService] Logout exitoso');
    } catch (e) {
      print('❌ [AuthService] Error en logout: $e');
    }
  }

  // Obtener token para requests autenticados
  Future<String?> getToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('token');
    } catch (e) {
      print('❌ [AuthService] Error obteniendo token: $e');
      return null;
    }
  }
} 