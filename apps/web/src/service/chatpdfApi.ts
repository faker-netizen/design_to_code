import axios from "axios";
import http from "@/service/request.ts";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import type {PdfSummaryPayload} from "@/service/chatpdfTypes.ts";

const SSE_EVENT_PREFIX_LEN = 6;
const SSE_DATA_PREFIX_LEN = 5;

export type ChatPdfDocument = {
    id: number;
    user_id: number;
    title: string;
    file_path?: string | null;
    file_type?: string | null;
    page_count: number | null;
    parse_status: string;
    created_at: string;
    updated_at: string;
};

async function parseBlobError(blob: Blob): Promise<string> {
    try {
        const text = await blob.text();
        const parsed = JSON.parse(text) as {error?: string; message?: string};
        return parsed.error || parsed.message || text.slice(0, 200);
    } catch {
        return "无法读取 PDF 文件";
    }
}

export async function listChatPdfDocuments(): Promise<ChatPdfDocument[]> {
    const res = await http.get<{success: boolean; documents: ChatPdfDocument[]}>(
        "/api/chatpdf/documents"
    );
    return res.documents ?? [];
}

export async function uploadChatPdf(file: File, title?: string): Promise<{documentId: number; pageCount: number}> {
    const form = new FormData();
    form.append("file", file);
    if (title?.trim()) form.append("title", title.trim());
    const res = await http.post<
        {success: boolean; documentId: number; pageCount: number},
        FormData
    >("/api/chatpdf/upload", form, {
        headers: {"Content-Type": "multipart/form-data"},
        timeout: 120000,
    });
    return {documentId: res.documentId, pageCount: res.pageCount};
}

export async function fetchChatPdfSummary(documentId: number): Promise<PdfSummaryPayload | null> {
    try {
        const res = await http.get<{success: boolean; summary: PdfSummaryPayload}>(
            `/api/chatpdf/documents/${documentId}/summary`
        );
        return res.summary;
    } catch {
        return null;
    }
}

async function fetchChatPdfBlobOnce(documentId: number): Promise<Blob> {
    const token = getAccessToken();
    const url = `${apiBase()}/api/chatpdf/documents/${documentId}/file`;
    const res = await axios.get<Blob>(url, {
        responseType: "blob",
        withCredentials: true,
        validateStatus: () => true,
        headers: token ? {Authorization: `Bearer ${token}`} : {},
    });

    if (res.status === 401) {
        throw new Error("__UNAUTHORIZED__");
    }

    const blob = res.data;
    const rawType = res.headers["content-type"];
    let type = "";
    if (typeof rawType === "string") type = rawType;
    else if (Array.isArray(rawType)) type = rawType.join(";");
    else type = String(blob.type ?? "");
    if (res.status >= 400 || !type.includes("pdf")) {
        throw new Error(await parseBlobError(blob));
    }
    if (blob.size < 1) {
        throw new Error("PDF 文件为空");
    }
    return blob;
}

export async function fetchChatPdfBlob(documentId: number): Promise<Blob> {
    try {
        return await fetchChatPdfBlobOnce(documentId);
    } catch (e) {
        if (e instanceof Error && e.message === "__UNAUTHORIZED__") {
            const ok = await refreshAccessToken();
            if (ok) return fetchChatPdfBlobOnce(documentId);
            throw new Error("未登录或登录已过期");
        }
        throw e;
    }
}

export type SummarizeSseHandlers = {
    onStatus?: (label: string) => void;
    onSummary?: (summary: PdfSummaryPayload) => void;
    onError?: (message: string) => void;
    onDone?: () => void;
};

export async function streamChatPdfSummarize(
    documentId: number,
    handlers: SummarizeSseHandlers,
    signal?: AbortSignal
): Promise<void> {
    const token = getAccessToken();
    const url = `${apiBase()}/api/chatpdf/documents/${documentId}/summarize`;
    const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        signal,
    });
    if (res.status === 401) {
        const ok = await refreshAccessToken();
        if (ok) return streamChatPdfSummarize(documentId, handlers, signal);
        throw new Error("未登录或登录已过期");
    }
    if (!res.ok || !res.body) {
        throw new Error(`总结请求失败 (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const dispatch = (block: string) => {
        const lines = block.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(SSE_EVENT_PREFIX_LEN).trim();
            else if (line.startsWith("data:")) data = line.slice(SSE_DATA_PREFIX_LEN).trim();
        }
        if (!data) return;
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "status" && typeof parsed.label === "string") handlers.onStatus?.(parsed.label);
        if (event === "summary" && parsed.summary) {
            handlers.onSummary?.(parsed.summary as PdfSummaryPayload);
        }
        if (event === "error" && typeof parsed.message === "string") handlers.onError?.(parsed.message);
        if (event === "done") handlers.onDone?.();
    };

    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
            if (part.trim()) dispatch(part);
        }
    }
    if (buffer.trim()) dispatch(buffer);
}
