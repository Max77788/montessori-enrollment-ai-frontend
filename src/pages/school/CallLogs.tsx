import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Phone, Loader2, MessageSquare, Play, Pause, Clock,
    Calendar, ChevronDown, User, Bot, Headphones
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
                        <Download className="w-3.5 h-3.5" />
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('loading')}</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-6 px-4">
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

            {logs.length === 0 ? (
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
                    const colorSet = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 6];
                    const isExpanded = expandedId === log.id;
                    const durationMin = Math.floor(log.duration / 60);
                    const durationSec = Math.round(log.duration % 60);
                    const hasAudio = log.recordingUrl && !log.recordingUrl.includes('example.com');
                    const hasTranscript = log.transcript.length > 0;
                    const hasSummary = log.summary && log.summary.length > 0;

                    return (
                    <div key={log.id} className={`bg-white border rounded-2xl transition-all duration-300 overflow-hidden ${
                        isExpanded ? 'border-slate-300 shadow-xl -mx-2 sm:-mx-3 px-2 sm:px-3 py-1' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                    }`}>
                        {/* Card header */}
                        <div
                            className="px-5 py-4 flex items-center gap-4 cursor-pointer select-none"
                            onClick={() => toggleExpand(log.id)}
                        >
                            {/* Animated icon */}
                            <div className="relative flex-shrink-0">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors overflow-hidden"
                                    style={{ background: isExpanded ? `linear-gradient(135deg, ${colorSet}20, ${colorSet}08)` : undefined }}>
                                    <Phone className="w-5 h-5" style={{ color: isExpanded ? colorSet : '#94a3b8', transition: 'color 0.3s' }} />
                                </div>
                                {hasAudio && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>

                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 truncate">
                                        {log.participantId.replace(/^sip_/, '').replace(/^\+1/, '') || 'Unknown Caller'}
                                    </span>
                                    {hasSummary && (
                                        <span className="flex-shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: colorSet }} />
                                    )}
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                                        {durationMin}:{durationSec.toString().padStart(2, '0')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(log.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(log.createdAt).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {(hasTranscript || hasSummary) && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                            style={{ background: `${colorSet}12`, color: colorSet }}>
                                            {hasSummary ? 'AI Summarized' : 'Transcript Ready'}
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
                                    style={{ color: isExpanded ? colorSet : undefined }} />
                            </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-50 animate-soft">
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                                    {/* Left: Audio + Summary */}
                                    <div className="xl:col-span-4 space-y-4">
                                        {hasAudio && <AudioPlayer src={log.recordingUrl} />}
                                        {!hasAudio && (
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                                                <Headphones className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                                                <p className="text-[11px] font-medium text-slate-400">Recording still processing or unavailable</p>
                                            </div>
                                        )}
                                        {hasSummary && (
                                            <div className="rounded-xl p-5 border" style={{ background: `${colorSet}06`, borderColor: `${colorSet}20` }}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: colorSet }} />
                                                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">AI Insights</h3>
                                                </div>
                                                <p className="text-[13px] text-slate-600 leading-relaxed font-medium">"{log.summary}"</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Transcript */}
                                    <div className="xl:col-span-8 flex flex-col">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" style={{ color: colorSet }} />
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
