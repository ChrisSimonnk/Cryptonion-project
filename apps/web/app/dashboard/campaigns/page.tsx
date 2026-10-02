'use client';

import React, { useState } from 'react';
import { Megaphone, Play, Plus, Users, Calendar, CheckCircle2, AlertCircle, HeartPulse, Activity } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([
    {
      id: 'cmp-1',
      name: 'Post-Op Patient Wellness & Recovery Outreach',
      aiAgent: 'Dr. Sarah - Clinical Intake AI',
      status: 'RUNNING',
      totalLeads: 250,
      contacted: 142,
      converted: 128,
      scheduledAt: '2026-10-02 10:00 AM',
    },
    {
      id: 'cmp-2',
      name: 'Annual Preventive Health & Mammogram Scheduling',
      aiAgent: 'Elena - Care Appointment Setter',
      status: 'SCHEDULED',
      totalLeads: 420,
      contacted: 0,
      converted: 0,
      scheduledAt: '2026-10-03 09:00 AM',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-cyan-400" />
            Patient Outreach & Care Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Automated Asterisk clinical dialer campaigns executed by autonomous AI health employees.
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />
          Create Care Campaign
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((cmp) => {
          const progress = Math.round((cmp.contacted / cmp.totalLeads) * 100);
          return (
            <div key={cmp.id} className="glass-panel p-6 rounded-2xl border border-surface-border space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white">{cmp.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      cmp.status === 'RUNNING'
                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 animate-pulse'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {cmp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Assigned AI Staff: <span className="text-cyan-300 font-semibold">{cmp.aiAgent}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {cmp.status === 'RUNNING' ? (
                    <button className="px-3.5 py-1.5 rounded-xl bg-surface-subtle text-xs text-amber-300 border border-surface-border hover:bg-surface-highlight transition">
                      Pause Dialing
                    </button>
                  ) : (
                    <button className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm">
                      <Play className="w-3.5 h-3.5" />
                      Start Campaign
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Outreach Encounter Progress ({cmp.contacted} / {cmp.totalLeads} Patients)</span>
                  <span className="font-bold text-white font-mono">{progress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-subtle overflow-hidden border border-surface-border/40">
                  <div className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-surface-border text-xs">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Total Target Encounters</div>
                  <div className="font-bold text-white text-sm mt-0.5">{cmp.totalLeads} Patients</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Triaged & Care Confirmed</div>
                  <div className="font-bold text-teal-400 text-sm mt-0.5">{cmp.converted} Completed</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Scheduled Dispatch Window</div>
                  <div className="font-medium text-slate-300 mt-0.5">{cmp.scheduledAt}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
