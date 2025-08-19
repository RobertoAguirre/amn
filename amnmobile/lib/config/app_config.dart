class AppConfig {
  // Configuración del servidor
  static const String serverIp = 'amn-pgrc.onrender.com';
  static const int serverPort = 443;
  static const String baseUrl = 'https://$serverIp/api';
  
  // Configuración de la app
  static const String appName = 'AMN Control de Calidad';
  static const String appVersion = '1.0.0';
  
  // Configuración de geolocalización
  static const int locationTimeoutSeconds = 10; // Reducido para evitar timeouts largos
  static const double defaultLatitude = 19.4326; // CDMX
  static const double defaultLongitude = -99.1332; // CDMX
  
  // Configuración de precisión GPS - OPTIMIZADA
  static const double desiredAccuracy = 3.0; // metros - más precisa
  static const int locationIntervalSeconds = 15; // Enviar ubicación cada 15 segundos - más frecuente
  static const int locationDistanceFilter = 5; // metros - solo enviar si se movió más de 5m - más sensible
  
  // Configuración de sincronización
  static const int syncIntervalSeconds = 30;
  static const int maxRetries = 3;
  
  // Configuración de base de datos
  static const String databaseName = 'amnapp.db';
  static const int databaseVersion = 1;
} 