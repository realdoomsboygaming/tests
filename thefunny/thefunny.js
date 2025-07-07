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
 * @param {string} query - Search query
 * @returns {Array} Array of search results
 */
function searchResults(query) {
    // Use the actual AJAX search endpoint
    const searchUrl = `${OPPAI_CONFIG.baseUrl}actions/search.php?text=${encodeURIComponent(query)}&order=recent&page=1&limit=35&genres=&blacklist=&studio=&ibt=0&swa=1`;
    
    try {
        const response = Http.get(searchUrl);
        const results = [];
        
        // Debug logging
        console.log('Oppai Stream search URL:', searchUrl);
        console.log('Response received, looking for episodes...');
        
        // The API response contains HTML fragments with episode cards
        const episodeElements = response.selectAll('.in-grid.episode-shown');
        
        console.log('Found episode elements:', episodeElements.length);
        
        for (const element of episodeElements) {
            const linkElement = element.selectFirst('a');
            if (!linkElement) {
                console.log('No link element found in episode');
                continue;
            }
            
            const url = linkElement.attr('href');
            const imgElement = element.selectFirst('.cover-img-in');
            
            // Correct title structure: <h5 class="title-ep"><font class="title inline">Title</font> <font class="ep inline">Episode</font></h5>
            const titleElement = element.selectFirst('.title-ep .title.inline');
            const episodeElement = element.selectFirst('.title-ep .ep.inline');
            
            if (!titleElement || !url) {
                console.log('Missing title or URL for episode');
                continue;
            }
            
            // Extract data from element attributes  
            const episodeNum = element.attr('ep');
            const tags = element.attr('tags');
            const description = element.attr('desc');
            const showName = element.attr('name');
            
            const title = titleElement.text().trim();
            const episode = episodeElement ? episodeElement.text().trim() : episodeNum;
            const fullUrl = url.startsWith('http') ? url : OPPAI_CONFIG.baseUrl + url.replace(/^\//, '');
            
            console.log('Found episode:', title, 'Ep', episode);
            
            results.push({
                title: title,
                episode: episode,
                url: fullUrl,
                image: imgElement ? imgElement.attr('src') : null,
                description: description || '',
                tags: tags ? tags.split(',') : [],
                year: null // Not available in search results
            });
        }
        
        console.log('Total search results found:', results.length);
        return results;
        
    } catch (error) {
        console.error('Oppai Stream search error:', error);
        console.error('Error details:', error.message);
        return [];
    }
}

/**
 * Extract show details from detail page
 * @param {string} url - Detail page URL
 * @returns {Object} Show details object
 */
function extractDetails(url) {
    try {
        const response = Http.get(url);
        
        // Extract title from h1 or title tag
        let titleElement = response.selectFirst('.episode-info h1');
        if (!titleElement) {
            titleElement = response.selectFirst('title');
        }
        
        const title = titleElement ? titleElement.text().replace(/Watch\s+|EP\s+\d+|\s+in\s+HD.*$/gi, '').trim() : 'Unknown';
        
        // Extract description
        const descElement = response.selectFirst('.episode-info .description h5');
        const description = descElement ? descElement.text().trim() : '';
        
        // Extract image from video poster or cover
        let image = null;
        const posterElement = response.selectFirst('video#episode');
        if (posterElement) {
            image = posterElement.attr('poster');
        }
        if (!image) {
            const imgElement = response.selectFirst('.cover-img-in');
            if (imgElement) {
                image = imgElement.attr('src');
            }
        }
        
        // Extract tags/genres
        const tagElements = response.selectAll('.tags .tag h5');
        const genres = [];
        for (const tag of tagElements) {
            genres.push(tag.text().trim());
        }
        
        // Extract year from meta tags or content (if available)
        let year = null;
        const yearMatch = response.text().match(/(\d{4})/);
        if (yearMatch) {
            year = parseInt(yearMatch[1]);
        }
        
        return {
            title: title,
            description: description,
            image: image,
            genres: genres,
            year: year,
            status: 'completed', // Assume completed for hentai content
            type: 'anime'
        };
        
    } catch (error) {
        console.error('Oppai Stream details extraction error:', error);
        return {
            title: 'Unknown',
            description: '',
            image: null,
            genres: [],
            year: null,
            status: 'unknown',
            type: 'anime'
        };
    }
}

/**
 * Extract episodes list from the show page
 * @param {string} url - Show detail page URL
 * @returns {Array} Array of episodes
 */
function extractEpisodes(url) {
    try {
        const response = Http.get(url);
        const episodes = [];
        
        // Episodes are in the sidebar under "More Episodes"
        const episodeElements = response.selectAll('.other-episodes .in-grid.episode-shown');
        
        for (const element of episodeElements) {
            const linkElement = element.selectFirst('a');
            if (!linkElement) continue;
            
            const episodeUrl = linkElement.attr('href');
            const imgElement = element.selectFirst('.cover-img-in');
            const titleElement = element.selectFirst('.title-ep .title.inline');
            const episodeElement = element.selectFirst('.title-ep .ep.inline');
            
            if (!titleElement || !episodeUrl) continue;
            
            const episodeNumber = episodeElement ? episodeElement.text().trim() : '1';
            
            episodes.push({
                title: titleElement.text().trim(),
                episode: episodeNumber,
                url: episodeUrl.startsWith('http') ? episodeUrl : OPPAI_CONFIG.baseUrl + episodeUrl.replace(/^\//, ''),
                image: imgElement ? imgElement.attr('src') : null
            });
        }
        
        // Sort episodes by episode number
        episodes.sort((a, b) => {
            const aNum = parseInt(a.episode) || 1;
            const bNum = parseInt(b.episode) || 1;
            return aNum - bNum;
        });
        
        return episodes;
        
    } catch (error) {
        console.error('Oppai Stream episodes extraction error:', error);
        return [];
    }
}

/**
 * Extract stream URL and quality options from video page
 * @param {string} url - Video page URL
 * @returns {Object} Stream information
 */
function extractStreamUrl(url) {
    try {
        const response = Http.get(url);
        
        // Extract video source from video element
        const videoElement = response.selectFirst('video#episode');
        if (!videoElement) {
            throw new Error('No video element found');
        }
        
        const sources = [];
        const subtitles = [];
        
        // Get direct video sources
        const sourceElements = videoElement.selectAll('source');
        for (const source of sourceElements) {
            const src = source.attr('src');
            const type = source.attr('type');
            
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
        const scriptMatch = response.text().match(/var availableres = ({.*?});/);
        if (scriptMatch) {
            try {
                const availableRes = JSON.parse(scriptMatch[1]);
                const availableTypes = {};
                
                const typesMatch = response.text().match(/var availabletypes = ({.*?});/);
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
        
        // Extract subtitles
        const trackElements = videoElement.selectAll('track');
        for (const track of trackElements) {
            const src = track.attr('src');
            const label = track.attr('label');
            const srclang = track.attr('srclang');
            const kind = track.attr('kind');
            
            if (src && kind === 'subtitles') {
                subtitles.push({
                    url: src,
                    language: srclang || 'en',
                    label: label || 'English',
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
        
        return {
            streamUrl: defaultSource ? defaultSource.url : null,
            qualities: sources,
            subtitles: subtitles,
            headers: {
                'Referer': OPPAI_CONFIG.baseUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        
    } catch (error) {
        console.error('Oppai Stream URL extraction error:', error);
        return {
            streamUrl: null,
            qualities: [],
            subtitles: [],
            headers: {}
        };
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
