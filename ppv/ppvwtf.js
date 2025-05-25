// ppvwtf.js

// This function searches for live sports streams based on the user's query.
async function search(query) {
  const response = await fetch('https://ppv.wtf/api/streams');
  const data = await response.json();

  if (!data.success) return [];

  const results = [];

  for (const category of data.streams) {
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

// This function extracts the direct stream URL from the stream page.
async function load(url) {
  const response = await fetch(url);
  const html = await response.text();

  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/);
  if (iframeMatch) {
    return {
      stream: iframeMatch[1]
    };
  }

  return null;
}
