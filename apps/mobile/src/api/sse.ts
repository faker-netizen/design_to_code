const SSE_EVENT_PREFIX = 6;
const SSE_DATA_PREFIX = 5;

function parseBlock(raw: string): {event: string; payload: string} {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(SSE_EVENT_PREFIX).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(SSE_DATA_PREFIX).replace(/^\s/, ""));
    }
    return {event, payload: dataLines.join("\n")};
}

export async function fetchSsePost(
    url: string,
    body: unknown,
    onEvent: (event: string, data: Record<string, unknown>) => void,
    options: {
        getToken: () => Promise<string | null>;
        refreshToken: () => Promise<boolean>;
        signal?: AbortSignal;
    }
): Promise<void> {
    const run = async (retried: boolean): Promise<void> => {
        const token = await options.getToken();
        const headers: Record<string, string> = {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: options.signal,
        });

        if (res.status === 401 && !retried) {
            const ok = await options.refreshToken();
            if (ok) return run(true);
            throw new Error("登录已过期，请重新登录");
        }

        if (!res.ok || !res.body) {
            throw new Error(`SSE 请求失败(${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            let sep: number;
            while ((sep = buffer.indexOf("\n\n")) >= 0) {
                const raw = buffer.slice(0, sep);
                buffer = buffer.slice(sep + 2);
                const {event, payload} = parseBlock(raw);
                if (!payload) continue;
                try {
                    onEvent(event, JSON.parse(payload) as Record<string, unknown>);
                } catch {
                    /* ignore */
                }
            }
        }
    };

    await run(false);
}
