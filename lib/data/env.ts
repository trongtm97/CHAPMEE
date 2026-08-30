export function getPostgrestEnv() {
  return {
    url: process.env.POSTGREST_URL ?? "http://127.0.0.1:54321",
    anonKey: ""
  };
}
