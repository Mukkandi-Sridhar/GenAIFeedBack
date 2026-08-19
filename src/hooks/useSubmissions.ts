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
      let list: Submission[] = [];

      if (isValidUuid) {
        const { data: scoped, error: err1 } = await supabase
          .from('submissions')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        if (!err1 && scoped) {
          list = scoped;
        }
      }

      if (list.length === 0) {
        // Fallback: fetch all submissions
        const { data: all, error: err2 } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (err2) throw err2;
        list = all || [];
      }

      // Filter out soft-deleted submissions
      const activeOnly = list.filter(
        (s) => s.source !== 'deleted' && s.feedback_text !== '__DELETED__'
      );

      setSubmissions(activeOnly);
    } catch (e: any) {
      console.error('[useSubmissions error]:', e);
      setError(e.message || 'Failed to load submissions');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const deleteSubmission = useCallback(async (sub: Submission) => {
    console.log('[deleteSubmission] Executing delete for ID:', sub.id, 'RegNo:', sub.reg_no);

    // 1. Try RPC first if available in Supabase
    const { error: rpcErr } = await supabase.rpc('delete_student_submission', {
      p_sub_id: sub.id,
      p_reg_no: sub.reg_no,
      p_event_id: sub.event_id || '',
    });

    if (rpcErr) {
      console.warn('[deleteSubmission RPC note]:', rpcErr.message, '— executing fallback update/delete');

      // 2. Try hard delete
      const { error: delErr } = await supabase
        .from('submissions')
        .delete()
        .eq('id', sub.id);

      if (delErr) {
        console.warn('[deleteSubmission hard-delete note]:', delErr.message, '— applying resilient soft-delete marker');
        // 3. Resilient fallback: update submission source to 'deleted' (allowed by RLS)
        await supabase
          .from('submissions')
          .update({ source: 'deleted', feedback_text: '__DELETED__' })
          .eq('id', sub.id);
      }

      // 4. Always reset student status to pending in students table
      let updateQuery = supabase
        .from('students')
        .update({ status: 'pending', submitted_at: null })
        .eq('reg_no', sub.reg_no);

      if (sub.event_id) {
        updateQuery = updateQuery.eq('event_id', sub.event_id);
      }

      await updateQuery;
    }

    // 5. Remove immediately from local state
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
          if (sub.source !== 'deleted' && sub.feedback_text !== '__DELETED__') {
            setSubmissions((prev) => [sub, ...prev.filter((s) => s.id !== sub.id)]);
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
          if (updated.source === 'deleted' || updated.feedback_text === '__DELETED__') {
            setSubmissions((prev) => prev.filter((s) => s.id !== updated.id));
          } else {
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
          }
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
