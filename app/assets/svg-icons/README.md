# SVG Icons

This project uses [SVG sprites for icons](https://benadam.me/thoughts/react-svg-sprites/).

Place your raw SVG icons in this directory. They will be automatically added to the icons sprite
sheet at build time.

## Adding Icons

You can add icons manually, or you can add them from existing icon sets in the
[Sly CLI registry](https://sly-cli.fly.dev/). For example, to add the `filled` variant of the
`admin_panel_settings` icon from the
[Material Design Icons](https://marella.me/material-design-icons/demo/svg/) set, you would run:

```
npx sly add material-design-icons admin_panel_settings-filled --yes --overwrite
```

> The name format for the Material Design Icons set in the Sly CLI registry is
> `<base_icon_name>-<variant>`. Other icon sets may have different naming conventions.

When adding an icon manually, you'll probably want to make sure the `svg` element has the following
attributes (in addition to `viewBox` of course):

```xml
<svg stroke-width="0" stroke="currentColor" fill="currentColor">
```

## Using Icons

To use an icon, import the `Icon` component from `#/app/icons/icon` and pass the icon name to the
`name` prop:

```jsx
import { Icon } from '#/app/icons/icon';

function MyComponent() {
  return (
    <div>
      <Icon name="admin_panel_settings-filled" size={22} />
    </div>
  );
}
```
