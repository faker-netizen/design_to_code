import {summarizeMaterialsMarkdown} from "./summarizeLlm.js";

const CHUNK_SIZE = 4;

export async function runMapReduceSummarize(params: {
    userQuery: string;
    materials: Array<{title: string; content: string}>;
    priorSummary: string;
}): Promise<{contentJson: Record<string, unknown>; markdown: string}> {
    const {materials} = params;
    if (materials.length <= CHUNK_SIZE) {
        return summarizeMaterialsMarkdown({...params, mode: "direct"});
    }

    const partials: string[] = [];
    for (let i = 0; i < materials.length; i += CHUNK_SIZE) {
        const slice = materials.slice(i, i + CHUNK_SIZE);
        const part = await summarizeMaterialsMarkdown({
            userQuery: params.userQuery,
            materials: slice,
            priorSummary: params.priorSummary,
            mode: "reduce",
        });
        partials.push(part.markdown);
    }

    const mergedMaterials = partials.map((content, index) => ({
        title: `分段摘要 ${index + 1}`,
        content,
    }));
    return summarizeMaterialsMarkdown({
        userQuery: params.userQuery,
        materials: mergedMaterials,
        priorSummary: params.priorSummary,
        mode: "reduce",
    });
}
