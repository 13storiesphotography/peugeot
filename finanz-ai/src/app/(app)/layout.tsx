import { redirect } from "next/navigation";
import { getDemoSession } from "@/lib/auth/demo-session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDemoSession();
  if (!session) {
    redirect("/login");
  }
  return children;
}
