package ro.church_office.modern.attendance.dto;

import java.time.LocalDate;

import ro.church_office.modern.attendance.dao.AttendanceSession;

public record AttendanceSessionSummary(
        LocalDate attendanceDate,
        AttendanceSession session,
        long presentCount,
        long absentCount,
        long totalCount,
        String recordedBy) {
}
