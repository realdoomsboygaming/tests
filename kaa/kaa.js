// Kaa.to Source Module for Sora
// API-based anime streaming source

async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        
        // Based on the API structure shown, search endpoint
        const response = await fetchv2('https://kaa.to/api/fsearch', {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Referer': 'https://kaa.to/'
        }, 'POST', {
            query: keyword,
            page: 1
        });
        
        const data = await response.json();
        
        if (!data.result || !Array.isArray(data.result)) {
            return JSON.stringify([]);
        }
        
        const transformedResults = data.result.map(anime => ({
            title: anime.title || 'Unknown Title',
            image: anime.poster ? 
                   'https://kaa.to/api/image/' + (anime.poster.hq || anime.poster.sm) : 
                   'https://via.placeholder.com/300x400',
            href: 'https://kaa.to/anime/' + anime.slug
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
        
        // Since /api/anime/{slug} doesn't exist, we need to get details from search
        // This is a workaround - search for the anime title to get details
        const searchKeyword = slug.replace(/-/g, ' ').replace(/\b\w+\b$/, ''); // Remove ID suffix
        
        const response = await fetchv2('https://kaa.to/api/fsearch', {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Referer': 'https://kaa.to/'
        }, 'POST', {
            query: searchKeyword,
            page: 1
        });
        
        const data = await response.json();
        
        // Find the matching anime by slug
        const anime = data.result?.find(item => item.slug === slug);
        
        if (anime) {
            const details = [{
                description: anime.synopsis || 'No description available',
                aliases: anime.title_en || 'N/A',
                airdate: anime.year ? anime.year.toString() : 'Unknown'
            }];
            return JSON.stringify(details);
        }
        
        throw new Error('Anime not found in search results');
        
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
        
        // Use the confirmed working episodes API
        const response = await fetchv2('https://kaa.to/api/episodes/' + slug, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://kaa.to/'
        });
        
        const data = await response.json();
        
        // Handle the confirmed API response structure
        if (data.result && Array.isArray(data.result)) {
            const transformedEpisodes = data.result.map(episode => ({
                href: 'https://kaa.to/watch/' + slug + '/' + episode.episodeNumber,
                number: String(episode.episodeNumber)
            }));
            
            // Sort episodes in ascending order (API returns descending)
            transformedEpisodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));
            
            return JSON.stringify(transformedEpisodes);
        }
        
        throw new Error('Invalid episodes response structure');
        
    } catch (error) {
        console.log('Episodes error:', error);
        
        // Fallback: Try to get episode count from search and generate episode list
        try {
            const searchKeyword = url.match(/\/anime\/(.+)$/)[1].replace(/-/g, ' ').replace(/\b\w+\b$/, '');
            const searchResponse = await fetchv2('https://kaa.to/api/fsearch', {
                'Content-Type': 'application/json',
                'Referer': 'https://kaa.to/'
            }, 'POST', {
                query: searchKeyword,
                page: 1
            });
            
            const searchData = await searchResponse.json();
            const anime = searchData.result?.find(item => item.slug === url.match(/\/anime\/(.+)$/)[1]);
            
            if (anime && anime.episode_count) {
                const fallbackEpisodes = [];
                for (let i = 1; i <= anime.episode_count; i++) {
                    fallbackEpisodes.push({
                        href: 'https://kaa.to/watch/' + anime.slug + '/' + i,
                        number: String(i)
                    });
                }
                return JSON.stringify(fallbackEpisodes);
            }
        } catch (fallbackError) {
            console.log('Fallback episodes error:', fallbackError);
        }
        
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
        
        const slug = watchMatch[1];
        const episode = watchMatch[2];
        
        // Try different possible stream API endpoints
        const possibleEndpoints = [
            'https://kaa.to/api/episode/' + slug + '/' + episode,
            'https://kaa.to/api/video/' + slug + '/' + episode,
            'https://kaa.to/api/watch/' + slug + '/' + episode,
            'https://kaa.to/api/stream/' + slug + '/' + episode
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
                console.log('Failed endpoint ' + endpoint + ':', endpointError);
                continue;
            }
        }
        
        // Try POST method to episode stream endpoint
        try {
            const response = await fetchv2('https://kaa.to/api/episode/stream', {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/json',
                'Referer': 'https://kaa.to/'
            }, 'POST', {
                slug: slug,
                episode: parseInt(episode)
            });
            
            const data = await response.json();
            
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
            }
        } catch (postError) {
            console.log('POST stream error:', postError);
        }
        
        throw new Error('No working stream endpoint found');
        
    } catch (error) {
        console.log('Stream URL error:', error);
        return null;
    }
} 
