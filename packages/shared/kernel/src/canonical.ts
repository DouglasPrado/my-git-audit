/**
 * JSON canônico: chaves ordenadas, sem espaço. É a base de todo hash do produto
 * (rawScanHash, factsHash, signalsHash, rubricHash) e, portanto, da definição de
 * reprodutibilidade em docs/rubric/rubric-v1.md §10.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = sortDeep(src[k]);
    return out;
  }
  return value;
}
