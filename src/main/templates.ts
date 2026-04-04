/**
 * Resolves template strings by replacing {placeholders} with data values.
 * Unknown placeholders are left as-is to avoid broken output.
 *
 * Example: resolve("Enemy {enemy} has {item}", { enemy: "Zed", item: "Duskblade" })
 *       -> "Enemy Zed has Duskblade"
 */
export function canResolve(
  template: string,
  data: Record<string, string>,
): boolean {
  const placeholders = template.matchAll(/\{(\w+)\}/g);
  for (const [, key] of placeholders) {
    if (!(key! in data)) return false;
  }
  return true;
}

export function resolveTemplate(
  template: string,
  data: Record<string, string>,
): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    return data[key] ?? match;
  });
}
