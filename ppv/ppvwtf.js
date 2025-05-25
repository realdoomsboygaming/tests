export async function searchResults(query) {
    try {
        const res = await fetch("https://ppv.wtf/");
        const html = res.body;

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

export async function extractDetails(url) {
    try {
        const res = await fetch(url);
        const html = res.body;

        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*PPV\.wtf/, "") : "Unknown Title";

        return JSON.stringify({
            title: title,
            description: "Live stream from PPV.wtf",
            image: "https://ppv.wtf/favicon.ico"
        });
    } catch (error) {
        console.error("Error in extractDetails:", error);
        return JSON.stringify({});
    }
}

export async function extractEpisodes(url) {
    // This site is for live streams, no episodes — return empty
    return JSON.stringify([]);
}

export async function extractStream(url) {
    try {
        const res = await fetch(url);
        const html = res.body;

        const sourceMatch = html.match(/source src="([^"]+)"/);
        if (sourceMatch) {
            return JSON.stringify({
                stream: sourceMatch[1]
            });
        }

        return JSON.stringify({});
    } catch (error) {
        console.error("Error in extractStream:", error);
        return JSON.stringify({});
    }
}
