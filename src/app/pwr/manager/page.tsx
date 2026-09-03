import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ManagerDashboardClient from "@/components/pwr/manager/ManagerDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "B?ng Ði?u Hành Xu?ng - HomePro" };
export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const allowedRoles = ["ADMIN", "MANAGER", "HR"];
  if (!allowedRoles.includes(session.role)) redirect("/pwr/station");
  return <ManagerDashboardClient />;
}
