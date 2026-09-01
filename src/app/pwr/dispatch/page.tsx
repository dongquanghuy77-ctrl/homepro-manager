import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import ManagerKanbanBoard from "@/components/pwr/manager/ManagerKanbanBoard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Điều phối sản xuất - HomePro" };
export const dynamic = "force-dynamic";

export default async function PwrDispatchPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/login");
  }

  // Phân quyền: Chỉ MANAGER hoặc ADMIN hoặc HR mới được vào
  const allowedRoles = ['ADMIN', 'MANAGER', 'HR'];
  if (!allowedRoles.includes(session.role)) {
    // Nếu là thợ, đẩy về màn hình station
    redirect("/pwr/station");
  }

  return <ManagerKanbanBoard />;
}
