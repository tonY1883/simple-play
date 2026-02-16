# Simple Play

A simple, lightweight, customizable and extendable Javascript audio playback library.

## Feature

- In browser audio playback
- Basic playback control: play, pause, stop, volume adjust, looping and shuffle
- Track searching
- Nothing more

## Dependencies

1. Any HTTP server
2. Python 3 with Mutagen and `tqdm` (For indexing audio tracks)
3. A custom front end (if you want to)

## Setup

This repository include a simple, abeit barebone example that could be used as a music player, if that's all you need.

1. Set up a http web server. *Simple Play* requires a web server been set up, and can be served like
   any other static html website. For how to set up the server, refer to the documentation of your
   specific server software. Personally, I use `nginx`.
2. Upload your music to your server and place them in the same directory as the site (sub directory
   is allowed). For now the following formats are supported: `wav`, `flac`, `m4a`, `aac`, `ogg`
   , `webm`, `mp3`.
3. Run the included python script to index the uploaded audio files.

```shell
./music-index.py <directory of music files>
```

The script will search for and index every supported audio file in the given directory. Audio track information is based on the appropreiate tags if available.

This generates a `index.json` file in the directory, which will be used by the front end to load the
audio files.

4. Navigate to the site with your browser. You should be able to play you tracks now.

## Customization

If you want to have a more sophisticated, elegant interface, you coulld integrate `simple-play.js` into your custom frontend.

```html
<script src="music-player.js"></script>
```

```javascript
//initialize
const musicPlayer = new MusicPlayer();
//set ui elements
musicPlayer.setPlayButton(document.querySelector("#music-play-button"));
//load tracks
musicPlayer.loadTrackList();
```

For detailed usage, refer to the example site.

`SimplePlay` provides the following API:

```Javascript
    /** Callback triggers after the track list is loaded from server */
    ontracksloaded: (() => void) | undefined;
    /** Callback triggers after the individual track is selected */
    ontrackset: (() => void) | undefined;
    /** Callback triggers on track play/resume */
    onplay: (() => void) | undefined;
    /** Callback triggers when current track is completed */
    onplayend: (() => void) | undefined;
    /** Callback triggers on track stop */
    onstop: (() => void) | undefined;
    /** Callback triggers on track pause */
    onpause: (() => void) | undefined;
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setPlayButton(ele: HTMLElement): void;
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setPauseButton(ele: HTMLElement): void;
    /**
     * Configure ui element for playback controls.
     *
     * @param ele a `HTMLInputElement`
     */
    setStopButton(ele: HTMLElement): void;
    /**
     * Configure the toogle for looping.
     *
     * @param ele a `HTMLInputElement`
     */
    setLoopButton(ele: HTMLElement): void;
    /**
     * Configure the toogle for random track selection.
     *
     * @param ele a `HTMLInputElement`
     */
    setRandomButton(ele: HTMLElement): void;
    /**
     * Configure the track search input.
     * @param ele a `HTMLInputElement`
     */
    setSearchInput(ele: HTMLInputElement): void;
    /**
     * Configure the volume control ui element.
     * @param ele a `HTMLInputElement` with type `range`
     */
    setVolumeControl(ele: HTMLInputElement): void;
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
    setTrackListItemDisplay(rootEle: HTMLElement, itemAdapter: (track: MusicTrack) => HTMLElement): void;
    /**
     * Configure the UI for displaying current track name
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackNameDisplay(ele: HTMLElement): void;
    /**
     * Configure the UI for displaying current track elapsed time
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackTimeLapsedDisplay(ele: HTMLElement): void;
    /**
     * Configure the UI for displaying current track remaining time
     * @param ele `HTMLElement` where the information would be displayed.
     */
    setTrackTimeRemainDisplay(ele: HTMLElement): void;
    /**
     * Configure the UI for displaying track album information
     * @param ele `HTMLElement` where the track album would be displayed.
     * @param placeholder A optional placeholder text that could be displayed when the track does not have album data.
     */
    setTrackAlbumDisplay(ele: HTMLElement, placeholder?: string): void;
    /**
     * Configure the UI for displaying track artist information
     * @param ele `HTMLElement` where the track artist would be displayed.
     * @param placeholder A optional placeholder text that could be displayed when the track does not have artist data.
     */
    setTrackArtistDisplay(ele: HTMLElement, placeholder?: string): void;
    /**
     * Configure the UI for displaying album art
     * @param ele `HTMLElement` where album art would be displayed.
     * @param placeholder A optional placeholder `HTMLElement` that could be displayed when the track does not have album art data.
     */
    setTrackAlbumArtDisplay(ele: HTMLElement, placeholder?: HTMLElement): void;
    /**
     * Configure the track play progress ui element.
     * @param ele a `HTMLProgressElement`
     */
    setTrackProgressDisplay(ele: HTMLProgressElement): void;
    /**
     * Configure the track seeker bar ui element.
     * @param ele a `HTMLInputElement` with type `range`
     */
    setTrackSeekBar(ele: HTMLInputElement): void;
    /**
     * Load the list of avaliable audio tracks from server.
     */
    loadTrackList(): void;
    /**
     * Basic playback contols.
     */
    play(): void;
    /**
     * Basic playback contols.
     */
    stop(): void;
    /**
     * Basic playback contols.
     */
    pause(): void;
    /**
     * Get the total playback time of the current track in seconds.
     */
    get currentTrackDuration(): number | null;
    /**
     * Get the elapsed playback time of the current track in seconds.
     */
    get currentTrackElapsedTime(): number | null;
    /**
     * Get the remaing playback time of the current track in seconds.
     */
    get currentTrackRemainingTime(): number | null;
    /**
     * Get the current playback volume ranging from 0 - 1;
     */
    get playbackVolume(): number;
    /**
     * Get the current playback volume level in terms of {@linkcode volumeControlSteps}.
     */
    get playbackVolumeLevel(): number;
    /**
     * Set the playback volume level. Value level ranges from 0 - 1 (inclusive).
     */
    setVolume(value: number): void;
    set volumeControlSteps(totalSteps: number);
    /**
     * Total amount of volume levels avilable.
     */
    get volumeControlSteps(): number;
    /**
     * Increment/decrement volume level by step.
     * @param increase boolean, pass in `true` to increase volume by 1 step, otherwise to decrease by 1 step.
     */
    changeVolumeByStep(increase: boolean): void;
    /**
     * Toggles looping.
     *
     * When enabled, current playing track would loop continously.
     */
    toggleLooping(): void;
    /**
     * Toggles random track selection.
     *
     * When enabled, a random track will be played once the current track completes.
     *
     * Does not have any effect if looping is also enabled.
     */
    toggleRandom(): void;
    /**
     * Disable/enable the default audio output.
     * @param status output staus to be set.
     */
    toggleDefaultOutput(status: boolean): void;
    /**
     * Web Audio compatible output to allow custom audio processing.
     *
     * This output is not affected by volume control.
     *
     * @return A `MediaStreamAudioDestinationNode`
     */
    get lineOut(): MediaStreamAudioDestinationNode;
```
