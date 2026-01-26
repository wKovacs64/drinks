import { TEST_ADMIN_USER } from './seed-data';

// AuthenticatedUser type will be created in Phase 3 (Task 15)
// For now, define a compatible type inline
type MockAuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
};

export const MOCK_ADMIN: MockAuthenticatedUser = {
  id: TEST_ADMIN_USER.id,
  email: TEST_ADMIN_USER.email,
  name: TEST_ADMIN_USER.name ?? null,
  avatarUrl: TEST_ADMIN_USER.avatarUrl ?? null,
  role: TEST_ADMIN_USER.role ?? 'admin',
};
