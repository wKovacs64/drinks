import type { SVGAttributes, SVGProps } from 'react';
import iconsSpriteUrl from './icons-sprite.svg';
// @ts-ignore generated
import type { IconName } from './types';

export { iconsSpriteUrl, type IconName };

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
      <use href={`${iconsSpriteUrl}#${name}`} />
    </svg>
  );
}
