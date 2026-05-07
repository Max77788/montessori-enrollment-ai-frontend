import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, Phone, MessageSquare, CheckCircle, AlertCircle, Plus, Trash2, Activity, MapPin } from 'lucide-react';
import api from '../../api/axios';

interface QAPair {
  question: string;
  answer: string;
}

interface SettingsData {
  id: string;
  name: string;
  address: string;
  aiNumber: string;
  routingNumber: string;
  escalationNumber: string;
  language: string;
  script: string;
  systemPrompt: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  smsAutoFollowup: boolean;
  emailAutoFollowup: boolean;
  smsTemplate: string;
  emailTemplate: string;
  qaPairs: QAPair[];
  preferredCalendar: 'google' | 'outlook' | 'both' | 'none';
  preferredEmailProvider: 'google' | 'outlook';
  googleConnected: boolean;
  outlookConnected: boolean;
  adminEmail: string;
  timezone: string;
  enableHumanTransfer: boolean;
  humanTransferCondition: string;
  humanTransferPhoneNumber: string;
  tourConfirmationEmailTemplate: string;
  tourReminderSmsTemplate: string;
  voiceProvider: string;
  vapiAssistantId: string;
}

const DEFAULT_QA_PAIRS: QAPair[] = [
  { question: "What makes your school different?", answer: "We focus on independence, hands-on learning, and child-led development in a structured childcare environment." },
  { question: "What ages do you accept?", answer: "We accept children from [age]." },
  { question: "Do you offer full-time and part-time options?", answer: "Yes, we offer full-time and part-time options depending on availability." },
  { question: "Is there availability?", answer: "Availability varies by age group. I can check availability and help schedule a tour." },
  { question: "How do I enroll?", answer: "The first step is to schedule a tour. After your visit, we guide you through the enrollment paperwork." },
  { question: "Is there an enrollment fee?", answer: "Yes, there is a registration fee of [$amount]. Full details are shared during enrollment." },
  { question: "How much is tuition?", answer: "Tuition depends on age and schedule. We review exact pricing during your tour." },
  { question: "What are your hours?", answer: "We are open from [Opening Time] to [Closing Time], Monday through Friday." },
  { question: "Are you year-round?", answer: "We operate on a [year-round / academic year] calendar." },
  { question: "What is your philosophy?", answer: "Our approach is child-centered and encourages independence, self-paced learning, and hands-on materials." },
  { question: "Are teachers certified?", answer: "Our teachers are trained in early childhood education." },
  { question: "What is the teacher-to-child ratio?", answer: "We follow all state-required ratios to ensure quality and safety." },
  { question: "How do you ensure safety?", answer: "We maintain secure entry procedures and follow all licensing and safety standards." },
  { question: "Do you provide meals?", answer: "[Yes / No]. If no, parents provide lunch and snacks." },
  { question: "How do you handle allergies?", answer: "We take allergies seriously and work closely with families to ensure safety. Allergy information is documented during onboarding." },
  { question: "Do children nap?", answer: "Yes, younger children have scheduled rest time." },
  { question: "How do parents receive updates?", answer: "We provide updates through [app/email/daily report]." },
  { question: "How long is a tour?", answer: "Tours typically last about 30–45 minutes." },
  { question: "Can I bring my child to the tour?", answer: "Yes, you're welcome to bring your child." },
  { question: "How do I schedule a tour?", answer: "I can help you schedule a tour now. What day works best?" },
  { question: "Do you offer school pickup?", answer: "Yes, we offer pickup service from nearby schools within a [X-mile] radius." },
  { question: "Which schools do you pick up from?", answer: "Pickup is available from select schools within our service area. I can confirm if your child's school qualifies." },
  { question: "Is pickup included in tuition?", answer: "Pickup service may have an additional fee. Details are shared during the enrollment discussion." },
  { question: "What time is pickup?", answer: "Pickup times depend on the partner school's dismissal schedule." },
  { question: "Is transportation safe?", answer: "Yes, we follow all transportation safety guidelines and supervision policies." },
  { question: "What if I live slightly outside the radius?", answer: "I can note your address and have our director confirm availability." },
  { question: "Do you offer drop-off service too?", answer: "Currently we offer [pickup only / pickup and drop-off]." },
  { question: "How do I register for pickup?", answer: "Pickup arrangements are finalized during enrollment. We confirm school details and scheduling at that time." },
];

