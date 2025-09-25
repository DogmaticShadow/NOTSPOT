// Notspot Bus Tracker
// Put your Swiftly API key here:
const SWIFTLY_API_KEY = '62ab360e9a91093591f904a925c58815'; // <-- Replace with your actual API key

// Bus route IDs
const ROUTES = {
    '2': '2-13188',
    '93': '93-13188'
};

// 6th and Alvarado coordinates
const CENTER_LAT = 34.0522;
const CENTER_LNG = -118.2437;

let map;
let busMarkers = {};

// Initialize map
function initMap() {
    map = L.map('map').setView([CENTER_LAT, CENTER_LNG], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add center marker
    L.marker([CENTER_LAT, CENTER_LNG])
        .addTo(map)
        .bindPopup('6th & Alvarado')
        .openPopup();
}

// Fetch bus data from Swiftly API
async function fetchBusData() {
    try {
        console.log('Fetching bus data...');

        const promises = Object.values(ROUTES).map(routeId => {
            const url = `/api/buses/${routeId}`;
            console.log('Fetching:', url);
            return fetch(url);
        });

        const responses = await Promise.all(promises);
        console.log('Responses:', responses);

        // Check if responses are ok and parse JSON
        const data = [];
        for (let i = 0; i < responses.length; i++) {
            if (!responses[i].ok) {
                console.error(`Response ${i} not ok:`, responses[i].status, responses[i].statusText);
                const errorText = await responses[i].text();
                console.error('Error response body:', errorText);
                data.push({ entity: [] }); // Empty data for failed requests
            } else {
                const jsonData = await responses[i].json();
                data.push(jsonData);
            }
        }
        console.log('Bus data:', data);

        updateBusMarkers(data);

    } catch (error) {
        console.error('Error fetching bus data:', error);
        document.getElementById('bus-count').textContent = 'Error loading buses - check console';
    }
}

// Update bus markers on map
function updateBusMarkers(busData) {
    // Clear existing markers
    Object.values(busMarkers).forEach(marker => map.removeLayer(marker));
    busMarkers = {};

    let totalBuses = 0;

    busData.forEach((routeData, index) => {
        const routeNumber = Object.keys(ROUTES)[index];

        if (routeData.entity) {
            routeData.entity.forEach(bus => {
                if (bus.vehicle && bus.vehicle.position) {
                    const { latitude, longitude } = bus.vehicle.position;
                    const bearing = bus.vehicle.position.bearing || 0;

                    // Create bus icon with direction
                    const busColor = routeNumber === '2' ? '#e74c3c' : '#3498db';
                    const busIcon = L.divIcon({
                        html: `<div style="
                            width: 20px; 
                            height: 12px; 
                            background: ${busColor}; 
                            border: 2px solid white; 
                            border-radius: 3px;
                            transform: rotate(${bearing}deg);
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            position: relative;
                        ">
                            <div style="
                                position: absolute;
                                top: -2px;
                                right: -2px;
                                width: 4px;
                                height: 4px;
                                background: white;
                                border-radius: 50%;
                            "></div>
                        </div>`,
                        className: 'bus-icon',
                        iconSize: [20, 12],
                        iconAnchor: [10, 6]
                    });

                    const marker = L.marker([latitude, longitude], { icon: busIcon }).addTo(map);

                    marker.bindPopup(`
                        <strong>Route ${routeNumber}</strong><br>
                        Vehicle: ${bus.vehicle.vehicle?.id || 'Unknown'}<br>
                        Direction: ${Math.round(bearing)}°
                    `);

                    busMarkers[bus.id] = marker;
                    totalBuses++;
                }
            });
        }
    });

    document.getElementById('bus-count').textContent = `${totalBuses} buses tracked`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initMap();

    // Check if API key is set
    if (SWIFTLY_API_KEY === 'YOUR_API_KEY_HERE') {
        document.getElementById('bus-count').textContent = 'Please set your Swiftly API key in notspot.js';
        return;
    }

    // Initial fetch
    fetchBusData();

    // Update every 30 seconds
    setInterval(fetchBusData, 30000);
});