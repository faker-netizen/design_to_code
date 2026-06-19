export function studioLog(event: string, payload: Record<string, unknown>): void {
    console.log(`[studio] ${event}`, JSON.stringify(payload));
}
