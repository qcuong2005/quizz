package com.example.backend.service.geminiService;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.google.gson.Gson;

import com.google.gson.JsonObject;

import java.util.*;

@Service
public class GeminiService {

        // 1. KHAI BÁO MAP CHỨA CÁC CHỦ ĐỀ CON (SUB-TOPICS)
        private static final Map<String, List<String>> SUB_TOPICS = new HashMap<>();

        static {
                // --- SỬ ---
                // --- SỬ ---
                SUB_TOPICS.put("Sử", Arrays.asList(
                                "Lịch sử thế giới – Các thời đại lớn (Tiền sử, Cổ đại, Trung Cổ, Cận đại, Hiện đại)",
                                "Lịch sử Việt Nam (Dựng nước, Phong kiến, Kháng chiến, Cách mạng)",
                                "Nhân vật lịch sử nổi tiếng (Lãnh đạo thế giới, Nhân vật VN)",
                                "Chiến tranh và hòa bình (Thế chiến, CT Việt Nam, Hiệp ước)",
                                "Sự kiện & ngày kỷ niệm lịch sử (Quốc khánh, Cột mốc lớn)"));

                // --- ĐỊA ---
                SUB_TOPICS.put("Địa", Arrays.asList(
                                "Địa lý tự nhiên (Đại dương, núi, sông)",
                                "Chính trị quốc gia (Thủ đô, đất nước)",
                                "Vị trí & bản đồ (Châu lục, múi giờ)",
                                "Dân cư & kinh tế (Dân số, thành phố)",
                                "Địa lý Việt Nam (Vị trí, vùng miền, kinh tế)"));

                // --- TOÁN ---
                SUB_TOPICS.put("Toán", Arrays.asList(
                                "Toán Logic: Suy luận, quy luật dãy số",
                                "Hình học: Tính chất hình học, không gian (tư duy)",
                                "Đại số: Bài toán đố mẹo, tính nhẩm nhanh",
                                "Xác suất thống kê thực tế"));

                // --- VẬT LÝ ---
                SUB_TOPICS.put("Vật Lý", Arrays.asList(
                                "Level 1 – Cơ bản (Đại lượng & đơn vị, Định luật đơn giản)",
                                "Level 2 – Cơ học + Năng lượng (Công năng, Động lực học)",
                                "Level 3 – Điện & Từ (Dòng điện, Từ trường)",
                                "Level 4 – Sóng & Quang học",
                                "Level 5 – Vật lý nguyên tử & hiện đại"));

                // --- VĂN ---
                SUB_TOPICS.put("Văn", Arrays.asList(
                                "Văn học Việt Nam: Truyện Kiều, Thơ Mới, Văn học hiện thực",
                                "Văn học Dân gian: Ca dao, Tục ngữ, Truyền thuyết",
                                "Tác giả - Tác phẩm nổi tiếng thế giới",
                                "Phân tích ý nghĩa câu thơ/đoạn văn"));

                // --- TIẾNG ANH ---
                SUB_TOPICS.put("Tiếng Anh", Arrays.asList(
                                "Ngữ âm",
                                "Ngữ pháp – Từ vựng",
                                "Giao tiếp",
                                "Lỗi sai",
                                "Điền từ",
                                "Đọc hiểu",
                                "Biến đổi / hoàn thành câu"));

                // --- ĐỐ MẸO / DÂN GIAN ---
                SUB_TOPICS.put("Đố mẹo",
                                Arrays.asList("Câu đố mẹo tư duy", "Câu đố logic vui", "Đố dân gian Việt Nam"));
        }

