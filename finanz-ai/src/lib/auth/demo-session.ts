import "server-only";
import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/auth/constants";

export { DEMO_COOKIE };

export type DemoSession = {
  mode: "demo";
  userId: string;
  displayName: string;
};

export async function getDemoSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const value = jar.get(DEMO_COOKIE)?.value;
  if (value !== "1") return null;
  return {
    mode: "demo",
    userId: "demo-user",
    displayName: "Demo",
  };
}

export async function requireDemoSession(): Promise<DemoSession> {
  const session = await getDemoSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
