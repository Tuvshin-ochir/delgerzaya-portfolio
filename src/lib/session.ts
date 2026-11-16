import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, readSession } from './auth';
import { currentGen } from './password';

export async function isAdmin(): Promise<boolean> {
  const s = await readSession((await cookies()).get(COOKIE)?.value);
  return s !== null && s.gen === (await currentGen());
}

/** Call at the top of every admin server action / route as a second line of defence after middleware. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/admin/login');
}
