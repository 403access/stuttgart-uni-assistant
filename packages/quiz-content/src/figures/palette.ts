import type { DiagramTone } from '../types.ts';

/**
 * Fixed illustration palette for the anatomical figures. The paper look is
 * intentional in both themes, so a figure stays readable on a dark screen.
 * It lives next to the geometry (not in the UI package) because the static
 * website renders the same figures from the same data.
 */
export const diagramPalette: Record<DiagramTone, { fill: string; stroke: string }> = {
  blue: { fill: '#DBE8F5', stroke: '#7C9BB8' },
  violet: { fill: '#E7DDF3', stroke: '#9C86C0' },
  rose: { fill: '#F7DDE3', stroke: '#C98698' },
  tongue: { fill: '#EF9AA6', stroke: '#B95B6B' },
  sand: { fill: '#F3D8AD', stroke: '#B98B47' },
  bone: { fill: '#F6E3C4', stroke: '#B98B47' },
  teeth: { fill: '#FFFFFF', stroke: '#9AA7B4' },
  larynx: { fill: '#CFDCE8', stroke: '#5E7F9C' },
  cords: { fill: '#5E7F9C', stroke: '#243447' },
  trachea: { fill: '#E3EDF6', stroke: '#5E7F9C' },
  lip: { fill: '#E98A9B', stroke: '#B95B6B' },
  mouth: { fill: '#7D3F4A', stroke: '#7D3F4A' },
};

export function diagramTone(tone: DiagramTone): { fill: string; stroke: string } {
  return diagramPalette[tone];
}
