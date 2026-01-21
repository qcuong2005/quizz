package com.example.backend.service.forum;

import com.example.backend.entity.forum.ForumCategory;
import com.example.backend.entity.forum.ForumComment;
import com.example.backend.entity.forum.ForumPost;
import com.example.backend.entity.forum.ForumPostLike;
import com.example.backend.entity.user.User;
import com.example.backend.repository.forum.ForumCategoryRepository;
import com.example.backend.repository.forum.ForumCommentRepository;
import com.example.backend.repository.forum.ForumPostLikeRepository;
import com.example.backend.repository.forum.ForumPostRepository;
import com.example.backend.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ForumService {

    private final ForumCategoryRepository categoryRepository;
    private final ForumPostRepository postRepository;
    private final ForumCommentRepository commentRepository;
    private final ForumPostLikeRepository likeRepository;
    private final UserRepository userRepository;

    // --- CATEGORIES ---
    public List<ForumCategory> getAllCategories() {
        return categoryRepository.findAll();
    }

    // Init default categories if needed (can be called on startup)
    @jakarta.annotation.PostConstruct
    public void initCategories() {
        if (categoryRepository.count() == 0) {
            categoryRepository.save(new ForumCategory(null, "Chung", "Thảo luận chung", "💬"));
            categoryRepository.save(new ForumCategory(null, "Hỏi đáp", "Hỏi và trả lời về Quiz", "❓"));
            categoryRepository.save(new ForumCategory(null, "Góp ý", "Góp ý cải thiện ứng dụng", "💡"));
        }
    }

    // --- POSTS ---
    public Page<ForumPost> getAllPosts(Pageable pageable) {
        return postRepository.findAll(pageable);
    }

    public Page<ForumPost> getPostsByCategory(Long categoryId, Pageable pageable) {
        return postRepository.findByCategoryId(categoryId, pageable);
    }

    public Page<ForumPost> searchPosts(String query, Pageable pageable) {
        return postRepository.findByTitleContainingIgnoreCase(query, pageable);
    }

    public ForumPost getPostById(Long id) {
        ForumPost post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        // Increment view count
        post.setViewCount(post.getViewCount() + 1);
        return postRepository.save(post);
    }

    @Transactional
    public ForumPost createPost(String title, String content, String imageUrl, Long categoryId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ForumCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Category not found"));

        ForumPost post = ForumPost.builder()
                .title(title)
                .content(content)
                .imageUrl(imageUrl)
                .author(user)
                .category(category)
                .viewCount(0)
                .likeCount(0)
                .commentCount(0)
                .build();

        return postRepository.save(post);
    }

    @Transactional
    public void deletePost(Long postId, String username) {
        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        if (!post.getAuthor().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized: You are not the author");
        }

        postRepository.delete(post);
    }

    // --- COMMENTS ---
    public List<ForumComment> getCommentsForPost(Long postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    @Transactional
    public ForumComment addComment(Long postId, String content, String username, Long parentId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        ForumComment.ForumCommentBuilder commentBuilder = ForumComment.builder()
                .content(content)
                .post(post)
                .author(user);

        if (parentId != null) {
            ForumComment parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            commentBuilder.parent(parent);
        }

        ForumComment comment = commentBuilder.build();

        // Update comment count on post
        post.setCommentCount(post.getCommentCount() + 1);
        postRepository.save(post);

        return commentRepository.save(comment);
    }

    // --- LIKES ---
    @Transactional
    public boolean toggleLike(Long postId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ForumPost post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found"));

        Optional<ForumPostLike> existingLike = likeRepository.findByPostIdAndUserId(postId, user.getId());

        if (existingLike.isPresent()) {
            // Unlike
            likeRepository.delete(existingLike.get());
            post.setLikeCount(Math.max(0, post.getLikeCount() - 1));
            postRepository.save(post);
            return false; // Liked = false
        } else {
            // Like
            ForumPostLike like = ForumPostLike.builder()
                    .post(post)
                    .user(user)
                    .build();
            likeRepository.save(like);
            post.setLikeCount(post.getLikeCount() + 1);
            postRepository.save(post);
            return true; // Liked = true
        }
    }
}
