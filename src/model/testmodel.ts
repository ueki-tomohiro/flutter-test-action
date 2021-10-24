const stateValues = ['success', 'skipped', 'failure'] as const
type State = typeof stateValues[number]

export class TestModel {
  id?: number
  name?: string
  error?: string
  message?: string
  state?: State

  constructor(
    id?: number,
    name?: string,
    error?: string,
    message?: string,
    state?: State
  ) {
    this.id = id
    this.name = name
    this.error = error
    this.message = message
    this.state = state
  }
}
