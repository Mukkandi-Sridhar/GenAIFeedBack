import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student } from '@/types';

export function useStudents(eventId?: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      setError(null);
      let query = supabase.from('students').select('*').order('reg_no', { ascending: true });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data, error: err } = await query;
      if (err) throw err;

      setStudents(data || []);
    } catch (e: any) {
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
