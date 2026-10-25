/**
 * ILIAS and C@MPUS share the university password. C@MPUS accepts the full
 * address; ILIAS expects only the part before the `@`.
 */
export function iliasAccountFrom(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const at = text.indexOf('@');
  return (at > 0 ? text.slice(0, at) : text).trim();
}
