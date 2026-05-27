import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';
import { SUBJECTS } from '../data/examConfig';

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

/**
 * Extract JSON array from AI text response.
 * Supports both raw JSON and JSON inside markdown code blocks.
 */
const extractJsonFromText = (text) => {
  // Try to find JSON array in markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) { /* fall through */ }
  }

  // Try to find raw JSON array in the text
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) { /* fall through */ }
  }

  // Last resort: try parsing the whole text
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to extract JSON from AI response:', text.substring(0, 200));
    return null;
  }
};

/**
 * AI-powered answer key generation with enhanced accuracy.
 *
 * Strategy:
 * - MC (Multiple Choice): 1 API call for all questions (simple, high accuracy).
 * - TF (True/False): 2 API calls × 2 questions each (focused analysis per statement).
 * - SA (Short Answer): 3 API calls × 2 questions each (deep step-by-step solving).
 *
 * TF and SA use Chain-of-Thought (no forced JSON output) for better reasoning,
 * with specialized prompts for spatial geometry and probability.
 */
export const generateAnswerKey = async (subjectId, pdfBlobUrl, onProgress = () => {}) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');
  if (!pdfBlobUrl) throw new Error('PDF_MISSING');

  const genAI = new GoogleGenerativeAI(apiKey);

  // Model for MC: forced JSON output (simple questions, high accuracy)
  const modelJson = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0,
      topK: 1,
      topP: 0.95,
      responseMimeType: 'application/json',
    }
  });

  // Model for TF/SA: free-form text output (Chain-of-Thought enabled)
  const modelThinking = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
      temperature: 0,
      topK: 1,
      topP: 0.95,
    }
  });

  const subject = SUBJECTS[subjectId];
  if (!subject) throw new Error('SUBJECT_NOT_FOUND');

  const base64Pdf = await blobUrlToBase64(pdfBlobUrl);
  if (!base64Pdf) throw new Error('PDF_CONVERT_FAILED');

  const pdfPart = {
    inlineData: { data: base64Pdf, mimeType: 'application/pdf' },
  };

  const allAnswers = {};
  let completedQuestions = 0;

  // Build task list: split TF and SA into smaller batches
  const tasks = [];
  let questionStart = 1;

  for (const part of subject.parts) {
    const batchSize = part.type === 'multiple_choice' ? part.count : 2;
    let offset = 0;

    while (offset < part.count) {
      const count = Math.min(batchSize, part.count - offset);
      tasks.push({
        part,
        qStart: questionStart + offset,
        qEnd: questionStart + offset + count - 1,
      });
      offset += count;
    }

    questionStart += part.count;
  }

  // Execute each task sequentially
  for (const task of tasks) {
    const { part, qStart, qEnd } = task;
    onProgress(completedQuestions, subject.totalQuestions, part.name, { ...allAnswers });

    let prompt = '';
    let useJsonModel = false;

    if (part.type === 'multiple_choice') {
      useJsonModel = true;
      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name}. Hãy giải CHÍNH XÁC TUYỆT ĐỐI tất cả các câu hỏi Trắc nghiệm (Câu ${qStart} đến Câu ${qEnd}) trong file PDF đề thi đính kèm.

CHỈ DẪN ĐỘ CHÍNH XÁC:
- Đọc kỹ từng câu hỏi và tất cả các phương án A, B, C, D.
- Giải bài toán/phân tích logic ĐẦY ĐỦ trước khi chọn đáp án.
- Tự kiểm chứng lại đáp án bằng cách thay ngược vào bài để xác nhận.
- Nếu không chắc chắn, hãy dùng phương pháp loại trừ.

Trả về JSON array, mỗi phần tử có format:
{ "q": <số thứ tự câu hỏi>, "answer": "<A hoặc B hoặc C hoặc D>" }

Ví dụ: [{"q": 1, "answer": "A"}, {"q": 2, "answer": "C"}]
CHỈ trả về JSON array, KHÔNG viết gì khác.`;

    } else if (part.type === 'true_false') {
      let tfHints = '';
      if (subject.id === 'math') {
        tfHints = '- Với bài HÌNH HỌC KHÔNG GIAN: Đặt hệ tọa độ Oxyz, tính toán bằng vector và tích vô hướng/tích có hướng. KHÔNG suy luận bằng trực giác hình học.';
      } else if (subject.id === 'physics') {
        tfHints = '- Cẩn thận với các định lý, công thức vật lý và đơn vị đo lường. Chú ý các điều kiện lý tưởng (bỏ qua ma sát, điện trở dây nối, v.v.).';
      }

      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name} với độ chính xác tuyệt đối.

NHIỆM VỤ: Giải các câu Đúng/Sai từ Câu ${qStart} đến Câu ${qEnd} trong file PDF đề thi đính kèm. Mỗi câu có 4 mệnh đề (a, b, c, d).

QUY TRÌNH BẮT BUỘC - PHÂN TÍCH TỪNG MỆNH ĐỀ:
Với MỖI câu, bạn PHẢI thực hiện theo trình tự sau:
1. Đọc nguyên văn mệnh đề (a) → Phân tích lý do → Kết luận ĐÚNG/SAI
2. Đọc nguyên văn mệnh đề (b) → Phân tích lý do → Kết luận ĐÚNG/SAI
3. Đọc nguyên văn mệnh đề (c) → Phân tích lý do → Kết luận ĐÚNG/SAI
4. Đọc nguyên văn mệnh đề (d) → Phân tích lý do → Kết luận ĐÚNG/SAI

CHỈ DẪN ĐỘ CHÍNH XÁC:
- Cẩn thận TUYỆT ĐỐI với các từ khóa bẫy: "luôn", "mọi", "chỉ khi", "khi và chỉ khi", "tồn tại", "duy nhất".
- Nếu mệnh đề chứa từ "luôn đúng" hoặc "mọi" → tìm PHẢN VÍ DỤ. Nếu tìm được 1 phản ví dụ → SAI.
- Nếu mệnh đề chứa từ "tồn tại" → chỉ cần TÌM 1 VÍ DỤ thỏa mãn → ĐÚNG.
${tfHints}
- Tự kiểm chứng lại kết luận bằng cách xem xét trường hợp biên hoặc đặc biệt.

Sau khi phân tích xong TẤT CẢ các mệnh đề, trả về kết quả cuối cùng dưới dạng JSON array:
[{"q": <số câu>, "a": <true/false>, "b": <true/false>, "c": <true/false>, "d": <true/false>}]`;

    } else if (part.type === 'short_answer') {
      let saHints = '';
      if (subject.id === 'math') {
        saHints = `HƯỚNG DẪN ĐẶC BIỆT CHO MÔN TOÁN:

🔷 HÌNH HỌC KHÔNG GIAN:
- BẮT BUỘC đặt hệ tọa độ Oxyz. Xác định tọa độ tất cả các đỉnh liên quan.
- Tính khoảng cách bằng công thức vector: d(A,B) = |AB|, d(điểm, mặt phẳng) = |ax₀+by₀+cz₀+d| / √(a²+b²+c²).
- Tính góc bằng tích vô hướng: cos(α) = (u⃗·v⃗) / (|u⃗|·|v⃗|).
- Tính thể tích bằng tích hỗn hợp: V = (1/6)|[AB⃗, AC⃗, AD⃗]|.
- KHÔNG suy luận bằng trực giác hoặc hình vẽ tưởng tượng. PHẢI tính toán bằng số.

🔷 XÁC SUẤT & TỔ HỢP:
- Xác định rõ: đây là bài xác suất cổ điển, xác suất có điều kiện, hay phân phối nhị thức?
- Liệt kê KHÔNG GIAN MẪU (nếu hữu hạn và đếm được).
- Xác định BIẾN CỐ cần tính.
- Tính TỪNG BƯỚC: n(Ω), n(A), P(A) = n(A)/n(Ω), hoặc dùng công thức tổ hợp C(n,k).
- Kiểm tra: tổng xác suất các trường hợp có bằng 1 không?

🔷 TÍCH PHÂN & ĐẠO HÀM:
- Viết rõ từng bước biến đổi, đặt ẩn phụ nếu cần.
- Kiểm tra kết quả bằng cách đạo hàm ngược (với tích phân) hoặc thay số (với đạo hàm).`;
      } else if (subject.id === 'physics') {
        saHints = `HƯỚNG DẪN ĐẶC BIỆT CHO MÔN VẬT LÝ:

🔷 DAO ĐỘNG CƠ & SÓNG CƠ:
- Viết phương trình dao động/sóng, chú ý pha ban đầu và đơn vị (cm, m, rad/s). 
- Dùng đường tròn lượng giác để giải quyết các bài toán về thời gian và quãng đường.

🔷 DÒNG ĐIỆN XOAY CHIỀU:
- Vẽ giản đồ vector hoặc sử dụng số phức (phương pháp chuẩn hóa số liệu) để giải nhanh hệ phương trình điện áp/dòng điện.
- Chú ý sự lệch pha giữa u và i trên từng phần tử R, L, C.

🔷 VẬT LÝ HẠT NHÂN & LƯỢNG TỬ ÁNH SÁNG:
- Chú ý đổi đơn vị giữa eV, MeV, J, u, kg. Đặc biệt là MeV/c².
- Áp dụng nghiêm ngặt định luật bảo toàn động lượng và bảo toàn năng lượng toàn phần (chú ý động năng K).
- Với bài giao thoa ánh sáng: Vẽ trục tọa độ vân sáng/vân tối để đếm số vân chính xác.`;
      }

      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name} với độ chính xác tuyệt đối.

