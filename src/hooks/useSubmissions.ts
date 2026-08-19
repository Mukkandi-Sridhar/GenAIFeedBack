import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Submission } from '@/types';

export function useSubmissions(eventId?: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [newSubmissionAlert, setNewSubmissionAlert] = useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setError(null);
      let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error: err } = await query;
      if (err) throw err;
      setSubmissions(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load submissions');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel(`submissions-realtime-${eventId || 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const sub = payload.new as Submission;
          if (!eventId || sub.event_id === eventId) {
            setSubmissions((prev) => [sub, ...prev]);
            setNewSubmissionAlert(sub);
            setTimeout(() => setNewSubmissionAlert(null), 100);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions' },
        (payload) => {
          const updated = payload.new as Submission;
          if (!eventId || updated.event_id === eventId) {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSubmissions, eventId]);

  return { submissions, loading, error, connected, newSubmissionAlert, refetch: fetchSubmissions };
}
