<script lang="ts">
  import { goto } from '$app/navigation';
  export let open = true;
  function nav(path: string) {
    goto(path);
  }
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    goto('/');
  }
</script>

{#if open}
  <nav class="w-48 bg-white shadow-md h-screen p-4 flex flex-col space-y-4">
    <button class="text-left p-2 rounded hover:bg-yellow-100" on:click={() => nav('/dashboard')}>Dashboard</button>
    <button class="text-left p-2 rounded hover:bg-yellow-100" on:click={() => nav('/usuarios')}>Usuarios</button>
    <button class="text-left p-2 rounded hover:bg-yellow-100" on:click={() => nav('/geocercas')}>Geocercas</button>
    <button class="text-left p-2 rounded hover:bg-yellow-100" on:click={() => nav('/reportes')}>Reportes</button>
    <button class="text-left p-2 rounded hover:bg-yellow-100" on:click={() => nav('/nomina')}>Nómina</button>
    <button class="text-left p-2 rounded bg-red-100 text-red-700 mt-auto" on:click={logout}>Cerrar sesión</button>
  </nav>
{/if} 