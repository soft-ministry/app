package ro.church_office.modern.event.attachment.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventAttachmentRepository extends JpaRepository<EventAttachment, Long> {
    List<EventAttachment> findAllByEventIdAndChurchIdOrderByCreatedAtDesc(Long eventId, Long churchId);

    Optional<EventAttachment> findByIdAndEventIdAndChurchId(Long id, Long eventId, Long churchId);
}
