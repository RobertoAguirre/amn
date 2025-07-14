<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  let mapDiv: HTMLDivElement;
  let map: any;
  let drawnItems: any;
  let pollingInterval: any;
  let saving = false;

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
          (res.data as any[]).forEach((evento: any) => {
            if (evento.latitud && evento.longitud) {
              L.marker([evento.latitud, evento.longitud])
                .addTo(map)
                .bindPopup(
                  `<b>${evento.empleadoNombre || 'Dispositivo'}</b><br/>${evento.tipoEvento || ''}<br/>${evento.fechaHora ? new Date(evento.fechaHora).toLocaleString() : ''}`
                );
            }
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
      } else {
        alert('Error al guardar geocerca: ' + (data.message || '')); 
      }
    } catch (e) {
      alert('Error de red al guardar geocerca');
    } finally {
      saving = false;
    }
  }

  async function mostrarGeocercasGuardadas(L: any) {
    try {
      const res = await fetch('/api/geocercas');
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
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
    height: 80vh;
    border-radius: 12px;
    margin-top: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
</style>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4">Geocercas</h1>
  <p class="mb-2 text-gray-700">Dibuja una o varias geocercas sobre el mapa. Puedes usar polígonos, círculos o rectángulos.</p>
  <div bind:this={mapDiv} id="map"></div>
</div> 