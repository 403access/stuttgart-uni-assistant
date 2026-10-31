/**
 * The glottis. A closed pair of cords means voicing; an open gap means the air
 * passes without vibration.
 */
export function cordOutlines(voiced: boolean): string[] {
  if (voiced) return ['M626 748 L678 754 L678 762 L626 756 Z'];
  return ['M624 744 L678 752 L678 756 L624 748 Z', 'M624 762 L678 770 L678 774 L624 766 Z'];
}
