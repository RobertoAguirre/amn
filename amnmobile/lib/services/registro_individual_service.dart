import 'package:dio/dio.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/registro_individual.dart';

class RegistroIndividualService {
  final Dio _dio;
  late Database _db;
  bool _initialized = false;

  RegistroIndividualService([Dio? dio]) : _dio = dio ?? Dio(BaseOptions(baseUrl: 'http://192.168.0.106:3000/api')) {
    _initDatabase();
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'registros_individuales.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE registros_individuales(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turnoId INTEGER NOT NULL,
            defecto TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            observaciones TEXT,
            firmaDigital TEXT,
            sincronizado INTEGER NOT NULL,
            fecha TEXT NOT NULL
          )
        ''');
      },
    );
    _initialized = true;
  }

  Future<int> guardarRegistro(RegistroIndividual registro) async {
    await _initDatabase();
    return await _db.insert('registros_individuales', {
      ...registro.toJson(),
      'sincronizado': 0,
    });
  }

  Future<List<RegistroIndividual>> obtenerRegistrosPorTurno(int turnoId) async {
    await _initDatabase();
    final List<Map<String, dynamic>> maps = await _db.query(
      'registros_individuales',
      where: 'turnoId = ?',
      whereArgs: [turnoId],
    );
    return List.generate(maps.length, (i) => RegistroIndividual.fromJson(maps[i]));
  }

  Future<List<RegistroIndividual>> obtenerRegistrosNoSincronizados() async {
    await _initDatabase();
    final List<Map<String, dynamic>> maps = await _db.query(
      'registros_individuales',
      where: 'sincronizado = ?',
      whereArgs: [0],
    );
    return List.generate(maps.length, (i) => RegistroIndividual.fromJson(maps[i]));
  }

  Future<void> marcarRegistroSincronizado(int id) async {
    await _initDatabase();
    await _db.update(
      'registros_individuales',
      {'sincronizado': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> sincronizarRegistros() async {
    final registros = await obtenerRegistrosNoSincronizados();
    for (final registro in registros) {
      try {
        final response = await _dio.post('/registro/individual/mvp', data: registro.toJson());
        if (response.statusCode == 201) {
          await marcarRegistroSincronizado(registro.id!);
        }
      } catch (e) {
        // Ignorar error, se reintentará después
      }
    }
  }
} 