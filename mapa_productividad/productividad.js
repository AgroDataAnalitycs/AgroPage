console.log("📌 Iniciando mapa de productividad...");

let map = L.map('map').setView([4.5, -74.1], 6);
let geojsonLayer;
let dataOriginal;
let depSelect = document.getElementById("depSelect");
let munSelect = document.getElementById("munSelect");
let cultSelect = document.getElementById("cultSelect");

// Capas del mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© OpenStreetMap'
}).addTo(map);

// === Estilos dinámicos ===
function style(feature) {
  return {
    color: "#004c3f",
    weight: 1,
    fillColor: "#8fd19e",
    fillOpacity: 0.6
  };
}

// === Hover con animación ===
function highlightFeature(e) {
  let layer = e.target;
  layer.setStyle({
    weight: 3,
    color: "#000",
    fillOpacity: 0.85
  });
}

function resetHighlight(e) {
  geojsonLayer.resetStyle(e.target);
}

// === Popup ===
function attachPopup(feature, layer) {
  const p = feature.properties;
  const area = p.AreaSembrada ? p.AreaSembrada.toLocaleString() : "Sin datos";
  const cult = p.Cultivos || "Sin cultivos";

  layer.bindPopup(`
    <b>${p.mpio_cnmbr}</b><br>
    <span>${p.dp_nomb}</span><br><br>
    <b>Hectáreas:</b> ${area}<br>
    <b>Cultivos:</b> ${cult}
  `);
}

function onEachFeature(feature, layer) {
  attachPopup(feature, layer);
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight
  });
}

// === Cargar datos ===
fetch("productividad_colombia_final.geojson")
  .then(r => r.json())
  .then(data => {
    dataOriginal = data;
    crearMapa(data);
    cargarFiltros(data);
  });

// === Crear mapa ===
function crearMapa(data) {
  if (geojsonLayer) map.removeLayer(geojsonLayer);

  geojsonLayer = L.geoJSON(data, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);
}

// === Cargar opciones de filtros ===
function cargarFiltros(data) {
  let deps = new Set();
  let municipios = new Set();
  let cultivos = new Set();

  data.features.forEach(f => {
    const p = f.properties;

    deps.add(p.dp_nomb);
    municipios.add(p.mpio_cnmbr);
    if (p.Cultivos) {
      p.Cultivos.split(", ").forEach(c => cultivos.add(c));
    }
  });

  deps = [...deps].sort();
  municipios = [...municipios].sort();
  cultivos = [...cultivos].sort();

  deps.forEach(d => {
    let op = document.createElement("option");
    op.value = op.textContent = d;
    depSelect.appendChild(op);
  });

  municipios.forEach(m => {
    let op = document.createElement("option");
    op.value = op.textContent = m;
    munSelect.appendChild(op);
  });

  cultivos.forEach(c => {
    let op = document.createElement("option");
    op.value = op.textContent = c;
    cultSelect.appendChild(op);
  });

  // Eventos
  depSelect.addEventListener("change", actualizarMunicipios);
  depSelect.addEventListener("change", aplicarFiltros);
  munSelect.addEventListener("change", aplicarFiltros);
  cultSelect.addEventListener("change", aplicarFiltros);
}

// === Reiniciar municipios según departamento ===
function actualizarMunicipios() {
  const dep = depSelect.value;

  munSelect.innerHTML = `<option value="">Todos</option>`;

  const municipiosFiltrados = dataOriginal.features.filter(f =>
    !dep || f.properties.dp_nomb === dep
  );

  const listaMunicipios = [...new Set(municipiosFiltrados.map(
    f => f.properties.mpio_cnmbr
  ))].sort();

  listaMunicipios.forEach(m => {
    let op = document.createElement("option");
    op.value = op.textContent = m;
    munSelect.appendChild(op);
  });
}

// === Aplicar filtros + ZOOM INTELIGENTE ===
function aplicarFiltros() {
  const dep = depSelect.value;
  const muni = munSelect.value;
  const cult = cultSelect.value;

  const filtrado = {
    ...dataOriginal,
    features: dataOriginal.features.filter(f => {
      const p = f.properties;
      return (!dep || p.dp_nomb === dep) &&
             (!muni || p.mpio_cnmbr === muni) &&
             (!cult || (p.Cultivos && p.Cultivos.includes(cult)));
    })
  };

  crearMapa(filtrado);

  setTimeout(() => {
    if (!dep && !muni) {
      map.setView([4.5, -74.1], 6);
      return;
    }

    if (muni) {
      const layer = geojsonLayer.getLayers().find(
        l => l.feature.properties.mpio_cnmbr === muni
      );
      if (layer) {
        map.fitBounds(layer.getBounds(), { maxZoom: 11 }); // Zoom más cerca
        return;
      }
    }

    if (dep && !muni) {
      const layersDep = geojsonLayer.getLayers().filter(
        l => l.feature.properties.dp_nomb === dep
      );
      if (layersDep.length > 0) {
        map.fitBounds(L.featureGroup(layersDep).getBounds(), { maxZoom: 8 });
      }
    }
  }, 150);
}

