import pino from 'pino'
import { getConfig } from '../config/index.js'

export const logger = pino({
  level: getConfig().LOG_LEVEL,
  transport:
    getConfig().NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
})

export type Logger = typeof logger
