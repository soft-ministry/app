package ro.church_office.modern.attendance.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.constraints.NotNull;

import ro.church_office.modern.attendance.dao.AttendanceSession;

public record AttendanceSaveRequest(
        @NotNull LocalDate attendanceDate,
        @NotNull AttendanceSession session,
        Long groupId,
        List<Long> personIds,
        List<Long> presentPersonIds) {
}
