/** First value of an expo-router search param (repeated keys arrive as arrays). */
export function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}
