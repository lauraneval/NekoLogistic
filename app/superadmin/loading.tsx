import { RefreshCcw } from "lucide-react";

export default function SuperadminLoading() {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center text-orange-500">
      <div className="flex flex-col items-center gap-4">
        <RefreshCcw className="animate-spin" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Menghubungkan ke Terminal...</p>
      </div>
    </div>
  );
}
