const stateValues = ['success', 'skipped', 'failure'] as const
type State = typeof stateValues[number]

export class TestDone {
  readonly id: number
  readonly time: string
  readonly state: State
  readonly error?: string
  readonly stackTrace?: string

  constructor({
    id,
    time,
    state,
    error,
    stackTrace
  }: {
    id: number
    time: string
    state: State
    error?: string
    stackTrace?: string
  }) {
    this.id = id
    this.time = time
    this.state = state
    this.error = error
    this.stackTrace = stackTrace
  }
  get stateIcon(): string {
    switch (this.state) {
      case 'success':
        return ':white_check_mark:'
      case 'skipped':
        return ':wavy_dash:'
    }
    return ':x:'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TestDoneFromJSON = (json: any): TestDone => {
  const id: number = json['testID']
  const time: string = json['time']
  const state = json['result'] === 'success' ? 'success' : 'failure'

  let error: string | undefined = json['error']
  if (error) {
    error = error?.split('\n').join('')
  }
  const stackTrace: string | undefined = json['stackTrace']

  return new TestDone({
    id,
    time,
    state,
    error,
    stackTrace
  })
}
