package com.todaysus.backend.photo;

import com.todaysus.backend.config.S3Properties;
import jakarta.transaction.Transactional;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThumbnailService {

    private final PhotoRepository photoRepository;
    private final S3Client s3Client;
    private final S3Properties s3Properties;

    @Async
    @Transactional
    public void generateThumbnailAsync(Long photoId) {
        try {
            Photo photo = photoRepository.findById(photoId)
                    .orElseThrow(() -> new IllegalArgumentException("Photo not found: " + photoId));

            if (photo.getOriginalKey() == null) {
                log.warn("Photo {} has no originalKey, skip thumbnail", photoId);
                return;
            }

            String thumbKey = buildThumbnailKey(photo.getUserId(), photo.getId());

            ResponseBytes<GetObjectResponse> objectBytes =
                    s3Client.getObjectAsBytes(GetObjectRequest.builder()
                            .bucket(s3Properties.getBucket())
                            .key(photo.getOriginalKey())
                            .build());

            byte[] originalBytes = objectBytes.asByteArray();

            ByteArrayOutputStream thumbOut = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(originalBytes))
                    .size(400, 400)
                    .outputFormat("jpg")
                    .toOutputStream(thumbOut);

            byte[] thumbBytes = thumbOut.toByteArray();

            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(s3Properties.getBucket())
                            .key(thumbKey)
                            .contentType("image/jpeg")
                            .build(),
                    RequestBody.fromBytes(thumbBytes)
            );

            photo.setThumbnailKey(thumbKey);
            photoRepository.save(photo);

            log.info("Generated thumbnail for photo {} -> {}", photoId, thumbKey);
        } catch (Exception e) {
            log.error("Failed to generate thumbnail for photo {}", photoId, e);
        }
    }

    private String buildThumbnailKey(Long userId, Long photoId) {
        return "users/%d/photos/%d/thumbnail".formatted(userId, photoId);
    }
}
