export default function SkipNavLink({ contentId }: SkipNavLinkProps) {
  return (
    <a
      href={`#${contentId}`}
      className="drinks-focusable absolute -m-px h-px w-px overflow-hidden border-0 p-0 [clip:rect(0_0_0_0)] focus:fixed focus:top-4 focus:left-4 focus:z-[1] focus:h-auto focus:w-auto focus:bg-white focus:p-3 focus:text-black focus:[clip:auto]"
    >
      Skip to content
    </a>
  );
}

interface SkipNavLinkProps {
  contentId: string;
}
