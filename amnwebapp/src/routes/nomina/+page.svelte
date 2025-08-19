<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';
  
  let reporteNomina: any[] = [];
  let loading = false;
  let filtroFechaInicio = '';
  let filtroFechaFin = '';
  let filtroEmpleado = '';
  let totalEmpleados = 0;
  let errorMessage = '';

  async function cargarReporteNomina() {
    console.log('🚀 [Nómina] Función iniciada');
    console.log('📅 [Nómina] Fechas:', { filtroFechaInicio, filtroFechaFin });
    
    if (!filtroFechaInicio || !filtroFechaFin) {
      console.log('❌ [Nómina] Fechas faltantes');
      alert('Por favor selecciona las fechas de inicio y fin');
      return;
    }

    console.log('✅ [Nómina] Fechas válidas, iniciando carga...');
    loading = true;
    errorMessage = '';
    try {
      console.log('🔄 [Nómina] Generando reporte...', { filtroFechaInicio, filtroFechaFin, filtroEmpleado });
      
      const params = new URLSearchParams();
      params.append('fechaInicio', filtroFechaInicio);
      params.append('fechaFin', filtroFechaFin);
      if (filtroEmpleado) params.append('empleadoNombre', filtroEmpleado);

      const url = apiUrl(`/api/checador/reporte-nomina?${params}`);
      console.log('🌐 [Nómina] URL:', url);

      // Agregar timeout y mejor manejo de errores
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      console.log('📡 [Nómina] Iniciando petición...');
      
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📡 [Nómina] Status:', res.status, res.statusText);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('📊 [Nómina] Respuesta:', data);
      
      if (data.error) {
        console.error('❌ [Nómina] Error del servidor:', data.message);
        errorMessage = `Error del servidor: ${data.message}`;
        return;
      }

      reporteNomina = data.data || [];
      totalEmpleados = data.total || 0;
      
      console.log(`✅ [Nómina] Reporte generado: ${reporteNomina.length} empleados`);
      
      if (reporteNomina.length === 0) {
        errorMessage = 'No hay eventos registrados en las fechas seleccionadas';
      }

    } catch (error: any) {
      console.error('❌ [Nómina] Error cargando reporte de nómina:', error);
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: La petición tardó demasiado (más de 10 segundos)';
        console.error('❌ [Nómina] Timeout - la petición tardó demasiado');
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    } finally {
      loading = false;
    }
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleDateString('es-MX');
  }

  function formatearHora(hora: string) {
    return new Date(hora).toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function limpiarFiltros() {
    filtroFechaInicio = '';
    filtroFechaFin = '';
    filtroEmpleado = '';
    reporteNomina = [];
    totalEmpleados = 0;
    errorMessage = '';
  }

  function obtenerTotalTiempoEfectivo() {
    return reporteNomina.reduce((total, empleado) => total + empleado.tiempoEfectivoHoras, 0);
  }

  function obtenerTotalTiempoComida() {
    return reporteNomina.reduce((total, empleado) => total + empleado.tiempoComidaHoras, 0);
  }

  function probarClick() {
    console.log('🎯 [Nómina] Botón clickeado!');
    alert('El botón funciona correctamente');
  }

  async function probarConexion() {
    try {
      console.log('🧪 [Nómina] Probando conexión...');
      const url = apiUrl('/api/checador/test');
      console.log('🌐 [Nómina] URL de prueba:', url);
      
      const res = await fetch(url);
      const data = await res.json();
      
      console.log('✅ [Nómina] Conexión exitosa:', data);
      alert(`Conexión exitosa! Total eventos: ${data.data.totalEventos}`);
    } catch (error: any) {
      console.error('❌ [Nómina] Error de conexión:', error);
      alert(`Error de conexión: ${error.message}`);
    }
  }

  onMount(() => {
    console.log('🏠 [Nómina] Página cargada');
    // Establecer fechas por defecto (hoy)
    const hoy = new Date();
    filtroFechaInicio = hoy.toISOString().split('T')[0];
    filtroFechaFin = hoy.toISOString().split('T')[0];
    console.log('📅 [Nómina] Fechas establecidas:', { filtroFechaInicio, filtroFechaFin });
  });
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Reporte de Nómina</h1>
    <div class="flex space-x-2">
      <button 
        class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        on:click={probarClick}
      >
        Probar Click
      </button>
      <button 
        class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        on:click={probarConexion}
      >
        Probar Conexión
      </button>
      <button 
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        on:click={() => {
          console.log('🎯 [Nómina] Botón Generar Reporte clickeado!');
          cargarReporteNomina();
        }}
        disabled={loading}
      >
        {loading ? 'Cargando...' : 'Generar Reporte'}
      </button>
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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio *</label>
        <input 
          type="date" 
          bind:value={filtroFechaInicio}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin *</label>
        <input 
          type="date" 
          bind:value={filtroFechaFin}
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
    </div>
    <div class="mt-3 text-sm text-gray-600">
      * Las fechas son obligatorias para generar el reporte
    </div>
  </div>

  <!-- Resumen -->
  {#if reporteNomina.length > 0}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-sm font-medium text-gray-500">Total Empleados</h3>
        <p class="text-2xl font-bold text-blue-600">{totalEmpleados}</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-sm font-medium text-gray-500">Tiempo Efectivo Total</h3>
        <p class="text-2xl font-bold text-green-600">{obtenerTotalTiempoEfectivo().toFixed(2)} hrs</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-sm font-medium text-gray-500">Tiempo Comida Total</h3>
        <p class="text-2xl font-bold text-yellow-600">{obtenerTotalTiempoComida().toFixed(2)} hrs</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-sm font-medium text-gray-500">Promedio por Empleado</h3>
        <p class="text-2xl font-bold text-purple-600">
          {totalEmpleados > 0 ? (obtenerTotalTiempoEfectivo() / totalEmpleados).toFixed(2) : '0.00'} hrs
        </p>
      </div>
    </div>
  {/if}

  <!-- Tabla de Reporte -->
  {#if reporteNomina.length > 0}
    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b">
        <h3 class="text-lg font-semibold">Detalle por Empleado ({totalEmpleados})</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tiempo en Geocerca</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tiempo Trabajo</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tiempo Comida</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Tiempo Efectivo</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Último Evento</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each reporteNomina as empleado}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div>
                    <p class="font-medium">{empleado.empleadoNombre || 'Desconocido'}</p>
                    <p class="text-sm text-gray-500">ID: {empleado.empleadoId}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 text-xs rounded-full {empleado.estadoActual === 'dentro' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {empleado.estadoActual === 'dentro' ? '🟢 Dentro' : '🔴 Fuera'}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {empleado.tiempoEnGeocercaHoras.toFixed(2)} hrs
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {empleado.tiempoTrabajoHoras.toFixed(2)} hrs
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {empleado.tiempoComidaHoras.toFixed(2)} hrs
                </td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {empleado.tiempoEfectivoHoras.toFixed(2)} hrs
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {#if empleado.eventos.length > 0}
                    <div>
                      <p>{empleado.eventos[empleado.eventos.length - 1].tipoEvento}</p>
                      <p class="text-xs text-gray-500">
                        {formatearFecha(empleado.eventos[empleado.eventos.length - 1].fechaHora)}
                      </p>
                    </div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else if !loading}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No hay datos para mostrar</h3>
      <p class="text-gray-500">
        Selecciona un rango de fechas y genera el reporte para ver los datos de nómina.
      </p>
    </div>
  {/if}

  {#if loading}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="animate-spin mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-gray-500">Generando reporte de nómina...</p>
    </div>
  {:else if errorMessage}
    <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">
            {errorMessage.includes('Error') ? 'Error al generar reporte' : 'Sin datos disponibles'}
          </h3>
          <div class="mt-2 text-sm text-yellow-700">
            <p>{errorMessage}</p>
            {#if !errorMessage.includes('Error')}
              <p class="mt-2 text-xs">Intenta con un rango de fechas diferente o verifica que haya eventos registrados.</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {:else if reporteNomina.length === 0 && !loading}
    <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
      <div class="text-blue-500 mb-2">
        <svg class="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-sm font-medium text-blue-800">Listo para generar reporte</h3>
      <p class="text-sm text-blue-700 mt-1">Selecciona las fechas y haz clic en "Generar Reporte" para ver los datos de nómina.</p>
    </div>
  {/if}
</div>

