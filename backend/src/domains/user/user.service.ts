import type { UserResponseDTO, UpdateProfileRequestDTO } from "@restack/shared"
import { userRepo } from "./user.repo.js"

export class UserNotFoundError extends Error {}

/**
 * Maps database user object into the public, safe schema shape.
 * Always filters out sensitive columns like password hashes.
 */
const toPublicUser = (user: { id: number; name: string; email: string; role: UserResponseDTO["role"] }): UserResponseDTO => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
})

/**
 * Service layer for the User domain.
 * Contains core business logic and validations.
 * 
 * Semi-DDD rules:
 * - `.service.ts` encapsulates business logic, mappings, and validations.
 * - It must never interact with the database client directly; always query through the `.repo.ts` layer.
 */
export const userService = {
  getProfile: async (id: number): Promise<UserResponseDTO> => {
    const user = await userRepo.findById(id)
    if (!user) throw new UserNotFoundError("User not found")
    return toPublicUser(user)
  },

  updateProfile: async (id: number, data: UpdateProfileRequestDTO): Promise<UserResponseDTO> => {

    // An empty body validates against UpdateProfileSchema (all fields optional) but would
    // reach db.update(...).set({}), which Drizzle/postgres reject — short-circuit to a no-op.
    if (Object.keys(data).length === 0) return userService.getProfile(id)

    const user = await userRepo.updateProfile(id, data)
    if (!user) throw new UserNotFoundError("User not found")
    return toPublicUser(user)
  },
}

