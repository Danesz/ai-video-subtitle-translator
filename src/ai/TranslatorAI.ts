import { AICreateOptions, AiEngineInterface, AiSession, WindowOrWorkerGlobalScopeTranslation } from "./AiInterface";

export class TranslatorAi implements AiEngineInterface {

    private aiParams: AICreateOptions;
    private aiSession?: AiSession;

    constructor(creationParams: AICreateOptions) {
        this.aiParams = creationParams;
    }

    async createSession(): Promise<TranslatorAiSession> {
        const canwork = await this.canWork();
        if (canwork == "no") {
            throw new Error("PromptingAi is not supported.");
        }

        if (canwork == "after-download") {
            throw new Error("PromptingAi has to be downloaded first.");
        }

        this.aiSession = new TranslatorAiSession(this.aiParams);

        return Promise.resolve(this.aiSession as TranslatorAiSession);
    }

    async destroySession(): Promise<void> {
        await this.aiSession?.destroy();
    }

    isSupported(): boolean {
        return ('translation' in self && (self as any).translation.createTranslator !== undefined); //TODO
    }

    async canWork(): Promise<AICapabilityAvailability> {
        return await (self as unknown as WindowOrWorkerGlobalScopeTranslation).translation.canTranslate(this.aiParams);
    }

    async download(): Promise<boolean> {
        switch (await this.canWork()) {
            case "after-download":
                return new Promise((resolve, reject) => {
                    self.ai.translator.create({
                        sourceLanguage: this.aiParams.sourceLanguage,
                        targetLanguage: this.aiParams.targetLanguage,
                        monitor: (m) => {
                          m.addEventListener("downloadprogress", e => {
                            console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
                            if (e.loaded == e.total) {
                                return resolve(true);
                            }
                          });
                        }
                      });
                });   
            case "readily": 
                return Promise.resolve(true);     
            default:
                return Promise.resolve(false);
        }

    }

}

export class TranslatorAiSession implements AiSession {

    ai: Promise<AITranslator>;

    constructor(creationParams: AICreateOptions) {
        this.ai = self.ai.translator.create(creationParams);
    }

    async execute(prompt: string): Promise<string> {
        return await (await this.ai).translate(prompt);
    }

    name(): string {
        return "TranslatorAi";
    }

    async destroy(): Promise<void> {
        return (await this.ai).destroy();
    }

}