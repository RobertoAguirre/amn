import 'package:json_annotation/json_annotation.dart';

part 'turno.g.dart';

@JsonSerializable()
class Turno {
  final int? id;
  final DateTime fecha;
  final String tipoTurno; // mañana/tarde/noche
  final String operador;
  final String supervisor;
  final String lineaProduccion;
  final String producto;
  final String lote;
  final int cantidadProducida;
  final int cantidadRechazada;
  final String? firmaDigital;
  final bool sincronizado;
  final double? latitud;
  final double? longitud;

  Turno({
    this.id,
    required this.fecha,
    required this.tipoTurno,
    required this.operador,
    required this.supervisor,
    required this.lineaProduccion,
    required this.producto,
    required this.lote,
    required this.cantidadProducida,
    required this.cantidadRechazada,
    this.firmaDigital,
    this.sincronizado = false,
    this.latitud,
    this.longitud,
  });

  factory Turno.fromJson(Map<String, dynamic> json) => _$TurnoFromJson(json);
  Map<String, dynamic> toJson() => _$TurnoToJson(this);

  Turno copyWith({
    int? id,
    DateTime? fecha,
    String? tipoTurno,
    String? operador,
    String? supervisor,
    String? lineaProduccion,
    String? producto,
    String? lote,
    int? cantidadProducida,
    int? cantidadRechazada,
    String? firmaDigital,
    bool? sincronizado,
    double? latitud,
    double? longitud,
  }) {
    return Turno(
      id: id ?? this.id,
      fecha: fecha ?? this.fecha,
      tipoTurno: tipoTurno ?? this.tipoTurno,
      operador: operador ?? this.operador,
      supervisor: supervisor ?? this.supervisor,
      lineaProduccion: lineaProduccion ?? this.lineaProduccion,
      producto: producto ?? this.producto,
      lote: lote ?? this.lote,
      cantidadProducida: cantidadProducida ?? this.cantidadProducida,
      cantidadRechazada: cantidadRechazada ?? this.cantidadRechazada,
      firmaDigital: firmaDigital ?? this.firmaDigital,
      sincronizado: sincronizado ?? this.sincronizado,
      latitud: latitud ?? this.latitud,
      longitud: longitud ?? this.longitud,
    );
  }
} 