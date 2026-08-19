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

      // 1. Fetch submissions
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
        const { data: all, error: err2 } = await supabase
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false });

        if (err2) throw err2;
        list = all || [];
      }

      // 2. Fetch student roster status to hide submissions for reset/pending students
      let rosterQuery = supabase.from('students').select('reg_no, status');
      if (isValidUuid) {
        rosterQuery = rosterQuery.eq('event_id', eventId);
      }
      const { data: studentsData } = await rosterQuery;
      const studentStatusMap = new Map<string, 'pending' | 'submitted'>(
        (studentsData || []).map((s) => [s.reg_no, s.status])
      );

      // 3. Filter and keep only submissions where the student status is currently 'submitted'
      const deletedSet = getLocalDeletedIds();
      const activeList = list.filter((s) => {
        const status = studentStatusMap.get(s.reg_no);
        return status === 'submitted' && !deletedSet.has(s.id) && s.source !== 'deleted' && s.feedback_text !== '__DELETED__';
      });

      // 4. De-duplicate to keep only the latest submission per registration number
      const seen = new Set<string>();
      const deduplicated: Submission[] = [];
      for (const sub of activeList) {
        if (!seen.has(sub.reg_no)) {
          seen.add(sub.reg_no);
          deduplicated.push(sub);
        }
      }

      setSubmissions(deduplicated);
    } catch (e: any) {
      console.error('[useSubmissions error]:', e);
      setError(e.message || 'Failed to load submissions');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const deleteSubmission = useCallback(async (sub: Submission) => {
    console.log('[deleteSubmission] Resetting student status for RegNo:', sub.reg_no);

    // 1. Immediately reset student status to pending (allowed by RLS!)
    addLocalDeletedId(sub.id);
    setSubmissions((prev) => prev.filter((s) => s.id !== sub.id));

    let updateQuery = supabase
      .from('students')
      .update({ status: 'pending', submitted_at: null })
      .eq('reg_no', sub.reg_no);

    if (sub.event_id) {
      updateQuery = updateQuery.eq('event_id', sub.event_id);
    }

    const { error: resetErr } = await updateQuery;
    if (resetErr) {
      console.warn('[deleteSubmission status reset note]:', resetErr.message);
    }

    // 2. Background: Try clean database deletion (falls back to soft-delete if blocked by RLS)
    try {
      const { error: rpcErr } = await supabase.rpc('delete_student_submission', {
        p_sub_id: sub.id,
        p_reg_no: sub.reg_no,
        p_event_id: sub.event_id || '',
      });

      if (rpcErr) {
        const { error: delErr } = await supabase
          .from('submissions')
          .delete()
          .eq('id', sub.id);

        if (delErr) {
          await supabase
            .from('submissions')
            .update({ source: 'deleted', feedback_text: '__DELETED__' })
            .eq('id', sub.id);
        }
      }
    } catch (err) {
      console.warn('[deleteSubmission background delete note]:', err);
    }
  }, []);

  const toggleReadStatus = useCallback(async (sub: Submission) => {
    const nextRead = !sub.is_read;
    // Local state update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, is_read: nextRead } : s))
    );

    // DB update
    try {
      await supabase
        .from('submissions')
        .update({ is_read: nextRead })
        .eq('id', sub.id);
    } catch (err) {
      console.warn('[toggleReadStatus DB sync note]:', err);
    }
  }, []);

  const toggleArchiveStatus = useCallback(async (sub: Submission) => {
    const nextArchived = !sub.is_archived;
    // Local state update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, is_archived: nextArchived } : s))
    );

    // DB update
    try {
      await supabase
        .from('submissions')
        .update({ is_archived: nextArchived })
        .eq('id', sub.id);
    } catch (err) {
      console.warn('[toggleArchiveStatus DB sync note]:', err);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();

    // Listen to updates in both tables to sync dashboard instantly
    const channel = supabase
      .channel(`submissions-realtime-${eventId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchSubmissions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchSubmissions();
      })
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
    toggleReadStatus,
    toggleArchiveStatus,
  };
}
