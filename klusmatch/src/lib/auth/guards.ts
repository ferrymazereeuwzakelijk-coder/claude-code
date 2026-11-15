import { redirect } from 'next/navigation';
import { currentUser, type Role, type SessionUser } from './session';

/** For pages and server actions: redirects to login when unauthenticated, or home when the role is wrong. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect('/inloggen');
  if (roles.length && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  return role === 'admin' ? '/admin' : role === 'contractor' ? '/vakman' : '/klant';
}
