import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import 'native_location_service.dart';

class RealBackgroundService {
  static bool _isInitialized = false;
  static bool _isTracking = false;

  // Inicializar el servicio
  static Future<void> initialize() async {
    if (_isInitialized) return;
    
    try {
      _isInitialized = true;
      print('✅ [RealBackground] Servicio inicializado correctamente');
    } catch (e) {
      print('❌ [RealBackground] Error inicializando: $e');
    }
  }

  // Iniciar el rastreo en segundo plano
  static Future<void> startBackgroundTracking() async {
    try {
      await initialize();
      
      // Obtener datos del usuario
      final prefs = await SharedPreferences.getInstance();
      final empleadoId = prefs.getString('empleadoId') ?? '';
      final empleadoNombre = prefs.getString('empleadoNombre') ?? '';
      
      if (empleadoId.isEmpty || empleadoNombre.isEmpty) {
        print('❌ [RealBackground] No hay datos de usuario disponibles');
        return;
      }

      // Configurar datos del usuario en el servicio nativo
      await NativeLocationService.setUserData(empleadoId, empleadoNombre);

      // Iniciar el servicio nativo
      final success = await NativeLocationService.startBackgroundTracking();
      
      if (success) {
        _isTracking = true;
        print('✅ [RealBackground] Rastreo en segundo plano iniciado (servicio nativo)');
      } else {
        print('❌ [RealBackground] Error iniciando servicio nativo');
      }
    } catch (e) {
      print('❌ [RealBackground] Error iniciando rastreo: $e');
    }
  }

  // Detener el rastreo en segundo plano
  static Future<void> stopBackgroundTracking() async {
    try {
      final success = await NativeLocationService.stopBackgroundTracking();
      
      if (success) {
        _isTracking = false;
        print('🛑 [RealBackground] Rastreo en segundo plano detenido (servicio nativo)');
      } else {
        print('❌ [RealBackground] Error deteniendo servicio nativo');
      }
    } catch (e) {
      print('❌ [RealBackground] Error deteniendo rastreo: $e');
    }
  }

  // Verificar si está ejecutándose
  static Future<bool> isRunning() async {
    try {
      return await NativeLocationService.isServiceRunning();
    } catch (e) {
      return _isTracking;
    }
  }

  // Guardar datos del usuario
  static Future<void> saveUserData(String empleadoId, String empleadoNombre) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('empleadoId', empleadoId);
    await prefs.setString('empleadoNombre', empleadoNombre);
    print('💾 [RealBackground] Datos de usuario guardados');
  }
}
