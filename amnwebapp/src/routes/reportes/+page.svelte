<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';
  
  let eventos: any[] = [];
  let geocercas: any[] = [];
  let dispositivos: any[] = [];
  let estadisticasGlobales: any = {};
  let loading = true;
  let filtroFechaInicio = '';
  let filtroFechaFin = '';
  let filtroEmpleado = '';
  let filtroGeocerca = '';
  let totalEventos = 0;
  let paginaActual = 0;
  const eventosPorPagina = 50;

  async function cargarDatos() {
    loading = true;
    try {
      console.log('🔄 [Reportes] Cargando datos...');
      
      // Cargar dispositivos activos con nueva API
      const dispositivosRes = await fetch(apiUrl('/api/checador/dispositivos-activos'));
      if (dispositivosRes.ok) {
        const dispositivosData = await dispositivosRes.json();
        if (!dispositivosData.error && dispositivosData.data) {
          dispositivos = dispositivosData.data;
          console.log(`📱 [Reportes] Dispositivos activos cargados: ${dispositivos.length}`);
        } else {
          console.warn('⚠️ [Reportes] Dispositivos con error o sin data:', dispositivosData);
          dispositivos = [];
        }
      } else {
        console.warn(`⚠️ [Reportes] Error cargando dispositivos: ${dispositivosRes.status}`);
        dispositivos = [];
      }

      // Cargar eventos con filtros usando nueva API
      const params = new URLSearchParams();
      if (filtroFechaInicio) params.append('fechaInicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fechaFin', filtroFechaFin);
      if (filtroEmpleado) params.append('empleadoNombre', filtroEmpleado);
      if (filtroGeocerca) params.append('plantaId', filtroGeocerca);
      params.append('limit', eventosPorPagina.toString());
      params.append('skip', (paginaActual * eventosPorPagina).toString());

      const eventosRes = await fetch(apiUrl(`/api/checador/eventos-filtrados?${params}`));
      if (eventosRes.ok) {
        const eventosData = await eventosRes.json();
        if (!eventosData.error) {
          eventos = eventosData.data || [];
          totalEventos = eventosData.total || 0;
          console.log(`📊 [Reportes] Eventos cargados: ${eventos.length} de ${totalEventos} total`);
        }
      }

      // Cargar geocercas
      const geocercasRes = await fetch(apiUrl('/api/geocercas'));
      if (geocercasRes.ok) {
        const geocercasData = await geocercasRes.json();
        if (!geocercasData.error && geocercasData.data) {
          geocercas = geocercasData.data;
          console.log(`📍 [Reportes] Geocercas cargadas: ${geocercas.length}`);
        } else {
          console.warn('⚠️ [Reportes] Geocercas con error o sin data:', geocercasData);
          geocercas = [];
        }
      } else {
        console.warn(`⚠️ [Reportes] Error cargando geocercas: ${geocercasRes.status}`);
        geocercas = [];
      }

      // Cargar estadísticas globales (siempre sin filtros para tener el total real)
      // Los filtros solo afectan a la lista de eventos, no a las estadísticas globales
      const estadisticasRes = await fetch(apiUrl('/api/checador/estadisticas'));
      if (estadisticasRes.ok) {
        const estadisticasData = await estadisticasRes.json();
        if (!estadisticasData.error && estadisticasData.data) {
          estadisticasGlobales = estadisticasData.data;
          console.log(`📈 [Reportes] Estadísticas globales cargadas:`, estadisticasGlobales);
        } else {
          console.warn('⚠️ [Reportes] Estadísticas con error o sin data:', estadisticasData);
          estadisticasGlobales = {};
        }
      } else {
        const errorText = await estadisticasRes.text().catch(() => '');
        console.warn(`⚠️ [Reportes] Error cargando estadísticas: ${estadisticasRes.status} - ${errorText}`);
        estadisticasGlobales = {};
      }

    } catch (error) {
      console.error('❌ [Reportes] Error cargando datos:', error);
    } finally {
      loading = false;
    }
  }

  // Función reactiva que se recalcula cuando cambian los datos
  $: estadisticas = (() => {
    // Usar estadísticas del backend cuando están disponibles
    // Si hay filtros aplicados, usar totalEventos de la paginación
    // Si no hay filtros, usar estadisticasGlobales.totalEventos
    const totalEventosCalculado = filtroFechaInicio || filtroFechaFin 
      ? totalEventos 
      : (estadisticasGlobales?.totalEventos ?? totalEventos ?? 0);
    
    return {
      totalEventos: totalEventosCalculado,
      eventosHoy: estadisticasGlobales?.eventosHoy ?? 0,
      dispositivosActivos: dispositivos?.length ?? 0,
      geocercasActivas: geocercas?.length ?? 0
    };
  })();

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString('es-MX');
  }

  function obtenerTipoEventoColor(tipo: string) {
    switch (tipo?.toLowerCase()) {
      case 'entrada': return 'bg-green-100 text-green-800';
      case 'salida': return 'bg-red-100 text-red-800';
      case 'inicio_trabajo': return 'bg-blue-100 text-blue-800';
      case 'fin_trabajo': return 'bg-orange-100 text-orange-800';
      case 'comida': return 'bg-yellow-100 text-yellow-800';
      case 'reanudar_trabajo': return 'bg-purple-100 text-purple-800';
      case 'apertura_app': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function obtenerTipoEventoTexto(tipo: string) {
    switch (tipo?.toLowerCase()) {
      case 'entrada': return '🚪 Entrada';
      case 'salida': return '🚪 Salida';
      case 'inicio_trabajo': return '🏭 Inicio Trabajo';
      case 'fin_trabajo': return '🏭 Fin Trabajo';
      case 'comida': return '🍽️ Comida';
      case 'reanudar_trabajo': return '🏭 Reanudar Trabajo';
      case 'apertura_app': return '📱 App Abierta';
      default: return tipo || 'N/A';
    }
  }

  function limpiarFiltros() {
    filtroFechaInicio = '';
    filtroFechaFin = '';
    filtroEmpleado = '';
    filtroGeocerca = '';
    paginaActual = 0;
    cargarDatos();
  }

  function cambiarPagina(direccion: number) {
    const nuevaPagina = paginaActual + direccion;
    if (nuevaPagina >= 0 && nuevaPagina * eventosPorPagina < totalEventos) {
      paginaActual = nuevaPagina;
      cargarDatos();
    }
  }

  onMount(() => {
    cargarDatos();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  });

  $: totalPaginas = Math.ceil(totalEventos / eventosPorPagina);
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Reportes de Dispositivos</h1>
    <button 
      class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      on:click={cargarDatos}
      disabled={loading}
    >
      {loading ? 'Cargando...' : 'Actualizar'}
    </button>
  </div>

  <!-- Estadísticas -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Total Eventos</h3>
      <p class="text-2xl font-bold text-blue-600">{estadisticas.totalEventos}</p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Eventos Hoy</h3>
      <p class="text-2xl font-bold text-green-600">{estadisticas.eventosHoy}</p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Dispositivos Activos</h3>
      <p class="text-2xl font-bold text-purple-600">{estadisticas.dispositivosActivos}</p>
    </div>
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-sm font-medium text-gray-500">Geocercas Activas</h3>
      <p class="text-2xl font-bold text-orange-600">{estadisticas.geocercasActivas}</p>
    </div>
  </div>

  <!-- Filtros -->
  <div class="bg-white p-4 rounded-lg shadow mb-6">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold">Filtros</h3>
      <button 
        class="text-sm text-gray-500 hover:text-gray-700"
        on:click={limpiarFiltros}
      >
        Limpiar filtros
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
        <input 
          type="date" 
          bind:value={filtroFechaInicio}
          on:change={cargarDatos}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
        <input 
          type="date" 
          bind:value={filtroFechaFin}
          on:change={cargarDatos}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
        <input 
          type="text" 
          bind:value={filtroEmpleado}
          on:input={cargarDatos}
          placeholder="Buscar por nombre..."
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Geocerca</label>
        <select 
          bind:value={filtroGeocerca}
          on:change={cargarDatos}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las geocercas</option>
          {#each geocercas as geocerca}
            <option value={geocerca.plantaId}>{geocerca.nombre}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Dispositivos Activos -->
  <div class="bg-white rounded-lg shadow mb-6">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Dispositivos Activos ({dispositivos.length})</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Planta Actual</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Última Ubicación</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Último Evento</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Total Eventos</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each dispositivos as dispositivo}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium">{dispositivo.empleadoNombre || 'Desconocido'}</p>
                  <p class="text-sm text-gray-500">ID: {dispositivo.empleadoId}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 text-xs rounded-full {dispositivo.estadoActual === 'dentro' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {dispositivo.estadoActual === 'dentro' ? '🟢 Dentro' : '🔴 Fuera'}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {dispositivo.ultimaUbicacion.plantaNombre || 'N/A'}
              </td>
              <td class="px-4 py-3">
                <div class="text-sm">
                  <p>Lat: {dispositivo.ultimaUbicacion.latitud?.toFixed(6)}</p>
                  <p>Lng: {dispositivo.ultimaUbicacion.longitud?.toFixed(6)}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <div>
                  <span class="inline-block px-2 py-1 text-xs rounded-full {obtenerTipoEventoColor(dispositivo.ultimaUbicacion.tipoEvento)}">
                    {obtenerTipoEventoTexto(dispositivo.ultimaUbicacion.tipoEvento)}
                  </span>
                  <p class="text-sm text-gray-500 mt-1">
                    {formatearFecha(dispositivo.ultimaUbicacion.fechaHora)}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {dispositivo.totalEventos}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Eventos de Entrada/Salida de Geocercas -->
  <div class="bg-white rounded-lg shadow mb-6">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Eventos de Entrada/Salida de Geocercas</h3>
      <p class="text-sm text-gray-600 mt-1">Registro automático de cuando los dispositivos entran y salen de las geocercas</p>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha/Hora</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tipo</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Planta</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Ubicación</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each eventos.filter(e => e.tipoEvento === 'entrada' || e.tipoEvento === 'salida').slice(0, 20) as evento}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">
                {formatearFecha(evento.fechaHora)}
              </td>
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium">{evento.empleadoNombre || 'Desconocido'}</p>
                  <p class="text-sm text-gray-500">ID: {evento.empleadoId}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 text-xs rounded-full {obtenerTipoEventoColor(evento.tipoEvento)}">
                  {obtenerTipoEventoTexto(evento.tipoEvento)}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {evento.plantaNombre || evento.plantaId || 'N/A'}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                <div>
                  <p>Lat: {evento.latitud?.toFixed(6)}</p>
                  <p>Lng: {evento.longitud?.toFixed(6)}</p>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Historial Completo de Eventos -->
  <div class="bg-white rounded-lg shadow">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold">Historial Completo de Eventos ({totalEventos})</h3>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Fecha/Hora</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Evento</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Planta</th>
            <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Ubicación</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {#each eventos as evento}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">
                {formatearFecha(evento.fechaHora)}
              </td>
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium">{evento.empleadoNombre || 'Desconocido'}</p>
                  <p class="text-sm text-gray-500">ID: {evento.empleadoId}</p>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 text-xs rounded-full {obtenerTipoEventoColor(evento.tipoEvento)}">
                  {obtenerTipoEventoTexto(evento.tipoEvento)}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {evento.plantaNombre || evento.plantaId || 'N/A'}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                <div>
                  <p>Lat: {evento.latitud?.toFixed(6)}</p>
                  <p>Lng: {evento.longitud?.toFixed(6)}</p>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    
    <!-- Paginación -->
    {#if totalPaginas > 1}
      <div class="p-4 border-t flex justify-between items-center">
        <div class="text-sm text-gray-700">
          Mostrando {paginaActual * eventosPorPagina + 1} - {Math.min((paginaActual + 1) * eventosPorPagina, totalEventos)} de {totalEventos} eventos
        </div>
        <div class="flex space-x-2">
          <button 
            class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            disabled={paginaActual === 0}
            on:click={() => cambiarPagina(-1)}
          >
            Anterior
          </button>
          <span class="px-3 py-1 text-sm">
            Página {paginaActual + 1} de {totalPaginas}
          </span>
          <button 
            class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
            disabled={paginaActual >= totalPaginas - 1}
            on:click={() => cambiarPagina(1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    {/if}
  </div>
</div> 