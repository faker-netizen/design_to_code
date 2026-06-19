import type {Plan} from "./plan.js";
import type {SearchProfile} from "./searchProfile.js";
import type {StepOutput} from "./handoff.js";

export type MaterialMeta = {
    id: string;
    title: string;
    sourceType: "kb" | "web" | "url" | "upload";
    charCount: number;
};

export type StudioArtifactDraft = {
    kind: "summary" | "video_script" | "report" | "chat_transcript";
    contentJson: Record<string, unknown>;
    markdown?: string;
};

export type StudioGraphState = {
    runId: number;
    projectId: number;
    userId: number;
    userQuery: string;
    searchProfile: SearchProfile;
    templateId: string;
    plan: Plan | null;
    completedStepIds: string[];
    stepOutputs: Record<string, StepOutput>;
    materialIndex: MaterialMeta[];
    artifacts: StudioArtifactDraft[];
    error: string | null;
};

export type StudioRunEmit = (event: string, data: Record<string, unknown>) => void;

export type StudioOrchestratorConfig = {
    emit: StudioRunEmit;
    signal?: AbortSignal;
    forceTemplate?: boolean;
};
