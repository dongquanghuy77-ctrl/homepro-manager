import StationAuthUI from "@/components/pwr/station/StationAuthUI";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Station Login - HomePro OS v5" };
export const dynamic = "force-dynamic";

export default function StationLoginPage() {
  return <StationAuthUI />;
}
