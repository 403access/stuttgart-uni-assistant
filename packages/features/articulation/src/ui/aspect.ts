/** Width/height ratio of an SVG viewBox, so a container can keep its shape. */
export function aspectOf(viewBox: string): number {
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}
