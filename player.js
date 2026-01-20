// Video Player Configuration
class AnimePlayer {
    constructor() {
        this.player = null;
        this.currentEpisode = 1;
        this.currentSource = '';
        this.quality = 'auto';
        this.subtitleEnabled = true;
        this.isFullscreen = false;
        this.playbackRate = 1.0;
        
        this.initPlayer();
        this.loadEpisode(1);
    }
    
    initPlayer() {
        // Initialize Video.js player
        this.player = videojs('animePlayer', {
            controls: true,
            autoplay: false,
            preload: 'auto',
            fluid: true,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            controlBar: {
                children: [
                    'playToggle',
                    'volumePanel',
                    'currentTimeDisplay',
                    'timeDivider',
                    'durationDisplay',
                    'progressControl',
                    'remainingTimeDisplay',
                    'playbackRateMenuButton',
                    'chaptersButton',
                    'descriptionsButton',
                    'subsCapsButton',
                    'audioTrackButton',
                    'fullscreenToggle'
                ]
            }
        });
        
        // Enable HLS support
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.attachMedia(this.player.tech().el());
            window.hls = hls;
        }
        
        // Add event listeners
        this.player.on('error', this.handleError.bind(this));
        this.player.on('fullscreenchange', this.handleFullscreen.bind(this));
        
        // Load saved preferences
        this.loadPreferences();
    }
    
    async loadEpisode(episodeNumber) {
        this.currentEpisode = episodeNumber;
        
        try {
            // Update UI
            document.getElementById('animeTitle').textContent = `Episode ${episodeNumber}`;
            
            // Load episode data
            const episodeData = await this.getEpisodeData(episodeNumber);
            
            // Set video source based on quality preference
            const sourceUrl = this.getSourceUrl(episodeData.sources);
            
            this.player.src({
                src: sourceUrl,
                type: 'application/x-mpegURL'
            });
            
            // Load subtitles if available
            if (episodeData.subtitles && this.subtitleEnabled) {
                this.loadSubtitles(episodeData.subtitles);
            }
            
            // Save watching progress
            this.saveWatchingProgress();
            
        } catch (error) {
            console.error('Error loading episode:', error);
            this.showError('Gagal memuat episode. Silakan coba server lain.');
        }
    }
    
    getEpisodeData(episodeNumber) {
        // This would typically come from an API
        // For demo, we'll use sample data
        return {
            episode: episodeNumber,
            title: `Episode ${episodeNumber}`,
            duration: '23:45',
            sources: [
                'https://bitdash-a.akamaihd.net/s/content/media/Manifest.m3u8',
                'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                'https://content.jwplatform.com/manifests/vM7nH0Kl.m3u8'
            ],
            subtitles: 'https://pastebin.com/raw/sample.srt'
        };
    }
    
    getSourceUrl(sources) {
        // Select source based on quality preference
        switch(this.quality) {
            case '1080p':
                return sources[0]; // HD source
            case '720p':
                return sources[1]; // SD source
            case 'auto':
            default:
                return sources[2]; // Auto quality
        }
    }
    
    loadSubtitles(subtitleUrl) {
        this.player.addRemoteTextTrack({
            kind: 'subtitles',
            src: subtitleUrl,
            srclang: 'id',
            label: 'Indonesian',
            default: true
        }, true);
    }
    
    toggleSubtitle() {
        this.subtitleEnabled = !this.subtitleEnabled;
        const tracks = this.player.remoteTextTracks();
        
        for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = this.subtitleEnabled ? 'showing' : 'disabled';
        }
        
        // Save preference
        localStorage.setItem('subtitleEnabled', this.subtitleEnabled);
    }
    
    changeQuality(quality) {
        this.quality = quality;
        this.loadEpisode(this.currentEpisode);
        localStorage.setItem('videoQuality', quality);
    }
    
    skipForward(seconds = 10) {
        this.player.currentTime(this.player.currentTime() + seconds);
    }
    
    skipBackward(seconds = 10) {
        this.player.currentTime(this.player.currentTime() - seconds);
    }
    
    togglePlay() {
        if (this.player.paused()) {
            this.player.play();
        } else {
            this.player.pause();
        }
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            if (this.player.requestFullscreen) {
                this.player.requestFullscreen();
            } else if (this.player.webkitRequestFullscreen) {
                this.player.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    handleFullscreen() {
        this.isFullscreen = !this.isFullscreen;
    }
    
    setVolume(volume) {
        this.player.volume(volume / 100);
        localStorage.setItem('playerVolume', volume);
    }
    
    setPlaybackRate(rate) {
        this.playbackRate = rate;
        this.player.playbackRate(rate);
        localStorage.setItem('playbackRate', rate);
    }
    
    saveWatchingProgress() {
        const progress = {
            animeId: this.getCurrentAnimeId(),
            episode: this.currentEpisode,
            time: this.player.currentTime(),
            duration: this.player.duration(),
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem('watchingProgress', JSON.stringify(progress));
    }
    
    loadWatchingProgress() {
        const saved = localStorage.getItem('watchingProgress');
        if (saved) {
            const progress = JSON.parse(saved);
            if (progress.animeId === this.getCurrentAnimeId() && 
                progress.episode === this.currentEpisode) {
                this.player.currentTime(progress.time);
            }
        }
    }
    
    loadPreferences() {
        // Load saved preferences
        this.subtitleEnabled = localStorage.getItem('subtitleEnabled') !== 'false';
        this.quality = localStorage.getItem('videoQuality') || 'auto';
        this.playbackRate = parseFloat(localStorage.getItem('playbackRate')) || 1.0;
        const savedVolume = localStorage.getItem('playerVolume');
        if (savedVolume) {
            this.player.volume(savedVolume / 100);
        }
    }
    
    handleError(error) {
        console.error('Video error:', error);
        
        // Try alternative source
        if (error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
            this.changeQuality('720p'); // Fallback to lower quality
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        errorDiv.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4757;
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        document.querySelector('.video-wrapper').appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    getCurrentAnimeId() {
        // Extract anime ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || 'default';
    }
}

// Initialize player when page loads
let animePlayer;

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('animePlayer')) {
        animePlayer = new AnimePlayer();
    }
});

// Global functions for HTML buttons
function togglePlay() {
    if (animePlayer) animePlayer.togglePlay();
}

function skipForward() {
    if (animePlayer) animePlayer.skipForward();
}

function skipBackward() {
    if (animePlayer) animePlayer.skipBackward();
}

function toggleSubtitle() {
    if (animePlayer) animePlayer.toggleSubtitle();
}

function toggleQuality() {
    document.getElementById('sourceModal').style.display = 'flex';
}

function toggleFullscreen() {
    if (animePlayer) animePlayer.toggleFullscreen();
}

function applySource() {
    const selected = document.querySelector('.source-item.active');
    const source = selected.dataset.source;
    
    if (animePlayer && source) {
        animePlayer.player.src(source);
        document.getElementById('sourceModal').style.display = 'none';
    }
}

// Source selection
document.querySelectorAll('.source-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.source-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Episode selection
function loadEpisode(episodeNum) {
    if (animePlayer) {
        animePlayer.loadEpisode(episodeNum);
        
        // Update active episode in list
        document.querySelectorAll('.episode-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.episode) === episodeNum) {
                item.classList.add('active');
            }
        });
    }
}

// Volume control
document.getElementById('volumeSlider')?.addEventListener('input', function(e) {
    if (animePlayer) animePlayer.setVolume(e.target.value);
});