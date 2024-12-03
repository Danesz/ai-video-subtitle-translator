# ai-video-subtitle-translator
AI video subtitle translator using on-device Gemini within Google Chrome. 
Works with **THEOplayer** or with **any video player that exposes TextTracks on the HTMLVideoElement** (e.g. ShakaPlayer, dash.js, hls.js)

In this current state, this is a proof-of-concept package prepared for the [Google Chrome Built-in AI Challenge](https://developer.chrome.com/blog/ai-challenge).

## How to use it

### Prerequisites 
Google Chrome Canary 130+ with built-in AI.
### Installation

#### Via NPM
```bash
npm i ai-video-subtitle-translator
```

#### Or from URL

```html
    <script
      type="text/javascript"
      src="https://cdn.jsdelivr.net/npm/ai-video-subtitle-translator@0.0.1/dist/index.umd.js"
    ></script>
```

### Usage

You can choose between `PromptingAi` and `TranslatorAi`.

- PromptingAI will try to use prompting to translate subtitles.

- TranslatorAI will use `self.ai.translator` API which is made specifically for handle translations. It can only manage this specific tasks, so it should be more reliable and faster compared to the PromptingAI.

However, if your browser doesn't support the `translator` API, you can fall back on prompting.

#### Step 1. - Initialize an AiEngine
```js
    const config = {sourceLanguage: "en", targetLanguage: "fr"};
    const currentAiEngine = new AIVideoSubtitleTranslator.TranslatorAi(config);
```

- `sourceLanguage` is the original language of the subtitle that the video contains

- `targetLanguage` is the desired tranlation

#### Step 2. - Check support
Once you create an AiEngine with the relevant configuration, you can check if the browser support is.
```js
currentAiEngine.isSupported() // true/false - means the underyling browser APIs are available or not
await currentAiEngine.canWork() // readily, after-downlaod, no - means if the model is usable
```

or get a single result that combines to methods above via:
```js
await AIVideoSubtitleTranslator.checkBrowserAi(currentAiEngine) // return the AIStatus enum
```

#### Step 3. - Downlaod the model if needed
If the response is `after-download`, the model will be downloaded at the first time translation will be used. (which will take time).

To trigger a downlaod manually, you can use
```js
await currentAiEngine.download()
```
**Note:** unfortunaterly, as of today, the downlaod progress indicator doesn't work (for me at least) in Chrome 130.0.6723.116.
To track the downlaod progress, instead of `awating` on the `downlaod()`, you can fire it and periodically check on `await currentAiEngine.canWork()`. If it changes from `after-downlaod` to any other values, it means the downlaod was finished.

#### Step 4. - Hook into THEOplayer or the VideoElement

Once the AI setup is ready, you can hook into the video players.

- For any video player that populates texttracks on the video element:
```js
    const videoElementPlayingTheSource = document.querySelector("video");

    AIVideoSubtitleTranslator.AIVideoSubtitleTranslator.initWithVideoElement(
        videoElementPlayingTheSource, 
        document.querySelector('#id_of_HtmlElement_where_the_translated_subtitles_will_be_rendered'), 
        currentAiEngine
    );
```

- for THEOplayer:
```js
    AIVideoSubtitleTranslator.initWithTHEOplayer(
        player, 
        document.querySelector('#id_of_HtmlElement_where_the_translated_subtitles_will_be_rendered'),
        currentAiEngine
    );
```

## Limitations
1. This NPM package will not do any clean-up (yet).
2. You can hook the engine as many times as you want to the players, but don't forget to destroy the previous session on the previous engine (`destroySession()`), except if you need multiple sessions to be available simultaneously. 
3. Even if you destroy the session, the eventListener for the players will be still attached (but not translate on the destroyed session anymore), a clean-up needs to happen.
4. The `download()` promise never resolves. (as of today, on Chrome 130.0.6723.116. ---> see workaround above)

## Future plans
1. Support more video players.
2. Make performance meausrements. If the user's machine is too slow for the translations (e.g. "exitCue" event happens faster than the translation and rendering finishes), we could try to find other ways.
3. Instead of translating at render time, we could translate once the cues are added to the track (but not rendered yet).
4. Instead of a separate rendering element, we could populate the translations as a proper text track on the players (this would open up support to use the proper TextTrack API)
5. Use the [Language Detection API](https://developer.chrome.com/docs/ai/language-detection), so there is no need for pre-defining the `sourceLanguage`, we could figure it out automagically.
6. Create a Chrome extension that hooks this module into "any" video player on any page, detect the subtitle, and provide auto-tranlations.