import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import 'dart:async';
import '../services/checador_service.dart';
import '../services/auth_service.dart';
import '../config/app_config.dart';

class ChecadorScreen extends StatefulWidget {
  const ChecadorScreen({super.key});

  @override
  State<ChecadorScreen> createState() => _ChecadorScreenState();
}

class _ChecadorScreenState extends State<ChecadorScreen> {
  late Database _db;
  bool _initialized = false;
  bool _isSaving = false;
  Timer? _locationTimer;
  Position? _lastPosition;

  // Datos del usuario autenticado
  String empleadoId = '';
  String empleadoNombre = '';
  String plantaId = '';
  String plantaNombre = '';

  Future<Position?> _obtenerUbicacionConPermisoYTimeout(BuildContext context) async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permiso de ubicación denegado. No se puede registrar ubicación.')),
        );
      }
      return null;
    }
    
    // Verificar si el GPS está habilitado
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Servicios de ubicación deshabilitados. Habilítalos en configuración.')),
        );
      }
      return null;
    }
    
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best, // Máxima precisión
        timeLimit: Duration(seconds: AppConfig.locationTimeoutSeconds),
        forceAndroidLocationManager: false, // Usar Google Play Services si está disponible
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al obtener ubicación: $e')),
        );
      }
      return null;
    }
  }

  @override
  void initState() {
    super.initState();
    _initDatabase();
    _cargarDatosUsuario();
    _iniciarTimerUbicacion();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    super.dispose();
  }

  void _iniciarTimerUbicacion() {
    _locationTimer = Timer.periodic(
      Duration(seconds: AppConfig.locationIntervalSeconds),
      (timer) => _enviarUbicacionAutomatica(),
    );
  }

  Future<void> _enviarUbicacionAutomatica() async {
    if (!mounted) return;
    
    try {
      final posicion = await _obtenerUbicacionConPermisoYTimeout(context);
      if (posicion == null) return;

      // Verificar si se movió lo suficiente para enviar
      if (_lastPosition != null) {
        final distancia = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          posicion.latitude,
          posicion.longitude,
        );
        
        if (distancia < AppConfig.locationDistanceFilter) {
          print('📍 [Checador] Dispositivo no se movió lo suficiente (${distancia.toStringAsFixed(1)}m < ${AppConfig.locationDistanceFilter}m)');
          return;
        }
      }

      _lastPosition = posicion;
      
      // Usar hora local de México (UTC-6) con mejor manejo de zona horaria
      final now = DateTime.now();
      final mexicoTime = now.toUtc().add(const Duration(hours: -6));
      
      await _initDatabase();
      await _db.insert('eventos', {
        'empleadoId': empleadoId,
        'empleadoNombre': empleadoNombre,
        'plantaId': plantaId,
        'plantaNombre': plantaNombre,
        'tipoEvento': 'ubicacion',
        'fechaHora': mexicoTime.toIso8601String(),
        'latitud': posicion.latitude,
        'longitud': posicion.longitude,
        'precision': posicion.accuracy,
        'sincronizado': 0,
      });

      // Sincronizar inmediatamente
      final service = ChecadorService();
      await service.sincronizarEventos();
      
      print('📍 [Checador] Ubicación automática enviada: ${posicion.latitude}, ${posicion.longitude} (precisión: ${posicion.accuracy}m)');
      print('🕐 [Checador] Hora local México: ${mexicoTime.toLocal()}');
      print('🔄 [Checador] Sincronización iniciada...');
      
    } catch (e) {
      print('❌ [Checador] Error en envío automático: $e');
    }
  }

  Future<void> _cargarDatosUsuario() async {
    try {
      final authService = AuthService();
      final user = await authService.getCurrentUser();
      if (user != null) {
        setState(() {
          empleadoId = user.numeroEmpleado;
          empleadoNombre = user.nombre;
          plantaId = 'PLANTA_001'; // Valor por defecto
          plantaNombre = 'Planta Principal'; // Valor por defecto
        });
      }
    } catch (e) {
      print('Error cargando datos de usuario: $e');
    }
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, AppConfig.databaseName);
    _db = await openDatabase(
      path,
      version: AppConfig.databaseVersion,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE eventos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleadoId TEXT NOT NULL,
            empleadoNombre TEXT NOT NULL,
            plantaId TEXT,
            plantaNombre TEXT,
            tipoEvento TEXT NOT NULL,
            fechaHora TEXT NOT NULL,
            latitud REAL NOT NULL,
            longitud REAL NOT NULL,
            precision REAL,
            sincronizado INTEGER NOT NULL DEFAULT 0
          )
        ''');
      },
    );
    _initialized = true;
  }

  Future<void> _registrarUbicacionAlAbrir() async {
    final posicion = await _obtenerUbicacionConPermisoYTimeout(context);
    if (posicion == null) return;
    
    // Usar hora local de México (UTC-6) con mejor manejo de zona horaria
    final now = DateTime.now();
    final mexicoTime = now.toUtc().add(const Duration(hours: -6));
    
    await _initDatabase();
    await _db.insert('eventos', {
      'empleadoId': empleadoId,
      'empleadoNombre': empleadoNombre,
      'plantaId': plantaId,
      'plantaNombre': plantaNombre,
      'tipoEvento': 'apertura_app',
      'fechaHora': now.toIso8601String(),
      'latitud': posicion.latitude,
      'longitud': posicion.longitude,
      'precision': posicion.accuracy,
      'sincronizado': 0,
    });
    
    _lastPosition = posicion;
    
    if (mounted) {
      try {
        final service = ChecadorService();
        await service.sincronizarEventos();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ubicación inicial enviada (precisión: ${posicion.accuracy.toStringAsFixed(1)}m)')),
        );
      } catch (_) {}
    }
  }

  Future<void> _registrarEvento(String tipoEvento) async {
    setState(() => _isSaving = true);
    try {
      final posicion = await _obtenerUbicacionConPermisoYTimeout(context);
      if (posicion == null) {
        setState(() => _isSaving = false);
        return;
      }
      
      // Usar hora local de México (UTC-6)
      final now = DateTime.now().toUtc().add(const Duration(hours: -6));
      
      await _initDatabase();
      await _db.insert('eventos', {
        'empleadoId': empleadoId,
        'empleadoNombre': empleadoNombre,
        'plantaId': plantaId,
        'plantaNombre': plantaNombre,
        'tipoEvento': tipoEvento,
        'fechaHora': mexicoTime.toIso8601String(),
        'latitud': posicion.latitude,
        'longitud': posicion.longitude,
        'precision': posicion.accuracy,
        'sincronizado': 0,
      });
      
      _lastPosition = posicion;
      
      if (mounted) {
        try {
          final service = ChecadorService();
          await service.sincronizarEventos();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Evento "$tipoEvento" enviado (precisión: ${posicion.accuracy.toStringAsFixed(1)}m)')),
          );
        } catch (_) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Evento registrado localmente, pero no se pudo enviar')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al registrar evento: $e')),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Widget _buildButton(String label, Color color) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: ElevatedButton(
          onPressed: _isSaving ? null : () => _registrarEvento(label),
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: _isSaving
              ? const CircularProgressIndicator(color: Colors.white)
              : Text(label, style: const TextStyle(fontSize: 16)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checador de Ubicación'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.location_on, size: 48, color: Colors.blue),
                    const SizedBox(height: 8),
                    Text(
                      'Empleado: $empleadoNombre',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    Text('ID: $empleadoId', style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 16),
                    const Text(
                      '📍 Envío automático cada ${AppConfig.locationIntervalSeconds} segundos\n'
                      '📏 Solo si se mueve más de ${AppConfig.locationDistanceFilter} metros\n'
                      '🎯 Precisión objetivo: ${AppConfig.desiredAccuracy} metros',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Eventos Manuales:',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildButton('Inicio Trabajo', Colors.green),
                _buildButton('Fin Trabajo', Colors.red),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildButton('Pausa', Colors.orange),
                _buildButton('Reanudar', Colors.blue),
              ],
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _registrarUbicacionAlAbrir,
              icon: const Icon(Icons.my_location),
              label: const Text('Enviar Ubicación Ahora'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.purple,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
} 