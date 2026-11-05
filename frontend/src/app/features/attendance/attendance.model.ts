export type AttendanceSession = 'DEFAULT' | 'MORNING' | 'EVENING';
export type AttendanceStatus = 'PRESENT' | 'ABSENT';

export interface AttendancePersonRow {
  personId: number;
  fullName: string;
  phone?: string | null;
  memberType?: string | null;
  status: AttendanceStatus;
  present: boolean;
}

export interface AttendanceSheet {
  attendanceDate: string;
  session: AttendanceSession;
  groupId?: number | null;
  groupName?: string | null;
  presentCount: number;
  absentCount: number;
  rows: AttendancePersonRow[];
}

export interface AttendanceSummary {
  attendanceDate: string;
  session: AttendanceSession;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  recordedBy?: string | null;
}

export interface AttendanceSaveRequest {
  attendanceDate: string;
  session: AttendanceSession;
  groupId?: number | null;
  personIds: number[];
  presentPersonIds: number[];
}

export interface AttendanceUpdateRequest extends AttendanceSaveRequest {
  originalAttendanceDate: string;
  originalSession: AttendanceSession;
}
