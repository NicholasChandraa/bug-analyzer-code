import type { AuthResponseDTO, LogoutResponseDTO, LoginRequestDTO, RegisterRequestDTO } from "@restack/shared"
import { client, unwrap } from "@/lib/api-client"

/**
 * Service API layer for the Auth domain.
 * Thin wrappers that perform API calls to the Hono backend endpoints.
 * 
 * Semi-DDD rules:
 * - Domain services (`domains/[feature]/services/*.api.ts`) handle only raw HTTP calls.
 * - Request and response structures are mapped using schemas shared from `@restack/shared`.
 */
export const authApi = {
  register: (data: RegisterRequestDTO) =>
    unwrap<AuthResponseDTO>(client.api.auth.register.$post({ json: data })),

  login: (data: LoginRequestDTO) =>
    unwrap<AuthResponseDTO>(client.api.auth.login.$post({ json: data })),

  logout: () =>
    unwrap<LogoutResponseDTO>(client.api.auth.logout.$post()),
}
