<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  let mapDiv: HTMLDivElement;
  let map: any;
  let drawnItems: any;
  let pollingInterval: any;
  let saving = false;
  let geocercas: any[] = [];
  let eliminando = false;

  function cargarMarcadores(L: any) {
    // Limpiar marcadores previos
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    // Volver a cargar los drawnItems
    map.addLayer(drawnItems);
    // Mostrar ubicaciones de dispositivos (checador)
    fetch('/api/checador/mvp')
      .then(r => r.json())
      .then(res => {
        if (res.data && Array.isArray(res.data)) {
          // Agrupar eventos por dispositivo y obtener la última ubicación de cada uno
          const dispositivosMap = new Map();
          
          (res.data as any[]).forEach((evento: any) => {
            if (evento.latitud && evento.longitud && evento.empleadoId) {
              if (!dispositivosMap.has(evento.empleadoId)) {
                dispositivosMap.set(evento.empleadoId, evento);
              } else {
                // Si ya existe, actualizar solo si este evento es más reciente
                const eventoExistente = dispositivosMap.get(evento.empleadoId);
                if (new Date(evento.fechaHora) > new Date(eventoExistente.fechaHora)) {
                  dispositivosMap.set(evento.empleadoId, evento);
                }
              }
            }
          });
          
          // Crear un marcador por dispositivo con su última ubicación
          dispositivosMap.forEach((evento: any) => {
            const estadoColor = evento.tipoEvento === 'entrada' || evento.tipoEvento === 'dentro' ? 'green' : 'red';
            const estadoIcono = evento.tipoEvento === 'entrada' || evento.tipoEvento === 'dentro' ? '🟢' : '🔴';
            
            const customIcon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="background-color: ${estadoColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px;">${estadoIcono}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            
            L.marker([evento.latitud, evento.longitud], { icon: customIcon })
              .addTo(map)
              .bindPopup(
                `<b>${evento.empleadoNombre || 'Dispositivo'}</b><br/>
                 <small>ID: ${evento.empleadoId}</small><br/>
                 <span style="color: ${estadoColor};">${estadoIcono} ${evento.tipoEvento || 'Ubicación'}</span><br/>
                 ${evento.plantaNombre ? `Planta: ${evento.plantaNombre}<br/>` : ''}
                 <small>${evento.fechaHora ? new Date(evento.fechaHora).toLocaleString('es-MX') : ''}</small>`
              );
          });
        }
      });
  }

  async function guardarGeocerca(geocerca: any) {
    saving = true;
    try {
      const res = await fetch('/api/geocercas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geocerca)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Geocerca guardada');
        await cargarGeocercas();
        await mostrarGeocercasGuardadas();
      } else {
        alert('Error al guardar geocerca: ' + (data.message || '')); 
      }
    } catch (e) {
      alert('Error de red al guardar geocerca');
    } finally {
      saving = false;
    }
  }

  async function cargarGeocercas() {
    try {
      const res = await fetch('/api/geocercas');
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        geocercas = data.data;
      }
    } catch (e) {
      console.error('Error cargando geocercas:', e);
    }
  }

  async function eliminarGeocerca(id: string) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta geocerca?')) {
      return;
    }
    
    eliminando = true;
    try {
      const res = await fetch(`/api/geocercas/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('Geocerca eliminada exitosamente');
        await cargarGeocercas();
        await mostrarGeocercasGuardadas();
      } else {
        alert('Error al eliminar geocerca: ' + (data.message || ''));
      }
    } catch (e) {
      alert('Error de red al eliminar geocerca');
    } finally {
      eliminando = false;
    }
  }

  async function mostrarGeocercasGuardadas(L?: any) {
    try {
      const res = await fetch('/api/geocercas');
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        // Limpiar geocercas previas del mapa
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Circle || layer instanceof L.Polygon) {
            map.removeLayer(layer);
          }
        });
        
        data.data.forEach((geo: any) => {
          if (geo.tipo === 'circulo' && geo.centro && geo.radio) {
            const circle = L.circle([geo.centro.lat, geo.centro.lng], { radius: geo.radio, color: 'blue', fillOpacity: 0.1 });
            circle.addTo(map).bindPopup(`<b>${geo.nombre}</b> (Planta: ${geo.plantaId})`);
          } else if (geo.tipo === 'poligono' && Array.isArray(geo.coordenadas)) {
            const latlngs = geo.coordenadas.map((c: any) => [c.lat, c.lng]);
            const polygon = L.polygon(latlngs, { color: 'blue', fillOpacity: 0.1 });
            polygon.addTo(map).bindPopup(`<b>${geo.nombre}</b> (Planta: ${geo.plantaId})`);
          }
        });
      }
    } catch (e) {
      // Silencioso
    }
  }

  onMount(async () => {
    // Cargar geocercas al inicio
    await cargarGeocercas();
    
    // Importar Leaflet y Leaflet.draw dinámicamente
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');
    await import('leaflet-draw');
    await import('leaflet-draw/dist/leaflet.draw.css');

    // Intentar obtener la ubicación actual
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map = L.map(mapDiv).setView([latitude, longitude], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          afterMapInit(L);
        },
        () => {
          // Si falla, usar CDMX
          map = L.map(mapDiv).setView([19.4326, -99.1332], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);
          afterMapInit(L);
        }
      );
    } else {
      // Si no hay geolocalización, usar CDMX
      map = L.map(mapDiv).setView([19.4326, -99.1332], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      afterMapInit(L);
    }

    function afterMapInit(L: any) {
      drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        edit: {
          featureGroup: drawnItems
        },
        draw: {
          polygon: {},
          circle: {},
          rectangle: {},
          marker: false,
          polyline: false,
        }
      });
      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, async function (e: any) {
        drawnItems.addLayer(e.layer);
        // --- GUARDADO DE GEOCERCA ---
        let tipo = '';
        let geocerca: any = {};
        if (e.layer instanceof L.Circle) {
          tipo = 'circulo';
          const center = e.layer.getLatLng();
          const radio = e.layer.getRadius();
          geocerca = {
            tipo,
            centro: { lat: center.lat, lng: center.lng },
            radio
          };
        } else if (e.layer instanceof L.Polygon) {
          tipo = 'poligono';
          const coords = e.layer.getLatLngs()[0].map((p: any) => ({ lat: p.lat, lng: p.lng }));
          geocerca = {
            tipo,
            coordenadas: coords
          };
        } else {
          return;
        }
        // Pedir nombre y plantaId
        const nombre = prompt('Nombre de la planta para esta geocerca:');
        if (!nombre) return;
        const plantaId = prompt('ID de la planta:');
        if (!plantaId) return;
        geocerca.nombre = nombre;
        geocerca.plantaId = plantaId;
        await guardarGeocerca(geocerca);
      });

      cargarMarcadores(L);
      mostrarGeocercasGuardadas(L);
      pollingInterval = setInterval(() => cargarMarcadores(L), 10000);
    }
  });

  // Limpiar el intervalo al desmontar
  onDestroy(() => {
    if (pollingInterval) clearInterval(pollingInterval);
  });
</script>

<style>
  #map {
    width: 100%;
    height: 60vh;
    border-radius: 12px;
    margin-top: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  
  .geocerca-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin: 8px 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    border-left: 4px solid #3b82f6;
  }
  
  .geocerca-info {
    flex: 1;
  }
  
  .geocerca-nombre {
    font-weight: bold;
    color: #1f2937;
  }
  
  .geocerca-details {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 4px;
  }
  
  .btn-eliminar {
    background: #ef4444;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }
  
  .btn-eliminar:hover {
    background: #dc2626;
  }
  
  .btn-eliminar:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
</style>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Geocercas</h1>
  <p class="mb-2 text-gray-700">Dibuja una o varias geocercas sobre el mapa. Puedes usar polígonos, círculos o rectángulos.</p>
  
  <!-- Lista de geocercas -->
  <div class="mb-6">
    <h2 class="text-lg font-semibold mb-3">Geocercas existentes</h2>
    {#if geocercas.length === 0}
      <p class="text-gray-500 italic">No hay geocercas creadas</p>
    {:else}
      {#each geocercas as geocerca}
        <div class="geocerca-item">
          <div class="geocerca-info">
            <div class="geocerca-nombre">{geocerca.nombre}</div>
            <div class="geocerca-details">
              Tipo: {geocerca.tipo} | Planta: {geocerca.plantaId} | 
              Creada: {new Date(geocerca.createdAt).toLocaleDateString('es-MX')}
            </div>
          </div>
          <button 
            class="btn-eliminar" 
            on:click={() => eliminarGeocerca(geocerca._id)}
            disabled={eliminando}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      {/each}
    {/if}
  </div>
  
  <div bind:this={mapDiv} id="map"></div>
</div> 