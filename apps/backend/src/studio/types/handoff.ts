import type {SearchProfile} from "./searchProfile.js";

export type WorkerHandoff = {
    runId: number;
    stepId: string;
    goal: string;
    userQuery: string;
    searchProfile: SearchProfile;
    priorSummary: string;
    materialIds: string[];
    artifactRefs: number[];
    outputSchemaRef?: string;
};

export type StepOutput = {
    summary: string;
    materialIds: string[];
    artifactRefs: number[];
};
