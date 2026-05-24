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
 * AI-powered answer key generation.
 * Reads the exam PDF and solves each part (MC, TF, SA) separately
 * for maximum accuracy with temperature=0 and self-verification.
 */
export const generateAnswerKey = async (subjectId, pdfBlobUrl, onProgress = () => {}) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API_KEY_MISSING');
  if (!pdfBlobUrl) throw new Error('PDF_MISSING');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0,
      topK: 1,
      topP: 0.95,
      responseMimeType: 'application/json',
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
  let questionStart = 1;
  let completedQuestions = 0;

  for (const part of subject.parts) {
    const questionEnd = questionStart + part.count - 1;
    onProgress(completedQuestions, subject.totalQuestions, part.name, { ...allAnswers });

    let prompt = '';

    if (part.type === 'multiple_choice') {
      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name}. Hãy giải CHÍNH XÁC TUYỆT ĐỐI tất cả các câu hỏi Trắc nghiệm (Câu ${questionStart} đến Câu ${questionEnd}) trong file PDF đề thi đính kèm.

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
      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name}. Hãy giải CHÍNH XÁC TUYỆT ĐỐI tất cả các câu Đúng/Sai (Câu ${questionStart} đến Câu ${questionEnd}) trong file PDF đề thi đính kèm.

Mỗi câu có 4 mệnh đề (a, b, c, d). Với mỗi mệnh đề, xác định nó ĐÚNG hay SAI.

CHỈ DẪN ĐỘ CHÍNH XÁC:
- Đọc kỹ từng mệnh đề và xác minh tính đúng/sai dựa trên lý thuyết chính xác.
- Tự kiểm chứng: nếu mệnh đề nói "luôn đúng" thì tìm phản ví dụ; nếu nói "tồn tại" thì chỉ cần 1 ví dụ.
- Cẩn thận với các mệnh đề có từ "luôn", "mọi", "chỉ khi", "khi và chỉ khi".

Trả về JSON array, mỗi phần tử có format:
{ "q": <số thứ tự câu hỏi>, "a": <true hoặc false>, "b": <true hoặc false>, "c": <true hoặc false>, "d": <true hoặc false> }

Ví dụ: [{"q": 13, "a": true, "b": false, "c": true, "d": false}]
CHỈ trả về JSON array, KHÔNG viết gì khác.`;

    } else if (part.type === 'short_answer') {
      prompt = `Bạn là chuyên gia giải đề thi THPT Quốc gia môn ${subject.name}. Hãy giải CHÍNH XÁC TUYỆT ĐỐI tất cả các câu Trả lời ngắn (Câu ${questionStart} đến Câu ${questionEnd}) trong file PDF đề thi đính kèm.

Đáp án mỗi câu là một giá trị số (số nguyên hoặc số thập phân, sử dụng dấu phẩy làm ngăn cách thập phân theo đúng chuẩn Việt Nam, ví dụ: 2,5 thay vì 2.5).

CHỈ DẪN ĐỘ CHÍNH XÁC & ĐỊNH DẠNG:
- Giải từng bước chi tiết, ghi lại phép tính trung gian để tránh sai số.
- Tự kiểm chứng bằng cách thay kết quả ngược vào bài gốc.
- Làm tròn theo yêu cầu của đề (nếu có). 
- QUY TẮC 4 Ô TRÊN PHIẾU THI: Phiếu trả lời trắc nghiệm chỉ có tối đa 4 ô (4 ký tự) cho mỗi câu trả lời ngắn (bao gồm chữ số, dấu phẩy ',' và dấu trừ '-'). 
- BẮT BUỘC LÀM TRÒN: Nếu kết quả tính toán có nhiều hơn 4 ký tự (ví dụ: số thập phân vô hạn 1.3333..., hoặc số như 12.3456), bạn BẮT BUỘC phải làm tròn số đó sao cho tổng độ dài kết quả (gồm cả dấu '-' và ',') KHÔNG VƯỢT QUÁ 4 KÝ TỰ (Ví dụ: 1.3333 -> 1,33; 12.3456 -> 12,3; -0.6666... -> -0,7).

Trả về JSON array, mỗi phần tử có format:
{ "q": <số thứ tự câu hỏi>, "answer": "<giá trị số>" }

Ví dụ: [{"q": 17, "answer": "2,5"}, {"q": 18, "answer": "-3"}]
CHỈ trả về JSON array, KHÔNG viết gì khác.`;
    }

    try {
      const result = await model.generateContent([{ text: prompt }, pdfPart]);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const qNum = item.q;
          if (qNum < questionStart || qNum > questionEnd) continue;

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
      console.error(`AI solve error for part ${part.name}:`, error);
      // Continue with next part even if one fails
    }

    questionStart = questionEnd + 1;
  }

  return allAnswers;
};
