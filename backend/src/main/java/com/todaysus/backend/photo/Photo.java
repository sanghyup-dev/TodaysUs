package com.todaysus.backend.photo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "photos")
@Getter
@Setter
@NoArgsConstructor
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;

    private String filename;

    private String contentType;

    private String originalKey;

    private String thumbnailKey;

    private String name;

    // TODO: 추후 latitude/longitude 필드 추가해서 지도 기능 연동 고려
    private String location;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Instant createdAt = Instant.now();
}

