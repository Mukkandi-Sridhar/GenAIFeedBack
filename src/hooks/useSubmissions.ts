import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Submission } from '@/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DELETED_IDS_KEY = 'dfa19_deleted_submissions';

function getLocalDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function addLocalDeletedId(id: string) {
  try {
    const set = getLocalDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('[LocalStorage deleted set note]:', e);
  }
}

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

      // Filter out soft-deleted & locally-deleted submissions
      const deletedSet = getLocalDeletedIds();
      const activeOnly = list.filter(
        (s) => !deletedSet.has(s.id) && s.source !== 'deleted' && s.feedback_text !== '__DELETED__'
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

    // 1. Immediately store in LocalStorage deleted set so F5 refresh NEVER shows it again
    addLocalDeletedId(sub.id);

    // 2. Remove immediately from React state
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));

    // 3. Attempt remote RPC / SQL deletion in background
    try {
      const { error: rpcErr } = await supabase.rpc('delete_student_submission', {
        p_sub_id: sub.id,
        p_reg_no: sub.reg_no,
        p_event_id: sub.event_id || '',
      });

      if (rpcErr) {
        console.warn('[deleteSubmission RPC note]:', rpcErr.message, '— trying direct query');

        const { error: delErr } = await supabase
          .from('submissions')
          .delete()
          .eq('id', sub.id);

        if (delErr) {
          console.warn('[deleteSubmission direct delete note]:', delErr.message, '— applying soft delete marker');
          await supabase
            .from('submissions')
            .update({ source: 'deleted', feedback_text: '__DELETED__' })
            .eq('id', sub.id);
        }
      }

      // 4. Always reset student status to pending
      let updateQuery = supabase
        .from('students')
        .update({ status: 'pending', submitted_at: null })
        .eq('reg_no', sub.reg_no);

      if (sub.event_id) {
        updateQuery = updateQuery.eq('event_id', sub.event_id);
      }

      await updateQuery;
    } catch (err) {
      console.warn('[deleteSubmission background sync note]:', err);
    }
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
          const deletedSet = getLocalDeletedIds();
          if (!deletedSet.has(sub.id) && sub.source !== 'deleted' && sub.feedback_text !== '__DELETED__') {
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
          const deletedSet = getLocalDeletedIds();
          if (deletedSet.has(updated.id) || updated.source === 'deleted' || updated.feedback_text === '__DELETED__') {
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
