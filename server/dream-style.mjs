export const styleVersion = 'honglou-silk-v1';
export const styleName = '梦绢';
export const negativePrompt = [
  'photorealistic photography', '3D render', 'CGI', 'plastic skin', 'glossy skin', 'porcelain skin',
  'glass-like eyes', 'anime face', 'kawaii', 'modern Chinese fantasy illustration', 'xianxia', 'wuxia poster',
  'fantasy armor', 'cinematic rim lighting', 'HDR', 'bloom', 'strong bokeh', 'teal-orange grading',
  'glossy silk', 'excessive gold decoration', 'poster composition', 'symmetrical idol portrait',
  'modern objects', 'text', 'logo', 'watermark', 'extra fingers', 'duplicate people',
].join(', ');

export function envBoolean(value, fallback) {
  return typeof value === 'string' && /^(true|false)$/i.test(value.trim()) ? value.trim().toLowerCase() === 'true' : fallback;
}
export function renderingSettings(env) {
  // Extension fields are opt-in by a known protocol; generic Images endpoints
  // get ordinary fields and the same exclusions in the positive prompt.
  const dashscope = env.IMAGE_PROTOCOL === 'dashscope';
  const native = dashscope && envBoolean(env.IMAGE_NATIVE_PARAMETERS, true);
  const promptExtend = envBoolean(env.IMAGE_PROMPT_EXTEND, false), enableThinking = envBoolean(env.IMAGE_ENABLE_THINKING, true);
  const rawSeed = env.IMAGE_SEED?.trim();
  const configuredSeed = rawSeed && /^\d+$/.test(rawSeed) && Number(rawSeed) <= 2147483647 ? Number(rawSeed) : null;
  return {protocol: dashscope ? 'dashscope' : 'images', size: env.IMAGE_SIZE || '1536x1024',
    promptExtend, enableThinking, thinkingEffective: native ? promptExtend && enableThinking : null,
    nativeParameters: native, negativePromptTransport: native ? 'parameters.negative_prompt' : 'prompt-only',
    referencesEnabled: dashscope && envBoolean(env.IMAGE_REFERENCE, true), configuredSeed,
    quality: env.IMAGE_QUALITY || null, outputFormat: env.IMAGE_OUTPUT_FORMAT || null};
}
