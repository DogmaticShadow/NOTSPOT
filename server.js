const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

const app = express();
const PORT = 3001;

// Your Swiftly API key
const SWIFTLY_API_KEY = '62ab360e9a91093591f904a925c58815';

app.use(cors());
app.use(express.static('.'));

// Debug endpoint to see available route IDs
app.get('/api/routes', async (req, res) => {
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
});

// Debug endpoint to see raw data structure
app.get('/api/debug', async (req, res) => {
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
        
        // Get first few entities to see structure
        const sampleEntities = feed.entity.slice(0, 3).map(entity => ({
            id: entity.id,
            rawData: entity
        }));
        
        res.json({
            totalEntities: feed.entity.length,
            sampleEntities: sampleEntities
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to check API base
app.get('/api/test', async (req, res) => {
    try {
        console.log('Testing Swiftly API base endpoints...');
        
        const testUrls = [
            'https://api.goswift.ly/',
            'https://api.goswift.ly/v1/',
            'https://api.goswift.ly/real-time/',
            'https://api.goswift.ly/gtfs-rt/'
        ];
        
        for (const url of testUrls) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${SWIFTLY_API_KEY}`
                    }
                });
                console.log(`${url} - Status: ${response.status}`);
                if (response.status !== 404) {
                    const text = await response.text();
                    console.log(`${url} - Response: ${text.substring(0, 200)}...`);
                }
            } catch (err) {
                console.log(`${url} - Error: ${err.message}`);
            }
        }
        
        res.json({ message: 'Check server console for API test results' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Proxy endpoint for Swiftly API
app.get('/api/buses/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
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
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open http://localhost:3001/notspot.html in your browser');
});