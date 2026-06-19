import {apiFetch} from "@/api/client";

export type KnowledgeBase = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export type KnowledgeBaseDocument = {
    id: number;
    title: string;
    file_type?: string | null;
    indexing_status: string;
    summary_status: string;
    created_at: string;
};

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = await apiFetch<{success: boolean; knowledgeBases: KnowledgeBase[]}>(
        "/api/knowledge-bases"
    );
    return res.knowledgeBases ?? [];
}

export async function listDocuments(kbId: number): Promise<KnowledgeBaseDocument[]> {
    const res = await apiFetch<{success: boolean; documents: KnowledgeBaseDocument[]}>(
        `/api/knowledge-bases/${kbId}/documents`
    );
    return res.documents ?? [];
}

export async function createKnowledgeBase(name: string): Promise<number> {
    const res = await apiFetch<{success: boolean; id: number}>(
        "/api/knowledge-bases",
        {method: "POST", body: {name}}
    );
    return res.id;
}
