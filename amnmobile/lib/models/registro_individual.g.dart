// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'registro_individual.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RegistroIndividual _$RegistroIndividualFromJson(Map<String, dynamic> json) =>
    RegistroIndividual(
      id: (json['id'] as num?)?.toInt(),
      turnoId: (json['turnoId'] as num).toInt(),
      defecto: json['defecto'] as String,
      cantidad: (json['cantidad'] as num).toInt(),
      observaciones: json['observaciones'] as String?,
      firmaDigital: json['firmaDigital'] as String?,
      sincronizado: json['sincronizado'] as bool? ?? false,
      fecha: DateTime.parse(json['fecha'] as String),
    );

Map<String, dynamic> _$RegistroIndividualToJson(RegistroIndividual instance) =>
    <String, dynamic>{
      'id': instance.id,
      'turnoId': instance.turnoId,
      'defecto': instance.defecto,
      'cantidad': instance.cantidad,
      'observaciones': instance.observaciones,
      'firmaDigital': instance.firmaDigital,
      'sincronizado': instance.sincronizado,
      'fecha': instance.fecha.toIso8601String(),
    };
