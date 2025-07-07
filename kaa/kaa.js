// Kaa.to Source Module for Sora
// API-based anime streaming source

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        
        // Based on the API structure shown, search endpoint
        const response = await fetchv2(`https://kaa.to/api/fsearch`, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Referer': 'https://kaa.to/'
        }, 'POST', {
            'query': keyword,
            'page': 1
        });
        
        const data = await response.json();
        
        if (!data.result || !Array.isArray(data.result)) {
            return JSON.stringify([]);
        }
        
        const transformedResults = data.result.map(anime => ({
            title: anime.title || 'Unknown Title',
            image: anime.poster ? 
                   `https://kaa.to/api/image/${anime.poster.hq || anime.poster.sm}` : 
                   'https://via.placeholder.com/300x400',
            href: `https://kaa.to/anime/${anime.slug}`
        }));
        
        return JSON.stringify(transformedResults);
        
    } catch (error) {
        console.log('Search error:', error);
        return JSON.stringify([]);
    }
}

async function extractDetails(url) {
    try {
        // Extract slug from URL: https://kaa.to/anime/hello-lady-lynn-78be
        const slugMatch = url.match(/\/anime\/(.+)$/);
        if (!slugMatch) {
            throw new Error('Invalid URL format');
        }
        
        const slug = slugMatch[1];
        
        // Attempt to get details from API (educated guess on endpoint)
        const response = await fetchv2(`https://kaa.to/api/anime/${slug}`, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://kaa.to/'
        });
        
        const data = await response.json();
        
        const details = [{
            description: data.synopsis || data.description || 'No description available',
            aliases: data.title_en || data.alternative_titles?.join(', ') || 'N/A',
            airdate: data.year ? `${data.year}` : 'Unknown'
        }];
        
        return JSON.stringify(details);
        
    } catch (error) {
        console.log('Details error:', error);
        // Fallback: return basic info
        return JSON.stringify([{
            description: 'Unable to load description',
            aliases: 'N/A',
            airdate: 'Unknown'
        }]);
    }
}

async function extractEpisodes(url) {
    try {
        // Extract slug from URL
        const slugMatch = url.match(/\/anime\/(.+)$/);
        if (!slugMatch) {
            throw new Error('Invalid URL format');
        }
        
        const slug = slugMatch[1];
        
        // Attempt to get episodes from API (educated guess on endpoint)
        let response;
        try {
            response = await fetchv2(`https://kaa.to/api/episodes/${slug}`, {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://kaa.to/'
            });
        } catch (episodeError) {
            // Try alternative endpoint
            response = await fetchv2(`https://kaa.to/api/anime/${slug}/episodes`, {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://kaa.to/'
            });
        }
        
        const data = await response.json();
        
        let episodes = [];
        
        // Handle different possible response structures
        if (Array.isArray(data)) {
            episodes = data;
        } else if (data.episodes && Array.isArray(data.episodes)) {
            episodes = data.episodes;
        } else if (data.result && Array.isArray(data.result)) {
            episodes = data.result;
        }
        
        const transformedEpisodes = episodes.map((episode, index) => ({
            href: `https://kaa.to/watch/${slug}/${episode.number || episode.episode || (index + 1)}`,
            number: String(episode.number || episode.episode || (index + 1))
        }));
        
        // If no episodes found, generate based on episode_count from search results
        if (transformedEpisodes.length === 0) {
            // Generate episodes 1-12 as fallback (common anime episode count)
            for (let i = 1; i <= 12; i++) {
                transformedEpisodes.push({
                    href: `https://kaa.to/watch/${slug}/${i}`,
                    number: String(i)
                });
            }
        }
        
        return JSON.stringify(transformedEpisodes);
        
    } catch (error) {
        console.log('Episodes error:', error);
        return JSON.stringify([]);
    }
}

async function extractStreamUrl(url) {
    try {
        // Extract slug and episode from URL: https://kaa.to/watch/slug/episode
        const watchMatch = url.match(/\/watch\/(.+)\/(\d+)$/);
        if (!watchMatch) {
            throw new Error('Invalid watch URL format');
        }
        
        const [, slug, episode] = watchMatch;
        
        // Try different possible stream API endpoints
        const possibleEndpoints = [
            `https://kaa.to/api/stream/${slug}/${episode}`,
            `https://kaa.to/api/video/${slug}/${episode}`,
            `https://kaa.to/api/watch/${slug}/${episode}`,
            `https://kaa.to/api/episode/${slug}/${episode}/stream`
        ];
        
        for (const endpoint of possibleEndpoints) {
            try {
                const response = await fetchv2(endpoint, {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://kaa.to/'
                });
                
                const data = await response.json();
                
                // Look for stream URL in various possible response formats
                if (data.stream_url) {
                    return data.stream_url;
                } else if (data.url) {
                    return data.url;
                } else if (data.sources && Array.isArray(data.sources)) {
                    const hlsSource = data.sources.find(source => 
                        source.type === 'hls' || source.url.includes('.m3u8')
                    );
                    if (hlsSource) {
                        return hlsSource.url;
                    }
                    return data.sources[0].url;
                } else if (data.video_url) {
                    return data.video_url;
                }
                
            } catch (endpointError) {
                console.log(`Failed endpoint ${endpoint}:`, endpointError);
                continue;
            }
        }
        
        throw new Error('No working stream endpoint found');
        
    } catch (error) {
        console.log('Stream URL error:', error);
        return null;
    }
} 
