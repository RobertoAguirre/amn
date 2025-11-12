<script lang="ts">
  import { onMount } from 'svelte';
  import { getApiBaseUrl } from '$lib/config';
  import { verificarEndpoints, mostrarResultadosVerificacion } from '$lib/utils/apiTest';
  
  let user = JSON.parse(localStorage.getItem('user') || '{}');
  let apiBaseUrl = '';
  let verificandoEndpoints = false;
  let resultadosVerificacion: any = null;

  onMount(() => {
    apiBaseUrl = getApiBaseUrl();
  });

  async function verificarConexion() {
    verificandoEndpoints = true;
    try {
      const resultados = await verificarEndpoints();
      resultadosVerificacion = mostrarResultadosVerificacion(resultados);
    } catch (error) {
      console.error('Error verificando endpoints:', error);
    } finally {
      verificandoEndpoints = false;
    }
  }
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Bienvenido, {user.nombre || 'Usuario'} 👋</h1>
  <p class="text-gray-700">Este es tu panel de administración AMN.</p>
  
  <!-- Información de conexión -->
  <div class="mt-6 p-4 bg-blue-50 rounded shadow">
    <div class="flex justify-between items-center">
      <div>
        <p class="font-semibold text-blue-900">Configuración de API</p>
        <p class="text-sm text-blue-700 mt-1">
          Backend: <span class="font-mono">{apiBaseUrl || 'https://amn-pgrc.onrender.com'}</span>
        </p>
      </div>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        on:click={verificarConexion}
        disabled={verificandoEndpoints}
      >
        {verificandoEndpoints ? 'Verificando...' : 'Verificar Conexión'}
      </button>
    </div>
    
    {#if resultadosVerificacion}
      <div class="mt-4 pt-4 border-t border-blue-200">
        <p class="text-sm font-semibold text-blue-900">
          ✅ Exitosos: {resultadosVerificacion.exitosos.length} | 
          ❌ Fallidos: {resultadosVerificacion.fallidos.length}
        </p>
        {#if resultadosVerificacion.fallidos.length > 0}
          <div class="mt-2 text-xs text-red-700">
            {#each resultadosVerificacion.fallidos as fallido}
              <p>• {fallido.nombre}: {fallido.mensaje || fallido.status}</p>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="mt-8 p-4 bg-yellow-100 rounded shadow">
    <p class="font-semibold">Resumen rápido:</p>
    <ul class="list-disc ml-6 mt-2 text-gray-800">
      <li>Gestión de usuarios</li>
      <li>Visualización de reportes</li>
      <li>Configuración de geocercas</li>
      <li>Gestión de horarios laborales</li>
      <li>Reportes de nómina</li>
      <li>Ajustes manuales de eventos</li>
      <li>Sistema de notificaciones</li>
    </ul>
  </div>
</div> 