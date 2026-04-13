# Simple Play

A simple, lightweight, customizable and extendable web music / audio player.

## Feature

- In browser audio playback
- Basic playback control: play, pause, stop, volume adjust, looping and shuffle
- Integration with browser/OS media control
- Track searching
- Cover art display
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

The script will search for and index every supported audio file in the given directory. Audio track information is based on the appropreiate tags if available. All generated data are saved to the `.simple-play-data` directory.

4. Navigate to the site with your browser. You should be able to play you tracks now.

## Customization

If you want to have a more sophisticated, elegant interface, you coulld integrate `simple-play.js` into your custom frontend.

```html

<script src="simple-play.js"></script>
```

or, through *jsDelivr*:
```html

<script src="https://cdn.jsdelivr.net/gh/tonY1883/simple-play@master/simple-play.js"></script>
```

Then, in your code:

```javascript
//initialize
const musicPlayer = new SimplePlay();
//set ui elements
musicPlayer.setPlayButton(document.querySelector("#music-play-button"));
...
//load tracks
musicPlayer.loadTrackList();
```

For detailed usage, refer to the example site and the code comments.

### Available APIs

#### Properties

`ontracksloaded` : Callback method that triggers after the track list is loaded from server.

`ontrackset`: Callback triggers after the individual track is selected

`onplay`: Callback triggers on track play/resume

`onplayend`: Callback triggers when current track is completed

`onstop`: Callback triggers on track stop

`onpause`: allback triggers on track pause

`onsetmediasessionmeta`: Hook method to customize the information displayed on browser/system media control via Media Session API. This method is expected to return a `MediaMetadataInit` object.

`currentTrackDuration`: Get the total playback time of the current track in seconds.

`currentTrackElapsedTime`: Get the elapsed playback time of the current track in seconds.

`currentTrackRemainingTime`:  Get the remaing playback time of the current track in seconds.

`playbackVolume`: Get the current playback volume ranging from 0 - 1

`playbackVolumeLevel`: Get the current playback volume level in terms of `volumeControlSteps`.

`volumeControlSteps`: The total number of steps available to control the volume. This value can be changed during runtime.

`lineOut`: A `MediaStreamAudioDestinationNode` to allow custom audio processing via Web Audio API. You can feed this node as the input to your audio graph.


#### Methods

`setPlayButton(ele)`: Set a HTML element to act as the play button.

`setPauseButton(ele)`: Set a HTML element to act as the pause button.

`setStopButton(ele)`: Set a HTML element to act as the stop button.

`setLoopButton(ele)`: Set a HTML element to act as the looping toggle button. Looping is for single track only.

`setRandomButton(ele)`: Set a HTML element to act as the shuffle toggle button. When enabled, will play a random track oncemthe current track completes. Has no effect when looping is enabled.

`setSearchInput(ele)`: Set a `HTMLInputElement` to act as the text search input field. Searching only searches for track name and album name.

`setVolumeControl(ele)`: Set a `HTMLInputElement` to act as the volume control slider. The element must be of the type `range`.

`setTrackListItemDisplay(rootEle, itemAdapter)`: Set the HTML element for displaying the list of tracks. The `itemAdapter` argument is a function that transform individual track data into a `HTMLElement`, each indivisual track info is a object as follows, and is the only argument of the function:

```typescript
{
    index: number;
    src: string;
    name: string;
    artist?: string;
    album?: string;
    albumIndex?: number;
    cover?: string;
}
```

`setTrackNameDisplay(ele)`: Set a `HTMLElement` for displaying the name of the current track.

`setTrackTimeLapsedDisplay(ele)`: Set a `HTMLElement` for displaying the lapsed time of the current track.

`setTrackTimeRemainDisplay(ele)`: Set a `HTMLElement` for displaying the remaining time of the current track.

`setTrackAlbumDisplay(ele, placeholder)`: Set a `HTMLElement` for displaying the album art of the current track. The optional `placeholder` argument aollows a custom string to be displayed when the track does not have album art.

`setTrackProgressDisplay(ele)`: Set a `HTMLProgressElement` for displaying the current playback progress.

`setTrackTimeLapsedDisplay(ele)`: Set a `HTMLElement` for displaying the lapsed time of the current track.

`loadTrackList()`: Instruct Simple Play to load the list of avilable tracks from server.

`play()`, `stop()`, `pause()`: Basic playback contols for the current track, if any has been selected.

`setVolume(value)`: Set the playback volume level. Value level ranges from 0 - 1 (inclusive).

`changeVolumeByStep(increase)`: Change the volume by 1 `volumeControlStep`. The parameter indicates the change direction. (`true` for increase)

`toggleLooping()`: Enable/disable looping.

`toggleRandom()`: Enable/disable shuffling.

`toggleDefaultOutput(status)`: Enable/disable the default audio out path. If you are using the `lineOut` property to apply custom sound effects, the default output need to be disabled.

