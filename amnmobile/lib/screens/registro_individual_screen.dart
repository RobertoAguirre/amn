import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';
import '../models/registro_individual.dart';
import '../services/registro_individual_service.dart';

class RegistroIndividualScreen extends StatefulWidget {
  final int turnoId;
  const RegistroIndividualScreen({super.key, required this.turnoId});

  @override
  State<RegistroIndividualScreen> createState() => _RegistroIndividualScreenState();
}

class _RegistroIndividualScreenState extends State<RegistroIndividualScreen> {
  final _formKey = GlobalKey<FormState>();
  final _defectoController = TextEditingController();
  final _cantidadController = TextEditingController();
  final _observacionesController = TextEditingController();
  final _signatureController = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );
  final RegistroIndividualService _service = RegistroIndividualService();
  bool _isLoading = false;
  List<RegistroIndividual> _registros = [];

  @override
  void initState() {
    super.initState();
    _cargarRegistros();
  }

  Future<void> _cargarRegistros() async {
    setState(() => _isLoading = true);
    final registros = await _service.obtenerRegistrosPorTurno(widget.turnoId);
    setState(() {
      _registros = registros;
      _isLoading = false;
    });
  }

  Future<void> _guardarRegistro() async {
    if (!_formKey.currentState!.validate()) return;
    if (_signatureController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor firme el registro')),
      );
      return;
    }
    setState(() => _isLoading = true);
    try {
      final firmaBytes = await _signatureController.toPngBytes();
      final firmaBase64 = firmaBytes != null ? base64Encode(firmaBytes) : null;
      final registro = RegistroIndividual(
        turnoId: widget.turnoId,
        defecto: _defectoController.text,
        cantidad: int.parse(_cantidadController.text),
        observaciones: _observacionesController.text,
        firmaDigital: firmaBase64,
        fecha: DateTime.now(),
      );
      await _service.guardarRegistro(registro);
      _defectoController.clear();
      _cantidadController.clear();
      _observacionesController.clear();
      _signatureController.clear();
      await _cargarRegistros();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error al guardar: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _defectoController.dispose();
    _cantidadController.dispose();
    _observacionesController.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registro de Actividades')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Form(
                    key: _formKey,
                    child: Column(
                      children: [
                        TextFormField(
                          controller: _defectoController,
                          decoration: const InputDecoration(
                            labelText: 'Actividad/Defecto',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v == null || v.isEmpty ? 'Campo requerido' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _cantidadController,
                          decoration: const InputDecoration(
                            labelText: 'Cantidad',
                            border: OutlineInputBorder(),
                          ),
                          keyboardType: TextInputType.number,
                          validator: (v) => v == null || v.isEmpty ? 'Campo requerido' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _observacionesController,
                          decoration: const InputDecoration(
                            labelText: 'Observaciones',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text('Firma Digital'),
                        Container(
                          height: 120,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Signature(
                            controller: _signatureController,
                            backgroundColor: Colors.white,
                          ),
                        ),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed: () => _signatureController.clear(),
                              child: const Text('Limpiar'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _guardarRegistro,
                          child: const Text('Agregar Actividad'),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Divider(),
                  const Text('Actividades Registradas', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ..._registros.map((r) => Card(
                        child: ListTile(
                          title: Text(r.defecto),
                          subtitle: Text('Cantidad: ${r.cantidad}\n${r.observaciones ?? ''}'),
                          trailing: r.sincronizado
                              ? const Icon(Icons.check_circle, color: Colors.green)
                              : const Icon(Icons.sync_problem, color: Colors.orange),
                        ),
                      )),
                ],
              ),
            ),
    );
  }
} 