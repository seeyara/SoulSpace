"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { pageview } from "@/lib/utils/gtag";

export default function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    pageview(pathname, document.referrer);
  }, [pathname]);
  return null;
} 