import type {IncomingMessage, ServerResponse} from 'node:http';
export function createSimulationApi(env?: Record<string, string | undefined>, request?: typeof fetch, options?: {corpusRoot?: string}): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
