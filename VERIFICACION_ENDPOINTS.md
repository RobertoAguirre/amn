# Verificación de Endpoints Frontend-Backend

## Configuración Actual

### Backend URL
- **Producción (Render)**: `https://amn-pgrc.onrender.com`
- **Desarrollo (Local)**: `http://localhost:3000` (vía proxy de Vite)

### Configuración del Frontend
- **Archivo**: `amnwebapp/src/lib/config.ts`
- **Función**: `apiUrl(path: string)` - Construye URLs completas del API
- **Comportamiento**:
  - En desarrollo (localhost): Usa proxy de Vite → `http://localhost:3000`
  - En producción: Usa `https://amn-pgrc.onrender.com`
  - Si `PUBLIC_API_URL` está definido: Usa esa URL

## Endpoints Verificados

### ✅ Endpoints de Checador (`/api/checador/*`)
- `GET /api/checador/empleados` - Lista de empleados
- `GET /api/checador/eventos-filtrados` - Eventos con filtros
- `GET /api/checador/dispositivos-activos` - Dispositivos activos
- `GET /api/checador/reporte-nomina` - Reporte de nómina
- `GET /api/checador/historial-movimiento` - Historial de movimiento
- `GET /api/checador/horarios` - Lista de horarios
- `GET /api/checador/horarios/:id` - Horario específico
- `POST /api/checador/horarios` - Crear horario
- `PUT /api/checador/horarios/:id` - Actualizar horario
- `DELETE /api/checador/horarios/:id` - Eliminar horario
- `GET /api/checador/eventos/:id` - Obtener evento
- `PUT /api/checador/eventos/:id` - Editar evento
- `DELETE /api/checador/eventos/:id` - Eliminar evento

### ✅ Endpoints de Notificaciones (`/api/notificaciones/*`)
- `GET /api/notificaciones` - Lista de notificaciones
- `GET /api/notificaciones/contador` - Contador de no leídas
- `PUT /api/notificaciones/:id/leer` - Marcar como leída
- `PUT /api/notificaciones/leer-todas` - Marcar todas como leídas
- `DELETE /api/notificaciones/:id` - Eliminar notificación
- `POST /api/notificaciones` - Crear notificación

### ✅ Endpoints de Geocercas (`/api/geocercas/*`)
- `GET /api/geocercas` - Lista de geocercas
- `POST /api/geocercas` - Crear geocerca
- `DELETE /api/geocercas/:id` - Eliminar geocerca

### ✅ Endpoints de Autenticación (`/api/auth/*`)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro

## Verificación de Consumo

### Patrón Estándar Implementado
Todos los archivos siguen este patrón:

```typescript
const res = await fetch(apiUrl('/api/endpoint'));

if (!res.ok) {
  const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
  errorMessage = errorData.message || `Error (${res.status})`;
  return;
}

const data = await res.json();

if (data.error) {
  errorMessage = data.message || 'Error';
  return;
}

// Usar data.data aquí
```

### Archivos Verificados
- ✅ `routes/nomina/+page.svelte`
- ✅ `routes/eventos/+page.svelte`
- ✅ `routes/horarios/+page.svelte`
- ✅ `routes/geocercas/+page.svelte`
- ✅ `routes/historial/+page.svelte`
- ✅ `routes/reportes/+page.svelte`
- ✅ `routes/notificaciones/+page.svelte`
- ✅ `lib/components/Notificaciones.svelte`
- ✅ `lib/components/Login.svelte`

## Verificación de Render

### URL del Backend en Render
- **URL Base**: `https://amn-pgrc.onrender.com`
- **Puerto**: 10000 (configurado en render.yaml)
- **Estado**: ✅ Configurado correctamente

### CORS
El backend está configurado para permitir:
- ✅ Requests sin origin (apps móviles)
- ✅ localhost (desarrollo)
- ✅ Todos los origins (temporalmente para pruebas)

## Cómo Verificar

1. **En el Dashboard**: Usa el botón "Verificar Conexión" para probar endpoints
2. **En la consola del navegador**: Revisa las peticiones en la pestaña Network
3. **Verificar URL**: El dashboard muestra la URL base configurada

## Notas

- En desarrollo, el proxy de Vite redirige `/api/*` a `http://localhost:3000`
- En producción, todas las peticiones van a `https://amn-pgrc.onrender.com`
- La función `apiUrl()` maneja automáticamente ambos casos

