import { routes } from "#/app/routes.ts";
import { Icon } from "#/app/ui/icons/public/icon.tsx";
export function NotFound() {
  return () => (
    <div className="flex flex-1 flex-col items-center justify-evenly bg-neutral-800 bg-[url('./images/background-768.jpg')] bg-cover bg-fixed bg-center bg-no-repeat text-gray-100 lg:bg-[url('./images/background-2078.jpg')]">
      <p className="max-w-[23ch] text-center text-xl font-normal md:text-2xl md:font-light lg:text-4xl">
        Oops, this doesn&apos;t appear to be a tasty drink recipe!
      </p>
      <Icon name="broken_glass" className="text-burnt-orange my-[10vh] inline h-[20vh] w-[20vh]" />
      <a
        href={routes.home.href()}
        className="drinks-focusable border-b border-solid pb-1 hover:shadow-[inset_0_-2px_0_0] focus-visible:shadow-[inset_0_-2px_0_0] md:text-xl"
      >
        Back to Drinks
      </a>
    </div>
  );
}
