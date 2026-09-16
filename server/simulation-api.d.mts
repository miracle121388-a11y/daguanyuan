import type {IncomingMessage, ServerResponse} from 'node:http';
export function createSimulationApi(env?: Record<string, string | undefined>, request?: typeof fetch): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;
