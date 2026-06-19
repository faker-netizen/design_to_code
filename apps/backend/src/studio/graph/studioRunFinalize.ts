import studioArtifactService from "../services/studioArtifactService.js";
import studioRunService from "../services/studioRunService.js";
import type {StudioArtifactDraft, StudioOrchestratorConfig} from "../types/state.js";

export async function finalizeStudioRun(params: {
    runId: number;
    artifacts: StudioArtifactDraft[];
    error: string | null;
    config: StudioOrchestratorConfig;
}): Promise<void> {
    const {runId, artifacts, error, config} = params;
    const artifactIds: number[] = [];

    for (const draft of artifacts) {
        const id = await studioArtifactService.saveArtifact(runId, draft);
        artifactIds.push(id);
        config.emit("artifact", {runId, artifactId: id, kind: draft.kind, markdown: draft.markdown});
    }

    if (error) {
        await studioRunService.markFailed(runId, error);
        config.emit("run_done", {runId, status: "failed", error, artifactIds});
        return;
    }

    await studioRunService.markCompleted(runId);
    config.emit("run_done", {runId, status: "completed", artifactIds});
}