// Strip any Mongoose _id fields from qaPairs
function cleanQAPairs(pairs: any[]): QAPair[] {
  return (pairs || []).map(p => ({ question: p.question || '', answer: p.answer || '' }));
}

type Tab = 'agent' | 'automation';

export const SchoolSettings = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('agent');
  const [detectingTimezone, setDetectingTimezone] = useState(false);
  const [purchasingPhone, setPurchasingPhone] = useState(false);

  // ── Load settings on mount ──────────────────────────────────────────────
  useEffect(() => {
    api.get('/school/settings')
      .then(async res => {
        const data = res.data;
        let qaPairs = cleanQAPairs(data.qaPairs);

        // First-time setup: seed default Q&A to DB for this school
        if (qaPairs.length === 0) {
          qaPairs = DEFAULT_QA_PAIRS;
          try {
            await api.put('/school/settings', { qaPairs: DEFAULT_QA_PAIRS });
            console.log('[Settings] Default Q&A pairs seeded to DB for this school.');
          } catch (err) {
            console.error('[Settings] Failed to seed default Q&A pairs:', err);
          }
        }

        setSettings({
          ...data,
          qaPairs,
          enableHumanTransfer: Boolean(data.enableHumanTransfer),
          humanTransferCondition: data.humanTransferCondition || '',
          humanTransferPhoneNumber: data.humanTransferPhoneNumber || '',
        });
      })
      .catch(err => {
        console.error('[Settings] Failed to load settings:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Save all settings to DB ──────────────────────────────────────────────
  const saveSettings = useCallback(async () => {
    if (!settings) return;
    if (
      settings.enableHumanTransfer
      && (!settings.humanTransferCondition.trim() || !settings.humanTransferPhoneNumber.trim())
    ) {
      setStatus({
        type: 'error',
        message: 'Condition and transfer phone number are required when Human Transfer is enabled.',
      });
      return;
    }

    setSaving(true);
    setStatus(null);

    const payload = {
      name: settings.name,
      address: settings.address,
      aiNumber: settings.aiNumber,
      routingNumber: settings.routingNumber,
      escalationNumber: settings.escalationNumber,
      language: settings.language,
      script: settings.script,
      systemPrompt: settings.systemPrompt,
      businessHoursStart: settings.businessHoursStart,
      businessHoursEnd: settings.businessHoursEnd,
      smsAutoFollowup: settings.smsAutoFollowup,
      emailAutoFollowup: settings.emailAutoFollowup,
      smsTemplate: settings.smsTemplate,
      emailTemplate: settings.emailTemplate,
      qaPairs: cleanQAPairs(settings.qaPairs),
      preferredCalendar: settings.preferredCalendar,
      preferredEmailProvider: settings.preferredEmailProvider,
      timezone: settings.timezone,
      adminEmail: settings.adminEmail,
      enableHumanTransfer: settings.enableHumanTransfer,
      humanTransferCondition: settings.humanTransferCondition,
      humanTransferPhoneNumber: settings.humanTransferPhoneNumber,
      tourConfirmationEmailTemplate: settings.tourConfirmationEmailTemplate,
      tourReminderSmsTemplate: settings.tourReminderSmsTemplate,
      voiceProvider: 'vapi',
      vapiAssistantId: settings.vapiAssistantId,
    };

    try {
      const res = await api.put('/school/settings', payload);
      console.log('[Settings] Saved successfully:', res.data);
      setStatus({ type: 'success', message: `Settings saved — ${res.data.qaPairsCount ?? 0} Q&A pairs stored.` });
    } catch (err: any) {
      console.error('[Settings] Save failed:', err);
      const msg = err?.response?.data?.error || 'Failed to save settings. Please try again.';
      setStatus({ type: 'error', message: msg });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 5000);
    }
  }, [settings]);

  // ── Update a single top-level field ─────────────────────────────────────
  const update = useCallback(<K extends keyof SettingsData>(field: K, value: SettingsData[K]) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : prev);
  }, []);

  // ── Auto-detect timezone from entered address ────────────────────────────
  const autoDetectTimezone = useCallback(async () => {
    if (!settings?.address || settings.address.length < 5) return;
    setDetectingTimezone(true);
    try {
      const res = await api.get('/school/detect-timezone', { params: { address: settings.address } });
      if (res.data?.timezone) {
        update('timezone', res.data.timezone);
        setStatus({ type: 'success', message: `Timezone auto-detected: ${res.data.timezone}` });
        setTimeout(() => setStatus(null), 4000);
      }
    } catch (err) {
      console.error('[Settings] Timezone detection failed:', err);
      setStatus({ type: 'error', message: 'Could not detect timezone for this address. Please select manually.' });
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setDetectingTimezone(false);
    }
  }, [settings?.address, update]);

  // ── Purchase phone number from Twilio + import to VAPI ───────────────────
  const handlePurchasePhone = useCallback(async () => {
    if (!settings) return;
    setPurchasingPhone(true);
    setStatus(null);

    try {
      const res = await api.post('/school/purchase-phone');
      const number = res.data.phoneNumber;
      update('aiNumber', number);
      setStatus({ type: 'success', message: `Phone number ${number} purchased and assigned!` });
      setTimeout(() => setStatus(null), 8000);
    } catch (err: any) {
      console.error('[Settings] Phone purchase failed:', err);
      const msg = err?.response?.data?.error || 'Failed to purchase phone number.';
      setStatus({ type: 'error', message: msg });
      setTimeout(() => setStatus(null), 8000);
    } finally {
      setPurchasingPhone(false);
    }
  }, [settings]);

  // ── Update a Q&A pair ────────────────────────────────────────────────────
  const updateQA = useCallback((index: number, field: 'question' | 'answer', value: string) => {
    setSettings(prev => {
      if (!prev) return prev;
      const pairs = prev.qaPairs.map((p, i) => i === index ? { ...p, [field]: value } : p);
      return { ...prev, qaPairs: pairs };
    });
  }, []);

  const addQA = useCallback(() => {
    setSettings(prev => {
      if (!prev) return prev;
      const newPairs = [...prev.qaPairs, { question: '', answer: '' }];
      
      // Scroll to the newly added question after state update
      setTimeout(() => {
        const newIndex = newPairs.length - 1;
        const element = document.getElementById(`qa-item-${newIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Focus on the question input field
          const questionInput = element.querySelector('input[type="text"]') as HTMLInputElement;
          if (questionInput) {
            questionInput.focus();
          }
        }
      }, 100);
      
      return { ...prev, qaPairs: newPairs };
    });
  }, []);

  const removeQA = useCallback((index: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      return { ...prev, qaPairs: prev.qaPairs.filter((_, i) => i !== index) };
    });
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );

  if (!settings) return (
    <div className="text-center py-12 text-slate-500">{t('failed_to_load_settings')}</div>
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'agent', label: 'AI Settings' },
    { id: 'automation', label: t('tab_automation') },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t('settings_title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('settings_desc')}</p>
        </div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="ui-button-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? t('saving') : t('save_settings')}
        </button>
      </div>

      {/* Toast Notification */}
      {status && (
        <div className={`fixed bottom-6 left-6 right-6 md:left-auto md:w-auto z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-soft transform transition-all duration-300 ${status.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-white border-red-100 text-red-800'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${status.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{status.type === 'success' ? 'Saved Successfully' : 'Error Saving'}</p>
            <p className="text-xs opacity-70 mt-0.5">{status.message}</p>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">

        {/* ── AI Settings tab ── */}
        {activeTab === 'agent' && (
          <>
            {/* Phone Routing */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                School Identity & Routing
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    onChange={e => update('name', e.target.value)}
                    className="ui-input w-full"
                    placeholder="Sunshine Childcare"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Address</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.address}
                      onChange={e => update('address', e.target.value)}
                      className="ui-input w-full"
                      placeholder="123 Education Way, City, ST 12345"
                    />
                    <button
                      type="button"
                      onClick={autoDetectTimezone}
                      disabled={detectingTimezone || !settings.address || settings.address.length < 5}
                      title="Auto-detect timezone from address"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {detectingTimezone ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                      {detectingTimezone ? 'Detecting...' : 'Detect TZ'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Enter full address then click "Detect TZ" to auto-set the timezone.</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                <select
                  value={settings.timezone || 'America/Chicago'}
                  onChange={e => update('timezone', e.target.value)}
                  className="ui-input w-full text-sm font-medium bg-white"
                >
                  {/* ── United States ── */}
                  <optgroup label="United States">
                    <option value="America/New_York">Eastern Time — ET (New York, Miami, Atlanta)</option>
                    <option value="America/Chicago">Central Time — CT (Chicago, Dallas, Houston)</option>
                    <option value="America/Denver">Mountain Time — MT (Denver, Phoenix†)</option>
                    <option value="America/Phoenix">Mountain Time no DST — MST (Arizona)</option>
                    <option value="America/Los_Angeles">Pacific Time — PT (Los Angeles, Seattle)</option>
                    <option value="America/Anchorage">Alaska Time — AKT</option>
                    <option value="Pacific/Honolulu">Hawaii Time — HST</option>
                    <option value="America/Indiana/Indianapolis">Indiana (Eastern, no DST)</option>
                    <option value="America/Detroit">Michigan — ET</option>
                    <option value="America/Boise">Idaho — MT</option>
                    <option value="America/Puerto_Rico">Puerto Rico — AST</option>
                  </optgroup>
                  {/* ── Canada ── */}
                  <optgroup label="Canada">
                    <option value="America/Toronto">Toronto / Ottawa — ET</option>
                    <option value="America/Vancouver">Vancouver — PT</option>
                    <option value="America/Winnipeg">Winnipeg — CT</option>
                    <option value="America/Edmonton">Edmonton — MT</option>
                    <option value="America/Halifax">Halifax — AT</option>
                    <option value="America/St_Johns">St. John's — NT</option>
                  </optgroup>
                  {/* ── Other common ── */}
                  <optgroup label="Other">
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">London — GMT/BST</option>
                    <option value="Europe/Paris">Paris / Berlin — CET</option>
                    <option value="Asia/Kolkata">India — IST</option>
                    <option value="Asia/Dubai">Dubai — GST</option>
                    <option value="Australia/Sydney">Sydney — AEST</option>
                  </optgroup>
                  {/* Dynamic fallback: if auto-detected value is not in the list above, show it */}
                  {settings.timezone && ![
                    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
                    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
                    'America/Indiana/Indianapolis', 'America/Detroit', 'America/Boise', 'America/Puerto_Rico',
                    'America/Toronto', 'America/Vancouver', 'America/Winnipeg', 'America/Edmonton',
                    'America/Halifax', 'America/St_Johns',
                    'UTC', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney',
                  ].includes(settings.timezone) && (
                      <option value={settings.timezone}>
                        {settings.timezone} (auto-detected)
                      </option>
                    )}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Use the <strong className="text-blue-600">"Detect TZ"</strong> button above to set this automatically from your address.
                </p>
              </div>

              {/* Voice AI Provider Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Voice AI Provider
                </h3>
                <label className="block p-4 rounded-lg border-2 border-blue-500 bg-white shadow-sm cursor-pointer">
                  <input
                    type="radio"
                    name="voiceProvider"
                    value="vapi"
                    checked={true}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  <div className="font-medium text-slate-900 text-sm">VAPI AI</div>
                  <div className="text-xs text-slate-500 mt-1">Next-gen voice AI. Managed via VAPI dashboard.</div>
                </label>
                {settings.vapiAssistantId && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    VAPI Assistant connected ({settings.vapiAssistantId.slice(0, 12)}...)
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('ai_phone_number')}</label>
                  {settings.aiNumber ? (
                    <input
                      type="text"
                      value={settings.aiNumber}
                      readOnly
                      className="ui-input w-full bg-green-50 border-green-200 cursor-not-allowed"
                      placeholder="Assigned AI number"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={purchasingPhone ? "Purchasing..." : "No phone number assigned"}
                        readOnly
                        className="ui-input w-full cursor-not-allowed bg-amber-50 border-amber-200 text-amber-700"
                      />
                      <button
                        type="button"
                        onClick={handlePurchasePhone}
                        disabled={purchasingPhone}
                        className="px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white"
                      >
                        {purchasingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {purchasingPhone ? 'Buying...' : 'Buy Phone Number'}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {settings.aiNumber
                      ? "The dedicated AI-managed number callers dial."
                      : "Click to purchase a Twilio number and register it with your voice provider."
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Front Desk / Routing Number</label>
                  <input
                    type="text"
                    value={settings.routingNumber}
                    onChange={e => update('routingNumber', e.target.value)}
                    className="ui-input w-full"
                    placeholder="+1 (555) 123-4568"
                  />
                  <p className="text-xs text-slate-400 mt-1">Non-inquiry calls forward here.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('escalation_number')}</label>
                  <input
                    type="text"
                    value={settings.escalationNumber}
                    onChange={e => update('escalationNumber', e.target.value)}
                    className="ui-input w-full"
                    placeholder="+1 (555) 123-4569"
                  />
                  <p className="text-xs text-slate-400 mt-1">Fallback if AI cannot handle the call.</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Booking Hours Start Time</label>
                  <input
                    type="time"
                    value={settings.businessHoursStart || '09:00'}
                    onChange={e => update('businessHoursStart', e.target.value)}
                    className="ui-input w-full"
                  />
                  <p className="text-xs text-slate-400 mt-1">Earliest time tours can be booked.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Booking Hours End Time</label>
                  <input
                    type="time"
                    value={settings.businessHoursEnd || '17:00'}
                    onChange={e => update('businessHoursEnd', e.target.value)}
                    className="ui-input w-full"
                  />
                  <p className="text-xs text-slate-400 mt-1">Latest time tours can be booked.</p>
                </div>
              </div>
            </div>

            {/* Agent Configuration - MOVED UP */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Agent Voice & Behavior
              </h2>

              {/* First Message */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  First Message (Greeting)
                </label>
                <p className="text-xs text-slate-500 mb-2 font-medium">
                  The first sentence the AI says. Use {'{parent_name}'}, {'{school_name}'} as variables.
                </p>
                <textarea
                  rows={3}
                  value={settings.script}
                  onChange={e => update('script', e.target.value)}
                  className="ui-input w-full text-sm leading-relaxed bg-slate-50/30 font-medium"
                  placeholder="Welcome to {school_name}! How can I help you today?"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  System Instruction (Prompt)
                </label>
                <p className="text-xs text-slate-500 mb-2 font-medium">
                  Core behavior instructions. Guides the AI on how to handle inquiries and schedule tours.
                </p>
                <textarea
                  rows={6}
                  value={settings.systemPrompt || ''}
                  onChange={e => update('systemPrompt', e.target.value)}
                  className="ui-input w-full text-sm font-mono leading-relaxed bg-slate-50/30"
                  placeholder="You are a professional assistant..."
                />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700">Human Transfer</label>
                    <p className="text-xs text-slate-500 mt-1">
                      Transfer calls to a human when your condition is met.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className={`text-xs font-bold ${settings.enableHumanTransfer ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {settings.enableHumanTransfer ? 'ON' : 'OFF'}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.enableHumanTransfer}
                      onChange={e => update('enableHumanTransfer', e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </label>
                </div>

                {settings.enableHumanTransfer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transfer Condition
                      </label>
                      <textarea
                        rows={3}
                        value={settings.humanTransferCondition || ''}
                        onChange={e => update('humanTransferCondition', e.target.value)}
                        className="ui-input w-full text-sm"
                        placeholder="User requests a human, supervisor, or escalation."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transfer Phone Number
                      </label>
                      <input
                        type="text"
                        value={settings.humanTransferPhoneNumber || ''}
                        onChange={e => update('humanTransferPhoneNumber', e.target.value)}
                        className="ui-input w-full"
                        placeholder="+18005550199"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Calls are transferred using <span className="font-semibold">sip_refer</span>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Q&A Knowledge Base - MOVED DOWN */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  AI Questionnaire / Knowledge Base
                </h2>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-widest">
                  {settings.qaPairs.length} Records
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-5 font-medium">
                Edit these answers to match your school's specific details. These are stored per-school.
              </p>

              <button
                type="button"
                onClick={addQA}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-all border border-blue-100 uppercase tracking-widest shadow-sm mb-4"
              >
                <Plus className="w-4 h-4" />
                Add New Question
              </button>

              <div className="space-y-3 mb-4">
                {settings.qaPairs.map((pair, index) => (
                  <div key={index} id={`qa-item-${index}`} className="flex gap-4 items-start bg-slate-50/50 p-5 rounded-xl border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black mt-1 border border-blue-100 shadow-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question</span>
                        <input
                          type="text"
                          value={pair.question}
                          onChange={e => updateQA(index, 'question', e.target.value)}
                          className="ui-input w-full bg-white text-sm font-bold border-slate-200"
                          placeholder="Enter question..."
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Response</span>
                        <textarea
                          value={pair.answer}
                          onChange={e => updateQA(index, 'answer', e.target.value)}
                          className="ui-input w-full bg-white text-sm text-slate-600 font-medium border-slate-200"
                          rows={2}
                          placeholder="Enter the answer..."
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQA(index)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 mt-1 shrink-0 border border-transparent hover:border-red-100"
                      title="Remove this Q&A pair"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addQA}
                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-all border border-blue-100 uppercase tracking-widest shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Question
              </button>
            </div>
          </>
        )}


        {/* ── Automation tab ── */}
        {activeTab === 'automation' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Automated Follow-ups
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              When an enrollment inquiry call ends, the AI can automatically send an SMS and/or email to the parent with the inquiry form link.
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.emailAutoFollowup} onChange={e => update('emailAutoFollowup', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                <div>
                  <span className="text-sm font-medium text-slate-700">Send Email follow-up after call</span>
                  <p className="text-xs text-slate-400">Requires SMTP credentials configured in the server .env file.</p>
                </div>
              </label>
            </div>

            <div className="mb-6 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notification Email</label>
                <input
                  type="email"
                  value={settings.adminEmail || ''}
                  onChange={e => update('adminEmail', e.target.value)}
                  className="ui-input w-full"
                  placeholder="notifications@school.com"
                />
                <p className="text-xs text-slate-400 mt-1">The primary email address where summary notifications and tour alerts will be sent.</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Inquiry Follow-up Templates
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
{([] as any[]).map(() => null)}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Follow-up</label>
                  <textarea rows={6} value={settings.emailTemplate} onChange={e => update('emailTemplate', e.target.value)} className="ui-input w-full text-sm leading-relaxed" placeholder="Dear {parent_name}, Thank you for your interest in {school_name}..." />
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Tour Confirmation Templates
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
{([] as any[]).map(() => null)}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Confirmation</label>
                  <textarea rows={6} value={settings.tourConfirmationEmailTemplate || ''} onChange={e => update('tourConfirmationEmailTemplate', e.target.value)} className="ui-input w-full text-sm leading-relaxed" placeholder="Dear {parent_name}, your tour at {school_name} is confirmed for {tour_date}..." />
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Bottom save button */}
        <div className="flex justify-end pb-8">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="ui-button-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t('saving') : t('save_settings')}
          </button>
        </div>

      </div>
    </div>
  );
};
