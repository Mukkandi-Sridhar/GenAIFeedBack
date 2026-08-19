// ─── Shared Types ─────────────────────────────────────────────────

export interface EventModule {
  id: string;
  slug: string;
  title: string;
  subject: string;
  department: string;
  semester: string;
  event_date: string;
  is_active: boolean;
  coordinator?: string;
  total_students?: number;
  created_at: string;
}

export interface Student {
  reg_no: string;
  name: string;
  event_id: string;
  status: 'pending' | 'submitted';
  submitted_at: string | null;
}

export interface Submission {
  id: string;
  event_id: string;
  reg_no: string;
  student_name: string;
  feedback_text?: string;
  answers?: Record<string, any>;
  avg_rating?: number;
  is_read?: boolean;
  is_archived?: boolean;
  file_urls: string[];
  source: 'student' | 'admin_added' | 'deleted';
  created_at: string;
}

export interface AdminSession {
  token: string;
  expires_at: number; // unix ms
}

export interface VerifyAdminResult {
  ok: boolean;
  locked_until: string | null;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface ExportRow {
  sno: number;
  reg_no: string;
  name: string;
  feedback_summary: string;
  attachments: number;
  submitted_at: string;
  source: string;
}
