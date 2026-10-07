import type { Handle, Props } from "remix/component";
const iconsSpriteUrl = "/icons-sprite.svg";
export type IconName =
  | "github"
  | "broken_glass"
  | "mdi-shield-lock-outline"
  | "mdi-login"
  | "ic-baseline-search"
  | "ic-baseline-chevron-right"
  | "ic-baseline-arrow-upward";
export function Icon(handle: Handle<Props<"svg"> & { name: IconName; size?: number | string }>) {
  return () => {
    const { name, size = "1em", ...props } = handle.props;
    return (
      <svg width={size} height={size} {...props}>
        <use href={`${iconsSpriteUrl}#${name}`} />
      </svg>
    );
  };
}
