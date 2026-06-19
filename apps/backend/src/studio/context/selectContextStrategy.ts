import type {SearchProfile} from "../types/searchProfile.js";

export type ContextStrategy = SearchProfile["contextStrategy"];

export function selectContextStrategy(params: {
    searchProfile: SearchProfile;
    materialCount: number;
    totalChars: number;
}): ContextStrategy {
    const {searchProfile, materialCount, totalChars} = params;
    if (searchProfile.contextStrategy !== "direct") {
        return searchProfile.contextStrategy;
    }
    if (materialCount > 8 || totalChars > 24_000) {
        return "map_reduce";
    }
    return "direct";
}

export function shouldUseMapReduce(strategy: ContextStrategy, materialCount: number): boolean {
    return strategy === "map_reduce" || (strategy === "rag_select" && materialCount > 6);
}
