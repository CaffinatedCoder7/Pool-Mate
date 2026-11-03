/** Joins truthy class names. Later classes do not override earlier ones — avoid conflicting utilities. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
