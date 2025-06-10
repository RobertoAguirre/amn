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

  factory RegistroIndividual.fromJson(Map<String, dynamic> json) => _$RegistroIndividualFromJson(json);
  Map<String, dynamic> toJson() => _$RegistroIndividualToJson(this);
} 