package com.todaysus.backend.upload;

import com.todaysus.backend.config.S3Properties;
import com.todaysus.backend.photo.Photo;
import com.todaysus.backend.photo.PhotoRepository;
import com.todaysus.backend.upload.UploadController.PresignRequest;
import com.todaysus.backend.upload.UploadController.PresignResponse;
import jakarta.transaction.Transactional;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

@Service
@RequiredArgsConstructor
public class UploadService {

    private final S3Presigner presigner;
    private final S3Properties s3Props;
    private final PhotoRepository photoRepository;

    @Transactional
    public PresignResponse initUpload(PresignRequest req) {
        Photo photo = createPlaceholderPhoto(1L); // TODO: 나중에 auth에서 userId 뽑기
        photo.setFilename(req.filename());
        photo.setContentType(req.contentType());
        String key = buildOriginalKey(photo.getUserId(), photo.getId());
        photo.setOriginalKey(key);
        photoRepository.save(photo);

        PresignedPutObjectRequest presigned = createPresignedPutRequest(key, req.contentType());

        return new PresignResponse(photo.getId(), key, presigned.url().toString());

    }

    private Photo createPlaceholderPhoto(Long userId) {
        Photo p = new Photo();
        p.setUserId(userId);
        return photoRepository.save(p);
    }

    private String buildOriginalKey(Long userId, Long photoId) {
        return "users/%d/photos/%d/original".formatted(userId, photoId);
    }

    private PresignedPutObjectRequest createPresignedPutRequest(String key, String contentType) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(s3Props.getBucket())
                .key(key)
                .contentType(contentType)
                .build();

        return presigner.presignPutObject(builder -> builder
                .signatureDuration(Duration.ofMinutes(10))
                .putObjectRequest(putObjectRequest)
        );
    }


}
