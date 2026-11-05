package ro.church_office.modern.person.controller;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import jakarta.validation.Valid;

import ro.church_office.modern.person.dto.PersonRequest;
import ro.church_office.modern.person.dto.PersonResponse;
import ro.church_office.modern.person.service.PersonService;
import ro.church_office.modern.person.service.PersonStatusPhoto;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/persons")
public class PersonController {
    private final PersonService personService;

    public PersonController(PersonService personService) {
        this.personService = personService;
    }

    @GetMapping
    public List<PersonResponse> list(@RequestParam(value = "q", required = false) String query) {
        return personService.list(query);
    }

    @GetMapping("/{id}")
    public PersonResponse get(@PathVariable Long id) {
        return personService.get(id);
    }

    @PostMapping
    public ResponseEntity<PersonResponse> create(@Valid @RequestBody PersonRequest request) {
        PersonResponse response = personService.create(request);
        return ResponseEntity.created(URI.create("/api/persons/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    public PersonResponse update(@PathVariable Long id, @Valid @RequestBody PersonRequest request) {
        return personService.update(id, request);
    }

    @PostMapping(path = "/{id}/status-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PersonResponse uploadStatusPhoto(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return personService.uploadStatusPhoto(id, file);
    }

    @GetMapping("/{id}/status-photo")
    public ResponseEntity<FileSystemResource> statusPhoto(@PathVariable Long id) {
        PersonStatusPhoto photo = personService.statusPhoto(id);
        String encodedName = URLEncoder.encode(photo.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(encodedName, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(new FileSystemResource(photo.path()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        personService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
