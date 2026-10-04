import type { Handle, RemixNode } from "remix/component";
import { Nav } from "./nav.tsx";
import { NavLink } from "./nav-link.tsx";
import { NavDivider } from "./nav-divider.tsx";
export type Breadcrumb = { title: RemixNode; href?: string };
export function Breadcrumbs(handle: Handle<{ breadcrumbs: Breadcrumb[] }>) {
  return () => (
    <Nav>
      <ul>
        {handle.props.breadcrumbs.map((crumb, index) => (
          <li key={index} className="inline">
            {crumb.href ? <NavLink to={crumb.href}>{crumb.title}</NavLink> : crumb.title}
            {index < handle.props.breadcrumbs.length - 1 ? <NavDivider /> : null}
          </li>
        ))}
      </ul>
    </Nav>
  );
}
