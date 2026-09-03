import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import WorkerManagementClient from "@/components/pwr/manager/WorkerManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Qu?n lý Th? - HomePro" };
export const dynamic = "force-dynamic";

export default async function PwrWorkersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const allowedRoles = ["ADMIN", "MANAGER", "HR"];
  if (!allowedRoles.includes(session.role)) redirect("/pwr/station");
  return <WorkerManagementClient />;
}
