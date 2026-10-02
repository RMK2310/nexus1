/**
 * NEXUS Environment Validation
 *
 * Validates that all required environment variables are set at startup.
 * Fails fast with a clear error message instead of silently using insecure defaults.
 */

export interface NexusEnvConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGINS: string[];
}

const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

export function validateEnvironment(): NexusEnvConfig {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key] || process.env[key]!.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("\n╔════════════════════════════════════════════════════════════╗");
    console.error("║       NEXUS STARTUP FAILURE — MISSING CONFIGURATION       ║");
    console.error("╠════════════════════════════════════════════════════════════╣");
    for (const key of missing) {
      console.error(`║  ✘ ${key.padEnd(54)}║`);
    }
    console.error("╠════════════════════════════════════════════════════════════╣");
    console.error("║  Set these in your .env file or environment variables.    ║");
    console.error("║  NEXUS will NOT start with insecure default secrets.      ║");
    console.error("╚════════════════════════════════════════════════════════════╝\n");

    // In test environment, throw so tests can catch/mock. In production, hard exit.
    if (process.env.NODE_ENV === "test") {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    process.exit(1);
  }

  // Warn about weak JWT secrets in production
  const nodeEnv = (process.env.NODE_ENV || "development") as NexusEnvConfig["NODE_ENV"];
  if (nodeEnv === "production") {
    const accessSecret = process.env.JWT_ACCESS_SECRET!;
    const refreshSecret = process.env.JWT_REFRESH_SECRET!;

    if (accessSecret.length < 32 || refreshSecret.length < 32) {
      console.error("\n[NEXUS SECURITY] JWT secrets must be at least 32 characters in production.");
      console.error("[NEXUS SECURITY] Generate with: openssl rand -base64 32");
      process.exit(1);
    }

    if (
      accessSecret.includes("dev") ||
      accessSecret.includes("default") ||
      accessSecret.includes("12345") ||
      refreshSecret.includes("dev") ||
      refreshSecret.includes("default") ||
      refreshSecret.includes("12345")
    ) {
      console.error("\n[NEXUS SECURITY] JWT secrets appear to be development/default values.");
      console.error("[NEXUS SECURITY] Production deployment BLOCKED. Generate secure secrets.");
      process.exit(1);
    }
  }

  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : [];

  return {
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: nodeEnv,
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    CORS_ORIGINS: corsOrigins,
  };
}

// Singleton config — validated once at startup
let _config: NexusEnvConfig | null = null;

export function getConfig(): NexusEnvConfig {
  if (!_config) {
    _config = validateEnvironment();
  }
  return _config;
}
