// Configuración del API
// En desarrollo con Vite, usar el proxy si estamos en localhost
// En producción o si PUBLIC_API_URL está definido, usar esa URL
// Por defecto, usar el backend en Render: https://amn-pgrc.onrender.com
const isDevelopment = import.meta.env.DEV;
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Si hay PUBLIC_API_URL definido, usarlo (para producción o override)
// Si estamos en desarrollo y localhost, usar proxy (URL vacía)
// Si no, usar Render por defecto
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 
  (isDevelopment && isLocalhost ? '' : 'https://amn-pgrc.onrender.com');

// Función helper para construir URLs del API
export function apiUrl(path: string): string {
  // Si API_BASE_URL está vacío (desarrollo con proxy), usar path relativo
  if (!API_BASE_URL) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath;
  }
  
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

// Función para obtener la URL base actual (útil para debugging)
export function getApiBaseUrl(): string {
  return API_BASE_URL || '(usando proxy local)';
} 