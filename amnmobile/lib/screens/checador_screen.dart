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
    _registrarUbicacionAlAbrir();
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
    print('🕐 [Checador] Timer de ubicación iniciado: cada ${AppConfig.locationIntervalSeconds} segundos');
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
        print('👤 [Checador] Usuario cargado: $empleadoNombre ($empleadoId)');
      }
    } catch (e) {
      print('❌ [Checador] Error cargando datos de usuario: $e');
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
        print('🗄️ [Checador] Base de datos SQLite creada');
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
          SnackBar(
            content: Text('📍 Ubicación enviada: ${posicion.latitude.toStringAsFixed(6)}, ${posicion.longitude.toStringAsFixed(6)}'),
            backgroundColor: Colors.green,
          ),
        );
        print('✅ [Checador] Ubicación inicial enviada y sincronizada');
      } catch (e) {
        print('❌ [Checador] Error sincronizando ubicación inicial: $e');
      }
    }
  }

  Future<void> _registrarEvento(String tipoEvento) async {
    if (_isSaving) return;
    
    setState(() {
      _isSaving = true;
    });

    try {
      final posicion = await _obtenerUbicacionConPermisoYTimeout(context);
      if (posicion == null) {
        setState(() {
          _isSaving = false;
        });
        return;
      }

      // Usar hora local de México (UTC-6) con mejor manejo de zona horaria
      final now = DateTime.now();
      final mexicoTime = now.toUtc().add(const Duration(hours: -6));
      
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

      // Sincronizar inmediatamente
      final service = ChecadorService();
      await service.sincronizarEventos();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ $tipoEvento registrado correctamente'),
            backgroundColor: Colors.green,
          ),
        );
      }
      
      print('✅ [Checador] Evento "$tipoEvento" registrado y sincronizado');
      
    } catch (e) {
      print('❌ [Checador] Error registrando evento: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  Widget _buildButton(String text, Color color, String tipoEvento) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        child: ElevatedButton(
          onPressed: _isSaving ? null : () => _registrarEvento(tipoEvento),
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: _isSaving
              ? const CircularProgressIndicator(color: Colors.white)
              : Text(
                  text,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checador de Actividades'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final authService = AuthService();
              await authService.logout();
              if (mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Información del usuario
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.grey[100],
            child: Column(
              children: [
                Text(
                  'Empleado: $empleadoNombre',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'ID: $empleadoId',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Text(
                  'Planta: $plantaNombre',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ],
            ),
          ),
          
          // Botones de actividades
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  _buildButton('Simular entrada a planta', Colors.blue, 'simular_entrada'),
                  _buildButton('Inicio de trabajo', Colors.green, 'inicio_trabajo'),
                  _buildButton('Comida', Colors.orange, 'comida'),
                  _buildButton('Reanudar trabajo', Colors.teal, 'reanudar_trabajo'),
                  _buildButton('Cierre', Colors.red, 'cierre'),
                ],
              ),
            ),
          ),
          
          // Información de rastreo
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            color: Colors.blue[50],
            child: Column(
              children: [
                const Text(
                  '🕐 Rastreo Automático Activo',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ubicación cada ${AppConfig.locationIntervalSeconds} segundos',
                  style: const TextStyle(fontSize: 12),
                ),
                Text(
                  'Precisión: ${AppConfig.desiredAccuracy}m',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
