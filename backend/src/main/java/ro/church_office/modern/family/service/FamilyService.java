package ro.church_office.modern.family.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.family.dao.Family;
import ro.church_office.modern.family.dao.FamilyMember;
import ro.church_office.modern.family.dao.FamilyMemberRepository;
import ro.church_office.modern.family.dao.FamilyRelationship;
import ro.church_office.modern.family.dao.FamilyRelationshipRepository;
import ro.church_office.modern.family.dao.FamilyRelationshipType;
import ro.church_office.modern.family.dao.FamilyRepository;
import ro.church_office.modern.family.dao.FamilyRole;
import ro.church_office.modern.family.dto.FamilyMemberRequest;
import ro.church_office.modern.family.dto.FamilyMemberResponse;
import ro.church_office.modern.family.dto.FamilyRelationshipRequest;
import ro.church_office.modern.family.dto.FamilyRelationshipResponse;
import ro.church_office.modern.family.dto.FamilyRequest;
import ro.church_office.modern.family.dto.FamilyResponse;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class FamilyService {
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository memberRepository;
    private final FamilyRelationshipRepository relationshipRepository;
    private final PersonRepository personRepository;
    private final ChurchSettingsService churchSettingsService;

    public FamilyService(FamilyRepository familyRepository,
            FamilyMemberRepository memberRepository,
            FamilyRelationshipRepository relationshipRepository,
            PersonRepository personRepository,
            ChurchSettingsService churchSettingsService) {
        this.familyRepository = familyRepository;
        this.memberRepository = memberRepository;
        this.relationshipRepository = relationshipRepository;
        this.personRepository = personRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public List<FamilyResponse> list() {
        return familyRepository.findAllByChurchId(activeChurchId(), Sort.by("name")).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FamilyResponse get(Long id) {
        return toResponse(loadFamily(id));
    }

    @Transactional
    public FamilyResponse create(FamilyRequest request) {
        Family family = new Family();
        family.setChurchId(activeChurchId());
        apply(request, family);
        return toResponse(familyRepository.save(family));
    }

    @Transactional
    public FamilyResponse update(Long id, FamilyRequest request) {
        Family family = loadFamily(id);
        apply(request, family);
        return toResponse(familyRepository.save(family));
    }

    @Transactional
    public void delete(Long id) {
        Family family = loadFamily(id);
        relationshipRepository.deleteAllByFamilyId(family.getId());
        memberRepository.deleteAllByFamilyId(family.getId());
        familyRepository.delete(family);
    }

    @Transactional
    public FamilyResponse addMember(Long familyId, FamilyMemberRequest request) {
        Family family = loadFamily(familyId);
        loadPerson(request.personId());
        if (memberRepository.existsByFamilyIdAndPersonId(familyId, request.personId())) {
            throw new IllegalArgumentException("Persoana este deja în familie.");
        }
        FamilyMember member = new FamilyMember();
        member.setFamilyId(family.getId());
        member.setPersonId(request.personId());
        member.setRole(request.role() == null ? FamilyRole.OTHER : request.role());
        member.setPrimaryMember(request.primaryMember());
        memberRepository.save(member);
        return toResponse(family);
    }

    @Transactional
    public FamilyResponse updateMember(Long familyId, Long memberId, FamilyMemberRequest request) {
        Family family = loadFamily(familyId);
        FamilyMember member = memberRepository.findByIdAndFamilyId(memberId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family member not found: " + memberId));
        member.setRole(request.role() == null ? FamilyRole.OTHER : request.role());
        member.setPrimaryMember(request.primaryMember());
        memberRepository.save(member);
        return toResponse(family);
    }

    @Transactional
    public FamilyResponse removeMember(Long familyId, Long memberId) {
        Family family = loadFamily(familyId);
        FamilyMember member = memberRepository.findByIdAndFamilyId(memberId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family member not found: " + memberId));
        List<FamilyRelationship> relationships = relationshipRepository.findAllByFamilyId(familyId).stream()
                .filter(relationship -> relationship.getPersonAId().equals(member.getPersonId())
                        || relationship.getPersonBId().equals(member.getPersonId()))
                .toList();
        relationshipRepository.deleteAll(relationships);
        memberRepository.delete(member);
        return toResponse(family);
    }

    @Transactional
    public FamilyResponse addRelationship(Long familyId, FamilyRelationshipRequest request) {
        Family family = loadFamily(familyId);
        if (request.personAId().equals(request.personBId())) {
            throw new IllegalArgumentException("Alege două persoane diferite.");
        }
        requireMember(familyId, request.personAId());
        requireMember(familyId, request.personBId());
        FamilyRelationship relationship = new FamilyRelationship();
        relationship.setFamilyId(familyId);
        relationship.setType(request.type());
        if (request.type() == FamilyRelationshipType.SPOUSE) {
            long left = Math.min(request.personAId(), request.personBId());
            long right = Math.max(request.personAId(), request.personBId());
            relationship.setPersonAId(left);
            relationship.setPersonBId(right);
        } else {
            relationship.setPersonAId(request.personAId());
            relationship.setPersonBId(request.personBId());
            if (createsParentCycle(familyId, request.personAId(), request.personBId())) {
                throw new IllegalArgumentException("Relația părinte-copil ar crea un ciclu.");
            }
        }
        ensureRelationshipIsNew(relationship);
        relationshipRepository.save(relationship);
        return toResponse(family);
    }

    @Transactional
    public FamilyResponse deleteRelationship(Long familyId, Long relationshipId) {
        Family family = loadFamily(familyId);
        FamilyRelationship relationship = relationshipRepository.findByIdAndFamilyId(relationshipId, familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family relationship not found: " + relationshipId));
        relationshipRepository.delete(relationship);
        return toResponse(family);
    }

    private void apply(FamilyRequest request, Family family) {
        family.setName(request.name().trim());
        family.setNotes(blankToNull(request.notes()));
    }

    private FamilyResponse toResponse(Family family) {
        List<FamilyMember> members = memberRepository.findAllByFamilyId(family.getId());
        List<FamilyRelationship> relationships = relationshipRepository.findAllByFamilyId(family.getId());
        Set<Long> personIds = new HashSet<>();
        members.forEach(member -> personIds.add(member.getPersonId()));
        relationships.forEach(relationship -> {
            personIds.add(relationship.getPersonAId());
            personIds.add(relationship.getPersonBId());
        });
        Map<Long, Person> persons = personRepository.findAllById(personIds).stream()
                .filter(person -> person.getChurchId().equals(activeChurchId()))
                .collect(Collectors.toMap(Person::getId, Function.identity()));
        List<FamilyMemberResponse> memberResponses = members.stream()
                .filter(member -> persons.containsKey(member.getPersonId()))
                .map(member -> FamilyMemberResponse.from(member, persons.get(member.getPersonId())))
                .sorted((left, right) -> left.fullName().compareToIgnoreCase(right.fullName()))
                .toList();
        List<FamilyRelationshipResponse> relationshipResponses = relationships.stream()
                .filter(relationship -> persons.containsKey(relationship.getPersonAId()) && persons.containsKey(relationship.getPersonBId()))
                .map(relationship -> FamilyRelationshipResponse.from(
                        relationship,
                        fullName(persons.get(relationship.getPersonAId())),
                        fullName(persons.get(relationship.getPersonBId()))))
                .toList();
        return FamilyResponse.from(family, memberResponses, relationshipResponses);
    }

    private Family loadFamily(Long id) {
        return familyRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Family not found: " + id));
    }

    private Person loadPerson(Long id) {
        return personRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Person not found: " + id));
    }

    private void requireMember(Long familyId, Long personId) {
        if (!memberRepository.existsByFamilyIdAndPersonId(familyId, personId)) {
            throw new IllegalArgumentException("Persoana trebuie adăugată întâi în familie.");
        }
    }

    private void ensureRelationshipIsNew(FamilyRelationship candidate) {
        boolean duplicate = relationshipRepository.findAllByFamilyId(candidate.getFamilyId()).stream()
                .anyMatch(existing -> existing.getType() == candidate.getType()
                        && existing.getPersonAId().equals(candidate.getPersonAId())
                        && existing.getPersonBId().equals(candidate.getPersonBId()));
        if (duplicate) {
            throw new IllegalArgumentException("Relația există deja.");
        }
    }

    private boolean createsParentCycle(Long familyId, Long parentId, Long childId) {
        Map<Long, List<Long>> childrenByParent = relationshipRepository.findAllByFamilyId(familyId).stream()
                .filter(relationship -> relationship.getType() == FamilyRelationshipType.PARENT_CHILD)
                .collect(Collectors.groupingBy(
                        FamilyRelationship::getPersonAId,
                        Collectors.mapping(FamilyRelationship::getPersonBId, Collectors.toList())));
        return reaches(childId, parentId, childrenByParent, new HashSet<>());
    }

    private boolean reaches(Long current, Long target, Map<Long, List<Long>> childrenByParent, Set<Long> seen) {
        if (current.equals(target)) {
            return true;
        }
        if (!seen.add(current)) {
            return false;
        }
        return childrenByParent.getOrDefault(current, List.of()).stream()
                .anyMatch(child -> reaches(child, target, childrenByParent, seen));
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private String fullName(Person person) {
        return (safe(person.getFirstName()) + " " + safe(person.getLastName())).trim();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
