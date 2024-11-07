import { Icon } from '~/icons/icon';

export function Searching() {
  return (
    <section className="text-center">
      <Icon
        name="search-filled"
        aria-label="Magnifying Glass"
        className="my-[10vh] inline h-[20vh] w-[20vh] text-burnt-orange"
      />
      <p className="my-5 text-gray-100 md:text-xl">Searching . . .</p>
    </section>
  );
}
