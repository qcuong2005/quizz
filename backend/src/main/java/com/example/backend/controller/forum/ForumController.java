package com.example.backend.controller.forum;

import com.example.backend.entity.forum.ForumCategory;
import com.example.backend.entity.forum.ForumComment;
import com.example.backend.entity.forum.ForumPost;
import com.example.backend.service.forum.ForumService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forum")
@RequiredArgsConstructor
public class ForumController {

    private final ForumService forumService;

    // --- CATEGORIES ---
    @GetMapping("/categories")
    public ResponseEntity<List<ForumCategory>> getCategories() {
        return ResponseEntity.ok(forumService.getAllCategories());
    }

    // Auto-init categories (Helper endpoint, or can be done on startup)
    @PostMapping("/categories/init")
    public ResponseEntity<?> initCategories() {
        forumService.initCategories();
        return ResponseEntity.ok("Categories initialized");
    }

    // --- POSTS ---
    @GetMapping("/posts")
    public ResponseEntity<Page<ForumPost>> getPosts(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, sortBy));

        Page<ForumPost> posts;
        if (search != null && !search.isEmpty()) {
            posts = forumService.searchPosts(search, pageRequest);
        } else if (categoryId != null) {
            posts = forumService.getPostsByCategory(categoryId, pageRequest);
        } else {
            posts = forumService.getAllPosts(pageRequest);
        }

        return ResponseEntity.ok(posts);
    }

    @GetMapping("/posts/{id}")
    public ResponseEntity<ForumPost> getPostById(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.getPostById(id));
    }

    @PostMapping("/posts")
    public ResponseEntity<ForumPost> createPost(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserDetails userDetails) {

        String title = (String) payload.get("title");
        String content = (String) payload.get("content");
        String imageUrl = (String) payload.get("imageUrl");
        Long categoryId = Long.valueOf(payload.get("categoryId").toString());

        return ResponseEntity
                .ok(forumService.createPost(title, content, imageUrl, categoryId, userDetails.getUsername()));
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<?> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        forumService.deletePost(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // --- COMMENTS ---
    @GetMapping("/posts/{id}/comments")
    public ResponseEntity<List<ForumComment>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(forumService.getCommentsForPost(id));
    }

    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<ForumComment> addComment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal UserDetails userDetails) {

        String content = (String) payload.get("content");
        Long parentId = payload.containsKey("parentId") && payload.get("parentId") != null
                ? Long.valueOf(payload.get("parentId").toString())
                : null;

        return ResponseEntity.ok(forumService.addComment(id, content, userDetails.getUsername(), parentId));
    }

    // --- LIKES ---
    @PostMapping("/posts/{id}/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        boolean isLiked = forumService.toggleLike(id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("liked", isLiked));
    }
}
