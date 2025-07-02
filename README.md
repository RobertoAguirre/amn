# AMN - Control de Calidad

Proyecto para digitalizar el control de calidad y la gestión de turnos y actividades de trabajadores en la empresa AMN.

## Estructura del proyecto

- `amnappBackend/`  
  Backend Node.js/Express (API REST, MongoDB)
- `amnmobile/`  
  Frontend Flutter (app móvil y multiplataforma)

## Objetivo

Reemplazar formatos en papel por una app móvil y backend, permitiendo:
- Registro de turnos y actividades
- Sincronización offline/online
- Geolocalización y firma digital
- Sincronización automática al recuperar conexión

## Cómo ejecutar

### Backend
1. Entra a la carpeta del backend:
   ```bash
   cd amnappBackend
   npm install
   npm run dev
   ```
   El backend corre en el puerto 3000 por defecto.

### Frontend
1. Entra a la carpeta del frontend:
   ```bash
   cd amnmobile
   flutter pub get
   flutter run
   ```
   - Para emulador Android, la configuración ya está lista.
   - Para web o dispositivo físico, ajusta la base URL en los servicios.

## Notas
- El sistema soporta trabajo offline y sincronización automática.
- Los endpoints públicos para pruebas están en `/api/turnos/mvp` y `/api/registro/individual/mvp`.
- Para desarrollo, puedes borrar la app del emulador para reiniciar la base de datos local.

## Contacto
Para dudas o soporte, contactar al desarrollador principal del proyecto. 