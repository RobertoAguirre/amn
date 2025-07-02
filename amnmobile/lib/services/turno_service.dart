import 'package:dio/dio.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/turno.dart';

class TurnoService {
  final Dio _dio;
  late Database _db;
  bool _initialized = false;

  TurnoService([Dio? dio]) : _dio = dio ?? Dio(BaseOptions(baseUrl: 'http://10.0.2.2:3000/api')) {
    _initDatabase();
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'turnos.db');
    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE turnos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            tipoTurno TEXT NOT NULL,
            operador TEXT NOT NULL,
            supervisor TEXT NOT NULL,
            lineaProduccion TEXT NOT NULL,
            producto TEXT NOT NULL,
            lote TEXT NOT NULL,
            cantidadProducida INTEGER NOT NULL,
            cantidadRechazada INTEGER NOT NULL,
            firmaDigital TEXT,
            sincronizado INTEGER NOT NULL,
            latitud REAL,
            longitud REAL
          )
        ''');
      },
    );
    _initialized = true;
  }

  Future<int> guardarTurno(Turno turno) async {
    await _initDatabase();
    return await _db.insert('turnos', {
      ...turno.toJson(),
      'sincronizado': 0,
    });
  }

  Future<List<Turno>> obtenerTurnos() async {
    await _initDatabase();
    final List<Map<String, dynamic>> maps = await _db.query('turnos');
    return List.generate(maps.length, (i) => Turno.fromJson(maps[i]));
  }

  Future<List<Turno>> obtenerTurnosNoSincronizados() async {
    await _initDatabase();
    final List<Map<String, dynamic>> maps = await _db.query(
      'turnos',
      where: 'sincronizado = ?',
      whereArgs: [0],
    );
    return List.generate(maps.length, (i) => Turno.fromJson(maps[i]));
  }

  Future<void> marcarTurnoSincronizado(int id) async {
    await _initDatabase();
    await _db.update(
      'turnos',
      {'sincronizado': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> sincronizarTurnos() async {
    final turnos = await obtenerTurnosNoSincronizados();
    for (final turno in turnos) {
      try {
        final response = await _dio.post('/turnos/mvp', data: turno.toJson());
        if (response.statusCode == 201) {
          await marcarTurnoSincronizado(turno.id!);
        }
      } catch (e) {
        // Ignorar error, se reintentará después
      }
    }
  }
} 