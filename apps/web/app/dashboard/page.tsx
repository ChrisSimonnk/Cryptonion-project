'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Bot, 
  PhoneCall, 
  PhoneIncoming, 
  PhoneOutgoing, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Play, 
  ArrowUpRight,
  Activity,
  Heart,
  CheckCircle2,
  Cpu,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const stats = [
    { title: 'Active AI Care Specialists', value: '8 Staff', change: '+3 deployed this month', icon: Bot, color: 'text-[#0055FF]', badge: 'bg-[#0055FF]/10 text-[#60a5fa] border-[#0055FF]/30' },
    { title: 'Telephony Consultations', value: '1,842', change: '99.1% patient resolution', icon: PhoneCall, color: 'text-[#00C853]', badge: 'bg-[#00C853]/10 text-[#00E676] border-[#00C853]/30' },
    { title: 'Voice Pipeline Latency', value: '240ms', change: 'faster-whisper + Piper', icon: Clock, color: 'text-[#00D2FF]', badge: 'bg-[#00D2FF]/10 text-[#38BDF8] border-[#00D2FF]/30' },
    { title: 'Care Plans Scheduled', value: '528', change: '+28.4% intake conversion', icon: CalendarCheck, color: 'text-[#FF459F]', badge: 'bg-[#FF459F]/10 text-[#FF74B7] border-[#FF459F]/30' },
  ];

  const recentCalls = [
    { id: '1', contact: '+1 (555) 349-2011', patient: 'Eleanor Vance', agent: 'Dr. Sarah (Clinical Intake AI)', status: 'CARE_SCHEDULED', duration: '3m 42s', sentiment: 'Care Plan Confirmed (Op OPD)', time: '2 mins ago' },
    { id: '2', contact: '+1 (555) 890-4412', patient: 'Marcus Chen', agent: 'Michael (Patient Triage)', status: 'IN_PROGRESS', duration: '1m 15s', sentiment: 'Symptom Triage & Blood Work', time: 'Live Now' },
    { id: '3', contact: '+1 (555) 123-7740', patient: 'Sophia Rodriguez', agent: 'Dr. Sarah (Clinical Intake AI)', status: 'FOLLOW_UP', duration: '2m 10s', sentiment: 'Prescription Refill Verification', time: '12 mins ago' },
    { id: '4', contact: '+1 (555) 902-1133', patient: 'Arthur Pendelton', agent: 'Elena (Concierge AI)', status: 'COMPLETED', duration: '4m 50s', sentiment: 'Diagnostic Lab Test Booked', time: '25 mins ago' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-8 rounded-3xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-surface-border">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#0055FF]/15 via-[#00C853]/08 to-transparent pointer-events-none" />
        <div className="space-y-2.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0055FF]/10 border border-[#0055FF]/30 text-[#93c5fd] text-xs font-bold shadow-sm">
            <Heart className="w-3.5 h-3.5 text-[#0055FF] fill-[#0055FF] animate-pulse" />
            Even Healthcare Autonomous Clinical Dispatch Node
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Intake & Outbound Care Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            AI medical staff are actively triaging patients, coordinating outpatient diagnostic appointments, and querying pgvector clinical guidelines during real-time Asterisk voice calls.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href="/dashboard/employees"
            className="px-5 py-3 rounded-full bg-[#0055FF] hover:bg-[#0043CC] text-white text-xs font-bold shadow-lg shadow-[#0055FF]/35 flex items-center gap-2 transition hover:-translate-y-0.5"
          >
            <Bot className="w-4 h-4" />
            Configure AI Staff
          </Link>
          <Link
            href="/dashboard/calls"
            className="px-5 py-3 rounded-full bg-surface-subtle hover:bg-surface-highlight text-white text-xs font-bold border border-surface-border flex items-center gap-2 transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-[#00C853]" />
            Live Audio Stream
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">{s.title}</span>
                <div className={`p-2.5 rounded-2xl bg-surface-subtle border border-surface-border ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-white tracking-tight">{s.value}</div>
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${s.badge}`}>
                    {s.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Timeline & Realtime Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Telephony Stream */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-surface-border">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0055FF]" />
                Live Patient Encounters & Action Log
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time voice stream transcribed by Asterisk SIP + Fastify</p>
            </div>
            <Link href="/dashboard/calls" className="text-xs font-bold text-[#60a5fa] hover:text-[#93c5fd] flex items-center gap-1 transition">
              View All Encounters <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-surface-border/60">
            {recentCalls.map((call) => (
              <div key={call.id} className="py-4 flex items-center justify-between text-xs hover:bg-surface-subtle/40 px-2.5 rounded-2xl transition">
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-2xl ${call.status === 'IN_PROGRESS' ? 'bg-[#00C853]/20 text-[#00E676] animate-even-pulse border border-[#00C853]/40' : 'bg-surface-subtle border border-surface-border text-slate-300'}`}>
                    {call.status === 'IN_PROGRESS' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      {call.contact}
                      <span className="text-slate-400 font-normal">({call.patient})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Staff: <strong className="text-slate-200">{call.agent}</strong></div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      call.status === 'IN_PROGRESS'
                        ? 'bg-[#00C853]/15 text-[#00E676] border border-[#00C853]/30 animate-pulse'
                        : call.status === 'CARE_SCHEDULED'
                        ? 'bg-[#0055FF]/15 text-[#93c5fd] border border-[#0055FF]/30'
                        : 'bg-[#FF459F]/15 text-[#FF74B7] border border-[#FF459F]/30'
                    }`}>
                      {call.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-bold">{call.duration}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">{call.sentiment} • <span className="text-slate-500">{call.time}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Employee Health / Resource usage */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-surface-border">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0055FF]" />
              Clinical Stack Health
            </h2>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#00C853]/10 text-[#00E676] border border-[#00C853]/30 font-bold">
              HEALTHY (99.9%)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-surface-subtle/90 border border-surface-border flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Fastify Core & WebSockets</div>
                <div className="text-[10px] text-slate-400">Port 3001 • REST & SIP Event Stream</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] shadow-sm shadow-[#00C853]/50" />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-subtle/90 border border-surface-border flex items-center justify-between">
              <div>
                <div className="font-bold text-white">PostgreSQL 16 + pgvector</div>
                <div className="text-[10px] text-slate-400">1536-dim Clinical Embeddings Active</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] shadow-sm shadow-[#00C853]/50" />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-subtle/90 border border-surface-border flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Ollama Clinical Model Engine</div>
                <div className="text-[10px] text-slate-400">llama3:8b • 0.7 temperature</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] shadow-sm shadow-[#00C853]/50" />
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-subtle/90 border border-surface-border flex items-center justify-between">
              <div>
                <div className="font-bold text-white">BullMQ Worker Backlog</div>
                <div className="text-[10px] text-slate-400">Redis 7 • 0 pending jobs</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C853] shadow-sm shadow-[#00C853]/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
