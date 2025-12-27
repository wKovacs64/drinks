import { Icon } from '#/app/icons/icon';

export function NoSearchTerm() {
  return (
    <section className="text-center">
      <Icon
        name="ic-baseline-arrow-upward"
        aria-label="Arrow Pointing Up"
        className="text-burnt-orange my-[10vh] inline h-[20vh] w-[20vh]"
      />
      <p className="my-5 text-gray-100 md:text-xl">
        Search all drinks by ingredient or description!
      </p>
    </section>
  );
}
