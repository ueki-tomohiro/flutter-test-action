export type TestStatus = 'success' | 'failure' | 'skipped'

export interface TestError {
  message: string
  stackTrace: string
  isFailure: boolean
}

export interface TestLocation {
  // file:// URL, package: URI or path as written in the machine output.
  url: string
  line?: number
}

export interface TestCase {
  id: number
  suiteId: number
  name: string
  groupName?: string
  location?: TestLocation
  status: TestStatus
  durationMs: number
  skipReason?: string
  errors: TestError[]
  prints: string[]
}

export interface TestSuite {
  id: number
  path: string
  platform: string
  tests: TestCase[]
  // Errors reported while loading the suite, such as compilation errors.
  loadErrors: TestError[]
}

export interface TestRun {
  suites: TestSuite[]
  // Wall-clock time reported by the `done` event.
  durationMs?: number
  // `success` of the `done` event. Undefined when the run was cut short.
  success?: boolean
}
