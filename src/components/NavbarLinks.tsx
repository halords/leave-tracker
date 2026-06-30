"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavbarLinks({ role }: { role: string }) {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Profile", href: "/dashboard/profile" },
    { name: "Signatories", href: "/dashboard/signatories" },
  ];

  if (role === "ADMIN") {
    links.push({ name: "User Management", href: "/dashboard/admin" });
  }

  return (
    <div className="hidden md:flex items-center space-x-8 h-full">
      {links.map((link) => {
        const isActive = pathname === link.href;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors h-16 ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            {link.name}
          </Link>
        );
      })}
    </div>
  );
}
