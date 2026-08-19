import { useState, useEffect, useCallback } from 'react';
import { supabase, DEFAULT_EVENT } from '@/lib/supabase';
import type { EventModule } from '@/types';

export function useEvents() {
  const [events, setEvents] = useState<EventModule[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      if (!data || data.length === 0) {
        // Fallback if events table is empty
        setEvents([DEFAULT_EVENT]);
        setActiveEvent(DEFAULT_EVENT);
      } else {
        setEvents(data);
        const active = data.find((e) => e.is_active) || data[0];
        setActiveEvent(active);
      }
    } catch (e: any) {
      console.warn('[useEvents] Using fallback event:', e.message);
      setEvents([DEFAULT_EVENT]);
      setActiveEvent(DEFAULT_EVENT);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEvents]);

  const selectEvent = (eventId: string) => {
    const found = events.find((e) => e.id === eventId);
    if (found) setActiveEvent(found);
  };

  const createEventModule = async (
    newEvent: Omit<EventModule, 'id' | 'created_at'>,
    studentsList: Array<{ reg_no: string; name: string }>
  ) => {
    try {
      // 1. Insert new event row
      const { data: ev, error: evErr } = await supabase
        .from('events')
        .insert({
          slug: newEvent.slug || `event-${Date.now()}`,
          title: newEvent.title,
          subject: newEvent.subject,
          department: newEvent.department,
          semester: newEvent.semester,
          event_date: newEvent.event_date,
          is_active: newEvent.is_active ?? true,
        })
        .select()
        .single();

      if (evErr) throw new Error(`Failed to create event: ${evErr.message}`);

      // 2. Insert student roster if provided
      if (studentsList.length > 0) {
        const studentRows = studentsList.map((s) => ({
          event_id: ev.id,
          reg_no: s.reg_no,
          name: s.name,
          status: 'pending',
        }));

        const { error: stErr } = await supabase.from('students').insert(studentRows);
        if (stErr) throw new Error(`Failed to seed roster: ${stErr.message}`);
      }

      await fetchEvents();
      setActiveEvent(ev);
      return ev;
    } catch (err: any) {
      throw err;
    }
  };

  const toggleEventActive = async (eventId: string, isActive: boolean) => {
    const { error } = await supabase
      .from('events')
      .update({ is_active: isActive })
      .eq('id', eventId);

    if (error) throw new Error(error.message);
    await fetchEvents();
  };

  return {
    events,
    activeEvent,
    loading,
    error,
    selectEvent,
    setActiveEvent,
    createEventModule,
    toggleEventActive,
    refetch: fetchEvents,
  };
}
