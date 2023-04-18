// Adapted from: https://gist.github.com/ryanflorence/ec1849c6d690cfbffcb408ecd633e069
import type {
  LoaderFunction,
  V2_HtmlMetaDescriptor,
  V2_MetaFunction,
} from '@remix-run/node';

export const mergeMeta = <
  TLoader extends LoaderFunction | unknown = unknown,
  TParentsLoaders extends Record<string, LoaderFunction> = {},
>(
  overrideFn: V2_MetaFunction<TLoader, TParentsLoaders>,
  appendFn?: V2_MetaFunction<TLoader, TParentsLoaders>,
): V2_MetaFunction<TLoader, TParentsLoaders> => {
  return (arg) => {
    // meta from ancestor routes (will contain dupes from _app layout route)
    const ancestralMeta = arg.matches.reduce<Array<V2_HtmlMetaDescriptor>>(
      (descriptors, match) => descriptors.concat(match.meta || []),
      [],
    );

    // replace any parent meta with the same name or property with the override
    const overrides = overrideFn(arg);
    const allMeta = [...overrides, ...ancestralMeta];
    const mergedMeta = allMeta.filter((outer, outerIndex) => {
      const isDuplicateMeta = allMeta.find((inner, innerIndex) => {
        if (innerIndex >= outerIndex) return false;
        let isDuplicate = true;
        // 'title' and 'charSet' are special cases that automatically get
        // handled by defaulting isDuplicate to true
        ['name', 'property', 'httpEquiv'].forEach((k) => {
          // @ts-ignore
          if (inner[k] !== outer[k]) {
            isDuplicate = false;
          }
        });
        return isDuplicate;
      });
      return !isDuplicateMeta;
    });

    // append any additional meta
    if (appendFn) {
      return [...mergedMeta, ...appendFn(arg)];
    }

    return mergedMeta;
  };
};
