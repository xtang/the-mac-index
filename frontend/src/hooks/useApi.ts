import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api/v1';

export function useApi<T>(endpoint: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE}${endpoint}`);
                if (!response.ok) throw new Error('Failed to fetch');
                const json = await response.json();
                setData(json);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [endpoint]);

    return { data, loading, error };
}

export async function postApi<T, R>(endpoint: string, body: T): Promise<R> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
}
