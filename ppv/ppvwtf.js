async function searchResults(query) {
    try {
        const res = await fetch("https://ppv.wtf/");
        const html = await res.text();

        // Regular expression to find all live stream links
        const regex = /href="(\/live\/[^"]+)"/g;
        const matches = [...html.matchAll(regex)];

        const results = [];

        for (const match of matches) {
            const path = match[1];
            const titleMatch = path.match(/\/live\/([^\/]+)\/?([^\/]*)\/?([^\/]*)/);
            if (!titleMatch) continue;

            const parts = titleMatch.slice(1).filter(Boolean);
            const title = parts.join(" ").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

            if (title.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    title: title,
                    href: `https://ppv.wtf${path}`,
                    image: "https://ppv.wtf/favicon.ico"
                });
            }
        }

        return JSON.stringify(results);
    } catch (error) {
        console.error("Error in searchResults:", error);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        const res = await fetch(url);
        const html = await res.text();

        // Extract description from the page's title tag
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const description = titleMatch ? titleMatch[1] : "No description available";

        return JSON.stringify([{
            description: description,
            aliases: "",
            airdate: ""
        }]);
    } catch (error) {
        console.error("Error in extractDetails:", error);
        return JSON.stringify([{
            description: "Error loading description",
            aliases: "",
            airdate: ""
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        // Since each URL corresponds to a single live event, we return one episode
        return JSON.stringify([{
            href: url,
            number: 1,
            title: "Live Stream"
        }]);
    } catch (error) {
        console.error("Error in extractEpisodes:", error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        const res = await fetch(url);
        const html = await res.text();

        // Extract the iframe src containing the stream
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"[^>]*>/);
        if (!iframeMatch) return null;

        const streamUrl = iframeMatch[1];

        return JSON.stringify({
            stream: streamUrl,
            subtitles: ""
        });
    } catch (error) {
        console.error("Error in extractStreamUrl:", error);
        return null;
    }
}
