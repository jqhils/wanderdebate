import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export type AuthUser = {
  id: string
  email?: string
}

/**
 * Require an authenticated Supabase user from the request context.
 */
export async function requireAuthUser(event: H3Event): Promise<AuthUser> {
  const user = await serverSupabaseUser(event)

  if (!user?.sub) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required.',
    })
  }

  return {
    id: user.sub,
    email: user.email,
  }
}
