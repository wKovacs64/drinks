import { Icon } from '~/icons/icon';

export function Searching() {
  return (
    <section className="text-center">
      <Icon
        name="search-filled"
        aria-label="Magnifying Glass"
        className="text-burnt-orange my-[10vh] inline h-[20vh] w-[20vh]"
      />
      <p className="my-5 text-gray-100 md:text-xl">Searching . . .</p>
    </section>
  );
}
