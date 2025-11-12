<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { apiUrl } from '$lib/config';

  let notificaciones: any[] = [];
  let contadorNoLeidas = 0;
  let mostrarDropdown = false;
  let loading = false;
  let intervalId: any = null;

  async function cargarNotificaciones() {
    try {
      const res = await fetch(apiUrl('/api/notificaciones?limit=10&leida=false'));
      if (!res.ok) {
        console.error('Error HTTP cargando notificaciones:', res.status);
        return;
      }
      const data = await res.json();
      if (!data.error) {
        notificaciones = data.data || [];
        contadorNoLeidas = data.noLeidas || 0;
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  }

  async function cargarContador() {
    try {
      const res = await fetch(apiUrl('/api/notificaciones/contador'));
      if (!res.ok) {
        console.error('Error HTTP cargando contador:', res.status);
        return;
      }
      const data = await res.json();
      if (!data.error) {
        contadorNoLeidas = data.contador || 0;
      }
    } catch (error) {
      console.error('Error cargando contador:', error);
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
        await cargarContador();
        await cargarNotificaciones();
      }
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  }

  function navegarANotificacion(notificacion: any) {
    marcarComoLeida(notificacion);
    mostrarDropdown = false;
    
    let ruta = notificacion.rutaDestino || '/nomina';
    
    // Si hay parámetros, agregarlos como query params
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
    const fechaObj = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - fechaObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return fechaObj.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function toggleDropdown() {
    mostrarDropdown = !mostrarDropdown;
    if (mostrarDropdown) {
      cargarNotificaciones();
    }
  }

  onMount(() => {
    cargarContador();
    // Actualizar contador cada 30 segundos
    intervalId = setInterval(() => {
      cargarContador();
    }, 30000);
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

<div class="relative">
  <button
    class="relative p-2 rounded hover:bg-yellow-300 focus:outline-none transition"
    on:click={toggleDropdown}
    title="Notificaciones"
  >
    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    {#if contadorNoLeidas > 0}
      <span class="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold">
        {contadorNoLeidas > 99 ? '99+' : contadorNoLeidas}
      </span>
    {/if}
  </button>

  {#if mostrarDropdown}
    <div class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 max-h-96 overflow-hidden flex flex-col">
      <div class="p-4 border-b flex justify-between items-center bg-yellow-50">
        <h3 class="font-semibold text-gray-900">Notificaciones</h3>
        <a
          href="/notificaciones"
          class="text-sm text-blue-600 hover:text-blue-800"
          on:click={() => mostrarDropdown = false}
        >
          Ver todas
        </a>
      </div>
      
      <div class="overflow-y-auto flex-1">
        {#if loading}
          <div class="p-4 text-center text-gray-500">
            <svg class="animate-spin h-6 w-6 mx-auto" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else if notificaciones.length === 0}
          <div class="p-4 text-center text-gray-500">
            <p>No hay notificaciones nuevas</p>
          </div>
        {:else}
          {#each notificaciones as notificacion}
            <div
              class="p-4 border-b hover:bg-gray-50 cursor-pointer transition {!notificacion.leida ? 'bg-blue-50' : ''}"
              on:click={() => navegarANotificacion(notificacion)}
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="inline-block px-2 py-1 text-xs rounded-full {obtenerColorTipo(notificacion.tipo)}">
                      {notificacion.tipo}
                    </span>
                    {#if !notificacion.leida}
                      <span class="h-2 w-2 bg-blue-600 rounded-full"></span>
                    {/if}
                  </div>
                  <h4 class="font-semibold text-sm text-gray-900 mb-1">{notificacion.titulo}</h4>
                  <p class="text-sm text-gray-600 mb-2">{notificacion.mensaje}</p>
                  {#if notificacion.empleadoNombre}
                    <p class="text-xs text-gray-500">Empleado: {notificacion.empleadoNombre}</p>
                  {/if}
                </div>
                <span class="text-xs text-gray-400 ml-2">
                  {formatearFecha(notificacion.createdAt)}
                </span>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="p-2 border-t bg-gray-50">
        <a
          href="/notificaciones"
          class="block text-center text-sm text-blue-600 hover:text-blue-800 py-2"
          on:click={() => mostrarDropdown = false}
        >
          Ver todas las notificaciones
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Asegurar que el dropdown esté por encima de otros elementos */
  :global(.relative) {
    position: relative;
  }
</style>