        // 4. DANH SÁCH CÂU HỎI DỰ PHÒNG (FALLBACK) KHI AI BỊ LỖI / QUÁ GIỚI HẠN
        private static final Map<String, List<Map<String, Object>>> FALLBACK_QUESTIONS = new HashMap<>();
        static {
                // Mock data cho Sử
                List<Map<String, Object>> su = new ArrayList<>();
                su.add(Map.of("question", "Ai là người dời đô từ Hoa Lư về Thăng Long?", "options",
                                Arrays.asList("A. Đinh Tiên Hoàng", "B. Lê Đại Hành", "C. Lý Thái Tổ",
                                                "D. Trần Thái Tông"),
                                "correctAnswer", "C. Lý Thái Tổ"));
                su.add(Map.of("question", "Chiến thắng Điện Biên Phủ diễn ra vào năm nào?", "options",
                                Arrays.asList("A. 1945", "B. 1954", "C. 1968", "D. 1975"), "correctAnswer", "B. 1954"));
                FALLBACK_QUESTIONS.put("Sử", su);

                // Mock data cho Toán
                List<Map<String, Object>> toan = new ArrayList<>();
                toan.add(Map.of("question", "Số nguyên tố chẵn duy nhất là số nào?", "options",
                                Arrays.asList("A. 0", "B. 2", "C. 4", "D. Không có"), "correctAnswer", "B. 2"));
                toan.add(Map.of("question", "Kết quả của 2 + 2 x 2 là?", "options",
                                Arrays.asList("A. 6", "B. 8", "C. 4", "D. 10"), "correctAnswer", "A. 6"));
                FALLBACK_QUESTIONS.put("Toán", toan);

                // Mock data cho Văn
                List<Map<String, Object>> van = new ArrayList<>();
                van.add(Map.of("question", "Tác giả của 'Truyện Kiều' là ai?", "options",
                                Arrays.asList("A. Nguyễn Trãi", "B. Nguyễn Du", "C. Hồ Xuân Hương", "D. Nguyễn Khuyến"),
                                "correctAnswer", "B. Nguyễn Du"));
                FALLBACK_QUESTIONS.put("Văn", van);

                // Default
                List<Map<String, Object>> def = new ArrayList<>();
                def.add(Map.of("question", "Một năm có bao nhiêu tháng có 28 ngày?", "options",
                                Arrays.asList("A. 1", "B. 0", "C. 12", "D. 6"), "correctAnswer", "C. 12"));
                FALLBACK_QUESTIONS.put("Default", def);
        }

        @org.springframework.beans.factory.annotation.Value("${groq.api.key}")
        private String apiKey;

