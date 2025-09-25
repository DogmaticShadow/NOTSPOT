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
        
        // Filter for our specific route using the full routeId (e.g., "2-13188")
        const vehicles = feed.entity
            .filter(entity => {
                const route = entity.vehicle?.trip?.routeId;
                return route === routeId;
            })
            .map(entity => ({
                id: entity.id,
                vehicle: {
                    position: {
                        latitude: entity.vehicle.position?.latitude,
                        longitude: entity.vehicle.position?.longitude,
                        bearing: entity.vehicle.position?.bearing
                    },
                    trip: {
                        routeId: entity.vehicle.trip?.routeId
                    },
                    vehicle: {
                        id: entity.vehicle.vehicle?.id
                    },
                    timestamp: entity.vehicle.timestamp
                }
            }));
        
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