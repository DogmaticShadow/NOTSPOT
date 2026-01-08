// Notspot Bus Tracker
// Put your Swiftly API key here:
const SWIFTLY_API_KEY = '62ab360e9a91093591f904a925c58815'; // <-- Replace with your actual API key

// Bus route IDs
const ROUTES = {
    '2': '2-13196',
    '93': '93-13196'
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
                    const directionId = bus.vehicle.trip?.directionId;
                    
                    // Direction arrows - different logic for each route
                    let arrow = '';
                    let directionName = '';
                    
                    if (routeNumber === '2') {
                        // Route 2: 0 = south (UCLA→USC), 1 = north (USC→UCLA)
                        if (directionId === 0) {
                            arrow = '↓';
                            directionName = 'South (UCLA→USC)';
                        } else if (directionId === 1) {
                            arrow = '↑';
                            directionName = 'North (USC→UCLA)';
                        } else {
                            arrow = '?';
                            directionName = 'Unknown';
                        }
                    } else {
                        // Route 93: 0 = north (LATTC→Glendale), 1 = south (Glendale→LATTC)
                        if (directionId === 0) {
                            arrow = '↑';
                            directionName = 'North (LATTC→Glendale)';
                        } else if (directionId === 1) {
                            arrow = '↓';
                            directionName = 'South (Glendale→LATTC)';
                        } else {
                            arrow = '?';
                            directionName = 'Unknown';
                        }
                    }
                    
                    // Create bus icon with directional arrow
                    let busIcon;
                    if (routeNumber === '2') {
                        // Route 2: Blue bus with arrow
                        busIcon = L.divIcon({
                            html: `<div style="
                                width: 32px; 
                                height: 32px; 
                                background: url('bus-icon-blue.svg') center/contain no-repeat;
                                position: relative;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <span style="
                                    font-size: 18px;
                                    color: white;
                                    text-shadow: 2px 2px 4px black;
                                    font-weight: bold;
                                ">${arrow}</span>
                            </div>`,
                            className: 'bus-icon-with-arrow',
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });
                    } else {
                        // Route 93: Red bus with arrow
                        busIcon = L.divIcon({
                            html: `<div style="
                                width: 32px; 
                                height: 32px; 
                                background: url('bus-icon.svg') center/contain no-repeat;
                                position: relative;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <span style="
                                    font-size: 18px;
                                    color: white;
                                    text-shadow: 2px 2px 4px black;
                                    font-weight: bold;
                                ">${arrow}</span>
                            </div>`,
                            className: 'bus-icon-with-arrow',
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });
                    }

                    const marker = L.marker([latitude, longitude], { icon: busIcon }).addTo(map);

                    marker.bindPopup(`
                        <strong>Route ${routeNumber}</strong><br>
                        Vehicle: ${bus.vehicle.vehicle?.id || 'Unknown'}<br>
                        <strong>Direction: ${directionName}</strong><br>
                        Direction ID: ${directionId !== undefined ? directionId : 'N/A'}<br>
                        Bearing: ${bearing ? Math.round(bearing) + '°' : 'No bearing'}<br>
                        Lat: ${latitude.toFixed(4)} Lng: ${longitude.toFixed(4)}
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