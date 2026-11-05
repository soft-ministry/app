package ro.church_office.modern.attendance.dto;

import ro.church_office.modern.attendance.dao.AttendanceStatus;

public record AttendancePersonRow(
        Long personId,
        String fullName,
        String phone,
        String memberType,
        AttendanceStatus status,
        boolean present) {
}
