import {z} from "zod";

export const SearchProfileLimitsSchema = z.object({
    maxUrls: z.number().int().positive().max(50),
    maxWebResults: z.number().int().positive().max(30),
    maxMaterialChars: z.number().int().positive(),
    maxPlanSteps: z.number().int().positive().max(20),
    maxReActStepsPerWorker: z.number().int().positive().max(20),
});

export const SearchProfileSchema = z.object({
    query: z.string(),
    kbIds: z.array(z.number().int().positive()),
    urls: z.array(z.string()),
    webSearch: z
        .object({
            enabled: z.boolean(),
            queryTemplate: z.string().optional(),
            maxResults: z.number().int().positive(),
        })
        .optional(),
    limits: SearchProfileLimitsSchema,
    contextStrategy: z.enum(["direct", "map_reduce", "rag_select"]),
});

export type SearchProfile = z.infer<typeof SearchProfileSchema>;

export const DEFAULT_SEARCH_PROFILE: SearchProfile = {
    query: "",
    kbIds: [],
    urls: [],
    webSearch: {enabled: false, maxResults: 5},
    limits: {
        maxUrls: 10,
        maxWebResults: 10,
        maxMaterialChars: 500_000,
        maxPlanSteps: 10,
        maxReActStepsPerWorker: 8,
    },
    contextStrategy: "direct",
};

export function parseSearchProfile(raw: unknown): SearchProfile {
    return SearchProfileSchema.parse(raw);
}

export function mergeSearchProfile(base: SearchProfile, patch: Partial<SearchProfile>): SearchProfile {
    return SearchProfileSchema.parse({...base, ...patch});
}
