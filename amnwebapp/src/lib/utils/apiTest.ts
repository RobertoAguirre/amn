// Utilidad para verificar que los endpoints estén funcionando correctamente
import { apiUrl } from '../config';

export async function verificarEndpoints() {
  const resultados: any[] = [];
  
  const endpoints = [
    { nombre: 'Health Check', url: '/api/health', metodo: 'GET' },
    { nombre: 'Empleados', url: '/api/checador/empleados', metodo: 'GET' },
    { nombre: 'Geocercas', url: '/api/geocercas', metodo: 'GET' },
    { nombre: 'Notificaciones Contador', url: '/api/notificaciones/contador', metodo: 'GET' },
    { nombre: 'Dispositivos Activos', url: '/api/checador/dispositivos-activos', metodo: 'GET' }
  ];

  for (const endpoint of endpoints) {
    try {
      const url = apiUrl(endpoint.url);
      console.log(`🔍 Verificando: ${endpoint.nombre} - ${url}`);
      
      const res = await fetch(url, {
        method: endpoint.metodo,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const resultado = {
        nombre: endpoint.nombre,
        url: url,
        status: res.status,
        ok: res.ok,
        error: !res.ok
      };

      if (res.ok) {
        try {
          const data = await res.json();
          resultado.data = data;
          console.log(`✅ ${endpoint.nombre}: OK`);
        } catch (e) {
          resultado.error = true;
          resultado.mensaje = 'Error parseando JSON';
          console.log(`❌ ${endpoint.nombre}: Error parseando respuesta`);
        }
      } else {
        resultado.mensaje = `HTTP ${res.status}`;
        console.log(`❌ ${endpoint.nombre}: ${res.status}`);
      }

      resultados.push(resultado);
    } catch (error: any) {
      resultados.push({
        nombre: endpoint.nombre,
        url: apiUrl(endpoint.url),
        error: true,
        mensaje: error.message || 'Error de conexión'
      });
      console.log(`❌ ${endpoint.nombre}: ${error.message}`);
    }
  }

  return resultados;
}

// Función para mostrar resultados en consola
export function mostrarResultadosVerificacion(resultados: any[]) {
  console.group('📊 Resultados de Verificación de Endpoints');
  const exitosos = resultados.filter(r => !r.error && r.ok);
  const fallidos = resultados.filter(r => r.error || !r.ok);
  
  console.log(`✅ Exitosos: ${exitosos.length}/${resultados.length}`);
  console.log(`❌ Fallidos: ${fallidos.length}/${resultados.length}`);
  
  if (fallidos.length > 0) {
    console.group('❌ Endpoints con problemas:');
    fallidos.forEach(r => {
      console.error(`  - ${r.nombre}: ${r.mensaje || r.status} (${r.url})`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
  return { exitosos, fallidos };
}

