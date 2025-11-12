<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiUrl } from '$lib/config';

  let notificaciones: any[] = [];
  let loading = false;
  let filtroLeida = '';
  let filtroTipo = '';
  let totalNotificaciones = 0;
  let noLeidas = 0;

  async function cargarNotificaciones() {
    loading = true;
    try {
      const params = new URLSearchParams();
      if (filtroLeida !== '') {
        params.append('leida', filtroLeida);
      }
      if (filtroTipo) {
        params.append('tipo', filtroTipo);
      }
      params.append('limit', '100');

      const res = await fetch(apiUrl(`/api/notificaciones?${params}`));
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        console.error('Error HTTP:', res.status, errorData.message);
        return;
      }

      const data = await res.json();

      if (data.error) {
        console.error('Error:', data.message);
        return;
      }

      notificaciones = data.data || [];
      totalNotificaciones = data.total || 0;
      noLeidas = data.noLeidas || 0;
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      loading = false;
    }
  }

  async function marcarComoLeida(notificacion: any) {
    try {
      const res = await fetch(apiUrl(`/api/notificaciones/${notificacion._id}/leer`), {
        method: 'PUT'
      });

      if (!res.ok) {
        console.error('Error HTTP marcando notificación:', res.status);
        return;
      }

      const data = await res.json();
      if (!data.error) {
        notificacion.leida = true;
        notificacion.fechaLeida = new Date();
        await cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  }

  async function marcarTodasComoLeidas() {
    if (!confirm('¿Marcar todas las notificaciones como leídas?')) {
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/notificaciones/leer-todas'), {
        method: 'PUT'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        console.error('Error HTTP:', res.status, errorData.message);
        return;
      }

      const data = await res.json();
      if (!data.error) {
        await cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error marcando todas las notificaciones:', error);
    }
  }

  async function eliminarNotificacion(notificacion: any) {
    if (!confirm('¿Eliminar esta notificación?')) {
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/notificaciones/${notificacion._id}`), {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        console.error('Error HTTP eliminando notificación:', res.status, errorData.message);
        return;
      }

      const data = await res.json();
      if (!data.error) {
        await cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error eliminando notificación:', error);
    }
  }

  function navegarANotificacion(notificacion: any) {
    if (!notificacion.leida) {
      marcarComoLeida(notificacion);
    }
    
    let ruta = notificacion.rutaDestino || '/nomina';
    
    if (notificacion.parametrosDestino) {
      const params = new URLSearchParams();
      Object.keys(notificacion.parametrosDestino).forEach(key => {
        params.append(key, notificacion.parametrosDestino[key]);
      });
      ruta += `?${params.toString()}`;
    }
    
    goto(ruta);
  }

  function obtenerColorTipo(tipo: string) {
    const colores: { [key: string]: string } = {
      tardanza: 'bg-orange-100 text-orange-800',
      falta: 'bg-red-100 text-red-800',
      salida_temprana: 'bg-yellow-100 text-yellow-800',
      sin_entrada: 'bg-red-100 text-red-800',
      horas_extra: 'bg-blue-100 text-blue-800',
      evento_anomalo: 'bg-purple-100 text-purple-800',
      sistema: 'bg-gray-100 text-gray-800'
    };
    return colores[tipo] || 'bg-gray-100 text-gray-800';
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

  onMount(() => {
    cargarNotificaciones();
  });
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <div>
      <h1 class="text-3xl font-bold text-gray-900">Notificaciones</h1>
      <p class="text-gray-600 mt-2">
        {noLeidas} no leídas de {totalNotificaciones} total
      </p>
    </div>
    <div class="flex gap-2">
      {#if noLeidas > 0}
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          on:click={marcarTodasComoLeidas}
        >
          Marcar todas como leídas
        </button>
      {/if}
    </div>
  </div>

  <!-- Filtros -->
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="filtro-leida" class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          id="filtro-leida"
          bind:value={filtroLeida}
          on:change={cargarNotificaciones}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas</option>
          <option value="false">No leídas</option>
          <option value="true">Leídas</option>
        </select>
      </div>
      <div>
        <label for="filtro-tipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
        <select
          id="filtro-tipo"
          bind:value={filtroTipo}
          on:change={cargarNotificaciones}
          class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="tardanza">Tardanza</option>
          <option value="falta">Falta</option>
          <option value="salida_temprana">Salida Temprana</option>
          <option value="sin_entrada">Sin Entrada</option>
          <option value="horas_extra">Horas Extra</option>
          <option value="evento_anomalo">Evento Anómalo</option>
          <option value="sistema">Sistema</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Lista de notificaciones -->
  {#if loading}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="animate-spin mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="text-gray-500">Cargando notificaciones...</p>
    </div>
  {:else if notificaciones.length === 0}
    <div class="bg-white p-8 rounded-lg shadow text-center">
      <div class="text-gray-500 mb-4">
        <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
      <p class="text-gray-500">
        {filtroLeida || filtroTipo ? 'No hay notificaciones que coincidan con los filtros.' : 'No hay notificaciones para mostrar.'}
      </p>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow">
      <div class="divide-y divide-gray-200">
        {#each notificaciones as notificacion}
          <div
            class="p-4 hover:bg-gray-50 transition cursor-pointer {!notificacion.leida ? 'bg-blue-50' : ''}"
            on:click={() => navegarANotificacion(notificacion)}
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="inline-block px-2 py-1 text-xs rounded-full {obtenerColorTipo(notificacion.tipo)}">
                    {notificacion.tipo}
                  </span>
                  {#if !notificacion.leida}
                    <span class="h-2 w-2 bg-blue-600 rounded-full"></span>
                  {/if}
                  {#if notificacion.prioridad === 'urgente'}
                    <span class="inline-block px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-semibold">
                      URGENTE
                    </span>
                  {/if}
                </div>
                <h3 class="font-semibold text-gray-900 mb-1">{notificacion.titulo}</h3>
                <p class="text-sm text-gray-600 mb-2">{notificacion.mensaje}</p>
                <div class="flex flex-wrap gap-4 text-xs text-gray-500">
                  {#if notificacion.empleadoNombre}
                    <span>👤 {notificacion.empleadoNombre}</span>
                  {/if}
                  {#if notificacion.plantaId}
                    <span>🏭 {notificacion.plantaId}</span>
                  {/if}
                  {#if notificacion.fechaEvento}
                    <span>📅 {formatearFecha(notificacion.fechaEvento)}</span>
                  {/if}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 ml-4">
                <span class="text-xs text-gray-400">
                  {formatearFecha(notificacion.createdAt)}
                </span>
                <div class="flex gap-2">
                  {#if !notificacion.leida}
                    <button
                      class="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      on:click|stopPropagation={() => marcarComoLeida(notificacion)}
                      title="Marcar como leída"
                    >
                      ✓
                    </button>
                  {/if}
                  <button
                    class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    on:click|stopPropagation={() => eliminarNotificacion(notificacion)}
                    title="Eliminar"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

