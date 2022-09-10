class MusicPlayer {
	currentTrack;
	trackList;

	trackSearchInput;

	//basic ui pane
	trackListDisplay;

	//control elements
	playButton;
	pauseButton;
	stopButton;
	trackNameDisplay;
	timeRemainDisplay;
	volumeControl;

	volumeLevel = 1;

	constructor() {
		this.initialize();
	}

	static formatTime(duration) {
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

	loadTrackList(callBack) {
		console.info('Loading track list');
		fetch('index.json', { cache: 'no-store' })
			.then(response => response.json())
			.then(data => {
				this.trackList = data;
			}).then(() => callBack(this))
			.catch(err => {
				console.error(err);
				alert('error: ' + err);
			});
	}

	displayTrackList(filter = '') {
		this.trackListDisplay.innerHTML = '';
		let newContent = '';
		this.trackList.filter(t => filter.trim()
			.toLowerCase()
			.split(' ')
			.every(kw => t.name?.toLowerCase()
				.includes(kw) || t.album?.toLowerCase()
					.includes(kw)))
			.forEach((track) => {
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
				this.currentTrack.oncanplay = undefined;//unset the event
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
		} else {
			console.warn(`Track ${index} not found in track list`);
		}
	}

	loadTrack(path, onLoad) {
		console.info('Loading track: ', path);
		this.currentTrack = new Audio(path);
		this.currentTrack.oncanplay = onLoad;
		this.currentTrack.onerror = () => {
			console.error('Cannot play selected track: ', this.currentTrack.error);
			alert('Error occurred while trying to play selected track');
		};
		this.currentTrack.ontimeupdate = () => {
			this.timeRemainDisplay.innerText = MusicPlayer.formatTime(this.currentTrack.duration - this.currentTrack.currentTime);
		};
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
			}
			).catch(e => {
				console.error('Cannot play selected track: ', e);
				alert('Error occurred while trying to play selected track');
			});

		} else {
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

	setVolume(value) {
		console.info(`Setting volume to ${value}x`);
		this.volumeLevel = Number(value);
		if (this.currentTrack) {
			this.currentTrack.volume = this.volumeLevel;
		}
	}

	initialize() {
		this.playButton = document.querySelector('#music-play-button');
		this.pauseButton = document.querySelector('#music-pause-button');
		this.stopButton = document.querySelector('#music-stop-button');
		this.trackNameDisplay = document.querySelector('#player-name');
		this.timeRemainDisplay = document.querySelector('#player-remaining-time');
		this.playButton.addEventListener('click', (e) => this.playTrack());
		this.stopButton.addEventListener('click', (e) => this.stopTrack());
		this.pauseButton.addEventListener('click', (e) => this.pauseTrack());
		this.trackListDisplay = document.querySelector('#track-list');
		this.volumeControl = document.querySelector('#volume-control');
		this.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
		this.trackSearchInput = document.querySelector('#track-search-input');
		this.trackSearchInput.addEventListener(
			'input',
			(e) => this.displayTrackList(e.target.value)
		);
	}
}


let musicPlayer;
window.addEventListener('load', () => {
	musicPlayer = new MusicPlayer();
	musicPlayer.loadTrackList((player) => {
		player.displayTrackList();
	});
});
