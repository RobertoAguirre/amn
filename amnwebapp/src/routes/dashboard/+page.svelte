<script lang="ts">
  let user = JSON.parse(localStorage.getItem('user') || '{}');
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Bienvenido, {user.nombre || 'Usuario'} 👋</h1>
  <p class="text-gray-700">Este es tu panel de administración AMN.</p>
  <div class="mt-8 p-4 bg-yellow-100 rounded shadow">
    <p class="font-semibold">Resumen rápido:</p>
    <ul class="list-disc ml-6 mt-2 text-gray-800">
      <li>Gestión de usuarios</li>
      <li>Visualización de reportes</li>
      <li>Configuración de geocercas</li>
      <li>Más funciones próximamente...</li>
    </ul>
  </div>
</div> 