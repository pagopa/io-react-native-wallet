jest.mock("expo/src/winter/ImportMetaRegistry", () => ({
  ImportMetaRegistry: {
    get url() {
      return null;
    },
  },
}));

// Expo SDK 55+ installs lazy winter-runtime globals (fetch, URL, etc.) that
// require files Jest treats as "outside of the scope of the test code" in a
// monorepo. Replace them with the runtime's own globals so the lazy getters
// never fire during tests.
const defineGlobal = (name: PropertyKey, value: unknown) => {
  try {
    Object.defineProperty(global, name, {
      configurable: true,
      value,
      writable: true,
    });
  } catch {
    // Ignore environments that don't allow redefining these globals.
  }
};
defineGlobal("fetch", globalThis.fetch);
defineGlobal("Headers", globalThis.Headers);
defineGlobal("Request", globalThis.Request);
defineGlobal("Response", globalThis.Response);
defineGlobal("FormData", globalThis.FormData);
defineGlobal("URL", globalThis.URL);
defineGlobal("URLSearchParams", globalThis.URLSearchParams);

if (typeof global.structuredClone === "undefined") {
  global.structuredClone = (object) => JSON.parse(JSON.stringify(object));
}
