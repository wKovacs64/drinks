export default function Nav({ children }: { children: React.ReactNode }) {
  return (
    <nav className="mb-6 px-4 text-gray-100 sm:mb-8 sm:p-0">{children}</nav>
  );
}
