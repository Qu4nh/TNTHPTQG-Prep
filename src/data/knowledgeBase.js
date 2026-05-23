/**
 * Knowledge Base for THPT National Exam 2025
 * Structure: Subject > Chapters > Topics > Problem Types
 * Used by AI service to deeply analyze questions and provide targeted feedback.
 */
export const KNOWLEDGE_BASE = {
  math: {
    name: "Toán học",
    chapters: [
      {
        id: "math_ch1",
        name: "Ứng dụng đạo hàm và Khảo sát hàm số",
        topics: [
          {
            name: "Sự đồng biến, nghịch biến",
            problemTypes: [
              "Tìm khoảng đồng biến / nghịch biến của hàm số cho trước",
              "Xác định khoảng đồng biến / nghịch biến từ bảng biến thiên",
              "Tìm giá trị tham số m để hàm số đồng biến / nghịch biến trên khoảng cho trước",
              "Xác định hàm số đồng biến / nghịch biến từ đồ thị y = f'(x)",
            ]
          },
          {
            name: "Cực trị của hàm số",
            problemTypes: [
              "Tìm cực đại, cực tiểu của hàm đa thức bậc 3, bậc 4",
              "Xác định điểm cực trị từ đồ thị hàm số",
              "Tìm giá trị tham số m để hàm số có cực trị thỏa mãn điều kiện",
              "Điều kiện để hàm bậc 3 có cực đại và cực tiểu",
              "Xác định cực trị từ bảng biến thiên / đồ thị f'(x)",
            ]
          },
          {
            name: "Giá trị lớn nhất, nhỏ nhất",
            problemTypes: [
              "Tìm GTLN, GTNN của hàm số trên đoạn [a, b]",
              "Tìm GTLN, GTNN bằng bảng biến thiên",
              "Bài toán thực tế tối ưu: Diện tích, thể tích, chi phí lớn nhất / nhỏ nhất",
              "GTLN, GTNN của hàm lượng giác trên đoạn",
            ]
          },
          {
            name: "Đường tiệm cận",
            problemTypes: [
              "Tìm tiệm cận ngang, tiệm cận đứng của hàm phân thức",
              "Xác định số đường tiệm cận từ đồ thị",
              "Tìm tham số m để hàm số có tiệm cận đứng / ngang thỏa mãn điều kiện",
              "Phân biệt tiệm cận ngang và tiệm cận đứng trên đồ thị",
            ]
          },
          {
            name: "Đồ thị hàm số và các bài toán liên quan",
            problemTypes: [
              "Nhận dạng đồ thị hàm bậc 3, bậc 4, phân thức bậc nhất / bậc nhất",
              "Xác định hệ số từ đồ thị (đọc đồ thị ngược)",
              "Biện luận số nghiệm phương trình bằng đồ thị",
              "Tương giao hai đồ thị: Tìm số giao điểm theo tham số m",
              "Tịnh tiến, đối xứng đồ thị hàm số",
              "Đồ thị hàm y = |f(x)|, y = f(|x|)",
            ]
          }
        ]
      },
      {
        id: "math_ch2",
        name: "Nguyên hàm - Tích phân và Ứng dụng",
        topics: [
          {
            name: "Nguyên hàm và các phương pháp tính",
            problemTypes: [
              "Tính nguyên hàm cơ bản (đa thức, lượng giác, mũ, logarit)",
              "Nguyên hàm bằng phương pháp đổi biến số",
              "Nguyên hàm bằng phương pháp tính từng phần",
              "Tìm nguyên hàm F(x) thỏa mãn điều kiện cho trước F(a) = b",
            ]
          },
          {
            name: "Tích phân xác định",
            problemTypes: [
              "Tính tích phân xác định cơ bản bằng công thức Newton-Leibniz",
              "Tích phân đổi biến số",
              "Tích phân từng phần",
              "Tính tích phân bằng tính chất (hàm chẵn, lẻ, tuần hoàn)",
              "Tích phân hàm có chứa giá trị tuyệt đối",
            ]
          },
          {
            name: "Ứng dụng tích phân tính diện tích, thể tích",
            problemTypes: [
              "Diện tích hình phẳng giới hạn bởi đồ thị hàm số và trục hoành",
              "Diện tích hình phẳng giới hạn bởi hai đồ thị hàm số",
              "Thể tích vật thể tròn xoay quay quanh trục Ox, Oy",
              "Bài toán thực tế: Tính diện tích, thể tích từ dữ liệu",
            ]
          }
        ]
      },
      {
        id: "math_ch3",
        name: "Hình học không gian (Véc-tơ & Oxyz)",
        topics: [
          {
            name: "Véc-tơ trong không gian",
            problemTypes: [
              "Phân tích véc-tơ theo 3 véc-tơ không đồng phẳng",
              "Tính tích vô hướng, tích có hướng hai véc-tơ",
              "Chứng minh hai véc-tơ cùng phương, vuông góc",
              "Điều kiện đồng phẳng của 3 véc-tơ",
            ]
          },
          {
            name: "Hệ tọa độ trong không gian Oxyz",
            problemTypes: [
              "Tìm tọa độ điểm (trung điểm, trọng tâm, đối xứng)",
              "Tính khoảng cách giữa hai điểm trong Oxyz",
              "Tìm tọa độ véc-tơ pháp tuyến, véc-tơ chỉ phương",
            ]
          },
          {
            name: "Phương trình mặt phẳng",
            problemTypes: [
              "Viết phương trình mặt phẳng qua 3 điểm",
              "Phương trình mặt phẳng qua 1 điểm và vuông góc với đường thẳng",
              "Phương trình mặt phẳng qua 1 điểm và song song / vuông góc với mp khác",
              "Khoảng cách từ điểm đến mặt phẳng",
              "Vị trí tương đối giữa hai mặt phẳng (song song, cắt nhau, trùng nhau)",
            ]
          },
          {
            name: "Phương trình đường thẳng",
            problemTypes: [
              "Viết phương trình đường thẳng qua 2 điểm",
              "Phương trình đường thẳng qua 1 điểm và có véc-tơ chỉ phương cho trước",
              "Vị trí tương đối giữa đường thẳng và mặt phẳng (song song, vuông góc, cắt)",
              "Vị trí tương đối giữa hai đường thẳng (cắt, chéo, song song, trùng)",
              "Khoảng cách từ điểm đến đường thẳng",
              "Khoảng cách giữa hai đường thẳng chéo nhau",
              "Góc giữa đường thẳng và mặt phẳng, góc giữa hai đường thẳng",
            ]
          },
          {
            name: "Mặt cầu",
            problemTypes: [
              "Viết phương trình mặt cầu biết tâm và bán kính",
              "Xác định tâm, bán kính từ phương trình mặt cầu",
              "Vị trí tương đối giữa mặt cầu và mặt phẳng (tiếp xúc, cắt, không giao)",
              "Mặt cầu ngoại tiếp, nội tiếp hình hộp, hình chóp",
              "Tìm phương trình mặt cầu qua 4 điểm",
            ]
          }
        ]
      },
      {
        id: "math_ch4",
        name: "Xác suất - Thống kê",
        topics: [
          {
            name: "Đặc trưng đo lường độ phân tán",
            problemTypes: [
              "Tính phương sai, độ lệch chuẩn của mẫu số liệu",
              "So sánh độ phân tán của hai mẫu dữ liệu",
              "Tính kỳ vọng (giá trị trung bình), trung vị, mốt",
              "Bài toán thực tế: Phân tích dữ liệu bằng phương sai / độ lệch chuẩn",
            ]
          },
          {
            name: "Xác suất có điều kiện",
            problemTypes: [
              "Tính xác suất có điều kiện P(A|B) từ bảng dữ liệu",
              "Xác suất có điều kiện trong bài toán thực tế (y tế, kiểm tra chất lượng)",
              "Nhận biết biến cố độc lập và biến cố phụ thuộc",
              "Sử dụng công thức xác suất toàn phần",
            ]
          },
          {
            name: "Công thức Bayes",
            problemTypes: [
              "Áp dụng công thức Bayes cơ bản",
              "Bài toán xét nghiệm y tế (dương tính giả, âm tính giả)",
              "Bài toán kiểm tra chất lượng sản phẩm qua nhiều khâu",
              "Bài toán xác suất ngược: Tìm nguyên nhân từ kết quả",
            ]
          }
        ]
      }
    ]
  },
  physics: {
    name: "Vật lý",
    chapters: [
      {
        id: "phys_ch1",
        name: "Vật lý Nhiệt",
        topics: [
          {
            name: "Sự chuyển thể của các chất",
            problemTypes: [
              "Xác định nhiệt lượng cần cung cấp để chuyển thể (nóng chảy, bay hơi)",
              "Bài toán trao đổi nhiệt khi có chuyển thể",
              "Đọc đồ thị quá trình chuyển thể (nhiệt độ - thời gian)",
              "Phân biệt nóng chảy / đông đặc, bay hơi / ngưng tụ, thăng hoa / ngưng kết",
            ]
          },
          {
            name: "Nguyên lý nhiệt động lực học",
            problemTypes: [
              "Áp dụng nguyên lý I nhiệt động lực học: Q = ΔU + A",
              "Xác định công, nhiệt lượng, biến thiên nội năng trong các quá trình",
              "Bài toán đẳng tích, đẳng áp, đẳng nhiệt áp dụng nguyên lý I",
              "Nguyên lý II: Chiều truyền nhiệt tự nhiên, hiệu suất máy nhiệt",
            ]
          }
        ]
      },
      {
        id: "phys_ch2",
        name: "Khí lý tưởng",
        topics: [
          {
            name: "Thuyết động học phân tử chất khí",
            problemTypes: [
              "Nội dung cơ bản của thuyết động học phân tử",
              "So sánh tính chất phân tử ở 3 thể rắn, lỏng, khí",
              "Quan hệ giữa nhiệt độ và động năng trung bình phân tử",
            ]
          },
          {
            name: "Các đẳng quá trình",
            problemTypes: [
              "Đẳng nhiệt (Boyle): Tính p, V khi T = const",
              "Đẳng tích (Charles): Tính p, T khi V = const",
              "Đẳng áp (Gay-Lussac): Tính V, T khi p = const",
              "Nhận dạng đồ thị đẳng quá trình trong các hệ tọa độ (p-V, p-T, V-T)",
              "Đọc và vẽ đồ thị quá trình biến đổi trạng thái khi đổi hệ tọa độ",
            ]
          },
          {
            name: "Phương trình trạng thái khí lý tưởng",
            problemTypes: [
              "Áp dụng phương trình pV/T = const cho quá trình biến đổi tổng quát",
              "Bài toán bơm khí, nén khí, thay đổi trạng thái",
              "Bài toán hai trạng thái khí kết hợp đồ thị",
              "Tính khối lượng riêng, mật độ phân tử qua phương trình trạng thái",
            ]
          }
        ]
      },
      {
        id: "phys_ch3",
        name: "Từ trường",
        topics: [
          {
            name: "Từ trường, Đường sức từ",
            problemTypes: [
              "Nhận biết từ trường: nam châm, dòng điện, Trái Đất",
              "Xác định chiều đường sức từ bằng quy tắc nắm tay phải",
              "So sánh đường sức từ của nam châm thẳng, nam châm chữ U, ống dây",
              "Từ trường đều, từ trường không đều",
            ]
          },
          {
            name: "Lực từ tác dụng lên đoạn dây dẫn mang dòng điện",
            problemTypes: [
              "Tính lực từ F = BIl.sinα",
              "Xác định chiều lực từ bằng quy tắc bàn tay trái",
              "Bài toán dây dẫn cân bằng trong từ trường (lực từ cân bằng trọng lực)",
              "Lực tương tác giữa hai dòng điện song song (hút / đẩy)",
            ]
          },
          {
            name: "Cảm ứng từ",
            problemTypes: [
              "Tính cảm ứng từ tại tâm dòng điện tròn",
              "Cảm ứng từ trong lòng ống dây (solenoid)",
              "Nguyên lý chồng chất từ trường",
              "Xác định véc-tơ cảm ứng từ tổng hợp tại một điểm",
            ]
          },
          {
            name: "Lực Lorentz",
            problemTypes: [
              "Tính lực Lorentz f = |q|vB.sinα",
              "Xác định chiều lực Lorentz (quy tắc bàn tay trái cho hạt dương/âm)",
              "Chuyển động của hạt mang điện trong từ trường đều (quỹ đạo tròn)",
              "Tính bán kính quỹ đạo tròn, chu kỳ quay của hạt mang điện",
            ]
          }
        ]
      },
      {
        id: "phys_ch4",
        name: "Vật lý lượng tử",
        topics: [
          {
            name: "Hiện tượng quang điện ngoài",
            problemTypes: [
              "Xác định giới hạn quang điện, bước sóng ngưỡng của kim loại",
              "Tính động năng ban đầu cực đại của electron quang điện",
              "Tính hiệu điện thế hãm",
              "Điều kiện xảy ra hiện tượng quang điện",
              "Cường độ dòng quang điện bão hòa, hiệu suất lượng tử",
            ]
          },
          {
            name: "Thuyết lượng tử ánh sáng",
            problemTypes: [
              "Tính năng lượng photon E = hf = hc/λ",
              "Phương trình Einstein: hf = A + Wđ_max",
              "So sánh năng lượng photon của các bức xạ khác nhau",
              "Ứng dụng: Pin quang điện, quang trở, LED",
            ]
          },
          {
            name: "Mẫu nguyên tử Bohr",
            problemTypes: [
              "Tính bán kính quỹ đạo dừng thứ n",
              "Tính năng lượng ở trạng thái dừng thứ n",
              "Bước chuyển quỹ đạo: Hấp thụ / bức xạ photon",
              "Tính bước sóng của vạch quang phổ phát ra khi electron chuyển mức",
              "Xác định số vạch quang phổ tối đa khi electron ở trạng thái kích thích thứ n",
            ]
          }
        ]
      },
      {
        id: "phys_ch5",
        name: "Vật lý hạt nhân",
        topics: [
          {
            name: "Cấu tạo hạt nhân",
            problemTypes: [
              "Xác định số proton, neutron, nucleon từ ký hiệu hạt nhân",
              "Đồng vị, nguyên tử khối trung bình",
              "Đơn vị khối lượng nguyên tử (u) và MeV/c²",
            ]
          },
          {
            name: "Độ hụt khối và Năng lượng liên kết",
            problemTypes: [
              "Tính độ hụt khối Δm = Z.mp + N.mn - m_hn",
              "Tính năng lượng liên kết W_lk = Δm.c²",
              "So sánh độ bền vững hạt nhân qua năng lượng liên kết riêng W_lk/A",
              "Giải thích tại sao hạt nhân trung bình bền vững nhất",
            ]
          },
          {
            name: "Hiện tượng phóng xạ",
            problemTypes: [
              "Phân biệt các loại phóng xạ: α, β⁻, β⁺, γ",
              "Viết phương trình phóng xạ, xác định hạt nhân con",
              "Định luật phóng xạ: N = N₀.e^(-λt), m = m₀.2^(-t/T)",
              "Tính số hạt nhân còn lại, đã phân rã sau thời gian t",
              "Tính chu kỳ bán rã T, hằng số phóng xạ λ",
              "Độ phóng xạ H = H₀.e^(-λt)",
              "Ứng dụng: Xác định tuổi mẫu vật (đồng vị Carbon-14)",
            ]
          },
          {
            name: "Phản ứng hạt nhân",
            problemTypes: [
              "Viết và cân bằng phương trình phản ứng hạt nhân",
              "Áp dụng bảo toàn số khối A, bảo toàn điện tích Z",
              "Tính năng lượng tỏa ra / thu vào của phản ứng hạt nhân (E = Δm.c²)",
              "Phân biệt phản ứng phân hạch và nhiệt hạch",
              "Tính động năng sản phẩm bằng bảo toàn năng lượng + bảo toàn động lượng",
            ]
          }
        ]
      }
    ]
  },
  english: {
    name: "Tiếng Anh",
    chapters: [
      {
        id: "eng_ch1",
        name: "Ngữ âm (Phonetics)",
        topics: [
          {
            name: "Phát âm (Pronunciation)",
            problemTypes: [
              "Tìm từ có phần gạch chân phát âm KHÁC với các từ còn lại",
              "Phát âm đuôi -ed: /t/, /d/, /ɪd/",
              "Phát âm đuôi -s/-es: /s/, /z/, /ɪz/",
              "Phát âm nguyên âm (vowels): /ɪ/ vs /iː/, /ʊ/ vs /uː/, /æ/ vs /e/",
              "Phát âm phụ âm câm (silent consonants): know, write, hour",
              "Phát âm các tổ hợp: -tion, -sion, -ture, -ous, -ough",
            ]
          },
          {
            name: "Trọng âm (Stress)",
            problemTypes: [
              "Tìm từ có trọng âm chính rơi vào vị trí KHÁC",
              "Quy tắc trọng âm từ 2 âm tiết (danh từ vs động từ)",
              "Quy tắc trọng âm từ 3+ âm tiết: -tion, -sion, -ic, -ical, -ity, -ify",
              "Trọng âm của từ có tiền tố (prefix) và hậu tố (suffix)",
              "Ngoại lệ phổ biến: hotel, police, machine, canal",
            ]
          }
        ]
      },
      {
        id: "eng_ch2",
        name: "Từ vựng (Vocabulary)",
        topics: [
          {
            name: "Cụm từ cố định (Collocations)",
            problemTypes: [
              "Make vs Do collocations (make a decision, do homework)",
              "Have/Take/Get collocations (have a shower, take a break)",
              "Adjective + Noun collocations (heavy rain, strong wind)",
              "Verb + Preposition collocations (depend on, consist of)",
            ]
          },
          {
            name: "Thành ngữ (Idioms)",
            problemTypes: [
              "Idioms about body parts (keep an eye on, lend a hand)",
              "Idioms about colors (once in a blue moon, see red)",
              "Idioms about animals (let the cat out of the bag, the black sheep)",
              "Common exam idioms: by and large, once in a while, in the long run",
            ]
          },
          {
            name: "Cụm động từ (Phrasal verbs)",
            problemTypes: [
              "Phrasal verbs with LOOK: look up, look after, look into, look forward to",
              "Phrasal verbs with TURN: turn on/off, turn up, turn down, turn out",
              "Phrasal verbs with TAKE: take off, take up, take over, take after",
              "Phrasal verbs with PUT: put off, put up with, put out, put on",
              "Phrasal verbs with GET: get along, get over, get through, get by",
              "Phrasal verbs with GIVE: give up, give in, give away, give out",
            ]
          },
          {
            name: "Từ đồng nghĩa / Trái nghĩa (Synonym / Antonym)",
            problemTypes: [
              "Chọn từ đồng nghĩa (closest in meaning) với từ gạch chân",
              "Chọn từ trái nghĩa (opposite in meaning) với từ gạch chân",
              "Phân biệt các từ gần nghĩa: say/tell/speak/talk, trip/journey/travel",
              "Từ vựng theo chủ đề: Environment, Education, Technology, Health",
            ]
          }
        ]
      },
      {
        id: "eng_ch3",
        name: "Ngữ pháp (Grammar)",
        topics: [
          {
            name: "Thì của động từ (Tenses)",
            problemTypes: [
              "Phân biệt Hiện tại đơn vs Hiện tại tiếp diễn",
              "Phân biệt Quá khứ đơn vs Hiện tại hoàn thành",
              "Quá khứ hoàn thành (Past Perfect) vs Quá khứ đơn",
              "Tương lai đơn (will) vs Be going to vs Hiện tại tiếp diễn (kế hoạch)",
              "Nhận diện dấu hiệu thì: yesterday, since, for, by the time, already",
            ]
          },
          {
            name: "Câu bị động (Passive voice)",
            problemTypes: [
              "Chuyển câu chủ động sang bị động các thì cơ bản",
              "Bị động với động từ có 2 tân ngữ (give, send, show)",
              "Bị động với động từ tường thuật (say, believe, think, report)",
              "Bị động với động từ chỉ giác quan (see, hear, watch)",
              "Bị động với modal verbs (can, must, should + be + V3)",
            ]
          },
          {
            name: "Câu điều kiện (Conditionals)",
            problemTypes: [
              "Câu điều kiện loại 0: Sự thật hiển nhiên (If + present, present)",
              "Câu điều kiện loại 1: Có thể xảy ra (If + present, will + V)",
              "Câu điều kiện loại 2: Không có thật ở hiện tại (If + past, would + V)",
              "Câu điều kiện loại 3: Không có thật ở quá khứ (If + past perfect, would have + V3)",
              "Câu điều kiện hỗn hợp (Mixed conditionals)",
              "Đảo ngữ câu điều kiện (Were I..., Had I..., Should you...)",
            ]
          },
          {
            name: "Mệnh đề quan hệ (Relative clauses)",
            problemTypes: [
              "Đại từ quan hệ: who, whom, which, that, whose",
              "Trạng từ quan hệ: where, when, why",
              "Mệnh đề quan hệ xác định vs không xác định",
              "Rút gọn mệnh đề quan hệ (V-ing / V-ed / to V)",
              "Lược bỏ đại từ quan hệ khi nào được phép",
            ]
          },
          {
            name: "Câu tường thuật (Reported speech)",
            problemTypes: [
              "Chuyển câu trần thuật sang tường thuật (lùi thì)",
              "Chuyển câu hỏi sang tường thuật (Yes/No, Wh-questions)",
              "Chuyển câu mệnh lệnh, yêu cầu, khuyên bảo sang tường thuật",
              "Đổi trạng từ chỉ thời gian, nơi chốn (today→that day, here→there)",
            ]
          },
          {
            name: "Sự phối hợp thì (Tense sequence)",
            problemTypes: [
              "Quy tắc phối hợp thì trong câu phức",
              "Mệnh đề thời gian: Before / After / When / While + thì phù hợp",
              "By the time + Quá khứ đơn / Quá khứ hoàn thành",
            ]
          },
          {
            name: "Các chủ điểm ngữ pháp khác",
            problemTypes: [
              "So sánh (Comparisons): Hơn, nhất, ngang bằng, gấp bội",
              "Mạo từ (Articles): a/an/the và các trường hợp không dùng mạo từ",
              "Giới từ (Prepositions): in/on/at + time/place, giới từ theo sau tính từ",
              "Liên từ (Conjunctions): although/despite, because/because of, however/moreover",
              "Đảo ngữ (Inversion): Not only...but also, Hardly...when, No sooner...than",
              "Câu giả định (Subjunctive): suggest/recommend/insist + (that) + S + V_bare",
              "Cấu trúc song song (Parallel structure)",
              "Sự hòa hợp chủ-vị (Subject-verb agreement)",
            ]
          }
        ]
      },
      {
        id: "eng_ch4",
        name: "Kỹ năng (Skills)",
        topics: [
          {
            name: "Đọc hiểu (Reading comprehension)",
            problemTypes: [
              "Câu hỏi tìm ý chính (Main idea / Title)",
              "Câu hỏi chi tiết (Detail / Specific information)",
              "Câu hỏi suy luận (Inference)",
              "Câu hỏi từ vựng trong ngữ cảnh (Word in context)",
              "Câu hỏi tham chiếu (Reference: 'it', 'they', 'this')",
              "Câu hỏi NOT TRUE / NOT mentioned",
            ]
          },
          {
            name: "Điền từ vào đoạn văn (Cloze test)",
            problemTypes: [
              "Điền từ nối logic (however, moreover, therefore, although)",
              "Điền giới từ phù hợp ngữ cảnh",
              "Điền từ vựng đúng nghĩa theo ngữ cảnh",
              "Điền đại từ quan hệ / liên từ",
            ]
          },
          {
            name: "Chức năng giao tiếp (Communication functions)",
            problemTypes: [
              "Đáp lại lời cảm ơn, xin lỗi, khen ngợi, chúc mừng",
              "Đưa ra / chấp nhận / từ chối lời mời, đề nghị",
              "Hỏi / cho ý kiến, đồng ý / không đồng ý",
              "Các tình huống giao tiếp trong đời sống (mua sắm, du lịch, bệnh viện)",
            ]
          },
          {
            name: "Viết lại câu (Sentence transformation)",
            problemTypes: [
              "Viết lại câu đồng nghĩa dùng cấu trúc cho sẵn",
              "Kết hợp hai câu thành một câu",
              "Chọn câu gần nghĩa nhất với câu gốc",
              "Tìm lỗi sai (Error identification) trong câu cho trước",
            ]
          }
        ]
      }
    ]
  }
};
