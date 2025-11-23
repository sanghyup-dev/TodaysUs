package com.todaysus.backend.photo;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/{userId}/photos")
@RequiredArgsConstructor
public class PhotoController {

    private final PhotoService photoService;

    @GetMapping
    public List<PhotoResponse> list(@PathVariable Long userId) {
        return photoService.listUserPhotos(userId);
    }
}
