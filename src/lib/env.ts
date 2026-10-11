import { z } from "zod";

/**
 * Frontend environment schema. Only VITE_-prefixed variables reach the browser,
 * so this module must never describe secrets.
 */
const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .min(1)
    .default("/api/v1")
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "must be a relative path starting with '/' or an http(s) URL",
    }),
  /**
   * Serve demo data from src/mocks instead of the API. Defaults to true while the
   * backend endpoints in TEAM_PLAN_ONE_NIGHT.md §5 are being built.
   */
  VITE_USE_MOCKS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Validates a raw environment record. Error messages name the variable but never
 * echo its value, so misconfigured values are not written to logs or the UI.
 */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid frontend configuration: ${problems}`);
  }
  return result.data;
}

export const env: AppEnv = parseEnv(import.meta.env);
