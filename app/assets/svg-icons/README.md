# SVG Icons

This project uses [SVG sprites for icons](https://benadam.me/thoughts/react-svg-sprites/).

Place your raw SVG icons in this directory. They will be automatically added to the icons sprite
sheet at build time.

## Adding Icons

You can add icons manually, or you can add them from existing icon sets in the
[Iconify Framework](https://icon-sets.iconify.design/) via the
[`@wkovacs64/add-icon`](https://npm.im/@wkovacs64/add-icon/) CLI. For example, to add the `solid`
variant of the `wrench-screwdriver` icon from the `heroicons` set, you would run:

```
pnpm exec add-icon heroicons:wrench-screwdriver-solid
```

> The format for identifying an icon in the Iconify Framework is `<icon-set>:<icon-name>`. Colons
> don't make very good file name characters, so the `add-icon` command replaces them with hyphens,
> and that's how you'll reference the icon in your code (shown below).

## Using Icons

To use an icon, import the `Icon` component from `#/app/icons/icon` and pass the icon name to the
`name` prop:

```jsx
import { Icon } from '#/app/icons/icon';

function MyComponent() {
  return (
    <div>
      <Icon name="heroicons-wrench-screwdriver-solid" size={22} />
    </div>
  );
}
```
