import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./app.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "node18",
});
