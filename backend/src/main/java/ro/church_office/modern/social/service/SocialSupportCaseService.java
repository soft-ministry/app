package ro.church_office.modern.social.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;
import ro.church_office.modern.social.dao.SocialNeedType;
import ro.church_office.modern.social.dao.SocialSupportCase;
import ro.church_office.modern.social.dao.SocialSupportCaseRepository;
import ro.church_office.modern.social.dao.SocialSupportPriority;
import ro.church_office.modern.social.dao.SocialSupportStatus;
import ro.church_office.modern.social.dto.SocialSupportCaseRequest;
import ro.church_office.modern.social.dto.SocialSupportCaseResponse;

@Service
public class SocialSupportCaseService {
    private final SocialSupportCaseRepository caseRepository;
    private final PersonRepository personRepository;
    private final ChurchSettingsService churchSettingsService;

    public SocialSupportCaseService(SocialSupportCaseRepository caseRepository,
            PersonRepository personRepository,
            ChurchSettingsService churchSettingsService) {
        this.caseRepository = caseRepository;
        this.personRepository = personRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public List<SocialSupportCaseResponse> list(String query) {
        Sort sort = Sort.by(
                Sort.Order.asc("status"),
                Sort.Order.asc("nextReviewDate"),
                Sort.Order.desc("updatedAt"));
        Long churchId = activeChurchId();
        List<SocialSupportCase> cases = query == null || query.isBlank()
                ? caseRepository.findAllByChurchId(churchId, sort)
                : caseRepository.search(churchId, query.trim(), sort);
        return cases.stream().map(SocialSupportCaseResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public SocialSupportCaseResponse get(Long id) {
        return SocialSupportCaseResponse.from(load(id));
    }

    @Transactional
    public SocialSupportCaseResponse create(SocialSupportCaseRequest request) {
        SocialSupportCase item = new SocialSupportCase();
        item.setChurchId(activeChurchId());
        apply(request, item);
        return SocialSupportCaseResponse.from(caseRepository.save(item));
    }

    @Transactional
    public SocialSupportCaseResponse update(Long id, SocialSupportCaseRequest request) {
        SocialSupportCase item = load(id);
        apply(request, item);
        return SocialSupportCaseResponse.from(caseRepository.save(item));
    }

    @Transactional
    public void delete(Long id) {
        caseRepository.delete(load(id));
    }

    private SocialSupportCase load(Long id) {
        return caseRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Social support case not found: " + id));
    }

    private void apply(SocialSupportCaseRequest request, SocialSupportCase item) {
        item.setPerson(loadPerson(request.personId()));
        item.setAssignedTo(request.assignedToId() == null ? null : loadPerson(request.assignedToId()));
        item.setNeedType(request.needType() == null ? SocialNeedType.SOCIAL : request.needType());
        item.setStatus(request.status() == null ? SocialSupportStatus.UNDER_OBSERVATION : request.status());
        item.setPriority(request.priority() == null ? SocialSupportPriority.MEDIUM : request.priority());
        item.setSummary(request.summary().trim());
        item.setPrivateNotes(blankToNull(request.privateNotes()));
        item.setEstimatedAmount(request.estimatedAmount());
        item.setApprovedAmount(request.approvedAmount());
        item.setNextReviewDate(request.nextReviewDate());
        item.setClosedAt(request.closedAt());
    }

    private Person loadPerson(Long id) {
        return personRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Person not found: " + id));
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
