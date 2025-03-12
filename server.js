    import express from "express";
    import cors from "cors";
    import fetch from "node-fetch";

    const app = express();
    app.use(cors());



    const WEBFLOW_API_TOKEN = "bd7800a7abf8d6d644b226eba16cdfbbf82c06c1b05a8dec40999bed1b8dd215";

    let searchIndex = [];
const pageTitleMap = {}; // Store valid pages

    // Fetch all sites
    app.get('/get-sites', async (req, res) => {
        try {
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
            console.log('Fetched sites:', JSON.stringify(data, null, 2));

            const sites = data.sites.map(site => ({
                id: site.id,
                displayName: site.displayName,
                shortName: site.shortName,
            }));

            res.json(sites);
        } catch (error) {
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



   

// ✅ Fetch pages for a site and store valid pages in `pageTitleMap`
async function fetchAndStorePages(siteId) {
    try {
        const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/pages`, {
            headers: { Authorization: `Bearer ${WEBFLOW_API_TOKEN}` }
        });

        if (!response.ok) throw new Error("Failed to fetch pages");

        const data = await response.json();

        data.pages.forEach(page => {
            const title = page.name || page.title || page.slug;
            const publishedPath = page.publishedPath || "No Published Path";

            if (!title) return;

            pageTitleMap[page.id] = { title, publishedPath };
            console.log(`✅ Indexed Page: ${page.id}, Title: ${title}, Path: ${publishedPath}`);
        });

        return data.pages; // Return the list of pages
    } catch (error) {
        console.error("Error fetching pages:", error);
        return [];
    }
}

// ✅ Extract text content from Webflow page DOM
async function indexPageText(pageId, siteId) {
    try {
        const pageDetails = pageTitleMap[pageId];
        if (!pageDetails) {
            console.log(`🚨 Page ID ${pageId} not found! Fetching pages first.`);
            await fetchAndStorePages(siteId);
        }

        const response = await fetch(`https://api.webflow.com/v2/pages/${pageId}/dom`, {
            headers: { Authorization: `Bearer ${WEBFLOW_API_TOKEN}` }
        });

        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const data = await response.json();
        if (!data.nodes || !Array.isArray(data.nodes)) {
            throw new Error("No nodes found in response.");
        }

        const textContent = data.nodes
            .map(node => (typeof node.text === "string" ? node.text.trim() : node.text?.text?.trim() || ""))
            .filter(text => text)
            .join("\n");

        if (!textContent) throw new Error("No text content found in nodes.");

        searchIndex.push({
            pageId,
            title: pageTitleMap[pageId].title,
            publishedPath: pageTitleMap[pageId].publishedPath,
            text: textContent
        });

        console.log(`📌 Indexed: ${pageTitleMap[pageId].title} (${pageId})`);
    } catch (error) {
        console.error("Error indexing text:", error);
    }
}

// ✅ Auto-index all pages before searching
app.get("/search", async (req, res) => {
    const { query, siteId } = req.query;

    if (!query) return res.status(400).json({ error: "Search query is required" });

    const searchTerm = query.toLowerCase().trim();

    if (searchIndex.length === 0) {
        console.log("🔍 Search index is empty! Indexing all pages before search...");

        if (!siteId) {
            return res.status(400).json({ error: "siteId query parameter is required for indexing" });
        }

        try {
            const pages = await fetchAndStorePages(siteId);
            for (const page of pages) {
                await indexPageText(page.id, siteId);
            }
            console.log("✅ All pages indexed successfully!");
        } catch (error) {
            console.error("❌ Error indexing pages:", error);
            return res.status(500).json({ error: "Failed to index pages before search" });
        }
    }

    // 🔍 Perform search
    const results = searchIndex.filter(entry =>
        entry.title.toLowerCase().includes(searchTerm) || entry.text.toLowerCase().includes(searchTerm)
    ).map(entry => ({
        pageId: entry.pageId,
        title: entry.title,
        publishedPath: entry.publishedPath,
        matchedText: entry.text
    }));

    res.json({ query, results });
});

// ✅ Start server



    const PORT = process.env.PORT || 4000;
    const HOST = 'localhost';

    app.listen(PORT, () => {
        console.log(`🚀 Server running at: http://${HOST}:${PORT}`);
    });
