import type {IncomingMessage, ServerResponse} from 'node:http';
export function createDreamApi(env?: Record<string, string | undefined>, request?: typeof fetch, options?: {publicRoot?: string; pollMs?: number}): ((req: IncomingMessage, res: ServerResponse) => Promise<boolean>) & {close: () => Promise<void>};
export function imageType(bytes: Uint8Array): string;
export function checkedImageUrl(raw: string, hosts: string[]): Promise<string>;
