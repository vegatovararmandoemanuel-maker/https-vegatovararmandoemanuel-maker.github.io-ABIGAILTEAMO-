/* ============================================
   FUNCIONALIDAD PRINCIPAL - GPS Y COORDENADAS
   ============================================ */

let map;
let userMarker;
let history = [];
const MAX_HISTORY = 50;

// Inicializar el mapa
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadHistory();
    setupEventListeners();
});

function initMap() {
    // Crear mapa centrado en una ubicación por defecto
    map = L.map('map').setView([40.4168, -3.7038], 13);
    
    // Agregar capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);
}

function setupEventListeners() {
    document.getElementById('getLocationBtn').addEventListener('click', getLocation);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', copyToClipboard);
    });
    
    document.getElementById('shareBtn').addEventListener('click', shareLocation);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', importData);
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
    
    // Cerrar modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

/* ============================================
   OBTENER UBICACIÓN GPS
   ============================================ */

function getLocation() {
    const btn = document.getElementById('getLocationBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Obteniendo ubicación...';
    
    if (!navigator.geolocation) {
        showModal('Error', 'Geolocalización no disponible en tu navegador');
        btn.disabled = false;
        btn.textContent = '📍 Obtener Mi Ubicación';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function successCallback(position) {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy } = position.coords;
    const timestamp = new Date();
    
    // Actualizar la UI con las coordenadas
    document.getElementById('latitude').textContent = latitude.toFixed(6);
    document.getElementById('longitude').textContent = longitude.toFixed(6);
    document.getElementById('accuracy').textContent = accuracy.toFixed(2) + ' metros';
    document.getElementById('altitude').textContent = altitude ? altitude.toFixed(2) + ' metros' : 'No disponible';
    
    // Actualizar el mapa
    updateMap(latitude, longitude);
    
    // Obtener la dirección inversa
    reverseGeocode(latitude, longitude);
    
    // Agregar al historial
    addToHistory({
        latitude,
        longitude,
        accuracy,
        altitude,
        timestamp
    });
    
    // Restaurar botón
    const btn = document.getElementById('getLocationBtn');
    btn.disabled = false;
    btn.textContent = '📍 Obtener Mi Ubicación';
    
    showModal('Éxito', '✅ Ubicación obtenida correctamente');
}

function errorCallback(error) {
    let message = '';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = 'Permiso denegado. Por favor, habilita la geolocalización.';
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Información de ubicación no disponible.';
            break;
        case error.TIMEOUT:
            message = 'Se agotó el tiempo de espera para obtener la ubicación.';
            break;
        default:
            message = 'Error al obtener la ubicación: ' + error.message;
    }
    
    showModal('Error', message);
    
    const btn = document.getElementById('getLocationBtn');
    btn.disabled = false;
    btn.textContent = '📍 Obtener Mi Ubicación';
}

/* ============================================
   ACTUALIZAR MAPA
   ============================================ */

function updateMap(latitude, longitude) {
    // Centrar el mapa en las nuevas coordenadas
    map.setView([latitude, longitude], 15);
    
    // Eliminar marcador anterior
    if (userMarker) {
        map.removeLayer(userMarker);
    }
    
    // Crear nuevo marcador
    userMarker = L.marker([latitude, longitude], {
        icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        })
    }).addTo(map);
    
    userMarker.bindPopup(`
        <div style="font-family: monospace;">
            <strong>Mi Ubicación</strong><br>
            Lat: ${latitude.toFixed(6)}<br>
            Lng: ${longitude.toFixed(6)}<br>
            Actualizado: ${new Date().toLocaleTimeString()}
        </div>
    `).openPopup();
}

/* ============================================
   GEOCODIFICACIÓN INVERSA
   ============================================ */

function reverseGeocode(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const address = data.address?.city || data.address?.town || data.address?.country || 'Dirección no encontrada';
            document.getElementById('address').textContent = data.address?.name || address || 'Ubicación desconocida';
        })
        .catch(error => {
            console.error('Error en geocodificación inversa:', error);
            document.getElementById('address').textContent = 'Error al obtener dirección';
        });
}

