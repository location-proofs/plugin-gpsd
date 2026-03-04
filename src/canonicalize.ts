
/**
 * Deterministic JSON serialization with sorted keys.
 * Ensures sign() and verify() produce identical payloads
 * regardless of property insertion order after deserialization.
 */
export function canonicalize(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce<Record<string, unknown>>((sorted, k) => {
          sorted[k] = (value as Record<string, unknown>)[k];
          return sorted;
        }, {});
    }
    return value;
  });
}
