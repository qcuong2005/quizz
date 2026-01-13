package com.example.backend.service.geminiService;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.util.*;

@Service
public class GeminiService {

    // URL Model (Giữ nguyên cái bạn đang chạy ổn)
    private final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent?key=AIzaSyCZidm9urJa0Zp4xwJvqi7EwcbLo3UQnZk";

    // 1. KHAI BÁO MAP CHỨA CÁC CHỦ ĐỀ CON (SUB-TOPICS)
    private static final Map<String, List<String>> SUB_TOPICS = new HashMap<>();

    static {
        // --- SỬ ---
        SUB_TOPICS.put("Sử", Arrays.asList(
                "Lịch sử Việt Nam: Các triều đại phong kiến (Đinh, Lý, Trần, Lê...)",
                "Lịch sử Việt Nam: Thời kỳ kháng chiến chống Pháp/Mỹ",
                "Lịch sử Thế giới: Cổ đại (Hy Lạp, La Mã, Ai Cập)",
                "Lịch sử Thế giới: Chiến tranh thế giới thứ 1 và 2",
                "Danh nhân lịch sử nổi tiếng thế giới"));

        // --- ĐỊA ---
        SUB_TOPICS.put("Địa", Arrays.asList(
                "Địa lý Việt Nam: Các vùng kinh tế, đặc sản, khí hậu",
                "Địa lý Thế giới: Thủ đô các nước, Quốc kỳ",
                "Địa lý tự nhiên: Núi, Sông, Biển, Đại dương lớn nhất thế giới",
                "Văn hóa và Du lịch các nước"));

        // --- TOÁN ---
        SUB_TOPICS.put("Toán", Arrays.asList(
                "Toán Logic: Suy luận, quy luật dãy số",
                "Hình học: Tính chất hình học, không gian (tư duy)",
                "Đại số: Bài toán đố mẹo, tính nhẩm nhanh",
                "Xác suất thống kê thực tế"));

        // --- VĂN ---
        SUB_TOPICS.put("Văn", Arrays.asList(
                "Văn học Việt Nam: Truyện Kiều, Thơ Mới, Văn học hiện thực",
                "Văn học Dân gian: Ca dao, Tục ngữ, Truyền thuyết",
                "Tác giả - Tác phẩm nổi tiếng thế giới",
                "Phân tích ý nghĩa câu thơ/đoạn văn"));

        // --- TIẾNG ANH ---
        SUB_TOPICS.put("Tiếng Anh", Arrays.asList(
                "Grammar (Ngữ pháp): Tenses, Passive Voice, Conditional...",
                "Vocabulary (Từ vựng): Chủ đề Business, Travel, Education (C1/C2)",
                "Idioms & Phrasal Verbs (Thành ngữ khó)",
                "Tìm lỗi sai trong câu"));

        // --- ĐỐ VUI / MẸO ---
        SUB_TOPICS.put("Đố vui", Arrays.asList("Đố mẹo hại não", "Đố chữ (Chơi chữ)", "Đố tư duy Lateral Thinking"));
        SUB_TOPICS.put("Đố mẹo", Arrays.asList("Đố mẹo hài hước", "Đố tình huống thám tử"));
    }

    public String generateQuizQuestion(String mainTopic) {
        RestTemplate restTemplate = new RestTemplate();
        String url = API_URL;

        // 2. XỬ LÝ CHỌN NGẪU NHIÊN CHỦ ĐỀ CON
        String specificTopic = mainTopic; // Mặc định là chủ đề chính

        // Chuẩn hóa key (Viết hoa chữ cái đầu để khớp với Map)
        String keyMap = mainTopic.substring(0, 1).toUpperCase() + mainTopic.substring(1).toLowerCase();
        // Xử lý riêng Tiếng Anh vì có dấu cách
        if (mainTopic.equalsIgnoreCase("Tiếng Anh"))
            keyMap = "Tiếng Anh";

        if (SUB_TOPICS.containsKey(keyMap)) {
            List<String> subList = SUB_TOPICS.get(keyMap);
            // Random 1 cái trong list
            String randomSub = subList.get(new Random().nextInt(subList.size()));
            specificTopic = mainTopic + " (Cụ thể về: " + randomSub + ")";
        }

        System.out.println("Đang tạo câu hỏi: " + specificTopic);

        // 3. PROMPT ĐÃ NÂNG CẤP (Kết hợp độ khó + Chủ đề con)
        String promptText = "Bạn là chuyên gia khảo thí khắc nghiệt. Hãy tạo 1 câu hỏi trắc nghiệm mức độ KHÓ (Advanced) về: '"
                + specificTopic + "'.\n" +
                "Yêu cầu:\n" +
                "- Nội dung: Phải hóc búa, ít người biết, đòi hỏi tư duy sâu.\n" +
                "- Đáp án nhiễu: Phải cực kỳ hợp lý để bẫy người chơi.\n" +
                "- Định dạng JSON bắt buộc: { \"question\": \"Nội dung?\", \"options\": [\"A. ...\", \"B. ...\", \"C. ...\", \"D. ...\"], \"correctAnswer\": \"A\" }.\n"
                +
                "- Chỉ trả về JSON thuần, không Markdown.";

        // Tạo Request Body
        JsonObject part = new JsonObject();
        part.addProperty("text", promptText);

        JsonArray parts = new JsonArray();
        parts.add(part);

        JsonObject content = new JsonObject();
        content.add("parts", parts);

        JsonArray contents = new JsonArray();
        contents.add(content);

        JsonObject requestBodyJson = new JsonObject();
        requestBodyJson.add("contents", contents);

        String requestBody = requestBodyJson.toString();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            Gson gson = new Gson();
            JsonObject jsonResponse = gson.fromJson(response.getBody(), JsonObject.class);

            if (jsonResponse.has("candidates")) {
                String text = jsonResponse.getAsJsonArray("candidates")
                        .get(0).getAsJsonObject()
                        .getAsJsonObject("content")
                        .getAsJsonArray("parts")
                        .get(0).getAsJsonObject()
                        .get("text").getAsString();

                return text.replace("```json", "").replace("```", "").trim();
            } else {
                return "{\"error\": \"Lỗi format từ Google\"}";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "{\"error\": \"Lỗi API: " + e.getMessage() + "\"}";
        }
    }
}