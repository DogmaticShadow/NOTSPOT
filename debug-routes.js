const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const SWIFTLY_API_KEY = '62ab360e9a91093591f904a925c58815';

async function debugRoutes() {
    try {
        const url = 'https://api.goswift.ly/real-time/lametro/gtfs-rt-vehicle-positions';
        console.log('Fetching from:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': SWIFTLY_API_KEY
            }
        });
        
        if (!response.ok) {
            console.error('Error:', response.status, response.statusText);
            return;
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
        
        console.log(`Total vehicles: ${feed.entity.length}`);
        
        // Get all unique route IDs
        const routes = new Set();
        feed.entity.forEach(entity => {
            const routeId = entity.vehicle?.trip?.routeId;
            if (routeId) {
                routes.add(routeId);
            }
        });
        
        console.log('Available routes:', Array.from(routes).sort());
        
        // Look specifically for routes containing "2" or "93"
        const matchingRoutes = Array.from(routes).filter(route => 
            route.includes('2') || route.includes('93')
        );
        console.log('Routes containing "2" or "93":', matchingRoutes);
        
        // Check specifically for routes 2 and 93
        const route2Vehicles = feed.entity.filter(e => e.vehicle?.trip?.routeId === '2-13188');
        const route93Vehicles = feed.entity.filter(e => e.vehicle?.trip?.routeId === '93-13188');
        
        console.log(`Route 2 vehicles: ${route2Vehicles.length}`);
        console.log(`Route 93 vehicles: ${route93Vehicles.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugRoutes();