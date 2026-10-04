import type { Handle, RemixNode } from "remix/component";
import { Header } from "./core/header.tsx";
import { Footer } from "./core/footer.tsx";
import { SkipNavLink } from "./core/skip-nav-link.tsx";
import { Breadcrumbs, type Breadcrumb } from "./navigation/breadcrumbs.tsx";
export function Gallery(handle: Handle<{ children: RemixNode; breadcrumbs: Breadcrumb[] }>) {
  return () => (
    <div className="bg-app-image flex min-h-screen flex-col bg-neutral-800 bg-cover bg-fixed bg-center bg-no-repeat">
      <SkipNavLink contentId="main" />
      <Header />
      <div className="flex flex-1 flex-col gap-6 py-4 sm:w-104 sm:gap-8 sm:self-center sm:py-8 lg:w-full lg:max-w-240 xl:max-w-7xl">
        <Breadcrumbs breadcrumbs={handle.props.breadcrumbs} />
        <main id="main">{handle.props.children}</main>
      </div>
      <Footer />
    </div>
  );
}
