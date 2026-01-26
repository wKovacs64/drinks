import type { User } from '#/app/db/schema';

export type AuthenticatedUser = {
  id: User['id'];
  email: User['email'];
  name: User['name'];
  avatarUrl: User['avatarUrl'];
  role: User['role'];
};
