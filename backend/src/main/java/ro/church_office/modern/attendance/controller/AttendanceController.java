package ro.church_office.modern.attendance.controller;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ro.church_office.modern.attendance.dao.AttendanceSession;
import ro.church_office.modern.attendance.dto.AttendanceSaveRequest;
import ro.church_office.modern.attendance.dto.AttendanceSessionSummary;
import ro.church_office.modern.attendance.dto.AttendanceSheetResponse;
import ro.church_office.modern.attendance.dto.AttendanceUpdateRequest;
import ro.church_office.modern.attendance.service.AttendanceService;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @GetMapping("/sessions")
    public List<AttendanceSessionSummary> sessions() {
        return attendanceService.sessions();
    }

    @GetMapping("/sheet")
    public AttendanceSheetResponse sheet(
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "session", required = false) AttendanceSession session,
            @RequestParam(value = "groupId", required = false) Long groupId) {
        return attendanceService.sheet(date, session, groupId);
    }

    @PostMapping
    public AttendanceSheetResponse save(@Valid @RequestBody AttendanceSaveRequest request) {
        return attendanceService.save(request);
    }

    @PutMapping
    public AttendanceSheetResponse update(@Valid @RequestBody AttendanceUpdateRequest request) {
        return attendanceService.update(request);
    }

    @DeleteMapping
    public void delete(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam("session") AttendanceSession session) {
        attendanceService.delete(date, session);
    }
}
