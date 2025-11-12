// Configuración del API
// Por defecto, siempre usar el backend en Render
// Si PUBLIC_API_URL está definido, usar esa URL
// Si quieres usar backend local, define PUBLIC_API_URL=http://localhost:3000
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://amn-pgrc.onrender.com';

// Función helper para construir URLs del API
export function apiUrl(path: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Función para obtener la URL base actual (útil para debugging)
export function getApiBaseUrl(): string {
  return API_BASE_URL;
} 