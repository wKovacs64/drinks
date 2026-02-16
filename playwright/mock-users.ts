import type { AuthenticatedUser } from '#/app/auth/types';
import { TEST_ADMIN_USER } from './seed-data';

export const MOCK_ADMIN: AuthenticatedUser = {
  id: TEST_ADMIN_USER.id,
  email: TEST_ADMIN_USER.email,
  name: TEST_ADMIN_USER.name ?? null,
  avatarUrl: TEST_ADMIN_USER.avatarUrl ?? null,
  role: TEST_ADMIN_USER.role ?? 'admin',
};
