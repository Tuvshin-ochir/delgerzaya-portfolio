import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, verifySession } from './auth';

export async function isAdmin(): Promise<boolean> {
  return verifySession((await cookies()).get(COOKIE)?.value);
}

/** Call at the top of every admin server action / route as a second line of defence after middleware. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}
