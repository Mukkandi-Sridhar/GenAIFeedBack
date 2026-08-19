import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { CoverScreen } from '@/pages/CoverScreen';
import { RosterScreen } from '@/pages/RosterScreen';
import { FeedbackScreen } from '@/pages/FeedbackScreen';
import { AdminGate } from '@/pages/AdminGate';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { useEvents } from '@/hooks/useEvents';
import { DEFAULT_EVENT } from '@/lib/supabase';

const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'admin';

function StudentPortal() {
  const [entered, setEntered] = useState(false);
  const { events, activeEvent, selectEvent } = useEvents();

  const currentEvent = activeEvent || DEFAULT_EVENT;

  return (
    <AnimatePresence mode="wait">
      {!entered ? (
        <motion.div
          key="cover"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.97 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <CoverScreen
            events={events}
            onSelectEvent={selectEvent}
            onEnter={() => setEntered(true)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="roster"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <RosterScreen
            eventInfo={currentEvent}
            onBack={() => setEntered(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Student portal */}
          <Route path="/" element={<StudentPortal />} />
          <Route path="/roster" element={<StudentPortal />} />

          {/* Feedback form */}
          <Route path="/feedback/:regNo" element={<FeedbackScreen />} />

          {/* Admin routes — supports /admin directly as well as custom VITE_ADMIN_SLUG */}
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {adminSlug !== 'admin' && (
            <>
              <Route path={`/${adminSlug}`} element={<AdminGate />} />
              <Route path={`/${adminSlug}/dashboard`} element={<AdminDashboard />} />
            </>
          )}

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
