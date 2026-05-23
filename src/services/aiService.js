import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE } from '../data/knowledgeBase';

const getApiKey = () => {
  let key = localStorage.getItem('gemini_api_key');
  if (key) return key;

  try {
    const settingsStr = localStorage.getItem('settings');
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

export const generateOverallAnalysis = async (examResult, subjectId) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash',
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 0.95,
    }
  });

  const subjectKnowledge = KNOWLEDGE_BASE[subjectId] || {};
  const knowledgeString = JSON.stringify(subjectKnowledge, null, 2);

  const prompt = `
Bạn là một giáo viên chuyên môn cao, luyện thi THPT Quốc gia môn ${subjectKnowledge.name || 'này'}.
Học sinh vừa hoàn thành bài thi.
Đây là điểm số của học sinh: ${examResult.totalScore}/10 điểm.
Chi tiết số câu đúng/sai theo từng phần:
${Object.values(examResult.partScores).map(p => `- ${p.name}: Đúng ${p.correct}/${p.total}, Sai ${p.wrong}, Bỏ ${p.skipped}`).join('\n')}

Dưới đây là cấu trúc chương trình học chi tiết của môn này năm 2025 (gồm Chương > Chủ đề > Dạng bài cụ thể):
${knowledgeString}

Nhiệm vụ:
1. Đánh giá tổng quan năng lực hiện tại của học sinh dựa trên điểm số (tích cực, khích lệ).
2. Dựa vào tỷ lệ sai ở từng phần, hãy dự đoán xem học sinh đang yếu ở phần kỹ năng nào (Trắc nghiệm nhiều lựa chọn, Trắc nghiệm đúng sai, hay Trả lời ngắn).
3. Đề xuất chiến lược ôn tập cụ thể: Chỉ ra TÊN CHƯƠNG, TÊN CHỦ ĐỀ, và các DẠNG BÀI CỤ THỂ (problemTypes) mà học sinh cần luyện thêm.
4. Gợi ý thứ tự ưu tiên ôn tập: Dạng bài nào cần ôn trước, dạng nào ôn sau.

Lưu ý:
- Trả về câu trả lời bằng Markdown, sử dụng KaTeX ($$) nếu có công thức toán học.
- Viết thân thiện, ngắn gọn, súc tích (dưới 300 từ).
  `;

  try {
    const result = await model.generateContent(prompt);
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
  // Dùng gemini-3-flash: Phiên bản tối tân nhất, thông minh vượt trội, tư duy toán học xuất sắc nhưng vẫn giữ quota Free Tier siêu hào phóng.
  // Nhiệt độ thấp (0.1) giúp AI trả lời chính xác, logic, tránh "ảo giác" trong toán học.
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-3-flash',
    generationConfig: {
      temperature: 0.1,
      topK: 32,
      topP: 0.95,
    }
  });

  const subjectKnowledge = KNOWLEDGE_BASE[subjectId] || {};

  // Construct parts array
  const parts = [];

  // Lấy text giải thích
  let promptText = `
Bạn là một chuyên gia luyện thi THPT Quốc gia đỉnh cao môn ${subjectKnowledge.name || 'này'}, am hiểu chương trình GDPT 2018 (thi từ 2025).

Học sinh cần phân tích Câu ${questionObj.questionNumber} trong đề thi.
Dạng câu hỏi: ${questionObj.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : questionObj.type === 'true_false' ? 'Trắc nghiệm Đúng/Sai' : 'Trả lời ngắn'}.
Tình trạng làm bài: Học sinh làm ${questionObj.status === 'correct' ? 'ĐÚNG' : questionObj.status === 'partial' ? 'ĐÚNG MỘT PHẦN' : 'SAI'}.
Học sinh chọn: ${JSON.stringify(questionObj.userAnswer)}
Đáp án đúng của đề: ${JSON.stringify(questionObj.correctAnswer)}

Dưới đây là cấu trúc chương trình học chi tiết (Chương > Chủ đề > Dạng bài cụ thể):
${JSON.stringify(subjectKnowledge, null, 2)}

Nhiệm vụ của bạn (CỰC KỲ QUAN TRỌNG - KHÔNG ĐƯỢC SAI SÓT):
1. Đọc nội dung Câu ${questionObj.questionNumber} từ file PDF đề thi đính kèm. Bạn PHẢI giải bài toán từng bước một (Step-by-step) trong đầu trước khi đưa ra kết luận.
2. Phân tích TẠI SAO đáp án đúng lại là đáp án đó bằng lập luận toán học/vật lý/ngôn ngữ học chặt chẽ. TUYỆT ĐỐI không đoán mò.
3. Nếu học sinh sai, hãy chỉ ra LỖI TƯ DUY (bản chất) khiến học sinh thường nhầm lẫn ở lựa chọn đó.
4. KHÔNG CHỈ DẠY MẸO HỌC VẸT. Hãy hướng dẫn cách làm bài này NHANH NHẤT bằng cách nắm vững bản chất, hoặc kết hợp tư duy giải toán nhanh (ví dụ: bấm CASIO, dùng đồ thị, loại trừ logic) để áp dụng cho NHIỀU BÀI TƯƠNG TỰ nhất có thể.
5. Xác định CHÍNH XÁC câu hỏi này thuộc:
   - **Chương** nào
   - **Chủ đề** nào
   - **Dạng bài cụ thể** (problemType) nào
   trong khung kiến thức ở trên. Ghi rõ tên để học sinh biết cần ôn phần nào.
6. Gợi ý 2-3 bài tập tương tự mà học sinh nên luyện thêm (mô tả dạng bài, không cần đề cụ thể).

Yêu cầu định dạng:
- Dùng Markdown. Trình bày rõ ràng thành các bước (Bước 1, Bước 2...).
- QUAN TRỌNG: Mọi công thức Toán/Lý phải viết theo chuẩn LaTeX bọc trong dấu \`$\` (cho inline, ví dụ $\\int x dx$) hoặc \`$$\` (cho block).
- Ngắn gọn, súc tích, dễ hiểu nhưng phải ĐẢM BẢO ĐỘ CHÍNH XÁC TUYỆT ĐỐI 100%.
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
