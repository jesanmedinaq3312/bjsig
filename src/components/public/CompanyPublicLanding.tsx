import { useEffect, useState } from "react";
import { ArrowRight, Building2, Loader2 } from "lucide-react";
import { fetchCompanyLandingSettings, type CompanyLandingSettings } from "@/lib/saasLanding";

export function CompanyPublicLanding({ slug }: { slug: string }) {
  const [company, setCompany] = useState<CompanyLandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchCompanyLandingSettings(slug)
      .then((value) => {
        if (mounted) setCompany(value);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <main className="public-site flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <Loader2 className="animate-spin" aria-label="Cargando página" />
      </main>
    );
  }

  if (failed || !company) {
    return (
      <main className="public-site flex min-h-screen items-center justify-center bg-slate-50 px-5 text-slate-900">
        <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Building2 className="mx-auto text-slate-400" size={30} aria-hidden="true" />
          <h1 className="mt-4 text-xl font-black">Página no disponible</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Esta página pública está desactivada o no existe. Si necesitas ingresar, utiliza el
            enlace directo que te entregó tu empresa.
          </p>
          <a
            href="/"
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            Ir a BJSIGAPP
          </a>
        </section>
      </main>
    );
  }

  const loginPath = `/${encodeURIComponent(slug)}`;
  return (
    <main className="public-site min-h-screen bg-white text-slate-900">
      <header className="flex min-h-16 items-center justify-between border-b border-slate-200 px-5 sm:px-8">
        <a href="/" className="text-sm font-black tracking-tight text-slate-800">
          BJSIGAPP
        </a>
        <a
          href={loginPath}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          {company.ctaLabel || "Acceder al portal"} <ArrowRight size={14} />
        </a>
      </header>
      <section className="relative flex min-h-[min(76vh,720px)] items-center overflow-hidden bg-slate-950 px-5 py-16 text-white sm:px-8">
        {company.heroImageUrl && (
          <img
            src={company.heroImageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-slate-950/80" />
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={`Logo de ${company.companyName}`}
              className="mb-8 h-16 max-w-52 rounded-xl bg-white p-2 object-contain"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          ) : (
            <span className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-700 text-lg font-black">
              {company.companyName.slice(0, 2).toUpperCase()}
            </span>
          )}
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            {company.companyName}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg sm:leading-8">
            Accede al portal de servicios y recursos de tu empresa desde un espacio dedicado a sus
            colaboradores.
          </p>
          <a
            href={loginPath}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {company.ctaLabel || "Acceder al portal"} <ArrowRight size={16} />
          </a>
        </div>
      </section>
      <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500">
        <a href="/" className="font-semibold hover:text-blue-700">
          Plataforma BJSIGAPP
        </a>
      </footer>
    </main>
  );
}
