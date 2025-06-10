# AMN Backend

Backend para la aplicación móvil de AMN (empresa de control de calidad en maquiladoras) que permite a los operadores registrar sus actividades y procesos de trabajo digitalmente.

## Características

- Autenticación JWT
- Registro de actividades individuales
- Resumen de turnos
- Reportes de materiales
- Sincronización offline
- Firmas digitales
- Geolocalización automática

## Requisitos

- Node.js >= 14
- MongoDB >= 4.4
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/amn/amnapp-backend.git
cd amnapp-backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con los valores correctos
```

4. Iniciar el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Estructura del Proyecto

```
amn-backend/
├── models/           # Modelos de MongoDB
├── routes/           # Rutas de la API
├── middleware/       # Middleware personalizado
├── config/          # Configuraciones
├── utils/           # Utilidades
├── server.js        # Punto de entrada
└── package.json     # Dependencias
```

## API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar operador
- `POST /api/auth/login` - Login con credenciales

### Registro Individual

- `POST /api/registro/individual` - Crear registro
- `GET /api/registro/individual` - Obtener registros
- `POST /api/registro/individual/bulk` - Sincronización masiva

### Turnos

- `POST /api/turnos` - Crear turno
- `GET /api/turnos` - Obtener turnos
- `POST /api/turnos/bulk` - Sincronización masiva

### Reportes de Materiales

- `POST /api/reportes/materiales` - Crear reporte
- `GET /api/reportes/materiales` - Obtener reportes
- `POST /api/reportes/materiales/bulk` - Sincronización masiva

### Sincronización

- `POST /api/sync/bulk` - Sincronización masiva
- `GET /api/sync/stats` - Estadísticas de sincronización

### Uploads

- `POST /api/upload/firma` - Subir firma digital

## Seguridad

- JWT para autenticación
- Rate limiting (100 requests/15min)
- Validación de datos con express-validator
- Sanitización de inputs
- Headers de seguridad con helmet

## Desarrollo

```bash
# Ejecutar en modo desarrollo
npm run dev

# Ejecutar tests
npm test
```

## Producción

```bash
# Construir para producción
npm run build

# Iniciar en producción
npm start
```

## Licencia

ISC 