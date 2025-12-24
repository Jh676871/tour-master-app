'use client';

import { usePathname } from "next/navigation";
import SOSMonitor from "./SOSMonitor";

export default function ClientSOSMonitorWrapper() {
  const pathname = usePathname();
  const isTravelerPage = pathname?.startsWith('/traveler') || pathname?.startsWith('/liff');

  if (isTravelerPage) return null;

  return <SOSMonitor />;
}
