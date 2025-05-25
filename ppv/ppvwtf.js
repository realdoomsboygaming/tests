export async function search(query) {
  const res = await fetch("https://ppv.wtf/api/streams", { parse: "json" });
  const json = res; // Already parsed due to parse: "json"

  if (!json || !json.streams) return [];

  const results = [];

  for (const category of json.streams) {
    for (const stream of category.streams) {
      if (stream.name.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          title: stream.name,
          url: `https://ppv.wtf/live/${stream.uri_name}`,
          poster: stream.poster,
          description: category.name
        });
      }
    }
  }

  return results;
}

export async function load(url) {
  const res = await fetch(url, { parse: "text" });
  const html = res;

  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
  
  if (!iframeMatch) return null;

  return {
    type: "hls",
    stream: iframeMatch[1]
  };
}
