import { useState, useEffect, useCallback, useRef } from 'react';

const STALE_TTL = 30000; // 30 seconds before a cache entry is considered stale

function readCache<T>(key: string): T | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (Date.now() - entry.ts > STALE_TTL) {
            sessionStorage.removeItem(key);
            return null;
        }
        return entry.data as T;
    } catch { return null; }
}

function writeCache(key: string, data: any) {
    try {
        sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded — ignore */ }
}

/**
 * Stale-while-revalidate hook with sessionStorage cache.
 * - First visit ever: skeleton → data
 * - Tab switch back / remount: CACHED data shown instantly → silent background refresh
 * - Interval refresh: old data stays visible, new data replaces when ready
 */
export function useStaleData<T>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    deps: any[] = []
) {
    const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey));
    const [loading, setLoading] = useState(() => !readCache<T>(cacheKey));
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const fetch = useCallback(async () => {
        try {
            setError(null);
            const result = await fetcher();
            if (!mountedRef.current) return;
            setData(result);
            writeCache(cacheKey, result);
        } catch (err: any) {
            if (!mountedRef.current) return;
            if (data) {
                // Keep stale data on background refresh failure
                console.warn('[SWR] Background refresh failed:', err.message);
            } else {
                setError(err.message || 'Failed to load');
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, deps);

    useEffect(() => {
        mountedRef.current = true;
        fetch();
        return () => { mountedRef.current = false; };
    }, [fetch]);

    const refetch = useCallback(() => fetch(), [fetch]);

    return { data, loading: loading && !data, error, refetch };
}

export { readCache, writeCache };
