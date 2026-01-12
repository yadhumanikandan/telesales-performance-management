import { Request } from 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
    role: string;
    teamId: string | null;
    fullName: string | null;
  }
}

export interface AuthenticatedRequest extends Request {
  session: Request['session'] & {
    userId: string;
    email: string;
    role: string;
    teamId: string | null;
    fullName: string | null;
  };
}

export type AppRole = 'agent' | 'supervisor' | 'operations_head' | 'admin' | 'super_admin' | 'sales_controller';

export type FeedbackStatus = 'not_answered' | 'interested' | 'not_interested' | 'callback' | 'wrong_number';
export type CallStatus = 'pending' | 'called' | 'skipped';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type ContactStatus = 'new' | 'contacted' | 'interested' | 'not_interested' | 'converted';
export type SubmissionGroup = 'group1' | 'group2';
export type TeamType = 'remote' | 'office';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  username: string;
  team_id: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  is_active: boolean;
  team_id: string | null;
  supervisor_id: string | null;
  login_streak_current: number;
  login_streak_longest: number;
  last_login_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallFeedback {
  id: string;
  agent_id: string;
  contact_id: string;
  call_list_id: string | null;
  feedback_status: FeedbackStatus;
  notes: string | null;
  call_timestamp: string;
  whatsapp_sent: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  agent_id: string;
  contact_id: string;
  lead_status: LeadStatus;
  lead_score: number;
  lead_source: string | null;
  deal_value: number | null;
  expected_close_date: string | null;
  qualified_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterContact {
  id: string;
  company_name: string;
  contact_person_name: string;
  phone_number: string;
  trade_license_number: string;
  city: string | null;
  area: string | null;
  industry: string | null;
  status: ContactStatus;
  current_owner_agent_id: string | null;
  in_company_pool: boolean;
  first_uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedCallList {
  id: string;
  agent_id: string;
  contact_id: string;
  upload_id: string | null;
  list_date: string;
  call_order: number;
  call_status: CallStatus;
  called_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  team_type: TeamType;
  leader_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentSubmission {
  id: string;
  agent_id: string;
  submission_date: string;
  submission_group: SubmissionGroup;
  bank_name: string;
  notes: string | null;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTalkTime {
  id: string;
  agent_id: string;
  date: string;
  talk_time_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
