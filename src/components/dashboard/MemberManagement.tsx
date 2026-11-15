import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { UserProfile } from '../../types';
import { formService } from '../../services/formService';
import { DESIGNATED_ADMIN_EMAIL } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadMembers = async () => {
    setLoading(true);
    try {
      setMembers(await formService.listMembers());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load members.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRoleChange = async (member: UserProfile, role: 'organizer' | 'user') => {
    setUpdatingId(member.id);
    try {
      await formService.setMemberRole(member.id, role);
      setMembers(current => current.map(item => item.id === member.id ? { ...item, role } : item));
      showToast(`${member.fullName} is now a ${role}.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update member role.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            Member access
          </h2>
          <p className="text-xs text-slate-500 mt-1">Admins and organizers can grant or remove organizer access. Admin access is fixed to the designated account.</p>
        </div>
        <button
          type="button"
          onClick={loadMembers}
          disabled={loading}
          aria-label="Refresh members"
          className="p-2 text-slate-500 hover:text-teal-700 hover:bg-slate-50 rounded-lg disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500 py-3">Loading members...</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {members.map(member => {
            const isDesignatedAdmin = member.email.toLowerCase() === DESIGNATED_ADMIN_EMAIL.toLowerCase();
            return (
              <div key={member.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{member.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{member.email}</p>
                </div>
                {isDesignatedAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-teal-700">
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </span>
                ) : (
                  <select
                    value={member.role === 'organizer' ? 'organizer' : 'user'}
                    disabled={updatingId === member.id}
                    onChange={event => handleRoleChange(member, event.target.value as 'organizer' | 'user')}
                    aria-label={`Role for ${member.fullName}`}
                    className="w-fit px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-50"
                  >
                    <option value="user">User — fill forms</option>
                    <option value="organizer">Organizer — manage forms</option>
                  </select>
                )}
              </div>
            );
          })}
          {members.length === 0 && <p className="text-xs text-slate-500 py-3">No members found.</p>}
        </div>
      )}
    </section>
  );
};
