import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

class AuthService extends ChangeNotifier {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: Platform.isAndroid ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api',
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
  ));
  
  final _storage = const FlutterSecureStorage();
  String? _token;
  bool _isAuthenticated = false;

  bool get isAuthenticated => _isAuthenticated;
  String? get token => _token;
  Dio get dio => _dio;

  AuthService() {
    _initDio();
  }

  void _initDio() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_token != null) {
            options.headers['Authorization'] = 'Bearer $_token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  Future<bool> login(String username, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });

      if (response.statusCode == 200) {
        _token = response.data['token'];
        await _storage.write(key: 'token', value: _token);
        _isAuthenticated = true;
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Error en login: $e');
      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _isAuthenticated = false;
    await _storage.delete(key: 'token');
    notifyListeners();
  }

  Future<bool> checkAuth() async {
    debugPrint('Entrando a checkAuth');
    _token = await _storage.read(key: 'token');
    debugPrint('Token leído: [32m[1m[4m[7m$_token[0m');
    _isAuthenticated = _token != null;
    notifyListeners();
    debugPrint('¿Autenticado?: $_isAuthenticated');
    return _isAuthenticated;
  }
} 