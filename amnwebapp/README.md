# AMN Web App - Panel de Administración

Panel web de administración para el sistema AMN de control de calidad.

## Características

- Login y registro de usuarios
- Gestión de empleados
- Visualización de reportes
- Configuración de geocercas (próximamente)

## Tecnologías

- **SvelteKit** - Framework frontend
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Vite** - Build tool

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Ejecutar en modo desarrollo:
```bash
npm run dev
```

3. Abrir en el navegador:
```
http://localhost:5173
```

## Configuración

- El proxy está configurado para redirigir `/api` hacia `http://localhost:3000`
- Asegúrate de que el backend esté corriendo en el puerto 3000

## Estructura

```
src/
├── lib/
│   └── components/
│       └── Login.svelte      # Pantalla de login/registro
├── app.html                  # Template HTML
└── app.svelte               # Componente principal
```

## Desarrollo

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build
