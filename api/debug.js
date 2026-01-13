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
};