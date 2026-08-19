import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student } from '@/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useStudents(eventId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setError(null);

      // 1. Fetch Roster
      const isValidUuid = eventId && UUID_REGEX.test(eventId);
      let rosterData: any[] = [];

      if (isValidUuid) {
        const { data, error: err1 } = await supabase
          .from('students')
          .select('*')
          .eq('event_id', eventId)
          .order('reg_no', { ascending: true });

        if (!err1 && data && data.length > 0) {
          rosterData = data;
        }
      }

      if (rosterData.length === 0) {
        const { data: all, error: err2 } = await supabase
          .from('students')
          .select('*')
          .order('reg_no', { ascending: true });

        if (err2) throw err2;
        rosterData = all || [];
      }

      // 2. Fetch active submissions to compute status dynamically
      // Only select reg_no, source, feedback_text to stay compatible with legacy schema (resilient to missing event_id)
      const { data: subs, error: subsErr } = await supabase
        .from('submissions')
        .select('reg_no, source, feedback_text');

      if (subsErr) {
        console.warn('[useStudents submissions query warning]:', subsErr.message);
      }

      const activeSubmittedRegs = new Set(
        (subs || [])
          .filter((sub) => sub.source !== 'deleted' && sub.feedback_text !== '__DELETED__')
          .map((sub) => sub.reg_no)
      );

      // 3. Map dynamic status
      const mapped = rosterData.map((s) => ({
        ...s,
        status: (activeSubmittedRegs.has(s.reg_no) ? 'submitted' : 'pending') as 'pending' | 'submitted',
      }));

      setStudents(mapped);
    } catch (e: any) {
      console.error('[useStudents error]:', e);
      setError(e.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStudents();

    // Listen to changes in both students AND submissions to keep UI in sync instantly
    const channel = supabase
      .channel(`students-status-${eventId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchStudents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStudents, eventId]);

  const getStudent = useCallback(
    (regNo: string) => students.find((s) => s.reg_no === regNo) ?? null,
    [students]
  );

  return { students, loading, error, refetch: fetchStudents, getStudent };
}
