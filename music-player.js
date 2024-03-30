class MusicPlayer {
    constructor() {
        this.volumeLevel = 1;
        this.isRandom = false;
        this.VOLUME_CONTROL_STEPS = 255;
        this.VOLUME_PERSISTENCE_KEY = "volume";
        this.initialize();
    }
    static formatTime(duration) {
        if (isNaN(duration)) {
            return null;
        }
        //base on https://stackoverflow.com/a/40350003
        const hour = Math.floor(duration / 3600);
        const minute = Math.floor((duration % 3600) / 60);
        const second = Math.floor(duration % 60);
        return [
            hour,
            minute > 9 ? minute : (hour ? '0' + minute : minute || '0'),
            second > 9 ? second : '0' + second
        ].filter(Boolean).join(':');
    }
    static trackSorter(a, b) {
        if (!!a.album && !!b.album) {
            return a.album < b.album ? -1 : a.album > b.album ? 1 : a.albumIndex - b.albumIndex;
        }
        else if (!!a.album) {
            return 1;
        }
        else if (!!b.album) {
            return -1;
        }
        else {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        }
    }
    loadTrackList(onLoadedCallback) {
        console.info('Loading track list');
        fetch('index.json', { cache: 'no-store' })
            .then(response => response.json())
            .then(data => {
            this.trackList = data;
        }).then(() => onLoadedCallback(this))
            .catch(err => {
            console.error(err);
            alert('error: ' + err);
            this.loadTrackList(onLoadedCallback);
        });
    }
    displayTrackList(filter = '') {
        this.trackListDisplay.innerHTML = '';
        let newContent = '';
        //find exact match first, then append word match.
        let result = this.trackList.filter(t => t.name.toLowerCase()
            .includes(filter.trim()
            .toLowerCase()))
            .sort(MusicPlayer.trackSorter);
        result.concat(this.trackList.filter(t => filter.trim()
            .toLowerCase()
            .split(' ')
            .every(kw => {
            var _a, _b;
            return ((_a = t.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(kw)) || ((_b = t.album) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(kw));
        }) && !!!result.find(rt => rt.index === t.index))
            .sort(MusicPlayer.trackSorter)).forEach((track) => {
            newContent += `<div class="track-list-item" onclick="musicPlayer.setTrack(${track.index})"><span class="album-name">${track.album ?
                track.album + ' / ' :
                ''}</span> ${track.name}</div>`;
        });
        this.trackListDisplay.innerHTML = newContent;
    }
    setTrack(index) {
        let track = this.trackList.find(t => t.index === index);
        if (!!track) {
            //unset the current track first
            if (this.currentTrack && !this.currentTrack.paused) {
                console.info('Current track not stooped, stopping');
                this.currentTrack.pause();
            }
            this.loadTrack(track.src, () => {
                this.playTrack();
                this.trackNameDisplay.innerText = track.name;
                this.timeRemainDisplay.innerText = MusicPlayer.formatTime(this.currentTrack.duration);
                this.currentTrack.oncanplay = undefined; //unset the event
                if ('mediaSession' in navigator) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: track.name,
                        artist: track.artist,
                        album: track.album
                    });
                    navigator.mediaSession.setActionHandler('play', () => {
                        this.playTrack();
                    });
                    navigator.mediaSession.setActionHandler('pause', () => {
                        this.pauseTrack();
                    });
                    navigator.mediaSession.setActionHandler('stop', () => {
                        this.stopTrack();
                    });
                }
            });
        }
        else {
            console.warn(`Track ${index} not found in track list`);
        }
    }
    loadTrack(path, onLoad) {
        console.info('Loading track: ', path);
        this.currentTrack.src = path;
        this.currentTrack.oncanplay = onLoad;
        this.currentTrack.load();
    }
    playTrack() {
        if (this.currentTrack) {
            this.currentTrack.volume = this.volumeLevel;
            this.currentTrack.play().then(() => {
                console.log('Begin playing selected track');
                if (navigator.mediaSession) {
                    navigator.mediaSession.playbackState = 'playing';
                }
            }).catch(e => {
                console.error('Cannot play selected track: ', e);
                alert('Error occurred while trying to play selected track');
            });
        }
        else {
            console.warn('Track not set, will not play');
        }
    }
    stopTrack() {
        if (this.currentTrack) {
            this.currentTrack.currentTime = 0;
            this.currentTrack.pause();
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = 'paused';
            }
            console.info('Stopped playback');
        }
    }
    pauseTrack() {
        if (this.currentTrack) {
            this.currentTrack.pause();
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = 'paused';
            }
            console.info('Paused playback');
        }
    }
    getCurrentTrackDuration() {
        var _a;
        if ((_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.duration) {
            return this.currentTrack.duration;
        }
        return null;
    }
    getCurrentTrackPlaybackTime() {
        var _a;
        if ((_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.duration) {
            return this.currentTrack.currentTime;
        }
        return null;
    }
    getCurrentTrackRemainingTime() {
        if (this.getCurrentTrackPlaybackTime() && this.getCurrentTrackDuration()) {
            return this.getCurrentTrackDuration() - this.getCurrentTrackPlaybackTime();
        }
        return null;
    }
    setVolume(value) {
        value = Math.max(0, Math.min(1, value)); //clamp value to valid range
        console.info(`Setting volume to ${value}x`);
        this.volumeLevel = value;
        if (this.currentTrack) {
            this.currentTrack.volume = this.volumeLevel;
        }
        localStorage.setItem(this.VOLUME_PERSISTENCE_KEY, value.toString());
    }
    changeVolumeByStep(increase) {
        let change = 100 / this.VOLUME_CONTROL_STEPS / 100;
        if (!increase) {
            change = 0 - change;
        }
        this.setVolume(this.volumeLevel + change);
        this.volumeControl.value = this.volumeLevel.toString();
    }
    toggleLooping() {
        this.currentTrack.loop = !this.currentTrack.loop;
        console.info("Looping enabled:", this.currentTrack.loop);
        this.updateLoopingDisplay();
    }
    updateLoopingDisplay() {
        var _a;
        if ((_a = this.currentTrack) === null || _a === void 0 ? void 0 : _a.loop) {
            this.loopButton.style.opacity = "1";
        }
        else {
            this.loopButton.style.opacity = "0.4";
        }
    }
    toggleRandom() {
        this.isRandom = !this.isRandom;
        this.updateRandomDisplay();
    }
    updateRandomDisplay() {
        if (this.isRandom) {
            this.randomButton.style.opacity = "1";
        }
        else {
            this.randomButton.style.opacity = "0.4";
        }
    }
    randomSetTrack() {
        this.setTrack(this.trackList[Math.floor(Math.random() * this.trackList.length)].index);
    }
    initialize() {
        //get all HTML elements
        this.playButton = document.querySelector('#music-play-button');
        this.pauseButton = document.querySelector('#music-pause-button');
        this.stopButton = document.querySelector('#music-stop-button');
        this.loopButton = document.querySelector('#music-loop-button');
        this.randomButton = document.querySelector('#music-random-button');
        this.trackNameDisplay = document.querySelector('#player-name');
        this.timeRemainDisplay = document.querySelector('#player-remaining-time');
        this.trackListDisplay = document.querySelector('#track-list');
        this.volumeControl = document.querySelector('#volume-control');
        this.trackSearchInput = document.querySelector('#track-search-input');
        //setup playback control
        this.playButton.addEventListener('click', () => this.playTrack());
        this.stopButton.addEventListener('click', () => this.stopTrack());
        this.pauseButton.addEventListener('click', () => this.pauseTrack());
        this.loopButton.addEventListener('click', () => this.toggleLooping());
        this.randomButton.addEventListener('click', () => this.toggleRandom());
        //setup volume setting
        this.volumeControl.step = (100 / this.VOLUME_CONTROL_STEPS / 100).toString();
        const initialVolume = Number(localStorage.getItem(this.VOLUME_PERSISTENCE_KEY)) || Number(this.volumeControl.value);
        this.setVolume(initialVolume); //initialize from stored value
        this.volumeControl.value = this.volumeControl.toString();
        this.volumeControl.addEventListener('input', (e) => this.setVolume(Number(this.volumeControl.value)));
        this.volumeControl.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.changeVolumeByStep(e.deltaY < 0);
        });
        //setup searching
        this.trackSearchInput.addEventListener('input', (e) => this.displayTrackList(this.trackSearchInput.value));
        //setup media
        this.currentTrack = new Audio();
        this.currentTrack.onerror = () => {
            console.error('Cannot play selected track: ', this.currentTrack.error);
            if (this.isRandom) {
                console.warn("Selected track cannot be played, moving on to next track");
                this.randomSetTrack();
            }
            else {
                alert('Error occurred while trying to play selected track');
            }
        };
        this.currentTrack.ontimeupdate = () => {
            var _a;
            this.timeRemainDisplay.innerText = (_a = MusicPlayer.formatTime(this.getCurrentTrackRemainingTime())) !== null && _a !== void 0 ? _a : '';
        };
        this.currentTrack.onended = () => {
            if (this.currentTrack.loop) {
                console.info("Looping enabled, restarting playback");
            }
            else if (this.isRandom) {
                // Only move to next track if loop is not enabled
                console.info("Random enabled, picking next track");
                this.randomSetTrack();
            }
        };
        //initialise display
        this.updateLoopingDisplay();
        this.updateRandomDisplay();
    }
}
let musicPlayer;
window.addEventListener('load', () => {
    musicPlayer = new MusicPlayer();
    musicPlayer.loadTrackList((player) => {
        player.displayTrackList();
    });
});
