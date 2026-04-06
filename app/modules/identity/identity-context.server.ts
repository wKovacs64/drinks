import { createContext, type RouterContextProvider } from "react-router";
import type { AuthenticatedUser } from "./identity";

export const userContext = createContext<AuthenticatedUser>();
export const optionalUserContext = createContext<AuthenticatedUser | undefined>(undefined);

export function getUserFromContext(context: Readonly<RouterContextProvider>): AuthenticatedUser {
  return context.get(userContext);
}

export function getOptionalUserFromContext(
  context: Readonly<RouterContextProvider>,
): AuthenticatedUser | undefined {
  return context.get(optionalUserContext);
}
