import type { SVGAttributes, SVGProps } from 'react';
import iconsSpriteHref from './icons-sprite.svg';
// @ts-ignore generated
import type { IconName } from './types';

export { iconsSpriteHref };

export function Icon({
  name,
  size = '1em',
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: SVGAttributes<SVGSVGElement>['width'];
}) {
  return (
    <svg width={size} height={size} {...props}>
      <use href={`${iconsSpriteHref}#${name}`} />
    </svg>
  );
}
