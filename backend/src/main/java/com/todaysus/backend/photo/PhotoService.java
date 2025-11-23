package com.todaysus.backend.photo;

import com.todaysus.backend.config.S3Properties;
import jakarta.transaction.Transactional;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final S3Presigner presigner;
    private final S3Properties s3Properties;
    private final S3Client s3Client;

    public Page<PhotoResponse> listUserPhotos(Long userId, Pageable pageable) {
        return photoRepository.findByUserId(userId, pageable)
                .map(photo -> new PhotoResponse(
                        photo.getId(),
                        photo.getName(),
                        photo.getDescription(),
                        photo.getLocation(),
                        photo.getFilename(),
                        photo.getContentType(),
                        photo.getCreatedAt(),
                        buildThumbnailUrl(photo),
                        buildOriginalUrl(photo)
                ));
    }

    private String buildThumbnailUrl(Photo photo) {
        String key = photo.getThumbnailKey() != null
                ? photo.getThumbnailKey()
                : photo.getOriginalKey();

        if (key == null) {
            return null;
        }
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(s3Properties.getBucket())
                .key(key)
                .build();

        return presigner.presignGetObject(builder -> builder
                        .signatureDuration(Duration.ofMinutes(5))
                        .getObjectRequest(getObjectRequest))
                .url()
                .toString();
    }

    private String buildOriginalUrl(Photo photo) {
        if (photo.getOriginalKey() == null) {
            return null;
        }

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(s3Properties.getBucket())
                .key(photo.getOriginalKey())
                .build();

        return presigner.presignGetObject(builder -> builder
                        .signatureDuration(Duration.ofMinutes(5))
                        .getObjectRequest(getObjectRequest))
                .url()
                .toString();
    }

    @Transactional
    public void deletePhoto(Long userId, Long photoId) {
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

        if (!photo.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Photo %d does not belong to user %d".formatted(photoId, userId));
        }

        deleteObject(photo.getOriginalKey());
        deleteObject(photo.getThumbnailKey());
        photoRepository.delete(photo);
        log.info("Deleted photo {} for user {}", photoId, userId);
    }

    private void deleteObject(String key) {
        if (key == null) {
            return;
        }
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(s3Properties.getBucket())
                .key(key)
                .build());
    }
}
