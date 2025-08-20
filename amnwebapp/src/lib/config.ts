// Configuración del API
export const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://amn-pgrc.onrender.com';

// Función helper para construir URLs del API
export function apiUrl(path: string): string {
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
} 