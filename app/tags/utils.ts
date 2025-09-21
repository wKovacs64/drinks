export function getSurrogateKeyForTag(tag: string) {
  return tag.replaceAll(' ', '_');
}

export function getTagFromSurrogateKey(surrogateKey: string) {
  return surrogateKey.replaceAll('_', ' ');
}
