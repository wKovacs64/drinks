export function getSurrogateKeyForTag(tag: string) {
  return tag.replaceAll(' ', '_');
}
