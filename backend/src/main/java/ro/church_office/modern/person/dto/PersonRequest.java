package ro.church_office.modern.person.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import ro.church_office.modern.person.dao.MemberType;
import ro.church_office.modern.person.dao.PersonStatus;

public record PersonRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Email String email,
        String phone,
        String address,
        String churchRole,
        String position,
        String description,
        Boolean descriptionPrivate,
        String publicDescription,
        String privateDescription,
        LocalDate birthDate,
        MemberType memberType,
        Boolean active,
        PersonStatus status,
        LocalDate statusChangedDate,
        String statusDetails
) {
}
