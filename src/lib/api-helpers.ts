import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { Role } from "@/types"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

/** Ambil session user, return null jika tidak ada */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null
  return session.user as SessionUser
}

/** Require auth — return {user} atau NextResponse 401 */
export async function requireAuth(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const user = await getSessionUser()
  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized", message: "Login diperlukan" },
        { status: 401 }
      ),
    }
  }
  return { user, error: null }
}

/** Require admin role */
export async function requireAdmin(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const result = await requireAuth()
  if (result.error) return result
  if (result.user.role !== "admin") {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Forbidden", message: "Hanya admin yang bisa mengakses" },
        { status: 403 }
      ),
    }
  }
  return result
}

/** Buat paginated response */
export function paginate(page: number, limit: number) {
  const take = Math.min(Math.max(limit, 1), 100)
  const skip = (Math.max(page, 1) - 1) * take
  return { take, skip }
}
