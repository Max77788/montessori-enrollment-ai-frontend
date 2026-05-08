import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Globe, ArrowRight, Loader2, School } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

export const SchoolLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, logout } = useAuthStore();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setLoading(true);
            
            // Get Google OAuth URL
            const response = await api.get('/auth/google/url?mode=signin');
            const { authUrl } = response.data;
            
            // Redirect to Google OAuth
            window.location.href = authUrl;
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to initiate Google sign in');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError(t('please_enter_credentials'));
            setLoading(false);
            return;
        }

        try {
            await login(email, password);
            const user = useAuthStore.getState().user;

            if (user?.role !== 'school') {
                setError('This portal is for schools only.');
                logout(); // Log out if they are an admin trying to use the school portal
                setLoading(false);
                return;
            }

            navigate('/school/dashboard');
        } catch (err) {
            setError(t('invalid_credentials'));
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'es' : 'en';
        i18n.changeLanguage(newLang);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md animate-soft">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <School className="w-32 h-32" />
                    </div>

                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-black text-lg">BB</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                                    {t('enrollment_ai')}
                                </h1>
                                <p className="text-xs text-slate-500 mt-0.5">{t('school_card')}</p>
                            </div>
                        </div>

                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {i18n.language === 'en' ? t('spanish') : t('english')}
                        </button>
                    </div>

                    <div className="mb-8 relative z-10">
                        <h2 className="text-2xl font-semibold text-slate-900 mb-1">{t('welcome')}</h2>
                        <p className="text-sm text-slate-500">Sign in to your school institution portal.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-11 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span className="font-medium text-sm">Sign in with Google</span>
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-slate-500">Or continue with</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">{t('email')}</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="ui-input h-11"
                                placeholder="you@school.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">{t('password')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="ui-input h-11 pr-11 w-full"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    ) : (
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 ui-button-primary h-11 rounded-lg"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            <span className="font-medium text-sm">
                                {loading ? t('signing_in') : t('signin_btn')}
                            </span>
                            {!loading ? <ArrowRight className="w-4 h-4" /> : null}
                        </button>

                        <div className="pt-2 text-center flex flex-col gap-2">
                            <p className="text-xs text-slate-500">
                                New here?{' '}
                                <button
                                    type="button"
                                    onClick={() => navigate('/register/school')}
                                    className="text-primary-600 font-semibold hover:underline"
                                >
                                    Register your school
                                </button>
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-xs text-slate-400 hover:text-primary-600 transition-colors"
                            >
                                Back to selection
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
