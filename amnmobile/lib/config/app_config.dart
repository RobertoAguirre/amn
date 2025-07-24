class AppConfig {
  // Configuración del servidor
  static const String serverIp = '192.168.0.109';
  static const int serverPort = 3000;
  static const String baseUrl = 'http://$serverIp:$serverPort/api';
  
  // Configuración de la app
  static const String appName = 'AMN Control de Calidad';
  static const String appVersion = '1.0.0';
  
  // Configuración de geolocalización
  static const int locationTimeoutSeconds = 10;
  static const double defaultLatitude = 19.4326; // CDMX
  static const double defaultLongitude = -99.1332; // CDMX
  
  // Configuración de sincronización
  static const int syncIntervalSeconds = 30;
  static const int maxRetries = 3;
  
  // Configuración de base de datos
  static const String databaseName = 'amnapp.db';
  static const int databaseVersion = 1;
} 