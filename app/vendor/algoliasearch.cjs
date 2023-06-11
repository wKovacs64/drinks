// types are not found when importing from 'algoliasearch/*' to ESM module, so
// we import from this CommonJS module wrapper instead (yeah, it's terrible)

export { default as algoliaSearch } from 'algoliasearch/lite';
