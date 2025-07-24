<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';
  
  let isLogin = true;
  let isLoading = false;
  let errorMessage = '';
  let successMessage = '';
  
  // Form data
  let formData = {
    numero_empleado: '',
    nombre: '',
    password: '',
    supervisor: ''
  };
  
  async function handleSubmit() {
    isLoading = true;
    errorMessage = '';
    successMessage = '';
    
    try {
      const endpoint = isLogin ? apiUrl('/api/auth/login') : apiUrl('/api/auth/register');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isLogin) {
          // Guardar token y redirigir
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.operador));
          successMessage = 'Login exitoso';
          setTimeout(() => goto('/dashboard'), 800);
        } else {
          successMessage = 'Usuario registrado exitosamente';
          isLogin = true; // Cambiar a login después del registro
        }
      } else {
        errorMessage = data.message || 'Error en la operación';
      }
    } catch (error) {
      errorMessage = 'Error de conexión';
    } finally {
      isLoading = false;
    }
  }
  
  function toggleMode() {
    isLogin = !isLogin;
    errorMessage = '';
    successMessage = '';
    formData = {
      numero_empleado: '',
      nombre: '',
      password: '',
      supervisor: ''
    };
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {isLogin ? 'Iniciar Sesión' : 'Registrar Usuario'}
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        AMN Control de Calidad
      </p>
    </div>
    
    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
      <div class="rounded-md shadow-sm -space-y-px">
        <div>
          <label for="numero_empleado" class="sr-only">Número de Empleado</label>
          <input
            id="numero_empleado"
            name="numero_empleado"
            type="text"
            required
            bind:value={formData.numero_empleado}
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
            placeholder="Número de Empleado"
          />
        </div>
        
        {#if !isLogin}
          <div>
            <label for="nombre" class="sr-only">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              bind:value={formData.nombre}
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
              placeholder="Nombre Completo"
            />
          </div>
          
          <div>
            <label for="supervisor" class="sr-only">Supervisor</label>
            <input
              id="supervisor"
              name="supervisor"
              type="text"
              required
              bind:value={formData.supervisor}
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
              placeholder="Supervisor"
            />
          </div>
        {/if}
        
        <div>
          <label for="password" class="sr-only">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            bind:value={formData.password}
            class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 {isLogin ? 'rounded-b-md' : ''} focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 focus:z-10 sm:text-sm"
            placeholder="Contraseña"
          />
        </div>
      </div>

      {#if errorMessage}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      {/if}
      
      {#if successMessage}
        <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      {/if}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
        >
          {#if isLoading}
            <span class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          {/if}
          {isLoading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrar')}
        </button>
      </div>

      <div class="text-center">
        <button
          type="button"
          on:click={toggleMode}
          class="text-sm text-yellow-600 hover:text-yellow-500"
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </form>
  </div>
</div> 