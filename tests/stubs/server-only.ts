// Vitest stub for the `server-only` package. The real npm module
// throws on import to prevent server-only code from being bundled
// into client components. In tests we know we're running server-
// side, so we replace it with this no-op via a vitest resolve.alias.
export {};
