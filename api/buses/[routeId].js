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
        const { routeId } = req.query;
        const url = 'https://api.goswift.ly/real-time/lametro/gtfs-rt-vehicle-positions';
        
        console.log('Fetching protobuf from:', url);
        
        const response = await fetch(url, {
            headers: {
                'Authorization': SWIFTLY_API_KEY
            }
        });
        
        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            return res.status(response.status).json({ 
                error: `Swiftly API error: ${response.status}`,
                details: response.statusText
            });
        }
        
        // Get the protobuf data
        const buffer = Buffer.from(await response.arrayBuffer());
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
        
        console.log(`Decoded ${feed.entity.length} total vehicles`);
        
        // Filter for our specific route and log all available data
        const filteredEntities = feed.entity.filter(entity => {
            const route = entity.vehicle?.trip?.routeId;
            return route === routeId;
        });
        
        console.log(`Found ${filteredEntities.length} vehicles for route ${routeId}`);
        
        const vehicles = filteredEntities.map((entity, index) => {
            // Log the full raw entity data for debugging (first 2 only to avoid spam)
            if (index < 2) {
                console.log('=== RAW ENTITY DATA ===');
                console.log(JSON.stringify(entity, null, 2));
                console.log('=== END RAW DATA ===');
            }
            
            return {
                id: entity.id,
                vehicle: {
                    position: {
                        latitude: entity.vehicle.position?.latitude,
                        longitude: entity.vehicle.position?.longitude,
                        bearing: entity.vehicle.position?.bearing,
                        odometer: entity.vehicle.position?.odometer,
                        speed: entity.vehicle.position?.speed
                    },
                    trip: {
                        routeId: entity.vehicle.trip?.routeId,
                        tripId: entity.vehicle.trip?.tripId,
                        directionId: entity.vehicle.trip?.directionId,
                        startTime: entity.vehicle.trip?.startTime,
                        startDate: entity.vehicle.trip?.startDate,
                        scheduleRelationship: entity.vehicle.trip?.scheduleRelationship
                    },
                    vehicle: {
                        id: entity.vehicle.vehicle?.id,
                        label: entity.vehicle.vehicle?.label,
                        licensePlate: entity.vehicle.vehicle?.licensePlate
                    },
                    currentStopSequence: entity.vehicle.currentStopSequence,
                    stopId: entity.vehicle.stopId,
                    currentStatus: entity.vehicle.currentStatus,
                    timestamp: entity.vehicle.timestamp,
                    congestionLevel: entity.vehicle.congestionLevel,
                    occupancyStatus: entity.vehicle.occupancyStatus
                }
            };
        });
        
        console.log(`Found ${vehicles.length} vehicles for route ${routeId}`);
        
        // Return in GTFS-RT JSON format for compatibility with our frontend
        res.json({
            entity: vehicles
        });
        
    } catch (error) {
        console.error('Error fetching bus data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch bus data',
            details: error.message
        });
    }
};