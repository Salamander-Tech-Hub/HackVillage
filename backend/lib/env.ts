const POSTGRES_URL = /^postgres(ql)?:\/\//i;
const PLACEHOLDER_AUTH_SECRET = "replace-with-a-long-random-string";

export function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function getDatabaseUrl(): string | undefined {
  return readOptionalEnv("DATABASE_URL");
}

export function getConfiguredAuthSecret(): string | undefined {
  const secret = readOptionalEnv("AUTH_SECRET") ?? readOptionalEnv("NEXTAUTH_SECRET");
  if (!secret || secret === PLACEHOLDER_AUTH_SECRET) {
    return undefined;
  }
  return secret;
}

export type RuntimeEnvCheck = {
  ok: boolean;
  issues: string[];
};

export function validateRuntimeEnv(): RuntimeEnvCheck {
  const issues: string[] = [];
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    issues.push("DATABASE_URL is not configured");
  } else if (!POSTGRES_URL.test(databaseUrl)) {
    issues.push("DATABASE_URL must be a PostgreSQL connection string");
  }

  if (!getConfiguredAuthSecret()) {
    issues.push("NEXTAUTH_SECRET is not configured");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function logRuntimeEnvIssues(): void {
  const { issues } = validateRuntimeEnv();
  if (issues.length > 0) {
    console.warn(`[boot] runtime environment issues: ${issues.join("; ")}`);
  }
}

export const env = {
  databaseUrl: () => assertEnv("DATABASE_URL"),
  paystackSecretKey: () => assertEnv("PAYSTACK_SECRET_KEY"),
  paystackPublicKey: () => assertEnv("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"),
  smartContractAddress: () => assertEnv("SMART_CONTRACT_ADDRESS"),
  rpcUrl: () => assertEnv("RPC_URL"),
  nextAuthSecret: () => assertEnv("NEXTAUTH_SECRET"),
  nextAuthUrl: () => process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};
