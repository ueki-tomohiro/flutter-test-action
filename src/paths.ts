import path from 'path'
import {fileURLToPath} from 'url'

export interface PathContext {
  // Absolute path of the repository checkout (GITHUB_WORKSPACE).
  workspace: string
  // Directory where flutter test ran, relative to the workspace.
  workingDirectory: string
}

export function createPathContext(
  workingDirectory: string,
  workspace = process.env['GITHUB_WORKSPACE'] || process.cwd()
): PathContext {
  const absolute = path.resolve(workspace, workingDirectory || '.')
  return {
    workspace,
    workingDirectory: toPosix(path.relative(workspace, absolute))
  }
}

/**
 * Converts a path or URL from the machine output or lcov.info into a path
 * relative to the repository root. Returns undefined for locations outside of
 * the repository, such as `package:flutter_test/...`.
 */
export function toRepoPath(
  location: string,
  context: PathContext
): string | undefined {
  let filePath = location
  if (location.startsWith('file://')) {
    filePath = fileURLToPath(location)
  } else if (
    /^[a-z][a-z0-9+.-]*:/iu.test(location) &&
    !isWindowsPath(location)
  ) {
    return undefined
  }

  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(context.workspace, context.workingDirectory, filePath)
  const relative = path.relative(context.workspace, absolute)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return undefined
  }
  return toPosix(relative)
}

/**
 * Path for display: relative to the repository when possible, otherwise the
 * original value without the file:// scheme.
 */
export function displayPath(location: string, context: PathContext): string {
  const repoPath = toRepoPath(location, context)
  if (repoPath) return repoPath
  return location.startsWith('file://') ? fileURLToPath(location) : location
}

function isWindowsPath(value: string): boolean {
  return /^[a-z]:[\\/]/iu.test(value)
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}
