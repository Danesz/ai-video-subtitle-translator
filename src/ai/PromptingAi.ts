import { AICreateOptions, AiEngineInterface, AiSession } from "./AiInterface";

export class PromptingAi implements AiEngineInterface {

    private aiParams: AICreateOptions;
    private aiSession?: AiSession;
    
    constructor(creationParams: AICreateOptions) {
        this.aiParams = creationParams;
    }

    async createSession(): Promise<PromptingAiSession> {
        const canwork = await this.canWork();
        if (canwork == "no") {
            throw new Error("PromptingAi is not supported.");
        }

        if (canwork == "after-download") {
            throw new Error("PromptingAi has to be downloaded first.");
        }

        this.aiSession = new PromptingAiSession(this.aiParams);
        return Promise.resolve(this.aiSession as PromptingAiSession);
    }

    async destroySession(): Promise<void> {
        await this.aiSession?.destroy();
    }

    isSupported(): boolean {
        return self.ai !== undefined && self.ai.languageModel !== undefined;
    }

    async canWork(): Promise<AICapabilityAvailability> {
        return (await self.ai.languageModel.capabilities()).available;
    }

    async download(): Promise<boolean> {
        switch (await this.canWork()) {
            case "after-download":
                return new Promise((resolve, reject) => {
                    self.ai.languageModel.create({
                        monitor(m) {
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

export class PromptingAiSession implements AiSession {

    ai: Promise<AILanguageModel>;

    constructor(creationParams: AICreateOptions) {
        this.ai = self.ai.languageModel.create({
            ...creationParams,
            systemPrompt: `You are a translator from the language with language code "${creationParams.sourceLanguage}". Only give one single response back, don't try to analyze things. Translate every text to the language with language code "${creationParams.targetLanguage}"`,
        });
    }

    async execute(prompt: string): Promise<string> {
        return await (await this.ai).prompt(prompt);
    }

    name(): string {
        return "PromptingAi";
    }

    async destroy(): Promise<void> {
        return (await this.ai).destroy()
    }
    
}