NHIỆM VỤ: Giải các câu Trả lời ngắn từ Câu ${qStart} đến Câu ${qEnd} trong file PDF đề thi đính kèm.

QUY TRÌNH BẮT BUỘC - GIẢI CHI TIẾT TỪNG BƯỚC:
Với MỖI câu, bạn PHẢI:
1. Xác định dạng bài (hàm số, tích phân, hình học không gian, xác suất, lượng giác, v.v. đối với Toán; dao động, dòng điện, hạt nhân, v.v. đối với Lý)
2. Viết ra TOÀN BỘ phép tính trung gian, từng bước một, KHÔNG được bỏ qua bước nào.
3. Tính ra kết quả cuối cùng.
4. TỰ KIỂM CHỨNG bằng cách thay ngược kết quả vào bài gốc hoặc tính lại bằng phương pháp khác.

${saHints}

QUY TẮC ĐỊNH DẠNG ĐÁP ÁN:
- Đáp án là giá trị số, sử dụng dấu phẩy ',' làm ngăn cách thập phân (chuẩn Việt Nam). Ví dụ: 2,5 thay vì 2.5.
- QUY TẮC 4 Ô: Đáp án tối đa 4 ký tự (gồm chữ số, dấu phẩy ',', dấu trừ '-').
- BẮT BUỘC LÀM TRÒN nếu kết quả vượt quá 4 ký tự. Ví dụ: 1,3333 → 1,33; 12,3456 → 12,3; -0,6666 → -0,7.

