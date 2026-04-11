import { createCookie, createCookieSessionStorage, data, redirect } from "react-router";
import { getEnvVars } from "./env.server";

export type ToastMessage = {
  kind: "success" | "error" | "warning";
  message: string;
};

type ToastSessionData = Record<string, never>;
type ToastFlashData = {
  toast: ToastMessage;
};

let toastSessionStorage:
  | ReturnType<typeof createCookieSessionStorage<ToastSessionData, ToastFlashData>>
  | undefined;

function getToastSessionStorage() {
  if (!toastSessionStorage) {
    const { NODE_ENV, SESSION_SECRET } = getEnvVars();
    toastSessionStorage = createCookieSessionStorage<ToastSessionData, ToastFlashData>({
      cookie: createCookie("__toast", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secrets: [SESSION_SECRET],
        secure: NODE_ENV === "production",
      }),
    });
  }

  return toastSessionStorage;
}

export async function redirectWithToast(url: string, toast: ToastMessage) {
  const storage = getToastSessionStorage();
  const session = await storage.getSession();
  session.flash("toast", toast);

  return redirect(url, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function dataWithToast<T>(payload: T, toast: ToastMessage, init?: ResponseInit) {
  const storage = getToastSessionStorage();
  const session = await storage.getSession();
  session.flash("toast", toast);

  const headers = new Headers(init?.headers);
  headers.set("Set-Cookie", await storage.commitSession(session));

  return data(payload, {
    ...init,
    headers,
  });
}

export async function getToast(request: Request) {
  const storage = getToastSessionStorage();
  const session = await storage.getSession(request.headers.get("Cookie"));
  const toast = session.get("toast") ?? null;

  return {
    toast,
    headers: new Headers({
      "Set-Cookie": await storage.commitSession(session),
    }),
  };
}
