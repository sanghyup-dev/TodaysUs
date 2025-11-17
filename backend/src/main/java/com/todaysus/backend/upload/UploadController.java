package com.todaysus.backend.upload;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @PostMapping("/init")
    public PresignResponse init(@RequestBody PresignRequest req) {
        return uploadService.initUpload(req);
    }


    // DTO
    public record PresignRequest(
            String filename,
            String contentType
    ) {
    }

    // DTO
    public record PresignResponse(
            Long photoId,
            String key,
            String url
    ) {
    }
}
