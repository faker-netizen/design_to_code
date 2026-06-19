import {summarizeMaterialsMarkdown} from "./summarizeLlm.js";

export async function runDirectSummarize(params: {
    userQuery: string;
    materials: Array<{title: string; content: string}>;
    priorSummary: string;
}): Promise<{contentJson: Record<string, unknown>; markdown: string}> {
    return summarizeMaterialsMarkdown({...params, mode: "direct"});
}
