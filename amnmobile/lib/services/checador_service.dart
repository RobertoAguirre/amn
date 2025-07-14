import 'package:dio/dio.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class ChecadorService {
  final Dio _dio;
  late Database _db;
  bool _initialized = false;

  ChecadorService([Dio? dio]) : _dio = dio ?? Dio(BaseOptions(baseUrl: 'http://192.168.0.106:3000/api')) {
    _initDatabase();
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'checador.db');
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

  Future<int> guardarEvento(Map<String, dynamic> evento) async {
    await _initDatabase();
    return await _db.insert('eventos', {
      ...evento,
      'sincronizado': 0,
    });
  }

  Future<List<Map<String, dynamic>>> obtenerEventosNoSincronizados() async {
    await _initDatabase();
    return await _db.query('eventos', where: 'sincronizado = ?', whereArgs: [0]);
  }

  Future<void> marcarEventoSincronizado(int id) async {
    await _initDatabase();
    await _db.update('eventos', {'sincronizado': 1}, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> sincronizarEventos() async {
    final eventos = await obtenerEventosNoSincronizados();
    for (final evento in eventos) {
      try {
        final response = await _dio.post('/checador/mvp', data: evento);
        if (response.statusCode == 201) {
          await marcarEventoSincronizado(evento['id'] as int);
        }
      } catch (e) {
        // Ignorar error, se reintentará después
      }
    }
  }
} 