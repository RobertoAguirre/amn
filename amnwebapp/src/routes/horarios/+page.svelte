<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';

  let horarios: any[] = [];
  let empleados: any[] = [];
  let plantas: string[] = [];
  let loading = false;
  let loadingEmpleados = false;
  let saving = false;
  let eliminando = false;
  let errorMessage = '';
  let successMessage = '';

  // Filtros
  let filtroPlanta = '';
  let filtroEmpleado = '';
  let filtroActivo = '';

  // Formulario
  let mostrarFormulario = false;
  let horarioEditando: any = null;
  let formData = {
    empleadoId: '',
    plantaId: '',
    nombre: '',
    diasLaborables: [] as number[],
    horaEntrada: '08:00',
    horaSalida: '17:00',
    toleranciaEntrada: 15,
    horaInicioComida: '',
    horaFinComida: '',
    duracionComidaEsperada: 60,
    horasEsperadasPorDia: 8,
    activo: true
  };

  const diasSemana = [
    { valor: 0, nombre: 'Domingo' },
    { valor: 1, nombre: 'Lunes' },
    { valor: 2, nombre: 'Martes' },
    { valor: 3, nombre: 'Miércoles' },
    { valor: 4, nombre: 'Jueves' },
    { valor: 5, nombre: 'Viernes' },
    { valor: 6, nombre: 'Sábado' }
  ];

  onMount(async () => {
    await cargarEmpleados();
    await cargarHorarios();
    extraerPlantas();
  });

  async function cargarEmpleados() {
    loadingEmpleados = true;
    try {
      const res = await fetch(apiUrl('/api/checador/empleados'));
      if (!res.ok) {
        console.error('Error HTTP:', res.status);
        return;
      }
      const data = await res.json();
      if (data.error) {
        console.error('Error cargando empleados:', data.message);
        return;
      }
      empleados = data.data || [];
    } catch (error) {
      console.error('Error cargando empleados:', error);
    } finally {
      loadingEmpleados = false;
    }
  }

  async function cargarHorarios() {
    loading = true;
    errorMessage = '';
    try {
      const params = new URLSearchParams();
      if (filtroPlanta) params.append('plantaId', filtroPlanta);
      if (filtroEmpleado) params.append('empleadoId', filtroEmpleado);
      if (filtroActivo !== '') params.append('activo', filtroActivo);

      const res = await fetch(apiUrl(`/api/checador/horarios?${params}`));
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al cargar horarios (${res.status})`;
        return;
      }

      const data = await res.json();
      
      if (data.error) {
        errorMessage = data.message || 'Error al cargar horarios';
        return;
      }

      horarios = data.data || [];
      extraerPlantas();
    } catch (error: any) {
      errorMessage = `Error de conexión: ${error.message}`;
    } finally {
      loading = false;
    }
  }

  function extraerPlantas() {
    const plantasSet = new Set<string>();
    horarios.forEach(h => {
      if (h.plantaId) plantasSet.add(h.plantaId);
    });
    plantas = Array.from(plantasSet).sort();
  }

  function toggleDiaLaborable(dia: number) {
    if (formData.diasLaborables.includes(dia)) {
      formData.diasLaborables = formData.diasLaborables.filter(d => d !== dia);
    } else {
      formData.diasLaborables = [...formData.diasLaborables, dia].sort();
    }
  }

  function abrirFormularioNuevo() {
    horarioEditando = null;
    formData = {
      empleadoId: '',
      plantaId: '',
      nombre: '',
      diasLaborables: [1, 2, 3, 4, 5], // Lunes a Viernes por defecto
      horaEntrada: '08:00',
      horaSalida: '17:00',
      toleranciaEntrada: 15,
      horaInicioComida: '',
      horaFinComida: '',
      duracionComidaEsperada: 60,
      horasEsperadasPorDia: 8,
      activo: true
    };
    mostrarFormulario = true;
  }

  function abrirFormularioEditar(horario: any) {
    horarioEditando = horario;
    formData = {
      empleadoId: horario.empleadoId || '',
      plantaId: horario.plantaId || '',
      nombre: horario.nombre || '',
      diasLaborables: horario.diasLaborables || [],
      horaEntrada: horario.horaEntrada || '08:00',
      horaSalida: horario.horaSalida || '17:00',
      toleranciaEntrada: horario.toleranciaEntrada || 15,
      horaInicioComida: horario.horaInicioComida || '',
      horaFinComida: horario.horaFinComida || '',
      duracionComidaEsperada: horario.duracionComidaEsperada || 60,
      horasEsperadasPorDia: horario.horasEsperadasPorDia || 8,
      activo: horario.activo !== undefined ? horario.activo : true
    };
    mostrarFormulario = true;
  }

  function cerrarFormulario() {
    mostrarFormulario = false;
    horarioEditando = null;
    successMessage = '';
    errorMessage = '';
  }

  async function guardarHorario() {
    if (!formData.plantaId || !formData.nombre || formData.diasLaborables.length === 0) {
      errorMessage = 'Por favor completa todos los campos requeridos';
      return;
    }

    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const url = horarioEditando 
        ? apiUrl(`/api/checador/horarios/${horarioEditando._id}`)
        : apiUrl('/api/checador/horarios');
      
      const method = horarioEditando ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        empleadoId: formData.empleadoId || null
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al guardar horario (${res.status})`;
        return;
      }

      const data = await res.json();

      if (data.error) {
        errorMessage = data.message || 'Error al guardar horario';
        return;
      }

      successMessage = horarioEditando 
        ? 'Horario actualizado exitosamente' 
        : 'Horario creado exitosamente';
      await cargarHorarios();
      setTimeout(() => {
        cerrarFormulario();
      }, 1500);
    } catch (error: any) {
      errorMessage = `Error de conexión: ${error.message}`;
    } finally {
      saving = false;
    }
  }

  async function eliminarHorario(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario?')) {
      return;
    }

    eliminando = true;
    errorMessage = '';
    try {
      const res = await fetch(apiUrl(`/api/checador/horarios/${id}`), {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al eliminar horario (${res.status})`;
        return;
      }

      const data = await res.json();

      if (data.error) {
        errorMessage = data.message || 'Error al eliminar horario';
        return;
      }

      successMessage = 'Horario eliminado exitosamente';
      await cargarHorarios();
      setTimeout(() => {
        successMessage = '';
      }, 3000);
    } catch (error: any) {
      errorMessage = `Error de conexión: ${error.message}`;
    } finally {
      eliminando = false;
    }
  }

  function obtenerNombreEmpleado(empleadoId: string) {
    const empleado = empleados.find(e => e.empleadoId === empleadoId);
    return empleado ? empleado.empleadoNombre : empleadoId || 'Todos';
  }

  function obtenerDiasLaborablesTexto(dias: number[]) {
    if (!dias || dias.length === 0) return 'Ninguno';
    const nombres = dias.map(d => diasSemana.find(ds => ds.valor === d)?.nombre).filter(Boolean);
    return nombres.join(', ');
  }
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Gestión de Horarios Laborales</h1>
    <button 
      class="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 font-semibold"
      on:click={abrirFormularioNuevo}
    >
      + Nuevo Horario
    </button>
  </div>

  <!-- Mensajes -->
  {#if errorMessage}
    <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
      {successMessage}
    </div>
  {/if}

  <!-- Filtros -->
  <div class="bg-white p-4 rounded-lg shadow mb-6">
    <h3 class="text-lg font-semibold mb-3">Filtros</h3>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Planta</label>
        <select 
          bind:value={filtroPlanta}
          on:change={cargarHorarios}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Todas</option>
          {#each plantas as planta}
            <option value={planta}>{planta}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
        <select 
          bind:value={filtroEmpleado}
          on:change={cargarHorarios}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Todos</option>
          {#each empleados as empleado}
            <option value={empleado.empleadoId}>{empleado.empleadoNombre}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select 
          bind:value={filtroActivo}
          on:change={cargarHorarios}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Lista de Horarios -->
  {#if loading}
    <div class="text-center py-8">
      <p class="text-gray-500">Cargando horarios...</p>
    </div>
  {:else if horarios.length === 0}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <p class="text-gray-500 text-lg">No hay horarios registrados</p>
      <p class="text-gray-400 text-sm mt-2">Crea un nuevo horario para comenzar</p>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Nombre</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Planta</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Empleado</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Días Laborables</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Horario</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Horas/Día</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Estado</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each horarios as horario}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <span class="font-medium">{horario.nombre}</span>
                </td>
                <td class="px-4 py-3 text-sm">{horario.plantaId || 'N/A'}</td>
                <td class="px-4 py-3 text-sm">
                  {obtenerNombreEmpleado(horario.empleadoId)}
                </td>
                <td class="px-4 py-3 text-sm">
                  <span class="text-xs">{obtenerDiasLaborablesTexto(horario.diasLaborables)}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  {horario.horaEntrada} - {horario.horaSalida}
                </td>
                <td class="px-4 py-3 text-sm">{horario.horasEsperadasPorDia} hrs</td>
                <td class="px-4 py-3">
                  <span class="inline-block px-2 py-1 text-xs rounded-full {horario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    {horario.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex space-x-2">
                    <button 
                      class="text-blue-600 hover:text-blue-800 text-sm"
                      on:click={() => abrirFormularioEditar(horario)}
                    >
                      Editar
                    </button>
                    <button 
                      class="text-red-600 hover:text-red-800 text-sm"
                      on:click={() => eliminarHorario(horario._id)}
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
  {/if}

  <!-- Modal de Formulario -->
  {#if mostrarFormulario}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">
              {horarioEditando ? 'Editar Horario' : 'Nuevo Horario'}
            </h2>
            <button 
              class="text-gray-500 hover:text-gray-700"
              on:click={cerrarFormulario}
            >
              ✕
            </button>
          </div>

          {#if errorMessage}
            <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {errorMessage}
            </div>
          {/if}

          <form on:submit|preventDefault={guardarHorario} class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Horario *
                </label>
                <input 
                  type="text"
                  bind:value={formData.nombre}
                  placeholder="Ej: Turno Matutino"
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Planta ID *
                </label>
                <input 
                  type="text"
                  bind:value={formData.plantaId}
                  placeholder="ID de la planta"
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Empleado (opcional)
                </label>
                <select 
                  bind:value={formData.empleadoId}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Todos los empleados de la planta</option>
                  {#each empleados as empleado}
                    <option value={empleado.empleadoId}>{empleado.empleadoNombre}</option>
                  {/each}
                </select>
                <p class="text-xs text-gray-500 mt-1">Dejar vacío para aplicar a todos</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select 
                  bind:value={formData.activo}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                >
                  <option value={true}>Activo</option>
                  <option value={false}>Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Días Laborables *
              </label>
              <div class="grid grid-cols-4 gap-2">
                {#each diasSemana as dia}
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formData.diasLaborables.includes(dia.valor)}
                      on:change={() => toggleDiaLaborable(dia.valor)}
                      class="rounded"
                    />
                    <span class="text-sm">{dia.nombre}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Entrada *
                </label>
                <input 
                  type="time"
                  bind:value={formData.horaEntrada}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Hora de Salida *
                </label>
                <input 
                  type="time"
                  bind:value={formData.horaSalida}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Tolerancia de Entrada (minutos)
                </label>
                <input 
                  type="number"
                  bind:value={formData.toleranciaEntrada}
                  min="0"
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Horas Esperadas por Día *
                </label>
                <input 
                  type="number"
                  bind:value={formData.horasEsperadasPorDia}
                  min="0"
                  step="0.5"
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Hora Inicio Comida (opcional)
                </label>
                <input 
                  type="time"
                  bind:value={formData.horaInicioComida}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Hora Fin Comida (opcional)
                </label>
                <input 
                  type="time"
                  bind:value={formData.horaFinComida}
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Duración Esperada de Comida (minutos)
                </label>
                <input 
                  type="number"
                  bind:value={formData.duracionComidaEsperada}
                  min="0"
                  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t">
              <button 
                type="button"
                class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                on:click={cerrarFormulario}
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit"
                class="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 font-semibold"
                disabled={saving}
              >
                {saving ? 'Guardando...' : (horarioEditando ? 'Actualizar' : 'Crear')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  table {
    border-collapse: collapse;
  }
</style>

