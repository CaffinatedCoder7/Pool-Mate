/** Typed access to build-time environment. Browser-visible — never store secrets here. */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  useMockServices: import.meta.env.VITE_USE_MOCK_SERVICES !== 'false',
  isDev: import.meta.env.DEV,
} as const;
