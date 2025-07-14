<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';
	let sidebarOpen = false;
	function logout() {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		window.location.href = '/';
	}
</script>

{#if $page.url.pathname !== '/'}
	<div class="flex flex-col min-h-screen">
		<!-- AppBar superior -->
		<header class="flex items-center bg-yellow-400 h-14 px-4 shadow justify-between">
			<div class="flex items-center">
				<button class="mr-4 p-2 rounded hover:bg-yellow-300 focus:outline-none" on:click={() => sidebarOpen = !sidebarOpen}>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<span class="font-bold text-lg text-black">AMN Admin</span>
				<!-- Aquí puedes poner el logo a la izquierda o derecha -->
			</div>
			<button class="px-4 py-2 rounded bg-red-100 text-red-700 hover:bg-red-200 transition" on:click={logout}>
				Cerrar sesión
			</button>
		</header>
		<div class="flex flex-1">
			<Sidebar open={sidebarOpen} />
			<div class="flex-1 bg-gray-100">
				<slot />
			</div>
		</div>
	</div>
{:else}
	<slot />
{/if}
