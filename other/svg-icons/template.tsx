import type { SVGAttributes, SVGProps } from 'react';
// eslint-disable-next-line import/no-unresolved
import iconsSpriteHref from './icons-sprite.svg';

export { iconsSpriteHref };

export function Icon({
  name,
  size = '1em',
  ...props
}: SVGProps<SVGSVGElement> & {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore for the template only (the built output will include the IconName type)
  name: IconName;
  size?: SVGAttributes<SVGSVGElement>['width'];
}) {
  return (
    <svg width={size} height={size} {...props}>
      <use href={`${iconsSpriteHref}#${name}`} />
    </svg>
  );
}
