import Debug from 'debug'

export {
  disable,
  enable,
  enabled,
} from 'debug'

// Create a new debugger for use anywhere
export const init = (namespace: string) => {
  const debug = Debug(namespace)

  /*
  // If this is running on a remote environment, then the default stderr output will be lost. Send it to the log service.
  if (!isLocal && logService) {
    debug.log = (...args: unknown[]) => {
      const message = typeof args[0] === 'string' ? args[0] : 'message'
      const logServiceArgs = typeof args[0] === 'string' ? args.slice(1) : args

      logService.write('debug', message, ...logServiceArgs)
    }
  }
  */

  return debug
}
