import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ExternalLink, Server,Database, Phone, Calendar, CreditCard, Mail, Brain, Cpu } from 'lucide-react';

interface ServiceStatus {
  name: string;
  type: string;
  status: 'connected' | 'degraded' | 'disconnected';
  detail: string;
  accessUrl?: string | null;
  lastChecked: string;
}

interface PlatformData {
  timestamp: string;
  services: ServiceStatus[];
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hosting: <Server className="w-5 h-5" />,
  database: <Database className="w-5 h-5" />,
  voice_ai: <Brain className="w-5 h-5" />,
  telephony: <Phone className="w-5 h-5" />,
  calendar: <Calendar className="w-5 h-5" />,
  billing: <CreditCard className="w-5 h-5" />,
  email: <Mail className="w-5 h-5" />,
  ai: <Brain className="w-5 h-5" />,
  infrastructure: <Cpu className="w-5 h-5" />,
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'connected') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
  if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <XCircle className="w-5 h-5 text-red-400" />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    disconnected: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${colors[status] || colors.disconnected}`}>
      {status}
    </span>
  );
}

export const PlatformStatus = () => {
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/platform-status')
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load platform status'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Failed to load</h2>
        <p className="text-slate-500">{error || 'No data available'}</p>
      </div>
    );
  }

  const connectedCount = data.services.filter(s => s.status === 'connected').length;
  const degradedCount = data.services.filter(s => s.status === 'degraded').length;
  const disconnectedCount = data.services.filter(s => s.status === 'disconnected').length;

  return (
    <div className="animate-soft">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Platform Status</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Infrastructure health overview for all connected services.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold text-emerald-600">{connectedCount}</div>
              <div className="text-xs text-slate-500">Connected</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{degradedCount}</div>
              <div className="text-xs text-slate-500">Degraded</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <div className="text-2xl font-bold text-red-600">{disconnectedCount}</div>
              <div className="text-xs text-slate-500">Disconnected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Service list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Services</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.services.map((service, idx) => (
            <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 text-slate-400">
                {TYPE_ICONS[service.type] || <Server className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">{service.name}</span>
                  <StatusBadge status={service.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{service.detail}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusIcon status={service.status} />
                {service.accessUrl && (
                  <a
                    href={service.accessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-500 transition-colors"
                    title="Open dashboard"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
          Last checked: {new Date(data.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
};
