import { Link, href } from 'react-router';
import { Icon } from '#/app/icons/icon';
import { backgroundImageStyles } from '#/app/styles/background-image';

export function NotFound() {
  return (
    <div className="bg-app-image flex flex-1 flex-col items-center justify-evenly bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat text-gray-100">
      <style dangerouslySetInnerHTML={{ __html: backgroundImageStyles }} />
      <p className="max-w-[23ch] text-center text-xl font-normal md:text-2xl md:font-light lg:text-4xl">
        Oops, this doesn&apos;t appear to be a tasty drink recipe!
      </p>
      <Icon name="broken_glass" className="text-burnt-orange my-[10vh] inline h-[20vh] w-[20vh]" />
      <Link
        to={href('/')}
        className="drinks-focusable border-b border-solid pb-1 hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] md:text-xl"
      >
        Back to Drinks
      </Link>
    </div>
  );
}
