import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;
import '../services/checador_service.dart';

class ChecadorScreen extends StatefulWidget {
  const ChecadorScreen({super.key});

  @override
  State<ChecadorScreen> createState() => _ChecadorScreenState();
}

class _ChecadorScreenState extends State<ChecadorScreen> {
  late Database _db;
  bool _initialized = false;
  bool _isSaving = false;

  // Datos fijos para demo
  final String empleadoId = 'E001';
  final String empleadoNombre = 'Juan Pérez';
  final String plantaId = 'P001';
  final String plantaNombre = 'Planta Demo';

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
    try {
      return await Geolocator.getCurrentPosition().timeout(const Duration(seconds: 10));
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
    _registrarUbicacionAlAbrir();
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, 'checador.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE eventos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleadoId TEXT,
            empleadoNombre TEXT,
            plantaId TEXT,
            plantaNombre TEXT,
            tipoEvento TEXT,
            fechaHora TEXT,
            latitud REAL,
            longitud REAL,
            sincronizado INTEGER
          )
        ''');
      },
    );
    _initialized = true;
  }

  Future<void> _registrarUbicacionAlAbrir() async {
    final posicion = await _obtenerUbicacionConPermisoYTimeout(context);
    if (posicion == null) return;
    final now = DateTime.now();
    await _initDatabase();
    await _db.insert('eventos', {
      'empleadoId': empleadoId,
      'empleadoNombre': empleadoNombre,
      'plantaId': plantaId,
      'plantaNombre': plantaNombre,
      'tipoEvento': 'Ubicación automática',
      'fechaHora': now.toIso8601String(),
      'latitud': posicion.latitude,
      'longitud': posicion.longitude,
      'sincronizado': 0,
    });
    if (mounted) {
      try {
        final service = ChecadorService();
        await service.sincronizarEventos();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ubicación enviada')),
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
      final now = DateTime.now();
      await _initDatabase();
      await _db.insert('eventos', {
        'empleadoId': empleadoId,
        'empleadoNombre': empleadoNombre,
        'plantaId': plantaId,
        'plantaNombre': plantaNombre,
        'tipoEvento': tipoEvento,
        'fechaHora': now.toIso8601String(),
        'latitud': posicion.latitude,
        'longitud': posicion.longitude,
        'sincronizado': 0,
      });
      if (mounted) {
        try {
          final service = ChecadorService();
          await service.sincronizarEventos();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Evento "$tipoEvento" enviado')),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: SizedBox(
        width: double.infinity,
        height: 60,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: color,
            foregroundColor: Colors.white,
            textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onPressed: _isSaving ? null : () => _registrarEvento(label),
          child: Text(label),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checador de Actividades')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildButton('Simular entrada a planta', Colors.blueGrey),
            _buildButton('Inicio de trabajo', Colors.green),
            _buildButton('Comida', Colors.orange),
            _buildButton('Reanudar trabajo', Colors.teal),
            _buildButton('Cierre', Colors.red),
          ],
        ),
      ),
    );
  }
} 