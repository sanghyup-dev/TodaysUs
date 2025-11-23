package com.todaysus.backend.photo;

import java.time.Instant;

public record PhotoResponse(
        Long id,
        String name,
        String description,
        String location,
        String filename,
        String contentType,
        Instant createdAt,
        String imageUrl
) {
}
