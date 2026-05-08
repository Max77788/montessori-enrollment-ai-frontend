import { useEffect, useState } from 'react';
import { Phone, Mail, Calendar, Clock, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, User, Users, MessageCircle, Tag } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const urgencyColor = (u: string) => {
    if (u === 'immediate') return 'text-red-500 bg-red-50 border-red-100';
    if (u === 'within weeks') return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-slate-400 bg-slate-50 border-slate-100';
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

      {/* ── Call History ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-500" />
              Call History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {stats.total_calls} total · {stats.tours_booked} tours booked
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {calls.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Phone className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No calls yet</p>
              <p className="text-xs text-slate-300 mt-1">Call data will appear here after the first inquiry.</p>
            </div>
          ) : (
            calls.map(call => (
            <div key={call.id} className="group">
              {/* Call row */}
              <div
                className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {call.call_state === 'complete' && call.tour_booked ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : call.call_state === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                  ) : call.call_state === 'partial' ? (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-300" />
                  )}
                </div>

                {/* Call info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {call.parent_name || call.caller_number || 'Unknown Caller'}
                    </span>
                    {call.tour_booked && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        Tour Booked
                      </span>
                    )}
                    {call.enrollment_urgency && call.enrollment_urgency !== 'unknown' && (
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${urgencyColor(call.enrollment_urgency)}`}>
                        {call.enrollment_urgency}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(call.received_at)}
                    </span>
                    {call.duration_seconds > 0 && (
                      <span className="flex items-center gap-1">
                        · {formatDuration(call.duration_seconds)}
                      </span>
                    )}
                    {call.language_spoken && call.language_spoken !== 'English' && (
                      <span>{call.language_spoken}</span>
                    )}
                  </div>
                </div>

                {/* Children preview */}
                {call.child_name && call.child_name.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5" />
                    {call.child_name.map((n, i) => (
                      <span key={i} className="font-medium">{n}{call.child_age?.[i] ? ` (${call.child_age[i]})` : ''}</span>
                    )).reduce((prev, curr, i) => i === 0 ? [curr] : [...prev as any, ', ', curr], [] as any)}
                  </div>
                )}

                {/* Expand chevron */}
                <div className="flex-shrink-0 text-slate-300">
                  {expandedId === call.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === call.id && (
                <div className="px-6 pb-5 pt-2 bg-slate-50/50 border-t border-slate-100 animate-soft">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Contact info */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</h4>
                      {call.parent_phone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {call.parent_phone}
                        </div>
                      )}
                      {call.parent_email && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {call.parent_email}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {call.parent_name || 'Not provided'}
                      </div>
                    </div>

                    {/* Tour info */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tour</h4>
                      {call.tour_booked && call.tour_date ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          {call.tour_date} at {call.tour_time || 'TBD'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not booked — follow up needed
                        </div>
                      )}
                    </div>

                    {/* Topics & questions */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interests</h4>
                      {call.topics_of_interest && call.topics_of_interest.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {call.topics_of_interest.map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">None recorded</span>
                      )}
                      {call.questions_asked && call.questions_asked.length > 0 && (
                        <div className="mt-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Questions Asked</h4>
                          <ul className="text-xs text-slate-500 space-y-0.5">
                            {call.questions_asked.map((q, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <MessageCircle className="w-3 h-3 text-slate-300 mt-0.5 flex-shrink-0" />
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {call.summary && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Summary</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{call.summary}</p>
                    </div>
                  )}

                  {/* Call state badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      call.call_state === 'complete' && call.tour_booked
                        ? 'bg-emerald-50 text-emerald-600'
                        : call.call_state === 'complete'
                        ? 'bg-blue-50 text-blue-600'
                        : call.call_state === 'partial'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {call.call_state}{call.tour_booked ? ' · Booked' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
};
