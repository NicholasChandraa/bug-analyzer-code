import pino from "pino"
import { env } from "../config/env.js"

/**
 * Global logger client.
 * Configured using `pino`. Automatically toggles logging verbosity (info vs debug)
 * and formats stdout output using `pino-pretty` during local development.
 */
const level = env.NODE_ENV === "production" ? "info" : "debug"

let loggerInstance: pino.Logger

if (env.LOG_FILE_PATH) {
  // If a log file path is provided, stream to both stdout (console) and the file
  const streams = [
    { stream: process.stdout },
    { stream: pino.destination({ dest: env.LOG_FILE_PATH, sync: false }) }
  ]
  loggerInstance = pino({ level }, pino.multistream(streams))
} else {
  // Otherwise default to standard stdout (with pretty formatting in local development)
  loggerInstance = pino({
    level,
    transport:
      env.NODE_ENV === "production"
        ? undefined
        : { target: "pino-pretty", options: { colorize: true } },
  })
}

export const logger = loggerInstance


import type { Logger } from "pino"
import type { AuthTokenPayload } from "../domains/auth/auth.types.js"

export type AppVariables = {
  requestId: string
  logger: Logger
  user?: AuthTokenPayload
}

