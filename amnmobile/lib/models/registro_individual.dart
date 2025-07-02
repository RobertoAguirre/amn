import 'package:json_annotation/json_annotation.dart';

part 'registro_individual.g.dart';

@JsonSerializable()
class RegistroIndividual {
  final int? id;
  final int turnoId;
  final String defecto;
  final int cantidad;
  final String? observaciones;
  final String? firmaDigital;
  final bool sincronizado;
  final DateTime fecha;

  RegistroIndividual({
    this.id,
    required this.turnoId,
    required this.defecto,
    required this.cantidad,
    this.observaciones,
    this.firmaDigital,
    this.sincronizado = false,
    required this.fecha,
  });

  factory RegistroIndividual.fromJson(Map<String, dynamic> json) => RegistroIndividual(
        id: json['id'] as int?,
        turnoId: json['turnoId'] as int,
        defecto: json['defecto'] as String,
        cantidad: json['cantidad'] as int,
        observaciones: json['observaciones'] as String?,
        firmaDigital: json['firmaDigital'] as String?,
        sincronizado: (json['sincronizado'] is int)
            ? json['sincronizado'] == 1
            : (json['sincronizado'] as bool? ?? false),
        fecha: DateTime.parse(json['fecha'] as String),
      );
  Map<String, dynamic> toJson() => _$RegistroIndividualToJson(this);
} 