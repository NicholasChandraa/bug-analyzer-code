import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateRepositorySchema, UpdateRepositorySchema, SyncRepositorySchema } from "@restack/shared";
import { requireAuth, requireRole } from "../../infra/middlewares/require-auth.js";
import { repositoryService, RepositoryNotFoundError, DuplicateSlugError } from "./repository.service.js";
import { logger, type AppVariables } from "../../utils/logger.js";

/**
 * Routing layer for the Repository domain.
 * Semi-DDD rules: HTTP endpoints, input validation, dan response shaping only - business
 * logic (CRUD, git sync) didelegasikan ke repository.service.ts. Semua endpoint role-gated admin.
 */
const handleError = (c: Context<{ Variables: AppVariables }>, e: unknown, action: string) => {
    if (e instanceof RepositoryNotFoundError) return c.json({ error: e.message }, 404)
    if (e instanceof DuplicateSlugError) return c.json({ error: e.message }, 409)

    const reqLogger = c.get("logger") || logger
    reqLogger.error({ err: e instanceof Error ? e.message : String(e) }, action)
    return c.json({ error: "Internal server error" }, 500)
}

export const repositoryRoutes = new Hono<{ Variables: AppVariables }>()
    .post("/", requireAuth, requireRole("admin"), zValidator("json", CreateRepositorySchema), async (c) => {
        try {
            const body = c.req.valid("json")
            const repository = await repositoryService.registerRepository(body)
            return c.json({ repository }, 201)
        } catch (e) {
            return handleError(c, e, "Register repository failed")
        }
    })
    .get("/", requireAuth, requireRole("admin"), async (c) => {
        try {
            const repositories = await repositoryService.listRepositories()
            return c.json({ repositories })
        } catch (e) {
            return handleError(c, e, "List repositories failed")
        }
    })
    .get("/browse-dirs", requireAuth, requireRole("admin"), async (c) => {
        const targetPath = c.req.query("path")
        try {
            const result = await repositoryService.browseDirectories(targetPath)
            return c.json(result)
        } catch (e) {
            return c.json({ error: e instanceof Error ? e.message : "Failed to browse directories" }, 400)
        }
    })
    .get("/sync/last", requireAuth, requireRole("admin"), async (c) => {
        const repositoryIdParam = c.req.query("repositoryId")
        const repositoryId = repositoryIdParam ? Number(repositoryIdParam) : undefined
        if (repositoryIdParam && Number.isNaN(repositoryId)) return c.json({ error: "Invalid repositoryId" }, 400)

        try {
            const log = await repositoryService.getLastCodebaseSync(repositoryId)
            return c.json({ log })
        } catch (e) {
            return handleError(c, e, "Get last codebase sync failed")
        }
    })
    .post("/sync", requireAuth, requireRole("admin"), zValidator("json", SyncRepositorySchema), async (c) => {
        const user = c.get("user")
        if (!user) return c.json({ error: "Unauthorized" }, 401)

        try {
            const body = c.req.valid("json")
            const logs = await repositoryService.syncRepository(Number(user.sub), body.repositoryId)
            return c.json({ logs })
        } catch (e) {
            return handleError(c, e, "Sync repository failed")
        }
    })
    .get("/:id", requireAuth, requireRole("admin"), async (c) => {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid repository id" }, 400)

        try {
            const repository = await repositoryService.getRepositoryDetail(id)
            return c.json({ repository })
        } catch (e) {
            return handleError(c, e, "Get repository detail failed")
        }
    })
    .put("/:id", requireAuth, requireRole("admin"), zValidator("json", UpdateRepositorySchema), async (c) => {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid repository id" }, 400)

        try {
            const body = c.req.valid("json")
            const repository = await repositoryService.updateRepository(id, body)
            return c.json({ repository })
        } catch (e) {
            return handleError(c, e, "Update repository failed")
        }
    })
    .delete("/:id", requireAuth, requireRole("admin"), async (c) => {
        const id = Number(c.req.param("id"))
        if (Number.isNaN(id)) return c.json({ error: "Invalid repository id" }, 400)

        try {
            await repositoryService.deleteRepository(id)
            return c.body(null, 204)
        } catch (e) {
            return handleError(c, e, "Delete repository failed")
        }
    })
