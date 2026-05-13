import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Phone, Loader2, MessageSquare, Play, Pause, Clock,
    Calendar, ChevronDown, User, Bot, Headphones,
    Users, Mail, CheckCircle, AlertCircle, MessageCircle, Tag
} from 'lucide-react';
import api from '../../api/axios';

interface TranscriptItem {
    role: string;
    text: string;
    timestamp?: string;
}

interface CallLogData {
    id: string;
    sessionId: string;
    participantId: string;
    transcript: TranscriptItem[];
    summary: string;
    recordingUrl: string;
    duration: number;
    createdAt: string;
    // VAPI structured data
    call_state?: string;
    parent_name?: string | null;
    parent_phone?: string | null;
    parent_email?: string | null;
    child_name?: string[] | null;
    child_age?: string[] | null;
    tour_booked?: boolean;
    tour_date?: string | null;
    tour_time?: string | null;
    questions_asked?: string[];
    topics_of_interest?: string[];
    enrollment_urgency?: string;
    language_spoken?: string;
    one_pager?: string | null;
    email_subject?: string;
    email_body?: string;
    agent_name?: string;
    conversation_id?: string;
    received_at?: string;
    caller_number?: string;
    called_number?: string;
}

const AudioPlayer = ({ src }: { src: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const isScrubbingRef = useRef(false);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current || error) return;
        isPlaying ? audioRef.current.pause() : audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const seekToClientX = (clientX: number) => {
        if (!audioRef.current || !progressBarRef.current || error) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width || 1;
        const percentage = Math.max(0, Math.min(1, x / width));
        audioRef.current.currentTime = percentage * (audioRef.current.duration || 0);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (error || loading) return;
        isScrubbingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seekToClientX(e.clientX);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbingRef.current) return;
        e.stopPropagation();
        seekToClientX(e.clientX);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbingRef.current) return;
        e.stopPropagation();
        isScrubbingRef.current = false;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // ignore
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 w-full ${error ? 'opacity-75' : ''}`}>
            <audio
                ref={audioRef} src={src}
                onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                        setLoading(false);
                    }
                }}
                onCanPlay={() => setLoading(false)}
                onError={() => {
                    setError(true);
                    setLoading(false);
                }}
                onEnded={() => setIsPlaying(false)}
                hidden
            />

            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={togglePlay}
                    disabled={error || loading}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all shrink-0 ${error ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-4 h-4" />
                    ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                </button>
                <div className="flex-1">
                    {error ? (
                        <div className="h-7 flex items-center justify-center text-[10px] font-semibold text-red-500 bg-red-50 rounded italic">
                            Recording unavailable or still processing
                        </div>
                    ) : (
                        <>
                            <div
                                ref={progressBarRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                className="h-1.5 bg-slate-200 rounded-full cursor-pointer relative touch-none"
                                role="slider"
                                aria-label="Seek audio"
                                aria-valuemin={0}
                                aria-valuemax={Math.max(0, Math.floor(duration))}
                                aria-valuenow={Math.max(0, Math.floor(currentTime))}
                            >
                                <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${progressPercentage}%` }} />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[10px] font-bold text-slate-400">{formatTime(currentTime)}</span>
                                <span className="text-[10px] font-bold text-slate-400">{formatTime(duration)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                    <Headphones className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                        {error ? 'Error loading audio' : 'Recording Console'}
                    </span>
                </div>
                {!error && !loading && (
                    <a href={src} download className="text-slate-400 hover:text-blue-600">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                )}
            </div>
        </div>
    );
};

