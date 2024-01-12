import { parse } from 'node-html-parser';
import type { Transformer } from '@sly-cli/sly';

/**
 * Customizes the SVG for our needs.
 */
const transform: Transformer = async (input) => {
  const root = parse(input);
  const svg = root.querySelector('svg');
  if (!svg) throw new Error('No SVG element found');

  svg.removeAttribute('height');
  svg.removeAttribute('width');

  svg.setAttribute('stroke-width', '0');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('stroke', 'currentColor');

  return root.toString().trim();
};

export default transform;
