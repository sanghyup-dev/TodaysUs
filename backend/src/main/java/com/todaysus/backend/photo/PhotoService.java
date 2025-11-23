package com.todaysus.backend.photo;

import com.todaysus.backend.config.S3Properties;
import java.time.Duration;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Service
@RequiredArgsConstructor
public class PhotoService {

    private final PhotoRepository photoRepository;
    private final S3Presigner presigner;
    private final S3Properties s3Properties;

    public List<PhotoResponse> listUserPhotos(Long userId) {
        return photoRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(photo -> new PhotoResponse(
                        photo.getId(),
                        photo.getName(),
                        photo.getDescription(),
                        photo.getLocation(),
                        photo.getFilename(),
                        photo.getContentType(),
                        photo.getCreatedAt(),
                        buildImageUrl(photo)
                ))
                .toList();
    }

    private String buildImageUrl(Photo photo) {
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
}
