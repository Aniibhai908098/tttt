class TwitchAPI {
    constructor() {
        this.CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
        this.GQL_ENDPOINT = 'https://gql.twitch.tv/gql';
        this.CLIP_QUERY_HASH = '36b89d2507fce29e5ca551df756d27c1cfe079e2609642b4390aa4c35796eb11';
    }

    async getClipInfo(clipUrl) {
        const clipId = this.extractClipId(clipUrl);
        if (!clipId) {
            throw new Error('Invalid Twitch clip URL');
        }

        const query = {
            operationName: 'VideoAccessToken_Clip',
            variables: { 
                slug: clipId 
            },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: this.CLIP_QUERY_HASH
                }
            }
        };

        try {
            const response = await fetch(this.GQL_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Client-Id': this.CLIENT_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(query)
            });

            if (!response.ok) {
                throw new Error('Failed to fetch clip information');
            }

            const data = await response.json();
            return this.processClipData(data);

        } catch (error) {
            console.error('API Error:', error);
            throw new Error('Failed to fetch clip information. Please try again.');
        }
    }

    extractClipId(url) {
        const patterns = [
            /clips\.twitch\.tv\/(\w+)/,
            /twitch\.tv\/\w+\/clip\/(\w+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    processClipData(data) {
        if (!data.data?.clip) {
            throw new Error('Clip not found or no longer available');
        }

        const clip = data.data.clip;
        return {
            title: clip.title,
            broadcaster: clip.broadcaster.displayName,
            quality: clip.videoQualities[0],
            playbackUrl: this.generateDownloadUrl(clip.playbackAccessToken, clip.videoQualities[0].sourceURL)
        };
    }

    generateDownloadUrl(token, sourceUrl) {
        return `${sourceUrl}?sig=${token.signature}&token=${encodeURIComponent(token.value)}`;
    }
}

class TwitchDownloader {
    constructor() {
        this.api = new TwitchAPI();
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.urlInput = document.getElementById('clipUrl');
        this.submitBtn = document.getElementById('submitBtn');
        this.statusMsg = document.getElementById('statusMsg');
        this.clipInfoSection = document.getElementById('clipInfoSection');
    }

    attachEventListeners() {
        this.submitBtn.addEventListener('click', () => this.handleDownload());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleDownload();
        });
    }

    async handleDownload() {
        const url = this.urlInput.value.trim();
        if (!url) {
            this.showStatus('Please enter a Twitch clip URL', 'error');
            return;
        }

        try {
            this.setLoading(true);
            const clipInfo = await this.api.getClipInfo(url);
            this.downloadClip(clipInfo);
        } catch (error) {
            this.showStatus(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    downloadClip(clipInfo) {
        const link = document.createElement('a');
        link.href = clipInfo.playbackUrl;
        link.download = `${clipInfo.title}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showStatus('Download started!', 'success');
    }

    setLoading(isLoading) {
        this.submitBtn.disabled = isLoading;
        this.submitBtn.textContent = isLoading ? 'Loading...' : 'Download';
    }

    showStatus(message, type) {
        this.statusMsg.textContent = message;
        this.statusMsg.className = `status-message ${type}`;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TwitchDownloader();
});
