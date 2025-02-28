import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const WEBFLOW_API_TOKEN = "bd7800a7abf8d6d644b226eba16cdfbbf82c06c1b05a8dec40999bed1b8dd215";

// Fetch all sites
async function getAllSites() {
    const response = await fetch('https://api.webflow.com/v2/sites', {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch sites from Webflow');
    }

    const data = await response.json();

    console.log('Fetched sites:', JSON.stringify(data, null, 2)); // Debug log to check structure

    const sites = data.sites.map(site => ({
        id: site.id,
        displayName: site.displayName,
        shortName: site.shortName,
    }));

    return sites;
}

// Endpoint to get all site IDs and names
app.get('/get-sites', async (req, res) => {
    try {
        const sites = await getAllSites();
        res.json(sites);
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fetch collections for a specific site
app.get("/collections", async (req, res) => {
    const { siteId } = req.query; // Get siteId from query params like ?siteId=...

    if (!siteId) {
        return res.status(400).json({ error: "siteId query parameter is required" });
    }

    try {
        const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/collections`, {
            headers: { Authorization: `Bearer ${WEBFLOW_API_TOKEN}` },
        });

        if (!response.ok) throw new Error("Failed to fetch collections");

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch collection items for a given collection ID
app.get("/collections/:collectionId/items", async (req, res) => {
    const { collectionId } = req.params;
    console.log(`Fetching items from collection: ${collectionId}`);

    try {
        const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
            headers: {
                Authorization: `Bearer ${WEBFLOW_API_TOKEN}`,
                "Accept-Version": "1.0.0" // Add versioning if required
            },
        });

        const data = await response.json();

        if (!response.ok) throw new Error(data.message || "Failed to fetch collection items");

        res.json(data);
    } catch (error) {
        console.error("Error fetching collection items:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
