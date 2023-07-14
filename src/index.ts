export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export * as PID from "./pid";
