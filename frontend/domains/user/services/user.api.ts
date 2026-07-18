import type { AuthUser, UpdateProfileInput } from "@restack/shared"
import { client, unwrap } from "@/lib/api-client"

/**
 * Service API layer for the User domain.
 * Thin wrappers that perform API calls to the Hono backend endpoints.
 * 
 * Semi-DDD rules:
 * - Domain services (`domains/[feature]/services/*.api.ts`) handle only raw HTTP calls.
 * - They must not contain UI state or react state; delegate that strictly to domain hooks.
 * - Request and response structures are mapped using schemas shared from `@restack/shared`.
 */
export const userApi = {
  me: () =>
    unwrap<{ user: AuthUser }>(client.api.user.me.$get()),

  updateProfile: (data: UpdateProfileInput) =>
    unwrap<{ user: AuthUser }>(client.api.user.profile.$put({ json: data })),
}
