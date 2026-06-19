import type {UIMessageStreamWriter} from "ai";
import type {SseEmitter} from "../services/chatStreamHelpers.js";

const ASSISTANT_TEXT_ID = "assistant-reply";

/** 将现有 SSE 事件桥接为 Vercel AI SDK UI Message Stream */
export function createUiStreamEmitter(writer: UIMessageStreamWriter): SseEmitter {
    let textStarted = false;

    const endTextIfNeeded = () => {
        if (!textStarted) return;
        writer.write({type: "text-end", id: ASSISTANT_TEXT_ID});
        textStarted = false;
    };

    return (event, data) => {
        switch (event) {
            case "meta":
                writer.write({type: "data-meta", data});
                break;
            case "skill":
                writer.write({type: "data-skill", data});
                break;
            case "status":
                writer.write({type: "data-status", data});
                break;
            case "sources":
                writer.write({type: "data-sources", data});
                break;
            case "token": {
                const delta = String(data.text ?? "");
                if (!delta) break;
                if (!textStarted) {
                    writer.write({type: "text-start", id: ASSISTANT_TEXT_ID});
                    textStarted = true;
                }
                writer.write({type: "text-delta", id: ASSISTANT_TEXT_ID, delta});
                break;
            }
            case "error":
                endTextIfNeeded();
                writer.write({type: "data-error", data});
                break;
            case "aborted":
                endTextIfNeeded();
                writer.write({type: "data-aborted", data});
                break;
            case "done":
                endTextIfNeeded();
                writer.write({type: "data-done", data});
                break;
            default:
                break;
        }
    };
}
