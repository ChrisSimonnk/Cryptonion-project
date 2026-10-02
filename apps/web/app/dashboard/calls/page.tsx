'use client';

import React, { useState } from 'react';
import { PhoneCall, Play, Pause, Volume2, Mic, Bot, User, Radio, Sparkles, Activity, HeartPulse } from 'lucide-react';

export default function LiveCallsPage() {
  const [selectedCall, setSelectedCall] = useState({
    id: 'call-101',
    callee: '+1 (555) 349-2011',
    patientName: 'Eleanor Vance',
    agentName: 'Dr. Sarah (Clinical Intake AI)',
    status: 'IN_PROGRESS',
    duration: '02:45',
    messages: [
      { id: '1', sender: 'AI_EMPLOYEE', text: 'Hello Eleanor, this is Dr. Sarah from the Acme Clinical Care Team following up on your recent outpatient consultation.', time: '00:03' },
      { id: '2', sender: 'USER', text: 'Hi Dr. Sarah, yes! I was wondering about my lab test results and the medication schedule.', time: '00:14' },
      { id: '3', sender: 'AI_EMPLOYEE', text: 'I have your clinical record open. Your lipid panel is within target range. Are you currently experiencing any side effects with the prescribed 10mg dosage?', time: '00:24' },
      { id: '4', sender: 'USER', text: 'No side effects at all, feeling much better thank you.', time: '00:36' },
      { id: '5', sender: 'AI_EMPLOYEE', text: 'Excellent! I have logged this encounter to your medical record and scheduled your 6-month checkup for Thursday at 10 AM. Would you like a reminder sent via SMS?', time: '00:48' },
      { id: '6', sender: 'USER', text: 'Yes please, that would be wonderful.', time: '01:05' },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-cyan-400" />
            Live Telephony & Clinical Transcripts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Low-latency Asterisk SIP live audio streams transcribed in real-time by faster-whisper & Piper.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/25 text-teal-300 text-xs font-semibold shadow-sm">
          <Radio className="w-3.5 h-3.5 text-teal-400 animate-clinical-pulse" />
          Clinical Telephony Stream Online
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active and recent calls list */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl space-y-4 border border-surface-border">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h2 className="text-sm font-bold text-white">Live Clinical Encounters</h2>
            <span className="text-[10px] text-teal-400 font-mono font-semibold">SIP Trunk #1</span>
          </div>
          <div className="space-y-2">
            <div
              onClick={() => {}}
              className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-transparent border border-cyan-500/40 cursor-pointer space-y-1.5 transition shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">+1 (555) 349-2011</span>
                <span className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-teal-400 -ml-3.5" />
                  LIVE
                </span>
              </div>
              <div className="text-[11px] text-slate-200">Eleanor Vance • Dr. Sarah (Intake)</div>
              <div className="text-[10px] text-slate-400 font-mono">Duration: 02:45 • Voice Latency: 240ms</div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-surface-border cursor-pointer space-y-1.5 hover:bg-surface-subtle transition">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">+1 (555) 890-4412</span>
                <span className="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full font-semibold">COMPLETED</span>
              </div>
              <div className="text-[11px] text-slate-300">Marcus Chen • Michael (Triage)</div>
              <div className="text-[10px] text-slate-400">Duration: 04:12 • Care plan verified</div>
            </div>
          </div>
        </div>

        {/* Right: Live Transcript Timeline & Audio Visualizer */}
        <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border border-surface-border flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">{selectedCall.callee} ({selectedCall.patientName})</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold">
                    {selectedCall.duration}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Care Provider: <strong className="text-cyan-300">{selectedCall.agentName}</strong></div>
              </div>

              {/* Audio visualizer simulation */}
              <div className="flex items-center gap-1.5 bg-surface-subtle/90 px-3 py-2 rounded-xl border border-surface-border">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 mr-1" />
                {[40, 70, 95, 60, 85, 45, 90, 75, 50, 80].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-cyan-500 to-teal-400 rounded-full animate-pulse"
                    style={{ height: `${h * 0.28}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Transcript Messages Feed */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
              {selectedCall.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${
                    m.sender === 'AI_EMPLOYEE' ? 'items-start' : 'items-start flex-row-reverse'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      m.sender === 'AI_EMPLOYEE'
                        ? 'bg-gradient-to-tr from-cyan-600 to-teal-600 text-white'
                        : 'bg-surface-subtle border border-surface-border text-slate-200'
                    }`}
                  >
                    {m.sender === 'AI_EMPLOYEE' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div
                    className={`p-4 rounded-2xl max-w-lg space-y-1.5 ${
                      m.sender === 'AI_EMPLOYEE'
                        ? 'bg-surface-subtle border border-surface-border text-slate-200'
                        : 'bg-gradient-to-r from-cyan-600/30 via-sky-600/20 to-transparent border border-cyan-500/40 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 gap-4">
                      <span className="font-bold text-slate-300">{m.sender === 'AI_EMPLOYEE' ? 'Dr. Sarah (Clinical AI)' : 'Patient (Eleanor)'}</span>
                      <span className="font-mono">{m.time}</span>
                    </div>
                    <p className="text-xs leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Live Controls */}
          <div className="p-3.5 rounded-xl bg-surface-subtle/90 border border-surface-border flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">Clinical Auto-Summarizer:</span>
              <span className="text-teal-300 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Follow-Up Care Plan Scheduled (Thursday 10 AM)
              </span>
            </div>
            <button className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white transition font-medium">
              End Encounter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
