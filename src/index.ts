import { AiEngineInterface, AiSession } from "./ai/AiInterface";
import { stripHtml } from "./utils/CueUtils";
// expose engines
export { TranslatorAi } from "./ai/TranslatorAI";
export { PromptingAi } from "./ai/PromptingAi";

// Enums for AI statuses
export enum AIStatus {
  AVAILABLE = 0,
  HOOKED = 1,
  AFTER_DOWNLOADING = 2,
  ERROR_NOT_AVAILABLE = -100,
  ERROR_NOT_SUPPORTED = -200,
  ERROR_NO_ENGINE_DEFINED = -201,
  ERROR_ENGINE_NOT_SUPPORTED = -202,
  ERROR_UNKNOWN = -999,
}

// Default configuration
//export let promptStreaming: boolean = false;

let debugLogEnabled = false;

/**
 * Enabled debug logs when translating
 * @param enable logging should be enabled or not
 */
export function enableDebugLog(enable: boolean) {
  debugLogEnabled = enable;
}

/**
 * Function that hooks into the texttracks of THEOplayer.
 * @param player the THEOplayer instance
 * @param renderUI the HTMLElement where the translated subtitle will be rendered
 * @param aiEngine the engine used for the translation [PromptingAi] or [TranslatorAi]
 * @returns AIStatus.HOOKED if everything is OK, otherwise check the error.
 */
export async function initWithTHEOplayer(
  player: { textTracks: TextTrackList },
  renderUI: HTMLElement,
  aiEngine: AiEngineInterface
): Promise<AIStatus> {
  console.log("initWithTHEOplayer");

  if (aiEngine === undefined) {
    return Promise.reject({code: AIStatus.ERROR_NO_ENGINE_DEFINED, error: AIStatus[AIStatus.ERROR_NO_ENGINE_DEFINED]})
  }

  const isAiAvailable = await checkBrowserAi(aiEngine);
  if (isAiAvailable !== AIStatus.AVAILABLE) {
    console.warn("AI is NOT available!");
    return Promise.reject({code: isAiAvailable, error: AIStatus[isAiAvailable]});
  }
  
  const session = await aiEngine.createSession();
    
  //hook on exising tracks
  for (const track of Array.from(player.textTracks)) {
    if (track.kind === "subtitles") { // only hook into subtitles for now, later we can do it with "captions" too
      //track.mode = "hidden"; // Keep the native captions hidden
      console.log("hooked into existing track", track)
      attachTHEOplayerCueListeners(track);
    }
  }

    //hook on new tracks
  player.textTracks.addEventListener("addtrack", (evt: TrackEvent) => {
    const track = evt.track as TextTrack;
    if (track.kind === "subtitles") {
      console.log("hooked into new track", track)
      attachTHEOplayerCueListeners(track);
    }
  });

  //TODO: when track is removed, we can also unhook.

  function attachTHEOplayerCueListeners(track: TextTrack) {
    track.addEventListener("entercue", async (event: Event) => {
      const cue = (event as any).cue.text; // Cast to any since `cue` isn't fully typed
      if (cue === undefined) {
        return;
      }

      //NOTE: without stripping we can get "The model attempted to output text in an untested language, and was prevented from doing so" exception
      // we can turn it off at chrome://flags/#text-safety-classifier, if we don't want to lose the styles
      await translate(session, renderUI, stripHtml(cue));
    });

    track.addEventListener("exitcue", () => {
      renderUI.innerHTML = "";
    });
  }

  return Promise.resolve(AIStatus.HOOKED);
}

/**
 * Function that hooks into the texttracks of THEOplayer.
 * @param videoElement the HTMLVideoElement instance that will contain TextTracks
 * @param renderUI the HTMLElement where the translated subtitle will be rendered
 * @param aiEngine the engine used for the translation [PromptingAi] or [TranslatorAi]
 * @returns AIStatus.HOOKED if everything is OK, otherwise check the error.
 */
