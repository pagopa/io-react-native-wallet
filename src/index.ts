import * as PID from "./pid";

export function multiply(a: number, b: number): Promise<number> {
  return Promise.resolve(a * b);
}

export { PID };
