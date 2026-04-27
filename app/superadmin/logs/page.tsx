"use client";

import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { LogsSection } from "@/components/superadmin/LogsSection";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logSearch, setLogSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/activity-logs");
      const json = await res.json();
      if (json.ok) setLogs(json.data.logs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading && logs.length === 0) {
    return <div className="flex h-96 items-center justify-center text-orange-500"><RefreshCcw className="animate-spin" size={32} /></div>;
  }

  return (
    <LogsSection 
      logs={logs} 
      logSearch={logSearch} 
      onSearchChange={setLogSearch} 
    />
  );
}
