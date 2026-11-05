package ro.church_office.modern.attendance.dto;

import java.time.LocalDate;
import java.util.List;

import ro.church_office.modern.attendance.dao.AttendanceSession;

public record AttendanceSheetResponse(
        LocalDate attendanceDate,
        AttendanceSession session,
        Long groupId,
        String groupName,
        long presentCount,
        long absentCount,
        List<AttendancePersonRow> rows) {
}
