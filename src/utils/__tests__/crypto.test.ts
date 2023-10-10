import { deleteKey, generate } from "@pagopa/io-react-native-crypto";
import { useEphemeralKey } from "../crypto";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useEphemeralKey", () => {
  it("should delete key on failure", async () => {
    const failingFn = () => Promise.reject("fail");

    const p = useEphemeralKey(failingFn);

    await expect(p).rejects.toEqual("fail");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete key on success", async () => {
    const fn = () => Promise.resolve("ok");

    const result = await useEphemeralKey(fn);

    expect(result).toBe("ok");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete only after the procedure has ended", async () => {
    let a: number, b: number;
    const fn = () =>
      new Promise((ok) => setTimeout((_) => ok((a = Date.now())), 1000));

    (deleteKey as jest.Mock).mockImplementationOnce(
      (_) => new Promise((ok) => setTimeout(() => ok((b = Date.now())), 100))
    );

    await useEphemeralKey(fn);

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);

    expect(a).toBeLessThan(b);
  });
});