export async function initWithVideoElement(
  videoElement: HTMLVideoElement,
  renderUI: HTMLElement,
  aiEngine: AiEngineInterface
): Promise<AIStatus> {
  console.log("initWithVideoElement");

  if (aiEngine === undefined) {
    return Promise.reject({code: AIStatus.ERROR_NO_ENGINE_DEFINED, error: AIStatus[AIStatus.ERROR_NO_ENGINE_DEFINED]})
  }

  const isAiAvailable = await checkBrowserAi(aiEngine);
  if (isAiAvailable !== AIStatus.AVAILABLE) {
    console.warn("AI is NOT available!");
    return Promise.reject({code: isAiAvailable, error: AIStatus[isAiAvailable]});
  }

  const session = await aiEngine.createSession();

  const textTracks = videoElement.textTracks;

  //hook on exising tracks
  for (const track of Array.from(textTracks)) {
    if (track.kind === "subtitles") { // only hook into subtitles for now, later we can do it with "captions" too
      //track.mode = "hidden"; // Keep the native captions hidden
      console.log("hooked into existing track", track)
      track.addEventListener("cuechange", () => {
        handleCueChange(track, renderUI, session);
      });
    }
  }

  //hook on new tracks
  textTracks.addEventListener("addtrack", (ev) => {
    if (ev.track?.kind === "subtitles") { 
      console.log("hooked into new track", ev.track)
      handleCueChange(ev.track, renderUI, session);
    }
  });

  //TODO: when track is removed, we can also unhook.

  // Handle cue changes
  async function handleCueChange(
    track: TextTrack,
    renderUI: HTMLElement,
    session: AiSession
  ): Promise<void> {
    const activeCues = track.activeCues; // Get currently active cues

    if (activeCues && activeCues.length > 0) {
      // Display the text of the active cues
      const text = Array.from(activeCues)
        .map((cue) => (cue as /*TextTrackCue*/ any).text)
        .join("<br>");

        //NOTE: without stripping we can get "The model attempted to output text in an untested language, and was prevented from doing so" exception
        // we can turn it off at chrome://flags/#text-safety-classifier, if we don't want to lose the styles
      await translate(session, renderUI, stripHtml(text));
    } else {
      // Hide the subtitle container if no cues are active
      renderUI.innerHTML = "";
    }
  }

  return Promise.resolve(AIStatus.HOOKED)

}

// Translate function
async function translate(
  withSession: AiSession,
  renderUI: HTMLElement,
  text: string,
): Promise<void> {
  const session = withSession;
  const prompt = `"${text}"`;

  if (debugLogEnabled) {
    console.log("original: " + prompt);
  }

  /*
  if (promptStreaming) {
    const stream: any = session.promptStreaming(prompt); //TODO
    for await (const chunk of stream) {
      renderUI.innerHTML = chunk;
    }
  } else {
   */
    const response = await session.execute(prompt);
    if (debugLogEnabled) {
      console.log(`${session.name()}: ${response}`);
    }
    renderUI.innerHTML = response;
    /*
  }
    */
}

// Function to check AI availability in the browser
//TODO: check with all models
export async function checkBrowserAi(aiEngine: AiEngineInterface): Promise<AIStatus> {
  if (self.ai === undefined) {
    console.error("AI is not supported in your browser, so subtitles will not be translated!");
    return AIStatus.ERROR_NOT_SUPPORTED;
  } else if (!aiEngine.isSupported()) {
    console.error("The chosen AI engine not supported in your browser, so subtitles will not be translated!");
    return AIStatus.ERROR_ENGINE_NOT_SUPPORTED;
  } else {
    const availability = await aiEngine.canWork();

    console.log(`AI status: ${availability}`);

    switch (availability) {
      case "no":
        console.error("AI models are not available in your browser, so subtitles will not be translated!");
        return AIStatus.ERROR_NOT_AVAILABLE;
      case "after-download":
        console.warn("AI is available after download!");
        return AIStatus.AFTER_DOWNLOADING;
      case "readily":
        console.info("AI is available!");
        return AIStatus.AVAILABLE;
      default:
        return AIStatus.ERROR_UNKNOWN;
    }
  }
}

