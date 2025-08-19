import 'package:dio/dio.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../config/app_config.dart';

class ChecadorService {
  late final Dio _dio;
  late Database _db;
  bool _initialized = false;

  ChecadorService([Dio? dio]) {
    _dio = dio ?? Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    // Agregar interceptor para logging
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        print('🌐 [ChecadorService] Request: ${options.method} ${options.baseUrl}${options.path}');
        print('🌐 [ChecadorService] Data: ${options.data}');
        handler.next(options);
      },
      onResponse: (response, handler) {
        print('✅ [ChecadorService] Response: ${response.statusCode}');
        print('✅ [ChecadorService] Response data: ${response.data}');
        handler.next(response);
      },
      onError: (error, handler) {
        print('❌ [ChecadorService] Error: ${error.message}');
        print('❌ [ChecadorService] Error type: ${error.type}');
        print('❌ [ChecadorService] Error response: ${error.response?.data}');
        handler.next(error);
      },
    ));
    
    _initDatabase();
  }

  Future<void> _initDatabase() async {
    if (_initialized) return;
    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, AppConfig.databaseName);
      _db = await openDatabase(
        path,
        version: AppConfig.databaseVersion,
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
              precision REAL,
              sincronizado INTEGER
            )
          ''');
          print('✅ [ChecadorService] Base de datos creada');
        },
      );
      _initialized = true;
      print('✅ [ChecadorService] Base de datos inicializada');
    } catch (e) {
      print('❌ [ChecadorService] Error inicializando base de datos: $e');
    }
  }

  Future<int> guardarEvento(Map<String, dynamic> evento) async {
    try {
      await _initDatabase();
      final id = await _db.insert('eventos', {
        ...evento,
        'sincronizado': 0,
      });
      print('✅ [ChecadorService] Evento guardado localmente con ID: $id');
      return id;
    } catch (e) {
      print('❌ [ChecadorService] Error guardando evento: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> obtenerEventosNoSincronizados() async {
    try {
      await _initDatabase();
      final eventos = await _db.query('eventos', where: 'sincronizado = ?', whereArgs: [0]);
      print('📋 [ChecadorService] Eventos no sincronizados: ${eventos.length}');
      return eventos;
    } catch (e) {
      print('❌ [ChecadorService] Error obteniendo eventos: $e');
      return [];
    }
  }

  Future<void> marcarEventoSincronizado(int id) async {
    try {
      await _initDatabase();
      await _db.update('eventos', {'sincronizado': 1}, where: 'id = ?', whereArgs: [id]);
      print('✅ [ChecadorService] Evento $id marcado como sincronizado');
    } catch (e) {
      print('❌ [ChecadorService] Error marcando evento como sincronizado: $e');
    }
  }

  Future<void> sincronizarEventos() async {
    try {
      final eventos = await obtenerEventosNoSincronizados();
      if (eventos.isEmpty) {
        print('📋 [ChecadorService] No hay eventos para sincronizar');
        return;
      }
      
      print('🔄 [ChecadorService] Sincronizando ${eventos.length} eventos...');
      
      for (final evento in eventos) {
        try {
          print('📤 [ChecadorService] Enviando evento: ${evento['tipoEvento']} - ${evento['empleadoNombre']}');
          
          final response = await _dio.post('/checador/mvp', data: {
            'empleadoId': evento['empleadoId'],
            'empleadoNombre': evento['empleadoNombre'],
            'plantaId': evento['plantaId'],
            'plantaNombre': evento['plantaNombre'],
            'tipoEvento': evento['tipoEvento'],
            'fechaHora': evento['fechaHora'],
            'latitud': evento['latitud'],
            'longitud': evento['longitud'],
            'precision': evento['precision'],
          });
          
          if (response.statusCode == 201) {
            await marcarEventoSincronizado(evento['id'] as int);
            print('✅ [ChecadorService] Evento sincronizado exitosamente');
          } else {
            print('⚠️ [ChecadorService] Respuesta inesperada: ${response.statusCode}');
          }
        } on DioException catch (e) {
          print('❌ [ChecadorService] Error sincronizando evento: ${e.message}');
          // No marcar como sincronizado, se reintentará después
        } catch (e) {
          print('❌ [ChecadorService] Error inesperado sincronizando evento: $e');
        }
      }
    } catch (e) {
      print('❌ [ChecadorService] Error general en sincronización: $e');
    }
  }
} 