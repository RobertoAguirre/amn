import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import 'package:geolocator/geolocator.dart';
import '../models/turno.dart';
import '../services/turno_service.dart';

class NuevoTurnoScreen extends StatefulWidget {
  const NuevoTurnoScreen({super.key});

  @override
  State<NuevoTurnoScreen> createState() => _NuevoTurnoScreenState();
}

class _NuevoTurnoScreenState extends State<NuevoTurnoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _signatureController = SignatureController(
    penStrokeWidth: 5,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  final _tipoTurnoController = TextEditingController();
  final _operadorController = TextEditingController();
  final _supervisorController = TextEditingController();
  final _lineaProduccionController = TextEditingController();
  final _productoController = TextEditingController();
  final _loteController = TextEditingController();
  final _cantidadProducidaController = TextEditingController();
  final _cantidadRechazadaController = TextEditingController();

  bool _isLoading = false;
  final TurnoService _turnoService = TurnoService();

  Future<Position?> _obtenerUbicacion() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return null;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return null;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      return null;
    }

    return await Geolocator.getCurrentPosition();
  }

  @override
  void dispose() {
    _signatureController.dispose();
    _tipoTurnoController.dispose();
    _operadorController.dispose();
    _supervisorController.dispose();
    _lineaProduccionController.dispose();
    _productoController.dispose();
    _loteController.dispose();
    _cantidadProducidaController.dispose();
    _cantidadRechazadaController.dispose();
    super.dispose();
  }

  Future<void> _guardarTurno() async {
    if (!_formKey.currentState!.validate()) return;
    if (_signatureController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor firme el documento')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final firmaBytes = await _signatureController.toPngBytes();
      final firmaBase64 = firmaBytes != null
          ? base64Encode(firmaBytes)
          : null;

      final posicion = await _obtenerUbicacion();

      final turno = Turno(
        fecha: DateTime.now(),
        tipoTurno: _tipoTurnoController.text,
        operador: _operadorController.text,
        supervisor: _supervisorController.text,
        lineaProduccion: _lineaProduccionController.text,
        producto: _productoController.text,
        lote: _loteController.text,
        cantidadProducida: int.parse(_cantidadProducidaController.text),
        cantidadRechazada: int.parse(_cantidadRechazadaController.text),
        firmaDigital: firmaBase64,
        latitud: posicion?.latitude,
        longitud: posicion?.longitude,
      );

      await _turnoService.guardarTurno(turno);

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al guardar turno: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuevo Turno'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        labelText: 'Tipo de Turno',
                        border: OutlineInputBorder(),
                      ),
                      items: ['mañana', 'tarde', 'noche']
                          .map((tipo) => DropdownMenuItem(
                                value: tipo,
                                child: Text(tipo),
                              ))
                          .toList(),
                      onChanged: (value) {
                        _tipoTurnoController.text = value ?? '';
                      },
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Por favor seleccione un tipo de turno';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _operadorController,
                      decoration: const InputDecoration(
                        labelText: 'Operador',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese el operador';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _supervisorController,
                      decoration: const InputDecoration(
                        labelText: 'Supervisor',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese el supervisor';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _lineaProduccionController,
                      decoration: const InputDecoration(
                        labelText: 'Línea de Producción',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese la línea de producción';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _productoController,
                      decoration: const InputDecoration(
                        labelText: 'Producto',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese el producto';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _loteController,
                      decoration: const InputDecoration(
                        labelText: 'Lote',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese el lote';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _cantidadProducidaController,
                      decoration: const InputDecoration(
                        labelText: 'Cantidad Producida',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese la cantidad producida';
                        }
                        if (int.tryParse(value!) == null) {
                          return 'Por favor ingrese un número válido';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _cantidadRechazadaController,
                      decoration: const InputDecoration(
                        labelText: 'Cantidad Rechazada',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      validator: (value) {
                        if (value?.isEmpty ?? true) {
                          return 'Por favor ingrese la cantidad rechazada';
                        }
                        if (int.tryParse(value!) == null) {
                          return 'Por favor ingrese un número válido';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Firma Digital',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 200,
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Signature(
                        controller: _signatureController,
                        backgroundColor: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        TextButton(
                          onPressed: () => _signatureController.clear(),
                          child: const Text('Limpiar'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _guardarTurno,
                      child: const Text('Guardar Turno'),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
} 