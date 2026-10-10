# Changelog

## [5.1.0](https://github.com/wKovacs64/drinks/compare/v5.0.0...v5.1.0) (2026-10-10)


### Features

* add public drinks MCP integration ([#397](https://github.com/wKovacs64/drinks/issues/397)) ([eb16df6](https://github.com/wKovacs64/drinks/commit/eb16df6ea8821824057bf65060c5c75a67d89159))


### Bug Fixes

* discourage duplicate narration below Drink cards ([275139c](https://github.com/wKovacs64/drinks/commit/275139cd4d2355dc9172e41c384b52d142275a5f))
* ground MCP recipe explanations ([6522688](https://github.com/wKovacs64/drinks/commit/6522688b8b62472e63571199143fb8da04ffa145))
* ground MCP recipe explanations in drinks.fyi content ([#400](https://github.com/wKovacs64/drinks/issues/400)) ([6522688](https://github.com/wKovacs64/drinks/commit/6522688b8b62472e63571199143fb8da04ffa145))
* prefer exact Drink titles in MCP searches ([4da3f79](https://github.com/wKovacs64/drinks/commit/4da3f790374b2b5fa1fa28133a432f9b3bfbf05d))
* render Drink cards for MCP searches ([#402](https://github.com/wKovacs64/drinks/issues/402)) ([2891bb4](https://github.com/wKovacs64/drinks/commit/2891bb476c2211b6c5d931f283d1f4b5f32b8dff))
* stack MCP cards on narrow screens ([ddee530](https://github.com/wKovacs64/drinks/commit/ddee530f5abc17d30e586f698b978df9c506e6a3))
* stack MCP Drink cards on phones ([#401](https://github.com/wKovacs64/drinks/issues/401)) ([ddee530](https://github.com/wKovacs64/drinks/commit/ddee530f5abc17d30e586f698b978df9c506e6a3))

## [5.0.0](https://github.com/wKovacs64/drinks/compare/v4.2.5...v5.0.0) (2026-10-08)


### ⚠ BREAKING CHANGES

* rewrite in Remix v3 ([#386](https://github.com/wKovacs64/drinks/issues/386))

### Performance Improvements

* parallelize Remix tests and assert expected error logs ([7f1e0ff](https://github.com/wKovacs64/drinks/commit/7f1e0ff71911a786198fb8c15945fae7d5ce5099))
* reduce browser startup blocking and consolidate tests ([#389](https://github.com/wKovacs64/drinks/issues/389)) ([d97c57a](https://github.com/wKovacs64/drinks/commit/d97c57a206a15dec18b1312ec0b9d850fbb0cee6))
* reduce public gallery startup blocking ([#391](https://github.com/wKovacs64/drinks/issues/391)) ([b10d1ad](https://github.com/wKovacs64/drinks/commit/b10d1ad766142a56aa045d457bfe2eccb6cc9596))
* speed up Remix tests and clean up expected error output ([#393](https://github.com/wKovacs64/drinks/issues/393)) ([7f1e0ff](https://github.com/wKovacs64/drinks/commit/7f1e0ff71911a786198fb8c15945fae7d5ce5099))


### Code Refactoring

* rewrite in Remix v3 ([#386](https://github.com/wKovacs64/drinks/issues/386)) ([14bcb0f](https://github.com/wKovacs64/drinks/commit/14bcb0f8cdd575c791f03d449819925caec5531c))

## [4.2.5](https://github.com/wKovacs64/drinks/compare/v4.2.4...v4.2.5) (2026-08-26)


### Bug Fixes

* allow production action origin ([#377](https://github.com/wKovacs64/drinks/issues/377)) ([3545154](https://github.com/wKovacs64/drinks/commit/354515490e4a7b279a8dd9380fc0017826430411))

## [4.2.4](https://github.com/wKovacs64/drinks/compare/v4.2.3...v4.2.4) (2026-08-26)


### Bug Fixes

* log action origin mismatches ([#375](https://github.com/wKovacs64/drinks/issues/375)) ([633cbaa](https://github.com/wKovacs64/drinks/commit/633cbaad8d67db554deadec7c44d675cb55f2aed))

## [4.2.3](https://github.com/wKovacs64/drinks/compare/v4.2.2...v4.2.3) (2026-08-26)


### Bug Fixes

* restore production form submissions ([0b65a32](https://github.com/wKovacs64/drinks/commit/0b65a32a2f746897545431655fdd8fe0f17cc093))

## [4.2.2](https://github.com/wKovacs64/drinks/compare/v4.2.1...v4.2.2) (2026-07-27)


### Bug Fixes

* restore Fly deployment with better-sqlite3 v13 ([4282fe0](https://github.com/wKovacs64/drinks/commit/4282fe0388a69fc0e73a823b90c6c914ceec0bf1))

## [4.2.1](https://github.com/wKovacs64/drinks/compare/v4.2.0...v4.2.1) (2026-05-16)


### Bug Fixes

* disable pnpm's verifyDepsBeforeRun in Docker runtime layer ([#343](https://github.com/wKovacs64/drinks/issues/343)) ([fcb0c86](https://github.com/wKovacs64/drinks/commit/fcb0c86115893be8b103225f7a4ce32537f768ff))

## [4.2.0](https://github.com/wKovacs64/drinks/compare/v4.1.0...v4.2.0) (2026-03-31)


### Features

* allow admins to view unpublished drink detail pages ([#281](https://github.com/wKovacs64/drinks/issues/281)) ([94e8cf8](https://github.com/wKovacs64/drinks/commit/94e8cf8553b992df5c360ea891a70ef3921101ec))
* link drink titles in admin list to their public page ([#279](https://github.com/wKovacs64/drinks/issues/279)) ([35a9f96](https://github.com/wKovacs64/drinks/commit/35a9f96420b50b2db8e153d619f2a56a4546970f))


### Bug Fixes

* increase default height of notes textarea ([#280](https://github.com/wKovacs64/drinks/issues/280)) ([f8e1b12](https://github.com/wKovacs64/drinks/commit/f8e1b1297a168b2c3e0ef63c6e63bf87f9bf1131))
* prevent focus ring clipping in admin drink list ([#283](https://github.com/wKovacs64/drinks/issues/283)) ([4cab420](https://github.com/wKovacs64/drinks/commit/4cab4209f22b6ab5ffbd885f016264f5dd954a5b))

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
