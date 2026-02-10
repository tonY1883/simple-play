"use strict";
var _a;
function base64ToBlob(base64) {
    //todo replace with Uint8Array.fromBase64()
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray]);
}
class MusicPlayer {
    #dBHelper;
    #currentTrack;
    #trackList;
    #trackSearchInput;
    //basic ui pane
    #trackListDisplay;
    #trackListItemAdapter;
    //control elements
    #playButton;
    #pauseButton;
    #stopButton;
    #trackNameDisplay;
    #timeLapsedDisplay;
    #timeRemainDisplay;
    #loopButton;
    #randomButton;
    #volumeControl;
    #volumeLevel = 1;
    #isRandom = false;
    #volumeControlSteps = 255;
    static VOLUME_PERSISTENCE_KEY = "volume";
    #trackAlbumDisplay;
    #albumPlaceholder = "Unknown Album";
    #trackAlbumArtDisplay;
    #albumArtPlaceholder;
    #trackArtistDisplay;
    #artistPlaceholder = "Unknown Artist";
    #trackProgressDisplay;
    #trackSeekbar;
    #seeking = false;
    #albumArts;
    //web audio stuff
    #audioContext;
    #source;
    #volumeAdjustor;
    #lineOutNode;
    //trigger hooks
    /** Callback triggers after the track list is loaded from server */
    ontracksloaded;
    /** Callback triggers after the individual track is selected */
    ontrackset;
    /** Callback triggers on track play/resume */
    onplay;
    /** Callback triggers when current track is completed */
    onplayend;
    /** Callback triggers on track stop */
    onstop;
    /** Callback triggers on track pause */
    onpause;
    constructor() {
        //setup media
        this.#dBHelper = new MusicDBHelper("music_index");
        this.#currentTrack = new Audio();
        this.#audioContext = new AudioContext();
        const hook = () => this.#audioContext.resume();
        ["click", "keydown", "touchstart"].forEach((evt) => {
            window.addEventListener(evt, hook, { once: true });
        });
        this.#source = this.#audioContext.createMediaElementSource(this.#currentTrack);
        this.#lineOutNode = this.#audioContext.createMediaStreamDestination();
        this.#source.connect(this.#lineOutNode);
        this.#currentTrack.onerror = () => {
            console.error("Cannot play selected track: ", this.#currentTrack.error);
            if (this.#isRandom) {
                console.warn("Selected track cannot be played, moving on to next track");
                this.#randomSetTrack();
            }
            else {
                alert("Error occurred while trying to play selected track");
            }
        };
        this.#currentTrack.ontimeupdate = () => {
            if (!!this.#timeLapsedDisplay) {
                this.#timeLapsedDisplay.innerText = _a.formatTime(this.currentTrackElapsedTime);
            }
            if (!!this.#timeRemainDisplay) {
                this.#timeRemainDisplay.innerText = _a.formatTime(this.currentTrackRemainingTime) ?? "";
            }
            if (!!this.#trackProgressDisplay) {
                this.#trackProgressDisplay.value = this.currentTrackElapsedTime;
            }
            if (!!this.#trackSeekbar && !this.#seeking) {
                this.#trackSeekbar.value = this.currentTrackElapsedTime.toString();
            }
            if (!!this.onplayend && !this.#seeking && this.currentTrackRemainingTime === 0) {
                this.onplayend();
            }
        };
        this.#currentTrack.onended = () => {
            if (this.#currentTrack.loop) {
                console.info("Looping enabled, restarting playback");
            }
            else if (this.#isRandom) {
                // Only move to next track if loop is not enabled
                console.info("Random enabled, picking next track");
                this.#randomSetTrack();
            }
        };
        //setup volume setting
        //volume processing
        this.#volumeAdjustor = new GainNode(this.#audioContext);
        this.#source.connect(this.#volumeAdjustor).connect(this.#audioContext.destination);
        const initialVolume = Number(localStorage.getItem(_a.VOLUME_PERSISTENCE_KEY)) || 0.5; //initialize from stored value
        this.setVolume(initialVolume);
        this.#albumArts = new Map();
    }
    static formatTime(duration) {
        if (isNaN(duration)) {
            return null;
        }
        //base on https://stackoverflow.com/a/40350003
        const hour = Math.floor(duration / 3600);
        const minute = Math.floor((duration % 3600) / 60);
        const second = Math.floor(duration % 60);
        return [hour, minute > 9 ? minute : hour ? "0" + minute : minute || "0", second > 9 ? second : "0" + second]
            .filter(Boolean)
            .join(":");
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
    static colorToRGB(colorHex) {
        const r = parseInt(colorHex.substring(1, 3), 16);
        const g = parseInt(colorHex.substring(3, 5), 16);
        const b = parseInt(colorHex.substring(5), 16);
        return { r, g, b };
    }
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setPlayButton(ele) {
        this.#playButton = ele;
        this.#playButton?.addEventListener("click", () => this.play());
    }
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setPauseButton(ele) {
        this.#pauseButton = ele;
        this.#pauseButton?.addEventListener("click", () => this.pause());
    }
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setStopButton(ele) {
        this.#stopButton = ele;
        this.#stopButton?.addEventListener("click", () => this.stop());
    }
    /**
     * Configure the toogle for looping.
     *
     * @param ele a `HTMLInputElement`
     */
    setLoopButton(ele) {
        this.#loopButton = ele;
        this.#loopButton.addEventListener("click", () => this.toggleLooping());
        this.#updateLoopingDisplay();
    }
    /**
     * Configure the toogle for random track selection.
     *
     * @param ele a `HTMLInputElement`
     */
    setRandomButton(ele) {
        this.#randomButton = ele;
        this.#randomButton.addEventListener("click", () => this.toggleRandom());
        this.#updateRandomDisplay();
    }
    /**
     * Configure the track search input.
     * @param ele a `HTMLInputElement`
     */
    setSearchInput(ele) {
        this.#trackSearchInput = ele;
        this.#trackSearchInput?.addEventListener("input", (e) => this.#displayTrackList(this.#trackSearchInput.value));
    }
    /**
     * Configure the volume control ui element.
     * @param ele a `HTMLInputElement` with type `range`
     */
    setVolumeControl(ele) {
        if (ele.type !== "range") {
            console.warn(`Unexpected type for volume control input: expected 'range' but got ${ele.type}. Control may not function properly.`);
        }
        this.#volumeControl = ele;
        this.#volumeControl.step = (100 / this.#volumeControlSteps / 100).toString();
        this.#volumeControl.value = this.#volumeLevel.toString();
        this.#volumeControl.addEventListener("input", (e) => this.setVolume(Number(this.#volumeControl.value)));
        this.#volumeControl.addEventListener("wheel", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.changeVolumeByStep(e.deltaY < 0);
        });
    }
    /**
     * Configure the UI for displaying list of avilable tracks for user to select.
     * @param rootEle `HTMLElement` where the list would be displayed.
     * @param itemAdapter A callback function to transfrom individual track information into a track list item. The callback is supplied with an argument as follows:```{
    index: number;
    src: string;
    name: string;
    artist?: string;
    album?: string;
    albumIndex?: number;
    cover?: string;
}```.
     *  The function should return a `HTMLElement`, which would then be compiled into a list and displayed.
     */
    setTrackListItemDisplay(rootEle, itemAdapter) {
        this.#trackListDisplay = rootEle;
        this.#trackListItemAdapter = itemAdapter;
    }
    /**
     * Configure the UI for displaying current track name
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackNameDisplay(ele) {
        this.#trackNameDisplay = ele;
    }
    /**
     * Configure the UI for displaying current track elapsed time
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackTimeLapsedDisplay(ele) {
        this.#timeLapsedDisplay = ele;
    }
    /**
     * Configure the UI for displaying current track remaining time
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackTimeRemainDisplay(ele) {
        this.#timeRemainDisplay = ele;
    }
    /**
     * Configure the UI for displaying track album information
     * @param ele `HTMLElement` where the track album would be displayed.
     * @param placeholder A optional placeholder text that could be displayed when the track does not have album data.
     */
    setTrackAlbumDisplay(ele, placeholder) {
        this.#trackAlbumDisplay = ele;
        if (!!placeholder) {
            this.#albumPlaceholder = placeholder;
        }
    }
    /**
     * Configure the UI for displaying track artist information
     * @param ele `HTMLElement` where the track artist would be displayed.
     * @param placeholder A optional placeholder text that could be displayed when the track does not have artist data.
     */
    setTrackArtistDisplay(ele, placeholder) {
        this.#trackArtistDisplay = ele;
        if (!!placeholder) {
            this.#artistPlaceholder = placeholder;
        }
    }
    /**
     * Configure the UI for displaying album art
     * @param ele `HTMLElement` where album art would be displayed.
     * @param placeholder A optional placeholder `HTMLElement` that could be displayed when the track does not have album art data.
     */
    setTrackAlbumArtDisplay(ele, placeholder) {
        this.#trackAlbumArtDisplay = ele;
        if (!!placeholder) {
            this.#albumArtPlaceholder = placeholder;
        }
    }
    /**
     * Configure the track play progress ui element.
     * @param ele a `HTMLProgressElement`
     */
    setTrackProgressDisplay(ele) {
        this.#trackProgressDisplay = ele;
    }
    /**
     * Configure the track seeker bar ui element.
     * @param ele a `HTMLInputElement` with type `range`
     */
    setTrackSeekBar(ele) {
        if (ele.type !== "range") {
            console.warn(`Unexpected type for seek control input: expected 'range' but got ${ele.type}. Control may not function properly.`);
        }
        this.#trackSeekbar = ele;
        this.#trackSeekbar.addEventListener("input", (e) => (this.#currentTrack.currentTime = Number(this.#trackSeekbar.value)));
        this.#trackSeekbar.addEventListener("mousedown", (e) => (this.#seeking = true));
        this.#trackSeekbar.addEventListener("mouseup", (e) => (this.#seeking = false));
        this.#trackSeekbar.addEventListener("touchstart", (e) => (this.#seeking = true));
        this.#trackSeekbar.addEventListener("touchend", (e) => (this.#seeking = false));
    }
    /**
     * Load the list of avaliable audio tracks from server.
     */
    loadTrackList() {
        console.info("Loading track list");
        this.#dBHelper
            .open()
            .then(() => Promise.all([
            fetch(".simple_play_data/index-hash.txt", { cache: "no-store" }).then((response) => response.text()),
            this.#dBHelper.getMusicIndexHash(),
        ]).then(([server, client]) => {
            console.debug("current index signature: " + server);
            if (client !== server) {
                console.info("Index outdated or missing, downloading new index");
                return this.#dBHelper
                    .clearIndex()
                    .then(() => fetch(".simple_play_data/index.json", { cache: "no-store" })
                    .then((response) => response.json())
                    .then(async (tracks) => {
                    await this.#dBHelper.updateMusicIndex(tracks, server);
                }))
                    .then(() => Promise.resolve());
            }
            else {
                return Promise.resolve();
            }
        }))
            .then(() => this.#dBHelper.getAllMusics())
            .then((data) => (this.#trackList = data))
            .then(() => this.#displayTrackList())
            .then(() => {
            if (!!this.ontracksloaded) {
                this.ontracksloaded();
            }
        })
            .catch((err) => {
            console.error(err);
            alert("error: " + err);
            this.loadTrackList();
        });
    }
    #displayTrackList(filter = "") {
        if (!!this.#trackList && !!this.#trackListDisplay) {
            this.#trackListDisplay.innerHTML = "";
            let trackList = document.createDocumentFragment();
            //find exact match first, then append word match.
            let result = this.#trackList
                .filter((t) => t.name.toLowerCase().includes(filter.trim().toLowerCase()))
                .sort(_a.trackSorter);
            result
                .concat(this.#trackList
                .filter((t) => filter
                .trim()
                .toLowerCase()
                .split(" ")
                .every((kw) => t.name?.toLowerCase().includes(kw) || t.album?.toLowerCase().includes(kw)) &&
                !!!result.find((rt) => rt.index === t.index))
                .sort(_a.trackSorter))
                .forEach((track) => {
                const item = this.#trackListItemAdapter(track);
                item.onclick = (e) => {
                    e.stopPropagation();
                    this.#setTrack(track.index);
                };
                trackList.appendChild(item);
            });
            this.#trackListDisplay.appendChild(trackList);
        }
    }
    #setTrack(index) {
        let track = this.#trackList?.find((t) => t.index === index);
        if (!!track) {
            //unset the current track first
            if (this.#currentTrack && !this.#currentTrack.paused) {
                console.info("Current track not stooped, stopping");
                this.#currentTrack.pause();
            }
            this.#loadTrack(track.src, () => {
                if (!!this.#trackNameDisplay) {
                    this.#trackNameDisplay.innerText = track.name;
                }
                if (this.#trackAlbumDisplay) {
                    this.#trackAlbumDisplay.innerText = track.album || this.#albumPlaceholder;
                }
                if (!!this.#trackArtistDisplay) {
                    this.#trackArtistDisplay.innerText = track.artist || this.#artistPlaceholder;
                }
                if (!!this.#trackProgressDisplay) {
                    this.#trackProgressDisplay.max = this.currentTrackDuration;
                    this.#trackProgressDisplay.value = 0;
                }
                if (!!this.#trackSeekbar) {
                    this.#trackSeekbar.max = this.currentTrackDuration.toString();
                    this.#trackSeekbar.value = "0";
                }
                if (!!this.#timeLapsedDisplay) {
                    this.#timeLapsedDisplay.innerText = _a.formatTime(0);
                }
                if (!!this.#timeRemainDisplay) {
                    this.#timeRemainDisplay.innerText = _a.formatTime(this.#currentTrack.duration);
                }
                this.#currentTrack.oncanplay = null; //unset the event
                this.#loadTrackCoverArt(track).then(() => {
                    const meta = {
                        title: track.name,
                        artist: track.artist,
                        album: track.album,
                    };
                    if (!!track.cover && this.#albumArts.has(track.cover)) {
                        const img = document.createElement("img");
                        img.src = this.#albumArts.get(track.cover);
                        if (!!this.#trackAlbumArtDisplay) {
                            this.#trackAlbumArtDisplay.appendChild(img);
                        }
                        meta.artwork = [{ src: img.src }];
                    }
                    else if (this.#trackAlbumArtDisplay && this.#albumArtPlaceholder) {
                        this.#trackAlbumArtDisplay.appendChild(this.#albumArtPlaceholder);
                    }
                    if ("mediaSession" in navigator) {
                        navigator.mediaSession.metadata = new MediaMetadata(meta);
                        navigator.mediaSession.setActionHandler("play", () => {
                            this.play();
                        });
                        navigator.mediaSession.setActionHandler("pause", () => {
                            this.pause();
                        });
                        navigator.mediaSession.setActionHandler("stop", () => {
                            this.stop();
                        });
                        navigator.mediaSession.setActionHandler("seekto", (args) => {
                            this.#currentTrack.currentTime = args.seekTime;
                        });
                    }
                    if (!!this.ontrackset) {
                        this.ontrackset();
                    }
                    this.#playTrack();
                });
            });
        }
        else {
            console.warn(`Track ${index} not found in track list`);
        }
    }
    #loadTrack(path, onLoad) {
        console.info("Loading track: ", path);
        this.#currentTrack.src = path;
        this.#currentTrack.oncanplay = onLoad;
        this.#currentTrack.load();
    }
    async #loadTrackCoverArt(track) {
        console.info("Loading cover art for track " + track.index);
        if (this.#trackAlbumArtDisplay) {
            this.#trackAlbumArtDisplay.innerHTML = "";
        }
        if (!(!!track.cover && this.#albumArts.has(track.cover))) {
            if (!!track.cover) {
                let image = await this.#dBHelper.getCoverArt(track.cover);
                if (image === undefined) {
                    try {
                        const response = await fetch(`.simple_play_data/${track.cover}.txt`, { cache: "no-store" });
                        const coverData = await response.text();
                        await this.#dBHelper.updateCoverArtIndex([{ id: track.cover, data: base64ToBlob(coverData) }]);
                        image = await this.#dBHelper.getCoverArt(track.cover);
                    }
                    catch (err) {
                        console.warn(new Error(`Failed to load cover art ${track.cover}`, { cause: err }));
                        image = undefined;
                    }
                }
                if (image) {
                    this.#albumArts.set(track.cover, URL.createObjectURL(image.data));
                }
            }
        }
    }
    #playTrack() {
        if (this.#currentTrack) {
            this.#currentTrack
                .play()
                .then(() => {
                console.log("Begin playing selected track");
                if (navigator.mediaSession) {
                    navigator.mediaSession.playbackState = "playing";
                }
                if (!!this.onplay) {
                    this.onplay();
                }
            })
                .catch((e) => {
                console.error("Cannot play selected track: ", e);
                alert("Error occurred while trying to play selected track");
            });
        }
        else {
            console.warn("Track not set, will not play");
        }
    }
    /**
     * Basic playback contols.
     */
    play() {
        this.#playTrack();
    }
    #stopTrack() {
        if (this.#currentTrack) {
            this.#currentTrack.currentTime = 0;
            this.#currentTrack.pause();
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = "paused";
            }
            if (!!this.onstop) {
                this.onstop();
            }
            console.info("Stopped playback");
        }
    }
    /**
     * Basic playback contols.
     */
    stop() {
        this.#stopTrack();
    }
    #pauseTrack() {
        if (this.#currentTrack) {
            this.#currentTrack.pause();
            if (navigator.mediaSession) {
                navigator.mediaSession.playbackState = "paused";
            }
            if (!!this.onpause) {
                this.onpause();
            }
            console.info("Paused playback");
        }
    }
    /**
     * Basic playback contols.
     */
    pause() {
        this.#pauseTrack();
    }
    /**
     * Get the total playback time of the current track in seconds.
     */
    get currentTrackDuration() {
        if (this.#currentTrack?.duration) {
            return this.#currentTrack.duration;
        }
        return null;
    }
    /**
     * Get the elapsed playback time of the current track in seconds.
     */
    get currentTrackElapsedTime() {
        if (this.#currentTrack?.duration) {
            return this.#currentTrack.currentTime;
        }
        return null;
    }
    /**
     * Get the remaing playback time of the current track in seconds.
     */
    get currentTrackRemainingTime() {
        if (!!this.currentTrackElapsedTime && !!this.currentTrackDuration) {
            return this.currentTrackDuration - this.currentTrackElapsedTime;
        }
        return null;
    }
    /**
     * Get the current playback volume ranging from 0 - 1;
     */
    get playbackVolume() {
        return this.#volumeLevel;
    }
    /**
     * Get the current playback volume level in terms of {@linkcode volumeControlSteps}.
     */
    get playbackVolumeLevel() {
        return Math.floor(this.#volumeLevel / (1 / this.#volumeControlSteps));
    }
    /**
     * Set the playback volume level. Value level ranges from 0 - 1 (inclusive).
     */
    setVolume(value) {
        value = Math.max(0, Math.min(1, value)); //clamp value to valid range
        console.info(`Setting volume to ${value}x`);
        this.#volumeLevel = value;
        this.#volumeAdjustor.gain.value = this.#volumeLevel;
        localStorage.setItem(_a.VOLUME_PERSISTENCE_KEY, value.toString());
    }
    set volumeControlSteps(totalSteps) {
        if (totalSteps <= 1) {
            console.error(`invalid volume steps configuration ${totalSteps}, ignoring`);
            return;
        }
        this.#volumeControlSteps = totalSteps;
        if (!!this.#volumeControl) {
            this.#volumeControl.step = (100 / this.#volumeControlSteps / 100).toString();
        }
    }
    /**
     * Total amount of volume levels avilable.
     */
    get volumeControlSteps() {
        return this.#volumeControlSteps;
    }
    /**
     * Increment/decrement volume level by step.
     * @param increase boolean, pass in `true` to increase volume by 1 step, otherwise to decrease by 1 step.
     */
    changeVolumeByStep(increase) {
        let change = 100 / this.#volumeControlSteps / 100;
        if (!increase) {
            change = 0 - change;
        }
        this.setVolume(this.#volumeLevel + change);
        if (!!this.#volumeControl) {
            this.#volumeControl.value = this.#volumeLevel.toString();
        }
    }
    /**
     * Toggles looping.
     *
     * When enabled, current playing track would loop continously.
     */
    toggleLooping() {
        this.#currentTrack.loop = !this.#currentTrack.loop;
        console.info("Looping enabled:", this.#currentTrack.loop);
        this.#updateLoopingDisplay();
    }
    #updateLoopingDisplay() {
        if (!!this.#loopButton) {
            if (this.#currentTrack?.loop) {
                this.#loopButton.style.opacity = "1";
            }
            else {
                this.#loopButton.style.opacity = "0.4";
            }
        }
    }
    /**
     * Toggles random track selection.
     *
     * When enabled, a random track will be played once the current track completes.
     *
     * Does not have any effect if looping is also enabled.
     */
    toggleRandom() {
        this.#isRandom = !this.#isRandom;
        this.#updateRandomDisplay();
    }
    #updateRandomDisplay() {
        if (!!this.#randomButton) {
            if (this.#isRandom) {
                this.#randomButton.style.opacity = "1";
            }
            else {
                this.#randomButton.style.opacity = "0.4";
            }
        }
    }
    #randomSetTrack() {
        if (!!this.#trackList) {
            this.#setTrack(this.#trackList[Math.floor(Math.random() * this.#trackList.length)].index);
        }
    }
    /**
     * Disable/enable the default audio output.
     * @param status output staus to be set.
     */
    toggleDefaultOutput(status) {
        if (!status) {
            this.#source.disconnect(this.#volumeAdjustor);
        }
        else {
            this.#source.connect(this.#volumeAdjustor);
        }
    }
    /**
     * Web Audio compatible output to allow custom audio processing.
     *
     * This output is not affected by volume control.
     *
     * @return A `MediaStreamAudioDestinationNode`
     */
    get lineOut() {
        return this.#lineOutNode;
    }
}
_a = MusicPlayer;
class IndexdDBHelper {
    #dbName;
    #dbVersion;
    #dbInstance;
    constructor(name, version = 1) {
        this.#dbName = name;
        this.#dbVersion = version;
    }
    onUpgrade(db, oldVersion, newVersion) { }
    onDelete(db) { }
    onOpen(db) { }
    onError(err) {
        throw err;
    }
    /** Throws error if database is not open */
    async #requiresOpenDatabase() {
        if (!!!this.activeDatabase) {
            throw new Error("No open database for operation");
        }
    }
    insert(data, store, keys) {
        if (!!keys && keys.length !== data.length) {
            throw new Error("number of provided keys does not match number of data");
        }
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const transaction = this.activeDatabase.transaction(store, "readwrite");
            const resultKeys = new Array();
            transaction.oncomplete = (event) => {
                resolve(resultKeys);
            };
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
            const objectStore = transaction.objectStore(store);
            data.forEach((datum, index) => {
                let request;
                if (!!keys) {
                    request = objectStore.add(datum, keys.at(index));
                }
                else {
                    request = objectStore.add(datum);
                }
                request.onsuccess = (event) => {
                    resultKeys.push(event.target.result);
                };
            });
        }));
    }
    update(data, store, keys) {
        if (!!keys && keys.length !== data.length) {
            throw new Error("number of provided keys does not match number of data");
        }
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const transaction = this.activeDatabase.transaction(store, "readwrite");
            const resultKeys = new Array();
            transaction.oncomplete = (event) => {
                resolve(resultKeys);
            };
            transaction.onerror = (event) => {
                reject(event.target.error);
            };
            const objectStore = transaction.objectStore(store);
            data.forEach((datum, index) => {
                let request;
                if (!!keys) {
                    request = objectStore.put(datum, keys.at(index));
                }
                else {
                    request = objectStore.put(datum);
                }
                request.onsuccess = (event) => {
                    resultKeys.push(event.target.result);
                };
            });
        }));
    }
    select(key, store, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store).objectStore(store);
            const request = objectStore.get(key);
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                else {
                    reject(err);
                }
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        }));
    }
    selectAll(store, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store).objectStore(store);
            const request = objectStore.getAll();
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                else {
                    reject(err);
                }
            };
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
        }));
    }
    query(store, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store).objectStore(store);
            const request = objectStore.openCursor();
            const result = new Array();
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                reject(err);
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    result.push(cursor.value);
                    cursor.continue();
                }
                else {
                    resolve(result);
                }
            };
        }));
    }
    delete(key, store, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store, "readwrite").objectStore(store);
            const request = objectStore.delete(key);
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                else {
                    reject(err);
                }
            };
            request.onsuccess = (event) => {
                resolve();
            };
        }));
    }
    deleteAll(store, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store, "readwrite").objectStore(store);
            const request = objectStore.clear();
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                else {
                    reject(err);
                }
            };
            request.onsuccess = (event) => {
                resolve();
            };
        }));
    }
    queryIndex(store, indexName, onError) {
        return this.#requiresOpenDatabase().then(() => new Promise((resolve, reject) => {
            const objectStore = this.activeDatabase.transaction(store).objectStore(store);
            const index = objectStore.index(indexName);
            const request = index.openKeyCursor();
            const result = new Array();
            request.onerror = (event) => {
                const err = event.target.error;
                if (!!onError) {
                    onError(err);
                }
                else {
                    reject(err);
                }
            };
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    result.push(cursor.key);
                    cursor.continue();
                }
                else {
                    resolve(result);
                }
            };
        }));
    }
    open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.activeDatabaseName, this.activeDatabaseVersion);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (event.oldVersion === 0) {
                    this.onCreate(db);
                }
                else if (!!!event.newVersion) {
                    this.onDelete(db);
                }
                else if (event.newVersion > event.oldVersion) {
                    this.onUpgrade(db, event.oldVersion, event.newVersion);
                }
            };
            request.onsuccess = (event) => {
                const db = event.target.result;
                this.onOpen(db);
                this.#dbInstance = db;
                resolve(db);
            };
            request.onerror = (event) => {
                this.onError(event.target.error);
                reject();
            };
        });
    }
    /**
     * close
     */
    close() {
        if (!!this.activeDatabase) {
            this.activeDatabase.close();
            this.#dbInstance = undefined;
        }
    }
    get activeDatabaseName() {
        return this.#dbName;
    }
    get activeDatabase() {
        return this.#dbInstance;
    }
    get activeDatabaseVersion() {
        return this.#dbVersion;
    }
}
class MusicDBHelper extends IndexdDBHelper {
    static TRACKS_STORE_NAME = "tracks";
    static COVER_STORE_NAME = "cover";
    static INDEX_HASH_KEY = "index-hash";
    onCreate(db) {
        db.createObjectStore(MusicDBHelper.INDEX_HASH_KEY);
        const trackStore = db.createObjectStore(MusicDBHelper.TRACKS_STORE_NAME, { keyPath: "index" });
        trackStore.createIndex("album", "album", { unique: false });
        trackStore.createIndex("artist", "artist", { unique: false });
        db.createObjectStore(MusicDBHelper.COVER_STORE_NAME, { keyPath: "id" });
    }
    onError(err) {
        super.onError(err);
        alert(err);
    }
    clearIndex() {
        return Promise.all([
            this.deleteAll(MusicDBHelper.TRACKS_STORE_NAME),
            this.deleteAll(MusicDBHelper.COVER_STORE_NAME),
            this.deleteAll(MusicDBHelper.INDEX_HASH_KEY),
        ]).then();
    }
    updateMusicIndex(data, hash) {
        return super
            .update(data, MusicDBHelper.TRACKS_STORE_NAME)
            .then(() => super.update([hash], MusicDBHelper.INDEX_HASH_KEY, [MusicDBHelper.INDEX_HASH_KEY]))
            .then();
    }
    getMusicIndexHash() {
        return super.selectAll(MusicDBHelper.INDEX_HASH_KEY).then((v) => v.at(0) || null);
    }
    getMusic(id) {
        return super.select(id, MusicDBHelper.TRACKS_STORE_NAME);
    }
    updateCoverArtIndex(data) {
        return super.update(data, MusicDBHelper.COVER_STORE_NAME);
    }
    getCoverArt(id) {
        return super.select(id, MusicDBHelper.COVER_STORE_NAME);
    }
    getAllMusics() {
        return super.selectAll(MusicDBHelper.TRACKS_STORE_NAME);
    }
}
