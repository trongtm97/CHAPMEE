/** Đọc biến môi trường mới, fallback tên CHAPCHAP_* cũ để không gãy deploy hiện tại. */
export function readEnv(primary: string, legacy?: string) {
  const value = process.env[primary]?.trim();
  if (value) {
    return value;
  }
  if (legacy) {
    return process.env[legacy]?.trim();
  }
  return undefined;
}

export function readEnvFlag(primary: string, legacy?: string) {
  const value = readEnv(primary, legacy);
  return value === "1" ? true : value === "0" ? false : undefined;
}
