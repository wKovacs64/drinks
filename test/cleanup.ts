import type { TestContext } from "remix/test";

export function afterAwaitingCleanup(testContext: TestContext, cleanup: () => Promise<void>) {
  const registerCleanupThatRemixTestAwaits: (callback: () => Promise<void>) => void =
    testContext.after.bind(testContext);

  registerCleanupThatRemixTestAwaits(cleanup);
}
