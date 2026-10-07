# SVG Icons

The asset preparation script combines the SVG files in this directory into
`public/icons-sprite.svg`. The native Remix `Icon` component references its symbols.

## Adding Icons

1. Download an Iconify icon with `pnpm exec add-icon mdi:home`, or place an SVG file in this
   directory. `add-icon.config.ts` sets the output directory. The filename without `.svg` becomes
   the symbol ID.
2. Add that ID to the `IconName` union in `app/ui/icons/public/icon.tsx`.
3. Run `pnpm build:styles` to regenerate the sprite. Development and test commands also run this step.

## Using Icons

```tsx
import { Icon } from "#/app/ui/icons/public/icon.tsx";

export function Example() {
  return () => <Icon name="github" size={22} aria-label="GitHub" />;
}
```
