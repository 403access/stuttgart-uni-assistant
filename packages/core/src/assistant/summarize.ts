export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function summarize(text: string, limit = 4): string[] {
  const useful = sentences(text).filter((sentence) => sentence.length > 30);
  return (useful.length ? useful : sentences(text)).slice(0, limit);
}

export function asBullets(lines: string[]): string {
  return lines.map((line) => `• ${line}`).join('\n');
}
