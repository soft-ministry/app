package ro.church_office.modern.person.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.person.dao.MemberType;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.person.dao.PersonStatus;
import ro.church_office.modern.person.dto.PersonRequest;
import ro.church_office.modern.person.dto.PersonResponse;
import ro.church_office.modern.settings.service.ChurchSettingsService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PersonService {
    private static final long MAX_STATUS_PHOTO_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_STATUS_PHOTO_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final PersonRepository personRepository;
    private final ChurchSettingsService churchSettingsService;
    private final Path statusPhotoRoot;

    public PersonService(
            PersonRepository personRepository,
            ChurchSettingsService churchSettingsService,
            @Value("${modern.ministry.data-dir}") String dataDir) {
        this.personRepository = personRepository;
        this.churchSettingsService = churchSettingsService;
        this.statusPhotoRoot = Path.of(dataDir).resolve("uploads").resolve("persons").resolve("status-photos")
                .toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> list(String query) {
        Sort sort = Sort.by(Sort.Order.asc("lastName"), Sort.Order.asc("firstName"));
        Long churchId = churchSettingsService.activeChurchId();
        List<Person> people = query == null || query.isBlank()
                ? personRepository.findAllByChurchId(churchId, sort)
                : personRepository.search(churchId, query.trim(), sort);
        String username = currentUsername();
        return people.stream().map(person -> PersonResponse.from(person, username)).toList();
    }

    @Transactional(readOnly = true)
    public PersonResponse get(Long id) {
        return PersonResponse.from(load(id), currentUsername());
    }

    @Transactional
    public PersonResponse create(PersonRequest request) {
        Person person = new Person();
        apply(request, person);
        person.setChurchId(churchSettingsService.activeChurchId());
        return PersonResponse.from(personRepository.save(person), currentUsername());
    }

    @Transactional
    public PersonResponse update(Long id, PersonRequest request) {
        Person person = load(id);
        apply(request, person);
        return PersonResponse.from(personRepository.save(person), currentUsername());
    }

    @Transactional
    public void delete(Long id) {
        Person person = load(id);
        deleteStatusPhotoFile(person);
        personRepository.delete(person);
    }

    @Transactional
    public PersonResponse uploadStatusPhoto(Long id, MultipartFile file) {
        Person person = load(id);
        validateStatusPhoto(file);
        deleteStatusPhotoFile(person);

        String originalName = sanitizeFileName(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + extension(originalName, file.getContentType());
        Path personDir = statusPhotoRoot.resolve(String.valueOf(person.getId())).normalize();
        Path target = personDir.resolve(storedName).normalize();
        if (!target.startsWith(personDir)) {
            throw new IllegalArgumentException("Nume fișier invalid.");
        }

        try {
            Files.createDirectories(personDir);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Nu s-a putut salva poza.", ex);
        }

        person.setStatusPhotoFileName(originalName);
        person.setStatusPhotoContentType(file.getContentType());
        person.setStatusPhotoFileSize(file.getSize());
        person.setStatusPhotoStoragePath(target.toString());
        return PersonResponse.from(personRepository.save(person), currentUsername());
    }

    @Transactional(readOnly = true)
    public PersonStatusPhoto statusPhoto(Long id) {
        Person person = load(id);
        if (person.getStatusPhotoStoragePath() == null || person.getStatusPhotoStoragePath().isBlank()) {
            throw new ResourceNotFoundException("Status photo not found: " + id);
        }
        Path path = Path.of(person.getStatusPhotoStoragePath()).toAbsolutePath().normalize();
        if (!path.startsWith(statusPhotoRoot) || !Files.exists(path)) {
            throw new ResourceNotFoundException("Status photo not found: " + id);
        }
        return new PersonStatusPhoto(
                person.getStatusPhotoFileName(),
                person.getStatusPhotoContentType(),
                person.getStatusPhotoFileSize(),
                path);
    }

    private Person load(Long id) {
        return personRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Person not found: " + id));
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private void apply(PersonRequest request, Person person) {
        String username = currentUsername();
        person.setFirstName(request.firstName().trim());
        person.setLastName(request.lastName().trim());
        person.setEmail(blankToNull(request.email()));
        person.setPhone(blankToNull(request.phone()));
        person.setAddress(blankToNull(request.address()));
        person.setChurchRole(blankToNull(request.churchRole()));
        person.setPosition(blankToNull(request.position()));
        applyDescriptions(request, person, username);
        person.setBirthDate(request.birthDate());
        MemberType memberType = request.memberType() == null ? MemberType.MEMBER : request.memberType();
        person.setMemberType(memberType);
        PersonStatus status = request.status() == null
                ? (request.active() == null || request.active() ? PersonStatus.ACTIVE : PersonStatus.INACTIVE)
                : request.status();
        if (memberType == MemberType.CHILD && status == PersonStatus.INACTIVE) {
            status = PersonStatus.ACTIVE;
        }
        person.setStatus(status);
        person.setActive(status == PersonStatus.ACTIVE);
        person.setStatusChangedDate(hasStatusDetails(status)
                ? request.statusChangedDate()
                : null);
        person.setStatusDetails(hasStatusDetails(status)
                ? blankToNull(request.statusDetails())
                : null);
    }

    private boolean hasStatusDetails(PersonStatus status) {
        return status == PersonStatus.DECEASED
                || status == PersonStatus.TRANSFERRED
                || status == PersonStatus.WITHDRAWN;
    }

    private void applyDescriptions(PersonRequest request, Person person, String username) {
        String publicDescription = request.publicDescription();
        String privateDescription = request.privateDescription();

        if (publicDescription == null && privateDescription == null) {
            if (Boolean.TRUE.equals(request.descriptionPrivate())) {
                privateDescription = request.description();
            } else {
                publicDescription = request.description();
            }
        }

        person.setDescription(blankToNull(publicDescription));
        person.setDescriptionPrivate(false);
        person.setDescriptionOwnerUsername(null);

        if (username == null) {
            return;
        }
        String normalizedPrivateDescription = blankToNull(privateDescription);
        if (normalizedPrivateDescription == null) {
            person.getPrivateDescriptions().remove(username);
        } else {
            person.getPrivateDescriptions().put(username, normalizedPrivateDescription);
        }
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return authentication.getName();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void validateStatusPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Poza este goală.");
        }
        if (file.getSize() > MAX_STATUS_PHOTO_SIZE) {
            throw new IllegalArgumentException("Poza depășește limita de 5 MB.");
        }
        if (!ALLOWED_STATUS_PHOTO_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Sunt acceptate doar imagini JPEG, PNG, WebP sau GIF.");
        }
    }

    private void deleteStatusPhotoFile(Person person) {
        if (person.getStatusPhotoStoragePath() == null || person.getStatusPhotoStoragePath().isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(person.getStatusPhotoStoragePath()));
        } catch (IOException ex) {
            throw new IllegalStateException("Nu s-a putut înlocui poza existentă.", ex);
        }
    }

    private String sanitizeFileName(String originalName) {
        String fallback = "poza-status";
        if (originalName == null || originalName.isBlank()) {
            return fallback;
        }
        String cleaned = Path.of(originalName).getFileName().toString().replaceAll("[\\r\\n]", "").trim();
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String extension(String fileName, String contentType) {
        int index = fileName.lastIndexOf('.');
        if (index >= 0 && index < fileName.length() - 1) {
            return fileName.substring(index).toLowerCase(Locale.ROOT);
        }
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".img";
        };
    }

}
