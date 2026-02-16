import { startTransition, StrictMode } from 'react';
import { HydratedRouter } from 'react-router/dom';
import { hydrateRoot } from 'react-dom/client';
import { requestIdleCallbackShim } from './utils/request-idle-callback-shim';

requestIdleCallbackShim(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
