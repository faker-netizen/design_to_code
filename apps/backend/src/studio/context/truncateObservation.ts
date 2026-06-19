/** Tool Observation 硬截断兜底（见 03-context-management.md §8.2） */

export const OBSERVATION_SNIPPET_MAX = 200;
export const OBSERVATION_KB_CHUNK_MAX = 400;
export const OBSERVATION_URL_PREVIEW_MAX = 800;
export const OBSERVATION_LOAD_MATERIAL_MAX = 4000;

export function truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}…`;
}

export function truncateKbChunk(content: string): string {
    return truncateText(content, OBSERVATION_KB_CHUNK_MAX);
}

export function truncateObservation(toolName: string, payload: string): string {
    switch (toolName) {
        case "kb_search":
            return truncateText(payload, OBSERVATION_KB_CHUNK_MAX * 3);
        case "url_fetch":
            return truncateText(payload, OBSERVATION_URL_PREVIEW_MAX);
        case "load_material":
            return truncateText(payload, OBSERVATION_LOAD_MATERIAL_MAX);
        default:
            return truncateText(payload, OBSERVATION_LOAD_MATERIAL_MAX);
    }
}
