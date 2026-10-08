"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BANK_COOKIE, DEMO_COOKIE, GOALS_COOKIE } from "@/lib/auth/constants";

export async function startDemoSession() {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/dashboard");
}

export async function endDemoSession() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(BANK_COOKIE);
  jar.delete(GOALS_COOKIE);
  redirect("/");
}
