// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exists = (json: any, key: string): boolean => {
  const value = json[key]
  return value !== null && value !== undefined
}
