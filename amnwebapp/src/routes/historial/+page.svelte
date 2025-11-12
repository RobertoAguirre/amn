<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';

  let empleados: any[] = [];
  let historialEventos: any[] = [];
  let loading = false;
  let loadingEmpleados = false;
  let map: any = null;
  let markers: any[] = [];
  let polyline: any = null;
  
  // Filtros
  let empleadoSeleccionado = '';
  let fechaInicio = '';
  let fechaFin = '';
  let empleadoNombre = '';

  onMount(async () => {
    await cargarEmpleados();
    inicializarMapa();
  });

  async function cargarEmpleados() {
    loadingEmpleados = true;
    try {
      console.log('👥 [Historial] Cargando lista de empleados...');
      const res = await fetch(apiUrl('/api/checador/empleados'));
      const data = await res.json();
      
      if (data.error) {
        console.error('❌ [Historial] Error cargando empleados:', data.message);
        return;
      }
      
      empleados = data.data || [];
      console.log(`✅ [Historial] ${empleados.length} empleados cargados`);
    } catch (error) {
      console.error('❌ [Historial] Error cargando empleados:', error);
    } finally {
      loadingEmpleados = false;
    }
  }

  function inicializarMapa() {
    // Verificar si Leaflet está disponible
    if (typeof L === 'undefined') {
      console.error('❌ [Historial] Leaflet no está disponible');
      return;
    }

    // Crear mapa si no existe
    if (!map) {
      map = L.map('mapa-historial').setView([19.4326, -99.1332], 13); // México City por defecto
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      console.log('🗺️ [Historial] Mapa inicializado');
    }
  }

  async function cargarHistorial() {
    if (!empleadoSeleccionado || !fechaInicio || !fechaFin) {
      alert('Por favor selecciona un empleado y las fechas');
      return;
    }

    loading = true;
    try {
      console.log('🗺️ [Historial] Cargando historial de movimiento...');
      
      const params = new URLSearchParams();
      params.append('empleadoId', empleadoSeleccionado);
      params.append('fechaInicio', fechaInicio);
      params.append('fechaFin', fechaFin);

      const res = await fetch(apiUrl(`/api/checador/historial-movimiento?${params}`));
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        console.error('❌ [Historial] Error HTTP:', res.status);
        alert(`Error: ${errorData.message || `Error ${res.status}`}`);
        return;
      }

      const data = await res.json();
      
      if (data.error) {
        console.error('❌ [Historial] Error cargando historial:', data.message);
        alert(`Error: ${data.message}`);
        return;
      }
      
      historialEventos = data.data || [];
      empleadoNombre = data.empleado || 'Desconocido';
      
      console.log(`✅ [Historial] ${historialEventos.length} eventos cargados para ${empleadoNombre}`);
      
      if (historialEventos.length === 0) {
        alert('No hay eventos registrados para el empleado en las fechas seleccionadas');
        return;
      }
      
      mostrarRutaEnMapa();
      
    } catch (error) {
      console.error('❌ [Historial] Error cargando historial:', error);
      alert('Error al cargar el historial de movimiento');
    } finally {
      loading = false;
    }
  }

  function mostrarRutaEnMapa() {
    if (!map || historialEventos.length === 0) return;

    // Limpiar marcadores y línea anteriores
    limpiarMapa();

    // Crear array de coordenadas para la línea
    const coordenadas = historialEventos.map(evento => [evento.latitud, evento.longitud]);
    
    // Dibujar línea de ruta
    polyline = L.polyline(coordenadas, {
      color: '#007bff',
      weight: 3,
      opacity: 0.7
    }).addTo(map);

    // Agregar marcadores para cada evento
    historialEventos.forEach((evento, index) => {
      const marker = L.circleMarker([evento.latitud, evento.longitud], {
        radius: 8,
        fillColor: evento.color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);

      // Agregar popup con información del evento
      marker.bindPopup(evento.popup);
      
      // Agregar tooltip con número de secuencia
      marker.bindTooltip(`${index + 1}`, { permanent: false });
      
      markers.push(marker);
    });

    // Ajustar vista del mapa para mostrar toda la ruta
    if (coordenadas.length > 0) {
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    }

    console.log(`🗺️ [Historial] Ruta mostrada con ${markers.length} marcadores`);
  }

  function limpiarMapa() {
    // Remover marcadores anteriores
    markers.forEach(marker => {
      if (map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markers = [];

    // Remover línea anterior
    if (polyline && map && map.hasLayer(polyline)) {
      map.removeLayer(polyline);
      polyline = null;
    }
  }

  function limpiarHistorial() {
    historialEventos = [];
    empleadoNombre = '';
    limpiarMapa();
    console.log('🗺️ [Historial] Historial limpiado');
  }
</script>

<svelte:head>
  <title>Historial de Movimiento - AMN</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <div class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Historial de Movimiento</h1>
          <p class="text-sm text-gray-600">Visualiza la ruta de movimiento de los empleados</p>
        </div>
        <a href="/" class="text-blue-600 hover:text-blue-800">← Volver al inicio</a>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Filtros -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-lg font-semibold mb-4">Filtros</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Empleado -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Empleado
          </label>
          <select 
            bind:value={empleadoSeleccionado}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingEmpleados}
          >
            <option value="">Seleccionar empleado</option>
            {#each empleados as empleado}
              <option value={empleado.empleadoId}>
                {empleado.empleadoNombre}
              </option>
            {/each}
          </select>
        </div>

        <!-- Fecha Inicio -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Fecha Inicio
          </label>
          <input 
            type="date" 
            bind:value={fechaInicio}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Fecha Fin -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Fecha Fin
          </label>
          <input 
            type="date" 
            bind:value={fechaFin}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Botones -->
        <div class="flex items-end space-x-2">
          <button 
            on:click={cargarHistorial}
            disabled={loading || !empleadoSeleccionado || !fechaInicio || !fechaFin}
            class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : 'Ver Ruta'}
          </button>
          <button 
            on:click={limpiarHistorial}
            class="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Información del empleado -->
    {#if empleadoNombre}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-blue-800">
              Historial de: {empleadoNombre}
            </h3>
            <div class="mt-1 text-sm text-blue-700">
              <p>{historialEventos.length} eventos registrados</p>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Leyenda -->
    {#if historialEventos.length > 0}
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <h3 class="text-lg font-semibold mb-3">Leyenda</h3>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-green-500"></div>
            <span class="text-sm">🟢 Entrada</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-red-500"></div>
            <span class="text-sm">🔴 Salida</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span class="text-sm">🍽️ Comida</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-blue-500"></div>
            <span class="text-sm">⏰ Reanudar</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-purple-500"></div>
            <span class="text-sm">🟣 Dentro</span>
          </div>
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 rounded-full bg-orange-500"></div>
            <span class="text-sm">🟠 Fuera</span>
          </div>
        </div>
      </div>
    {/if}

    <!-- Mapa -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-4 border-b">
        <h3 class="text-lg font-semibold">Ruta de Movimiento</h3>
        {#if historialEventos.length > 0}
          <p class="text-sm text-gray-600">
            Línea azul conecta los puntos en orden cronológico. Haz clic en los marcadores para ver detalles.
          </p>
        {/if}
      </div>
      <div id="mapa-historial" class="w-full h-96"></div>
    </div>

    <!-- Lista de eventos -->
    {#if historialEventos.length > 0}
      <div class="bg-white rounded-lg shadow mt-6">
        <div class="p-4 border-b">
          <h3 class="text-lg font-semibold">Detalle de Eventos ({historialEventos.length})</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">#</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha/Hora</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Planta</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Coordenadas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each historialEventos as evento, index}
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                          style="background-color: {evento.color}20; color: {evento.color};">
                      {evento.icono} {evento.tipoEvento}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900">
                    {new Date(evento.fechaHora).toLocaleString('es-ES')}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-900">
                    {evento.plantaNombre || 'Sin planta'}
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-500">
                    {evento.latitud.toFixed(6)}, {evento.longitud.toFixed(6)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Asegurar que el mapa tenga altura */
  #mapa-historial {
    min-height: 400px;
  }
</style>
