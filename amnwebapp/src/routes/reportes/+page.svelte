<script lang="ts">
  import { onMount } from 'svelte';
  
  let eventos: any[] = [];
  let geocercas: any[] = [];
  let dispositivos: any[] = [];
  let estadisticasGlobales: any = {};
  let loading = true;
  let filtroFecha = '';
  let filtroEmpleado = '';
  let filtroGeocerca = '';

  async function cargarDatos() {
    loading = true;
    try {
      // Cargar eventos de checador
      const eventosRes = await fetch('/api/checador/mvp');
      const eventosData = await eventosRes.json();
      eventos = eventosData.data || [];

      // Cargar eventos específicos de geocercas
      const eventosGeocercaRes = await fetch('/api/checador/eventos-geocerca');
      const eventosGeocercaData = await eventosGeocercaRes.json();
      const eventosGeocerca = eventosGeocercaData.data || [];

      // Cargar geocercas
      const geocercasRes = await fetch('/api/geocercas');
      const geocercasData = await geocercasRes.json();
      geocercas = geocercasData.data || [];

      // Cargar estadísticas
      const estadisticasRes = await fetch('/api/checador/estadisticas');
      const estadisticasData = await estadisticasRes.json();
      estadisticasGlobales = estadisticasData.data || {};

      // Agrupar eventos por dispositivo para mostrar ubicaciones actuales
      const dispositivosMap = new Map();
      eventos.forEach(evento => {
        if (!dispositivosMap.has(evento.empleadoId)) {
          dispositivosMap.set(evento.empleadoId, {
            empleadoId: evento.empleadoId,
            empleadoNombre: evento.empleadoNombre,
            ultimaUbicacion: evento,
            totalEventos: 0,
            estadoActual: 'fuera'
          });
        }
        const dispositivo = dispositivosMap.get(evento.empleadoId);
        dispositivo.totalEventos++;
        // Actualizar solo si este evento es más reciente
        if (new Date(evento.fechaHora) > new Date(dispositivo.ultimaUbicacion.fechaHora)) {
          dispositivo.ultimaUbicacion = evento;
          dispositivo.estadoActual = evento.tipoEvento === 'entrada' || evento.tipoEvento === 'dentro' ? 'dentro' : 'fuera';
        }
      });
      dispositivos = Array.from(dispositivosMap.values());

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      loading = false;
    }
  }

  function filtrarEventos() {
    return eventos.filter(evento => {
      const cumpleFecha = !filtroFecha || 
        new Date(evento.fechaHora).toLocaleDateString() === filtroFecha;
      const cumpleEmpleado = !filtroEmpleado || 
        evento.empleadoNombre?.toLowerCase().includes(filtroEmpleado.toLowerCase());
      const cumpleGeocerca = !filtroGeocerca || 
        evento.plantaId === filtroGeocerca;
      
      return cumpleFecha && cumpleEmpleado && cumpleGeocerca;
    });
  }

  function obtenerEstadisticas() {
    const eventosFiltrados = filtrarEventos();
    const hoy = new Date().toDateString();
    
    return {
      totalEventos: eventosFiltrados.length,
      eventosHoy: eventosFiltrados.filter(e => 
        new Date(e.fechaHora).toDateString() === hoy
      ).length,
      dispositivosActivos: dispositivos.length,
      geocercasActivas: geocercas.length
    };
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString('es-MX');
  }

  function obtenerTipoEventoColor(tipo: string) {
    switch (tipo?.toLowerCase()) {
      case 'entrada': return 'bg-green-100 text-green-800';
      case 'salida': return 'bg-red-100 text-red-800';
      case 'inicio_trabajo': return 'bg-blue-100 text-blue-800';
      case 'fin_trabajo': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  onMount(() => {
    cargarDatos();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  });

  $: eventosFiltrados = filtrarEventos();
  $: estadisticas = obtenerEstadisticas();
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
    <h3 class="text-lg font-semibold mb-3">Filtros</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input 
          type="date" 
          bind:value={filtroFecha}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
        <input 
          type="text" 
          bind:value={filtroEmpleado}
          placeholder="Buscar por nombre..."
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Geocerca</label>
        <select 
          bind:value={filtroGeocerca}
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
      <h3 class="text-lg font-semibold">Dispositivos Activos</h3>
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
                    {dispositivo.ultimaUbicacion.tipoEvento || 'N/A'}
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
                  {evento.tipoEvento === 'entrada' ? '🚪 Entrada' : '🚪 Salida'}
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
      <h3 class="text-lg font-semibold">Historial Completo de Eventos ({eventosFiltrados.length})</h3>
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
          {#each eventosFiltrados as evento}
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
                  {evento.tipoEvento || 'N/A'}
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
</div> 