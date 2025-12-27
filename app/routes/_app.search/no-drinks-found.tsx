import { Icon } from '#/app/icons/icon';

export function NoDrinksFound() {
  return (
    <section className="text-center">
      <Icon
        name="broken_glass"
        aria-label="Broken Glass"
        className="text-burnt-orange my-[10vh] inline h-[20vh] w-[20vh]"
      />
      <p className="my-5 text-gray-100 md:text-xl">No matching drinks found.</p>
    </section>
  );
}