        public Map<String, Object> generateQuizQuestion(String mainTopic) {
                String groqUrl = "https://api.groq.com/openai/v1/chat/completions";
                // apiKey is injected

                RestTemplate restTemplate = new RestTemplate();

                // 2. XỬ LÝ CHỌN NGẪU NHIÊN CHỦ ĐỀ CON
                String specificTopic = mainTopic;
                String keyMap = mainTopic.substring(0, 1).toUpperCase() + mainTopic.substring(1).toLowerCase();
                if (mainTopic.equalsIgnoreCase("Tiếng Anh"))
                        keyMap = "Tiếng Anh";

                if (SUB_TOPICS.containsKey(keyMap)) {
                        List<String> subList = SUB_TOPICS.get(keyMap);
                        String randomSub = subList.get(new Random().nextInt(subList.size()));
                        specificTopic = mainTopic + " (Cụ thể về: " + randomSub + ")";
                }

                System.out.println("Đang tạo câu hỏi (Groq AI): " + specificTopic);

                // 3. CHỌN NGẪU NHIÊN MỨC ĐỘ KHÓ
                String[] difficulties = { "DỄ (Easy)", "VỪA (Medium)", "KHÓ (Hard)" };
                String selectedDifficulty = difficulties[new Random().nextInt(difficulties.length)];

                // 4. XÁC ĐỊNH NGÔN NGỮ
                boolean isEnglishTopic = mainTopic.equalsIgnoreCase("Tiếng Anh");
                String languageInstruction = isEnglishTopic
                                ? "- Ngôn ngữ: Toàn bộ câu hỏi, đáp án và giải thích phải bằng TIẾNG ANH (English only).\n"
                                : "- Ngôn ngữ: Toàn bộ câu hỏi, đáp án và giải thích phải bằng TIẾNG VIỆT.\n";

                // 5. PROMPT CẢI TIẾN
                String promptText = "Bạn là chuyên gia giáo dục và khảo thí hàng đầu. Hãy tạo 1 câu hỏi trắc nghiệm THÚ VỊ và HAY về: '"
                                + specificTopic + "'.\n\n" +
                                "📊 MỨC ĐỘ: " + selectedDifficulty + "\n" +
                                "- DỄ: Kiến thức cơ bản, phổ thông, ai cũng có thể biết.\n" +
                                "- VỪA: Cần suy nghĩ một chút, kiến thức nâng cao.\n" +
                                "- KHÓ: Hóc búa, ít người biết, đòi hỏi tư duy sâu.\n\n" +
                                "📝 YÊU CẦU:\n" +
                                languageInstruction +
                                "- Nội dung: Câu hỏi phải thú vị, hấp dẫn, mang tính giáo dục cao.\n" +
                                "- ĐỊNH DẠNG TOÁN HỌC (QUAN TRỌNG): Tất cả các công thức toán học, số mũ, phân số... BẮT BUỘC phải viết dưới dạng LaTeX, được bao quanh bởi dấu $. Ví dụ: $x^2 + 2x + 1 = 0$ hoặc $\\frac{a}{b}$. Không dùng plain text cho công thức.\n"
                                +
                                "- Đáp án nhiễu: 3 đáp án sai phải hợp lý, dễ gây nhầm lẫn nhưng không quá vô lý.\n" +
                                "- Giải thích: Cung cấp giải thích ngắn gọn (2-3 câu) bằng ngôn ngữ tương ứng, giúp người chơi hiểu tại sao đáp án đúng.\n"
                                +
                                "- Tránh câu hỏi quá khô khan hoặc mang tính học thuật nặng nề.\n\n" +
                                "📋 ĐỊNH DẠNG JSON BẮT BUỘC:\n" +
                                "{ \"question\": \"Nội dung câu hỏi?\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], \"correctAnswer\": \"A. ...\", \"explanation\": \"Giải thích ngắn gọn.\", \"difficulty\": \""
                                + selectedDifficulty + "\" }\n\n" +
                                "⚠️ LƯU Ý: correctAnswer phải là chuỗi y hệt một trong các phần tử trong mảng options. Chỉ trả về JSON thuần, không markdown.";

                // Tạo Request Body chuẩn OpenAI/Groq
                Map<String, Object> requestBodyMap = new HashMap<>();
                requestBodyMap.put("model", "openai/gpt-oss-120b");
                requestBodyMap.put("response_format", Map.of("type", "json_object")); // Bắt buộc trả về JSON

                List<Map<String, String>> messages = new ArrayList<>();
                messages.add(Map.of("role", "system", "content", isEnglishTopic
                                ? "You are a helpful assistant that creates engaging English quiz questions. Output JSON only."
                                : "Bạn là trợ lý tạo câu hỏi quiz tiếng Việt thú vị và giáo dục. Chỉ trả về JSON."));
                messages.add(Map.of("role", "user", "content", promptText));
                requestBodyMap.put("messages", messages);

                Gson gson = new Gson();
                String requestBody = gson.toJson(requestBodyMap);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);

                HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

                try {
                        ResponseEntity<String> response = restTemplate.postForEntity(groqUrl, entity, String.class);
                        JsonObject jsonResponse = gson.fromJson(response.getBody(), JsonObject.class);

                        if (jsonResponse.has("choices")) {
                                String text = jsonResponse.getAsJsonArray("choices")
                                                .get(0).getAsJsonObject()
                                                .getAsJsonObject("message")
                                                .get("content").getAsString();

                                // Groq thường trả về markdown json, cần làm sạch
                                String cleanJson = text.replaceAll("```json", "")
                                                .replaceAll("```", "")
                                                .trim();

                                try {
                                        @SuppressWarnings("unchecked")
                                        Map<String, Object> result = gson.fromJson(cleanJson, Map.class);
                                        return result;
                                } catch (Exception e) {
                                        System.err.println("Lỗi Parse Groq JSON: " + e.getMessage());
                                        return getFallbackQuestion(keyMap);
                                }
                        } else {
                                return getFallbackQuestion(keyMap);
                        }
                } catch (Exception e) {
                        e.printStackTrace();
                        System.err.println("Lỗi gọi API Groq: " + e.getMessage());
                        return getFallbackQuestion(keyMap);
                }
        }

        private Map<String, Object> getFallbackQuestion(String topicKey) {
                System.out.println(">>> ĐANG SỬ DỤNG CÂU HỎI DỰ PHÒNG (FALLBACK) CHO: " + topicKey);
                List<Map<String, Object>> list = FALLBACK_QUESTIONS.getOrDefault(topicKey,
                                FALLBACK_QUESTIONS.get("Default"));
                return list.get(new Random().nextInt(list.size()));
        }
}