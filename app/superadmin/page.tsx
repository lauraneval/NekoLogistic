"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { DashboardSection } from "@/components/superadmin/DashboardSection";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/analytics");
      const json = await res.json();
      if (json.ok) setData(json.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return <div className="flex h-96 items-center justify-center text-orange-500"><RefreshCcw className="animate-spin" size={32} /></div>;
  }

  return <DashboardSection data={data} />;
}
