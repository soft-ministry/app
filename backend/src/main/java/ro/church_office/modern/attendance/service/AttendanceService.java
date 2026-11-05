package ro.church_office.modern.attendance.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.attendance.dao.AttendanceRecord;
import ro.church_office.modern.attendance.dao.AttendanceRecordRepository;
import ro.church_office.modern.attendance.dao.AttendanceSession;
import ro.church_office.modern.attendance.dao.AttendanceStatus;
import ro.church_office.modern.attendance.dto.AttendancePersonRow;
import ro.church_office.modern.attendance.dto.AttendanceSaveRequest;
import ro.church_office.modern.attendance.dto.AttendanceSessionSummary;
import ro.church_office.modern.attendance.dto.AttendanceSheetResponse;
import ro.church_office.modern.attendance.dto.AttendanceUpdateRequest;
import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.group.dao.ChurchGroup;
import ro.church_office.modern.group.dao.ChurchGroupRepository;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class AttendanceService {
    private final AttendanceRecordRepository attendanceRepository;
    private final PersonRepository personRepository;
    private final ChurchGroupRepository groupRepository;
    private final ChurchSettingsService churchSettingsService;

    public AttendanceService(AttendanceRecordRepository attendanceRepository,
            PersonRepository personRepository,
            ChurchGroupRepository groupRepository,
            ChurchSettingsService churchSettingsService) {
        this.attendanceRepository = attendanceRepository;
        this.personRepository = personRepository;
        this.groupRepository = groupRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public AttendanceSheetResponse sheet(LocalDate date, AttendanceSession session, Long groupId) {
        ensureEnabled();
        LocalDate attendanceDate = date == null ? LocalDate.now() : date;
        AttendanceSession attendanceSession = session == null ? AttendanceSession.MORNING : session;
        Long churchId = activeChurchId();
        ChurchGroup group = groupId == null ? null : loadGroup(groupId, churchId);
        List<Person> people = peopleForSheet(churchId, group);
        Map<Long, AttendanceRecord> records = attendanceRepository
                .findByChurchIdAndAttendanceDateAndSession(churchId, attendanceDate, attendanceSession)
                .stream()
                .collect(Collectors.toMap(AttendanceRecord::getPersonId, Function.identity(), (left, right) -> left));

        List<AttendancePersonRow> rows = people.stream()
                .map(person -> row(person, records.get(person.getId())))
                .toList();
        long presentCount = rows.stream().filter(AttendancePersonRow::present).count();
        return new AttendanceSheetResponse(
                attendanceDate,
                attendanceSession,
                group == null ? null : group.getId(),
                group == null ? null : group.getName(),
                presentCount,
                rows.size() - presentCount,
                rows);
    }

    @Transactional(readOnly = true)
    public List<AttendanceSessionSummary> sessions() {
        ensureEnabled();
        Long churchId = activeChurchId();
        Map<String, List<AttendanceRecord>> grouped = attendanceRepository.findByChurchIdOrderByAttendanceDateDescSessionAsc(churchId)
                .stream()
                .collect(Collectors.groupingBy(
                        record -> record.getAttendanceDate() + "|" + record.getSession(),
                        LinkedHashMap::new,
                        Collectors.toList()));
        List<AttendanceSessionSummary> result = new ArrayList<>();
        grouped.values().forEach(records -> {
            AttendanceRecord first = records.get(0);
            long present = records.stream().filter(record -> record.getStatus() == AttendanceStatus.PRESENT).count();
            result.add(new AttendanceSessionSummary(
                    first.getAttendanceDate(),
                    first.getSession(),
                    present,
                    records.size() - present,
                    records.size(),
                    recordedBy(records)));
        });
        return result.stream()
                .sorted(Comparator.comparing(AttendanceSessionSummary::attendanceDate).reversed()
                        .thenComparing(AttendanceSessionSummary::session))
                .toList();
    }

    @Transactional
    public AttendanceSheetResponse save(AttendanceSaveRequest request) {
        ensureEnabled();
        Long churchId = activeChurchId();
        AttendanceSession session = request.session() == null ? AttendanceSession.MORNING : request.session();
        LocalDate date = request.attendanceDate() == null ? LocalDate.now() : request.attendanceDate();
        ChurchGroup group = request.groupId() == null ? null : loadGroup(request.groupId(), churchId);
        Set<Long> allowedPersonIds = peopleForSheet(churchId, group).stream()
                .map(Person::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> submittedPersonIds = request.personIds() == null || request.personIds().isEmpty()
                ? allowedPersonIds
                : request.personIds().stream()
                        .filter(allowedPersonIds::contains)
                        .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<Long> presentPersonIds = request.presentPersonIds() == null
                ? Set.of()
                : request.presentPersonIds().stream()
                        .filter(submittedPersonIds::contains)
                        .collect(Collectors.toSet());
        String recordedBy = currentUsername();

        for (Long personId : submittedPersonIds) {
            AttendanceRecord record = attendanceRepository
                    .findByChurchIdAndAttendanceDateAndSessionAndPersonId(churchId, date, session, personId)
                    .orElseGet(AttendanceRecord::new);
            record.setChurchId(churchId);
            record.setPersonId(personId);
            record.setAttendanceDate(date);
            record.setSession(session);
            record.setStatus(presentPersonIds.contains(personId) ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT);
            record.setRecordedBy(recordedBy);
            attendanceRepository.save(record);
        }
        return sheet(date, session, request.groupId());
    }

    @Transactional
    public AttendanceSheetResponse update(AttendanceUpdateRequest request) {
        ensureEnabled();
        Long churchId = activeChurchId();
        LocalDate originalDate = request.originalAttendanceDate() == null ? LocalDate.now() : request.originalAttendanceDate();
        AttendanceSession originalSession = request.originalSession() == null ? AttendanceSession.MORNING : request.originalSession();
        LocalDate targetDate = request.attendanceDate() == null ? originalDate : request.attendanceDate();
        AttendanceSession targetSession = request.session() == null ? originalSession : request.session();

        boolean sameSession = originalDate.equals(targetDate) && originalSession == targetSession;
        if (!sameSession && !attendanceRepository
                .findByChurchIdAndAttendanceDateAndSession(churchId, targetDate, targetSession)
                .isEmpty()) {
            throw new IllegalArgumentException("Există deja o prezență pentru data și programul selectate.");
        }

        if (!sameSession) {
            attendanceRepository.deleteByChurchIdAndAttendanceDateAndSession(churchId, originalDate, originalSession);
        }
        return save(request.toSaveRequest());
    }

    @Transactional
    public void delete(LocalDate date, AttendanceSession session) {
        ensureEnabled();
        attendanceRepository.deleteByChurchIdAndAttendanceDateAndSession(
                activeChurchId(),
                date == null ? LocalDate.now() : date,
                session == null ? AttendanceSession.MORNING : session);
    }

    private AttendancePersonRow row(Person person, AttendanceRecord record) {
        AttendanceStatus status = record == null ? AttendanceStatus.ABSENT : record.getStatus();
        return new AttendancePersonRow(
                person.getId(),
                fullName(person),
                person.getPhone(),
                person.getMemberType() == null ? null : person.getMemberType().name(),
                status,
                status == AttendanceStatus.PRESENT);
    }

    private List<Person> peopleForSheet(Long churchId, ChurchGroup group) {
        if (group != null) {
            return group.getMembers().stream()
                    .sorted(Comparator.comparing(Person::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                            .thenComparing(Person::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                    .toList();
        }
        return personRepository.findAllByChurchId(churchId,
                Sort.by(Sort.Order.asc("lastName"), Sort.Order.asc("firstName")));
    }

    private ChurchGroup loadGroup(Long groupId, Long churchId) {
        return groupRepository.findByIdAndChurchId(groupId, churchId)
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + groupId));
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private void ensureEnabled() {
        if (!churchSettingsService.attendanceEnabled()) {
            throw new IllegalStateException("Funcționalitatea de prezență este dezactivată.");
        }
    }

    private String recordedBy(List<AttendanceRecord> records) {
        return records.stream()
                .map(AttendanceRecord::getRecordedBy)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElseGet(this::currentUsername);
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return authentication.getName();
    }

    private String fullName(Person person) {
        return ((person.getFirstName() == null ? "" : person.getFirstName()) + " "
                + (person.getLastName() == null ? "" : person.getLastName())).trim();
    }
}
