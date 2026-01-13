const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const SWIFTLY_API_KEY = '62ab360e9a91093591f904a925c58815';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const url = 'https://api.goswift.ly/real-time/lametro/gtfs-rt-vehicle-positions';
        
        const response = await fetch(url, {
            headers: {
                'Authorization': SWIFTLY_API_KEY
            }
        });
        
        if (!response.ok) {
            return res.status(response.status).json({ error: `API error: ${response.status}` });
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
        
        // Get all unique route IDs
        const routeIds = [...new Set(feed.entity
            .filter(entity => entity.vehicle?.trip?.routeId)
            .map(entity => entity.vehicle.trip.routeId)
            .filter(routeId => routeId.includes('2') || routeId.includes('93'))
        )].sort();
        
        res.json({
            totalVehicles: feed.entity.length,
            routeIdsContaining2or93: routeIds,
            allRouteIds: [...new Set(feed.entity
                .filter(entity => entity.vehicle?.trip?.routeId)
                .map(entity => entity.vehicle.trip.routeId)
            )].sort().slice(0, 20) // First 20 for reference
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};