import { kebabCase } from 'lodash-es';
import type { EnhancedDrink } from '~/types';
import { Tag } from '~/tags/tag';
import { TagLink } from '~/tags/tag-link';

export function DrinkDetails({ drink }: { drink: EnhancedDrink }) {
  return (
    <section className="bg-gray-100 p-8 text-xl leading-tight xl:leading-snug">
      {drink.notes && (
        <div
          className="[&_a]:ease-default mb-4 lg:mb-8 [&_a]:border-b [&_a]:border-solid [&_a]:border-orange-400 [&_a]:transition-shadow [&_a]:hover:border-b-yellow-900 [&_a]:focus:border-b-yellow-900 [&_a]:focus-visible:ring-3 [&_a]:focus-visible:outline-hidden [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_h4]:mb-4 [&_h5]:mb-4 [&_h6]:mb-4 [&_p]:my-5 [&_ul]:ml-4 [&_ul]:list-[square] [&_ul]:pl-4 [&_ul]:leading-tight [&_ul>li]:mb-5"
          dangerouslySetInnerHTML={{
            __html: drink.notes,
          }}
        />
      )}
      {drink.tags && (
        <div className="flex flex-wrap border-t border-dotted border-t-stone-300 pt-4 lg:justify-end">
          {drink.tags.map((tag) => (
            <TagLink
              className="mt-4 mr-4 ml-0 leading-tight lg:mr-0 lg:ml-4"
              aria-label={`Find all drinks containing ${tag}`}
              to={`/tags/${kebabCase(tag)}`}
              key={tag}
            >
              <Tag className="p-2 text-sm leading-tight font-normal lg:text-base lg:leading-tight lg:font-light">
                {tag}
              </Tag>
            </TagLink>
          ))}
        </div>
      )}
    </section>
  );
}
