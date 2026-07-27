import path from "path"

export class PathBoundaryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PathBoundaryError"
  }
}

/**
 * Validates that a target file or subpath is strictly located inside the allowed repository local directory.
 * Prevents directory traversal attacks (e.g. `../../etc/passwd`).
 */
export function validatePathBoundary(targetPath: string, allowedRepoLocalPath: string): string {
  const absoluteAllowed = path.resolve(allowedRepoLocalPath)
  const absoluteTarget = path.isAbsolute(targetPath)
    ? path.resolve(targetPath)
    : path.resolve(absoluteAllowed, targetPath)

  // Normalize path separators to forward slashes for cross-platform comparison
  const normalizedAllowed = absoluteAllowed.replace(/\\/g, "/").toLowerCase()
  const normalizedTarget = absoluteTarget.replace(/\\/g, "/").toLowerCase()

  if (
    normalizedTarget !== normalizedAllowed &&
    !normalizedTarget.startsWith(normalizedAllowed.endsWith("/") ? normalizedAllowed : `${normalizedAllowed}/`)
  ) {
    throw new PathBoundaryError(
      `Access denied: Target path "${targetPath}" is outside the allowed repository boundary "${allowedRepoLocalPath}"`
    )
  }

  return absoluteTarget
}
