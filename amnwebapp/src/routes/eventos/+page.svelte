<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';
  
  let eventos: any[] = [];
  let empleados: any[] = [];
  let plantas: string[] = [];
  let loading = false;
  let saving = false;
  let eliminando = false;
  let errorMessage = '';
  let successMessage = '';

  // Filtros
  let filtroFechaInicio = '';
  let filtroFechaFin = '';
  let filtroEmpleado = '';
  let filtroPlanta = '';
  let filtroTipoEvento = '';
  let paginaActual = 0;
  const eventosPorPagina = 50;
  let totalEventos = 0;

  // Formulario de edición
  let mostrarFormulario = false;
  let eventoEditando: any = null;
  let formData = {
    empleadoId: '',
    empleadoNombre: '',
    plantaId: '',
    plantaNombre: '',
    tipoEvento: 'entrada',
    fechaHora: '',
    latitud: 0,
    longitud: 0
  };

  const tiposEvento = [
    { valor: 'entrada', nombre: 'Entrada' },
    { valor: 'salida', nombre: 'Salida' },
    { valor: 'dentro', nombre: 'Dentro' },
    { valor: 'fuera', nombre: 'Fuera' },
    { valor: 'comida', nombre: 'Comida' },
    { valor: 'reanudar_trabajo', nombre: 'Reanudar Trabajo' },
    { valor: 'ubicacion', nombre: 'Ubicación' }
  ];

  onMount(async () => {
    await cargarEmpleados();
    await cargarEventos();
    extraerPlantas();
  });

  async function cargarEmpleados() {
    try {
      const res = await fetch(apiUrl('/api/checador/empleados'));
      const data = await res.json();
      if (data.error) {
        console.error('Error cargando empleados:', data.message);
        return;
      }
      empleados = data.data || [];
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  }

  async function cargarEventos() {
    loading = true;
    errorMessage = '';
    try {
      const params = new URLSearchParams();
      if (filtroFechaInicio) params.append('fechaInicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fechaFin', filtroFechaFin);
      if (filtroEmpleado) params.append('empleadoNombre', filtroEmpleado);
      if (filtroPlanta) params.append('plantaId', filtroPlanta);
      if (filtroTipoEvento) params.append('tipoEvento', filtroTipoEvento);
      params.append('limit', eventosPorPagina.toString());
      params.append('skip', (paginaActual * eventosPorPagina).toString());

      const res = await fetch(apiUrl(`/api/checador/eventos-filtrados?${params}`));
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al cargar eventos (${res.status})`;
        return;
      }

      const data = await res.json();
      
      if (data.error) {
        errorMessage = data.message || 'Error al cargar eventos';
        return;
      }

      eventos = data.data || [];
      totalEventos = data.total || 0;
      extraerPlantas();
    } catch (error: any) {
      errorMessage = `Error de conexión: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  function extraerPlantas() {
    const plantasSet = new Set<string>();
    eventos.forEach(e => {
      if (e.plantaId) plantasSet.add(e.plantaId);
    });
    plantas = Array.from(plantasSet).sort();
  }

  function abrirFormularioEditar(evento: any) {
    if (!evento || !evento._id) {
      errorMessage = 'Evento inválido: falta ID';
      return;
    }
    
    eventoEditando = evento;
    const fechaHora = new Date(evento.fechaHora);
    const fechaHoraLocal = new Date(fechaHora.getTime() - fechaHora.getTimezoneOffset() * 60000);
    
    formData = {
      empleadoId: evento.empleadoId || '',
      empleadoNombre: evento.empleadoNombre || '',
      plantaId: evento.plantaId || '',
      plantaNombre: evento.plantaNombre || '',
      tipoEvento: evento.tipoEvento || 'entrada',
      fechaHora: fechaHoraLocal.toISOString().slice(0, 16),
      latitud: evento.latitud || 0,
      longitud: evento.longitud || 0
    };
    mostrarFormulario = true;
  }

  function cerrarFormulario() {
    mostrarFormulario = false;
    eventoEditando = null;
    successMessage = '';
    errorMessage = '';
  }

  async function guardarEvento() {
    if (!eventoEditando || !eventoEditando._id) {
      errorMessage = 'Evento inválido: falta ID';
      return;
    }

    if (!formData.empleadoId || !formData.empleadoNombre || !formData.plantaId || !formData.fechaHora) {
      errorMessage = 'Por favor completa todos los campos requeridos';
      return;
    }

    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const url = apiUrl(`/api/checador/eventos/${eventoEditando._id}`);
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al actualizar evento (${res.status})`;
        return;
      }

      const data = await res.json();

      if (data.error) {
        errorMessage = data.message || 'Error al actualizar evento';
        return;
      }

      successMessage = 'Evento actualizado exitosamente';
      cerrarFormulario();
      await cargarEventos();
    } catch (error: any) {
      errorMessage = `Error: ${error.message}`;
    } finally {
      saving = false;
    }
  }

  async function eliminarEvento(evento: any) {
    if (!evento || !evento._id) {
      errorMessage = 'Evento inválido: falta ID';
      return;
    }
    
    if (!confirm(`¿Estás seguro de eliminar el evento "${evento.tipoEvento}" de ${evento.empleadoNombre} del ${new Date(evento.fechaHora).toLocaleDateString('es-MX')}?`)) {
      return;
    }

    eliminando = true;
    errorMessage = '';
    successMessage = '';

    try {
      const url = apiUrl(`/api/checador/eventos/${evento._id}`);
      const res = await fetch(url, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al eliminar evento (${res.status})`;
        return;
      }

      const data = await res.json();

      if (data.error) {
        errorMessage = data.message || 'Error al eliminar evento';
        return;
      }

      successMessage = 'Evento eliminado exitosamente';
      await cargarEventos();
    } catch (error: any) {
      errorMessage = `Error: ${error.message}`;
    } finally {
      eliminando = false;
    }
  }

  function formatearFecha(fecha: string | Date) {
    return new Date(fecha).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function obtenerTipoEventoColor(tipo: string) {
    const colores: { [key: string]: string } = {
      entrada: 'bg-green-100 text-green-800',
      salida: 'bg-red-100 text-red-800',
      dentro: 'bg-blue-100 text-blue-800',
      fuera: 'bg-gray-100 text-gray-800',
      comida: 'bg-yellow-100 text-yellow-800',
      reanudar_trabajo: 'bg-purple-100 text-purple-800',
      ubicacion: 'bg-indigo-100 text-indigo-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
  }

  function limpiarFiltros() {
    filtroFechaInicio = '';
    filtroFechaFin = '';
    filtroEmpleado = '';
    filtroPlanta = '';
    filtroTipoEvento = '';
    paginaActual = 0;
    cargarEventos();
  }

  function cambiarPagina(direccion: number) {
    paginaActual += direccion;
    if (paginaActual < 0) paginaActual = 0;
    const maxPaginas = Math.ceil(totalEventos / eventosPorPagina);
    if (paginaActual >= maxPaginas) paginaActual = maxPaginas - 1;
    cargarEventos();
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Ajustes Manuales de Eventos</h1>
    <p class="text-gray-600 mt-2">Gestiona y corrige eventos de asistencia manualmente</p>
  </div>

  {#if errorMessage}
    <div class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
      {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      {successMessage}
    </div>
  {/if}

  <!-- Filtros -->
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold">Filtros</h2>
      <button
        class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        on:click={limpiarFiltros}
      >
        Limpiar filtros
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div>
        <label for="filtro-fecha-inicio" class="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
        <input
          id="filtro-fecha-inicio"
          type="date"
          bind:value={filtroFechaInicio}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label for="filtro-fecha-fin" class="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
        <input
          id="filtro-fecha-fin"
          type="date"
          bind:value={filtroFechaFin}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label for="filtro-empleado" class="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
        <input
          id="filtro-empleado"
          type="text"
          bind:value={filtroEmpleado}
          placeholder="Buscar por nombre..."
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label for="filtro-planta" class="block text-sm font-medium text-gray-700 mb-1">Planta</label>
        <input
          id="filtro-planta"
          type="text"
          bind:value={filtroPlanta}
          placeholder="ID de planta..."
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label for="filtro-tipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo Evento</label>
        <select
          id="filtro-tipo"
          bind:value={filtroTipoEvento}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          {#each tiposEvento as tipo}
            <option value={tipo.valor}>{tipo.nombre}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="mt-4">
      <button
        class="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        on:click={cargarEventos}
      >
        Buscar
      </button>
    </div>
  </div>

  <!-- Tabla de eventos -->
  {#if loading}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="animate-spin mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-gray-500">Cargando eventos...</p>
    </div>
  {:else if eventos.length > 0}
    <div class="bg-white rounded-lg shadow">
      <div class="p-4 border-b flex justify-between items-center">
        <h2 class="text-lg font-semibold">
          Eventos ({totalEventos} total)
        </h2>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            on:click={() => cambiarPagina(-1)}
            disabled={paginaActual === 0}
          >
            Anterior
          </button>
          <span class="px-4 py-2 text-sm text-gray-600">
            Página {paginaActual + 1} de {Math.ceil(totalEventos / eventosPorPagina) || 1}
          </span>
          <button
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
            on:click={() => cambiarPagina(1)}
            disabled={paginaActual >= Math.ceil(totalEventos / eventosPorPagina) - 1}
          >
            Siguiente
          </button>
        </div>
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
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
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
                    {evento.tipoEvento}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {evento.plantaNombre || evento.plantaId || 'N/A'}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500">
                  <div>
                    <p>Lat: {evento.latitud?.toFixed(6)}</p>
                    <p>Lng: {evento.longitud?.toFixed(6)}</p>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      on:click={() => abrirFormularioEditar(evento)}
                    >
                      Editar
                    </button>
                    <button
                      class="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      on:click={() => eliminarEvento(evento)}
                      disabled={eliminando}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {:else}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No hay eventos para mostrar</h3>
      <p class="text-gray-500">
        Ajusta los filtros o espera a que se registren nuevos eventos.
      </p>
    </div>
  {/if}

  <!-- Modal de edición -->
  {#if mostrarFormulario}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold">Editar Evento</h2>
            <button
              class="text-gray-400 hover:text-gray-600"
              on:click={cerrarFormulario}
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {#if errorMessage}
            <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          {/if}

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="empleado-id" class="block text-sm font-medium text-gray-700 mb-1">ID Empleado *</label>
                <input
                  id="empleado-id"
                  type="text"
                  bind:value={formData.empleadoId}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label for="empleado-nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre Empleado *</label>
                <input
                  id="empleado-nombre"
                  type="text"
                  bind:value={formData.empleadoNombre}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="planta-id" class="block text-sm font-medium text-gray-700 mb-1">ID Planta *</label>
                <input
                  id="planta-id"
                  type="text"
                  bind:value={formData.plantaId}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label for="planta-nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre Planta</label>
                <input
                  id="planta-nombre"
                  type="text"
                  bind:value={formData.plantaNombre}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="tipo-evento" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento *</label>
                <select
                  id="tipo-evento"
                  bind:value={formData.tipoEvento}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {#each tiposEvento as tipo}
                    <option value={tipo.valor}>{tipo.nombre}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label for="fecha-hora" class="block text-sm font-medium text-gray-700 mb-1">Fecha/Hora *</label>
                <input
                  id="fecha-hora"
                  type="datetime-local"
                  bind:value={formData.fechaHora}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="latitud" class="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                <input
                  id="latitud"
                  type="number"
                  step="0.000001"
                  bind:value={formData.latitud}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label for="longitud" class="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                <input
                  id="longitud"
                  type="number"
                  step="0.000001"
                  bind:value={formData.longitud}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3">
            <button
              class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              on:click={cerrarFormulario}
            >
              Cancelar
            </button>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              on:click={guardarEvento}
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

