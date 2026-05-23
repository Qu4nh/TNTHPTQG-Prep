import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

const getApiKey = () => {
  let key = localStorage.getItem('gemini_api_key');
  if (key) return key;

  key = localStorage.getItem('thpt_gemini_api_key');
  if (key) return key;

  try {
    const settingsStr = localStorage.getItem('thpt_settings') || localStorage.getItem('settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      if (settings?.geminiApiKey) {
        return settings.geminiApiKey;
      }
    }
  } catch (e) {
    console.error('Error parsing settings:', e);
  }
  return null;
};

const blobUrlToBase64 = async (blobUrl) => {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching PDF blob:', error);
    return null;
  }
};

export const generateOverallAnalysis = async (examResult, subjectId, pdfBlobUrl = null) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 0.95,
    }
  });

  const subjectKnowledge = KNOWLEDGE_BASE[subjectId] || {};
  const knowledgeString = JSON.stringify(subjectKnowledge, null, 2);

  // Build per-question detail for wrong/partial answers
  const questionDetails = Object.values(examResult.questionResults || {})
    .filter(q => q.status === 'wrong' || q.status === 'partial' || q.status === 'skipped')
    .map(q => {
      let info = `Câu ${q.questionNumber} (${q.partName}): ${q.status === 'wrong' ? 'SAI' : q.status === 'partial' ? 'ĐÚNG MỘT PHẦN' : 'BỎ TRỐNG'} — ${q.score} điểm`;
      if (q.type === 'true_false' && q.correctCount !== undefined) {
        info += ` (đúng ${q.correctCount}/4 ý)`;
      }
      return info;
    })
    .join('\n');

  const prompt = `
Môn: ${subjectKnowledge.name || 'không xác định'}.
Điểm: ${examResult.totalScore}/10.
Tổng quan từng phần:
${Object.values(examResult.partScores).map(p => {
  let line = `- ${p.name}: Đúng hoàn toàn ${p.correct}/${p.total}, Sai ${p.wrong}`;
  if (p.partial) line += `, Đúng một phần ${p.partial}`;
  line += `, Bỏ ${p.skipped}`;
  return line;
}).join('\n')}

CHI TIẾT CÂU SAI / ĐÚNG MỘT PHẦN / BỎ TRỐNG:
(Hãy tham chiếu nội dung các câu hỏi này trong file đề thi PDF đính kèm để phân tích lý do sai chính xác nhất)
${questionDetails || '(Không có câu sai)'}

Cấu trúc chương trình học chi tiết (Chương > Chủ đề > Dạng bài):
${knowledgeString}

NGUYÊN TẮC TỐI THƯỢNG:
- CẤM chào hỏi, giới thiệu bản thân, viết "Chào em", "Thầy đã nhận", "Đừng lo lắng", hay bất kỳ câu mở đầu xã giao nào.
- CẤM viết câu kết luận kiểu "Cố gắng lên", "Chúc em", "Hy vọng...".
- CẤM bịa đặt hoặc suy diễn dữ liệu không có. CHỈ phân tích dựa trên số liệu thực tế được cung cấp ở trên.
- CẤM giải thích dông dài. Mỗi ý chỉ 1-2 câu ngắn gọn.
- Với câu Đúng/Sai: Phân biệt rõ "Đúng hoàn toàn 4/4 ý" (1 điểm) với "Đúng một phần" (0.25 điểm). KHÔNG được coi đúng 1 phần là đúng.

BỐ CỤC BẮT BUỘC (chỉ 3 phần, không thêm phần nào khác):

### 📊 Phân tích kết quả
[Phân tích ngắn gọn điểm mạnh/yếu dựa trên SỐ LIỆU THỰC TẾ từng phần. Với Đúng/Sai phải nêu rõ bao nhiêu câu đúng hoàn toàn, bao nhiêu câu chỉ đúng một phần. Tối đa 4-5 dòng.]

### 🎯 Chiến lược ôn tập
[Dựa vào danh sách câu sai/đúng một phần ở trên, đối chiếu với cấu trúc chương trình học để chỉ ra TỐI ĐA 3 chương/chủ đề/dạng bài cụ thể cần ưu tiên. Format: "**Tên Chương** > Chủ đề > Dạng bài". Mỗi mục giải thích lý do bằng 1 câu ngắn.]

### ⚡ Thứ tự ưu tiên
[Đánh số 1-3, mỗi mục 1 dòng gồm: tên dạng bài + lý do ưu tiên.]

Định dạng: Markdown + LaTeX ($..$ inline, $$..$$ block) nếu cần. KHÔNG viết thêm bất kỳ phần nào khác ngoài 3 phần trên.
  `;

  const parts = [{ text: prompt }];

  if (pdfBlobUrl) {
    const base64Pdf = await blobUrlToBase64(pdfBlobUrl);
    if (base64Pdf) {
      parts.push({
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf',
        },
      });
    }
  }

  try {
    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

export const generateQuestionExplanation = async (questionObj, subjectId, pdfBlobUrl) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Dùng gemini-2.5-flash: Phiên bản tối tân, thông minh vượt trội, tư duy toán học xuất sắc nhưng vẫn giữ quota Free Tier siêu hào phóng.
  // Nhiệt độ thấp (0.1) giúp AI trả lời chính xác, logic, tránh "ảo giác" trong toán học.
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 0.95,
    }
  });

  const subjectKnowledge = KNOWLEDGE_BASE[subjectId] || {};
  const knowledgeString = JSON.stringify(subjectKnowledge, null, 2);

  // Construct parts array
  const parts = [];

  // Lấy text giải thích
  let promptText = `
Bạn là chuyên gia luyện thi THPT Quốc gia môn ${subjectKnowledge.name || 'này'}.
Giải thích Câu ${questionObj.questionNumber} (${questionObj.type === 'multiple_choice' ? 'Trắc nghiệm' : questionObj.type === 'true_false' ? 'Đúng/Sai' : 'Trả lời ngắn'}).
Đáp án đúng: ${JSON.stringify(questionObj.correctAnswer)}

Dưới đây là cấu trúc chương trình học chi tiết của môn này (gồm Chương > Chủ đề > Dạng bài cụ thể):
${knowledgeString}

NGUYÊN TẮC TỐI THƯỢNG:
- CẤM chào hỏi, giới thiệu, viết lại đề, tóm tắt đề, nhắc lại đáp án học sinh chọn.
- CẤM viết câu mở đầu kiểu "Chào bạn", "Với vai trò", "Tôi xin phép", "Hy vọng phân tích này...".
- CẤM viết câu kết luận kiểu "Hy vọng...", "Chúc bạn...".
- Nếu môn truyền vào lệch với đề, âm thầm giải theo đúng môn thực tế.
- Viết ngắn gọn, cô đọng, đi thẳng vào bản chất câu hỏi, không giải thích dông dài những kiến thức nền tảng hiển nhiên.

BỐ CỤC BẮT BUỘC (trình bày theo đúng thứ tự sau):

### 🎯 Dạng bài
[Đối chiếu với cấu trúc chương trình học ở trên để xác định và viết theo định dạng: "Tên Chương > Tên Chủ đề > Tên Dạng bài cụ thể", tối đa 1 dòng ngắn gọn]

### 📚 Kiến thức & Công thức áp dụng
[Liệt kê định nghĩa, định lý hoặc công thức toán học chính trực tiếp dùng để giải quyết bài này (viết ngắn gọn, trực quan bằng LaTeX)]

### ⚠️ Lỗi thường gặp
[Chỉ ra 1-2 lỗi tư duy phổ biến, bẫy lý thuyết hoặc sai lầm tính toán phổ biến nhất khiến học sinh chọn sai]

### ⚡ Mẹo giải nhanh
[Công thức giải nhanh, mẹo Casio, hoặc phương pháp loại trừ nhanh nhất nếu có (tối đa 2 câu). Nếu không có mẹo đặc biệt thì bỏ qua phần này]

### 📖 Lời giải chi tiết
[Giải chi tiết từng bước biến đổi toán học/logic cốt lõi để đi đến đáp án đúng. Trình bày ngắn gọn, mạch lạc, không viết lan man dông dài]

Định dạng: Markdown + LaTeX ($..$ inline, $$..$$ block). KHÔNG viết thêm bất kỳ phần nào khác ngoài 5 phần trên.
Cuối cùng, BẮT BUỘC có một dòng theo đúng cú pháp sau:
SEARCH_QUERY: [Trích xuất nguyên văn TOÀN BỘ nội dung chữ (text) của câu hỏi này trong đề để làm từ khóa tìm kiếm Google, bỏ qua các công thức phức tạp nếu không gõ được bằng text thường. KHÔNG bọc trong dấu nháy kép]
`;

  parts.push({ text: promptText });

  // Đọc PDF từ blob URL
  if (pdfBlobUrl) {
    const base64Pdf = await blobUrlToBase64(pdfBlobUrl);
    if (base64Pdf) {
      parts.push({
        inlineData: {
          data: base64Pdf,
          mimeType: 'application/pdf',
        },
      });
    } else {
      parts.push({ text: "\nLưu ý: Không thể trích xuất PDF đề thi. Vui lòng giải thích dựa trên dạng câu hỏi và đáp án đúng/sai." });
    }
  } else {
    parts.push({ text: "\nLưu ý: Không có file PDF đề thi được cung cấp. Vui lòng đưa ra lời khuyên chung nhất dựa trên dạng câu hỏi." });
  }

  try {
    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};