/* ============================================
   HISTORIAL DE UBICACIONES
   ============================================ */

function addToHistory(locationData) {
    history.unshift({
        ...locationData,
        id: Date.now()
    });
    
    // Limitar a MAX_HISTORY entradas
    if (history.length > MAX_HISTORY) {
        history.pop();
    }
    
    saveHistory();
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-message">No hay ubicaciones registradas</p>';
        return;
    }
    
    historyList.innerHTML = history.map((item, index) => `
        <div class="history-item">
            <div class="history-item-time">
                📅 ${new Date(item.timestamp).toLocaleString()}
            </div>
            <div class="history-item-coords">
                📍 ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}
            </div>
            <div class="history-item-address">
                Precisión: ${item.accuracy.toFixed(2)}m
            </div>
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                <button class="btn btn-info" style="font-size: 0.9em; padding: 6px 12px;" onclick="goToHistory(${index})">
                    📍 Ir
                </button>
                <button class="btn btn-secondary" style="font-size: 0.9em; padding: 6px 12px;" onclick="deleteHistoryItem(${index})">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

function goToHistory(index) {
    const location = history[index];
    updateMap(location.latitude, location.longitude);
    document.getElementById('latitude').textContent = location.latitude.toFixed(6);
    document.getElementById('longitude').textContent = location.longitude.toFixed(6);
    document.getElementById('accuracy').textContent = location.accuracy.toFixed(2) + ' metros';
    document.getElementById('altitude').textContent = location.altitude ? location.altitude.toFixed(2) + ' metros' : 'No disponible';
}

function deleteHistoryItem(index) {
    history.splice(index, 1);
    saveHistory();
    renderHistory();
}

function clearHistory() {
    if (confirm('¿Estás seguro de que deseas eliminar todo el historial?')) {
        history = [];
        saveHistory();
        renderHistory();
        showModal('Éxito', 'Historial eliminado correctamente');
    }
}

function saveHistory() {
    localStorage.setItem('locationHistory', JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem('locationHistory');
    if (saved) {
        history = JSON.parse(saved);
        renderHistory();
    }
}

/* ============================================
   COPIAR AL PORTAPAPELES
   ============================================ */

function copyToClipboard(event) {
    const target = event.target.dataset.target;
    const value = document.getElementById(target).textContent;
    
    navigator.clipboard.writeText(value).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copiado';
        
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

/* ============================================
   COMPARTIR UBICACIÓN
   ============================================ */

function shareLocation() {
    const latitude = document.getElementById('latitude').textContent;
    const longitude = document.getElementById('longitude').textContent;
    
    if (latitude === '--' || longitude === '--') {
        showModal('Error', 'Primero obtén tu ubicación');
        return;
    }
    
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const text = `Mi ubicación: ${latitude}, ${longitude}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Apps-Coreem',
            text: text,
            url: mapsUrl
        }).catch(err => console.log('Error compartiendo:', err));
    } else {
        // Fallback
        const shareText = `${text}\n${mapsUrl}`;
        navigator.clipboard.writeText(shareText).then(() => {
            showModal('Éxito', 'Información copiada al portapapeles:\n' + shareText);
        });
    }
}

/* ============================================
   EXPORTAR/IMPORTAR DATOS
   ============================================ */

function exportData() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        history: history
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = `apps-coreem-export-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showModal('Éxito', 'Datos exportados correctamente');
}

function importData() {
    document.getElementById('fileInput').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.history && Array.isArray(data.history)) {
                history = data.history;
                saveHistory();
                renderHistory();
                showModal('Éxito', `Se importaron ${history.length} ubicaciones correctamente`);
            } else {
                showModal('Error', 'Formato de archivo no válido');
            }
        } catch (error) {
            showModal('Error', 'Error al parsear el archivo: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Limpiar el input
    event.target.value = '';
}

/* ============================================
   MODAL
   ============================================ */

function showModal(title, message) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}