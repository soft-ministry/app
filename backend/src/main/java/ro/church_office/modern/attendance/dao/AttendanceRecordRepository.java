package ro.church_office.modern.attendance.dao;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByChurchIdAndAttendanceDateAndSession(
            Long churchId, LocalDate attendanceDate, AttendanceSession session);

    Optional<AttendanceRecord> findByChurchIdAndAttendanceDateAndSessionAndPersonId(
            Long churchId, LocalDate attendanceDate, AttendanceSession session, Long personId);

    List<AttendanceRecord> findByChurchIdOrderByAttendanceDateDescSessionAsc(Long churchId);

    int deleteByChurchIdAndAttendanceDateAndSession(Long churchId, LocalDate attendanceDate, AttendanceSession session);
}
