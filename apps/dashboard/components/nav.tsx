"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Share2,
  Activity,
  Users,
  Package,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/shopify", label: "Shopify", icon: ShoppingBag },
  { href: "/meta", label: "Meta / Facebook", icon: Share2 },
  { href: "/behavior", label: "Comportamiento", icon: Activity },
  { href: "/customers", label: "Clientes", icon: Users },
  { href: "/inventory", label: "Inventario", icon: Package },
];

const GOLD = "#bb9a4c";
const BONE = "#f4eee1";

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 flex flex-col border-r min-h-screen" style={{ background: "#0b0805", borderColor: "rgba(255,255,255,0.08)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <Image
            src="https://estrellademar.co/wp-content/uploads/2023/11/logo-estrella-de-mar-menu.png"
            alt="Estrella de Mar"
            width={24}
            height={24}
            className="object-contain w-5 h-5"
          />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: BONE }}>Estrella de Mar</span>
          <span className="text-[9px] tracking-widest uppercase font-medium" style={{ color: `${GOLD}` }}>Analytics</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 pt-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all duration-150"
              style={
                active
                  ? {
                      background: `${GOLD}18`,
                      boxShadow: `inset 2px 0 0 ${GOLD}`,
                      color: BONE,
                      fontWeight: 500,
                    }
                  : { color: `${BONE}80` }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = BONE;
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color = `${BONE}80`;
                }
              }}
            >
              <Icon
                size={15}
                style={active ? { color: GOLD, opacity: 1 } : { opacity: 0.55 }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors"
            style={{ color: `${BONE}55` }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.color = `${BONE}99`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
              (e.currentTarget as HTMLElement).style.color = `${BONE}55`;
            }}
          >
            <LogOut size={14} style={{ opacity: 0.5 }} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
