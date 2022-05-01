class MusicPlayer {
	currentTrack;
	trackList;

	//basic ui pane
	trackListDisplay;

	//control elements
	playButton;
	pauseButton;
	stopButton;
	trackNameDisplay;

	constructor() {
		this.initialize();
	}

	loadTrackList(callBack) {
		fetch('index.json')
		.then(response => response.json())
		.then(data => {
			this.trackList = data;
		}).then(() => callBack(this))
		.catch(err => {
			console.error(err);
			alert('error: ' + err);
		});
	}

	displayTrackList(filter) {
		this.trackListDisplay.innerHTML = '';
		this.trackList.forEach((track) => {
			this.trackListDisplay.innerHTML += `<div class="track-list-item" onclick="musicPlayer.setTrack(${track.index})"><span class="album-name">${track.album} /</span> ${track.name}</div>`;
		});
	}

	setTrack(index) {
		let track = this.trackList.find(t => t.index === index);
		if (!!track) {
			this.trackNameDisplay.innerText = track.name;
			this.loadTrack(track.src);
		} else {
			console.warn(`Track ${index} not in track list`);
		}
	}

	loadTrack(path) {
		this.currentTrack = new Audio(path);
		console.info('Loading track: ', path);

	}

	playTrack() {
		if (this.currentTrack) {
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
			this.currentTrack.pause();
			this.currentTrack.currentTime = 0;
		}
	}

	pauseTrack() {
		if (this.currentTrack) {
			this.currentTrack.pause();
		}
	}

	initialize() {
		this.playButton = document.querySelector('#music-play-button');
		this.pauseButton = document.querySelector('#music-pause-button');
		this.stopButton = document.querySelector('#music-stop-button');
		this.trackNameDisplay = document.querySelector('#player-name');
		this.playButton.addEventListener('click', () => this.playTrack());
		this.stopButton.addEventListener('click', () => this.stopTrack());
		this.pauseButton.addEventListener('click', () => this.pauseTrack());
		this.trackListDisplay = document.querySelector('#track-list');
	}
}


let musicPlayer;
window.addEventListener('load', () => {
	musicPlayer = new MusicPlayer();
	musicPlayer.loadTrackList((player) => {
		player.displayTrackList();
	});
});
