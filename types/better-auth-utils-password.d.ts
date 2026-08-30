declare module "@better-auth/utils/password" {
  export function hashPassword(password: string): Promise<string>;
}
