// Oppai Stream Source for Sora
// Author: doomsboygaming
// Website: https://oppai.stream
// Content: Anime/Hentai with English subtitles

const OPPAI_CONFIG = {
    name: "Oppai Stream",
    author: "doomsboygaming", 
    baseUrl: "https://oppai.stream/",
    defaultQuality: "1080p",
    language: "Japanese",
    subtitles: "English VTT",
    type: "anime"
};

/**
 * Search for anime/shows on Oppai Stream
 * @param {string} query - Search query (keyword for async mode)
 * @returns {string} JSON string of search results
 */
async function searchResults(query) {
    // Use the actual AJAX search endpoint
    const searchUrl = `${OPPAI_CONFIG.baseUrl}actions/search.php?text=${encodeURIComponent(query)}&order=recent&page=1&limit=35&genres=&blacklist=&studio=&ibt=0&swa=1`;
    
    try {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*',
            'Referer': OPPAI_CONFIG.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        const response = await fetchv2(searchUrl, headers);
        const html = await response.text();
        const results = [];
        
        // Debug logging
        console.log('Oppai Stream search URL:', searchUrl);
        console.log('Response received, looking for episodes...');
        
        // Parse HTML response using regex (JavaScriptCore compatible)
        const episodeRegex = /<div[^>]*class="[^"]*in-grid episode-shown[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
        const episodeMatches = html.match(episodeRegex) || [];
        
        console.log('Found episode elements:', episodeMatches.length);
        
        for (const episodeHtml of episodeMatches) {
            // Extract URL from href attribute
            const urlMatch = episodeHtml.match(/href="([^"]+)"/);
            if (!urlMatch) {
                console.log('No URL found in episode');
                continue;
            }
            const url = urlMatch[1];
            
            // Extract image
            const imgMatch = episodeHtml.match(/<img[^>]*class="cover-img-in"[^>]*src="([^"]+)"/);
            const image = imgMatch ? imgMatch[1] : null;
            
            // Extract title and episode number
            const titleMatch = episodeHtml.match(/<font class="title inline">([^<]+)<\/font>/);
            const episodeMatch = episodeHtml.match(/<font class="ep inline">([^<]+)<\/font>/);
            
            if (!titleMatch || !url) {
                console.log('Missing title or URL for episode');
                continue;
            }
            
            const title = titleMatch[1].trim();
            const episode = episodeMatch ? episodeMatch[1].trim() : '1';
            const fullUrl = url.startsWith('http') ? url : OPPAI_CONFIG.baseUrl + url.replace(/^\//, '');
            
            console.log('Found episode:', title, 'Ep', episode);
            
            results.push({
                title: title,
                image: image,
                href: fullUrl
            });
        }
        
        console.log('Total search results found:', results.length);
        return JSON.stringify(results);
        
    } catch (error) {
        console.error('Oppai Stream search error:', error);
        console.error('Error details:', error.message);
        return JSON.stringify([]);
    }
}

/**
 * Extract show details from detail page
 * @param {string} url - Detail page URL
 * @returns {string} JSON string of show details
 */
async function extractDetails(url) {
    try {
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': OPPAI_CONFIG.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        const response = await fetchv2(url, headers);
        const html = await response.text();
        
        // Extract title using regex
        let titleMatch = html.match(/<h1[^>]*class="[^"]*episode-info[^"]*"[^>]*>([^<]+)<\/h1>/);
        if (!titleMatch) {
            titleMatch = html.match(/<title>([^<]+)<\/title>/);
        }
        
        const title = titleMatch ? titleMatch[1].replace(/Watch\s+|EP\s+\d+|\s+in\s+HD.*$/gi, '').trim() : 'Unknown';
        
        // Extract description
        const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>[\s\S]*?<h5[^>]*>([^<]+)<\/h5>/);
        const description = descMatch ? descMatch[1].trim() : '';
        
        // Extract year from content (if available)
        let year = null;
        const yearMatch = html.match(/(\d{4})/);
        if (yearMatch) {
            year = parseInt(yearMatch[1]);
        }
        
        return JSON.stringify([{
            description: description,
            aliases: title,
            airdate: year ? year.toString() : 'Unknown'
        }]);
        
    } catch (error) {
        console.error('Oppai Stream details extraction error:', error);
        return JSON.stringify([{
            description: 'Error loading description',
            aliases: 'Unknown',
            airdate: 'Unknown'
        }]);
    }
}

/**
 * Extract episodes list from the show page
 * @param {string} url - Show detail page URL
 * @returns {string} JSON string of episodes
 */
