import { Suspense } from "react";
import Image from "next/image";
import { loginAction } from "./actions";

async function ErrorBanner({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <div
      className="mb-4 rounded-lg border px-3 py-2.5 text-[13px]"
      style={{
        background: "rgba(180,60,40,0.06)",
        borderColor: "rgba(180,60,40,0.18)",
        color: "#b43c28",
      }}
    >
      Contraseña incorrecta
    </div>
  );
}

type Props = { searchParams: Promise<{ error?: string }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#fbf8f1" }}
    >
      {/* Subtle warm radial behind the card */}
      <div
        className="absolute w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(187,154,76,0.08) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        className="relative w-full max-w-[380px] rounded-2xl px-8 py-10"
        style={{
          background: "#ffffff",
          border: "1px solid rgba(11,8,5,0.08)",
          boxShadow: "0 8px 40px rgba(11,8,5,0.08), 0 1px 3px rgba(11,8,5,0.06)",
        }}
      >
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden"
            style={{
              background: "#fbf8f1",
              border: "1px solid rgba(11,8,5,0.08)",
            }}
          >
            <Image
              src="https://estrellademar.co/wp-content/uploads/2023/11/logo-estrella-de-mar-menu.png"
              alt="Estrella de Mar"
              width={64}
              height={64}
              className="object-contain w-14 h-14"
              style={{ filter: "brightness(0)" }}
            />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.7rem",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#0b0805",
              lineHeight: 1,
            }}
          >
            Estrella de Mar
          </h1>
          <p
            className="mt-1.5 text-[11px] uppercase tracking-[0.22em] font-medium"
            style={{ color: "#bb9a4c" }}
          >
            Analytics
          </p>
        </div>

        {/* Divider */}
        <div className="h-px mb-6" style={{ background: "rgba(11,8,5,0.07)" }} />

        <Suspense fallback={null}>
          <ErrorBanner searchParams={searchParams} />
        </Suspense>

        <form action={loginAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "#a69880" }}
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className="flex h-10 w-full rounded-lg border px-3 text-[13px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                background: "#fbf8f1",
                borderColor: "rgba(11,8,5,0.1)",
                color: "#0b0805",
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg text-[13px] font-semibold tracking-wide transition-opacity hover:opacity-90 active:opacity-70"
            style={{
              background: "linear-gradient(135deg, #bb9a4c 0%, #9d7f32 100%)",
              color: "#0b0805",
              boxShadow: "0 2px 12px rgba(187,154,76,0.3)",
            }}
          >
            Entrar
          </button>
        </form>

        <p
          className="text-center text-[11px] mt-6 tracking-wide"
          style={{ color: "#c8b89a" }}
        >
          Acceso privado · estrellademar.co
        </p>
      </div>
    </div>
  );
}
