import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Submission } from '@/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useSubmissions(eventId?: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [newSubmissionAlert, setNewSubmissionAlert] = useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setError(null);
      const isValidUuid = eventId && UUID_REGEX.test(eventId);

      if (isValidUuid) {
        const { data: scoped, error: err1 } = await supabase
          .from('submissions')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (!err1 && scoped) {
          setSubmissions(scoped);
          setLoading(false);
          return;
        }
      }

      // Fallback: fetch all submissions
      const { data: all, error: err2 } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (err2) throw err2;
      setSubmissions(all || []);
    } catch (e: any) {
      console.error('[useSubmissions error]:', e);
      setError(e.message || 'Failed to load submissions');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const deleteSubmission = useCallback(async (sub: Submission) => {
    const { error: delErr } = await supabase
      .from('submissions')
      .delete()
      .eq('id', sub.id);

    if (delErr) throw delErr;

    // Reset student status to pending so they can resubmit
    if (sub.event_id) {
      await supabase
        .from('students')
        .update({ status: 'pending', submitted_at: null })
        .eq('reg_no', sub.reg_no)
        .eq('event_id', sub.event_id);
    } else {
      await supabase
        .from('students')
        .update({ status: 'pending', submitted_at: null })
        .eq('reg_no', sub.reg_no);
    }

    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));
  }, []);

  useEffect(() => {
    fetchSubmissions();

    const channel = supabase
      .channel(`submissions-realtime-${eventId || 'all'}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions' },
        (payload) => {
          const sub = payload.new as Submission;
          setSubmissions((prev) => [sub, ...prev]);
          setNewSubmissionAlert(sub);
          setTimeout(() => setNewSubmissionAlert(null), 100);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions' },
        (payload) => {
          const updated = payload.new as Submission;
          setSubmissions((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'submissions' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setSubmissions((prev) => prev.filter((s) => s.id !== deletedId));
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

  return {
    submissions,
    loading,
    error,
    connected,
    newSubmissionAlert,
    refetch: fetchSubmissions,
    deleteSubmission,
  };
}
