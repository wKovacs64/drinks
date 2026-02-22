# Changelog

## [4.1.0](https://github.com/wKovacs64/drinks/compare/v4.0.0...v4.1.0) (2026-02-22)


### Features

* add surrogate key caching to search results ([#266](https://github.com/wKovacs64/drinks/issues/266)) ([786249a](https://github.com/wKovacs64/drinks/commit/786249a3fdc9a271526685e7f09720939ca3b23e))
* **admin:** show createdAt/updatedAt ([#260](https://github.com/wKovacs64/drinks/issues/260)) ([d03f446](https://github.com/wKovacs64/drinks/commit/d03f446d66de68e4268749634bac286b921514da))
* publish status ([#261](https://github.com/wKovacs64/drinks/issues/261)) ([2f59ece](https://github.com/wKovacs64/drinks/commit/2f59eceb87ff90f610c1dc59b21b11d762eca2f7))


### Bug Fixes

* return 404 for unpublished drinks ([#264](https://github.com/wKovacs64/drinks/issues/264)) ([97c9fe1](https://github.com/wKovacs64/drinks/commit/97c9fe1a5accd5ec78899c461540d79c7b200a39))
* run drizzle migrations automatically on deploy ([#262](https://github.com/wKovacs64/drinks/issues/262)) ([d2bf519](https://github.com/wKovacs64/drinks/commit/d2bf519e3a710440bbf89be710bca4103ef33b26))
* targeted surrogate purges + reduce 404 TTL ([#265](https://github.com/wKovacs64/drinks/issues/265)) ([e301c85](https://github.com/wKovacs64/drinks/commit/e301c85b3cddc6cb84218f1f482c96ec8a211cee))

## [4.0.0](https://github.com/wKovacs64/drinks/compare/v3.7.1...v4.0.0) (2026-02-16)


### ⚠ BREAKING CHANGES

* migrate from Contentful to our own local mini-CMS ([#254](https://github.com/wKovacs64/drinks/issues/254))

### Features

* migrate from Contentful to our own local mini-CMS ([#254](https://github.com/wKovacs64/drinks/issues/254)) ([656f4ee](https://github.com/wKovacs64/drinks/commit/656f4ee979e9d2ac8f7c6158575c35bbaf2d3d6d))

## [3.7.1](https://github.com/wKovacs64/drinks/compare/v3.7.0...v3.7.1) (2026-01-18)


### Bug Fixes

* **deploy:** run app as a non-root user ([#185](https://github.com/wKovacs64/drinks/issues/185)) ([d860a49](https://github.com/wKovacs64/drinks/commit/d860a49df3a1701937934470a125f8e4499bb642))
