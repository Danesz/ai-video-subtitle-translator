export interface AiEngineInterface {
    /**
     * Check if the browser APIs are available
     */
    isSupported(): boolean;

    /**
     * Check if the engine can work with the supplied creation parameters
     */
    canWork(): Promise<AICapabilityAvailability>;

    /**
     * If [canWork()] returns "after-download", this method can downlaod the necessary AI models.
     */
    download(): Promise<boolean>;

    /**
     * Creates the AI session, only works if [canWork()] returns "readily"
     */
    createSession(): Promise<AiSession>;

    /**
     * Destroys the AI session
     */
    destroySession(): Promise<void>;

}

export interface AiSession {
    /**
     * The name of the session, only used for logging purposes
     */
    name(): string;

    /**
     * Executes the prompt on the AI session
     * @param prompt Text prompt to execute with the AI session.
     */
    execute(prompt: string): Promise<string>;
    //TODO: add streaming support
    //executeStreaming(prompt: string): ReadableStream<string>;

    /**
     * Destroys the AI session
     */
    destroy(): Promise<void>;

}

//dummy DOM interfaces

export interface WindowOrWorkerGlobalScopeTranslation {
    readonly translation: TranslationInterface;
}

export interface TranslationInterface {
    canTranslate(options: {
        sourceLanguage: string,
        targetLanguage: string,
    }): Promise<AICapabilityAvailability>;
}

export interface AICreateOptions {
    //TODO: connect later
    //signal?: AbortSignal;
    
    //TODO: not used yet, we track the downlaod progress internally
    //monitor?: AICreateMonitorCallback;

    sourceLanguage: Intl.UnicodeBCP47LocaleIdentifier;
    targetLanguage: Intl.UnicodeBCP47LocaleIdentifier;
}
    