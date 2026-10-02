'use client';

import React, { useState } from 'react';
import { useAuthStore } from '../../../lib/store';
import { 
  Building2, 
  Users, 
  UserPlus, 
  Shield, 
  CheckCircle2, 
  History, 
  ArrowRightLeft, 
  Trash2, 
  Mail,
  ShieldAlert,
  ShieldCheck,
  Lock
} from 'lucide-react';
import { Role } from '@cryptonion/shared';

export default function OrganizationPage() {
  const { user, organization, role, permissions, availableOrganizations, switchOrganization } = useAuthStore();

  const [members, setMembers] = useState([
    {
      id: 'mem-1',
      userId: user?.id || 'usr-1',
      name: user?.name || 'Dr. Alex Vance',
      email: user?.email || 'alex@cryptonion.ai',
      role: role || Role.SUPER_ADMIN,
      status: 'ACTIVE',
      joinedAt: 'Today',
    },
    {
      id: 'mem-2',
      userId: 'usr-2',
      name: 'Dr. Jordan Smith',
      email: 'jordan@healthlabs.io',
      role: Role.MANAGER,
      status: 'ACTIVE',
      joinedAt: '3 days ago',
    },
    {
      id: 'mem-3',
      userId: 'usr-3',
      name: 'Nurse Taylor Lee',
      email: 'taylor@healthlabs.io',
      role: Role.AGENT,
      status: 'ACTIVE',
      joinedAt: '1 week ago',
    },
  ]);

  const [invitations, setInvitations] = useState([
    {
      id: 'inv-1',
      email: 'sarah.nurse@clinicalcare.com',
      role: Role.AGENT,
      status: 'PENDING',
      expiresAt: 'In 6 days',
    },
  ]);

  const [auditLogs, setAuditLogs] = useState([
    { id: '1', action: 'auth.mfa_login', user: user?.name || 'Dr. Alex Vance', time: '10 mins ago', details: 'Authenticated clinical session started' },
    { id: '2', action: 'member.role_changed', user: 'System (Admin)', time: '2 hours ago', details: 'Dr. Jordan Smith promoted to CLINICAL_MANAGER' },
    { id: '3', action: 'hipaa.audit_verified', user: user?.name || 'Dr. Alex Vance', time: '1 day ago', details: 'Verified encryption at rest and audit trail integrity' },
  ]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.AGENT);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInvitations([
      ...invitations,
      {
        id: `inv-${Date.now()}`,
        email: inviteEmail,
        role: inviteRole,
        status: 'PENDING',
        expiresAt: 'In 7 days',
      },
    ]);
    setShowInviteModal(false);
    setInviteEmail('');
  };

  const handleRoleChange = (memberId: string, newRole: Role) => {
    setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
  };

  const handleRemoveMember = (memberId: string) => {
    setMembers(members.filter((m) => m.id !== memberId));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-cyan-400" />
            Clinical Tenant & Security Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Manage multi-tenant HIPAA isolation, clinical team memberships, RBAC roles, and tamper-proof audit trails.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          Invite Staff Member
        </button>
      </div>

      {/* Organization Switcher & Current Tenant Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{organization?.name || 'Acme Health Systems'}</h2>
              <div className="text-[11px] text-slate-400">Tenant Slug: <span className="font-mono text-cyan-300 font-semibold">{organization?.slug || 'acme-health'}</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs pt-2">
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Effective Role</div>
              <div className="font-bold text-teal-300 mt-0.5">{role || 'SUPER_ADMIN'}</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-subtle border border-surface-border">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Compliance Level</div>
              <div className="font-bold text-white uppercase mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                {organization?.plan || 'Enterprise HIPAA'}
              </div>
            </div>
          </div>
        </div>

        {/* Available Workspaces Switcher */}
        <div className="md:col-span-6 glass-panel p-6 rounded-2xl border border-surface-border space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              Switch Healthcare Organization Context
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{availableOrganizations.length || 1} Workspaces</span>
          </div>
          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-transparent border border-cyan-500/40 flex items-center justify-between text-xs shadow-sm">
              <div>
                <div className="font-bold text-white">{organization?.name || 'Acme Health Systems'} (Active)</div>
                <div className="text-[10px] text-cyan-300 font-medium">Primary Clinical Context</div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Members & RBAC Table */}
      <div className="glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Authorized Clinical Staff Members
            </h2>
            <p className="text-[11px] text-slate-400">Team members with explicit role-based access control and tenant isolation</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-surface-border text-[11px]">
                <th className="pb-3 font-semibold">Staff Member</th>
                <th className="pb-3 font-semibold">RBAC Role</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Enrolled</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {members.map((m) => (
                <tr key={m.id} className="text-slate-300 hover:bg-surface-subtle/30 transition">
                  <td className="py-3.5">
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-400">{m.email}</div>
                  </td>
                  <td className="py-3.5">
                    <select
                      className="bg-surface-subtle border border-surface-border text-xs rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as Role)}
                      disabled={m.role === Role.SUPER_ADMIN && members.filter((x) => x.role === Role.SUPER_ADMIN).length <= 1}
                    >
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Medical Director)</option>
                      <option value="ADMIN">ADMIN (Clinical Admin)</option>
                      <option value="MANAGER">MANAGER (Care Coordinator)</option>
                      <option value="AGENT">AGENT (Nurse / Triage Operator)</option>
                      <option value="VIEWER">VIEWER (Auditor)</option>
                    </select>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/25">
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-[11px] text-slate-400 font-mono">{m.joinedAt}</td>
                  <td className="py-3.5 text-right">
                    {m.role !== Role.SUPER_ADMIN && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations & Security Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Invites */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              Pending Staff Invitations
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">{invitations.length} Pending</span>
          </div>

          <div className="space-y-2 text-xs">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-3 rounded-xl bg-surface-subtle/80 border border-surface-border flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{inv.email}</div>
                  <div className="text-[10px] text-slate-400">Role: <span className="text-cyan-300 font-medium">{inv.role}</span> • {inv.expiresAt}</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  PENDING
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Audit Trail */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-surface-border space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-surface-border">
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-teal-400" />
              HIPAA Identity & Access Audit Trail
            </h3>
            <span className="text-[10px] text-teal-300 font-semibold">Realtime Telemetry</span>
          </div>

          <div className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-surface-subtle/60 border border-surface-border flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-border text-slate-200 font-semibold">{log.action}</span>
                    <span className="text-slate-200 font-medium">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Initiated by {log.user}</div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-surface-border space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Invite Clinical Staff Member</h2>
            <form onSubmit={handleInvite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Staff Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-surface-border text-white focus:outline-none focus:border-cyan-500"
                  placeholder="physician@hospital.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign Clinical Role</label>
                <select
                  className="w-full px-3 py-2 rounded-xl bg-surface-subtle border border-surface-border text-white focus:outline-none focus:border-cyan-500"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                >
                  <option value="AGENT">AGENT (Nurse / Triage Operator)</option>
                  <option value="MANAGER">MANAGER (Care Coordinator)</option>
                  <option value="ADMIN">ADMIN (Clinical IT Director)</option>
                  <option value="VIEWER">VIEWER (Auditor)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-subtle text-slate-300 hover:text-white border border-surface-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-cyan-500/20"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
