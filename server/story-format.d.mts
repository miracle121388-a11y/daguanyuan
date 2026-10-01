export const reviewCategories: readonly string[];
export const reviewSchema: any;
export function continuationSchema(operation: string, payload: any): any;
export function schemaIssues(schema: any, value: unknown, path?: string): string[];
export function continuationIssues(operation: string, result: unknown, payload: any): string[];
export function parseModelObject(content: unknown): Record<string, unknown>;
