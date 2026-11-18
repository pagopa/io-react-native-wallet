interface PinRequest {
  reject: (reason: Error) => void;
  resolve: (pin: string) => void;
}

const listeners = new Set<(request: PinRequest) => void>();

/**
 * Ask the user for the Remote WSCD PIN through the {@link RemotePinPrompt} mounted in the app.
 * The PIN is never stored: it must be requested whenever it is needed.
 * @returns The PIN entered by the user
 * @throws If the user dismisses the prompt
 */
export const requestRemotePin = () =>
  new Promise<string>((resolve, reject) => {
    if (listeners.size === 0) {
      reject(new Error("No PIN prompt is available"));
    }
    listeners.forEach((listener) => listener({ reject, resolve }));
  });

/**
 * Subscribe to the PIN requests, to show the prompt.
 * @returns The function to unsubscribe
 */
export const subscribeToPinRequests = (
  listener: (request: PinRequest) => void,
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
