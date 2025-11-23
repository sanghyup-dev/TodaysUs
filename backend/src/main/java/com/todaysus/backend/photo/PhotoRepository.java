package com.todaysus.backend.photo;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PhotoRepository extends JpaRepository<Photo, Long> {
    List<Photo> findByUserIdOrderByCreatedAtDesc(Long userId);
}
