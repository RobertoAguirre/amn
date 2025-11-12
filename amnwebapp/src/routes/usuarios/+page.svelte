<script lang="ts">
  import { onMount } from 'svelte';
  import { apiUrl } from '$lib/config';

  let usuarios: any[] = [];
  let loading = false;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';

  // Formulario
  let mostrarFormulario = false;
  let usuarioEditando: any = null;
  let formData = {
    numero_empleado: '',
    nombre: '',
    supervisor: '',
    password: '',
    activo: true
  };

  // Filtros
  let filtroBusqueda = '';

  onMount(() => {
    cargarUsuarios();
  });

  async function cargarUsuarios() {
    loading = true;
    errorMessage = '';
    successMessage = '';
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        errorMessage = 'No hay sesión activa. Por favor, inicia sesión.';
        loading = false;
        return;
      }

      const res = await fetch(apiUrl('/api/auth/usuarios'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error al cargar usuarios (${res.status})`;
        console.error('Error cargando usuarios:', errorData);
        usuarios = [];
        return;
      }

      const data = await res.json();
      if (data.error) {
        errorMessage = data.message || 'Error al cargar usuarios';
        usuarios = [];
        return;
      }

      usuarios = data.data || [];
      if (usuarios.length === 0) {
        // No es un error, simplemente no hay usuarios
        errorMessage = '';
      }
    } catch (error: any) {
      errorMessage = `Error de conexión: ${error.message || 'No se pudo conectar al servidor'}`;
      console.error('Error cargando usuarios:', error);
      usuarios = [];
    } finally {
      loading = false;
    }
  }

  function abrirFormularioNuevo() {
    usuarioEditando = null;
    formData = {
      numero_empleado: '',
      nombre: '',
      supervisor: '',
      password: '',
      activo: true
    };
    mostrarFormulario = true;
    errorMessage = '';
    successMessage = '';
  }

  function abrirFormularioEditar(usuario: any) {
    if (!usuario || !usuario._id) {
      errorMessage = 'Usuario inválido';
      return;
    }
    usuarioEditando = usuario;
    formData = {
      numero_empleado: usuario.numero_empleado || '',
      nombre: usuario.nombre || '',
      supervisor: usuario.supervisor || '',
      password: '',
      activo: usuario.activo !== undefined ? usuario.activo : true
    };
    mostrarFormulario = true;
    errorMessage = '';
    successMessage = '';
  }

  function cerrarFormulario() {
    mostrarFormulario = false;
    usuarioEditando = null;
    errorMessage = '';
    successMessage = '';
  }

  async function guardarUsuario() {
    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const token = localStorage.getItem('token');
      const url = usuarioEditando 
        ? apiUrl(`/api/auth/usuarios/${usuarioEditando._id}`)
        : apiUrl('/api/auth/register');
      
      const method = usuarioEditando ? 'PUT' : 'POST';
      const body: any = {
        nombre: formData.nombre,
        supervisor: formData.supervisor
      };

      if (usuarioEditando) {
        // Actualizar
        if (formData.activo !== undefined) body.activo = formData.activo;
        if (formData.password && formData.password.length >= 6) {
          body.password = formData.password;
        }
      } else {
        // Crear nuevo
        body.numero_empleado = formData.numero_empleado;
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error (${res.status})`;
        return;
      }

      const data = await res.json();
      if (data.error) {
        errorMessage = data.message || 'Error al guardar usuario';
        return;
      }

      successMessage = usuarioEditando ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente';
      cerrarFormulario();
      await cargarUsuarios();
    } catch (error: any) {
      errorMessage = 'Error de conexión';
      console.error('Error guardando usuario:', error);
    } finally {
      saving = false;
    }
  }

  async function desactivarUsuario(usuario: any) {
    if (!usuario || !usuario._id) {
      errorMessage = 'Usuario inválido';
      return;
    }

    if (!confirm(`¿Estás seguro de desactivar a ${usuario.nombre}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl(`/api/auth/usuarios/${usuario._id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Error HTTP ${res.status}` }));
        errorMessage = errorData.message || `Error (${res.status})`;
        return;
      }

      const data = await res.json();
      if (data.error) {
        errorMessage = data.message || 'Error al desactivar usuario';
        return;
      }

      successMessage = 'Usuario desactivado exitosamente';
      await cargarUsuarios();
    } catch (error: any) {
      errorMessage = 'Error de conexión';
      console.error('Error desactivando usuario:', error);
    }
  }

  function usuariosFiltrados() {
    if (!filtroBusqueda) return usuarios;
    const busqueda = filtroBusqueda.toLowerCase();
    return usuarios.filter(u => 
      u.nombre?.toLowerCase().includes(busqueda) ||
      u.numero_empleado?.toLowerCase().includes(busqueda) ||
      u.supervisor?.toLowerCase().includes(busqueda)
    );
  }
</script>

<div class="p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Gestión de Usuarios</h1>
    <button
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      on:click={abrirFormularioNuevo}
    >
      + Nuevo Usuario
    </button>
  </div>

  {#if errorMessage}
    <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      <strong>Error:</strong> {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
      {successMessage}
    </div>
  {/if}

  <!-- Filtros -->
  <div class="mb-4">
    <input
      type="text"
      placeholder="Buscar por nombre, número de empleado o supervisor..."
      bind:value={filtroBusqueda}
      class="w-full px-4 py-2 border rounded"
    />
  </div>

  <!-- Tabla de usuarios -->
  {#if loading}
    <div class="text-center py-8">Cargando usuarios...</div>
  {:else if usuariosFiltrados().length === 0}
    <div class="text-center py-8 text-gray-500">
      {filtroBusqueda ? 'No se encontraron usuarios con ese filtro' : 'No hay usuarios registrados'}
    </div>
  {:else}
    <div class="bg-white rounded shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número Empleado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each usuariosFiltrados() as usuario}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm">{usuario.numero_empleado}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">{usuario.nombre}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">{usuario.supervisor}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded {usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                  {usuario.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {usuario.last_login ? new Date(usuario.last_login).toLocaleString('es-MX') : 'Nunca'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button
                  class="text-blue-600 hover:text-blue-800 mr-3"
                  on:click={() => abrirFormularioEditar(usuario)}
                >
                  Editar
                </button>
                {#if usuario.activo}
                  <button
                    class="text-red-600 hover:text-red-800"
                    on:click={() => desactivarUsuario(usuario)}
                  >
                    Desactivar
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Modal de formulario -->
  {#if mostrarFormulario}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">
          {usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h2>

        <form on:submit|preventDefault={guardarUsuario}>
          {#if !usuarioEditando}
            <div class="mb-4">
              <label for="numero_empleado" class="block text-sm font-medium mb-1">Número de Empleado *</label>
              <input
                id="numero_empleado"
                type="text"
                bind:value={formData.numero_empleado}
                required
                class="w-full px-3 py-2 border rounded"
              />
            </div>
          {/if}

          <div class="mb-4">
            <label for="nombre" class="block text-sm font-medium mb-1">Nombre *</label>
            <input
              id="nombre"
              type="text"
              bind:value={formData.nombre}
              required
              class="w-full px-3 py-2 border rounded"
            />
          </div>

          <div class="mb-4">
            <label for="supervisor" class="block text-sm font-medium mb-1">Supervisor *</label>
            <input
              id="supervisor"
              type="text"
              bind:value={formData.supervisor}
              required
              class="w-full px-3 py-2 border rounded"
            />
          </div>

          <div class="mb-4">
            <label for="password" class="block text-sm font-medium mb-1">
              {usuarioEditando ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
            <input
              id="password"
              type="password"
              bind:value={formData.password}
              required={!usuarioEditando}
              minlength={usuarioEditando ? 0 : 6}
              class="w-full px-3 py-2 border rounded"
            />
          </div>

          {#if usuarioEditando}
            <div class="mb-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={formData.activo}
                  class="mr-2"
                />
                <span class="text-sm">Usuario activo</span>
              </label>
            </div>
          {/if}

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              class="px-4 py-2 border rounded hover:bg-gray-100"
              on:click={cerrarFormulario}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>

