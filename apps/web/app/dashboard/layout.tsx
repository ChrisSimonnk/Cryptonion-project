'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/store';
import { 
  Bot, 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  PhoneCall, 
  Database, 
  Building2,
  LogOut, 
  Radio, 
  ShieldCheck,
  Activity,
  ChevronRight,
  Heart
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, role, logout } = useAuthStore();

  const navItems = [
    { name: 'Care Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Employees', href: '/dashboard/employees', icon: Users },
    { name: 'Patient Outreach', href: '/dashboard/campaigns', icon: Megaphone },
    { name: 'Live Encounters', href: '/dashboard/calls', icon: PhoneCall },
    { name: 'Knowledge & RAG', href: '/dashboard/knowledge', icon: Database },
    { name: 'Workspace & Security', href: '/dashboard/organization', icon: Building2 },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen bg-background text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-surface-border bg-surface/75 backdrop-blur-2xl flex flex-col justify-between p-4 fixed h-full z-20 shadow-2xl">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-3.5 mb-5 border-b border-surface-border/60">
            <div className="w-10 h-10 rounded-2xl bg-[#0055FF] flex items-center justify-center shadow-lg shadow-[#0055FF]/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
                CRYPTONION<span className="text-[#0055FF] text-xs font-mono font-bold">.AI</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Clinical Workforce</div>
            </div>
          </div>

          {/* Organization Tenant Card */}
          <Link 
            href="/dashboard/organization"
            className="mx-1 mb-5 p-3.5 rounded-2xl bg-surface-subtle/80 border border-surface-border flex items-center justify-between hover:border-[#0055FF]/50 transition group block shadow-sm"
          >
            <div className="truncate">
              <div className="text-xs font-bold text-white group-hover:text-[#60a5fa] transition truncate">{organization?.name || 'Even Health Systems'}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
                <span>Role: <strong className="text-slate-200">{role || 'SUPER_ADMIN'}</strong></span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0055FF]/15 text-[#93c5fd] border border-[#0055FF]/30 uppercase font-bold">
              {organization?.plan || 'Enterprise'}
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#0055FF] text-white shadow-lg shadow-[#0055FF]/25'
                      : 'text-slate-400 hover:text-white hover:bg-surface-subtle/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Telephony Status & User profile */}
        <div className="space-y-3 pt-4 border-t border-surface-border">
          <div className="p-3 rounded-2xl bg-[#00C853]/10 border border-[#00C853]/25 flex items-center gap-2.5">
            <Radio className="w-3.5 h-3.5 text-[#00C853] animate-even-pulse" />
            <div className="text-[11px] text-[#00E676] font-bold">SIP Telephony Engine Active</div>
          </div>

          <div className="flex items-center justify-between px-2 pt-1">
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{user?.name || 'Dr. Alex Vance'}</div>
              <div className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@cryptonion.ai'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-[#FF459F] hover:bg-[#FF459F]/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 pl-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-surface-border bg-surface/50 backdrop-blur-xl sticky top-0 z-10 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">CLINICAL WORKSPACE //</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {organization?.name || 'Default Organization'}
              <span className="w-1.5 h-1.5 rounded-full bg-[#0055FF] animate-ping" />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-slate-300 bg-surface-subtle px-3.5 py-1.5 rounded-full border border-surface-border shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse" />
              <span>Tenant: <strong className="text-[#93c5fd] font-mono">{organization?.slug || 'default'}</strong></span>
            </span>
          </div>
        </header>

        {/* Main page view */}
        <main className="p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
