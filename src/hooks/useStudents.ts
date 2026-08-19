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

      // Only attempt event_id filter if it's a valid UUID
      const isValidUuid = eventId && UUID_REGEX.test(eventId);

      if (isValidUuid) {
        const { data: eventScoped, error: err1 } = await supabase
          .from('students')
          .select('*')
          .eq('event_id', eventId)
          .order('reg_no', { ascending: true });

        if (!err1 && eventScoped && eventScoped.length > 0) {
          setStudents(eventScoped);
          setLoading(false);
          return;
        }
      }

      // Fallback: fetch all students from roster (resilient to missing event_id or legacy schema)
      const { data: allStudents, error: err2 } = await supabase
        .from('students')
        .select('*')
        .order('reg_no', { ascending: true });

      if (err2) throw err2;
      setStudents(allStudents || []);
    } catch (e: any) {
      console.error('[useStudents error]:', e);
      setError(e.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchStudents();

    const channel = supabase
      .channel(`students-status-${eventId || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
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