export const SchoolCallLogs = () => {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<CallLogData[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await api.get('/school/call-logs');
                setLogs(res.data);
            } catch (err) {
                console.error('Failed to load call logs:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const toggleExpand = (id: string | null) => setExpandedId(expandedId === id ? null : id);

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.round(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const urgencyColor = (u: string) => {
        if (u === 'immediate') return 'text-red-500 bg-red-50 border-red-100';
        if (u === 'within weeks') return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-slate-400 bg-slate-50 border-slate-100';
    };

    return (
        <div className="max-w-6xl mx-auto py-6 px-4">
            <style>{`
                @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
                @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite linear; }
                .shard-1 { animation: fadeSlideUp 0.35s ease-out both; }
                .shard-2 { animation: fadeSlideUp 0.35s 0.06s ease-out both; }
                .shard-3 { animation: fadeSlideUp 0.35s 0.12s ease-out both; }
                .shard-4 { animation: fadeSlideUp 0.35s 0.18s ease-out both; }
                .shard-5 { animation: fadeSlideUp 0.35s 0.24s ease-out both; }
                @keyframes pulseDot { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
                .pulse-dot-1 { animation: pulseDot 1.2s infinite; }
                .pulse-dot-2 { animation: pulseDot 1.2s .3s infinite; }
                .pulse-dot-3 { animation: pulseDot 1.2s .6s infinite; }
            `}</style>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-slate-100 pb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('call_logs')}</h1>
                    <p className="text-slate-500 text-sm mt-1">{t('dashboard_desc')}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Database Sync</p>
                    <p className="text-xs font-bold text-emerald-500">Live Active</p>
                </div>
            </div>

            {/* Color Legend */}
            <div className="mb-6 flex flex-wrap items-center gap-4 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Status:</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Tour Booked</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> No Tour</span>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing calls</span>
                        <span className="pulse-dot-1 text-slate-300 text-lg leading-none">·</span>
                        <span className="pulse-dot-2 text-slate-300 text-lg leading-none">·</span>
                        <span className="pulse-dot-3 text-slate-300 text-lg leading-none">·</span>
                    </div>
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`shard-${i} bg-white border border-slate-100 rounded-2xl px-5 py-4`}>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 shimmer rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <div className="shimmer h-4 rounded w-40" />
                                    <div className="shimmer h-3 rounded w-24" />
                                </div>
                                <div className="w-5 h-5 shimmer rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <Phone className="w-8 h-8 text-slate-300" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-500 mb-2">No calls yet</h2>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">Incoming calls will appear here once your AI voice agent starts answering inquiries.</p>
                </div>
            ) : (
            <div className="space-y-3">
                {logs.map((log, idx) => {
                    const isExpanded = expandedId === log.id;
                    const hasAudio = log.recordingUrl && !log.recordingUrl.includes('example.com');
                    const hasTranscript = log.transcript.length > 0;
                    const hasSummary = log.summary && log.summary.length > 0;
                    const hasStructuredData = !!(log.parent_name || log.tour_booked || (log.topics_of_interest && log.topics_of_interest.length > 0));

                    return (
                    <div key={log.id} className={`bg-white border rounded-2xl transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'border-slate-300 shadow-lg -mx-2 sm:-mx-3 px-2 sm:px-3 py-1' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                    }`}>
                        {/* Card header */}
                        <div
                            className="px-5 py-4 flex items-center gap-4 cursor-pointer select-none"
                            onClick={() => toggleExpand(log.id)}
                        >
                            {/* Status icon */}
                            <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-50">
                                    {log.call_state === 'complete' && log.tour_booked ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : log.call_state === 'complete' ? (
                                        <CheckCircle className="w-5 h-5 text-blue-400" />
                                    ) : (
                                        <Phone className="w-5 h-5" style={{ color: isExpanded ? '#3b82f6' : '#94a3b8', transition: 'color 0.3s' }} />
                                    )}
                                </div>
                                {hasAudio && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900 truncate">
                                        {log.parent_name || log.caller_number || log.participantId.replace(/^sip_/, '').replace(/^\+1/, '') || 'Unknown Caller'}
                                    </span>
                                    {log.tour_booked && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                            Tour Booked
                                        </span>
                                    )}
                                    {log.enrollment_urgency && log.enrollment_urgency !== 'unknown' && (
                                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${urgencyColor(log.enrollment_urgency)}`}>
                                            {log.enrollment_urgency}
                                        </span>
                                    )}
                                    {hasSummary && !log.tour_booked && !(log.enrollment_urgency && log.enrollment_urgency !== 'unknown') && (
                                        <span className="flex-shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {log.received_at ? formatTime(log.received_at) : new Date(log.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })}
                                    </span>
                                    {log.duration > 0 && (
                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDuration(log.duration)}
                                        </span>
                                    )}
                                    {log.child_name && log.child_name.length > 0 && (
                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {log.child_name.join(', ')}
                                        </span>
                                    )}
                                    {(hasTranscript || hasSummary) && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                            style={{ background: `${'#3b82f6'}12`, color: '#3b82f6' }}>
                                            {hasStructuredData ? 'AI Analyzed' : hasSummary ? 'AI Summarized' : 'Transcript Ready'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right: quick meta */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="hidden sm:flex items-center gap-1.5">
                                    {hasTranscript && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Transcript available" />}
                                    {hasSummary && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" title="AI summary" />}
                                    {hasAudio && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Recording" />}
                                </div>
                                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'text-slate-300'}`}
                                    style={{ color: isExpanded ? '#3b82f6' : undefined }} />
                            </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-50 animate-soft">
                                {/* ── Structured Data Grid ──────────────────────── */}
                                {hasStructuredData && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                                        {/* Parent & Contact */}
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parent</div>
                                            <div className="text-sm font-bold text-slate-900">{log.parent_name || 'Unknown'}</div>
                                            {log.parent_phone && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{log.parent_phone}</div>}
                                            {log.parent_email && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />{log.parent_email}</div>}
                                        </div>
                                        {/* Children */}
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Children</div>
                                            {log.child_name && log.child_name.length > 0 ? (
                                                <div className="space-y-1">
                                                    {log.child_name.map((name, i) => (
                                                        <div key={i} className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                            <Users className="w-3.5 h-3.5 text-slate-400" />
                                                            {name}{log.child_age?.[i] ? ` · ${log.child_age[i]}` : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-400">Not recorded</div>
                                            )}
                                        </div>
                                        {/* Tour */}
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tour</div>
                                            {log.tour_booked && log.tour_date ? (
                                                <div>
                                                    <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" />
                                                        {log.tour_date} at {log.tour_time || 'TBD'}
                                                    </div>
                                                    <div className="text-[10px] text-emerald-500 mt-0.5">Tour confirmed</div>
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
                                            {log.enrollment_urgency && log.enrollment_urgency !== 'unknown' && (
                                                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[9px] font-bold ${urgencyColor(log.enrollment_urgency)}`}>
                                                    {log.enrollment_urgency}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Topics & Questions */}
                                {((log.topics_of_interest && log.topics_of_interest.length > 0) || (log.questions_asked && log.questions_asked.length > 0)) && (
                                    <div className="flex flex-wrap items-center gap-2 mb-5 pt-2 border-t border-slate-50">
                                        {log.topics_of_interest?.map((t, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                {t}
                                            </span>
                                        ))}
                                        {log.questions_asked?.map((q, i) => (
                                            <span key={`q-${i}`} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                                                <MessageCircle className="w-2.5 h-2.5" />{q}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                                    {/* Left: Audio + Summary + One-pager */}
                                    <div className="xl:col-span-4 space-y-4">
                                        {hasAudio && <AudioPlayer src={log.recordingUrl} />}
                                        {!hasAudio && (
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                                                <Headphones className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[11px] font-medium text-slate-400">Recording still processing or unavailable</p>
                                            </div>
                                        )}
                                        {hasSummary && (
                                            <div className="rounded-xl p-5 border" style={{ background: `${'#3b82f6'}06`, borderColor: `${'#3b82f6'}20` }}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">AI Insights</h3>
                                                </div>
                                                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">"{log.summary}"</p>
                                            </div>
                                        )}
                                        {/* Email info */}
                                        {(log.email_subject || log.email_body) && (
                                            <div className="rounded-xl p-5 border border-blue-100 bg-blue-50/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Email Sent</h3>
                                                </div>
                                                {log.email_subject && <p className="text-xs font-bold text-slate-800 mb-1">{log.email_subject}</p>}
                                                {log.email_body && <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-4">{log.email_body}</p>}
                                            </div>
                                        )}
                                        {/* One-pager preview */}
                                        {log.one_pager && (
                                            <div className="rounded-xl p-5 border border-purple-100 bg-purple-50/50">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Tag className="w-3.5 h-3.5 text-purple-500" />
                                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">One-Pager</h3>
                                                    <span className="text-[9px] text-purple-400 italic" title="AI-generated summary card with call highlights, parent details, and tour info — printable for staff reference">AI-generated call summary card for staff</span>
                                                </div>
                                                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-6">{log.one_pager}</p>
                                            </div>
                                        )}
                                        {/* Call metadata */}
                                        <div className="rounded-xl p-4 border border-slate-100 bg-white">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Call Details</div>
                                            <div className="space-y-1.5 text-xs text-slate-600">
                                                {log.agent_name && <div className="flex justify-between"><span className="text-slate-400">Agent</span><span className="font-medium">{log.agent_name}</span></div>}
                                                {log.caller_number && <div className="flex justify-between"><span className="text-slate-400">From</span><span className="font-medium">{log.caller_number}</span></div>}
                                                {log.called_number && <div className="flex justify-between"><span className="text-slate-400">To</span><span className="font-medium">{log.called_number}</span></div>}
                                                {log.language_spoken && log.language_spoken !== 'English' && <div className="flex justify-between"><span className="text-slate-400">Language</span><span className="font-medium">{log.language_spoken}</span></div>}
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Status</span>
                                                    <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                                                        log.call_state === 'complete' && log.tour_booked
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : log.call_state === 'complete'
                                                            ? 'bg-blue-50 text-blue-600'
                                                            : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {log.call_state || 'unknown'}{log.tour_booked ? ' · Booked' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Transcript */}
                                    <div className="xl:col-span-8 flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" style={{ color: '#3b82f6' }} />
                                                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Conversation Transcript</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-50 rounded-lg">
                                                {log.transcript.length} TURNS
                                            </span>
                                        </div>

                                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 max-h-[400px] overflow-y-auto">
                                            {hasTranscript ? (
                                                <div className="space-y-3">
                                                    {log.transcript.map((msg, idx) => {
                                                        const isAI = msg.role.toLowerCase().includes('assistant') || msg.role.toLowerCase().includes('ai') || msg.role === 'Mia';
                                                        return (
                                                            <div key={idx} className="flex gap-3 group">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                                    isAI ? 'bg-white border border-blue-100 text-blue-500' : 'bg-white border border-slate-100 text-slate-400'
                                                                }`}>
                                                                    {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className={`text-[9px] font-black uppercase tracking-wider ${isAI ? 'text-blue-500' : 'text-slate-600'}`}>
                                                                            {isAI ? 'Nora (AI)' : 'Caller'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[13px] text-slate-600 leading-relaxed">{msg.text}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="py-14 text-center">
                                                    <MessageSquare className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transcript available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>
            )}
        </div>
    );
};
