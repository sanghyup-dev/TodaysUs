package com.todaysus.backend.photo;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/debug/photos")
@RequiredArgsConstructor
public class DebugPhotoController {
    private final PhotoRepository photoRepository;

    @PostMapping
    public Photo createDummy() {
        Photo photo = new Photo();
        photo.setUserId(1L);
        photo.setOriginalKey("Dummy_Key");
        return photoRepository.save(photo);
    }

    @GetMapping
    public List<Photo> list() {
        return photoRepository.findAll();
    }
}
