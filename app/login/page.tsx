import Link from "next/link";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = {
  searchParams?: {
    auth?: string | string[];
  };
};

function getAuthMessage(auth: string | string[] | undefined) {
  const value = Array.isArray(auth) ? auth[0] : auth;

  if (value === "required") {
    return "Silakan login dulu untuk membuka halaman internal.";
  }

  if (value === "invalid") {
    return "Email atau password tidak valid.";
  }

  return null;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const authMessage = getAuthMessage(searchParams?.auth);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-14 md:px-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-orange-600">NekoLogistic Secure Access</p>
        <h1 className="mt-2 font-mono text-3xl font-bold text-slate-900">Login Portal Web</h1>
        {authMessage ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {authMessage}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-slate-600">
          Masuk menggunakan akun internal. Untuk pelacakan publik, buka halaman
          <Link className="ml-1 font-semibold text-orange-600 hover:text-orange-500" href="/tracking">
            tracking
          </Link>
          .
        </p>

        <LoginForm />
      </section>
    </main>
  );
}