Sau khi giải và kiểm chứng xong TẤT CẢ các câu, trả về kết quả cuối cùng dưới dạng JSON array:
[{"q": <số câu>, "answer": "<giá trị số>"}]`;
    }

    try {
      const activeModel = useJsonModel ? modelJson : modelThinking;
      const result = await activeModel.generateContent([{ text: prompt }, pdfPart]);
      const responseText = result.response.text();

      // Parse response: JSON model returns pure JSON, thinking model needs extraction
      const parsed = useJsonModel ? JSON.parse(responseText) : extractJsonFromText(responseText);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const qNum = item.q;
          if (qNum < qStart || qNum > qEnd) continue;

          if (part.type === 'multiple_choice') {
            const ans = String(item.answer).toUpperCase();
            if (['A', 'B', 'C', 'D'].includes(ans)) {
              allAnswers[qNum] = { type: 'multiple_choice', partId: part.id, correct: ans };
            }
          } else if (part.type === 'true_false') {
            allAnswers[qNum] = {
              type: 'true_false',
              partId: part.id,
              correct: { a: Boolean(item.a), b: Boolean(item.b), c: Boolean(item.c), d: Boolean(item.d) }
            };
          } else if (part.type === 'short_answer') {
            allAnswers[qNum] = {
              type: 'short_answer',
              partId: part.id,
              correct: String(item.answer).trim()
            };
          }

          completedQuestions++;
          onProgress(completedQuestions, subject.totalQuestions, part.name, { ...allAnswers });
        }
      }
    } catch (error) {
      console.error(`AI solve error for ${part.name} (Câu ${qStart}-${qEnd}):`, error);
      // Continue with next batch even if one fails
    }
  }

  return allAnswers;
};
