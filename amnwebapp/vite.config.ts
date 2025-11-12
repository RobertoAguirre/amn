import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '0.0.0.0', // Escuchar en todas las interfaces
		port: 5173,
		// Proxy desactivado - el frontend usa apiUrl() que construye URLs completas a Render
		// Si necesitas usar backend local, define PUBLIC_API_URL=http://localhost:3000
		// proxy: {
		// 	'/api': {
		// 		target: 'http://localhost:3000',
		// 		changeOrigin: true
		// 	}
		// }
	}
});
