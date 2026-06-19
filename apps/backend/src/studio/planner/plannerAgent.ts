import type {Plan} from "../types/plan.js";
import type {SearchProfile} from "../types/searchProfile.js";
import {DEFAULT_TEMPLATE_ID, resolvePlanFromTemplate} from "./planTemplates.js";

export async function resolvePlan(params: {
    templateId: string;
    userQuery: string;
    searchProfile: SearchProfile;
    materialTitles: string[];
    completedStepNames: string[];
    forceTemplate?: boolean;
}): Promise<Plan> {
    void params.userQuery;
    void params.searchProfile;
    void params.materialTitles;
    void params.completedStepNames;
    const templateId = params.templateId || DEFAULT_TEMPLATE_ID;
    if (params.forceTemplate) {
        return resolvePlanFromTemplate(templateId);
    }
    return resolvePlanFromTemplate(templateId);
}
