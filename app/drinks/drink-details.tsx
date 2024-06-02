import { kebabCase } from 'lodash-es';
import type { EnhancedDrink } from '~/types';
import Tag from '~/tags/tag';
import TagLink from '~/tags/tag-link';

export default function DrinkDetails({ drink }: { drink: EnhancedDrink }) {
  return (
    <section className="bg-gray-100 p-8 text-xl leading-tight xl:leading-snug">
      {drink.notes && (
        <div
          className="mb-4 lg:mb-8 [&_a]:border-b [&_a]:border-solid [&_a]:border-orange-400 [&_a]:transition-shadow [&_a]:ease-default hover:[&_a]:border-b-yellow-900 focus:[&_a]:border-b-yellow-900 focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring [&_h1]:mb-4 [&_h2]:mb-4 [&_h3]:mb-4 [&_h4]:mb-4 [&_h5]:mb-4 [&_h6]:mb-4 [&_p]:my-5 [&_ul>li]:mb-5 [&_ul]:ml-4 [&_ul]:list-[square] [&_ul]:pl-4 [&_ul]:leading-tight"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: drink.notes,
          }}
        />
      )}
      {drink.tags && (
        <div className="flex flex-wrap border-t border-dotted border-t-stone-300 pt-4 lg:justify-end">
          {drink.tags.map((tag) => (
            <TagLink
              className="ml-0 mr-4 mt-4 leading-tight lg:ml-4 lg:mr-0"
              aria-label={`Find all drinks containing ${tag}`}
              to={`/tags/${kebabCase(tag)}`}
              key={tag}
            >
              <Tag className="p-2 text-sm font-normal leading-tight lg:text-base lg:font-light lg:leading-tight">
                {tag}
              </Tag>
            </TagLink>
          ))}
        </div>
      )}
    </section>
  );
}
