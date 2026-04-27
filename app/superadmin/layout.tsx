import { ensureRoleOrRedirect } from "@/lib/session";
import { Sidebar } from "@/components/superadmin/Sidebar";
import { Header } from "@/components/superadmin/Header";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify role on server side
  await ensureRoleOrRedirect(["superadmin"]);

  return (
    <div className="flex min-h-screen bg-[#0f0a05] font-sans text-slate-200 selection:bg-orange-500/30 selection:text-orange-200 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-5 pointer-events-none"></div>
      
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="flex-1 relative z-10 h-screen overflow-y-auto">
        <Header />
        <div className="p-6 sm:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

