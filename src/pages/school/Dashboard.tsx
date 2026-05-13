import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PlayCircle, Activity, TrendingUp, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '../../components/MetricCard';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../../api/axios';
import { Calendar as CalendarUI } from '../../components/Calendar';
import { RecentCalls } from '../../components/RecentCalls';

interface DashboardResponse {
  metrics: Array<{ label: string; value: number; change?: number; maxValue?: number }>;
  chartData: Array<{ name: string; calls: number; inquiries: number }>;
  recentCalls: Array<{
    id: string;
    conversationId?: string | null;
    callerName: string;
    callerPhone: string;
    callType: string;
    duration: number;
    timestamp: string;
    recordingUrl: string | null;
    summary?: string;
    tourBookingDetected?: boolean;
    tourBookingDate?: string | null;
    aiProcessed?: boolean;
  }>;

}

export const SchoolDashboard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [tourBookings, setTourBookings] = useState<Array<{
    id: string;
    parentName: string;
    phone: string;
    email: string;
    scheduledAt: string;
    calendarProvider: string | null;
  }>>([]);
  const [toursLoading, setToursLoading] = useState(true);

  const fetchDashboard = React.useCallback(async (p: string, signal?: AbortSignal) => {
    console.log(`[Dashboard] Fetching dashboard for period: ${p}`);
    try {
      const dashboardRes = await api.get(`/school/dashboard?period=${p}`, { signal });
      console.log(`[Dashboard] Received data for period: ${dashboardRes.data.period}`, dashboardRes.data.metrics);
      setData(dashboardRes.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const fetchTourBookings = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const toursRes = await api.get('/school/tour-bookings', { signal });
      setTourBookings(Array.isArray(toursRes.data) ? toursRes.data : []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      setTourBookings([]);
    } finally {
      if (!signal?.aborted) {
        setToursLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    console.log(`[Dashboard] useEffect triggered by period: ${period}`);
    const controller = new AbortController();
    setLoading(true);
    void fetchDashboard(period, controller.signal);
    void fetchTourBookings(controller.signal);
    const intervalId = setInterval(() => {
      fetchDashboard(period);
      fetchTourBookings();
    }, 30000);
    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [period, fetchDashboard, fetchTourBookings]);



  if (!data && !loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">{t('unable_to_load_metrics')}</h3>
        <p className="text-slate-500 text-sm">{t('check_connection')}</p>
      </div>
    );
  }

  const metrics = data?.metrics || [];
  const chartData = data?.chartData || [];
  const recentCalls = data?.recentCalls || [];


  return (
    <div className="animate-soft max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('dashboard')}</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider tabular-nums shrink-0">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              Live • {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">{t('dashboard_desc')}</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
          {/* Period Filter Pills - Restoration */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-inner w-full sm:w-auto">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all capitalize ${period === p
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-transparent text-slate-400 hover:text-slate-600'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

          {/* Action Links */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/school/daily-insights"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all shadow-sm"
            >
              <Lightbulb className="w-4 h-4" />
              Daily Insights
            </Link>
            <button
              onClick={async () => {
                try {
                  await api.post('/school/test-call');
                  window.location.reload();
                } catch (err) {
                  alert(t('test_call_failed'));
                }
              }}
              className="flex-1 sm:flex-none ui-button-primary gap-2 !rounded-xl px-4 !py-2 shadow-sm"
            >
              <PlayCircle className="w-4 h-4" />
              {t('simulate_inquiry_call')}
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: Top Metrics (Full Width) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-10">
        {loading ? (
          [1,2,3,4,5].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-20 mb-3" />
              <div className="h-8 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-50 rounded w-24" />
            </div>
          ))
        ) : (
          metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))
        )}
      </div>

      {/* Recent Calls from VAPI Structured Output */}
      <div className="mb-10">
        <RecentCalls />
      </div>

      {/* Row 2: Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-start">
        {/* Left: Analytics Chart (8 Columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm h-full hidden lg:block">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Inquiry Call Volume
            </h2>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100 px-2 py-1 rounded">
              Trend Analysis
            </div>
          </div>
          <div className="w-full h-[400px]">
            {loading ? (
              <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
            ) : chartData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={15} minTickGap={20} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}
                  />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                No telemetry available for this window.
              </div>
            )}
          </div>
        </div>

        {/* Right: School Calendar (4 Columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden min-h-[500px] relative">
          {toursLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[1px] rounded-2xl">
              <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">{t('loading')}</span>
            </div>
          )}
          <CalendarUI bookings={tourBookings} />
        </div>
      </div>



    </div>
  );
};
