import { Icon } from '~/icons/icon';

export default function NoDrinksFound() {
  return (
    <section className="text-center">
      <Icon
        name="broken_glass"
        aria-label="Broken Glass"
        className="my-[10vh] inline h-[20vh] w-[20vh] text-burnt-orange"
      />
      <p className="my-5 text-gray-100 md:text-xl">No matching drinks found.</p>
    </section>
  );
}
