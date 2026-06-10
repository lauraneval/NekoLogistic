import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{ auth?: string | string[] }>;
};

async function getAuthMessage(searchParams: LoginPageProps["searchParams"]) {
  const params = await searchParams;
  const auth = params?.auth;
  const value = Array.isArray(auth) ? auth[0] : auth;

  if (value === "required") return "Please log in to access the internal portal.";
  if (value === "invalid") return "Invalid email or password.";
  if (value === "timeout") return "Your session expired due to inactivity. Please log in again.";
  if (value === "courier") return "Courier accounts must use the NEKO mobile app. This web portal is for admin use only.";
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // If user already has a valid session, send them to their dashboard
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = profile?.role as string | undefined;
    if (role === "superadmin") redirect("/superadmin");
    if (role === "admin_gudang") redirect("/admin-gudang");
  }

  const authMessage = await getAuthMessage(searchParams);

  return (
    <div className="min-h-screen bg-linear-to-br from-[#EEF2FF] via-[#F0F4FF] to-[#E8EFFE] flex flex-col">
      {/* Center card */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A3CA8]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">NEKO Logistic</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mt-0.5">
              Delivery Cat • Global Access
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full max-w-md h-0.5 bg-linear-to-r from-transparent via-[#1A3CA8] to-transparent mb-8" />

        {/* Login card */}
        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl shadow-slate-200/60 p-8">
          <h2 className="text-xl font-semibold text-slate-900">Secure Login</h2>
          <p className="mt-1 text-sm text-slate-500">Access your logistics control center</p>

          {authMessage && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {authMessage}
            </div>
          )}

          <LoginForm />

          <p className="mt-6 text-center text-xs text-slate-500">
            {"Don't have an account? "}
            <span className="font-medium text-[#1A3CA8]">Contact your regional administrator</span>
          </p>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="border-t border-slate-200 bg-white/80 px-8 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">
              Global Network Status: Optimal
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Live processing nodes active across 24 regional hubs. Latency synchronized at 14ms.
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <div className="h-1 w-32 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full w-3/4 rounded-full bg-[#1A3CA8]" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <div className="flex justify-center gap-6 py-3 text-xs text-slate-400 bg-white">
        <span className="cursor-pointer hover:text-slate-600">Privacy Policy</span>
        <span>•</span>
        <span className="cursor-pointer hover:text-slate-600">Security Standards</span>
        <span>•</span>
        <span className="cursor-pointer hover:text-slate-600">Help Center</span>
      </div>
    </div>
  );
}
