import 'package:flutter/material.dart';
import '../models/turno.dart';
import '../services/turno_service.dart';
import 'nuevo_turno_screen.dart';

class TurnosScreen extends StatefulWidget {
  const TurnosScreen({super.key});

  @override
  State<TurnosScreen> createState() => _TurnosScreenState();
}

class _TurnosScreenState extends State<TurnosScreen> {
  late TurnoService _turnoService;
  List<Turno> _turnos = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _turnoService = TurnoService();
    _cargarTurnos();
  }

  Future<void> _cargarTurnos() async {
    setState(() => _isLoading = true);
    try {
      final turnos = await _turnoService.obtenerTurnos();
      setState(() {
        _turnos = turnos;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cargar turnos: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Turnos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () async {
              await _turnoService.sincronizarTurnos();
              _cargarTurnos();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _turnos.isEmpty
              ? const Center(child: Text('No hay turnos registrados'))
              : ListView.builder(
                  itemCount: _turnos.length,
                  itemBuilder: (context, index) {
                    final turno = _turnos[index];
                    return Card(
                      margin: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      child: ListTile(
                        title: Text('${turno.tipoTurno} - ${turno.producto}'),
                        subtitle: Text(
                          'Línea: ${turno.lineaProduccion}\n'
                          'Operador: ${turno.operador}\n'
                          'Producción: ${turno.cantidadProducida}',
                        ),
                        trailing: turno.sincronizado
                            ? const Icon(Icons.check_circle, color: Colors.green)
                            : const Icon(Icons.sync_problem, color: Colors.orange),
                        onTap: () {
                          // TODO: Implementar vista detallada del turno
                        },
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const NuevoTurnoScreen(),
            ),
          );
          if (result == true) {
            _cargarTurnos();
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }
} 