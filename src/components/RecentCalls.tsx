import { useEffect, useState } from 'react';
import { Phone, Mail, Calendar, CheckCircle, AlertCircle, Users, MessageCircle } from 'lucide-react';
import api from '../api/axios';

interface RecentCall {
  id: string;
  conversation_id: string;
  agent_name: string;
  received_at: string;
  duration_seconds: number;
  caller_number: string;
  called_number: string;
  summary: string;
  call_state: string;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  child_name: string[] | null;
  child_age: string[] | null;
  tour_booked: boolean;
  tour_date: string | null;
  tour_time: string | null;
  questions_asked: string[];
  topics_of_interest: string[];
  enrollment_urgency: string;
  language_spoken: string;
}

interface CallStats {
  total_calls: number;
  tours_booked: number;
}

interface Props {
  refreshTrigger?: number;
}

export const RecentCalls = ({ refreshTrigger }: Props) => {
  const [calls, setCalls] = useState<RecentCall[]>([]);
  const [stats, setStats] = useState<CallStats>({ total_calls: 0, tours_booked: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/school/recent-calls')
      .then((res: any) => {
        setCalls(res.data.calls || []);
        setStats(res.data.stats || { total_calls: 0, tours_booked: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse">
        <div className="h-5 bg-slate-100 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const latest = calls[0];

  return (
    <div className="space-y-6">
      {/* ── Hero: Latest Call ───────────────────────────────────────── */}
      {latest && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Gradient header */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400" />

          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  latest.call_state === 'complete' && latest.tour_booked ? 'bg-emerald-400' :
                  latest.call_state === 'complete' ? 'bg-blue-400' :
                  latest.call_state === 'partial' ? 'bg-amber-400' : 'bg-slate-300'
                }`} />
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Latest Call</h3>
                <span className="text-[10px] text-slate-300">· {formatTime(latest.received_at)}</span>
              </div>
              {latest.tour_booked && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Tour Booked 🎉
                </span>
              )}
              {!latest.tour_booked && latest.call_state === 'complete' && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                  Follow Up Needed
                </span>
              )}
            </div>

            {/* Parent & Contact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parent</div>
                <div className="text-sm font-bold text-slate-900">{latest.parent_name || 'Unknown'}</div>
                {latest.parent_phone && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{latest.parent_phone}</div>}
                {latest.parent_email && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />{latest.parent_email}</div>}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Children</div>
                {latest.child_name && latest.child_name.length > 0 ? (
                  <div className="space-y-1">
                    {latest.child_name.map((name, i) => (
                      <div key={i} className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {name}{latest.child_age?.[i] ? ` · ${latest.child_age[i]}` : ''}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Not recorded</div>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tour</div>
                {latest.tour_booked && latest.tour_date ? (
                  <div>
                    <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {latest.tour_date} at {latest.tour_time || 'TBD'}
                    </div>
                    <div className="text-[10px] text-emerald-500 mt-0.5">Calendar invite sent</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      Not booked
                    </div>
                    <div className="text-[10px] text-amber-500 mt-0.5">Follow-up recommended</div>
                  </div>
                )}
                {latest.enrollment_urgency && latest.enrollment_urgency !== 'unknown' && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold ${
                    latest.enrollment_urgency === 'immediate' ? 'bg-red-50 text-red-600 border border-red-100' :
                    latest.enrollment_urgency === 'within weeks' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {latest.enrollment_urgency}
                  </span>
                )}
              </div>
            </div>

            {/* Topics & Questions */}
            {(latest.topics_of_interest?.length > 0 || latest.questions_asked?.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-50">
                {latest.topics_of_interest.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                    {t}
                  </span>
                ))}
                {latest.questions_asked.map((q, i) => (
                  <span key={`q-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                    <MessageCircle className="w-2.5 h-2.5" />{q}
                  </span>
                ))}
              </div>
            )}

            {/* Summary */}
            {latest.summary && (
              <div className="mt-4 pt-3 border-t border-slate-50">
                <p className="text-[12px] text-slate-500 leading-relaxed italic">"{latest.summary}"</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
