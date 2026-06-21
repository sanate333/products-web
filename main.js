/* global google */

let map;
let markers = [];
let infoWindow;
let markersVisible = true;

/**
 * Callback global invocado por Google Maps API.
 * Crea mapa, inyecta marcadores desde window.PUNTOS_HISTORICOS y configura controles.
 */
function initMap() {
  const mapElement = document.getElementById('map');
  const status = document.getElementById('map-status');
  const toggleButton = document.getElementById('toggle-markers');

  if (!mapElement || !window.google || !google.maps) {
    if (status) {
      status.textContent =
        'No fue posible cargar el mapa. Verifica la clave de la API de Google Maps en recorrido.html.';
    }
    return;
  }

  const septimaCenter = { lat: 4.6408, lng: -74.0625 };

  map = new google.maps.Map(mapElement, {
    center: septimaCenter,
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ]
  });

  infoWindow = new google.maps.InfoWindow();

  const puntos = Array.isArray(window.PUNTOS_HISTORICOS) ? window.PUNTOS_HISTORICOS : [];

  puntos.forEach((punto) => {
    const marker = new google.maps.Marker({
      position: { lat: punto.lat, lng: punto.lng },
      map,
      title: punto.titulo,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
      }
    });

    marker.addListener('click', () => {
      const contenido = `
        <article class="event-window">
          <h2>${punto.titulo}</h2>
          <p class="event-date">${punto.fecha}</p>
          <p>${punto.descripcion}</p>
          ${punto.enlace ? `<p><a href="${punto.enlace}" target="_blank" rel="noopener noreferrer">Más información</a></p>` : ''}
        </article>
      `;

      infoWindow.setContent(contenido);
      infoWindow.open({
        anchor: marker,
        map,
        shouldFocus: false
      });
    });

    markers.push(marker);
  });

  if (status) {
    status.textContent = `Se cargaron ${markers.length} puntos históricos sobre la Carrera Séptima.`;
  }

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      markersVisible = !markersVisible;
      markers.forEach((marker) => marker.setMap(markersVisible ? map : null));
      toggleButton.textContent = markersVisible ? 'Ocultar puntos' : 'Mostrar puntos';
    });
  }
}

window.initMap = initMap;
