'use client';

import React, { useState } from 'react';
import { Database, Plus, FileText, Sparkles, CheckCircle2, Search, ArrowUpRight, ShieldCheck, Stethoscope } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState([
    {
      id: 'kb-1',
      name: 'Clinical Guidelines & Treatment Protocols',
      description: 'Medical triage workflows, ICD-10 diagnostic criteria, care pathways, and contraindications.',
      chunkCount: 124,
      status: 'READY',
      updatedAt: '1 hour ago',
    },
    {
      id: 'kb-2',
      name: 'Patient Intake & Insurance Coverage FAQ',
      description: 'Comprehensive objection handling, copay policies, prior authorizations, and HMO/PPO schedules.',
      chunkCount: 88,
      status: 'READY',
      updatedAt: '4 hours ago',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);

  const handleSemanticSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setSearchResult(
      `[pgvector Match (Confidence: 0.96)]: Clinical protocol mandates patient oxygen saturation check (>95%) and immediate nurse escalation if systolic blood pressure exceeds 180 mmHg.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-cyan-400" />
            Clinical Knowledge & pgvector RAG
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage vectorized clinical guidelines, treatment pathways, and protocol facts used by AI staff during patient encounters.
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition">
          <Plus className="w-4 h-4" />
          Create Knowledge Base
        </button>
      </div>

      {/* RAG Semantic Search Tester */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Live pgvector Medical Knowledge Retrieval Tester
        </div>
        <form onSubmit={handleSemanticSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Test query: e.g., 'What is the escalation threshold for hypertension during triage?'"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-subtle border border-surface-border text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition"
          >
            Vector Search
          </button>
        </form>

        {searchResult && (
          <div className="p-4 rounded-xl bg-surface-subtle border border-cyan-500/40 text-xs text-cyan-200 leading-relaxed animate-in fade-in duration-300 shadow-md">
            {searchResult}
          </div>
        )}
      </div>

      {/* Knowledge Bases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {knowledgeBases.map((kb) => (
          <div key={kb.id} className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{kb.name}</h3>
                    <span className="flex items-center gap-1 text-[10px] text-teal-400 font-medium mt-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      {kb.chunkCount} Vector Chunks (1536-dim pgvector)
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{kb.description}</p>
            </div>

            <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Updated {kb.updatedAt}</span>
              <button className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 text-xs transition">
                Manage Documents <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