async function extractEpisodes(url) {
    try {
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': OPPAI_CONFIG.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        const response = await fetchv2(url, headers);
        const html = await response.text();
        const episodes = [];
        
        // Extract episodes using regex
        const episodeRegex = /<div[^>]*class="[^"]*in-grid episode-shown[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<font class="ep inline">([^<]+)<\/font>[\s\S]*?<\/div>/g;
        let episodeMatch;
        
        while ((episodeMatch = episodeRegex.exec(html)) !== null) {
            const episodeUrl = episodeMatch[1];
            const episodeNumber = episodeMatch[2].trim();
            
            if (!episodeUrl) continue;
            
            episodes.push({
                href: episodeUrl.startsWith('http') ? episodeUrl : OPPAI_CONFIG.baseUrl + episodeUrl.replace(/^\//, ''),
                number: episodeNumber
            });
        }
        
        // Sort episodes by episode number
        episodes.sort((a, b) => {
            const aNum = parseInt(a.number) || 1;
            const bNum = parseInt(b.number) || 1;
            return aNum - bNum;
        });
        
        return JSON.stringify(episodes);
        
    } catch (error) {
        console.error('Oppai Stream episodes extraction error:', error);
        return JSON.stringify([]);
    }
}

/**
 * Extract stream URL and quality options from video page
 * @param {string} url - Video page URL
 * @returns {string} JSON string with stream and subtitles (softsub mode)
 */
async function extractStreamUrl(url) {
    try {
        const headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': OPPAI_CONFIG.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        
        const response = await fetchv2(url, headers);
        const html = await response.text();
        
        // Extract video sources using regex
        const videoRegex = /<video[^>]*id="episode"[^>]*>[\s\S]*?<\/video>/;
        const videoMatch = html.match(videoRegex);
        if (!videoMatch) {
            throw new Error('No video element found');
        }
        
        const videoHtml = videoMatch[0];
        const sources = [];
        const subtitles = [];
        
        // Get direct video sources
        const sourceRegex = /<source[^>]*src="([^"]+)"[^>]*type="([^"]+)"[^>]*>/g;
        let sourceMatch;
        
        while ((sourceMatch = sourceRegex.exec(videoHtml)) !== null) {
            const src = sourceMatch[1];
            const type = sourceMatch[2];
            
            if (src && type === 'video/mp4') {
                // Determine quality from URL pattern
                let quality = '720p'; // default
                if (src.includes('/1080/')) {
                    quality = '1080p';
                } else if (src.includes('/4k/')) {
                    quality = '4k';
                } else if (src.includes('/720/')) {
                    quality = '720p';
                }
                
                sources.push({
                    url: src,
                    quality: quality,
                    type: 'mp4'
                });
            }
        }
        
        // Extract quality options from JavaScript if available
        const scriptMatch = html.match(/var availableres = ({.*?});/);
        if (scriptMatch) {
            try {
                const availableRes = JSON.parse(scriptMatch[1]);
                const availableTypes = {};
                
                const typesMatch = html.match(/var availabletypes = ({.*?});/);
                if (typesMatch) {
                    Object.assign(availableTypes, JSON.parse(typesMatch[1]));
                }
                
                // Add quality options from JavaScript
                for (const [quality, url] of Object.entries(availableRes)) {
                    const type = availableTypes[quality] || 'mp4';
                    const qualityLabel = quality === '4k' ? '4k' : quality + 'p';
                    
                    // Avoid duplicates
                    if (!sources.find(s => s.quality === qualityLabel)) {
                        sources.push({
                            url: url,
                            quality: qualityLabel,
                            type: type
                        });
                    }
                }
            } catch (parseError) {
                console.error('Error parsing quality options:', parseError);
            }
        }
        
        // Extract subtitles using regex
        const trackRegex = /<track[^>]*src="([^"]+)"[^>]*kind="([^"]+)"[^>]*(?:srclang="([^"]*)")?[^>]*(?:label="([^"]*)")?[^>]*>/g;
        let trackMatch;
        
        while ((trackMatch = trackRegex.exec(videoHtml)) !== null) {
            const src = trackMatch[1];
            const kind = trackMatch[2];
            const srclang = trackMatch[3] || 'en';
            const label = trackMatch[4] || 'English';
            
            if (src && kind === 'subtitles') {
                subtitles.push({
                    url: src,
                    language: srclang,
                    label: label,
                    format: 'vtt'
                });
            }
        }
        
        // Sort sources by quality preference
        const qualityOrder = { '4k': 4, '1080p': 3, '720p': 2, '480p': 1, '360p': 0 };
        sources.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
        
        // Set default quality based on config
        let defaultSource = sources.find(s => s.quality === OPPAI_CONFIG.defaultQuality);
        if (!defaultSource && sources.length > 0) {
            defaultSource = sources[0]; // Use highest quality as fallback
        }
        
        return JSON.stringify({
            stream: defaultSource ? defaultSource.url : null,
            subtitles: subtitles.length > 0 ? subtitles[0].url : null
        });
        
    } catch (error) {
        console.error('Oppai Stream URL extraction error:', error);
        return JSON.stringify({
            stream: null,
            subtitles: null
        });
    }
}

// Export functions for Sora
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        searchResults,
        extractDetails, 
        extractEpisodes,
        extractStreamUrl,
        config: OPPAI_CONFIG
    };
} 
