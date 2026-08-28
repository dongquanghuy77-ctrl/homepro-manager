import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { buildProjectReport } from "@/lib/pwr/project-reporting";
import PwrProjectReportClient from "@/components/pwr/reports/PwrProjectReportClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tien Do Du An - HomePro Manager" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProjectReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const report = await buildProjectReport(session.id);
  return <PwrProjectReportClient report={report} />;
}
