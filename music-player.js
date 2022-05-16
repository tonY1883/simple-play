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
	volumeControl;

	volumeLevel = 1;

	constructor() {
		this.initialize();
	}

	loadTrackList(callBack) {
		console.info('Loading track list');
		fetch('index.json', {cache: "no-store"})
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
		this.trackList.filter(t => t.name?.includes(filter) || t.album?.includes(filter))
			.forEach((track) => {
				newContent += `<div class="track-list-item" onclick="musicPlayer.setTrack(${track.index})"><span class="album-name">${track.album} /</span> ${track.name}</div>`;
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
			this.trackNameDisplay.innerText = track.name;
			this.loadTrack(track.src, () => {
				this.playTrack();
				this.currentTrack.oncanplay = undefined;//unset the event
			});
		} else {
			console.warn(`Track ${index} not found in track list`);
		}
	}

	loadTrack(path, onLoad) {
		console.info('Loading track: ', path);
		this.currentTrack = new Audio(path);
		this.currentTrack.oncanplay = onLoad;
		this.currentTrack.load();
	}

	playTrack() {
		if (this.currentTrack) {
			this.currentTrack.volume = this.volumeLevel;
			this.currentTrack.play().then(() => {
				}
			).catch(e => {
				console.error('Cannot play selected track: ', e);
				alert('Unable to play selected track');
			});

		} else {
			console.warn('Track not set, will not play');
		}
	}

	stopTrack() {
		if (this.currentTrack) {
			this.currentTrack.currentTime = 0;
			this.currentTrack.pause();
			console.info('Stopped playback');
		}
	}

	pauseTrack() {
		if (this.currentTrack) {
			this.currentTrack.pause();
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
