// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'turno.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Turno _$TurnoFromJson(Map<String, dynamic> json) => Turno(
  id: (json['id'] as num?)?.toInt(),
  fecha: DateTime.parse(json['fecha'] as String),
  tipoTurno: json['tipoTurno'] as String,
  operador: json['operador'] as String,
  supervisor: json['supervisor'] as String,
  lineaProduccion: json['lineaProduccion'] as String,
  producto: json['producto'] as String,
  lote: json['lote'] as String,
  cantidadProducida: (json['cantidadProducida'] as num).toInt(),
  cantidadRechazada: (json['cantidadRechazada'] as num).toInt(),
  firmaDigital: json['firmaDigital'] as String?,
  sincronizado: json['sincronizado'] as bool? ?? false,
  latitud: (json['latitud'] as num?)?.toDouble(),
  longitud: (json['longitud'] as num?)?.toDouble(),
);

Map<String, dynamic> _$TurnoToJson(Turno instance) => <String, dynamic>{
  'id': instance.id,
  'fecha': instance.fecha.toIso8601String(),
  'tipoTurno': instance.tipoTurno,
  'operador': instance.operador,
  'supervisor': instance.supervisor,
  'lineaProduccion': instance.lineaProduccion,
  'producto': instance.producto,
  'lote': instance.lote,
  'cantidadProducida': instance.cantidadProducida,
  'cantidadRechazada': instance.cantidadRechazada,
  'firmaDigital': instance.firmaDigital,
  'sincronizado': instance.sincronizado,
  'latitud': instance.latitud,
  'longitud': instance.longitud,
};
