import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'registro_individual_service.dart';
import 'turno_service.dart';

class SyncService {
  final RegistroIndividualService _registroService;
  final TurnoService _turnoService;
  StreamSubscription? _subscription;

  SyncService(this._registroService, this._turnoService);

  void start() {
    _subscription = Connectivity().onConnectivityChanged.listen((result) async {
      if (result != ConnectivityResult.none) {
        await _turnoService.sincronizarTurnos();
        await _registroService.sincronizarRegistros();
      }
    });
  }

  void dispose() {
    _subscription?.cancel();
  }
} 