import 'dart:async';
import 'package:flutter/services.dart';

class NativeLocationService {
  static const MethodChannel _channel = MethodChannel('amn_location_service');

  // Iniciar el servicio nativo
  static Future<bool> startBackgroundTracking() async {
    try {
      final bool result = await _channel.invokeMethod('startBackgroundTracking');
      print('✅ [NativeLocation] Servicio nativo iniciado: $result');
      return result;
    } on PlatformException catch (e) {
      print('❌ [NativeLocation] Error iniciando servicio: ${e.message}');
      return false;
    }
  }

  // Detener el servicio nativo
  static Future<bool> stopBackgroundTracking() async {
    try {
      final bool result = await _channel.invokeMethod('stopBackgroundTracking');
      print('🛑 [NativeLocation] Servicio nativo detenido: $result');
      return result;
    } on PlatformException catch (e) {
      print('❌ [NativeLocation] Error deteniendo servicio: ${e.message}');
      return false;
    }
  }

  // Verificar si el servicio está ejecutándose
  static Future<bool> isServiceRunning() async {
    try {
      final bool result = await _channel.invokeMethod('isServiceRunning');
      return result;
    } on PlatformException catch (e) {
      print('❌ [NativeLocation] Error verificando servicio: ${e.message}');
      return false;
    }
  }

  // Configurar datos del usuario en el servicio nativo
  static Future<bool> setUserData(String empleadoId, String empleadoNombre) async {
    try {
      final bool result = await _channel.invokeMethod('setUserData', {
        'empleadoId': empleadoId,
        'empleadoNombre': empleadoNombre,
      });
      print('💾 [NativeLocation] Datos de usuario configurados: $result');
      return result;
    } on PlatformException catch (e) {
      print('❌ [NativeLocation] Error configurando datos: ${e.message}');
      return false;
    }
  }
}
