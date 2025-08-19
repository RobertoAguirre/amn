import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import 'checador_service.dart';

class BackgroundLocationService {
  static Timer? _backgroundTimer;
  static Position? _lastPosition;
  static DateTime? _lastUpdateTime;
  static bool _isRunning = false;

  static Future<void> startBackgroundService() async {
    if (_isRunning) return;
    
    _isRunning = true;
    print('✅ [Background] Servicio en segundo plano iniciado');
    
    // Iniciar timer que continúa funcionando
    _backgroundTimer = Timer.periodic(
      Duration(seconds: AppConfig.locationIntervalSeconds),
      (timer) => _sendLocationUpdate(),
    );
  }

  static Future<void> stopBackgroundService() async {
    _backgroundTimer?.cancel();
    _backgroundTimer = null;
    _isRunning = false;
    print('🛑 [Background] Servicio en segundo plano detenido');
  }

  static Future<void> _sendLocationUpdate() async {
    try {
      // Verificar si ya se envió recientemente (evitar duplicados)
      final now = DateTime.now();
      if (_lastUpdateTime != null) {
        final timeDiff = now.difference(_lastUpdateTime!).inSeconds;
        if (timeDiff < AppConfig.locationIntervalSeconds) {
          print('⏭️ [Background] Saltando actualización (muy reciente)');
          return;
        }
      }

      // Verificar permisos
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        print('❌ [Background] Permisos de ubicación denegados');
        return;
      }

      // Obtener ubicación
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
        timeLimit: Duration(seconds: AppConfig.locationTimeoutSeconds),
      );

      // Verificar si se movió lo suficiente
      if (_lastPosition != null) {
        final distancia = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        
        if (distancia < AppConfig.locationDistanceFilter) {
          print('📍 [Background] Dispositivo no se movió lo suficiente (${distancia.toStringAsFixed(1)}m < ${AppConfig.locationDistanceFilter}m)');
          return;
        }
      }

      _lastPosition = position;
      _lastUpdateTime = now;

      // Obtener datos del usuario desde SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      final empleadoId = prefs.getString('empleadoId') ?? '';
      final empleadoNombre = prefs.getString('empleadoNombre') ?? '';

      if (empleadoId.isEmpty || empleadoNombre.isEmpty) {
        print('❌ [Background] No hay datos de usuario disponibles');
        return;
      }

      // Crear evento
      final mexicoTime = now.toUtc().add(const Duration(hours: -6));

      final evento = {
        'empleadoId': empleadoId,
        'empleadoNombre': empleadoNombre,
        'plantaId': 'PLANTA_001',
        'plantaNombre': 'Planta Principal',
        'tipoEvento': 'ubicacion',
        'fechaHora': mexicoTime.toIso8601String(),
        'latitud': position.latitude,
        'longitud': position.longitude,
        'precision': position.accuracy,
        'sincronizado': 0,
      };

      // Guardar en SQLite y sincronizar
      final checadorService = ChecadorService();
      await checadorService.guardarEvento(evento);
      await checadorService.sincronizarEventos();

      print('📍 [Background] Ubicación enviada: ${position.latitude}, ${position.longitude} (precisión: ${position.accuracy}m)');

    } catch (e) {
      print('❌ [Background] Error enviando ubicación: $e');
    }
  }

  static Future<void> saveUserData(String empleadoId, String empleadoNombre) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('empleadoId', empleadoId);
    await prefs.setString('empleadoNombre', empleadoNombre);
    print('💾 [Background] Datos de usuario guardados para servicio en segundo plano');
  }

  static bool get isRunning => _isRunning;
}
