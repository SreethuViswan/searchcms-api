import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

const WEBFLOW_API_TOKEN = "bd7800a7abf8d6d644b226eba16cdfbbf82c06c1b05a8dec40999bed1b8dd215"; 
const SITE_ID = "6733b139e391b7e2869734c5"; 

app.get("/collections", async (req, res) => {
    try {
        const response = await fetch(`https://api.webflow.com/v2/sites/${SITE_ID}/collections`, {
            headers: { Authorization: `Bearer ${WEBFLOW_API_TOKEN}` },
        });

        if (!response.ok) throw new Error("Failed to fetch collections");

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




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
        console.log("Response from Webflow API:", data);

        if (!response.ok) throw new Error(data.message || "Failed to fetch collection items");

        res.json(data);
    } catch (error) {
        console.error("Error fetching collection items:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
