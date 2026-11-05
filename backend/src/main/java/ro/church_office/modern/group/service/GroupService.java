package ro.church_office.modern.group.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.group.dao.ChurchGroup;
import ro.church_office.modern.group.dao.ChurchGroupRepository;
import ro.church_office.modern.group.dao.GroupType;
import ro.church_office.modern.group.dto.GroupRequest;
import ro.church_office.modern.group.dto.GroupResponse;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class GroupService {
    private final ChurchGroupRepository groupRepository;
    private final PersonRepository personRepository;
    private final ChurchSettingsService churchSettingsService;

    public GroupService(ChurchGroupRepository groupRepository, PersonRepository personRepository,
            ChurchSettingsService churchSettingsService) {
        this.groupRepository = groupRepository;
        this.personRepository = personRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> list(String query) {
        Sort sort = Sort.by(Sort.Order.asc("type"), Sort.Order.asc("name"));
        Long churchId = activeChurchId();
        List<ChurchGroup> groups = query == null || query.isBlank()
                ? groupRepository.findAllByChurchId(churchId, sort)
                : groupRepository.search(churchId, query.trim(), sort);
        return groups.stream().map(GroupResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public GroupResponse get(Long id) {
        return GroupResponse.from(load(id));
    }

    @Transactional
    public GroupResponse create(GroupRequest request) {
        ChurchGroup group = new ChurchGroup();
        group.setChurchId(activeChurchId());
        apply(request, group);
        return GroupResponse.from(groupRepository.save(group));
    }

    @Transactional
    public GroupResponse update(Long id, GroupRequest request) {
        ChurchGroup group = load(id);
        apply(request, group);
        return GroupResponse.from(groupRepository.save(group));
    }

    @Transactional
    public void delete(Long id) {
        groupRepository.delete(load(id));
    }

    private ChurchGroup load(Long id) {
        return groupRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + id));
    }

    private void apply(GroupRequest request, ChurchGroup group) {
        group.setName(request.name().trim());
        group.setType(request.type() == null ? GroupType.SMALL_GROUP : request.type());
        group.setDescription(blankToNull(request.description()));
        group.setWhatsappLink(blankToNull(request.whatsappLink()));
        group.setLeader(request.leaderId() == null ? null : loadPerson(request.leaderId()));
        Set<Person> members = new LinkedHashSet<>();
        if (request.memberIds() != null) {
            request.memberIds().forEach(id -> members.add(loadPerson(id)));
        }
        group.setMembers(members);
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
