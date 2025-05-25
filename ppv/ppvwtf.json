// Sora module for fetching live stream events from PPV.wtf

async function searchResults(query) {
  const res = await fetch("https://ppv.wtf/api/streams");
  const json = await res.json();

  if (!json.success) return [];

  const results = [];

  for (const category of json.streams) {
    for (const stream of category.streams) {
      if (stream.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          title: stream.name,
          image: stream.poster,
          url: `https://ppv.wtf/live/${stream.uri_name}`
        });
      }
    }
  }

  return results;
}

async function extractStreamUrl(url) {
  const page = await fetch(url).then(res => res.text());

  const match = page.match(/<iframe[^>]+src=["']([^"']+)["']/);
  if (match) {
    return match[1]; // Return iframe src, usually the actual stream player
  }

  return null;
}
