const STARTING_POINTS = 100;
const DEFAULT_CLASSES = ['10A1', '10A2', '10A3', '11B1', '11B2', '12C1', '12C2'];

let classes = JSON.parse(localStorage.getItem('thiduaso_classes')) || DEFAULT_CLASSES;
let violations = JSON.parse(localStorage.getItem('thiduaso_violations')) || [];
let students = JSON.parse(localStorage.getItem('thiduaso_students')) || {};
let qaList = JSON.parse(localStorage.getItem('school_qa')) || [];

// BIẾN QUẢN LÝ CÁ NHÂN
let myProfile = JSON.parse(localStorage.getItem('my_profile')) || { className: '', studentName: '' };
let mySchedules = JSON.parse(localStorage.getItem('my_schedules')) || [];
let myStudyPlans = JSON.parse(localStorage.getItem('my_study_plans')) || [];
let isReminderOn = JSON.parse(localStorage.getItem('my_reminder_status'));
if (isReminderOn === null) isReminderOn = true;

let timetables = {
    main: JSON.parse(localStorage.getItem('school_tkb_main')) || {},
    prep: JSON.parse(localStorage.getItem('school_tkb_prep')) || {},
    teacher: JSON.parse(localStorage.getItem('school_tkb_teacher')) || {}
};

let oldTkb = localStorage.getItem('school_timetables');
if(oldTkb && Object.keys(timetables.main).length === 0) {
    timetables.main = JSON.parse(oldTkb);
    localStorage.setItem('school_tkb_main', JSON.stringify(timetables.main));
    localStorage.removeItem('school_timetables');
}

let currentTkbTab = 'main';

classes.forEach(c => { if(!students[c]) students[c] = []; });

document.addEventListener('DOMContentLoaded', () => {
    const originalLength = classes.length;
    classes = classes.filter(c => !c.includes('/'));
    if (classes.length !== originalLength) {
        localStorage.setItem('thiduaso_classes', JSON.stringify(classes));
    }

    initApp();

    const teacherSearch = document.getElementById('tkb-teacher-search');
    if(teacherSearch) {
        teacherSearch.addEventListener('input', function(e) {
            if(currentTkbTab !== 'teacher') return;
            const keyword = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const select = document.getElementById('tkb-target-select');
            const teacherList = Object.keys(timetables.teacher).sort();
            select.innerHTML = '<option value="">-- Chọn --</option>';
            let count = 0;
            teacherList.forEach(t => {
                let normalizedName = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (normalizedName.includes(keyword)) {
                    select.innerHTML += `<option value="${t}">Thầy/Cô ${t}</option>`;
                    count++;
                }
            });
            if(count === 0) select.innerHTML = '<option value="">❌ Không tìm thấy</option>';
            document.getElementById('tkb-display').innerHTML = `<p class="text-center text-gray-500 text-sm">Vui lòng chọn tên phía trên.</p>`;
        });
    }

    const editClassEl = document.getElementById('edit-tkb-class');
    const editTeacherEl = document.getElementById('edit-tkb-teacher-input');
    if(editClassEl) editClassEl.addEventListener('change', loadEditTkbData);
    if(editTeacherEl) editTeacherEl.addEventListener('blur', loadEditTkbData);

    const editForm = document.getElementById('edit-tkb-form');
    if(editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const type = document.getElementById('edit-tkb-type').value;
            let target = (type === 'main' || type === 'prep') ? document.getElementById('edit-tkb-class').value : document.getElementById('edit-tkb-teacher-input').value.trim();
            if(!target) return alert("Vui lòng nhập/chọn đối tượng áp dụng!");

            timetables[type][target] = {
                't2': document.getElementById('tkb-t2').value, 't3': document.getElementById('tkb-t3').value,
                't4': document.getElementById('tkb-t4').value, 't5': document.getElementById('tkb-t5').value,
                't6': document.getElementById('tkb-t6').value, 't7': document.getElementById('tkb-t7').value,
            };
            localStorage.setItem(`school_tkb_${type}`, JSON.stringify(timetables[type]));
            document.getElementById('tkb-edit-section').classList.add('hidden');
            setTkbTab(currentTkbTab);
            if(currentTkbTab === type) { document.getElementById('tkb-target-select').value = target; renderTimetable(); }
            alert("Đã lưu Thời khóa biểu thành công!");
        });
    }

    const askForm = document.getElementById('ask-form');
    if(askForm) {
        askForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const subject = document.getElementById('qa-subject').value;
            const content = document.getElementById('qa-content').value.trim();
            if(subject && content) {
                qaList.push({ id: Date.now(), subject: subject, question: content, answer: null, timestamp: new Date().toLocaleString('vi-VN') });
                localStorage.setItem('school_qa', JSON.stringify(qaList));
                this.reset(); renderQA(); alert("Đã gửi câu hỏi ẩn danh thành công!");
            }
        });
    }

    const addClassForm = document.getElementById('add-class-form');
    if(addClassForm) {
        addClassForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const newClass = document.getElementById('new-class-input').value.trim().toUpperCase();
            if(newClass && !classes.includes(newClass)) { 
                classes.push(newClass); classes.sort(); localStorage.setItem('thiduaso_classes', JSON.stringify(classes)); 
                students[newClass] = []; localStorage.setItem('thiduaso_students', JSON.stringify(students)); 
                document.getElementById('new-class-input').value = ''; initApp(); 
            }
        });
    }

    const addStudentForm = document.getElementById('add-student-form');
    if(addStudentForm) {
        addStudentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const className = document.getElementById('manage-class-select').value;
            const rawText = document.getElementById('new-student-input').value;
            if(!className) return;
            const lines = rawText.split('\n'); let count = 0;
            lines.forEach(line => {
                if(!line.trim()) return;
                let parts = line.split('-'); let rawName = parts[0]; let rawDob = parts[1] ? parts[1].trim() : "";
                const formattedName = rawName.trim().split(/\s+/).map(word => { if(!word) return ""; return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); }).join(" ");
                let formattedDob = "";
                if(rawDob) {
                    let dateParts = rawDob.split('/');
                    if(dateParts.length === 3) { let d = dateParts[0].length === 1 ? "0" + dateParts[0] : dateParts[0]; let m = dateParts[1].length === 1 ? "0" + dateParts[1] : dateParts[1]; let y = dateParts[2]; formattedDob = ` (${d}/${m}/${y})`;
                    } else formattedDob = ` (${rawDob})`;
                }
                const finalStudentString = formattedName + formattedDob;
                if(formattedName && !students[className].includes(finalStudentString)) { students[className].push(finalStudentString); count++; }
            });
            localStorage.setItem('thiduaso_students', JSON.stringify(students));
            document.getElementById('new-student-input').value = ''; renderStudents(); updateStudentSelect();
            alert(`Đã chuẩn hóa và nạp ${count} học sinh!`);
        });
    }
});

function initApp() {
    populateClassSelect(); 
    loadProfileUI(); 
    renderQA();
    renderSettings(); 
    if(typeof initSubjectSelection === 'function') initSubjectSelection();
    if(typeof initExamModule === 'function') initExamModule();
    switchTab('home');
}

function switchTab(tabName) {
    const tabs = ['home', 'timetable', 'profile', 'grade', 'qa', 'settings', 'career', 'exam'];
    const backBtn = document.getElementById('btn-back'); 
    const spacer = document.getElementById('header-spacer');
    
    if(backBtn) {
        if(tabName === 'home') backBtn.classList.add('hidden'); 
        else backBtn.classList.remove('hidden'); 
    }
    if(spacer) {
        if(tabName === 'home') spacer.classList.add('hidden'); 
        else spacer.classList.remove('hidden'); 
    }
    
    tabs.forEach(tab => { 
        const view = document.getElementById(`view-${tab}`); 
        if(view) {
            if(tab === tabName) view.classList.remove('hidden'); 
            else view.classList.add('hidden'); 
        }
    });
    
    if(tabName === 'timetable') { setTkbTab(currentTkbTab); }
    if(tabName === 'exam' && typeof initExamModule === 'function') { initExamModule(); }
}

function populateClassSelect() {
    const selectForm = document.getElementById('class-select'); 
    const selectFilter = document.getElementById('filter-class');
    const selectManage = document.getElementById('manage-class-select'); 
    
    if(selectForm) selectForm.innerHTML = '<option value="">-- Chọn lớp --</option>'; 
    if(selectFilter) selectFilter.innerHTML = '<option value="">Tất cả các lớp</option>';
    if(selectManage) {
        const currentManage = selectManage.value; 
        selectManage.innerHTML = '<option value="">-- Chọn lớp quản lý --</option>';
        classes.forEach(c => {
            if(selectForm) selectForm.innerHTML += `<option value="${c}">Lớp ${c}</option>`; 
            if(selectFilter) selectFilter.innerHTML += `<option value="${c}">Lớp ${c}</option>`;
            selectManage.innerHTML += `<option value="${c}" ${c === currentManage ? 'selected' : ''}>Lớp ${c}</option>`;
        });
    }
    renderStudents();
}


// ==============================================================================

// ==============================================================================
// THUẬT TOÁN CÂY QUYẾT ĐỊNH 6 TẦNG (6-LEVEL DECISION TREE) - THẦN ĐÈN HƯỚNG NGHIỆP
// ==============================================================================

const DECISION_TREE_ROOT = {
  "step": 1,
  "q": "Hỡi bạn học, bạn cảm thấy bị thu hút bởi lĩnh vực nào hơn khi học tập?",
  "desc": "Bước 1/6: Phân định trục kiến thức Tự nhiên hay Xã hội.",
  "optA": {
    "text": "🔬 Khoa học Tự nhiên, Công nghệ, Máy móc, Dữ liệu",
    "next": {
      "step": 2,
      "q": "Trong thế giới Tự nhiên, phong cách hành động nào đúng với bạn nhất?",
      "desc": "Bước 2/6: Phân định Thực tế (R) hay Nghiên cứu (I).",
      "optA": {
        "text": "⚙️ Thực hành thực tế: Thích tháo lắp máy móc, vận động, chế tạo",
        "next": {
          "step": 3,
          "q": "Bạn quan tâm đến đối tượng công việc nào dưới đây?",
          "desc": "Bước 3/6: Lựa chọn giữa Công nghiệp nặng hay Nông sinh tự nhiên.",
          "optA": {
            "text": "🚗 Động cơ, Ô tô, Máy móc cơ khí, Công trình xây dựng",
            "next": {
              "step": 4,
              "q": "Thế mạnh môn học nổi bật nhất của bạn ở trường THPT là gì?",
              "desc": "Bước 4/6: Đánh giá nền tảng tổ hợp môn thi Kỹ thuật.",
              "optA": {
                "text": "📐 Môn Toán và Vật lý truyền thống (Khối A00, A01)",
                "next": {
                  "step": 5,
                  "q": "Môi trường làm việc thực tế nào hấp dẫn bạn nhất?",
                  "desc": "Bước 5/6: Phân nhánh Nhà xưởng ô tô hay Công trình xây dựng.",
                  "optA": {
                    "text": "🏭 Nhà xưởng chế tạo ô tô, robot, dây chuyền thông minh",
                    "next": {
                      "step": 6,
                      "q": "Bạn có sẵn sàng học hỏi liên tục về công nghệ xe điện & robot thông minh?",
                      "desc": "Bước 6/6: Chốt ngành Ô tô hay Điện tử.",
                      "optA": {
                        "text": "🚗 Đúng vậy, tôi đam mê ô tô và robot tự hành",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Ô tô & Cơ điện tử (Realistic)",
                          "desc": "Bạn có tư duy kỹ thuật xuất sắc, khéo léo và đam mê máy móc động cơ thực tế.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Công nghệ Kỹ thuật Ô tô, Kỹ thuật Cơ điện tử, Robot & Tự động hóa.",
                          "jobs": "Kỹ sư ô tô, Kỹ sư Robot, Chuyên viên thiết kế cơ khí, Trưởng xưởng sản xuất công nghệ cao.",
                          "advice": "Cày thật sâu môn Toán - Lý, tích cực tham gia các dự án nghiên cứu STEM và sáng chế mô hình."
                        }
                      },
                      "optB": {
                        "text": "⚡ Tôi thiên về mạch điện tử và tự động hóa nhà máy",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Điện - Điện tử & Tự động hóa",
                          "desc": "Bạn tỉ mỉ, thích mạch điện thông minh và hệ thống điều khiển tự động.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Điện - Điện tử, Tự động hóa, Vi mạch Bán dẫn.",
                          "jobs": "Kỹ sư vi mạch bán dẫn, Chuyên viên điều khiển tự động, Kỹ sư điện tử.",
                          "advice": "Trau dồi thêm Tiếng Anh kỹ thuật để đón đầu làn sóng chip bán dẫn tại Việt Nam."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🏢 Công trường xây dựng, cầu đường, quy hoạch đô thị",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích đi thực địa giám sát công trình hay ngồi văn phòng thiết kế bản đồ quy hoạch?",
                      "desc": "Bước 6/6: Chốt ngành Xây dựng hay Trắc địa đất đai.",
                      "optA": {
                        "text": "🏗️ Tôi thích chỉ huy trực tiếp ngoài công trình xây dựng",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Xây dựng & Công trình",
                          "desc": "Bạn có sức bền, tư duy không gian tốt và thích biến bản vẽ thành các công trình đồ sộ.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Xây dựng, Xây dựng Cầu đường, Quản lý Xây dựng.",
                          "jobs": "Chỉ huy trưởng công trình, Kỹ sư kết cấu, Giám sát thi công xây dựng.",
                          "advice": "Học giỏi môn Hình học không gian và rèn luyện thể lực bền bỉ."
                        }
                      },
                      "optB": {
                        "text": "🗺️ Tôi thích đo đạc bản đồ số và quy hoạch đất đai",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Quản lý Đất đai & Trắc địa Bản đồ",
                          "desc": "Bạn cẩn thận, thích đo đạc địa lý và quy hoạch mặt bằng không gian.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Quản lý Đất đai, Kỹ thuật Trắc địa - Bản đồ, Địa chất.",
                          "jobs": "Chuyên viên quản lý đất đai, Kỹ sư bản đồ vệ tinh, Chuyên viên tài nguyên.",
                          "advice": "Rèn luyện tính chính xác trong từng con số và học thêm phần mềm bản đồ GIS."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "💻 Môn Tin học và Công nghệ ứng dụng (Thích mạch số)",
                "next": {
                  "step": 5,
                  "q": "Bạn quan tâm đến công nghệ vi mạch siêu vi hay thiết bị cơ điện tử thông minh?",
                  "desc": "Bước 5/6: Định hướng công nghệ cao.",
                  "optA": {
                    "text": "💻 Công nghệ vi mạch bán dẫn và thiết bị bay hiện đại",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn thiết kế những con chip siêu nhỏ hay chế tạo thiết bị bay không người lái?",
                      "desc": "Bước 6/6: Chốt ngành Bán dẫn hay Hàng không.",
                      "optA": {
                        "text": "🔬 Thiết kế vi mạch bán dẫn siêu nhỏ cho điện thoại/máy tính",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R & I - Kỹ thuật Vi mạch & Bán dẫn",
                          "desc": "Bạn đón đầu xu thế công nghệ cao nhất hiện nay với tư duy kết hợp phần cứng và giải thuật.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Công nghệ Bán dẫn, Kỹ thuật Vi điện tử, Vật lý Kỹ thuật.",
                          "jobs": "Kỹ sư thiết kế chip bán dẫn, Kỹ sư đóng gói IC, Chuyên viên kiểm thử vi mạch.",
                          "advice": "Tập trung tối đa cho Toán - Lý - Tiếng Anh, đây là ngành 'vàng' trong 10 năm tới."
                        }
                      },
                      "optB": {
                        "text": "✈️ Chế tạo máy bay, drone và thiết bị hàng không",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Hàng không & Thiết bị bay",
                          "desc": "Bạn thích máy bay, thiết bị không người lái và cơ cấu truyền động trên không.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Hàng không, Kỹ thuật Tàu bay, Thiết bị bay thông minh (Drone).",
                          "jobs": "Kỹ sư bảo dưỡng máy bay, Chuyên viên vận hành Drone công nghiệp, Kỹ sư khí động học.",
                          "advice": "Yêu cầu tiếng Anh rất cao và sự kỷ luật nghiêm ngặt."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🦾 Cơ điện tử, cánh tay robot và năng lượng tái tạo",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích hệ thống cánh tay robot thông minh hay phát triển năng lượng xanh (điện gió/mặt trời)?",
                      "desc": "Bước 6/6: Chốt Cơ điện tử hay Năng lượng sạch.",
                      "optA": {
                        "text": "🤖 Cánh tay robot tự động hóa trong sản xuất",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Cơ điện tử (Mechatronics)",
                          "desc": "Sự giao thoa hoàn hảo giữa Cơ khí chính xác, Điện tử thông minh và Lập trình điều khiển.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Cơ điện tử, Robot công nghiệp.",
                          "jobs": "Kỹ sư Cơ điện tử, Kỹ sư vận hành dây chuyền tự động, Lập trình viên nhúng PLC.",
                          "advice": "Cân bằng giữa việc học toán lý thuyết và thực hành hàn mạch, lắp ráp linh kiện."
                        }
                      },
                      "optB": {
                        "text": "☀️ Năng lượng gió, pin mặt trời và xe điện xanh",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Kỹ thuật Năng lượng Tái tạo",
                          "desc": "Bạn quan tâm đến điện gió, pin mặt trời và năng lượng xanh tương lai.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Năng lượng, Năng lượng tái tạo.",
                          "jobs": "Kỹ sư điện gió, Kỹ sư hệ thống điện mặt trời, Chuyên viên tối ưu năng lượng.",
                          "advice": "Củng cố chắc môn Vật lý phần Điện học và Nhiệt học."
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "optB": {
            "text": "🌱 Cây trồng, Vật nuôi, Môi trường và Hệ sinh thái tự nhiên",
            "next": {
              "step": 4,
              "q": "Bạn học tốt môn Sinh học và Hóa học hơn môn Vật lý?",
              "desc": "Bước 4/6: Đánh giá định hướng Tự nhiên - Sinh thái.",
              "optA": {
                "text": "🧪 Đúng vậy, tôi học tốt Hóa - Sinh và thích chăm sóc sự sống",
                "next": {
                  "step": 5,
                  "q": "Bạn quan tâm đến lĩnh vực động vật hay thế giới thực vật và môi trường sống?",
                  "desc": "Bước 5/6: Phân nhánh Động vật hay Thực vật/Môi trường.",
                  "optA": {
                    "text": "🐾 Thế giới động vật: Thú cưng, gia súc, thủy hải sản",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích mở phòng khám chữa bệnh cho thú cưng hay làm việc bảo tồn sinh vật biển/vườn quốc gia?",
                      "desc": "Bước 6/6: Chốt Bác sĩ thú y hay Thủy sản biển.",
                      "optA": {
                        "text": "🐶 Khám chữa bệnh cho thú cưng và động vật nông trại",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R & I - Bác sĩ Thú y (Veterinary Medicine)",
                          "desc": "Bạn có lòng nhân hậu, kiên nhẫn và đam mê chữa bệnh, chăm sóc các loài động vật.",
                          "blocks": "B00 (Toán, Hóa, Sinh), A00 (Toán, Lý, Hóa), D07 (Toán, Hóa, Anh)",
                          "majors": "Bác sĩ Thú y, Chăn nuôi thú y, Dược thú y.",
                          "jobs": "Bác sĩ thú y tại bệnh viện thú cưng, Chuyên gia kiểm dịch động vật, Quản lý trang trại chăn nuôi quốc tế.",
                          "advice": "Môn Hóa và Sinh là chủ lực, hãy rèn luyện thêm tính dũng cảm và vệ sinh cẩn thận."
                        }
                      },
                      "optB": {
                        "text": "🌊 Nuôi trồng thủy sản công nghệ cao và bảo tồn động vật biển",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Bảo tồn Động vật Hoang dã & Thủy sản",
                          "desc": "Bạn thích thiên nhiên hoang dã, biển cả và thế giới sinh vật dưới nước.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Bảo tồn thiên nhiên, Nuôi trồng thủy sản, Sinh học biển.",
                          "jobs": "Chuyên viên vườn quốc gia, Kỹ sư nuôi trồng thủy sản công nghệ cao, Nhà bảo tồn.",
                          "advice": "Thường xuyên tham gia các hoạt động cắm trại và bảo vệ môi trường."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🌱 Cây trồng nông nghiệp sạch và tài nguyên môi trường",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích làm chủ trang trại thông minh hay trở thành kỹ sư bảo vệ nguồn nước và môi trường?",
                      "desc": "Bước 6/6: Chốt Nông nghiệp sạch hay Môi trường xanh.",
                      "optA": {
                        "text": "🌿 Vận hành trang trại rau quả sạch tự động hóa",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Nông nghiệp Công nghệ cao",
                          "desc": "Nông nghiệp hiện đại của kỷ nguyên số: không phải 'chân lấm tay bùn' mà là điều khiển bằng cảm biến.",
                          "blocks": "B00 (Toán, Hóa, Sinh), A00 (Toán, Lý, Hóa)",
                          "majors": "Nông nghiệp công nghệ cao, Khoa học cây trồng, Công nghệ sinh học nông nghiệp.",
                          "jobs": "Kỹ sư nông nghiệp thông minh, Giám đốc trang trại hydroponics, Chuyên gia giống cây trồng.",
                          "advice": "Học đều môn Sinh, Hóa và học thêm về cảm biến điện tử."
                        }
                      },
                      "optB": {
                        "text": "💧 Kỹ sư xử lý nước thải, chống ô nhiễm và biến đổi khí hậu",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Quản lý Tài nguyên & Môi trường",
                          "desc": "Bạn mang sứ mệnh bảo vệ nguồn nước, không khí và xử lý rác thải cho hành tinh.",
                          "blocks": "B00 (Toán, Hóa, Sinh), A00 (Toán, Lý, Hóa)",
                          "majors": "Khoa học Môi trường, Quản lý tài nguyên nước, Kỹ thuật môi trường.",
                          "jobs": "Kỹ sư xử lý môi trường, Chuyên viên thanh tra môi trường, Tư vấn ESG cho tập đoàn.",
                          "advice": "Môn Hóa học là mấu chốt quan trọng nhất của ngành này."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "🌾 Tôi thích ứng dụng kỹ thuật và chế biến sản phẩm từ thiên nhiên",
                "next": {
                  "step": 5,
                  "q": "Bạn muốn làm việc trong phòng lab chế biến thực phẩm hay thiết kế cảnh quan thiên nhiên?",
                  "desc": "Bước 5/6: Phân định Thực phẩm hay Cảnh quan rừng.",
                  "optA": {
                    "text": "🍽️ Công nghệ chế biến thực phẩm và chiết xuất sinh học",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích chế biến công thức đồ ăn thức uống ngon hay nghiên cứu vi sinh phòng lab?",
                      "desc": "Bước 6/6: Chốt Thực phẩm hay Sinh học ứng dụng.",
                      "optA": {
                        "text": "🥫 Nghiên cứu công thức thực phẩm và nước giải khát mới",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R & I - Công nghệ Thực phẩm",
                          "desc": "Ngành nghề thiết yếu không bao giờ lỗi thời: chế biến, bảo quản và phát triển đồ ăn, đồ uống mới.",
                          "blocks": "A00 (Toán, Lý, Hóa), B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Công nghệ Thực phẩm, Đảm bảo chất lượng & An toàn thực phẩm.",
                          "jobs": "Kỹ sư phát triển sản phẩm (R&D), Chuyên viên kiểm định chất lượng (QA/QC) tại các tập đoàn đồ uống/thực phẩm.",
                          "advice": "Cực kỳ chú trọng môn Hóa học và Vi sinh vật học."
                        }
                      },
                      "optB": {
                        "text": "🧪 Nghiên cứu men sinh học, nấm và dược liệu phòng lab",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Công nghệ Sinh học Ứng dụng",
                          "desc": "Nghiên cứu men vi sinh, lên men và chiết xuất dược liệu tự nhiên.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Công nghệ Sinh học, Kỹ thuật sinh học.",
                          "jobs": "Nhà nghiên cứu vi sinh, Kỹ sư lên men công nghiệp, Chuyên viên phòng lab sinh học.",
                          "advice": "Kiên nhẫn và tỉ mỉ trong từng thao tác thí nghiệm phòng lab."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🌳 Thiết kế hoa viên cảnh quan và bảo vệ rừng sinh thái",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích thiết kế cảnh quan công viên xanh hay muốn gắn bó với núi rừng đại ngàn?",
                      "desc": "Bước 6/6: Chốt Cảnh quan đô thị hay Lâm nghiệp.",
                      "optA": {
                        "text": "🏡 Thiết kế cảnh quan sân vườn và công viên đô thị",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R & A - Kiến trúc Cảnh quan & Hoa viên",
                          "desc": "Sự kết hợp giữa mắt nhìn thẩm mỹ nghệ thuật và kiến thức về các loài cây xanh.",
                          "blocks": "V (Toán, Lý, Vẽ), H (Văn, Vẽ), B00 (Toán, Hóa, Sinh)",
                          "majors": "Kiến trúc Cảnh quan, Lâm nghiệp đô thị.",
                          "jobs": "Kiến trúc sư cảnh quan, Thiết kế sân golf, Chuyên gia quy hoạch cây xanh đô thị.",
                          "advice": "Tập vẽ phác thảo tay và quan sát vẻ đẹp của các loài hoa lá."
                        }
                      },
                      "optB": {
                        "text": "🌲 Quản lý rừng nguyên sinh và phát triển du lịch sinh thái",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "R - Quản lý Rừng & Du lịch Sinh thái",
                          "desc": "Thích lang thang giữa những cánh rừng già và hướng dẫn du khách yêu thiên nhiên.",
                          "blocks": "B00 (Toán, Hóa, Sinh), C00 (Văn, Sử, Địa)",
                          "majors": "Quản lý Tài nguyên Rừng, Du lịch Sinh thái.",
                          "jobs": "Kiểm lâm, Quản lý khu bảo tồn thiên nhiên, Chuyên gia du lịch sinh thái.",
                          "advice": "Tập luyện sức dẻo dai và kỹ năng sinh tồn ngoài trời."
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "optB": {
        "text": "💡 Nghiên cứu phân tích: Thích tư duy giải bài khó, thuật toán, tìm hiểu quy luật",
        "next": {
          "step": 3,
          "q": "Hướng nghiên cứu nào kích thích trí tò mò của bạn nhất?",
          "desc": "Bước 3/6: Phân định Công nghệ Máy tính (IT) hay Y Sinh - Dược học.",
          "optA": {
            "text": "💻 Thuật toán máy tính, Trí tuệ nhân tạo (AI), Phần mềm",
            "next": {
              "step": 4,
              "q": "Bạn có niềm say mê đặc biệt với giải toán logic và viết code máy tính?",
              "desc": "Bước 4/6: Đánh giá tư duy Lập trình thuật toán.",
              "optA": {
                "text": "💻 Rất thích, tôi có thể ngồi cả ngày trước máy tính giải thuật",
                "next": {
                  "step": 5,
                  "q": "Bạn muốn đi sâu vào nghiên cứu thuật toán AI/Bảo mật hay phát triển sản phẩm phần mềm/Game?",
                  "desc": "Bước 5/6: Phân nhánh AI/Security hay Software/Game.",
                  "optA": {
                    "text": "🔬 Đi sâu vào Trí tuệ nhân tạo (AI) và An ninh mạng bảo mật",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích huấn luyện mô hình AI thông minh hay bảo vệ hệ thống mạng chống lại hacker?",
                      "desc": "Bước 6/6: Chốt AI hay An ninh mạng.",
                      "optA": {
                        "text": "🧠 Phát triển thuật toán Trí tuệ nhân tạo (AI) và Big Data",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Kỹ sư Trí tuệ Nhân tạo (AI) & Khoa học Dữ liệu",
                          "desc": "Bạn có bộ não tư duy trừu tượng tuyệt vời, thích 'dạy' cho máy tính tự học và giải các bài toán lớn của nhân loại.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D07 (Toán, Hóa, Anh)",
                          "majors": "Trí tuệ Nhân tạo (AI), Khoa học Dữ liệu (Data Science), Khoa học Máy tính.",
                          "jobs": "Kỹ sư AI/Machine Learning, Chuyên gia Data Scientist, Kỹ sư Xử lý Ngôn ngữ Tự nhiên.",
                          "advice": "Môn Toán (Đại số tuyến tính, Xác suất) và Tiếng Anh là đôi cánh của bạn. Hãy bắt đầu học Python ngay hôm nay!"
                        }
                      },
                      "optB": {
                        "text": "🛡️ Chuyên gia bảo mật an ninh mạng và chống tin tặc",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Kỹ sư An toàn Thông tin & An ninh Mạng",
                          "desc": "Bạn có tư duy thám tử công nghệ, thích bảo vệ hệ thống trước các hacker và tìm kiếm lỗ hổng bảo mật.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "An toàn Thông tin, An ninh Mạng, Kỹ thuật Mạng máy tính.",
                          "jobs": "Chuyên gia bảo mật (Hacker mũ trắng), Kỹ sư an ninh mạng SOC, Phân tích mã độc.",
                          "advice": "Tìm hiểu về nguyên lý mạng máy tính và rèn luyện tính bảo mật, cẩn trọng."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "💻 Phát triển ứng dụng thực tế (Web/App) và Lập trình Game",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích viết ứng dụng/website phục vụ hàng triệu người hay tự tay làm ra tựa game 3D đỉnh cao?",
                      "desc": "Bước 6/6: Chốt Phần mềm hay Làm Game.",
                      "optA": {
                        "text": "📱 Lập trình ứng dụng di động, website và phần mềm",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Kỹ thuật Phần mềm (Software Engineer)",
                          "desc": "Tạo ra các sản phẩm công nghệ thực tế: từ Shopee, Grab cho đến các siêu ứng dụng toàn cầu.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Kỹ thuật Phần mềm, Hệ thống Thông tin, Công nghệ Thông tin.",
                          "jobs": "Lập trình viên Fullstack, Kỹ sư di động (Mobile App Developer), Kiến trúc sư phần mềm.",
                          "advice": "Học chắc thuật toán căn bản và thực hành làm các dự án web/app nhỏ cùng bạn bè."
                        }
                      },
                      "optB": {
                        "text": "🎮 Thiết kế và lập trình các tựa game đồ họa 3D hấp dẫn",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & A - Lập trình Game (Game Developer)",
                          "desc": "Sự kết hợp giữa tư duy lập trình logic và thế giới cốt truyện đồ họa giải trí hấp dẫn.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh)",
                          "majors": "Thiết kế & Lập trình Game, Đa phương tiện công nghệ.",
                          "jobs": "Game Developer (Unity/Unreal), Lập trình viên đồ họa, Thiết kế cơ chế Game.",
                          "advice": "Học giỏi môn Hình học không gian, Vật lý cơ học và làm quen với công cụ Unity."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "📊 Tôi thích phân tích số liệu tài chính & thị trường hơn là code",
                "next": {
                  "step": 5,
                  "q": "Bạn thích ứng dụng số liệu vào Công nghệ tài chính (Fintech) hay Quản trị dữ liệu kinh doanh?",
                  "desc": "Bước 5/6: Phân nhánh Fintech/Kế toán.",
                  "optA": {
                    "text": "💳 Công nghệ tài chính ngân hàng số (Fintech)",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn làm thuật toán phân tích tài chính chứng khoán hay làm cầu nối quản trị dữ liệu doanh nghiệp?",
                      "desc": "Bước 6/6: Chốt Fintech hay Hệ thống thông tin.",
                      "optA": {
                        "text": "📈 Công nghệ tài chính (Fintech) và đầu tư tự động",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & C - Công nghệ Tài chính (Fintech)",
                          "desc": "Cầu nối giữa Ngân hàng và Công nghệ: thanh toán số, tiền mã hóa, đầu tư thuật toán tự động.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Công nghệ Tài chính (Fintech), Toán Kinh tế, Phân tích Dữ liệu Kinh doanh.",
                          "jobs": "Chuyên viên phân tích định lượng (Quant), Kỹ sư Fintech tại ngân hàng, Phân tích dữ liệu tài chính.",
                          "advice": "Học xuất sắc môn Toán và nắm vững các kiến thức kinh tế vĩ mô."
                        }
                      },
                      "optB": {
                        "text": "🗄️ Cầu nối phân tích nghiệp vụ và dữ liệu kinh doanh (BA/MIS)",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "C & I - Hệ thống Thông tin Quản lý (MIS)",
                          "desc": "Quản trị cơ sở dữ liệu lớn và tối ưu hóa quy trình làm việc cho các tập đoàn lớn.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Hệ thống Thông tin Quản lý (MIS), Quản trị Dữ liệu Doanh nghiệp.",
                          "jobs": "Chuyên viên phân tích nghiệp vụ (BA - Business Analyst), Quản trị cơ sở dữ liệu (DBA).",
                          "advice": "Rèn luyện khả năng giao tiếp để hiểu nhu cầu kinh doanh và dịch sang ngôn ngữ kỹ thuật."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "📦 Thương mại điện tử và Kiểm toán dòng tiền doanh nghiệp",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích vận hành sàn thương mại điện tử hay kiểm toán sổ sách tài chính chuẩn xác?",
                      "desc": "Bước 6/6: Chốt Thương mại điện tử hay Kiểm toán.",
                      "optA": {
                        "text": "📦 Vận hành sàn TMĐT và điều phối chuỗi cung ứng thông minh",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & E - Thương mại Điện tử & Logistics Số",
                          "desc": "Quản lý dòng chảy hàng hóa thông minh toàn cầu dựa trên công nghệ dữ liệu định vị.",
                          "blocks": "A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), A00 (Toán, Lý, Hóa)",
                          "majors": "Thương mại Điện tử, Logistics & Quản lý Chuỗi Cung ứng.",
                          "jobs": "Chuyên viên vận hành sàn TMĐT, Quản lý chuỗi cung ứng quốc tế, Tối ưu hóa kho vận thông minh.",
                          "advice": "Trau dồi ngoại ngữ (Tiếng Anh, Tiếng Trung) và tư duy logic dòng tiền/hàng."
                        }
                      },
                      "optB": {
                        "text": "📊 Kiểm toán viên tại các tập đoàn kiểm toán tài chính hàng đầu",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "C - Kiểm toán & Phân tích Thuế",
                          "desc": "Bậc thầy về sự chuẩn xác, kiểm soát rủi ro tài chính cho các công ty lớn.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Kiểm toán, Kế toán Doanh nghiệp, Thuế.",
                          "jobs": "Kiểm toán viên tại các hãng kiểm toán Big 4, Kế toán trưởng, Thanh tra tài chính.",
                          "advice": "Tính cẩn thận, không được cẩu thả dù chỉ 1 dấu chấm, dấu phẩy trong bảng tính."
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "optB": {
            "text": "🧬 Cơ thể con người, Y học, Khám phá vi khuẩn & thuốc",
            "next": {
              "step": 4,
              "q": "Bạn học giỏi môn Hóa học và Sinh học nhất trong tất cả các môn tự nhiên?",
              "desc": "Bước 4/6: Đánh giá tố chất ngành Y Dược.",
              "optA": {
                "text": "🩺 Đúng vậy, tôi muốn làm Bác sĩ hoặc Dược sĩ chữa bệnh",
                "next": {
                  "step": 5,
                  "q": "Bạn muốn trực tiếp khám chữa bệnh hay nghiên cứu bào chế thuốc trong phòng lab?",
                  "desc": "Bước 5/6: Phân định Bác sĩ hay Dược sĩ.",
                  "optA": {
                    "text": "🏥 Khám chữa bệnh tại bệnh viện (Bác sĩ / Xét nghiệm)",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn trực tiếp cầm dao mổ phẫu thuật cứu người hay làm chuyên gia xét nghiệm mầm bệnh?",
                      "desc": "Bước 6/6: Chốt Bác sĩ hay Kỹ thuật xét nghiệm.",
                      "optA": {
                        "text": "🩺 Trực tiếp khám bệnh, phẫu thuật cứu sống bệnh nhân",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & S - Bác sĩ Y Khoa (Medicine)",
                          "desc": "Bạn có trái tim nhân hậu, ý chí sắt đá và trí tuệ mẫn tiệp để cứu người, mang lại sự sống.",
                          "blocks": "B00 (Toán, Hóa, Sinh), B08 (Toán, Sinh, Anh)",
                          "majors": "Bác sĩ Đa khoa, Bác sĩ Răng Hàm Mặt, Bác sĩ Ngoại khoa.",
                          "jobs": "Bác sĩ điều trị tại bệnh viện tuyến trung ương/tỉnh, Bác sĩ phẫu thuật, Chuyên gia y tế.",
                          "advice": "Điểm chuẩn y khoa luôn ở top cao nhất cả nước. Hãy kỷ luật ôn thi môn Toán, Hóa, Sinh từ ngay lúc này!"
                        }
                      },
                      "optB": {
                        "text": "🔬 Phân tích mẫu bệnh phẩm, gen và chụp X-quang/MRI trong lab",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Kỹ thuật Xét nghiệm Y học & Chẩn đoán hình ảnh",
                          "desc": "Những 'thám tử thầm lặng' trong y khoa: phát hiện mầm bệnh qua kính hiển vi và máy chụp cộng hưởng từ.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Kỹ thuật Xét nghiệm Y học, Kỹ thuật Hình ảnh Y học.",
                          "jobs": "Kỹ thuật viên xét nghiệm máu/gen, Chuyên viên phòng lab bệnh viện, Phân tích tế bào học.",
                          "advice": "Đòi hỏi tính cực kỳ chuẩn xác và không được có sai sót phòng thí nghiệm."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "💊 Nghiên cứu phát triển thuốc và tế bào gốc (Dược / Y sinh)",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn bào chế thuốc viên, dược phẩm chữa bệnh hay nghiên cứu gen và tế bào gốc tương lai?",
                      "desc": "Bước 6/6: Chốt Dược học hay Công nghệ sinh học Y sinh.",
                      "optA": {
                        "text": "💊 Bào chế thuốc tây y, kiểm nghiệm và phân phối dược phẩm",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Dược Sĩ (Pharmacy)",
                          "desc": "Bậc thầy về tương tác thuốc, bào chế dược phẩm và quản lý chất lượng dược phẩm cho sức khỏe con người.",
                          "blocks": "A00 (Toán, Lý, Hóa), B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Dược học, Hóa Dược, Công nghệ Dược phẩm.",
                          "jobs": "Dược sĩ nghiên cứu tại tập đoàn dược, Dược sĩ lâm sàng bệnh viện, Quản lý nhà thuốc.",
                          "advice": "Môn Hóa học là linh hồn của Dược học. Hãy cày nát các phương trình phản ứng hữu cơ!"
                        }
                      },
                      "optB": {
                        "text": "🧬 Nghiên cứu giải mã bộ gen, tế bào gốc và chế tạo vaccine",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I - Công nghệ Sinh học Y sinh (Biomedical)",
                          "desc": "Nghiên cứu tế bào gốc, công nghệ giải mã gen người và vaccine phòng bệnh hiện đại.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Kỹ thuật Y sinh, Công nghệ Sinh học Y học, Di truyền học.",
                          "jobs": "Nhà nghiên cứu vaccine, Kỹ sư thiết bị y sinh thông minh, Chuyên gia di truyền.",
                          "advice": "Đọc thêm nhiều tài liệu y sinh quốc tế để nâng cao kiến thức sinh học phân tử."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "❤️ Tôi thích chăm sóc phục hồi sức khỏe và tâm lý con người",
                "next": {
                  "step": 5,
                  "q": "Bạn quan tâm đến chăm sóc phục hồi thể chất hay trị liệu sức khỏe tinh thần?",
                  "desc": "Bước 5/6: Phân nhánh Thể chất hay Tinh thần.",
                  "optA": {
                    "text": "🩹 Chăm sóc điều dưỡng thể chất và tư vấn dinh dưỡng",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích chăm sóc hồi phục cho người bệnh hay tư vấn chế độ dinh dưỡng lành mạnh?",
                      "desc": "Bước 6/6: Chốt Điều dưỡng hay Dinh dưỡng.",
                      "optA": {
                        "text": "❤️ Điều dưỡng chăm sóc bệnh nhân và vật lý trị liệu",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S & I - Điều dưỡng & Phục hồi Chức năng",
                          "desc": "Ngành nghề giàu lòng nhân ái, có nhu cầu tuyển dụng khổng lồ tại Việt Nam và các nước như Đức, Nhật Bản.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Điều dưỡng, Kỹ thuật Phục hồi Chức năng, Vật lý Trị liệu.",
                          "jobs": "Điều dưỡng viên trưởng, Chuyên gia vật lý trị liệu, Chăm sóc y tế quốc tế.",
                          "advice": "Học chắc sinh học và trau dồi thêm ngoại ngữ (Tiếng Đức hoặc Tiếng Nhật) để có cơ hội học bổng lớn."
                        }
                      },
                      "optB": {
                        "text": "🥗 Chuyên gia tư vấn chế độ ăn uống và dinh dưỡng thể thao",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & S - Dinh dưỡng & Y tế Công cộng",
                          "desc": "Chăm sóc sức khỏe thông qua chế độ ăn uống khoa học và kiểm soát dịch bệnh cộng đồng.",
                          "blocks": "B00 (Toán, Hóa, Sinh), D07 (Toán, Hóa, Anh)",
                          "majors": "Dinh dưỡng học, Y tế Công cộng.",
                          "jobs": "Chuyên gia tư vấn dinh dưỡng thể thao/bệnh viện, Cán bộ phòng chống dịch tễ.",
                          "advice": "Học giỏi Hóa Sinh và rèn luyện kỹ năng truyền thông giáo dục sức khỏe."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🧘 Tham vấn trị liệu tâm lý và quản lý cơ sở y tế",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn tư vấn trị liệu tâm lý hay tham gia điều hành quản lý bệnh viện?",
                      "desc": "Bước 6/6: Chốt Tâm lý hay Quản lý y tế.",
                      "optA": {
                        "text": "🧠 Chuyên gia tham vấn và trị liệu tâm lý cho mọi người",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & S - Tâm lý học Lâm sàng (Clinical Psychology)",
                          "desc": "Trở thành người chữa lành tâm hồn, lắng nghe và giải tỏa những tổn thương tâm lý cho người khác.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh), B00 (Toán, Hóa, Sinh)",
                          "majors": "Tâm lý học, Tâm lý học Giáo dục, Trị liệu Tâm lý.",
                          "jobs": "Chuyên gia tham vấn tâm lý, Trị liệu tâm lý tại bệnh viện, Cố vấn tâm lý học đường.",
                          "advice": "Đọc nhiều sách tâm lý học, học cách lắng nghe không phán xét và bồi dưỡng vốn sống."
                        }
                      },
                      "optB": {
                        "text": "🏢 Quản lý vận hành bệnh viện và hệ thống bảo hiểm y tế",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Quản trị Bệnh viện & Y tế",
                          "desc": "Tổ chức vận hành bệnh viện khoa học, nâng cao chất lượng phục vụ cho bệnh nhân.",
                          "blocks": "A00 (Toán, Lý, Hóa), D01 (Toán, Văn, Anh)",
                          "majors": "Quản lý Bệnh viện, Kinh tế Y tế.",
                          "jobs": "Nhà quản lý bệnh viện, Chuyên viên bảo hiểm y tế, Giám sát chất lượng dịch vụ y tế.",
                          "advice": "Kết hợp giữa hiểu biết y tế và kỹ năng quản trị kinh doanh."
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "optB": {
    "text": "📚 Khoa học Xã hội, Ngôn ngữ, Nghệ thuật, Kinh tế",
    "next": {
      "step": 2,
      "q": "Trong thế giới Xã hội & Con người, thiên hướng bẩm sinh nào đúng với bạn hơn?",
      "desc": "Bước 2/6: Phân định Nghệ thuật (A) hay Lãnh đạo/Giúp đỡ (E, S).",
      "optA": {
        "text": "🎨 Sáng tạo tự do, Nghệ thuật, Thẩm mỹ, Ngôn từ & Cảm xúc (A)",
        "next": {
          "step": 3,
          "q": "Kênh biểu đạt sáng tạo nào khiến bạn cảm thấy tự tin và hào hứng nhất?",
          "desc": "Bước 3/6: Phân định Nghệ thuật Thị giác hay Ngôn từ Báo chí.",
          "optA": {
            "text": "🖌️ Hình ảnh, Màu sắc, Không gian, Bản vẽ, Thời trang, Video đồ họa",
            "next": {
              "step": 4,
              "q": "Bạn có năng khiếu vẽ tay, thích phối màu và phần mềm đồ họa máy tính?",
              "desc": "Bước 4/6: Đánh giá thế mạnh mỹ thuật thị giác.",
              "optA": {
                "text": "🎨 Đúng vậy, tôi thích vẽ tranh, đồ họa và kiến trúc",
                "next": {
                  "step": 5,
                  "q": "Bạn thích sáng tạo hình ảnh 2D/thời trang hay thiết kế không gian kiến trúc 3D?",
                  "desc": "Bước 5/6: Phân nhánh Đồ họa/Thời trang hay Kiến trúc/Nội thất.",
                  "optA": {
                    "text": "🖌️ Thiết kế đồ họa quảng cáo và trang phục thời trang",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích sáng tạo hình ảnh kỹ thuật số (poster, logo, web) hay thiết kế trang phục thời trang?",
                      "desc": "Bước 6/6: Chốt Đồ họa hay Thời trang.",
                      "optA": {
                        "text": "🎨 Thiết kế đồ họa, vẽ minh họa số và làm thương hiệu",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Thiết kế Đồ họa & Mỹ thuật Đa phương tiện (Graphic Design)",
                          "desc": "Bạn có trực giác thẩm mỹ đỉnh cao, nhạy cảm với cái đẹp và có khả năng biến ý tưởng thành visual bắt mắt.",
                          "blocks": "H (Văn, Vẽ), V (Toán, Lý, Vẽ), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Thiết kế Đồ họa, Mỹ thuật Đa phương tiện, Kỹ xảo Điện ảnh (VFX).",
                          "jobs": "Graphic Designer, Art Director (Giám đốc nghệ thuật), Họa sĩ minh họa số, UI/UX Designer.",
                          "advice": "Luyện thi vẽ mỹ thuật từ sớm, tự học các phần mềm Photoshop, Illustrator và xây dựng Portfolio cá nhân."
                        }
                      },
                      "optB": {
                        "text": "👗 Thiết kế trang phục thời trang và stylist phong cách",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Thiết kế Thời trang & Stylist",
                          "desc": "Bạn đam mê xu hướng ăn mặc, chất liệu vải và phong cách định hình cá tính con người.",
                          "blocks": "H (Văn, Vẽ), D01 (Toán, Văn, Anh)",
                          "majors": "Thiết kế Thời trang, Kinh doanh Thời trang.",
                          "jobs": "Nhà thiết kế thời trang, Fashion Stylist, Quản lý nhãn hàng may mặc cao cấp.",
                          "advice": "Theo dõi các tuần lễ thời trang quốc tế và trau dồi khiếu cắt may, phối đồ."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "📐 Thiết kế kiến trúc tòa nhà và không gian nội thất",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích vẽ nên những tòa nhà biểu tượng bên ngoài hay bài trí không gian nội thất ấm cúng bên trong?",
                      "desc": "Bước 6/6: Chốt Kiến trúc hay Nội thất.",
                      "optA": {
                        "text": "🏛️ Kiến trúc sư thiết kế công trình và tòa nhà biểu tượng",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A & R - Kiến trúc Sư (Architecture)",
                          "desc": "Sự kết hợp hoàn hảo giữa tâm hồn nghệ sĩ lãng mạn và sự chuẩn xác của toán học kết cấu công trình.",
                          "blocks": "V (Toán, Lý, Vẽ), V01 (Toán, Văn, Vẽ), H (Văn, Vẽ)",
                          "majors": "Kiến trúc Công trình, Quy hoạch Đô thị, Thiết kế Nội thất.",
                          "jobs": "Kiến trúc sư chủ trì, Thiết kế không gian nội thất, Quy hoạch cảnh quan thành phố.",
                          "advice": "Luyện vẽ tĩnh vật, tượng thạch cao ngay từ lớp 10, học thật chắc môn Toán và Vật lý."
                        }
                      },
                      "optB": {
                        "text": "🛋️ Thiết kế nội thất không gian sống sang trọng, ấm cúng",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Thiết kế Nội thất & Không gian Sống",
                          "desc": "Biến những căn phòng trống thành không gian ấm cúng, tinh tế và đầy tính nghệ thuật.",
                          "blocks": "H (Văn, Vẽ), V (Toán, Lý, Vẽ)",
                          "majors": "Thiết kế Nội thất, Trang trí không gian.",
                          "jobs": "Nhà thiết kế nội thất nhà ở/khách sạn, Chuyên viên thiết kế ánh sáng, Giám sát nội thất.",
                          "advice": "Rèn luyện khiếu thẩm mỹ về màu sắc và vật liệu gỗ, đá, kim loại."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "🎬 Tôi thích nghệ thuật phim ảnh, âm nhạc và biểu diễn",
                "next": {
                  "step": 5,
                  "q": "Bạn hứng thú với nghệ thuật phim ảnh/nhiếp ảnh hay âm nhạc/sân khấu biểu diễn?",
                  "desc": "Bước 5/6: Phân nhánh Điện ảnh/Ảnh hay Âm nhạc/Sân khấu.",
                  "optA": {
                    "text": "🎥 Đạo diễn phim ảnh và nghệ thuật nhiếp ảnh",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích đạo diễn cả bộ phim chuyển động hay bắt trọn khoảnh khắc qua một bức ảnh tĩnh?",
                      "desc": "Bước 6/6: Chốt Đạo diễn hay Nhiếp ảnh.",
                      "optA": {
                        "text": "🎬 Đạo diễn phim ảnh, MV ca nhạc và video quảng cáo",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Đạo diễn Điện ảnh & Truyền hình",
                          "desc": "Thổi hồn vào từng khung hình, tạo ra những thước phim lay động hàng triệu trái tim khán giả.",
                          "blocks": "S (Năng khiếu Sân khấu Điện ảnh), D01 (Toán, Văn, Anh)",
                          "majors": "Đạo diễn Điện ảnh, Quay phim, Biên kịch Phim.",
                          "jobs": "Đạo diễn phim, Đạo diễn TVC quảng cáo/MV ca nhạc, Nhà sản xuất phim ảnh.",
                          "advice": "Xem nhiều phim kinh điển thế giới và tập quay video ngắn bằng điện thoại."
                        }
                      },
                      "optB": {
                        "text": "📷 Nhiếp ảnh gia chuyên nghiệp ghi lại khoảnh khắc đắt giá",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Nhiếp ảnh Nghệ thuật & Chụp ảnh Quảng cáo",
                          "desc": "Ghi lại những khoảnh khắc đắt giá qua lăng kính máy ảnh chuyên nghiệp.",
                          "blocks": "D01 (Toán, Văn, Anh), C00 (Văn, Sử, Địa)",
                          "majors": "Nhiếp ảnh Báo chí, Nhiếp ảnh Nghệ thuật.",
                          "jobs": "Nhiếp ảnh gia chuyên nghiệp (Photographer), Giám đốc hình ảnh studio, Chụp ảnh sự kiện lớn.",
                          "advice": "Học cách làm chủ ánh sáng và bố cục khuôn hình."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🎤 Sản xuất âm nhạc và diễn xuất sân khấu",
                    "next": {
                      "step": 6,
                      "q": "Bạn có thiên hướng sáng tác/sản xuất âm nhạc hay trực tiếp diễn xuất tỏa sáng trước ống kính?",
                      "desc": "Bước 6/6: Chốt Âm nhạc hay Diễn xuất.",
                      "optA": {
                        "text": "🎵 Sản xuất âm nhạc, hòa âm phối khí và sáng tác bài hát",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Sản xuất Âm nhạc & Nhạc sĩ (Music Producer)",
                          "desc": "Phù thủy âm thanh: tạo nên những bản hit đứng đầu bảng xếp hạng bằng công nghệ thu âm hiện đại.",
                          "blocks": "N (Thẩm âm, Tiết tấu), D01 (Toán, Văn, Anh)",
                          "majors": "Sản xuất Âm nhạc, Sáng tác, Kỹ thuật Âm thanh.",
                          "jobs": "Music Producer, Nhạc sĩ, Kỹ sư hòa âm phối khí, Giám đốc âm nhạc chương trình.",
                          "advice": "Trau dồi nhạc lý căn bản và làm quen với phần mềm phối khí như FL Studio, Ableton."
                        }
                      },
                      "optB": {
                        "text": "🎭 Diễn viên điện ảnh, kịch nghệ và MC truyền hình",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Nghệ thuật Biểu diễn & Diễn viên",
                          "desc": "Tự tin tỏa sáng trên sân khấu, nhập vai vào số phận của các nhân vật đa dạng.",
                          "blocks": "Năng khiếu Sân khấu, Văn học",
                          "majors": "Diễn viên Kịch - Điện ảnh, Nghệ thuật Trình diễn.",
                          "jobs": "Diễn viên, Nghệ sĩ kịch nghệ, MC dẫn chương trình truyền hình.",
                          "advice": "Luyện phát âm chuẩn, khả năng biểu cảm khuôn mặt và vượt qua nỗi sợ đám đông."
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "optB": {
            "text": "✍️ Con chữ, Ngôn từ, Báo chí, Kịch bản, Sáng tạo câu chuyện truyền cảm hứng",
            "next": {
              "step": 4,
              "q": "Bạn học rất giỏi môn Ngữ văn và có khả năng viết lách lưu loát, truyền cảm?",
              "desc": "Bước 4/6: Đánh giá tư duy ngôn ngữ.",
              "optA": {
                "text": "✍️ Đúng vậy, tôi thích viết bài báo chí và truyền thông sáng tạo",
                "next": {
                  "step": 5,
                  "q": "Bạn thích phản ánh tin tức sự thật (Báo chí) hay làm truyền thông thương mại (PR / Ngoại ngữ)?",
                  "desc": "Bước 5/6: Phân nhánh Báo chí hay PR/Ngoại ngữ.",
                  "optA": {
                    "text": "📰 Báo chí, phóng viên và biên tập văn học",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn làm phóng viên điều tra thời sự hay biên tập các tác phẩm văn học sách báo?",
                      "desc": "Bước 6/6: Chốt Báo chí hay Biên tập viên sách.",
                      "optA": {
                        "text": "📰 Nhà báo, phóng viên điều tra tin tức thời sự nóng hổi",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A & S - Báo chí & Truyền thông Đa phương tiện",
                          "desc": "Ngòi bút sắc bén phản ánh hơi thở cuộc sống, lên tiếng vì sự thật và định hướng dư luận xã hội.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh), D14 (Văn, Sử, Anh)",
                          "majors": "Báo chí, Truyền thông Đa phương tiện, Xuất bản.",
                          "jobs": "Nhà báo, Phóng viên điều tra, Biên tập viên đài truyền hình, Thư ký tòa soạn.",
                          "advice": "Đọc báo hàng ngày, rèn luyện tư duy phản biện và khả năng viết bài nhanh dưới áp lực thời gian."
                        }
                      },
                      "optB": {
                        "text": "📚 Biên tập viên sách tại nhà xuất bản và sáng tác văn học",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Biên tập Sách & Sáng tác Văn học",
                          "desc": "Thế giới của những trang sách sâu lắng, nuôi dưỡng tâm hồn và gìn giữ văn hóa đọc.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Văn học, Ngôn ngữ học, Hán Nôm, Xuất bản.",
                          "jobs": "Biên tập viên nhà xuất bản, Nhà văn, Tác giả sách, Chuyên gia hiệu đính ngôn ngữ.",
                          "advice": "Nuôi dưỡng vốn từ vựng phong phú và sự kiên nhẫn khi đọc các tác phẩm văn học lớn."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "📢 Quan hệ công chúng (PR) và biên phiên dịch quốc tế",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn làm chuyên gia PR truyền thông thương hiệu hay phiên dịch viên quốc tế cao cấp?",
                      "desc": "Bước 6/6: Chốt PR hay Biên phiên dịch.",
                      "optA": {
                        "text": "📣 Sáng tạo nội dung truyền thông (PR / Content Creator)",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A & E - Quan hệ Công chúng (PR) & Sáng tạo Nội dung",
                          "desc": "Bậc thầy kể chuyện cho thương hiệu: biến sản phẩm bình thường thành hiện tượng truyền thông được yêu thích.",
                          "blocks": "D01 (Toán, Văn, Anh), C00 (Văn, Sử, Địa), A01 (Toán, Lý, Anh)",
                          "majors": "Quan hệ Công chúng (PR), Truyền thông Quốc tế, Quản trị Truyền thông.",
                          "jobs": "Chuyên viên PR, Copywriter, Giám đốc truyền thông doanh nghiệp, Content Creator triệu view.",
                          "advice": "Nắm bắt nhanh các trend mạng xã hội và rèn luyện kỹ năng viết thông cáo báo chí chuyên nghiệp."
                        }
                      },
                      "optB": {
                        "text": "🌐 Biên dịch - Phiên dịch viên đa ngôn ngữ quốc tế",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A - Dịch thuật & Biên - Phiên dịch Quốc tế",
                          "desc": "Cầu nối văn hóa giữa các quốc gia, chuyển tải chính xác tư tưởng qua rào cản ngôn ngữ.",
                          "blocks": "D01 (Toán, Văn, Anh), D04 (Toán, Văn, Trung), D06 (Toán, Văn, Nhật)",
                          "majors": "Biên - Phiên dịch, Ngôn ngữ Anh/Trung/Hàn/Nhật.",
                          "jobs": "Phiên dịch viên cabin cao cấp, Biên dịch viên sách/phim, Cán bộ ngoại giao văn hóa.",
                          "advice": "Học ngoại ngữ như tiếng mẹ đẻ và nắm chắc văn hóa bản địa của quốc gia đó."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "📚 Tôi thích nghiên cứu văn hóa lịch sử và giảng dạy sư phạm",
                "next": {
                  "step": 5,
                  "q": "Bạn có hứng thú nghiên cứu lịch sử văn hóa hay thích con đường giảng dạy sư phạm?",
                  "desc": "Bước 5/6: Phân định Nghiên cứu văn hóa hay Sư phạm.",
                  "optA": {
                    "text": "📜 Nghiên cứu lịch sử, khảo cổ và văn hóa dân tộc",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích khám phá hiện vật khảo cổ học hay nghiên cứu phong tục tập quán văn hóa?",
                      "desc": "Bước 6/6: Chốt Khảo cổ hay Văn hóa học.",
                      "optA": {
                        "text": "🏺 Khảo cổ học, lịch sử và bảo tồn di tích cổ",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "I & A - Lịch sử học & Khảo cổ học",
                          "desc": "Giải mã các bí ẩn của quá khứ, bảo tồn di sản văn hóa quý báu của dân tộc.",
                          "blocks": "C00 (Văn, Sử, Địa), D14 (Văn, Sử, Anh)",
                          "majors": "Lịch sử học, Khảo cổ học, Bảo tàng học, Di sản văn hóa.",
                          "jobs": "Nhà nghiên cứu lịch sử, Cán bộ bảo tàng, Chuyên gia giám định cổ vật, Tư vấn phim dã sử.",
                          "advice": "Môn Lịch sử là gốc rễ, rèn luyện sự cẩn trọng và niềm tự hào dân tộc."
                        }
                      },
                      "optB": {
                        "text": "🏮 Văn hóa học, lễ hội truyền thống và giao lưu quốc tế",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "A & S - Việt Nam học & Văn hóa học",
                          "desc": "Giới thiệu vẻ đẹp đất nước, con người và phong tục tập quán Việt Nam ra thế giới.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Việt Nam học, Văn hóa học, Nhân học.",
                          "jobs": "Cố vấn văn hóa, Nghiên cứu phong tục tập quán, Chuyên viên giao lưu quốc tế.",
                          "advice": "Đi nhiều nơi, tiếp xúc nhiều cộng đồng để hiểu sâu sắc văn hóa bản địa."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🎓 Sư phạm giảng dạy các môn khoa học xã hội",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn đứng trên bục giảng dạy Văn/Sử hay nghiên cứu lý luận chính trị xã hội?",
                      "desc": "Bước 6/6: Chốt Sư phạm hay Lý luận.",
                      "optA": {
                        "text": "👩‍🏫 Giáo viên dạy Văn, Lịch sử, Địa lý truyền cảm hứng",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Sư phạm Ngữ văn / Lịch sử / Địa lý",
                          "desc": "Người truyền lửa tri thức nhân văn, khơi dậy tình yêu quê hương đất nước cho học trò.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Sư phạm Ngữ văn, Sư phạm Lịch sử, Sư phạm Lịch sử - Địa lý.",
                          "jobs": "Giáo viên THPT, Giảng viên đại học, Chuyên viên nghiên cứu giáo dục tại Sở/Bộ GD&ĐT.",
                          "advice": "Rèn luyện giọng nói truyền cảm, chuẩn mực và khả năng sư phạm truyền cảm hứng."
                        }
                      },
                      "optB": {
                        "text": "🏛️ Giảng viên triết học và chuyên viên lý luận chính sách",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Triết học & Lý luận Chính trị",
                          "desc": "Tư duy biện chứng sâu sắc về sự phát triển của tư tưởng và xã hội loài người.",
                          "blocks": "C00 (Văn, Sử, Địa)",
                          "majors": "Triết học, Xây dựng Đảng & Chính quyền nhà nước, Lý luận chính trị.",
                          "jobs": "Giảng viên lý luận, Chuyên viên ban tuyên giáo, Nghiên cứu chính sách công.",
                          "advice": "Rèn luyện khả năng đọc sách hàn lâm và tư duy phân tích chính trị xã hội sắc bén."
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "optB": {
        "text": "💼 Lãnh đạo, Giao tiếp thuyết phục, Kinh doanh, Giúp đỡ cộng đồng (E, S)",
        "next": {
          "step": 3,
          "q": "Mục tiêu cuộc đời nào tạo động lực lớn nhất cho bạn?",
          "desc": "Bước 3/6: Phân định Nhóm Kinh doanh lãnh đạo hay Phụng sự xã hội.",
          "optA": {
            "text": "🏆 Khởi nghiệp, Làm giàu, Thăng tiến quản lý, Kinh doanh buôn bán (E)",
            "next": {
              "step": 4,
              "q": "Bạn tự tin nhất ở khả năng ăn nói, thuyết phục người khác hay khả năng tính toán chiến lược số liệu?",
              "desc": "Bước 4/6: Đánh giá tố chất Doanh nhân.",
              "optA": {
                "text": "🗣️ Khả năng ăn nói khéo léo, đàm phán và thuyết phục lòng người",
                "next": {
                  "step": 5,
                  "q": "Bạn thích chuyên sâu về Marketing bán hàng hay quản trị điều hành tổng thể doanh nghiệp/khách sạn?",
                  "desc": "Bước 5/6: Phân nhánh Marketing/Sales hay CEO/Khách sạn.",
                  "optA": {
                    "text": "📢 Marketing quảng bá và phát triển thị trường bán hàng",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích lên chiến lược quảng cáo thương hiệu hay trực tiếp đàm phán chốt hợp đồng lớn?",
                      "desc": "Bước 6/6: Chốt Marketing hay Sales.",
                      "optA": {
                        "text": "💡 Sáng tạo chiến dịch Marketing và quảng bá thương hiệu",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Chuyên gia Marketing & Truyền thông Thương hiệu",
                          "desc": "Bộ não chiến lược đằng sau sự thành công của sản phẩm: thu hút khách hàng và thống lĩnh thị trường.",
                          "blocks": "A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), A00 (Toán, Lý, Hóa)",
                          "majors": "Marketing, Quản trị Thương hiệu, Digital Marketing.",
                          "jobs": "Giám đốc Marketing (CMO), Trưởng phòng truyền thông, Chuyên gia chạy quảng cáo số, Brand Manager.",
                          "advice": "Học giỏi tiếng Anh và rèn luyện kỹ năng quan sát hành vi mua sắm của người tiêu dùng."
                        }
                      },
                      "optB": {
                        "text": "🤝 Đàm phán kinh doanh, chốt hợp đồng lớn với đối tác",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Quản trị Bán hàng & Phát triển Thị trường (Sales Director)",
                          "desc": "Chiến binh tiên phong của doanh nghiệp: mang doanh thu khổng lồ về cho công ty nhờ khả năng chốt sale bậc thầy.",
                          "blocks": "D01 (Toán, Văn, Anh), A01 (Toán, Lý, Anh)",
                          "majors": "Quản trị Kinh doanh, Thương mại Quốc tế.",
                          "jobs": "Giám đốc kinh doanh, Trưởng phòng phát triển đại lý, Chuyên viên đàm phán hợp đồng lớn.",
                          "advice": "Rèn luyện khả năng chịu áp lực doanh số và thái độ kiên trì, không bỏ cuộc khi bị từ chối."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "👔 Quản trị kinh doanh khởi nghiệp và khách sạn nghỉ dưỡng",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn lập công ty riêng làm chủ doanh nghiệp hay quản lý khách sạn resort 5 sao đẳng cấp?",
                      "desc": "Bước 6/6: Chốt CEO Khởi nghiệp hay Quản trị Khách sạn.",
                      "optA": {
                        "text": "🚀 Khởi nghiệp mở công ty riêng và điều hành doanh nghiệp",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Quản trị Kinh doanh & Khởi nghiệp (CEO/Founder)",
                          "desc": "Người thuyền trưởng chèo lái con thuyền doanh nghiệp: có tầm nhìn xa trông rộng, dám chấp nhận rủi ro để thành công.",
                          "blocks": "A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), A00 (Toán, Lý, Hóa)",
                          "majors": "Quản trị Kinh doanh, Khởi nghiệp & Đổi mới sáng tạo.",
                          "jobs": "CEO / Tổng giám đốc, Nhà sáng lập doanh nghiệp (Founder), Giám đốc điều hành (COO).",
                          "advice": "Tham gia các hoạt động ngoại khóa, câu lạc bộ kinh doanh của trường để trau dồi bản lĩnh lãnh đạo."
                        }
                      },
                      "optB": {
                        "text": "🏨 Tổng quản lý khách sạn 5 sao, resort nghỉ dưỡng quốc tế",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Quản trị Khách sạn & Nghỉ dưỡng Quốc tế",
                          "desc": "Quản lý các resort 5 sao sang trọng, mang lại dịch vụ đẳng cấp quốc tế cho du khách thượng lưu.",
                          "blocks": "D01 (Toán, Văn, Anh), A01 (Toán, Lý, Anh)",
                          "majors": "Quản trị Khách sạn, Quản trị Dịch vụ Du lịch & Lữ hành.",
                          "jobs": "Giám đốc khách sạn 5 sao, Quản lý khu nghỉ dưỡng cao cấp, Giám đốc sự kiện quốc tế.",
                          "advice": "Trau dồi ngoại ngữ lưu loát, thái độ lịch thiệp và kỹ năng chăm sóc khách hàng tinh tế."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "📈 Khả năng phân tích luật lệ, số liệu và chiến lược dòng tiền",
                "next": {
                  "step": 5,
                  "q": "Bạn thích lĩnh vực Pháp lý/Nhân sự hay Tài chính đầu tư tiền tệ?",
                  "desc": "Bước 5/6: Phân định Luật/HR hay Tài chính/Địa ốc.",
                  "optA": {
                    "text": "⚖️ Luật sư kinh tế và Quản trị nhân sự doanh nghiệp",
                    "next": {
                      "step": 6,
                      "q": "Bạn thích bảo vệ pháp lý cho công ty (Luật sư) hay chiêu mộ và dùng người (Quản trị nhân sự)?",
                      "desc": "Bước 6/6: Chốt Luật kinh tế hay Nhân sự.",
                      "optA": {
                        "text": "⚖️ Luật sư doanh nghiệp tư vấn hợp đồng và bảo vệ pháp lý",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E & S - Luật sư Doanh nghiệp & Luật Kinh tế",
                          "desc": "Lá chắn pháp lý bảo vệ các tập đoàn trong các thương vụ triệu đô và tranh chấp thương mại quốc tế.",
                          "blocks": "A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh), C00 (Văn, Sử, Địa)",
                          "majors": "Luật Kinh tế, Luật Thương mại Quốc tế, Luật Dân sự.",
                          "jobs": "Luật sư tranh tụng, Cố vấn pháp lý doanh nghiệp, Công chứng viên, Trọng tài viên thương mại.",
                          "advice": "Học xuất sắc môn Văn và Tiếng Anh, rèn luyện tư duy logic phản biện sắc sảo từng câu chữ."
                        }
                      },
                      "optB": {
                        "text": "👥 Giám đốc nhân sự chiêu mộ nhân tài và phát triển con người",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Quản trị Nhân sự & Thu hút Nhân tài (HR Director)",
                          "desc": "Nghệ thuật thấu hiểu và dùng người: chiêu mộ những bộ óc xuất chúng nhất về cho doanh nghiệp.",
                          "blocks": "D01 (Toán, Văn, Anh), A01 (Toán, Lý, Anh)",
                          "majors": "Quản trị Nhân lực, Tâm lý học Tổ chức.",
                          "jobs": "Giám đốc nhân sự (CHRO), Chuyên gia săn đầu người (Headhunter), Trưởng ban tuyển dụng.",
                          "advice": "Rèn luyện khả năng nhìn người, thấu cảm và kỹ năng hòa giải mâu thuẫn khéo léo."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "💰 Đầu tư tài chính ngân hàng và kinh doanh bất động sản",
                    "next": {
                      "step": 6,
                      "q": "Bạn đam mê đầu tư vào thị trường chứng khoán ngân hàng hay giao dịch bất động sản nhà đất?",
                      "desc": "Bước 6/6: Chốt Tài chính đầu tư hay Bất động sản.",
                      "optA": {
                        "text": "📊 Chuyên gia đầu tư tài chính chứng khoán và quản lý quỹ",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E & C - Tài chính - Ngân hàng & Quản lý Quỹ Đầu tư",
                          "desc": "Làm chủ dòng tiền của nền kinh tế: ra quyết định đầu tư vào các công ty tiềm năng và quản lý danh mục tài sản lớn.",
                          "blocks": "A00 (Toán, Lý, Hóa), A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Tài chính - Ngân hàng, Đầu tư Tài chính, Chứng khoán.",
                          "jobs": "Nhà quản lý quỹ đầu tư, Chuyên viên phân tích cổ phiếu, Giám đốc chi nhánh ngân hàng.",
                          "advice": "Học giỏi Toán và theo dõi bảng điện tử chứng khoán để nhạy cảm với tin tức kinh tế."
                        }
                      },
                      "optB": {
                        "text": "🏘️ Kinh doanh dự án bất động sản và thẩm định giá tài sản",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "E - Kinh doanh Bất động sản & Thẩm định Giá",
                          "desc": "Giao dịch các tài sản đất đai, nhà ở và dự án bất động sản giá trị cao.",
                          "blocks": "A01 (Toán, Lý, Anh), D01 (Toán, Văn, Anh)",
                          "majors": "Kinh doanh Bất động sản, Thẩm định giá.",
                          "jobs": "Chuyên gia môi giới bất động sản cao cấp, Giám đốc dự án địa ốc, Thẩm định viên giá tài sản.",
                          "advice": "Rèn luyện khả năng giao tiếp ngoại giao và tìm hiểu kỹ quy hoạch đô thị."
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "optB": {
            "text": "🤝 Giúp đỡ người yếu thế, Giảng dạy, Công lý xã hội, Ngoại giao (S)",
            "next": {
              "step": 4,
              "q": "Bạn có mong muốn làm việc trong các cơ quan nhà nước/ngoại giao hay tổ chức giáo dục/cộng đồng?",
              "desc": "Bước 4/6: Định hướng Môi trường công lập hay Xã hội.",
              "optA": {
                "text": "🏛️ Làm việc trong cơ quan nhà nước, ngoại giao và tòa án",
                "next": {
                  "step": 5,
                  "q": "Bạn muốn phục vụ đất nước trong lĩnh vực Ngoại giao/Chính sách hay An ninh/Tòa án?",
                  "desc": "Bước 5/6: Phân nhánh Ngoại giao hay Lực lượng vũ trang.",
                  "optA": {
                    "text": "🌐 Công tác ngoại giao quốc tế và quản lý chính sách công",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn đại diện đất nước làm việc tại các đại sứ quán quốc tế hay làm cán bộ hoạch định chính sách nhà nước?",
                      "desc": "Bước 6/6: Chốt Ngoại giao hay Quản lý nhà nước.",
                      "optA": {
                        "text": "🌐 Nhà ngoại giao làm việc tại các đại sứ quán nước ngoài",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S & E - Ngoại giao & Quan hệ Quốc tế",
                          "desc": "Cầu nối gìn giữ hòa bình, bảo vệ lợi ích quốc gia và xây dựng quan hệ hữu nghị giữa các dân tộc.",
                          "blocks": "D01 (Toán, Văn, Anh), D14 (Văn, Sử, Anh), A01 (Toán, Lý, Anh)",
                          "majors": "Quan hệ Quốc tế, Luật Quốc tế, Kinh tế Đối ngoại.",
                          "jobs": "Nhà ngoại giao, Cán bộ ngoại vụ tại Bộ Ngoại giao, Đại sứ, Chuyên viên tại Liên Hợp Quốc.",
                          "advice": "Học thông thạo ít nhất 2 ngoại ngữ (Anh, Pháp, Trung...), am hiểu lịch sử thế giới và lễ tân ngoại giao."
                        }
                      },
                      "optB": {
                        "text": "🏛️ Cán bộ quản lý nhà nước tại các sở ban ngành cơ quan công",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Cán bộ Quản lý Nhà nước & Chính sách Công",
                          "desc": "Xây dựng các chính sách an sinh xã hội, phát triển kinh tế vì đời sống ấm no của nhân dân.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Quản lý Nhà nước, Chính sách Công, Xã hội học.",
                          "jobs": "Công chức tại các cơ quan UBND, Sở, Bộ ngành; Chuyên viên nghiên cứu chiến lược công.",
                          "advice": "Học tập tác phong nghiêm túc, tinh thần trách nhiệm phụng sự tổ quốc."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🛡️ Lực lượng công an nhân dân và thẩm phán tư pháp",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn trở thành Sĩ quan lực lượng vũ trang bảo vệ trật tự hay Thẩm phán cầm cân nảy mực tại tòa án?",
                      "desc": "Bước 6/6: Chốt Công an hay Thẩm phán.",
                      "optA": {
                        "text": "👮 Sĩ quan công an, cảnh sát bảo vệ bình yên cho nhân dân",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S & R - Sĩ quan Công an & Quân đội Nhân dân",
                          "desc": "Thanh bảo kiếm bảo vệ an ninh trật tự, kỷ luật thép và sự trung thành tuyệt đối với tổ quốc.",
                          "blocks": "A00 (Toán, Lý, Hóa), C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "An ninh Điều tra, Cảnh sát Hình sự, Sĩ quan Chỉ huy Tham mưu.",
                          "jobs": "Chiến sĩ công an, Cảnh sát điều tra tội phạm, Sĩ quan quân đội nhân dân.",
                          "advice": "Rèn luyện thể lực đạt chuẩn, giữ gìn lý lịch trong sạch và ôn luyện điểm số thật cao."
                        }
                      },
                      "optB": {
                        "text": "⚖️ Thẩm phán tòa án đem lại công lý và lẽ phải",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Luật sư Công lý & Thẩm phán Tòa án",
                          "desc": "Người cầm cân nảy mực đem lại sự công bằng, bảo vệ lẽ phải cho những người bị oan sai.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Luật học, Luật Hình sự, Tư pháp.",
                          "jobs": "Thẩm phán tòa án, Kiểm sát viên tại Viện Kiểm sát, Luật sư nhân quyền.",
                          "advice": "Sự trung thực, lòng quả cảm và cái tâm trong sáng là phẩm chất quan trọng nhất."
                        }
                      }
                    }
                  }
                }
              },
              "optB": {
                "text": "🏫 Cống hiến trong ngành giáo dục trường học và thiện nguyện",
                "next": {
                  "step": 5,
                  "q": "Bạn thích con đường Bục giảng Sư phạm hay Công tác xã hội vì cộng đồng?",
                  "desc": "Bước 5/6: Phân nhánh Sư phạm hay Dự án cộng đồng.",
                  "optA": {
                    "text": "👩‍🏫 Nghề giáo đứng trên bục giảng truyền trao tri thức",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn dạy học sinh phổ thông hay làm chuyên gia can thiệp giáo dục đặc biệt cho trẻ em yếu thế?",
                      "desc": "Bước 6/6: Chốt Sư phạm phổ thông hay Giáo dục đặc biệt.",
                      "optA": {
                        "text": "📖 Đứng trên bục giảng dạy dỗ thế hệ học trò trưởng thành",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Giáo viên Sư phạm (Teacher / Educator)",
                          "desc": "Nghề cao quý nhất trong các nghề cao quý: thắp sáng ước mơ và ươm mầm tương lai cho đất nước.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh), A00 (Toán, Lý, Hóa)",
                          "majors": "Sư phạm Toán/Văn/Anh, Sư phạm Tiểu học, Sư phạm Mầm non.",
                          "jobs": "Giáo viên trường chuyên/công lập/quốc tế, Giảng viên đại học, Hiệu trưởng.",
                          "advice": "Rèn luyện chữ viết đẹp, tác phong mô phạm chuẩn mực và tình yêu thương con trẻ."
                        }
                      },
                      "optB": {
                        "text": "🤲 Hỗ trợ can thiệp giáo dục cho trẻ em khuyết tật, tự kỷ",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Giáo dục Đặc biệt (Special Education)",
                          "desc": "Người hùng thầm lặng giúp đỡ các em nhỏ khuyết tật, tự kỷ hòa nhập với cuộc sống.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Giáo dục Đặc biệt, Giáo dục Hòa nhập.",
                          "jobs": "Chuyên gia can thiệp trẻ tự kỷ, Giáo viên dạy chữ nổi cho người khiếm thị, Trị liệu ngôn ngữ.",
                          "advice": "Đòi hỏi trái tim vô cùng bao dung và đức tính kiên trì không quản ngại khó khăn."
                        }
                      }
                    }
                  },
                  "optB": {
                    "text": "🤝 Công tác xã hội nhân đạo và đào tạo phát triển năng lực",
                    "next": {
                      "step": 6,
                      "q": "Bạn muốn cống hiến cho các dự án phi chính phủ cứu trợ cộng đồng hay chuyên gia đào tạo nhân sự cho công ty?",
                      "desc": "Bước 6/6: Chốt NGO hay Đào tạo doanh nghiệp.",
                      "optA": {
                        "text": "🤝 Điều phối viên dự án phi chính phủ (NGO) xóa đói giảm nghèo",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Công tác Xã hội & Dự án Phi chính phủ (NGO)",
                          "desc": "Mang tình thương đến những vùng khó khăn: bảo vệ phụ nữ, trẻ em và người cơ nhỡ trong xã hội.",
                          "blocks": "C00 (Văn, Sử, Địa), D01 (Toán, Văn, Anh)",
                          "majors": "Công tác Xã hội, Phát triển Cộng đồng, Xã hội học.",
                          "jobs": "Điều phối viên dự án phi chính phủ (UNICEF, Oxfam), Chuyên viên bảo trợ xã hội, Quản lý trung tâm nhân đạo.",
                          "advice": "Học thật tốt Tiếng Anh để viết đề án xin tài trợ quốc tế và có kỹ năng kết nối cộng đồng."
                        }
                      },
                      "optB": {
                        "text": "📚 Chuyên gia phát triển năng lực và đào tạo nhân sự công ty",
                        "next": {
                          "isLeaf": true,
                          "hollandCode": "S - Quản lý Giáo dục & Đào tạo Doanh nghiệp",
                          "desc": "Thiết kế các chương trình học tập thông minh và phát triển năng lực cho cán bộ nhân viên.",
                          "blocks": "D01 (Toán, Văn, Anh), A01 (Toán, Lý, Anh)",
                          "majors": "Quản lý Giáo dục, Đào tạo & Phát triển (L&D).",
                          "jobs": "Chuyên viên đào tạo doanh nghiệp, Trưởng ban khảo thí, Quản lý trường học quốc tế.",
                          "advice": "Học cách thiết kế bài giảng tương tác và làm chủ các công nghệ giáo dục (EdTech)."
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};


// ==============================================================================
// BỘ LỌC TỔ HỢP MÔN HỌC GDPT 2018 & GỢI Ý MỞ RỘNG NHIỀU NGÀNH NGHỀ
// ==============================================================================

window.userSubjects = JSON.parse(localStorage.getItem('school_user_subjects')) || ['Toán', 'Văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học'];

function initSubjectSelection() {
    const saved = JSON.parse(localStorage.getItem('school_user_subjects'));
    if (saved && Array.isArray(saved)) {
        const checkInputs = document.querySelectorAll('input[name="elective-subject"]');
        checkInputs.forEach(i => {
            i.checked = saved.includes(i.value);
        });
        const langRadios = document.querySelectorAll('input[name="foreign-language"]');
        langRadios.forEach(r => {
            if (saved.includes(r.value)) r.checked = true;
        });
    } else {
        setSubjectPreset('khtn');
    }
}

function setSubjectPreset(preset) {
    const checkInputs = document.querySelectorAll('input[name="elective-subject"]');
    checkInputs.forEach(i => i.checked = false);
    
    if (preset === 'khtn') {
        ['Vật lí', 'Hóa học', 'Sinh học', 'Tin học'].forEach(sub => {
            const el = document.querySelector(`input[name="elective-subject"][value="${sub}"]`);
            if(el) el.checked = true;
        });
    } else if (preset === 'khxh') {
        ['Lịch sử', 'Địa lí', 'GDKT&PL', 'Tin học'].forEach(sub => {
            const el = document.querySelector(`input[name="elective-subject"][value="${sub}"]`);
            if(el) el.checked = true;
        });
    } else if (preset === 'tech') {
        ['Vật lí', 'Tin học', 'Công nghệ'].forEach(sub => {
            const el = document.querySelector(`input[name="elective-subject"][value="${sub}"]`);
            if(el) el.checked = true;
        });
    }
}

function getSelectedSubjects() {
    let subs = ['Toán', 'Văn'];
    const checkInputs = document.querySelectorAll('input[name="elective-subject"]:checked');
    checkInputs.forEach(i => subs.push(i.value));
    
    const langInput = document.querySelector('input[name="foreign-language"]:checked');
    if (langInput) subs.push(langInput.value);
    else subs.push('Tiếng Anh');
    
    return subs;
}

const ALL_VIETNAM_BLOCKS = [
    { code: "A00", name: "A00 (Toán, Vật lí, Hóa học)", subs: ["Toán", "Vật lí", "Hóa học"] },
    { code: "A01", name: "A01 (Toán, Vật lí, Tiếng Anh)", subs: ["Toán", "Vật lí", "Tiếng Anh"] },
    { code: "B00", name: "B00 (Toán, Hóa học, Sinh học)", subs: ["Toán", "Hóa học", "Sinh học"] },
    { code: "C00", name: "C00 (Ngữ văn, Lịch sử, Địa lí)", subs: ["Văn", "Lịch sử", "Địa lí"] },
    { code: "D01", name: "D01 (Toán, Ngữ văn, Tiếng Anh)", subs: ["Toán", "Văn", "Tiếng Anh"] },
    { code: "D07", name: "D07 (Toán, Hóa học, Tiếng Anh)", subs: ["Toán", "Hóa học", "Tiếng Anh"] },
    { code: "D14", name: "D14 (Ngữ văn, Lịch sử, Tiếng Anh)", subs: ["Văn", "Lịch sử", "Tiếng Anh"] },
    { code: "D15", name: "D15 (Ngữ văn, Địa lí, Tiếng Anh)", subs: ["Văn", "Địa lí", "Tiếng Anh"] },
    { code: "C19", name: "C19 (Ngữ văn, Lịch sử, GDKT&PL)", subs: ["Văn", "Lịch sử", "GDKT&PL"] },
    { code: "C14", name: "C14 (Toán, Ngữ văn, GDKT&PL)", subs: ["Toán", "Văn", "GDKT&PL"] },
    { code: "C01", name: "C01 (Ngữ văn, Toán, Vật lí)", subs: ["Văn", "Toán", "Vật lí"] },
    { code: "C02", name: "C02 (Ngữ văn, Toán, Hóa học)", subs: ["Văn", "Toán", "Hóa học"] },
    { code: "C03", name: "C03 (Ngữ văn, Toán, Lịch sử)", subs: ["Văn", "Toán", "Lịch sử"] },
    { code: "C04", name: "C04 (Ngữ văn, Toán, Địa lí)", subs: ["Văn", "Toán", "Địa lí"] },
    { code: "A02", name: "A02 (Toán, Vật lí, Sinh học)", subs: ["Toán", "Vật lí", "Sinh học"] },
    { code: "A07", name: "A07 (Toán, Lịch sử, Địa lí)", subs: ["Toán", "Lịch sử", "Địa lí"] },
    { code: "B08", name: "B08 (Toán, Sinh học, Tiếng Anh)", subs: ["Toán", "Sinh học", "Tiếng Anh"] }
];

const EXPANDED_MAJORS_DICTIONARY = {
    "R": [
        { name: "Kỹ thuật Ô tô & Xe điện thông minh", note: "Thiết kế, chế tạo & vận hành xe hơi thế hệ mới" },
        { name: "Cơ điện tử & Kỹ thuật Robot (Robotics)", note: "Lắp ráp cánh tay robot tự động hóa công nghiệp" },
        { name: "Kỹ thuật Vi mạch & Bán dẫn (Semiconductor)", note: "Thiết kế chip điện tử siêu nhỏ đón đầu làn sóng đầu tư" },
        { name: "Kỹ thuật Xây dựng & Công trình Giao thông", note: "Chỉ huy thi công các đại công trình cầu đường, đô thị" },
        { name: "Nông nghiệp Công nghệ cao (Smart Agri)", note: "Trang trại thông minh điều khiển bằng cảm biến IoT" },
        { name: "Logistics Kỹ thuật & Quản lý Kho bãi", note: "Vận hành hệ thống chuỗi cung ứng hàng hóa quốc tế" },
        { name: "Kỹ thuật Năng lượng Tái tạo & Năng lượng Xanh", note: "Điện gió, pin mặt trời và hệ thống lưu trữ pin" },
        { name: "Công nghệ Thực phẩm & Đảm bảo Chất lượng", note: "Chế biến và kiểm định đồ ăn thức uống sạch an toàn" }
    ],
    "I": [
        { name: "Trí tuệ Nhân tạo & Khoa học Dữ liệu (AI & Data)", note: "Dạy máy học thuật toán & khai phá dữ liệu lớn" },
        { name: "Kỹ thuật Phần mềm (Software Engineering)", note: "Lập trình ứng dụng di động, website và hệ thống cloud" },
        { name: "An toàn Thông tin & An ninh Mạng (Cybersecurity)", note: "Chuyên gia bảo mật chống lại tin tặc mạng" },
        { name: "Y Đa khoa & Bác sĩ Điều trị Ngoại khoa", note: "Khám chữa bệnh và phẫu thuật cứu người tại bệnh viện" },
        { name: "Dược học & Nghiên cứu Bào chế Thuốc", note: "Sản xuất thuốc, vắc-xin và kiểm nghiệm dược phẩm" },
        { name: "Công nghệ Sinh học Y sinh & Tế bào gốc", note: "Giải mã bản đồ gen người và y học tái tạo" },
        { name: "Công nghệ Tài chính (Fintech)", note: "Thanh toán số, ngân hàng số và đầu tư thuật toán tự động" },
        { name: "Thiết kế & Lập trình Game 3D (Game Dev)", note: "Sản xuất các tựa game đồ họa tương tác đỉnh cao" }
    ],
    "A": [
        { name: "Thiết kế Đồ họa & Trải nghiệm Người dùng (UI/UX)", note: "Thiết kế hình ảnh thương hiệu và giao diện phần mềm" },
        { name: "Kiến trúc Công trình & Quy hoạch Đô thị", note: "Kiến trúc sư kiến tạo các tòa nhà biểu tượng" },
        { name: "Truyền thông Đa phương tiện (Multimedia)", note: "Sản xuất video viral, podcast và ấn phẩm kỹ thuật số" },
        { name: "Thiết kế Nội thất & Trang trí Không gian", note: "Bài trí không gian sống sang trọng, ấm cúng" },
        { name: "Thiết kế Thời trang & Stylist Định hình Phong cách", note: "Thiết kế trang phục và xây dựng thương hiệu may mặc" },
        { name: "Đạo diễn Điện ảnh, MV & Phim Truyền hình", note: "Chỉ đạo diễn xuất, góc máy và sản xuất phim chuyên nghiệp" },
        { name: "Biên kịch & Sáng tạo Nội dung (Content Creator)", note: "Viết kịch bản phim ảnh, quảng cáo và sáng tác sách" },
        { name: "Sản xuất Âm nhạc (Music Producer)", note: "Hòa âm phối khí phòng thu và tạo các bài hát hit" }
    ],
    "S": [
        { name: "Sư phạm Toán / Ngữ văn / Tiếng Anh", note: "Giáo viên giảng dạy tại các trường THPT và trường quốc tế" },
        { name: "Tâm lý học Lâm sàng & Tham vấn Trị liệu", note: "Lắng nghe, tháo gỡ tổn thương tâm lý cho cộng đồng" },
        { name: "Ngoại giao & Quan hệ Quốc tế", note: "Làm việc tại Bộ Ngoại giao, đại sứ quán và các tổ chức quốc tế" },
        { name: "Luật & Kiểm sát viên Tòa án Nhân dân", note: "Cầm cân nảy mực bảo vệ công lý và quyền con người" },
        { name: "Điều dưỡng & Kỹ thuật Phục hồi Chức năng", note: "Chăm sóc y tế tận tâm, có cơ hội làm việc tại Đức/Nhật" },
        { name: "Công tác Xã hội & Điều phối Dự án Phi chính phủ (NGO)", note: "Tổ chức các chương trình cứu trợ và xóa đói giảm nghèo" },
        { name: "Quản lý Giáo dục & Đào tạo Doanh nghiệp (L&D)", note: "Phát triển năng lực cho cán bộ nhân viên công ty" },
        { name: "Du lịch Quốc tế & Quản lý Lữ hành", note: "Hướng dẫn viên du lịch và quảng bá danh lam thắng cảnh" }
    ],
    "E": [
        { name: "Quản trị Kinh doanh & Khởi nghiệp (CEO/Founder)", note: "Thành lập công ty riêng và điều hành doanh nghiệp" },
        { name: "Marketing & Quản trị Thương hiệu (Brand Manager)", note: "Nghiên cứu thị trường và bùng nổ chiến dịch quảng cáo" },
        { name: "Thương mại Điện tử (E-Commerce)", note: "Vận hành kinh doanh trên Shopee, TikTok Shop, Amazon" },
        { name: "Tài chính - Ngân hàng & Đầu tư Chứng khoán", note: "Quản lý dòng tiền, thẩm định dự án và đầu tư sinh lời" },
        { name: "Luật Kinh tế & Trọng tài Thương mại Quốc tế", note: "Tư vấn hợp đồng kinh doanh triệu đô cho tập đoàn" },
        { name: "Quản trị Khách sạn & Khu Nghỉ dưỡng 5 Sao", note: "Tổng quản lý khách sạn và tổ chức sự kiện quốc tế" },
        { name: "Quản trị Nhân lực & Săn đầu người (Headhunter)", note: "Chiêu mộ nhân tài cho các tập đoàn đa quốc gia" },
        { name: "Kinh doanh Bất động sản cao cấp", note: "Phân phối dự án địa ốc và thẩm định giá trị tài sản" }
    ],
    "C": [
        { name: "Kế toán Doanh nghiệp & Kiểm toán Độc lập", note: "Kiểm tra sổ sách, dòng tiền tại các công ty kiểm toán Big 4" },
        { name: "Hệ thống Thông tin Quản lý (MIS)", note: "Cầu nối giữa quy trình kinh doanh và cơ sở dữ liệu số" },
        { name: "Phân tích Dữ liệu Kinh doanh (Business Analyst)", note: "Tối ưu hóa hiệu quả hoạt động cho các tập đoàn" },
        { name: "Thẩm định Thuế & Hải quan Xuất nhập khẩu", note: "Kiểm soát chính sách thuế và thủ tục thông quan hàng hóa" },
        { name: "Thống kê Kinh tế & Dự báo Thị trường", note: "Dự báo xu hướng tài chính và thị trường tiêu dùng" },
        { name: "Tài chính Công & Quản lý Ngân sách Nhà nước", note: "Quản lý quỹ ngân sách và thanh toán kho bạc" }
    ]
};


// ==============================================================================
// ĐỐ THẦN ĐÈN HƯỚNG NGHIỆP AKINATOR - 12 CÂU HỎI TRẮC NGHIỆM TÂM LÝ & HOLLAND AI
// (TRẢ LỜI CÓ / KHÔNG / BỎ QUA CÂU HỎI)
// ==============================================================================
// ĐỐ THẦN ĐÈN HƯỚNG NGHIỆP AKINATOR - 17 CÂU HỎI KẾT HỢP HOLLAND & MBTI QUỐC TẾ
// ==============================================================================

const AKINATOR_17_QUESTIONS = [
    // --- 12 CÂU HỎI HOLLAND RIASEC & CƠ CHẾ ĐỊNH HƯỚNG NGHỀ NGHIỆP ---
    {
        id: 1,
        q: "Khi ở trong một tập thể hoặc gặp gỡ người mới, bạn luôn tự tin là người chủ động bắt chuyện trước?",
        desc: "Thể hiện tính cách cởi mở, hướng ngoại và khả năng giao tiếp tự nhiên.",
        group: "E", subGroup: "S",
        mbtiPlus: { E: 15 }, mbtiMinus: { I: 10 }
    },
    {
        id: 2,
        q: "Bạn có niềm đam mê kinh doanh, thích thuyết phục người khác và khao khát trở thành người lãnh đạo/quản lý?",
        desc: "Tố chất thủ lĩnh, khả năng đàm phán thương mại và tư duy chiến lược.",
        group: "E", subGroup: "C",
        mbtiPlus: { E: 10, T: 10, J: 8 }, mbtiMinus: {}
    },
    {
        id: 3,
        q: "Bạn có xu hướng ưu tiên chọn những sản phẩm, đồ vật có tính sáng tạo, độc đáo và thẩm mỹ cao?",
        desc: "Nhạy cảm với cái đẹp, gu thẩm mỹ tinh tế và đề cao tính nguyên bản.",
        group: "A", subGroup: "I",
        mbtiPlus: { N: 15, P: 8 }, mbtiMinus: { S: 8 }
    },
    {
        id: 4,
        q: "Bạn thích vẽ, chụp ảnh, viết lách, chơi nhạc hoặc tự do sáng tạo không gian theo phong cách riêng của mình?",
        desc: "Tâm hồn nghệ thuật, cảm xúc phong phú và ghét sự rập khuôn gò bó.",
        group: "A", subGroup: "S",
        mbtiPlus: { N: 12, P: 15, F: 8 }, mbtiMinus: { J: 10 }
    },
    {
        id: 5,
        q: "Bạn luôn kiên nhẫn lắng nghe, tiếp thu ý kiến của người khác ngay cả khi họ bất đồng quan điểm với bạn?",
        desc: "Trí tuệ cảm xúc (EQ) cao, sự hòa nhã, tôn trọng góc nhìn đa chiều.",
        group: "S", subGroup: "A",
        mbtiPlus: { F: 15 }, mbtiMinus: {}
    },
    {
        id: 6,
        q: "Bạn tìm thấy niềm vui và ý nghĩa khi được chia sẻ tâm sự, tư vấn và giúp đỡ mọi người vượt qua khó khăn?",
        desc: "Lòng trắc ẩn, sự thấu cảm sâu sắc và tinh thần cống hiến vì cộng đồng.",
        group: "S", subGroup: "E",
        mbtiPlus: { F: 15, E: 8 }, mbtiMinus: {}
    },
    {
        id: 7,
        q: "Bạn say mê tìm hiểu bản chất sâu xa của sự việc, thích giải các bài toán hóc búa hoặc nghiên cứu khoa học?",
        desc: "Bộ óc phân tích, đam mê nghiên cứu và giải quyết các bài toán phức tạp.",
        group: "I", subGroup: "R",
        mbtiPlus: { I: 10, N: 12, T: 12 }, mbtiMinus: {}
    },
    {
        id: 8,
        q: "Bạn thích đào sâu tư duy logic, phân tích dữ liệu và đam mê khám phá công nghệ mới, lập trình máy tính?",
        desc: "Tư duy trừu tượng sắc sảo, say mê công nghệ số và thuật toán thời đại 4.0.",
        group: "I", subGroup: "C",
        mbtiPlus: { T: 15, I: 8 }, mbtiMinus: { F: 8 }
    },
    {
        id: 9,
        q: "Bạn thích tự tay tháo lắp, sửa chữa máy móc thiết bị, đồ điện hoặc các dụng cụ kỹ thuật thực tế trong nhà?",
        desc: "Sự khéo léo cơ khí, tư duy không gian trực quan và tính thực hành cao.",
        group: "R", subGroup: "I",
        mbtiPlus: { S: 15, T: 8 }, mbtiMinus: { N: 10 }
    },
    {
        id: 10,
        q: "Bạn thích các hoạt động vận động thể chất ngoài trời, thực hành chế tạo hơn là ngồi yên một chỗ đọc lý thuyết?",
        desc: "Phong cách hành động thực chất, năng động và kiên trì với công việc thực tế.",
        group: "R", subGroup: "E",
        mbtiPlus: { S: 15, P: 8 }, mbtiMinus: { N: 10 }
    },
    {
        id: 11,
        q: "Bạn luôn làm việc có kế hoạch bài bản, thích sắp xếp dữ liệu ngăn nắp và cẩn thận với từng chi tiết?",
        desc: "Tinh thần kỷ luật thép, tổ chức khoa học và khả năng kiểm soát dữ liệu bài bản.",
        group: "C", subGroup: "I",
        mbtiPlus: { J: 15, S: 8 }, mbtiMinus: { P: 12 }
    },
    {
        id: 12,
        q: "Bạn rất chú trọng độ chính xác của các con số, giấy tờ và luôn nghiêm túc tuân thủ các quy tắc, kỷ luật?",
        desc: "Độ tin cậy tuyệt đối, sự chuẩn xác và tôn trọng nguyên tắc hệ thống.",
        group: "C", subGroup: "R",
        mbtiPlus: { J: 15, T: 8 }, mbtiMinus: { P: 12 }
    },

    // --- 5 CÂU HỎI CHUYÊN SÂU ĐỊNH HÌNH 4 TRỤC MBTI QUỐC TẾ ---
    {
        id: 13,
        q: "Sau một tuần học tập căng thẳng, bạn thích ở một mình yên tĩnh để sạc lại năng lượng hơn là tụ tập tiệc tùng đông đúc?",
        desc: "Đo lường trục Năng Lượng: Hướng nội (I) tìm lại bình yên một mình vs Hướng ngoại (E) nạp năng lượng từ đám đông.",
        group: "I", subGroup: "R",
        mbtiPlus: { I: 25 }, mbtiMinus: { E: 25 }
    },
    {
        id: 14,
        q: "Bạn thường bị cuốn hút bởi những ý tưởng đột phá, viễn cảnh tương lai và các giả thuyết mới mẻ hơn là những sự thật thực tế trước mắt?",
        desc: "Đo lường trục Nhận Thức: Trực giác (N) nhìn xa trông rộng vs Thực tế (S) bám sát dữ kiện hiện tại.",
        group: "I", subGroup: "A",
        mbtiPlus: { N: 25 }, mbtiMinus: { S: 25 }
    },
    {
        id: 15,
        q: "Khi giải quyết tranh chấp hoặc đưa ra quyết định hệ trọng, bạn luôn đặt lý trí logic và sự công bằng lên trên cảm xúc cá nhân?",
        desc: "Đo lường trục Ra Quyết Định: Lý trí (T) khách quan logic vs Cảm xúc (F) coi trọng sự hòa hợp và tình người.",
        group: "C", subGroup: "E",
        mbtiPlus: { T: 25 }, mbtiMinus: { F: 25 }
    },
    {
        id: 16,
        q: "Bạn thích một cuộc sống có lịch trình biểu định sẵn và luôn hoàn thành bài vở trước hạn chót, rất ghét sự ngẫu hứng nước đến chân mới nhảy?",
        desc: "Đo lường trục Lối Sống: Nguyên tắc (J) kế hoạch bài bản vs Linh hoạt (P) thích ứng ngẫu hứng.",
        group: "C", subGroup: "C",
        mbtiPlus: { J: 25 }, mbtiMinus: { P: 25 }
    },
    {
        id: 17,
        q: "Bạn luôn giữ được sự bình tĩnh, quyết đoán và tin tưởng vững chắc vào phán đoán của bản thân ngay cả khi chịu áp lực dư luận lớn?",
        desc: "Đo lường bản lĩnh tự tin, sự kiên định lập trường và phong cách ứng biến trước sóng gió.",
        group: "E", subGroup: "I",
        mbtiPlus: { T: 15, J: 10, E: 8 }, mbtiMinus: {}
    }
];

// CƠ SỞ DỮ LIỆU 16 NHÓM TÍNH CÁCH MBTI QUỐC TẾ
const MBTI_MASTER_DATA = {
    "INTJ": {
        name: "Nhà Kiến Tạo Chiến Lược (The Architect)",
        desc: "Tư duy chiến lược nhìn xa trông rộng, độc lập, tôn sùng logic và luôn khao khát tối ưu hóa mọi hệ thống. Bạn nhìn thấy quy luật ngầm của thế giới mà người khác bỏ qua.",
        strengths: "Tầm nhìn chiến lược, tư duy phản biện xuất sắc, ý chí độc lập kiên định.",
        careers: "Trí tuệ Nhân tạo (AI), Kỹ thuật Vi mạch Bán dẫn, Khoa học Dữ liệu, Tài chính Định lượng, Kiến trúc sư Hệ thống."
    },
    "INTP": {
        name: "Nhà Tư Duy Logic (The Logician)",
        desc: "Đam mê khám phá lý thuyết trừu tượng, say mê phân tích và giải mã những bí ẩn khoa học phức tạp nhất. Bạn là nguồn cội của những phát kiến đi trước thời đại.",
        strengths: "Tư duy logic thượng thừa, khả năng tự học sâu, giải quyết vấn đề khó khăn.",
        careers: "Khoa học Máy tính, Nghiên cứu Toán - Lý, Lập trình Thuật toán, An ninh Mạng, Nghiên cứu Công nghệ cao."
    },
    "ENTJ": {
        name: "Nhà Chỉ Huy Tiên Phong (The Commander)",
        desc: "Tố chất thủ lĩnh thiên bẩm, quyết đoán, tầm nhìn vĩ mô và khả năng biến các mục tiêu tham vọng thành hiện thực. Bạn sinh ra để dẫn dắt các đại dự án.",
        strengths: "Năng lực lãnh đạo mạnh mẽ, hoạch định chiến lược, truyền lửa hành động.",
        careers: "Quản trị Doanh nghiệp (CEO), Đầu tư Mạo hiểm, Quản lý Quỹ Tài chính, Luật sư Kinh tế, Tư vấn Chiến lược."
    },
    "ENTP": {
        name: "Người Tranh Biện Đột Phá (The Debater)",
        desc: "Nhanh nhạy, sắc sảo, thích thách thức giới hạn cũ và tạo ra những góc nhìn phá cách độc nhất vô nhị. Bạn thích thú trước các bài toán chưa ai giải được.",
        strengths: "Tư duy đột phá, đàm phán ứng biến tài tình, nhạy bén với cơ hội mới.",
        careers: "Khởi nghiệp Đổi mới Sáng tạo, Marketing Chiến lược, Phân tích Kinh doanh, Giám đốc Sản phẩm (Product Lead)."
    },
    "INFJ": {
        name: "Người Cố Vấn Khai Sáng (The Advocate)",
        desc: "Lý tưởng sống cao đẹp, thấu cảm sâu sắc với con người và luôn khao khát cống hiến cho một xã hội nhân văn hơn. Bạn là ngọn hải đăng soi sáng tâm hồn người khác.",
        strengths: "Trực giác thấu hiểu lòng người, giàu lòng trắc ẩn, ngòi bút truyền cảm hứng.",
        careers: "Tâm lý học Lâm sàng, Sư phạm Cao cấp, Ngoại giao, Biên kịch & Viết lách, Cố vấn Giáo dục Quốc tế."
    },
    "INFP": {
        name: "Người Hòa Giải Lý Tưởng (The Mediator)",
        desc: "Tâm hồn trong sáng, giàu cảm xúc, coi trọng giá trị đạo đức và không ngừng tìm kiếm ý nghĩa chân thực của bản thân. Bạn mang tâm hồn của một nghệ sĩ đích thực.",
        strengths: "Khả năng sáng tạo nghệ thuật, đồng cảm sâu xa, thế giới nội tâm phong phú.",
        careers: "Thiết kế Đồ họa & UI/UX, Sáng tác Nội dung Số, Dịch thuật Quốc tế, Tâm lý Trị liệu, Truyền thông Đa phương tiện."
    },
    "ENFJ": {
        name: "Người Truyền Cảm Hứng (The Protagonist)",
        desc: "Nhiệt huyết, lôi cuốn, giỏi gắn kết mọi người và luôn hết lòng giúp đỡ cộng đồng vươn tới tiềm năng cao nhất. Bạn là trái tim ấm áp kết nối tập thể.",
        strengths: "Kỹ năng truyền cảm hứng, xây dựng đội ngũ đoàn kết, thấu hiểu tâm lý số đông.",
        careers: "Quản lý Nhân sự & Đào tạo (L&D), Quan hệ Công chúng (PR), Quản lý Dự án Xã hội, Ngoại giao, Nhà giáo dục."
    },
    "ENFP": {
        name: "Người Khám Phá Nhiệt Huyết (The Campaigner)",
        desc: "Tràn đầy năng lượng tích cực, trí tưởng tượng bay bổng, yêu tự do và luôn say mê kết nối các ý tưởng sáng tạo với con người. Đi đến đâu bạn cũng mang lại luồng gió mới.",
        strengths: "Sáng tạo không biên giới, giao tiếp lôi cuốn, tinh thần tiên phong thử nghiệm.",
        careers: "Marketing Sáng tạo, Sản xuất Truyền hình & Phim ảnh, Quản trị Thương hiệu, Tổ chức Sự kiện, Du lịch Quốc tế."
    },
    "ISTJ": {
        name: "Nhà Tổ Chức Trách Nhiệm (The Logistician)",
        desc: "Trách nhiệm, kỷ luật thép, cẩn trọng tỉ mỉ và luôn tuân thủ nguyên tắc. Bạn là trụ cột vững chắc và đáng tin cậy nhất trong mọi tổ chức, cơ quan.",
        strengths: "Độ chính xác tuyệt đối, trung thực, quản trị hệ thống dữ liệu bài bản.",
        careers: "Kiểm toán Big 4, Kế toán Doanh nghiệp, Quản trị Cơ sở Dữ liệu (MIS), Pháp lý & Thuế, Ngân hàng."
    },
    "ISFJ": {
        name: "Người Bảo Vệ Tận Tâm (The Defender)",
        desc: "Chu đáo, ấm áp, kiên nhẫn và luôn âm thầm cống hiến để bảo vệ sự an toàn, hạnh phúc của mọi người xung quanh. Sự tận tâm của bạn tạo nên niềm tin bất diệt.",
        strengths: "Lòng trung thành, đức tính chu đáo, khả năng chăm sóc và quản lý chi tiết.",
        careers: "Y Đa khoa, Điều dưỡng Quốc tế, Dược học, Giáo dục Tiểu học, Quản trị Trải nghiệm Khách hàng."
    },
    "ESTJ": {
        name: "Người Giám Sát Thực Thi (The Executive)",
        desc: "Thực tế, quyết liệt, giỏi tổ chức trật tự và lãnh đạo bộ máy vận hành trơn tru, hiệu quả cao. Bạn đảm bảo mọi việc được hoàn thành đúng chuẩn mực và thời hạn.",
        strengths: "Kỹ năng quản lý vận hành, lập kế hoạch thực thi, tính kỷ luật gương mẫu.",
        careers: "Quản lý Chuỗi Cung ứng (Logistics), Chỉ huy Công trình Xây dựng, Quản trị Sản xuất, Giám đốc Điều hành Vận hành (COO)."
    },
    "ESFJ": {
        name: "Người Chăm Sóc Hòa Đồng (The Consul)",
        desc: "Hòa nhã, chu đáo, tinh tế trong giao tiếp xã hội và luôn mong muốn xây dựng một môi trường ấm cúng, đoàn kết. Bạn là chất keo gắn kết mọi mối quan hệ.",
        strengths: "Kỹ năng đối ngoại khéo léo, sự tận tình, nhạy bén với nhu cầu cộng đồng.",
        careers: "Quản trị Khách sạn 5 Sao, Quan hệ Khách hàng Cao cấp, Y tế Cộng đồng, Giáo dục Thể chất, Tổ chức Sự kiện."
    },
    "ISTP": {
        name: "Nhà Kỹ Thuật Khéo Léo (The Virtuoso)",
        desc: "Thực tế, trầm tĩnh, quan sát tinh tường và cực kỳ khéo léo với máy móc, công cụ cơ khí. Bạn học tốt nhất khi tự tay mày mò, tháo lắp và sửa chữa.",
        strengths: "Tư duy cơ khí nhạy bén, phản xạ ứng biến linh hoạt, giải quyết sự cố kỹ thuật.",
        careers: "Kỹ thuật Robot & Tự động hóa, Kỹ thuật Ô tô & Xe điện, Phi công, Kỹ sư Phần cứng, Cơ điện tử."
    },
    "ISFP": {
        name: "Người Nghệ Sĩ Phóng Khoáng (The Adventurer)",
        desc: "Nhạy cảm với cái đẹp, giàu cảm xúc, sống trọn vẹn từng khoảnh khắc và thích khám phá trải nghiệm thẩm mỹ mới. Bạn thể hiện cái tôi qua tác phẩm nghệ thuật độc bản.",
        strengths: "Cảm quan thẩm mỹ tinh tế, linh hoạt, khả năng biểu đạt cảm xúc qua nghệ thuật.",
        careers: "Thiết kế Thời trang, Nhiếp ảnh Nghệ thuật, Kiến trúc Cảnh quan, Ẩm thực Nghệ thuật, Thiết kế Nội thất."
    },
    "ESTP": {
        name: "Người Khởi Nghiệp Táo Bạo (The Entrepreneur)",
        desc: "Năng động, dũng cảm, phản xạ cực nhanh và không ngại đối mặt với rủi ro để giành lấy thành công. Bạn là chiến binh thực chiến trên thương trường.",
        strengths: "Kỹ năng hành động chớp nhoáng, thích ứng áp lực cao, tài đàm phán thuyết phục.",
        careers: "Kinh doanh Bất động sản, Môi giới Chứng khoán, Khởi nghiệp Thương mại Điện tử, Quản lý Thể thao."
    },
    "ESFP": {
        name: "Người Trình Diễn Hoạt Bát (The Entertainer)",
        desc: "Vui tươi, rạng rỡ, cuốn hút và luôn là tâm điểm thắp sáng mọi cuộc trò chuyện. Bạn có khả năng lan tỏa niềm vui và biến cuộc sống thành một sân khấu rực rỡ.",
        strengths: "Năng lượng sân khấu lôi cuốn, sự hoạt bát, truyền cảm hứng tích cực.",
        careers: "MC & Dẫn chương trình, Diễn xuất, Tổ chức Lễ hội & Giải trí, Hướng dẫn viên Quốc tế, Tiếp thị Trải nghiệm."
    }
};

const HOLLAND_MASTER_DATA = {
    "R": {
        name: "Người Thực Tế & Kỹ Thuật (Realistic)",
        desc: "Bạn là người thực tế, hành động dứt khoát, khéo léo với đôi bàn tay và thích làm việc với công cụ máy móc, kỹ thuật công nghệ hoặc hoạt động ngoài trời. Bạn tôn trọng kết quả thực chất hơn là những lý thuyết trừu tượng.",
        blocks: "A00, A01, A02, D07, C01",
        majors: "Kỹ thuật Ô tô & Xe điện, Cơ điện tử & Robot, Kỹ thuật Vi mạch Bán dẫn, Tự động hóa, Xây dựng",
        jobs: "Kỹ sư thiết kế bán dẫn, Kỹ sư Robot công nghiệp, Chỉ huy trưởng công trình, Giám sát hệ thống xe thông minh",
        advice: "Hãy đầu tư vững chắc vào Toán, Vật lí, Tin học và Ngoại ngữ chuyên ngành. Đừng ngại tham gia các câu lạc bộ chế tạo STEM để tôi luyện bản lĩnh thực chiến!"
    },
    "I": {
        name: "Nhà Nghiên Cứu & Tư Duy Logic (Investigative)",
        desc: "Bạn sở hữu bộ óc phân tích sắc sảo, luôn tò mò muốn hiểu đến tận cùng bản chất sự việc. Bạn xuất sắc trong việc tư duy trừu tượng, giải toán, đào sâu thuật toán hoặc nghiên cứu khoa học chuyên sâu.",
        blocks: "A00, A01, B00, D07, D01",
        majors: "Trí tuệ Nhân tạo (AI) & Khoa học Dữ liệu, Kỹ thuật Phần mềm, Y Đa khoa, Dược học, An toàn Thông tin",
        jobs: "Chuyên gia AI/Machine Learning, Bác sĩ điều trị, Lập trình viên Cloud, Chuyên gia Bảo mật & An ninh mạng",
        advice: "Duy trì thói quen đọc tài liệu khoa học quốc tế, rèn luyện tư duy phản biện và thuật toán. Bạn là nhân tài nòng cốt trong thời đại công nghệ số bùng nổ!"
    },
    "A": {
        name: "Nhà Sáng Tạo & Đột Phá Thẩm Mỹ (Artistic)",
        desc: "Bạn có tâm hồn tự do, giàu cảm xúc, trí tưởng tượng phong phú và nhạy bén đặc biệt với nghệ thuật, cái đẹp. Bạn thích tạo ra những ý tưởng độc bản và ghét sự rập khuôn, gò bó cứng nhắc.",
        blocks: "D01, C00, H00, V00, D14",
        majors: "Thiết kế Đồ họa & Trải nghiệm Người dùng (UI/UX), Kiến trúc, Truyền thông Đa phương tiện, Thiết kế Game 3D",
        jobs: "Giám đốc Sáng tạo (Art Director), Nhà thiết kế sản phẩm số UI/UX, Kiến trúc sư, Biên kịch & Sáng tạo nội dung",
        advice: "Hãy tự tin thể hiện cá tính riêng! Kết hợp năng khiếu thẩm mỹ với việc làm chủ các công cụ đồ họa số và công nghệ AI hiện đại để tạo nên lợi thế vượt trội."
    },
    "S": {
        name: "Người Đồng Hành & Lan Tỏa Xã Hội (Social)",
        desc: "Bạn ấm áp, biết lắng nghe, thấu cảm sâu sắc với cảm xúc của người khác và có năng khiếu truyền cảm hứng. Bạn tìm thấy niềm hạnh phúc và ý nghĩa cuộc đời khi được giúp đỡ, hỗ trợ mọi người phát triển.",
        blocks: "C00, D01, D14, D15, C19",
        majors: "Sư phạm, Tâm lý học Tham vấn Trị liệu, Ngoại giao & Quan hệ Quốc tế, Luật Nhân quyền, Điều dưỡng Quốc tế",
        jobs: "Chuyên viên Tham vấn Tâm lý, Giáo viên trường quốc tế, Nhà Ngoại giao, Luật sư, Quản lý Nhân sự & Đào tạo (L&D)",
        advice: "Hãy trau dồi vốn ngoại ngữ thật giỏi để mở rộng tầm ảnh hưởng ra môi trường quốc tế. Tiếp tục giữ vững trái tim nhiệt huyết và sự bao dung quý giá của bạn."
    },
    "E": {
        name: "Thủ Lĩnh Tiên Phong & Quản Trị Kinh Doanh (Enterprising)",
        desc: "Bạn tự tin, năng động, có tố chất lãnh đạo bẩm sinh và khả năng đàm phán thuyết phục người khác. Bạn thích thử thách, có đầu óc nhạy bén về thương mại và khát vọng tự mình làm chủ sự nghiệp.",
        blocks: "A01, D01, C14, D07, A00",
        majors: "Quản trị Kinh doanh & Khởi nghiệp, Marketing & Quản trị Thương hiệu, Thương mại Điện tử, Tài chính - Ngân hàng",
        jobs: "Giám đốc Doanh nghiệp (CEO/Founder), Trưởng phòng Marketing, Chuyên viên Đầu tư Tài chính, Quản lý sàn TMĐT xuyên biên giới",
        advice: "Tập trung rèn luyện tư duy tài chính, kỹ năng quản trị đội nhóm và khả năng thích ứng linh hoạt trước biến động của thị trường kinh tế số."
    },
    "C": {
        name: "Chuyên Gia Quy Củ & Quản Trị Hệ Thống (Conventional)",
        desc: "Bạn cực kỳ cẩn thận, tỉ mỉ, có tinh thần kỷ luật thép và làm việc theo kế hoạch bài bản. Bạn là bậc thầy trong việc quản trị dữ liệu, sắp xếp thông tin ngăn nắp và đảm bảo tính chính xác tuyệt đối.",
        blocks: "A00, A01, D01, C14, D07",
        majors: "Kiểm toán Độc lập & Kế toán Doanh nghiệp, Hệ thống Thông tin Quản lý (MIS), Phân tích Dữ liệu Kinh doanh (BA), Hải quan & Thuế",
        jobs: "Kiểm toán viên Big 4, Chuyên viên Phân tích Nghiệp vụ, Kế toán trưởng, Quản lý Cơ sở Dữ liệu Hệ thống",
        advice: "Hãy trang bị thêm các chứng chỉ số hóa (PowerBI, Python Data Analytics, SQL) kết hợp cùng đức tính cẩn trọng sẵn có để trở thành nhân sự không thể thay thế."
    }
};

let akinatorIndex = 0;
let akinatorAnswers = [];

// 1. Khởi động bài đố Thần Đèn 17 câu hỏi
function startDecisionTree() {
    window.userSubjects = typeof getSelectedSubjects === 'function' ? getSelectedSubjects() : ['Toán', 'Văn', 'Tiếng Anh'];
    localStorage.setItem('school_user_subjects', JSON.stringify(window.userSubjects));

    akinatorIndex = 0;
    akinatorAnswers = [];

    document.getElementById('career-intro-screen').classList.add('hidden');
    document.getElementById('career-result-screen').classList.add('hidden');
    document.getElementById('career-tree-screen').classList.remove('hidden');

    renderAkinatorQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 2. Hiển thị câu hỏi hiện tại cho Thần Đèn
function renderAkinatorQuestion() {
    if (akinatorIndex >= AKINATOR_17_QUESTIONS.length) {
        finishAkinatorGame();
        return;
    }

    const q = AKINATOR_17_QUESTIONS[akinatorIndex];
    const total = AKINATOR_17_QUESTIONS.length;
    const curNum = akinatorIndex + 1;
    const pct = Math.round((curNum / total) * 100);

    const depthLabel = document.getElementById('tree-depth-label');
    const percentLabel = document.getElementById('tree-percent-label');
    const progressBar = document.getElementById('tree-progress-bar');
    const questionText = document.getElementById('tree-question-text');
    const questionDesc = document.getElementById('tree-question-desc');
    const moodText = document.getElementById('genie-mood-text');
    const backBtn = document.getElementById('btn-tree-back');

    if (depthLabel) depthLabel.innerText = `Câu hỏi ${curNum} / ${total}`;
    if (percentLabel) percentLabel.innerText = `Độ đọc vị: ${pct}%`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (questionText) questionText.innerText = q.q;
    if (questionDesc) questionDesc.innerText = q.desc || '';

    // Cập nhật câu thoại tâm trạng của Thần Đèn
    if (moodText) {
        if (curNum <= 3) moodText.innerText = "Thần Đèn đang tập trung lắng nghe tần số tư duy của ngươi...";
        else if (curNum <= 7) moodText.innerText = "Sóng tư duy Holland đang truyền tín hiệu vào chiếc đèn thần!";
        else if (curNum <= 12) moodText.innerText = "Các chiều không gian tâm lý MBTI của ngươi đang dần hội tụ!";
        else if (curNum <= 16) moodText.innerText = "Thần lực đang sôi sục! Sắp giải mã trọn vẹn số mệnh tương lai!";
        else moodText.innerText = "Câu hỏi thứ 17 quyết định! Ta sắp hé lộ bức tranh nghề nghiệp hoàn hảo!";
    }

    if (backBtn) {
        if (akinatorIndex > 0) backBtn.classList.remove('hidden');
        else backBtn.classList.add('hidden');
    }
}

// 3. Xử lý khi bấm nút CÓ, KHÔNG hoặc BỎ QUA
function chooseDecision(choice) {
    if (akinatorIndex >= AKINATOR_17_QUESTIONS.length) return;

    akinatorAnswers.push({
        index: akinatorIndex,
        choice: choice,
        q: AKINATOR_17_QUESTIONS[akinatorIndex]
    });

    akinatorIndex++;

    if (akinatorIndex < AKINATOR_17_QUESTIONS.length) {
        renderAkinatorQuestion();
    } else {
        finishAkinatorGame();
    }
}

// 4. Quay lại câu trước
function backDecision() {
    if (akinatorIndex > 0) {
        akinatorAnswers.pop();
        akinatorIndex--;
        renderAkinatorQuestion();
    }
}

// 5. Kết thúc 17 câu và Thần Đèn đọc vị kết quả (Holland + MBTI)
function finishAkinatorGame() {
    // --- A. TÍNH ĐIỂM HOLLAND RIASEC ---
    const scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    
    // --- B. TÍNH ĐIỂM 4 TRỤC MBTI (E-I, S-N, T-F, J-P) ---
    const mbtiScores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    akinatorAnswers.forEach(ans => {
        const q = ans.q;
        if (ans.choice === 'YES') {
            // Holland
            scores[q.group] += 20;
            scores[q.subGroup] += 6;
            // MBTI Plus
            if (q.mbtiPlus) {
                for (let k in q.mbtiPlus) mbtiScores[k] += q.mbtiPlus[k];
            }
        } else if (ans.choice === 'NO') {
            // MBTI Minus
            if (q.mbtiMinus) {
                for (let k in q.mbtiMinus) mbtiScores[k] += q.mbtiMinus[k];
            }
        } else if (ans.choice === 'SKIP') {
            // Trung lập
            scores[q.group] += 8;
            scores[q.subGroup] += 3;
            if (q.mbtiPlus) {
                for (let k in q.mbtiPlus) mbtiScores[k] += Math.round(q.mbtiPlus[k] * 0.4);
            }
            if (q.mbtiMinus) {
                for (let k in q.mbtiMinus) mbtiScores[k] += Math.round(q.mbtiMinus[k] * 0.4);
            }
        }
    });

    // 1. Phân định mã MBTI 4 ký tự
    const typeEI = (mbtiScores.I >= mbtiScores.E) ? "I" : "E";
    const typeSN = (mbtiScores.N >= mbtiScores.S) ? "N" : "S";
    const typeTF = (mbtiScores.T >= mbtiScores.F) ? "T" : "F";
    const typeJP = (mbtiScores.J >= mbtiScores.P) ? "J" : "P";
    const mbtiKey = `${typeEI}${typeSN}${typeTF}${typeJP}`;
    const mbtiInfo = MBTI_MASTER_DATA[mbtiKey] || MBTI_MASTER_DATA["INTJ"];

    // Tính phần trăm từng trục MBTI
    const totalEI = (mbtiScores.E + mbtiScores.I) || 1;
    const pctI = Math.round((mbtiScores.I / totalEI) * 100);
    const pctE = 100 - pctI;

    const totalSN = (mbtiScores.S + mbtiScores.N) || 1;
    const pctN = Math.round((mbtiScores.N / totalSN) * 100);
    const pctS = 100 - pctN;

    const totalTF = (mbtiScores.T + mbtiScores.F) || 1;
    const pctT = Math.round((mbtiScores.T / totalTF) * 100);
    const pctF = 100 - pctT;

    const totalJP = (mbtiScores.J + mbtiScores.P) || 1;
    const pctJ = Math.round((mbtiScores.J / totalJP) * 100);
    const pctP = 100 - pctJ;

    // 2. Tính phần trăm Holland RIASEC
    const groupPct = {};
    for (let k in scores) {
        groupPct[k] = Math.min(100, Math.max(15, Math.round((scores[k] / 45) * 100)));
    }
    const sortedGroups = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const top1 = sortedGroups[0];
    const top2 = sortedGroups[1];
    const top3 = sortedGroups[2];
    const hollandCode = `${top1}${top2}${top3}`;
    const masterInfo = HOLLAND_MASTER_DATA[top1] || HOLLAND_MASTER_DATA["R"];

    // 3. Chuyển sang màn hình kết quả
    document.getElementById('career-tree-screen').classList.add('hidden');
    document.getElementById('career-result-screen').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // --- CẬP NHẬT GIAO DIỆN KẾT QUẢ ---
    
    // A. Thẻ MBTI
    const mbtiTypeEl = document.getElementById('res-mbti-type');
    const mbtiTitleEl = document.getElementById('res-mbti-title');
    const mbtiDescEl = document.getElementById('res-mbti-desc');
    const mbtiAxesEl = document.getElementById('res-mbti-axes');

    if (mbtiTypeEl) mbtiTypeEl.innerText = `${mbtiKey} - ${mbtiInfo.name.split('(')[0].trim()}`;
    if (mbtiTitleEl) mbtiTitleEl.innerText = mbtiInfo.name;
    if (mbtiDescEl) mbtiDescEl.innerText = `${mbtiInfo.desc} Đặc trưng: ${mbtiInfo.strengths}`;

    if (mbtiAxesEl) {
        mbtiAxesEl.innerHTML = `
            <div class="bg-black/20 p-2 rounded-lg border border-purple-600/30">
                <div class="flex justify-between text-[10px] mb-1">
                    <span class="${typeEI === 'E' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Hướng ngoại (E) ${pctE}%</span>
                    <span class="${typeEI === 'I' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Hướng nội (I) ${pctI}%</span>
                </div>
                <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                    <div class="bg-amber-400 h-full" style="width: ${pctE}%"></div>
                    <div class="bg-purple-400 h-full" style="width: ${pctI}%"></div>
                </div>
            </div>

            <div class="bg-black/20 p-2 rounded-lg border border-purple-600/30">
                <div class="flex justify-between text-[10px] mb-1">
                    <span class="${typeSN === 'S' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Thực tế (S) ${pctS}%</span>
                    <span class="${typeSN === 'N' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Trực giác (N) ${pctN}%</span>
                </div>
                <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                    <div class="bg-blue-400 h-full" style="width: ${pctS}%"></div>
                    <div class="bg-cyan-400 h-full" style="width: ${pctN}%"></div>
                </div>
            </div>

            <div class="bg-black/20 p-2 rounded-lg border border-purple-600/30">
                <div class="flex justify-between text-[10px] mb-1">
                    <span class="${typeTF === 'T' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Lý trí (T) ${pctT}%</span>
                    <span class="${typeTF === 'F' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Cảm xúc (F) ${pctF}%</span>
                </div>
                <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                    <div class="bg-emerald-400 h-full" style="width: ${pctT}%"></div>
                    <div class="bg-rose-400 h-full" style="width: ${pctF}%"></div>
                </div>
            </div>

            <div class="bg-black/20 p-2 rounded-lg border border-purple-600/30">
                <div class="flex justify-between text-[10px] mb-1">
                    <span class="${typeJP === 'J' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Nguyên tắc (J) ${pctJ}%</span>
                    <span class="${typeJP === 'P' ? 'text-amber-300 font-bold' : 'text-gray-300'}">Linh hoạt (P) ${pctP}%</span>
                </div>
                <div class="w-full bg-white/10 h-1.5 rounded-full overflow-hidden flex">
                    <div class="bg-indigo-400 h-full" style="width: ${pctJ}%"></div>
                    <div class="bg-orange-400 h-full" style="width: ${pctP}%"></div>
                </div>
            </div>
        `;
    }

    // B. Phổ điểm 6 nhóm Holland RIASEC
    const barsContainer = document.getElementById('res-holland-bars');
    if (barsContainer) {
        const groupMeta = {
            "R": { name: "Thực tế & Kỹ thuật (R)", color: "from-blue-500 to-cyan-500", icon: "fa-wrench" },
            "I": { name: "Nghiên cứu & Tư duy (I)", color: "from-indigo-600 to-purple-600", icon: "fa-microchip" },
            "A": { name: "Nghệ thuật & Sáng tạo (A)", color: "from-pink-500 to-rose-500", icon: "fa-palette" },
            "S": { name: "Xã hội & Thấu hiểu (S)", color: "from-emerald-500 to-teal-500", icon: "fa-heart" },
            "E": { name: "Quản trị & Lãnh đạo (E)", color: "from-amber-500 to-orange-500", icon: "fa-bullhorn" },
            "C": { name: "Nghiệp vụ & Quy củ (C)", color: "from-slate-600 to-gray-700", icon: "fa-clipboard-check" }
        };

        barsContainer.innerHTML = sortedGroups.map(grp => {
            const meta = groupMeta[grp];
            const pct = groupPct[grp];
            const isTop = grp === top1;
            return `
                <div class="space-y-1">
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-gray-700 flex items-center gap-1.5">
                            <i class="fa-solid ${meta.icon} text-[11px] ${isTop ? 'text-purple-600' : 'text-gray-400'}"></i>
                            <span class="${isTop ? 'text-purple-800 font-black' : ''}">${meta.name}</span>
                            ${isTop ? '<span class="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.2 rounded font-black">Nổi trội nhất</span>' : ''}
                        </span>
                        <span class="font-bold text-gray-600">${pct}%</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r ${meta.color} h-2.5 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // C. Cập nhật chi tiết kết quả
    const badgeEl = document.getElementById('res-holland-badge');
    if (badgeEl) badgeEl.innerText = `Mã Holland: ${hollandCode} • MBTI: ${mbtiKey} (${masterInfo.name.split('(')[0].trim()})`;

    const descEl = document.getElementById('res-desc');
    if (descEl) descEl.innerText = `${masterInfo.desc} Với phong cách ${mbtiInfo.name}, bạn có tiềm năng vượt trội khi đặt vào môi trường làm việc đề cao tư duy chủ động và đổi mới.`;

    const majorsEl = document.getElementById('res-majors');
    if (majorsEl) majorsEl.innerText = `${masterInfo.majors} — (Gợi ý thêm theo MBTI: ${mbtiInfo.careers})`;

    const jobsEl = document.getElementById('res-jobs');
    if (jobsEl) jobsEl.innerText = masterInfo.jobs;

    const adviceEl = document.getElementById('res-advice');
    if (adviceEl) adviceEl.innerText = `Lời khuyên cho ${mbtiKey} & ${hollandCode}: ${masterInfo.advice} Hãy luôn phát huy thế mạnh độc bản của bạn!`;

    // D. Lọc khối thi thực tế GDPT 2018 theo môn đã chọn
    const curSubs = window.userSubjects || ['Toán', 'Văn', 'Tiếng Anh'];
    let matched = (typeof ALL_VIETNAM_BLOCKS !== 'undefined' ? ALL_VIETNAM_BLOCKS : []).filter(block => {
        return block.subs.every(s => curSubs.includes(s));
    });

    const blocksEl = document.getElementById('res-matched-blocks');
    const noteEl = document.getElementById('res-blocks-note');
    if (blocksEl) {
        if (matched.length > 0) {
            blocksEl.innerHTML = matched.map(b => `<span class="inline-block bg-white text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md text-xs font-black mr-1 mb-1 shadow-2xs">${b.name}</span>`).join('');
            if (noteEl) noteEl.innerText = `✓ Tuyệt vời! Bạn đang học đầy đủ các môn để xét tuyển đại học bằng các khối trên.`;
        } else {
            blocksEl.innerHTML = `<span class="text-orange-700 font-bold">${masterInfo.blocks}</span>`;
            if (noteEl) noteEl.innerText = `💡 Khối thi đề xuất chuẩn là trên. Bạn có thể tự ôn thêm môn còn thiếu nhé!`;
        }
    }

    // E. Gợi ý mở rộng nhiều ngành nghề cùng khối thi
    if (typeof EXPANDED_MAJORS_DICTIONARY !== 'undefined') {
        const expandedList = EXPANDED_MAJORS_DICTIONARY[top1] || EXPANDED_MAJORS_DICTIONARY["R"];
        const expandedContainer = document.getElementById('res-expanded-majors');
        if (expandedContainer && expandedList) {
            expandedContainer.innerHTML = '';
            expandedList.forEach(item => {
                expandedContainer.innerHTML += `
                <div class="p-2.5 bg-white border border-indigo-100 rounded-lg shadow-2xs hover:border-indigo-300 transition">
                    <div class="font-bold text-indigo-900 text-xs flex items-center gap-1.5">
                        <i class="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i>
                        <span>${item.name}</span>
                    </div>
                    <p class="text-[11px] text-gray-500 mt-0.5 leading-tight">${item.note}</p>
                </div>
                `;
            });
        }
    }
}

// 6. Reset về màn hình chọn môn học
function resetDecisionTree() {
    akinatorIndex = 0;
    akinatorAnswers = [];
    document.getElementById('career-intro-screen').classList.remove('hidden');
    document.getElementById('career-tree-screen').classList.add('hidden');
    document.getElementById('career-result-screen').classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Gán các hàm lên window để gọi từ HTML
window.startDecisionTree = startDecisionTree;
window.chooseDecision = chooseDecision;
window.backDecision = backDecision;
window.resetDecisionTree = resetDecisionTree;
window.renderAkinatorQuestion = renderAkinatorQuestion;
window.finishAkinatorGame = finishAkinatorGame;

// ==============================================================================
// MODULE 4: PHÒNG LUYỆN THI TRẮC NGHIỆM GDPT 2018 - SỔ TAY HỌC ĐƯỜNG
// ==============================================================================

const EXAM_SUBJECTS = [
    { id: 'Toán', name: 'Toán Học', icon: 'fa-calculator', color: 'from-blue-500 to-indigo-600', badgeColor: 'bg-blue-100 text-blue-800' },
    { id: 'Vật Lí', name: 'Vật Lí', icon: 'fa-atom', color: 'from-cyan-500 to-blue-600', badgeColor: 'bg-cyan-100 text-cyan-800' },
    { id: 'Hóa Học', name: 'Hóa Học', icon: 'fa-flask-vial', color: 'from-emerald-500 to-teal-600', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'Sinh Học', name: 'Sinh Học', icon: 'fa-dna', color: 'from-green-500 to-emerald-600', badgeColor: 'bg-green-100 text-green-800' },
    { id: 'Lịch Sử', name: 'Lịch Sử', icon: 'fa-landmark', color: 'from-amber-500 to-orange-600', badgeColor: 'bg-amber-100 text-amber-800' },
    { id: 'Địa Lí', name: 'Địa Lí', icon: 'fa-earth-americas', color: 'from-teal-500 to-emerald-600', badgeColor: 'bg-teal-100 text-teal-800' },
    { id: 'GDKT&PL', name: 'GDKT & PL', icon: 'fa-scale-balanced', color: 'from-purple-500 to-pink-600', badgeColor: 'bg-purple-100 text-purple-800' },
    { id: 'Tiếng Anh', name: 'Tiếng Anh', icon: 'fa-language', color: 'from-rose-500 to-pink-600', badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'Tin Học', name: 'Tin Học', icon: 'fa-laptop-code', color: 'from-indigo-500 to-purple-600', badgeColor: 'bg-indigo-100 text-indigo-800' },
    { id: 'Công Nghệ', name: 'Công Nghệ', icon: 'fa-gears', color: 'from-orange-500 to-amber-600', badgeColor: 'bg-orange-100 text-orange-800' },
    { id: 'GDQP&AN', name: 'GDQP & AN', icon: 'fa-shield-halved', color: 'from-emerald-700 to-teal-800', badgeColor: 'bg-teal-100 text-teal-800' }
];

// NGÂN HÀNG ĐỀ THI MẪU CHUẨN GDPT 2018 (OFFLINE-FIRST) - LỚP 12
const BUILTIN_EXAM_BANK_12 = {
    "Toán": [
        {
            id: "m_1", subject: "Toán", grade: "12", period: "mid1", topic: "Ứng dụng đạo hàm khảo sát hàm số",
            content: "Cho hàm số y = f(x) có đạo hàm f'(x) = x(x - 1)(x + 2)^2 với mọi x ∈ ℝ. Số điểm cực trị của hàm số đã cho là:",
            options: ["A. 1", "B. 2", "C. 3", "D. 4"],
            correct: "B",
            explanation: "Ta giải f'(x) = 0 ⇔ x = 0 hoặc x = 1 hoặc x = -2. Nghiệm x = -2 là nghiệm bội chẵn nên f'(x) không đổi dấu khi qua x = -2. Nghiệm x = 0 và x = 1 là nghiệm đơn nên f'(x) đổi dấu khi qua hai điểm này. Vậy hàm số có 2 điểm cực trị."
        },
        {
            id: "m_2", subject: "Toán", grade: "12", period: "final1", topic: "Phương trình mũ & Lôgarit",
            content: "Tập xác định của hàm số y = log₂(x - 3) là:",
            options: ["A. (3; +∞)", "B. [3; +∞)", "C. (-∞; 3)", "D. ℝ \\ {3}"],
            correct: "A",
            explanation: "Hàm số logarit y = log_a(u) xác định khi và chỉ khi biểu thức u > 0. Do đó: x - 3 > 0 ⇔ x > 3. Vậy tập xác định là (3; +∞)."
        },
        {
            id: "m_3", subject: "Toán", grade: "12", period: "mid1", topic: "Ứng dụng đạo hàm khảo sát hàm số",
            content: "Đồ thị hàm số y = (2x + 1)/(x - 1) có đường tiệm cận đứng là:",
            options: ["A. x = 2", "B. x = 1", "C. y = 2", "D. y = 1"],
            correct: "B",
            explanation: "Mẫu số x - 1 = 0 ⇔ x = 1, khi x → 1 thì tử số bằng 3 ≠ 0 nên y → ±∞. Do đó đường thẳng x = 1 là tiệm cận đứng của đồ thị hàm số."
        },
        {
            id: "m_4", subject: "Toán", grade: "12", period: "mid2", topic: "Nguyên hàm & Tích phân",
            content: "Họ nguyên hàm của hàm số f(x) = e^(2x) là:",
            options: ["A. 2e^(2x) + C", "B. (1/2)e^(2x) + C", "C. e^(2x) + C", "D. (1/2)e^x + C"],
            correct: "B",
            explanation: "Theo công thức nguyên hàm cơ bản: ∫ e^(ax + b) dx = (1/a) e^(ax + b) + C. Ở đây a = 2 nên ∫ e^(2x) dx = (1/2) e^(2x) + C."
        },
        {
            id: "m_5", subject: "Toán", grade: "12", period: "final1", topic: "Tọa độ không gian Oxyz",
            content: "Trong không gian Oxyz, cho mặt cầu (S): (x - 1)² + (y + 2)² + (z - 3)² = 16. Tọa độ tâm I và bán kính R của (S) là:",
            options: ["A. I(1; -2; 3), R = 4", "B. I(-1; 2; -3), R = 4", "C. I(1; -2; 3), R = 16", "D. I(-1; 2; -3), R = 16"],
            correct: "A",
            explanation: "Phương trình mặt cầu có dạng (x - a)² + (y - b)² + (z - c)² = R². Từ đó suy ra tâm I(1; -2; 3) và bán kính R = √16 = 4."
        },
        {
            id: "m_6", subject: "Toán", grade: "12", period: "final2", topic: "Phương trình mũ & Lôgarit",
            content: "Tập nghiệm S của phương trình 2^(x + 1) = 16 là:",
            options: ["A. S = {3}", "B. S = {4}", "C. S = {2}", "D. S = {5}"],
            correct: "A",
            explanation: "Ta có: 16 = 2⁴. Khi đó: 2^(x + 1) = 2⁴ ⇔ x + 1 = 4 ⇔ x = 3. Vậy S = {3}."
        },
        {
            id: "m_7", subject: "Toán", grade: "12", period: "final1", topic: "Tọa độ không gian Oxyz",
            content: "Trong không gian Oxyz, véc tơ nào sau đây là một véc tơ pháp tuyến của mặt phẳng (P): 2x - 3y + z - 5 = 0?",
            options: ["A. n = (2; -3; 1)", "B. n = (2; 3; 1)", "C. n = (2; -3; -5)", "D. n = (-3; 1; -5)"],
            correct: "A",
            explanation: "Mặt phẳng Ax + By + Cz + D = 0 có một véc tơ pháp tuyến là n = (A; B; C) = (2; -3; 1)."
        },
        {
            id: "m_8", subject: "Toán", grade: "12", period: "mid1", topic: "Ứng dụng đạo hàm khảo sát hàm số",
            content: "Đồ thị hàm số y = (3x - 1)/(x + 2) có đường tiệm cận ngang là đường thẳng:",
            options: ["A. y = 3", "B. y = -2", "C. x = -2", "D. y = 1/2"],
            correct: "A",
            explanation: "Tiệm cận ngang y = lim_{x → ±∞} (3x - 1)/(x + 2) = 3/1 = 3."
        },
        {
            id: "m_9", subject: "Toán", grade: "12", period: "final2", topic: "Xác suất có điều kiện",
            content: "Một hộp chứa 5 quả cầu xanh và 4 quả cầu đỏ. Chọn ngẫu nhiên 2 quả cầu. Xác suất để chọn được 2 quả cầu màu đỏ là:",
            options: ["A. 1/6", "B. 5/18", "C. 2/9", "D. 4/9"],
            correct: "A",
            explanation: "Tổng số cách chọn 2 quả trong 9 quả là C(9, 2) = 36. Số cách chọn 2 quả đỏ trong 4 quả là C(4, 2) = 6. Xác suất P = 6 / 36 = 1/6."
        },
        {
            id: "m_10", subject: "Toán", grade: "12", period: "mid2", topic: "Nguyên hàm & Tích phân",
            content: "Giá trị của tích phân I = ∫₀¹ (2x + 1) dx bằng:",
            options: ["A. 2", "B. 1", "C. 3", "D. 4"],
            correct: "A",
            explanation: "Ta có I = [x² + x] từ 0 đến 1 = (1² + 1) - (0) = 2."
        },
        {
            id: "m_11", subject: "Toán", grade: "12", period: "mid1", topic: "Ứng dụng đạo hàm khảo sát hàm số",
            content: "Cho hàm số f(x) liên tục trên ℝ và có bảng xét dấu f'(x): f'(x) đổi dấu từ dương sang âm qua x = 1. Khi đó x = 1 là điểm:",
            options: ["A. Cực đại của hàm số", "B. Cực tiểu của hàm số", "C. Tiệm cận của đồ thị", "D. Bất động"],
            correct: "A",
            explanation: "Khi f'(x) đổi dấu từ dương sang âm khi đi qua x₀ thì hàm số đạt cực đại tại x₀."
        },
        {
            id: "m_12", subject: "Toán", grade: "12", period: "final1", topic: "Tọa độ không gian Oxyz",
            content: "Trong không gian Oxyz, cho hai điểm A(1; 2; 3) và B(3; 4; 1). Tọa độ trung điểm M của đoạn thẳng AB là:",
            options: ["A. M(2; 3; 2)", "B. M(4; 6; 4)", "C. M(1; 1; -1)", "D. M(2; 2; 2)"],
            correct: "A",
            explanation: "Tọa độ trung điểm M: x_M = (1+3)/2 = 2; y_M = (2+4)/2 = 3; z_M = (3+1)/2 = 2. Do đó M(2; 3; 2)."
        }
    ],

    "Vật Lí": [
        {
            id: "p_1", subject: "Vật Lí",
            content: "Một con lắc lò xo có độ cứng k, vật nhỏ khối lượng m. Chu kì dao động điều hòa của con lắc được tính bằng công thức:",
            options: ["A. T = 2π√(m/k)", "B. T = 2π√(k/m)", "C. T = (1/2π)√(m/k)", "D. T = 2π√(g/l)"],
            correct: "A",
            explanation: "Chu kì dao động điều hòa của con lắc lò xo là T = 2π√(m/k)."
        },
        {
            id: "p_2", subject: "Vật Lí",
            content: "Một sóng cơ có chu kì T, truyền trong môi trường với vận tốc v. Bước sóng λ của sóng này là:",
            options: ["A. λ = v.T", "B. λ = v/T", "C. λ = T/v", "D. λ = v.f"],
            correct: "A",
            explanation: "Bước sóng là quãng đường mà sóng truyền đi được trong một chu kì: λ = v.T = v/f."
        },
        {
            id: "p_3", subject: "Vật Lí",
            content: "Đặt điện áp u = U₀cos(ωt) vào hai đầu cuộn cảm thuần có độ tự cảm L. Cảm kháng của cuộn cảm là:",
            options: ["A. Z_L = ωL", "B. Z_L = 1/(ωL)", "C. Z_L = ω/L", "D. Z_L = L/ω"],
            correct: "A",
            explanation: "Cảm kháng của cuộn cảm thuần được tính theo công thức Z_L = ωL."
        },
        {
            id: "p_4", subject: "Vật Lí",
            content: "Hiện tượng tán sắc ánh sáng xảy ra do:",
            options: [
                "A. Chiết suất của môi trường trong suốt phụ thuộc vào màu sắc (tần số) ánh sáng",
                "B. Vận tốc của các ánh sáng đơn sắc trong chân không khác nhau",
                "C. Các chùm sáng đơn sắc bị giao thoa với nhau",
                "D. Cường độ của các chùm sáng đơn sắc bị suy giảm khi qua lăng kính"
            ],
            correct: "A",
            explanation: "Nguyên nhân của hiện tượng tán sắc là do chiết suất của môi trường trong suốt phụ thuộc vào tần số (màu sắc) của ánh sáng, chiết suất đối với ánh sáng tím lớn nhất và ánh sáng đỏ nhỏ nhất."
        },
        {
            id: "p_5", subject: "Vật Lí",
            content: "Trong thí nghiệm Y-âng về giao thoa ánh sáng, khoảng vân i được tính bằng công thức nào sau đây?",
            options: ["A. i = λD/a", "B. i = λa/D", "C. i = aD/λ", "D. i = λ/(aD)"],
            correct: "A",
            explanation: "Khoảng cách giữa hai vân sáng hoặc hai vân tối liên tiếp gọi là khoảng vân: i = λD/a."
        },
        {
            id: "p_6", subject: "Vật Lí",
            content: "Theo thuyết lượng tử ánh sáng của Plank và Einstein, năng lượng của một photon ánh sáng có tần số f là:",
            options: ["A. ε = hf", "B. ε = h/f", "C. ε = hf²", "D. ε = f/h"],
            correct: "A",
            explanation: "Mỗi photon mang năng lượng tỉ lệ thuận với tần số ánh sáng: ε = hf = hc/λ (với h là hằng số Planck)."
        },
        {
            id: "p_7", subject: "Vật Lí",
            content: "Nhiệt lượng cần cung cấp để làm nóng một vật có khối lượng m từ nhiệt độ T₁ đến T₂ (nhiệt dung riêng c) là:",
            options: ["A. Q = mc(T₂ - T₁)", "B. Q = m/c(T₂ - T₁)", "C. Q = mc/(T₂ - T₁)", "D. Q = c(T₂ - T₁)/m"],
            correct: "A",
            explanation: "Công thức tính nhiệt lượng theo nhiệt dung riêng: Q = mcΔT = mc(T₂ - T₁)."
        },
        {
            id: "p_8", subject: "Vật Lí",
            content: "Mối liên hệ giữa nhiệt độ tuyệt đối T (Kelvin) và nhiệt độ t (độ Celsius) là:",
            options: ["A. T(K) = t(°C) + 273", "B. T(K) = t(°C) - 273", "C. T(K) = 273 - t(°C)", "D. T(K) = 2t(°C) + 273"],
            correct: "A",
            explanation: "Thang nhiệt độ Kelvin có gốc tại độ không tuyệt đối, mối quan hệ chuẩn: T(K) = t(°C) + 273,15 (làm tròn là + 273)."
        },
        {
            id: "p_9", subject: "Vật Lí",
            content: "Khi một máy biến áp lí tưởng hoạt động, hệ thức đúng liên hệ giữa điện áp và số vòng dây của hai cuộn dây là:",
            options: ["A. U₁/U₂ = N₁/N₂", "B. U₁/U₂ = N₂/N₁", "C. U₁.U₂ = N₁.N₂", "D. U₁/N₂ = U₂/N₁"],
            correct: "A",
            explanation: "Với máy biến áp lí tưởng: tỉ số điện áp hiệu dụng hai đầu cuộn sơ cấp và thứ cấp bằng tỉ số số vòng dây: U₁/U₂ = N₁/N₂."
        },
        {
            id: "p_10", subject: "Vật Lí",
            content: "Một sóng âm truyền từ không khí vào nước thì:",
            options: [
                "A. Tần số không đổi, vận tốc tăng, bước sóng tăng",
                "B. Tần số tăng, vận tốc tăng, bước sóng không đổi",
                "C. Tần số không đổi, vận tốc giảm, bước sóng giảm",
                "D. Tần số giảm, vận tốc tăng, bước sóng giảm"
            ],
            correct: "A",
            explanation: "Khi sóng truyền từ môi trường này sang môi trường khác: tần số f không bao giờ đổi. Vận tốc âm trong nước lớn hơn trong không khí (v_nước > v_khí), do λ = v/f nên bước sóng λ tăng."
        },
        {
            id: "p_11", subject: "Vật Lí",
            content: "Đơn vị đo của cảm ứng từ B trong hệ SI là:",
            options: ["A. Tesla (T)", "B. Vôn (V)", "C. Oét-be (Wb)", "D. Henry (H)"],
            correct: "A",
            explanation: "Cảm ứng từ B có đơn vị là Tesla (kí hiệu T). Từ thông có đơn vị là Wb, độ tự cảm là H."
        },
        {
            id: "p_12", subject: "Vật Lí",
            content: "Quá trình biến đổi trạng thái trong đó nhiệt độ của khối khí được giữ không đổi gọi là quá trình:",
            options: ["A. Đẳng nhiệt", "B. Đẳng áp", "C. Đẳng tích", "D. Đoạn nhiệt"],
            correct: "A",
            explanation: "Quá trình đẳng nhiệt là quá trình biến đổi trạng thái mà nhiệt độ T của khối khí được giữ không đổi (Định luật Boyle)."
        }
    ],

    "Hóa Học": [
        {
            id: "c_1", subject: "Hóa Học",
            content: "Công thức chung của este no, đơn chức, mạch hở là:",
            options: ["A. C_nH_{2n}O₂ (n ≥ 2)", "B. C_nH_{2n-2}O₂ (n ≥ 3)", "C. C_nH_{2n}O (n ≥ 1)", "D. C_nH_{2n+2}O₂ (n ≥ 2)"],
            correct: "A",
            explanation: "Este no, đơn chức, mạch hở có công thức chung là C_nH_{2n}O₂ với n ≥ 2 (nhỏ nhất là metyl fomat HCOOCH₃ có n = 2)."
        },
        {
            id: "c_2", subject: "Hóa Học",
            content: "Thủy phân este etyl axetat (CH₃COOC₂H₅) trong dung dịch NaOH đun nóng thu được muối nào sau đây?",
            options: ["A. CH₃COONa", "B. C₂H₅COONa", "C. HCOONa", "D. C₂H₅ONa"],
            correct: "A",
            explanation: "Phương trình phản ứng xà phòng hóa: CH₃COOC₂H₅ + NaOH → CH₃COONa + C₂H₅OH. Muối thu được là natri axetat (CH₃COONa)."
        },
        {
            id: "c_3", subject: "Hóa Học",
            content: "Chất nào sau đây thuộc loại monosaccarit và có phản ứng tráng bạc?",
            options: ["A. Glucozơ", "B. Saccarozơ", "C. Tinh bột", "D. Xenlulozơ"],
            correct: "A",
            explanation: "Glucozơ là monosaccarit, phân tử có chứa nhóm chức anđehit (-CHO) nên có khả năng tham gia phản ứng tráng bạc với AgNO₃/NH₃."
        },
        {
            id: "c_4", subject: "Hóa Học",
            content: "Chất nào sau đây là amin bậc 1?",
            options: ["A. CH₃-NH₂", "B. (CH₃)₂NH", "C. (CH₃)₃N", "D. CH₃-NH-C₂H₅"],
            correct: "A",
            explanation: "Bậc của amin là số nguyên tử H trong phân tử NH₃ bị thay thế bởi gốc hidrocacbon. Metylamin (CH₃NH₂) có nhóm -NH₂ nên là amin bậc 1."
        },
        {
            id: "c_5", subject: "Hóa Học",
            content: "Amino axit glyxin (H₂N-CH₂-COOH) thể hiện tính chất hóa học nào sau đây?",
            options: ["A. Lưỡng tính", "B. Chỉ có tính axit", "C. Chỉ có tính bazơ", "D. Trung tính"],
            correct: "A",
            explanation: "Phân tử glyxin có nhóm amino (-NH₂) thể hiện tính bazơ và nhóm cacboxyl (-COOH) thể hiện tính axit, do đó có tính chất lưỡng tính."
        },
        {
            id: "c_6", subject: "Hóa Học",
            content: "Polime nào sau đây được điều chế bằng phản ứng trùng hợp?",
            options: ["A. Polietilen (PE)", "B. Nilon-6,6", "C. Tơ lapsan", "D. Tơ tằm"],
            correct: "A",
            explanation: "Polietilen được tạo ra bằng phản ứng trùng hợp monome etilen: n CH₂=CH₂ → (-CH₂-CH₂-)_n."
        },
        {
            id: "c_7", subject: "Hóa Học",
            content: "Kim loại nào sau đây có tính dẫn điện tốt nhất ở điều kiện thường?",
            options: ["A. Bạc (Ag)", "B. Đồng (Cu)", "C. Vàng (Au)", "D. Nhôm (Al)"],
            correct: "A",
            explanation: "Độ dẫn điện của các kim loại giảm dần theo thứ tự: Ag > Cu > Au > Al > Fe."
        },
        {
            id: "c_8", subject: "Hóa Học",
            content: "Để bảo quản kim loại kiềm như natri (Na), người ta thường ngâm chìm chúng trong chất lỏng nào?",
            options: ["A. Dầu hỏa", "B. Nước cất", "C. Cồn etylic", "D. Dung dịch giấm ăn"],
            correct: "A",
            explanation: "Natri phản ứng rất mãnh liệt với nước và oxi trong không khí, nhưng không phản ứng với dầu hỏa. Do đó người ta ngâm natri trong dầu hỏa để bảo quản."
        },
        {
            id: "c_9", subject: "Hóa Học",
            content: "Cation kim loại nào sau đây có tính oxi hóa mạnh nhất trong dãy điện hóa?",
            options: ["A. Ag⁺", "B. Cu²⁺", "C. Fe²⁺", "D. Al³⁺"],
            correct: "A",
            explanation: "Trong dãy điện hóa, tính oxi hóa của cation kim loại tăng dần từ trái sang phải: Al³⁺ < Fe²⁺ < Cu²⁺ < Ag⁺. Do đó Ag⁺ có tính oxi hóa mạnh nhất."
        },
        {
            id: "c_10", subject: "Hóa Học",
            content: "Khi cho thanh sắt nguyên chất cắm vào dung dịch CuSO₄, hiện tượng quan sát được là:",
            options: [
                "A. Có kim loại màu đỏ bám ngoài thanh sắt, dung dịch nhạt màu xanh dần",
                "B. Thanh sắt tan ra và có khí không màu thoát ra mãnh liệt",
                "C. Xuất hiện kết tủa màu nâu đỏ lơ lửng trong dung dịch",
                "D. Không có bất kì phản ứng nào xảy ra"
            ],
            correct: "A",
            explanation: "Phản ứng Fe + CuSO₄ → FeSO₄ + Cu. Đồng sinh ra có màu đỏ bám trên bề mặt sắt, đồng thời ion Cu²⁺ (màu xanh) bị tiêu hao nên màu xanh của dung dịch nhạt dần."
        },
        {
            id: "c_11", subject: "Hóa Học",
            content: "Nước cứng là nước có chứa nhiều ion nào sau đây?",
            options: ["A. Ca²⁺ và Mg²⁺", "B. Na⁺ và K⁺", "C. Cl⁻ và SO₄²⁻", "D. Fe²⁺ và Cu²⁺"],
            correct: "A",
            explanation: "Theo định nghĩa, nước cứng là nước tự nhiên chứa hàm lượng đáng kể các ion Ca²⁺ và Mg²⁺."
        },
        {
            id: "c_12", subject: "Hóa Học",
            content: "Chất khí nào sau đây gây ra hiệu ứng nhà kính mạnh nhất do các hoạt động của con người?",
            options: ["A. CO₂", "B. O₂", "C. N₂", "D. H₂"],
            correct: "A",
            explanation: "Khí cacbonic (CO₂) sinh ra từ việc đốt nhiên liệu hóa thạch là tác nhân chính gây ra hiệu ứng nhà kính và biến đổi khí hậu toàn cầu."
        }
    ],

    "Sinh Học": [
        {
            id: "b_1", subject: "Sinh Học",
            content: "Trong cấu trúc của gen, bộ ba mở đầu mã hóa cho axit amin Mêtiônin ở sinh vật nhân thực là:",
            options: ["A. 5' AUG 3'", "B. 3' AUG 5'", "C. 5' UAA 3'", "D. 5' UAG 3'"],
            correct: "A",
            explanation: "Bộ ba mở đầu trên phân tử mARN là 5' AUG 3', quy định tổng hợp axit amin Foocmin-mêtiônin (nhân sơ) hoặc Mêtiônin (nhân thực)."
        },
        {
            id: "b_2", subject: "Sinh Học",
            content: "Quá trình nhân đôi ADN diễn ra theo nguyên tắc nào sau đây?",
            options: [
                "A. Nguyên tắc bổ sung và nguyên tắc bán bảo toàn",
                "B. Nguyên tắc bổ sung và nguyên tắc bảo tồn",
                "C. Chỉ theo nguyên tắc bán bảo toàn",
                "D. Nguyên tắc khuôn mẫu và nguyên tắc gián đoạn"
            ],
            correct: "A",
            explanation: "Quá trình nhân đôi ADN diễn ra theo hai nguyên tắc cốt lõi: nguyên tắc bổ sung (A-T, G-X) và nguyên tắc bán bảo toàn (giữ lại 1 mạch cũ trong mỗi phân tử ADN con)."
        },
        {
            id: "b_3", subject: "Sinh Học",
            content: "Một gen bị đột biến điểm thay thế một cặp A-T bằng một cặp G-X. Số liên kết hiđrô của gen thay đổi như thế nào?",
            options: ["A. Tăng 1 liên kết", "B. Giảm 1 liên kết", "C. Không đổi", "D. Tăng 2 liên kết"],
            correct: "A",
            explanation: "Cặp A-T có 2 liên kết hiđrô, cặp G-X có 3 liên kết hiđrô. Khi thay thế A-T bằng G-X thì số liên kết hiđrô tăng lên: 3 - 2 = 1."
        },
        {
            id: "b_4", subject: "Sinh Học",
            content: "Theo quy luật phân li của Men-đen, phép lai P: Aa × Aa cho tỉ lệ phân li kiểu hình ở thế hệ con là:",
            options: ["A. 3 trội : 1 lặn", "B. 1 trội : 1 lặn", "C. 100% trội", "D. 1 trội : 2 trung gian : 1 lặn"],
            correct: "A",
            explanation: "Phép lai Aa × Aa cho tỉ lệ kiểu gen là 1 AA : 2 Aa : 1 aa, tương ứng tỉ lệ kiểu hình 3 tính trạng trội : 1 tính trạng lặn (với trội hoàn toàn)."
        },
        {
            id: "b_5", subject: "Sinh Học",
            content: "Tần số hoán vị gen giữa hai gen trên cùng một nhiễm sắc thể không bao giờ vượt quá:",
            options: ["A. 50%", "B. 25%", "C. 75%", "D. 100%"],
            correct: "A",
            explanation: "Do trao đổi chéo chỉ xảy ra giữa 2 trong 4 cromatit của cặp nhiễm sắc thể kép tương đồng nên tần số hoán vị gen tối đa là 50%."
        },
        {
            id: "b_6", subject: "Sinh Học",
            content: "Cơ quan tương đồng phản ánh dạng tiến hóa nào sau đây?",
            options: ["A. Tiến hóa phân li", "B. Tiến hóa đồng quy", "C. Tiến hóa đảo ngược", "D. Tiến hóa đột ngột"],
            correct: "A",
            explanation: "Cơ quan tương đồng là những cơ quan có cùng nguồn gốc từ một cơ quan ở loài tổ tiên, mặc dù hiện tại có thể thực hiện các chức năng khác nhau. Đây là bằng chứng của tiến hóa phân li."
        },
        {
            id: "b_7", subject: "Sinh Học",
            content: "Trong một chuỗi thức ăn trên cạn: Cỏ → Châu chấu → Ếch → Rắn → Đại bàng. Bậc dinh dưỡng cấp 3 là loài nào?",
            options: ["A. Ếch", "B. Châu chấu", "C. Rắn", "D. Cỏ"],
            correct: "A",
            explanation: "Bậc dinh dưỡng 1 là Cỏ (sinh vật sản xuất); bậc dinh dưỡng 2 là Châu chấu; bậc dinh dưỡng 3 là Ếch; bậc 4 là Rắn; bậc 5 là Đại bàng."
        },
        {
            id: "b_8", subject: "Sinh Học",
            content: "Mối quan hệ giữa hải quỳ và cua cộng cư (cùng có lợi và không bắt buộc) là ví dụ về mối quan hệ:",
            options: ["A. Hợp tác", "B. Cộng sinh", "C. Hội sinh", "D. Kí sinh"],
            correct: "A",
            explanation: "Cả hai loài cùng có lợi nhưng không nhất thiết phải gắn liền sống chết với nhau, đây là mối quan hệ hợp tác. (Nếu bắt buộc sống chung thì là cộng sinh)."
        },
        {
            id: "b_9", subject: "Sinh Học",
            content: "Trong quần thể ngẫu phối đạt trạng thái cân bằng Hacdi - Vanbec có tần số alen A là p = 0,6; tần số alen a là q = 0,4. Tỉ lệ kiểu gen dị hợp Aa là:",
            options: ["A. 0,48", "B. 0,36", "C. 0,16", "D. 0,24"],
            correct: "A",
            explanation: "Theo định luật Hacdi - Vanbec, cấu trúc di truyền là p² AA + 2pq Aa + q² aa = 1. Tỉ lệ kiểu gen Aa là 2pq = 2 × 0,6 × 0,4 = 0,48 (48%)."
        },
        {
            id: "b_10", subject: "Sinh Học",
            content: "Đặc trưng cơ bản nào sau đây quyết định kích thước và sự tồn tại lâu dài của một quần thể sinh vật?",
            options: ["A. Tỉ lệ sinh sản và tử vong", "B. Màu sắc cá thể", "C. Kiểu gen đột biến", "D. Mật độ cá thể"],
            correct: "A",
            explanation: "Kích thước của quần thể phụ thuộc trực tiếp vào 4 yếu tố: mức sinh sản, mức tử vong, mức nhập cư và xuất cư."
        },
        {
            id: "b_11", subject: "Sinh Học",
            content: "Quá trình quang hợp ở thực vật diễn ra tại bào quan nào sau đây?",
            options: ["A. Lục lạp", "B. Ti thể", "C. Không bào", "D. Lưới nội chất"],
            correct: "A",
            explanation: "Lục lạp chứa chất diệp lục hấp thu năng lượng ánh sáng mặt trời để thực hiện pha sáng và pha tối của quang hợp."
        },
        {
            id: "b_12", subject: "Sinh Học",
            content: "Hội chứng Đao ở người là do đột biến nào gây ra?",
            options: ["A. Thể ba ở cặp nhiễm sắc thể số 21", "B. Mất đoạn nhiễm sắc thể số 5", "C. Thể một ở cặp nhiễm sắc thể giới tính", "D. Đột biến gen lặn"],
            correct: "A",
            explanation: "Hội chứng Đao do người bệnh có 3 nhiễm sắc thể ở cặp số 21 (thể ba cặp 21, 2n + 1 = 47)."
        }
    ],

    "Lịch Sử": [
        {
            id: "h_1", subject: "Lịch Sử",
            content: "Phương châm tác chiến được Đại tướng Võ Nguyên Giáp chuyển đổi trong Chiến dịch Điện Biên Phủ (1954) là:",
            options: [
                "A. Từ 'Đánh nhanh, thắng nhanh' sang 'Đánh chắc, tiến chắc'",
                "B. Từ 'Đánh chắc, tiến chắc' sang 'Đánh nhanh, thắng nhanh'",
                "C. Từ 'Đánh du kích' sang 'Bao vây đánh lấn'",
                "D. Từ 'Phòng ngự tích cực' sang 'Tổng phản công'"
            ],
            correct: "A",
            explanation: "Đại tướng Võ Nguyên Giáp đã có 'quyết định khó khăn nhất' chuyển từ phương châm 'Đánh nhanh, thắng nhanh' sang 'Đánh chắc, tiến chắc' để bảo toàn lực lượng và đảm bảo chắc thắng 100%."
        },
        {
            id: "h_2", subject: "Lịch Sử",
            content: "Thắng lợi nào đã chuyển cách mạng miền Nam từ thế giữ gìn lực lượng sang thế tiến công (1959 - 1960)?",
            options: ["A. Phong trào Đồng Khởi", "B. Chiến thắng Ấp Bắc", "C. Cuộc Tổng tiến công Mậu Thân 1968", "D. Chiến dịch Tây Nguyên"],
            correct: "A",
            explanation: "Phong trào Đồng Khởi (bùng nổ mạnh nhất tại Bến Tre) đã giáng đòn nặng nề vào chính sách thực dân mới của Mĩ, đưa cách mạng miền Nam sang thế tiến công."
        },
        {
            id: "h_3", subject: "Lịch Sử",
            content: "Chiến dịch mang tên Bác kết thúc thắng lợi cuộc kháng chiến chống Mĩ, cứu nước năm 1975 là:",
            options: ["A. Chiến dịch Hồ Chí Minh", "B. Chiến dịch Tây Nguyên", "C. Chiến dịch Huế - Đà Nẵng", "D. Chiến dịch Đường 9 - Khe Sanh"],
            correct: "A",
            explanation: "Chiến dịch Hồ Chí Minh (26/4 đến 30/4/1975) giải phóng hoàn toàn Sài Gòn - Gia Định, thống nhất non sông đất nước."
        },
        {
            id: "h_4", subject: "Lịch Sử",
            content: "Mục tiêu hàng đầu của tổ chức Liên Hợp Quốc khi được thành lập (năm 1945) là:",
            options: [
                "A. Duy trì hòa bình và an ninh thế giới",
                "B. Phát triển thương mại tự do toàn cầu",
                "C. Xóa bỏ hoàn toàn vũ khí hạt nhân",
                "D. Cung cấp viện trợ kinh tế cho các nước nghèo"
            ],
            correct: "A",
            explanation: "Theo Hiến chương Liên Hợp Quốc, mục tiêu lớn nhất là duy trì hòa bình và an ninh quốc tế, thúc đẩy quan hệ hữu nghị giữa các dân tộc."
        },
        {
            id: "h_5", subject: "Lịch Sử",
            content: "Đại hội đại biểu toàn quốc lần thứ VI của Đảng Cộng sản Việt Nam (12/1986) đã đề ra đường lối nào mang tính bước ngoặt?",
            options: [
                "A. Đường lối Đổi mới toàn diện đất nước",
                "B. Tiến hành công nghiệp hóa xã hội chủ nghĩa",
                "C. Xây dựng nền kinh tế tập trung bao cấp",
                "D. Gia nhập Tổ chức Thương mại Thế giới (WTO)"
            ],
            correct: "A",
            explanation: "Đại hội VI (12/1986) mở đầu công cuộc Đổi mới đất nước, trọng tâm là đổi mới về kinh tế kết hợp từng bước đổi mới về chính trị."
        },
        {
            id: "h_6", subject: "Lịch Sử",
            content: "Nội dung nào sau đây là nguyên tắc hoạt động cơ bản của Hiệp hội các quốc gia Đông Nam Á (ASEAN)?",
            options: [
                "A. Tôn trọng độc lập, chủ quyền và không can thiệp vào công việc nội bộ của nhau",
                "B. Thành lập liên minh quân sự chung để bảo vệ khu vực",
                "C. Sử dụng một đồng tiền chung duy nhất cho toàn khối",
                "D. Xóa bỏ hoàn toàn biên giới giữa các nước thành viên"
            ],
            correct: "A",
            explanation: "Hiệp ước Bali (1976) xác định nguyên tắc cơ bản của ASEAN là tôn trọng chủ quyền, toàn vẹn lãnh thổ và không can thiệp vào công việc nội bộ của nhau."
        },
        {
            id: "h_7", subject: "Lịch Sử",
            content: "Văn kiện nào được Chủ tịch Hồ Chí Minh đọc tại Quảng trường Ba Đình ngày 2/9/1945 khai sinh ra nước Việt Nam Dân chủ Cộng hòa?",
            options: ["A. Tuyên ngôn Độc lập", "B. Lời kêu gọi toàn quốc kháng chiến", "C. Bản Cương lĩnh chính trị đầu tiên", "D. Bản Di chúc thiêng liêng"],
            correct: "A",
            explanation: "Ngày 2/9/1945, Chủ tịch Hồ Chí Minh đọc Bản Tuyên ngôn Độc lập, tuyên bố với thế giới sự ra đời của nước Việt Nam Dân chủ Cộng hòa."
        },
        {
            id: "h_8", subject: "Lịch Sử",
            content: "Sau Chiến tranh Lạnh, xu thế phát triển chủ đạo của thế giới là:",
            options: [
                "A. Hòa bình, hữu nghị, hợp tác và phát triển",
                "B. Chạy đua vũ trang và đối đầu căng thẳng",
                "C. Phân chia thế giới thành hai cực đối lập",
                "D. Chiến tranh thương mại khốc liệt"
            ],
            correct: "A",
            explanation: "Sau khi Chiến tranh Lạnh chấm dứt, xu thế chủ đạo là hòa bình, ổn định và hợp tác cùng phát triển kinh tế."
        },
        {
            id: "h_9", subject: "Lịch Sử",
            content: "Chiến thắng nào của quân và dân ta ở miền Bắc được coi là trận 'Điện Biên Phủ trên không' năm 1972?",
            options: [
                "A. Đánh bại cuộc tập kích chiến lược bằng B-52 của Mĩ vào Hà Nội, Hải Phòng",
                "B. Bắn rơi máy bay trinh sát U-2 của Mĩ",
                "C. Chiến dịch Đường 9 - Nam Lào",
                "D. Chiến thắng Vạn Tường"
            ],
            correct: "A",
            explanation: "12 ngày đêm cuối năm 1972, quân dân Hà Nội - Hải Phòng đánh bại cuộc tập kích bằng B52 của Mĩ, buộc Mĩ phải ký Hiệp định Pari năm 1973."
        },
        {
            id: "h_10", subject: "Lịch Sử",
            content: "Hội nghị thành lập Đảng Cộng sản Việt Nam vào đầu năm 1930 diễn ra tại đâu?",
            options: ["A. Cửu Long (Hương Cảng, Trung Quốc)", "B. Quảng Châu (Trung Quốc)", "C. Ma Cao (Trung Quốc)", "D. Pác Bó (Cao Bằng)"],
            correct: "A",
            explanation: "Hội nghị hợp nhất các tổ chức cộng sản do Nguyễn Ái Quốc chủ trì diễn ra tại Cửu Long (Hương Cảng, Trung Quốc) từ 6/1/1930."
        },
        {
            id: "h_11", subject: "Lịch Sử",
            content: "Đặc điểm nổi bật của cuộc Cách mạng khoa học - công nghệ hiện đại nửa sau thế kỉ XX là:",
            options: [
                "A. Khoa học trở thành lực lượng sản xuất trực tiếp",
                "B. Kĩ thuật đi trước mở đường cho khoa học",
                "C. Chỉ phát triển trong lĩnh vực quân sự",
                "D. Không làm thay đổi cơ cấu kinh tế xã hội"
            ],
            correct: "A",
            explanation: "Thời kì này, mọi phát minh kĩ thuật đều bắt nguồn từ nghiên cứu khoa học cơ bản, khoa học gắn liền trực tiếp với sản xuất."
        },
        {
            id: "h_12", subject: "Lịch Sử",
            content: "Cương lĩnh chính trị đầu tiên của Đảng Cộng sản Việt Nam xác định nhiệm vụ cách mạng nước ta gồm:",
            options: [
                "A. Đánh đổ đế quốc và phong kiến tay sai, giành độc lập dân tộc và ruộng đất cho dân cày",
                "B. Đánh đổ phong kiến trước, đánh đổ đế quốc sau",
                "C. Tập trung phát triển kinh tế tư bản chủ nghĩa",
                "D. Tham gia vào liên minh các nước Đông Âu"
            ],
            correct: "A",
            explanation: "Cương lĩnh do Nguyễn Ái Quốc soạn thảo xác định hai nhiệm vụ dân tộc và dân chủ, trong đó chống đế quốc giành độc lập là nhiệm vụ hàng đầu."
        }
    ],

    "Địa Lí": [
        {
            id: "g_1", subject: "Địa Lí",
            content: "Nước ta có vị trí nằm hoàn toàn trong vùng nội chí tuyến bán cầu Bắc, điều này làm cho thiên nhiên nước ta có đặc tính:",
            options: [
                "A. Tính chất nhiệt đới ẩm gió mùa",
                "B. Khí hậu ôn đới lục địa sâu sắc",
                "C. Hoang mạc hóa diện rộng",
                "D. Bốn mùa lạnh quanh năm"
            ],
            correct: "A",
            explanation: "Vị trí nằm trong vùng nội chí tuyến bán cầu Bắc, tiếp giáp Biển Đông giúp Việt Nam có tổng lượng bức xạ lớn, nhiệt độ cao và độ ẩm dồi dào, mang tính chất nhiệt đới ẩm gió mùa."
        },
        {
            id: "g_2", subject: "Địa Lí",
            content: "Gió mùa mùa đông ở miền Bắc nước ta có hướng thổi chủ yếu là:",
            options: ["A. Đông Bắc", "B. Tây Nam", "C. Đông Nam", "D. Tây Bắc"],
            correct: "A",
            explanation: "Khối khí lạnh phương Bắc di chuyển lệch hướng do lực Côriôlit tạo thành gió mùa Đông Bắc, gây nên mùa đông lạnh ở miền Bắc."
        },
        {
            id: "g_3", subject: "Địa Lí",
            content: "Vùng kinh tế trọng điểm nào của nước ta có tỉ trọng đóng góp công nghiệp và dịch vụ lớn nhất cả nước?",
            options: ["A. Vùng Đông Nam Bộ", "B. Vùng Tây Nguyên", "C. Vùng Bắc Trung Bộ", "D. Vùng Trung du và miền núi Bắc Bộ"],
            correct: "A",
            explanation: "Đông Nam Bộ (hạt nhân là TP. Hồ Chí Minh) là vùng kinh tế năng động nhất, thu hút vốn đầu tư FDI và đóng góp GDP công nghiệp lớn nhất cả nước."
        },
        {
            id: "g_4", subject: "Địa Lí",
            content: "Thế mạnh nổi bật nhất của vùng Tây Nguyên trong nông nghiệp là:",
            options: [
                "A. Chuyên canh cây công nghiệp lâu năm (cà phê, cao su, tiêu)",
                "B. Thâm canh lúa nước năng suất cao",
                "C. Nuôi trồng thủy sản nước lợ",
                "D. Trồng trọt cây ăn quả xứ lạnh ôn đới"
            ],
            correct: "A",
            explanation: "Với đất bazan màu mỡ và khí hậu cận xích đạo, Tây Nguyên là thủ phủ cây công nghiệp lâu năm của nước ta, đặc biệt là cà phê và hồ tiêu."
        },
        {
            id: "g_5", subject: "Địa Lí",
            content: "Hiện tượng xâm nhập mặn vào mùa khô ảnh hưởng nặng nề nhất đến vùng nông nghiệp nào của nước ta?",
            options: ["A. Đồng bằng sông Cửu Long", "B. Đồng bằng sông Hồng", "C. Duyên hải Nam Trung Bộ", "D. Trung du Bắc Bộ"],
            correct: "A",
            explanation: "Đồng bằng sông Cửu Long địa hình thấp, mạng lưới sông rạch chằng chịt, vào mùa khô dòng chảy sông Mê Kông suy giảm khiến nước biển lấn sâu vào đất liền."
        },
        {
            id: "g_6", subject: "Địa Lí",
            content: "Đường bờ biển của nước ta kéo dài từ Quảng Ninh đến Kiên Giang có chiều dài khoảng:",
            options: ["A. 3.260 km", "B. 2.360 km", "C. 4.600 km", "D. 1.800 km"],
            correct: "A",
            explanation: "Đường bờ biển Việt Nam dài 3.260 km, trải dài từ Móng Cái (Quảng Ninh) đến Hà Tiên (Kiên Giang)."
        },
        {
            id: "g_7", subject: "Địa Lí",
            content: "Nguyên nhân chủ yếu làm cho quá trình đô thị hóa ở nước ta hiện nay diễn ra ngày càng nhanh là:",
            options: [
                "A. Quá trình công nghiệp hóa và hiện đại hóa phát triển",
                "B. Dân số nông thôn giảm mạnh",
                "C. Tài nguyên thiên nhiên phong phú",
                "D. Khí hậu biến đổi thuận lợi"
            ],
            correct: "A",
            explanation: "Đô thị hóa gắn liền với phát triển công nghiệp và dịch vụ, mở rộng các khu công nghiệp, đô thị mới."
        },
        {
            id: "g_8", subject: "Địa Lí",
            content: "Hai quần đảo xa bờ có ý nghĩa chiến lược sâu sắc về an ninh quốc phòng và kinh tế biển của nước ta là:",
            options: ["A. Hoàng Sa và Trường Sa", "B. Côn Đảo và Phú Quốc", "C. Cô Tô và Bạch Long Vĩ", "D. Cát Bà và Lý Sơn"],
            correct: "A",
            explanation: "Quần đảo Hoàng Sa (thuộc TP Đà Nẵng) và Trường Sa (thuộc tỉnh Khánh Hòa) là chủ quyền thiêng liêng trên Biển Đông."
        },
        {
            id: "g_9", subject: "Địa Lí",
            content: "Trong cơ cấu ngành kinh tế nước ta, xu hướng chuyển dịch tích cực hiện nay là:",
            options: [
                "A. Giảm tỉ trọng Nông - Lâm - Thủy sản, tăng tỉ trọng Công nghiệp - Dịch vụ",
                "B. Tăng mạnh tỉ trọng Nông nghiệp, giảm Dịch vụ",
                "C. Chỉ tập trung phát triển ngành Khai khoáng",
                "D. Giữ nguyên tỉ trọng các ngành qua các năm"
            ],
            correct: "A",
            explanation: "Cơ cấu kinh tế nước ta chuyển dịch theo hướng hiện đại hóa: giảm tỉ trọng khu vực I (Nông nghiệp), tăng nhanh khu vực II (Công nghiệp) và khu vực III (Dịch vụ)."
        },
        {
            id: "g_10", subject: "Địa Lí",
            content: "Vùng nào ở nước ta có mật độ dân số cao nhất?",
            options: ["A. Đồng bằng sông Hồng", "B. Đồng bằng sông Cửu Long", "C. Đông Nam Bộ", "D. Tây Bắc"],
            correct: "A",
            explanation: "Đồng bằng sông Hồng có lịch sử khai cư lâu đời và thâm canh lúa nước, mật độ dân số cao nhất cả nước (trên 1.000 người/km²)."
        },
        {
            id: "g_11", subject: "Địa Lí",
            content: "Loại đất có diện tích lớn nhất ở vùng đồi núi nước ta là:",
            options: ["A. Đất feralit", "B. Đất phù sa ngọt", "C. Đất cát pha", "D. Đất phèn, đất mặn"],
            correct: "A",
            explanation: "Quá trình feralit là quá trình hình thành đất chủ yếu ở vùng đồi núi nhiệt đới ẩm nước ta (chiếm hơn 65% diện tích tự nhiên)."
        },
        {
            id: "g_12", subject: "Địa Lí",
            content: "Tuyến giao thông đường bộ huyết mạch chạy dọc chiều dài đất nước nối liền Lạng Sơn đến Cà Mau là:",
            options: ["A. Quốc lộ 1", "B. Đường Hồ Chí Minh", "C. Quốc lộ 14", "D. Cao tốc Bắc Nam"],
            correct: "A",
            explanation: "Quốc lộ 1 là trục giao thông xương sống nối liền các trung tâm kinh tế từ Bắc vào Nam."
        }
    ],

    "GDKT&PL": [
        {
            id: "l_1", subject: "GDKT&PL",
            content: "Theo quy luật giá trị, việc sản xuất và trao đổi hàng hóa phải dựa trên cơ sở nào?",
            options: [
                "A. Hao phí lao động xã hội cần thiết",
                "B. Ý chí chủ quan của người sản xuất",
                "C. Hao phí lao động cá biệt của từng người",
                "D. Giá cả quy định của thương lái"
            ],
            correct: "A",
            explanation: "Quy luật giá trị yêu cầu việc sản xuất và lưu thông hàng hóa phải căn cứ trên thời gian lao động xã hội cần thiết chứ không theo sở thích cá nhân."
        },
        {
            id: "l_2", subject: "GDKT&PL",
            content: "Khi lượng cung lớn hơn lượng cầu trên thị trường thì giá cả hàng hóa thường có xu hướng:",
            options: ["A. Giảm xuống", "B. Tăng lên", "C. Không thay đổi", "D. Biến động cực mạnh"],
            correct: "A",
            explanation: "Cung > Cầu (hàng hóa dồi dào, người mua ít) thì người bán phải cạnh tranh hạ giá để tiêu thụ sản phẩm."
        },
        {
            id: "l_3", subject: "GDKT&PL",
            content: "Theo Hiến pháp nước CHXHCN Việt Nam, công dân đủ bao nhiêu tuổi trở lên có quyền bầu cử Quốc hội và HĐND?",
            options: ["A. Đủ 18 tuổi", "B. Đủ 20 tuổi", "C. Đủ 21 tuổi", "D. Đủ 16 tuổi"],
            correct: "A",
            explanation: "Theo Điều 27 Hiến pháp: Công dân đủ mười tám tuổi trở lên có quyền bầu cử và đủ hai mươi mốt tuổi trở lên có quyền ứng cử vào Quốc hội, Hội đồng nhân dân."
        },
        {
            id: "l_4", subject: "GDKT&PL",
            content: "Hình thức thực hiện pháp luật trong đó các cá nhân, tổ chức chủ động thực hiện đầy đủ nghĩa vụ mà pháp luật quy định là:",
            options: ["A. Thi hành pháp luật", "B. Sử dụng pháp luật", "C. Tuân thủ pháp luật", "D. Áp dụng pháp luật"],
            correct: "A",
            explanation: "Thi hành pháp luật là việc cá nhân, cơ quan chủ động làm những gì mà pháp luật bắt buộc phải làm (như nộp thuế, đăng ký nghĩa vụ quân sự)."
        },
        {
            id: "l_5", subject: "GDKT&PL",
            content: "Hợp đồng lao động phải được giao kết bằng hình thức nào là chủ yếu đối với công việc có thời hạn từ 1 tháng trở lên?",
            options: ["A. Bằng văn bản", "B. Bằng lời nói", "C. Bằng hành vi cụ thể", "D. Bằng tin nhắn điện thoại"],
            correct: "A",
            explanation: "Theo Bộ luật Lao động, hợp đồng lao động phải được giao kết bằng văn bản hoặc thông điệp dữ liệu điện tử để đảm bảo quyền lợi đôi bên."
        },
        {
            id: "l_6", subject: "GDKT&PL",
            content: "Quyền bình đẳng trong kinh doanh có nghĩa là:",
            options: [
                "A. Mọi công dân, doanh nghiệp đều có quyền tự do kinh doanh ngành nghề pháp luật không cấm",
                "B. Mọi doanh nghiệp đều phải nộp số tiền thuế bằng nhau",
                "C. Doanh nghiệp nhà nước luôn được ưu đãi tuyệt đối so với tư nhân",
                "D. Được tự do xả thải mà không cần xử lý môi trường"
            ],
            correct: "A",
            explanation: "Bình đẳng trong kinh doanh bảo đảm quyền tự do lựa chọn ngành nghề, hình thức tổ chức kinh doanh và bình đẳng trước pháp luật của mọi chủ thể kinh tế."
        },
        {
            id: "l_7", subject: "GDKT&PL",
            content: "Hiện tượng mức giá chung của các hàng hóa và dịch vụ tăng lên liên tục trong một khoảng thời gian được gọi là:",
            options: ["A. Lạm phát", "B. Thiểu phát", "C. Khủng hoảng thừa", "D. Thặng dư"],
            correct: "A",
            explanation: "Lạm phát là sự tăng mức giá chung kéo dài của hàng hóa và dịch vụ, dẫn đến sự giảm sút sức mua của đồng tiền."
        },
        {
            id: "l_8", subject: "GDKT&PL",
            content: "Ngân sách nhà nước là toàn bộ các khoản thu, chi của Nhà nước được dự toán và thực hiện trong một khoảng thời gian do cơ quan nào quyết định?",
            options: ["A. Quốc hội", "B. Chính phủ", "C. Bộ Tài chính", "D. Tòa án nhân dân"],
            correct: "A",
            explanation: "Quốc hội là cơ quan quyền lực nhà nước cao nhất có thẩm quyền quyết định dự toán và phân bổ ngân sách nhà nước."
        },
        {
            id: "l_9", subject: "GDKT&PL",
            content: "Quyền sáng tạo của công dân bao gồm quyền nào sau đây?",
            options: [
                "A. Quyền tác giả, quyền sở hữu công nghiệp và hoạt động khoa học công nghệ",
                "B. Quyền tự do buôn bán hàng giả",
                "C. Quyền sao chép bản quyền của người khác không xin phép",
                "D. Quyền chỉ học tập ở bậc phổ thông"
            ],
            correct: "A",
            explanation: "Quyền sáng tạo bao gồm quyền của tác giả đối với sáng chế, phát minh, giải pháp hữu ích, tác phẩm văn học nghệ thuật."
        },
        {
            id: "l_10", subject: "GDKT&PL",
            content: "Vợ, chồng có quyền và nghĩa vụ ngang nhau trong việc sở hữu tài sản chung của gia đình thể hiện quyền bình đẳng trong quan hệ:",
            options: ["A. Tài sản", "B. Nhân thân", "C. Xã hội", "D. Việc làm"],
            correct: "A",
            explanation: "Quan hệ tài sản giữa vợ và chồng bảo đảm bình đẳng trong việc chiếm hữu, sử dụng và định đoạt tài sản chung hợp pháp."
        },
        {
            id: "l_11", subject: "GDKT&PL",
            content: "Hành vi không đội mũ bảo hiểm khi đi xe máy trên đường là hành vi vi phạm pháp luật nào?",
            options: ["A. Vi phạm hành chính", "B. Vi phạm hình sự", "C. Vi phạm dân sự", "D. Vi phạm kỷ luật"],
            correct: "A",
            explanation: "Vi phạm quy định an toàn giao thông mà chưa đến mức truy cứu trách nhiệm hình sự thì bị xử phạt vi phạm hành chính."
        },
        {
            id: "l_12", subject: "GDKT&PL",
            content: "Bảo vệ Tổ quốc là nghĩa vụ thiêng liêng và quyền cao quý của:",
            options: ["A. Mọi công dân Việt Nam", "B. Riêng lực lượng quân đội", "C. Riêng cán bộ công chức", "D. Chỉ những người trong độ tuổi thanh niên"],
            correct: "A",
            explanation: "Theo Hiến pháp: Bảo vệ Tổ quốc là nghĩa vụ thiêng liêng và quyền cao quý của mọi công dân Việt Nam."
        }
    ],

    "Tiếng Anh": [
        {
            id: "e_1", subject: "Tiếng Anh",
            content: "If I ________ you, I would spend more time preparing for the final exam.",
            options: ["A. were", "B. am", "C. will be", "D. have been"],
            correct: "A",
            explanation: "Câu điều kiện loại 2 diễn tả giả định trái ngược với thực tế ở hiện tại: If + S + were/V-ed, S + would + V(bare)."
        },
        {
            id: "e_2", subject: "Tiếng Anh",
            content: "The bridge ________ connects the two provinces was built in 2022.",
            options: ["A. which", "B. who", "C. whom", "D. whose"],
            correct: "A",
            explanation: "Đại từ quan hệ 'which' được dùng để thay thế cho danh từ chỉ vật 'The bridge' làm chủ ngữ trong mệnh đề quan hệ."
        },
        {
            id: "e_3", subject: "Tiếng Anh",
            content: "Lan is very fond ________ listening to English music in her free time.",
            options: ["A. of", "B. in", "C. at", "D. with"],
            correct: "A",
            explanation: "Cụm tính từ đi với giới từ cố định: 'be fond of + V-ing' nghĩa là yêu thích điều gì đó."
        },
        {
            id: "e_4", subject: "Tiếng Anh",
            content: "She hasn't seen her best friend ________ they graduated from high school.",
            options: ["A. since", "B. for", "C. while", "D. during"],
            correct: "A",
            explanation: "Thì hiện tại hoàn thành: 'since + mốc thời gian / mệnh đề quá khứ đơn' (kể từ khi họ tốt nghiệp)."
        },
        {
            id: "e_5", subject: "Tiếng Anh",
            content: "The teacher asked the students to ________ off their smartphones before the test.",
            options: ["A. turn", "B. take", "C. put", "D. get"],
            correct: "A",
            explanation: "Cụm động từ 'turn off' có nghĩa là tắt (thiết bị điện tử). 'Turn on' là bật."
        },
        {
            id: "e_6", subject: "Tiếng Anh",
            content: "You didn't do your homework yesterday, ________?",
            options: ["A. did you", "B. didn't you", "C. do you", "D. was you"],
            correct: "A",
            explanation: "Câu hỏi đuôi (Tag question): vế trước ở dạng phủ định quá khứ đơn 'didn't do' nên vế đuôi phải là khẳng định 'did you?'."
        },
        {
            id: "e_7", subject: "Tiếng Anh",
            content: "Despite ________ hard, he could not pass the entrance examination.",
            options: ["A. studying", "B. study", "C. studied", "D. to study"],
            correct: "A",
            explanation: "Sau liên từ 'Despite' hoặc 'In spite of' là một danh từ hoặc danh động từ V-ing."
        },
        {
            id: "e_8", subject: "Tiếng Anh",
            content: "Many endangered animals are facing the threat of ________ due to habitat loss.",
            options: ["A. extinction", "B. extinct", "C. extinguish", "D. extinctive"],
            correct: "A",
            explanation: "Sau giới từ 'of' cần một danh từ. 'extinction' (sự tuyệt chủng) là danh từ phù hợp về cả ngữ pháp và ngữ nghĩa."
        },
        {
            id: "e_9", subject: "Tiếng Anh",
            content: "He decided ________ computer science because of the promising job opportunities.",
            options: ["A. to study", "B. studying", "C. study", "D. studied"],
            correct: "A",
            explanation: "Động từ 'decide' đi kèm với to-infinitive: 'decide to do something' (quyết định làm gì)."
        },
        {
            id: "e_10", subject: "Tiếng Anh",
            content: "English ________ by millions of people all around the world today.",
            options: ["A. is spoken", "B. speaks", "C. was speaking", "D. has spoken"],
            correct: "A",
            explanation: "Câu bị động ở thì hiện tại đơn: S (vật) + is/am/are + V3/ed. Tiếng Anh được nói bởi hàng triệu người."
        },
        {
            id: "e_11", subject: "Tiếng Anh",
            content: "The more you practice speaking, ________ confident you will become.",
            options: ["A. the more", "B. more", "C. the most", "D. as much"],
            correct: "A",
            explanation: "Cấu trúc so sánh kép (càng... càng...): The + comparative ..., the + comparative ... (The more you practice, the more confident...)."
        },
        {
            id: "e_12", subject: "Tiếng Anh",
            content: "I am looking forward to ________ you at the school festival next Sunday.",
            options: ["A. meeting", "B. meet", "C. met", "D. to meet"],
            correct: "A",
            explanation: "Cấu trúc 'look forward to + V-ing' diễn tả sự mong đợi, háo hức làm một việc gì đó."
        }
    ],

    "Tin Học": [
        {
            id: "t_1", subject: "Tin Học",
            content: "Trong ngôn ngữ lập trình Python, kết quả xuất ra màn hình của lệnh `print(type(3.14))` là:",
            options: ["A. <class 'float'>", "B. <class 'int'>", "C. <class 'str'>", "D. <class 'number'>"],
            correct: "A",
            explanation: "Số 3.14 là số thực dấu phẩy động nên kiểu dữ liệu trong Python là kiểu float."
        },
        {
            id: "t_2", subject: "Tin Học",
            content: "Trong cơ sở dữ liệu quan hệ, một trường (hoặc tập hợp trường) dùng để phân biệt duy nhất từng bản ghi gọi là:",
            options: ["A. Khóa chính (Primary Key)", "B. Khóa ngoại (Foreign Key)", "C. Bản ghi (Record)", "D. Bảng dữ liệu (Table)"],
            correct: "A",
            explanation: "Khóa chính (Primary Key) là một hoặc nhiều thuộc tính xác định duy nhất một hàng trong bảng dữ liệu."
        },
        {
            id: "t_3", subject: "Tin Học",
            content: "Câu lệnh SQL nào sau đây dùng để truy vấn và lấy dữ liệu từ bảng `HOC_SINH`?",
            options: [
                "A. SELECT * FROM HOC_SINH;",
                "B. GET * IN HOC_SINH;",
                "C. PULL DATA FROM HOC_SINH;",
                "D. INSERT INTO HOC_SINH;"
            ],
            correct: "A",
            explanation: "Cú pháp truy vấn tiêu chuẩn của SQL là `SELECT [cột] FROM [bảng];`. Dấu `*` đại diện cho tất cả các cột."
        },
        {
            id: "t_4", subject: "Tin Học",
            content: "Để tăng cường bảo mật cho tài khoản cá nhân, biện pháp nào sau đây hiệu quả nhất?",
            options: [
                "A. Bật xác thực hai yếu tố (2FA) và đặt mật khẩu mạnh",
                "B. Đặt mật khẩu là số điện thoại hoặc ngày sinh nhật",
                "C. Dùng chung một mật khẩu cho tất cả tài khoản",
                "D. Lưu mật khẩu vào tệp văn bản công khai"
            ],
            correct: "A",
            explanation: "Xác thực 2 bước (2FA) kết hợp mật khẩu mạnh có chữ hoa, thường, số và ký tự đặc biệt giúp ngăn ngừa tin tặc chiếm quyền kiểm soát."
        },
        {
            id: "t_5", subject: "Tin Học",
            content: "Địa chỉ IP nào sau đây là địa chỉ IPv4 hợp lệ?",
            options: ["A. 192.168.1.1", "B. 256.100.0.1", "C. 192.168.1", "D. 300.200.100.50"],
            correct: "A",
            explanation: "Địa chỉ IPv4 gồm 4 số nguyên cách nhau bằng dấu chấm, mỗi số nằm trong khoảng từ 0 đến 255."
        },
        {
            id: "t_6", subject: "Tin Học",
            content: "Bộ nhớ nào sau đây sẽ bị mất toàn bộ dữ liệu khi máy tính bị ngắt nguồn điện?",
            options: ["A. RAM", "B. ROM", "C. Ổ cứng SSD", "D. Thẻ nhớ SD"],
            correct: "A",
            explanation: "RAM (Random Access Memory) là bộ nhớ khả biến (volatile), dữ liệu trên RAM sẽ bị xóa sạch khi mất điện."
        },
        {
            id: "t_7", subject: "Tin Học",
            content: "Đoạn mã Python sau cho kết quả gì? `s = 'STEM 2026'; print(len(s))`",
            options: ["A. 9", "B. 8", "C. 4", "D. 7"],
            correct: "A",
            explanation: "Hàm `len(s)` đếm độ dài chuỗi bao gồm cả khoảng trắng: 'S','T','E','M',' ','2','0','2','6' tổng cộng là 9 kí tự."
        },
        {
            id: "t_8", subject: "Tin Học",
            content: "Hình thức tấn công giả mạo các tổ chức tin cậy (như ngân hàng, trường học) qua email để lừa lấy mật khẩu gọi là:",
            options: ["A. Phishing", "B. DDoS", "C. Trojan", "D. Ransomware"],
            correct: "A",
            explanation: "Phishing (tấn công giả mạo) là chiêu thức lừa đảo người dùng bấm vào liên kết độc hại để đánh cắp thông tin đăng nhập."
        },
        {
            id: "t_9", subject: "Tin Học",
            content: "Giao thức nào đảm bảo truyền tải dữ liệu trang web được mã hóa an toàn giữa máy khách và máy chủ?",
            options: ["A. HTTPS", "B. HTTP", "C. FTP", "D. SMTP"],
            correct: "A",
            explanation: "HTTPS (Hypertext Transfer Protocol Secure) sử dụng chứng chỉ SSL/TLS để mã hóa dữ liệu truyền tải trên web."
        },
        {
            id: "t_10", subject: "Tin Học",
            content: "Trí tuệ nhân tạo (AI) học hỏi từ khối lượng dữ liệu lớn mà không cần lập trình thủ công từng quy tắc gọi là:",
            options: ["A. Machine Learning (Học máy)", "B. Compiler (Trình biên dịch)", "C. BIOS", "D. Cloud Storage"],
            correct: "A",
            explanation: "Machine Learning (Học máy) là nhánh cốt lõi của AI giúp hệ thống tự tối ưu và trích xuất tri thức từ dữ liệu huấn luyện."
        },
        {
            id: "t_11", subject: "Tin Học",
            content: "Phần mềm được cung cấp mã nguồn công khai, cho phép mọi người tự do sao chép, sửa đổi và phân phối gọi là:",
            options: ["A. Phần mềm nguồn mở (Open Source)", "B. Phần mềm thương mại đóng gói", "C. Phần mềm độc hại", "D. Phần mềm thử nghiệm"],
            correct: "A",
            explanation: "Mã nguồn mở (như Linux, Python, VS Code) mang lại lợi ích chia sẻ tri thức công nghệ cho cộng đồng."
        },
        {
            id: "t_12", subject: "Tin Học",
            content: "Trong bảng tính Excel, công thức nào dùng để tính điểm trung bình của vùng ô từ A1 đến A10?",
            options: ["A. =AVERAGE(A1:A10)", "B. =SUM(A1:A10)", "C. =MEAN(A1:A10)", "D. =MEDIAN(A1:A10)"],
            correct: "A",
            explanation: "Hàm tính trung bình cộng trong bảng tính là hàm `=AVERAGE(...)`."
        }
    ],
    "Công Nghệ": [
        {
            id: "cn12_1", subject: "Công Nghệ", grade: "12",
            content: "Linh kiện bán dẫn nào sau đây có chức năng biến đổi dòng điện xoay chiều thành dòng điện một chiều?",
            options: ["A. Điôt (Diode)", "B. Điện trở (Resistor)", "C. Tụ điện (Capacitor)", "D. Cuộn cảm (Inductor)"],
            correct: "A",
            explanation: "Điôt bán dẫn chỉ cho dòng điện đi qua theo một chiều thuận (từ Anot sang Katot), do đó được dùng để chỉnh lưu dòng điện xoay chiều thành một chiều."
        },
        {
            id: "cn12_2", subject: "Công Nghệ", grade: "12",
            content: "Để chỉnh lưu cả hai nửa chu kì của dòng điện xoay chiều mà không cần biến áp có điểm giữa, người ta thường dùng mạch chỉnh lưu nào?",
            options: ["A. Mạch chỉnh lưu cầu (dùng 4 điôt)", "B. Mạch chỉnh lưu nửa chu kì (1 điôt)", "C. Mạch chỉnh lưu hai nửa chu kì (2 điôt)", "D. Mạch nhân đôi điện áp"],
            correct: "A",
            explanation: "Mạch chỉnh lưu cầu sử dụng 4 điôt mắc dạng hình cầu, chỉnh lưu hiệu quả cả hai nửa chu kỳ với điện áp ngược đặt lên mỗi điôt nhỏ hơn."
        },
        {
            id: "cn12_3", subject: "Công Nghệ", grade: "12",
            content: "Transistor lưỡng cực (BJT) là linh kiện bán dẫn có bao nhiêu lớp tiếp giáp P-N và bao nhiêu điện cực?",
            options: ["A. 2 lớp tiếp giáp P-N, 3 điện cực (E, B, C)", "B. 1 lớp tiếp giáp P-N, 2 điện cực (A, K)", "C. 3 lớp tiếp giáp P-N, 4 điện cực", "D. 2 lớp tiếp giáp P-N, 2 điện cực"],
            correct: "A",
            explanation: "Transistor BJT gồm 3 lớp bán dẫn tạo thành 2 lớp tiếp giáp P-N, dẫn ra 3 cực: Emitter (E - phát), Base (B - gốc), Collector (C - thu)."
        },
        {
            id: "cn12_4", subject: "Công Nghệ", grade: "12",
            content: "Trong mạch điện xoay chiều ba pha đối xứng nối hình sao (Y), mối liên hệ giữa điện áp dây (U_d) và điện áp pha (U_p) là:",
            options: ["A. U_d = √3 . U_p", "B. U_d = U_p", "C. U_d = U_p / √3", "D. U_d = 3 . U_p"],
            correct: "A",
            explanation: "Khi nối hình sao đối xứng: điện áp dây gấp căn 3 lần điện áp pha (U_d = √3 . U_p) và dòng điện dây bằng dòng điện pha (I_d = I_p)."
        },
        {
            id: "cn12_5", subject: "Công Nghệ", grade: "12",
            content: "Tốc độ quay của từ trường quay (n₁) trong động cơ không đồng bộ ba pha được tính theo công thức nào?",
            options: ["A. n₁ = 60f / p", "B. n₁ = 60p / f", "C. n₁ = f / (60p)", "D. n₁ = 60 / (f.p)"],
            correct: "A",
            explanation: "Tốc độ từ trường quay đồng bộ là n₁ = 60f / p (vòng/phút), trong đó f là tần số nguồn điện (Hz), p là số đôi cực từ của stato."
        },
        {
            id: "cn12_6", subject: "Công Nghệ", grade: "12",
            content: "Thiết bị vi mạch khuếch đại thuật toán (Op-Amp) lý tưởng có các đặc điểm nào sau đây?",
            options: [
                "A. Hệ số khuếch đại vô cùng lớn, trở kháng vào vô cùng lớn và trở kháng ra bằng 0",
                "B. Hệ số khuếch đại bằng 1, trở kháng vào bằng 0",
                "C. Trở kháng vào rất nhỏ và trở kháng ra vô cùng lớn",
                "D. Chỉ làm việc được với nguồn điện một chiều đơn"
            ],
            correct: "A",
            explanation: "Op-Amp lý tưởng có hệ số khuếch đại vi sai vô cùng lớn (A → ∞), trở kháng vào cực lớn (Z_in → ∞) và trở kháng ra xấp xỉ 0 (Z_out → 0)."
        },
        {
            id: "cn12_7", subject: "Công Nghệ", grade: "12",
            content: "Cảm biến (Sensor) trong các hệ thống tự động hóa công nghiệp có chức năng chính là gì?",
            options: [
                "A. Đo lường và chuyển đổi các đại lượng vật lí/hóa học thành tín hiệu điện tương ứng",
                "B. Cung cấp nguồn điện năng nuôi toàn bộ mạch điều khiển",
                "C. Đóng cắt trực tiếp các động cơ công suất lớn",
                "D. Hiển thị hình ảnh giám sát trung tâm"
            ],
            correct: "A",
            explanation: "Cảm biến là thiết bị tiếp nhận kích thích từ môi trường (nhiệt độ, quang học, áp suất, độ ẩm...) và biến đổi thành tín hiệu điện cho bộ xử lý."
        },
        {
            id: "cn12_8", subject: "Công Nghệ", grade: "12",
            content: "Vi điều khiển (Microcontroller) khác với vi xử lý (Microprocessor) ở điểm cơ bản nào?",
            options: [
                "A. Vi điều khiển tích hợp cả CPU, bộ nhớ RAM/ROM và các cổng vào/ra (I/O) trên một chip duy nhất",
                "B. Vi điều khiển có tốc độ xử lý nhanh hơn vi xử lý máy tính hàng nghìn lần",
                "C. Vi điều khiển chỉ thực hiện được các phép toán cộng trừ cơ bản",
                "D. Vi điều khiển không cần nạp chương trình điều khiển"
            ],
            correct: "A",
            explanation: "Vi điều khiển là một hệ thống máy tính thu nhỏ được tích hợp nguyên khối (SoC) gồm CPU, RAM, Flash/ROM và các khối ngoại vi I/O, Timer, ADC."
        },
        {
            id: "cn12_9", subject: "Công Nghệ", grade: "12",
            content: "Cổng logic số nào cho tín hiệu đầu ra ở mức cao (1) khi và chỉ khi TẤT CẢ các ngõ vào đều ở mức cao (1)?",
            options: ["A. Cổng AND", "B. Cổng OR", "C. Cổng NOT", "D. Cổng XOR"],
            correct: "A",
            explanation: "Cổng AND thực hiện phép nhân logic: Y = A . B, chỉ xuất mức 1 khi toàn bộ các đầu vào A và B đồng thời bằng 1."
        },
        {
            id: "cn12_10", subject: "Công Nghệ", grade: "12",
            content: "Biện pháp nối đất bảo vệ (tiếp địa) cho vỏ kim loại của các thiết bị điện nhằm mục đích gì?",
            options: [
                "A. Giảm thiểu điện áp chạm nguy hiểm cho người khi xảy ra sự cố rò điện ra vỏ thiết bị",
                "B. Giúp thiết bị điện tiêu thụ ít điện năng hơn",
                "C. Tăng công suất làm việc của thiết bị",
                "D. Ổn định tần số của mạng điện gia đình"
            ],
            correct: "A",
            explanation: "Nối đất bảo vệ tạo đường dẫn dòng điện rò có điện trở rất nhỏ xuống đất, làm giảm điện áp đặt lên người khi chạm vào vỏ máy rò điện."
        },
        {
            id: "cn12_11", subject: "Công Nghệ", grade: "12",
            content: "Phương pháp nhân giống vô tính cây trồng bằng nuôi cấy mô tế bào (Micropropagation) dựa trên cơ sở sinh học nào?",
            options: [
                "A. Tính toàn năng của tế bào thực vật",
                "B. Hiện tượng đột biến gen nhân tạo",
                "C. Sự tái tổ hợp di truyền qua giảm phân",
                "D. Quá trình chọn lọc tự nhiên"
            ],
            correct: "A",
            explanation: "Tính toàn năng của tế bào thực vật là khả năng của một tế bào biệt hóa có thể tái sinh thành một cơ thể hoàn chỉnh trong môi trường dinh dưỡng thích hợp."
        },
        {
            id: "cn12_12", subject: "Công Nghệ", grade: "12",
            content: "Hệ thống nông nghiệp thông minh ứng dụng công nghệ IoT và AI nhằm đạt được mục tiêu nào nổi bật nhất?",
            options: [
                "A. Tự động hóa giám sát độ ẩm, nhiệt độ, dinh dưỡng và tưới tiêu chính xác theo nhu cầu thực tế của cây trồng",
                "B. Thay thế hoàn toàn ánh sáng mặt trời bằng đèn LED công suất cao",
                "C. Loại bỏ hoàn toàn sự cần thiết của hạt giống cây trồng",
                "D. Giảm giá thành thiết bị công nghệ về mức 0 đồng"
            ],
            correct: "A",
            explanation: "Nông nghiệp chính xác (Precision Agriculture) kết hợp cảm biến IoT và AI giúp thu thập dữ liệu thời gian thực và điều khiển tưới tiêu tự động tối ưu hóa sản lượng."
        }
    ],
    "GDQP&AN": [
        {
            id: "qp12_1", subject: "GDQP&AN", grade: "12",
            content: "Tư tưởng chỉ đạo tác chiến xuyên suốt lịch sử nghệ thuật quân sự Việt Nam đánh giặc giữ nước của dân tộc là:",
            options: [
                "A. Lấy nhỏ thắng lớn, lấy ít địch nhiều, lấy đại nghĩa thắng hung tàn",
                "B. Đánh nhanh thắng nhanh, tiêu diệt toàn bộ quân địch ngay tại biên giới",
                "C. Chỉ tổ chức phòng ngự bị động trong công sự kiên cố",
                "D. Tránh né giao chiến và chờ đợi viện trợ quốc tế"
            ],
            correct: "A",
            explanation: "Truyền thống quân sự Việt Nam luôn lấy nhân nghĩa làm gốc, phát huy mưu lược thông minh 'lấy đoản binh thắng trường trận', 'lấy ít địch nhiều'."
        },
        {
            id: "qp12_2", subject: "GDQP&AN", grade: "12",
            content: "Theo Luật Sĩ quan Quân đội nhân dân Việt Nam, hệ thống cấp bậc hàm sĩ quan được chia thành mấy cấp và mấy bậc?",
            options: ["A. 4 cấp, 12 bậc", "B. 3 cấp, 10 bậc", "C. 4 cấp, 14 bậc", "D. 3 cấp, 12 bậc"],
            correct: "A",
            explanation: "Sĩ quan QĐND Việt Nam gồm 4 cấp: Cấp Úy (4 bậc), Cấp Tá (4 bậc), Cấp Tướng (4 bậc - Chuẩn đô đốc/Thiếu tướng, Trung tướng, Thượng tướng, Đại tướng), tổng cộng 12 bậc."
        },
        {
            id: "qp12_3", subject: "GDQP&AN", grade: "12",
            content: "Lực lượng nòng cốt trong sự nghiệp bảo vệ an ninh quốc gia và giữ gìn trật tự an toàn xã hội của nước ta là:",
            options: ["A. Công an nhân dân", "B. Toàn thể công chức nhà nước", "C. Lực lượng bảo vệ dân phố", "D. Đội dân phòng thôn xóm"],
            correct: "A",
            explanation: "Công an nhân dân là lực lượng vũ trang nhân dân nòng cốt trong thực hiện nhiệm vụ bảo vệ an ninh quốc gia và bảo đảm trật tự, an toàn xã hội."
        },
        {
            id: "qp12_4", subject: "GDQP&AN", grade: "12",
            content: "Nền quốc phòng toàn dân của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam mang tính chất cơ bản nào?",
            options: [
                "A. Toàn dân, toàn diện, độc lập, tự chủ, tự lực, tự cường và hiện đại",
                "B. Quân sự hóa toàn bộ đời sống kinh tế xã hội",
                "C. Mang tính hiếu chiến, mở rộng ảnh hưởng quân sự",
                "D. Phụ thuộc hoàn toàn vào các liên minh quân sự nước ngoài"
            ],
            correct: "A",
            explanation: "Quốc phòng Việt Nam là nền quốc phòng vì hòa bình, tự vệ, mang tính chất toàn dân, toàn diện, độc lập, tự chủ, tự lực, tự cường."
        },
        {
            id: "qp12_5", subject: "GDQP&AN", grade: "12",
            content: "Hai quần đảo Hoàng Sa và Trường Sa là bộ phận lãnh thổ thiêng liêng thuộc chủ quyền của quốc gia nào?",
            options: ["A. Việt Nam", "B. Không thuộc chủ quyền của quốc gia nào", "C. Khu vực biển quốc tế hoàn toàn", "D. Vùng tranh chấp không xác định"],
            correct: "A",
            explanation: "Việt Nam có đầy đủ bằng chứng lịch sử và cơ sở pháp lý khẳng định chủ quyền không thể chối cãi đối với hai quần đảo Hoàng Sa và Trường Sa."
        },
        {
            id: "qp12_6", subject: "GDQP&AN", grade: "12",
            content: "Thách thức an ninh phi truyền thống nào đang nổi lên gay gắt trong thời đại số hiện nay?",
            options: [
                "A. Tội phạm công nghệ cao và chiến tranh mạng tấn công hệ thống thông tin trọng yếu",
                "B. Chiến tranh cơ giới quy ước quy mô toàn cầu",
                "C. Xung đột giữa các bộ lạc thời cổ đại",
                "D. Thiếu hụt sách báo in truyền thống"
            ],
            correct: "A",
            explanation: "An ninh phi truyền thống bao gồm an ninh mạng, biến đổi khí hậu, an ninh năng lượng, dịch bệnh... trong đó an ninh mạng là thách thức cực kỳ then chốt hiện nay."
        },
        {
            id: "qp12_7", subject: "GDQP&AN", grade: "12",
            content: "Cỡ đạn tiêu chuẩn được sử dụng cho súng tiểu liên AK-47 là bao nhiêu?",
            options: ["A. 7,62 mm × 39 mm", "B. 5,56 mm × 45 mm", "C. 9 mm × 19 mm", "D. 12,7 mm × 108 mm"],
            correct: "A",
            explanation: "Súng tiểu liên AK sử dụng đạn cỡ 7,62 mm × 39 mm (kiểu đạn 1943 do Liên Xô thiết kế)."
        },
        {
            id: "qp12_8", subject: "GDQP&AN", grade: "12",
            content: "Định nghĩa đường ngắm cơ bản trong kĩ thuật bắn súng bộ binh là đường thẳng từ:",
            options: [
                "A. Mắt người bắn qua chính giữa mép trên khe ngắm đến điểm chính giữa mép trên đầu ngắm",
                "B. Mắt người bắn thẳng tới điểm định bắn trên mục tiêu",
                "C. Đáy nòng súng tới mục tiêu",
                "D. Khe ngắm đến tâm vòng 10 của bia bắn"
            ],
            correct: "A",
            explanation: "Đường ngắm cơ bản là đường dóng thẳng từ mắt người bắn qua điểm chính giữa mép trên khe ngắm đến điểm chính giữa mép trên đầu ngắm."
        },
        {
            id: "qp12_9", subject: "GDQP&AN", grade: "12",
            content: "Hành vi nào sau đây vi phạm nghiêm trọng Luật An ninh mạng năm 2018 của Việt Nam?",
            options: [
                "A. Tuyên truyền thông tin sai sự thật, vu khống, xúc phạm danh dự của tổ chức và cá nhân trên không gian mạng",
                "B. Sử dụng Internet để tìm kiếm tài liệu học tập bổ ích",
                "C. Chia sẻ các thông tin khuyến học, lịch thi chính thống",
                "D. Đăng tải clip tuyên truyền pháp luật và an toàn giao thông"
            ],
            correct: "A",
            explanation: "Luật An ninh mạng nghiêm cấm việc phát tán tin giả, thông tin bịa đặt, vu khống, xúc phạm nhân phẩm hoặc gây hoang mang dư luận xã hội."
        },
        {
            id: "qp12_10", subject: "GDQP&AN", grade: "12",
            content: "Học sinh THPT có trách nhiệm cụ thể nào trong việc bảo vệ an ninh trật tự xã hội?",
            options: [
                "A. Nêu cao tinh thần cảnh giác, chấp hành pháp luật, bài trừ bạo lực học đường và tệ nạn xã hội",
                "B. Tham gia các diễn đàn kích động biểu tình trên mạng xã hội",
                "C. Tự ý mua bán các loại công cụ hỗ trợ và vũ khí tự chế",
                "D. Làm ngơ khi thấy hành vi vi phạm pháp luật nguy hiểm"
            ],
            correct: "A",
            explanation: "Học sinh có bổn phận gương mẫu chấp hành pháp luật, rèn luyện thể chất, xây dựng môi trường học đường lành mạnh, không sa vào tệ nạn."
        },
        {
            id: "qp12_11", subject: "GDQP&AN", grade: "12",
            content: "Lực lượng Dân quân tự vệ ở Việt Nam được tổ chức và xác định vai trò như thế nào?",
            options: [
                "A. Là lực lượng vũ trang quần chúng không thoát ly sản xuất, công tác, nòng cốt bảo vệ cơ sở",
                "B. Là lực lượng chính quy ăn lương toàn phần từ ngân sách quốc phòng",
                "C. Chỉ được thành lập trong thời kì có chiến tranh xảy ra",
                "D. Là tổ chức đoàn thể tự phát của thanh niên nông thôn"
            ],
            correct: "A",
            explanation: "Dân quân tự vệ là lực lượng vũ trang quần chúng không thoát ly sản xuất, là một bộ phận của lực lượng vũ trang nhân dân Việt Nam."
        },
        {
            id: "qp12_12", subject: "GDQP&AN", grade: "12",
            content: "Xây dựng 'thế trận lòng dân' vững chắc trong chiến lược bảo vệ Tổ quốc có ý nghĩa quyết định bởi vì:",
            options: [
                "A. Nhân dân là gốc của nước, cội nguồn sức mạnh vô địch của toàn dân tộc",
                "B. Giúp tiết kiệm ngân sách mua sắm vũ khí khí tài quân sự",
                "C. Giảm bớt số lượng bộ đội chính quy canh gác biên cương",
                "D. Chỉ nhằm mục đích tuyên truyền đối ngoại hòa bình"
            ],
            correct: "A",
            explanation: "Thế trận lòng dân là nền tảng của nền quốc phòng toàn dân và thế trận an ninh nhân dân; 'chở thuyền là dân, lật thuyền cũng là dân'."
        }
    ]
};

// ==============================================================================
// NGÂN HÀNG ĐỀ THI MẪU LỚP 10 (GDPT 2018)
// ==============================================================================
const BUILTIN_EXAM_BANK_10 = {
    "Toán": [
        {
            id: "m10_1", subject: "Toán", grade: "10", period: "mid1", topic: "Mệnh đề & Tập hợp",
            content: "Phủ định của mệnh đề '∀x ∈ ℝ, x² - x + 7 > 0' là mệnh đề nào sau đây?",
            options: ["A. ∃x ∈ ℝ, x² - x + 7 ≤ 0", "B. ∃x ∈ ℝ, x² - x + 7 < 0", "C. ∀x ∈ ℝ, x² - x + 7 ≤ 0", "D. ∃x ∈ ℝ, x² - x + 7 > 0"],
            correct: "A",
            explanation: "Phủ định của mệnh đề chứa kí hiệu với mọi (∀) là kí hiệu tồn tại (∃) và dấu lớn hơn (>) chuyển thành nhỏ hơn hoặc bằng (≤)."
        },
        {
            id: "m10_2", subject: "Toán", grade: "10", period: "mid1", topic: "Mệnh đề & Tập hợp",
            content: "Cho hai tập hợp A = [1; 5] và B = (3; 7). Tập hợp giao A ∩ B là:",
            options: ["A. (3; 5]", "B. [1; 7)", "C. [3; 5]", "D. (3; 5)"],
            correct: "A",
            explanation: "Giao của hai tập hợp là phần tử thuộc cả A và B: x ∈ [1; 5] và x ∈ (3; 7) ⇔ 3 < x ≤ 5, tức là nửa khoảng (3; 5]."
        },
        {
            id: "m10_ineq1", subject: "Toán", grade: "10", period: "mid1", topic: "Bất phương trình bậc nhất hai ẩn",
            content: "Điểm nào sau đây thuộc miền nghiệm của bất phương trình 2x + y - 3 > 0?",
            options: ["A. (2; 1)", "B. (0; 0)", "C. (1; 0)", "D. (-1; 2)"],
            correct: "A",
            explanation: "Thay tọa độ (2; 1) vào: 2*2 + 1 - 3 = 2 > 0 (thỏa mãn)."
        },
        {
            id: "m10_trig_triangle", subject: "Toán", grade: "10", period: "final1", topic: "Hệ thức lượng trong tam giác",
            content: "Cho tam giác ABC có a = 6, b = 8 và góc C = 60°. Độ dài cạnh c bằng:",
            options: ["A. 2√13", "B. 2√37", "C. 52", "D. 10"],
            correct: "A",
            explanation: "Theo định lý côsin: c² = a² + b² - 2ab*cos(C) = 36 + 64 - 2*6*8*(1/2) = 100 - 48 = 52. Do đó c = √52 = 2√13."
        },
        {
            id: "m10_3", subject: "Toán", grade: "10", period: "final1", topic: "Hàm số bậc hai & Tam thức bậc hai",
            content: "Tọa độ đỉnh I của parabol (P): y = x² - 4x + 3 là:",
            options: ["A. I(2; -1)", "B. I(-2; 15)", "C. I(2; 1)", "D. I(4; 3)"],
            correct: "A",
            explanation: "Tọa độ đỉnh của parabol y = ax² + bx + c có x_I = -b/(2a) = 4/(2*1) = 2. Thay x = 2 vào ta được y_I = 2² - 4*2 + 3 = -1. Vậy I(2; -1)."
        },
        {
            id: "m10_4", subject: "Toán", grade: "10", period: "final1", topic: "Dấu của tam thức bậc hai",
            content: "Tập nghiệm của bất phương trình bậc hai x² - 5x + 6 ≤ 0 là:",
            options: ["A. [2; 3]", "B. (-∞; 2] ∪ [3; +∞)", "C. (2; 3)", "D. [-3; -2]"],
            correct: "A",
            explanation: "Tam thức có hai nghiệm x = 2 và x = 3. Hệ số a = 1 > 0 nên tam thức mang dấu âm hoặc bằng 0 trong khoảng hai nghiệm [2; 3]."
        },
        {
            id: "m10_5", subject: "Toán", grade: "10", period: "final1", topic: "Véctơ & Hệ trục tọa độ Oxy",
            content: "Cho hình vuông ABCD cạnh a. Độ dài của véc-tơ tổng AB + AD bằng:",
            options: ["A. a√2", "B. 2a", "C. a", "D. a/2"],
            correct: "A",
            explanation: "Theo quy tắc hình bình hành: AB + AD = AC. Độ dài của véc-tơ AC chính là độ dài đường chéo hình vuông cạnh a, bằng a√2."
        },
        {
            id: "m10_6", subject: "Toán", grade: "10", period: "final1", topic: "Véctơ & Hệ trục tọa độ Oxy",
            content: "Trong mặt phẳng tọa độ Oxy, cho hai véc-tơ u = (1; 2) và v = (-2; 1). Tích vô hướng u.v bằng:",
            options: ["A. 0", "B. 4", "C. -4", "D. 5"],
            correct: "A",
            explanation: "Tích vô hướng u.v = x₁x₂ + y₁y₂ = 1*(-2) + 2*1 = 0. Do tích vô hướng bằng 0 nên hai véc-tơ vuông góc nhau."
        },
        {
            id: "m10_7", subject: "Toán", grade: "10", period: "final2", topic: "Phương pháp tọa độ trong mặt phẳng (Oxy)",
            content: "Phương trình tổng quát của đường thẳng đi qua điểm M(1; 2) và nhận n = (2; -1) làm véc-tơ pháp tuyến là:",
            options: ["A. 2x - y = 0", "B. 2x - y - 4 = 0", "C. x + 2y - 5 = 0", "D. 2x + y - 4 = 0"],
            correct: "A",
            explanation: "Phương trình có dạng 2(x - 1) - 1(y - 2) = 0 ⇔ 2x - y - 2 + 2 = 0 ⇔ 2x - y = 0."
        },
        {
            id: "m10_8", subject: "Toán", grade: "10", period: "final2", topic: "Phương pháp tọa độ trong mặt phẳng (Oxy)",
            content: "Tọa độ tâm I và bán kính R của đường tròn (C): (x - 2)² + (y + 1)² = 25 là:",
            options: ["A. I(2; -1), R = 5", "B. I(-2; 1), R = 5", "C. I(2; -1), R = 25", "D. I(-2; 1), R = 25"],
            correct: "A",
            explanation: "Phương trình chuẩn (x - a)² + (y - b)² = R² có tâm I(a; b) = (2; -1) và bán kính R = √25 = 5."
        },
        {
            id: "m10_9", subject: "Toán", grade: "10", period: "mid2", topic: "Thống kê & Xác suất cơ bản",
            content: "Có bao nhiêu cách chọn 3 học sinh từ một nhóm gồm 10 học sinh để đi làm nhiệm vụ?",
            options: ["A. 120", "B. 720", "C. 30", "D. 1000"],
            correct: "A",
            explanation: "Số cách chọn 3 học sinh không phân biệt thứ tự là một tổ hợp chập 3 của 10: C(10, 3) = 10! / (3! * 7!) = 120."
        },
        {
            id: "m10_10", subject: "Toán", grade: "10", period: "mid2", topic: "Thống kê & Xác suất cơ bản",
            content: "Gieo một con xúc xắc cân đối đồng chất một lần. Xác suất để xuất hiện mặt có số chấm là số nguyên tố là:",
            options: ["A. 1/2", "B. 1/3", "C. 2/3", "D. 1/6"],
            correct: "A",
            explanation: "Không gian mẫu gồm 6 phần tử {1, 2, 3, 4, 5, 6}. Các số nguyên tố là {2, 3, 5} gồm 3 phần tử. Xác suất P = 3/6 = 1/2."
        }
    ],
    "Vật Lí": [
        {
            id: "p10_1", subject: "Vật Lí", grade: "10",
            content: "Công thức liên hệ giữa vận tốc, gia tốc và quãng đường đi được trong chuyển động thẳng biến đổi đều là:",
            options: ["A. v² - v₀² = 2as", "B. v - v₀ = 2as", "C. v² + v₀² = 2as", "D. v² - v₀² = as"],
            correct: "A",
            explanation: "Hệ thức độc lập thời gian trong chuyển động thẳng biến đổi đều là v² - v₀² = 2as."
        },
        {
            id: "p10_2", subject: "Vật Lí", grade: "10",
            content: "Một vật rơi tự do không vận tốc đầu từ độ cao h. Thời gian rơi t của vật được tính bởi công thức:",
            options: ["A. t = √(2h/g)", "B. t = √(h/g)", "C. t = 2h/g", "D. t = √(h/2g)"],
            correct: "A",
            explanation: "Từ công thức h = 1/2 gt² suy ra thời gian rơi chạm đất là t = √(2h/g)."
        },
        {
            id: "p10_3", subject: "Vật Lí", grade: "10",
            content: "Theo định luật II Newton, biểu thức gia tốc a của vật chịu tác dụng của hợp lực F là:",
            options: ["A. a = F / m", "B. a = m / F", "C. a = F . m", "D. a = F² / m"],
            correct: "A",
            explanation: "Định luật II Newton phát biểu F = ma, suy ra gia tốc có độ lớn a = F / m."
        },
        {
            id: "p10_4", subject: "Vật Lí", grade: "10",
            content: "Độ lớn của lực ma sát trượt tỉ lệ thuận với yếu tố nào sau đây?",
            options: ["A. Áp lực của vật lên mặt tiếp xúc", "B. Vận tốc của vật", "C. Diện tích bề mặt tiếp xúc", "D. Thể tích của vật"],
            correct: "A",
            explanation: "Công thức F_mst = μ.N, trong đó N là áp lực vuông góc lên mặt tiếp xúc."
        },
        {
            id: "p10_5", subject: "Vật Lí", grade: "10",
            content: "Công cơ học do lực F thực hiện khi vật dịch chuyển quãng đường s theo hướng hợp với lực một góc α là:",
            options: ["A. A = F.s.cos(α)", "B. A = F.s.sin(α)", "C. A = F.s.tan(α)", "D. A = F / (s.cos(α))"],
            correct: "A",
            explanation: "Định nghĩa công cơ học: A = F.s.cos(α). Khi lực cùng hướng chuyển động (α = 0) thì A = F.s."
        },
        {
            id: "p10_6", subject: "Vật Lí", grade: "10",
            content: "Công suất P của một lực đặc trưng cho:",
            options: ["A. Tốc độ sinh công của lực", "B. Độ lớn của lực tác dụng", "C. Quãng đường vật dịch chuyển", "D. Khối lượng của vật"],
            correct: "A",
            explanation: "Công suất là đại lượng đo bằng công sinh ra trong một đơn vị thời gian: P = A / t, đặc trưng cho tốc độ sinh công."
        },
        {
            id: "p10_7", subject: "Vật Lí", grade: "10",
            content: "Động năng W_d của một vật có khối lượng m đang chuyển động với vận tốc v là:",
            options: ["A. W_d = (1/2)mv²", "B. W_d = mv²", "C. W_d = (1/2)mv", "D. W_d = 2mv²"],
            correct: "A",
            explanation: "Động năng của vật là năng lượng có được do chuyển động: W_d = (1/2)mv²."
        },
        {
            id: "p10_8", subject: "Vật Lí", grade: "10",
            content: "Động lượng p của một vật khối lượng m chuyển động với vận tốc v được tính bằng:",
            options: ["A. p = m.v", "B. p = (1/2)m.v", "C. p = m.v²", "D. p = m / v"],
            correct: "A",
            explanation: "Động lượng của một vật là một đại lượng véc-tơ bằng tích khối lượng và vận tốc: p = mv."
        },
        {
            id: "p10_9", subject: "Vật Lí", grade: "10",
            content: "Gia tốc hướng tâm của một vật chuyển động tròn đều bán kính r với tốc độ dài v là:",
            options: ["A. a_ht = v² / r", "B. a_ht = v / r²", "C. a_ht = v.r", "D. a_ht = v² . r"],
            correct: "A",
            explanation: "Trong chuyển động tròn đều, gia tốc hướng tâm có độ lớn a_ht = v² / r = ω²r."
        },
        {
            id: "p10_10", subject: "Vật Lí", grade: "10",
            content: "Cơ năng của một vật chuyển động chỉ dưới tác dụng của trọng lực là đại lượng:",
            options: ["A. Được bảo toàn", "B. Luôn tăng dần theo thời gian", "C. Luôn giảm dần theo thời gian", "D. Triệt tiêu tại mặt đất"],
            correct: "A",
            explanation: "Khi vật chỉ chịu tác dụng của lực thế (trọng lực, lực đàn hồi), cơ năng W = W_d + W_t là một đại lượng bảo toàn."
        }
    ],
    "Hóa Học": [
        {
            id: "c10_1", subject: "Hóa Học", grade: "10",
            content: "Hạt mang điện tích dương trong hạt nhân nguyên tử là:",
            options: ["A. Proton", "B. Electron", "C. Nơtron", "D. Positron"],
            correct: "A",
            explanation: "Hạt nhân nguyên tử gồm proton (mang điện tích dương +1) và nơtron (không mang điện)."
        },
        {
            id: "c10_2", subject: "Hóa Học", grade: "10",
            content: "Số thứ tự của một ô nguyên tố trong bảng tuần hoàn bằng:",
            options: ["A. Số hiệu nguyên tử (Z)", "B. Số khối (A)", "C. Số electron lớp ngoài cùng", "D. Số nơtron"],
            correct: "A",
            explanation: "Các nguyên tố trong bảng tuần hoàn được sắp xếp theo chiều tăng dần của điện tích hạt nhân, số thứ tự ô = số proton = Z."
        },
        {
            id: "c10_3", subject: "Hóa Học", grade: "10",
            content: "Liên kết hóa học trong phân tử natri clorua (NaCl) thuộc loại liên kết nào?",
            options: ["A. Liên kết ion", "B. Liên kết cộng hóa trị có cực", "C. Liên kết cộng hóa trị không cực", "D. Liên kết kim loại"],
            correct: "A",
            explanation: "NaCl được hình thành do lực hút tĩnh điện giữa ion Na⁺ và ion Cl⁻, đây là liên kết ion điển hình."
        },
        {
            id: "c10_4", subject: "Hóa Học", grade: "10",
            content: "Số oxi hóa của nguyên tử lưu huỳnh (S) trong phân tử H₂SO₄ là:",
            options: ["A. +6", "B. +4", "C. -2", "D. 0"],
            correct: "A",
            explanation: "Gọi số oxi hóa của S là x: 2*(+1) + x + 4*(-2) = 0 ⇔ 2 + x - 8 = 0 ⇔ x = +6."
        },
        {
            id: "c10_5", subject: "Hóa Học", grade: "10",
            content: "Trong một phản ứng oxi hóa - khử, chất khử là chất:",
            options: ["A. Nhường electron", "B. Nhận electron", "C. Không thay đổi số oxi hóa", "D. Chỉ nhận proton"],
            correct: "A",
            explanation: "Ghi nhớ quy tắc: 'Khử cho - O nhận' (chất khử nhường electron, chất oxi hóa nhận electron)."
        },
        {
            id: "c10_6", subject: "Hóa Học", grade: "10",
            content: "Yếu tố nào sau đây KHÔNG làm tăng tốc độ của phản ứng hóa học?",
            options: ["A. Giảm nhiệt độ phản ứng", "B. Tăng nồng độ chất phản ứng", "C. Tăng diện tích tiếp xúc", "D. Sử dụng chất xúc tác thích hợp"],
            correct: "A",
            explanation: "Giảm nhiệt độ làm giảm chuyển động nhiệt của các phân tử, làm giảm số va chạm hiệu quả nên làm giảm tốc độ phản ứng."
        },
        {
            id: "c10_7", subject: "Hóa Học", grade: "10",
            content: "Phản ứng tỏa nhiệt là phản ứng có biến thiên enthalpy chuẩn thỏa mãn:",
            options: ["A. Δr H°₂₉₈ < 0", "B. Δr H°₂₉₈ > 0", "C. Δr H°₂₉₈ = 0", "D. Δr H°₂₉₈ ≥ 0"],
            correct: "A",
            explanation: "Phản ứng tỏa nhiệt giải phóng năng lượng ra môi trường xung quanh, biến thiên enthalpy mang giá trị âm (Δr H°₂₉₈ < 0)."
        },
        {
            id: "c10_8", subject: "Hóa Học", grade: "10",
            content: "Đơn chất halogen nào sau đây có tính oxi hóa mạnh nhất?",
            options: ["A. Flo (F₂)", "B. Clo (Cl₂)", "C. Brom (Br₂)", "D. Iot (I₂)"],
            correct: "A",
            explanation: "Trong nhóm VIIA (halogen), tính oxi hóa giảm dần từ trên xuống dưới: F₂ > Cl₂ > Br₂ > I₂. Flo là phi kim mạnh nhất."
        },
        {
            id: "c10_9", subject: "Hóa Học", grade: "10",
            content: "Dung dịch axit clohiđric (HCl) làm quỳ tím chuyển sang màu gì?",
            options: ["A. Màu đỏ", "B. Màu xanh", "C. Màu tím", "D. Mất màu"],
            correct: "A",
            explanation: "Dung dịch axit làm quỳ tím chuyển sang màu đỏ (hoặc hồng), dung dịch bazơ làm quỳ tím hóa xanh."
        },
        {
            id: "c10_10", subject: "Hóa Học", grade: "10",
            content: "Cấu hình electron lớp ngoài cùng của các nguyên tử khí hiếm (trừ He) có dạng chung là:",
            options: ["A. ns²np⁶", "B. ns²np⁴", "C. ns²np⁵", "D. ns¹"],
            correct: "A",
            explanation: "Khí hiếm có 8 electron lớp ngoài cùng bền vững cấu hình ns²np⁶ (riêng Heli có 2 electron cấu hình 1s²)."
        }
    ],
    "Sinh Học": [
        {
            id: "b10_1", subject: "Sinh Học", grade: "10",
            content: "Đơn vị cơ bản cấu tạo nên mọi cơ thể sinh vật là:",
            options: ["A. Tế bào", "B. Mô", "C. Cơ quan", "D. Bào quan"],
            correct: "A",
            explanation: "Theo học thuyết tế bào: Tế bào là đơn vị cấu trúc và chức năng cơ bản của mọi sinh vật sống."
        },
        {
            id: "b10_2", subject: "Sinh Học", grade: "10",
            content: "Đơn phân cấu tạo nên phân tử protein là:",
            options: ["A. Axit amin", "B. Nucleotit", "C. Glucozơ", "D. Axit béo"],
            correct: "A",
            explanation: "Protein là đại phân tử sinh học được cấu tạo theo nguyên tắc đa phân từ khoảng 20 loại axit amin khác nhau."
        },
        {
            id: "b10_3", subject: "Sinh Học", grade: "10",
            content: "Đặc điểm nổi bật nhất của tế bào nhân sơ so với tế bào nhân thực là:",
            options: ["A. Chưa có màng nhân bao bọc vật chất di truyền", "B. Kích thước tế bào lớn hơn nhiều", "C. Có nhiều bào quan có màng bao bọc", "D. Không có ribosome"],
            correct: "A",
            explanation: "Tế bào nhân sơ (như vi khuẩn) có vùng nhân chứa phân tử ADN trần, chưa có màng nhân ngăn cách với tế bào chất."
        },
        {
            id: "b10_4", subject: "Sinh Học", grade: "10",
            content: "Bào quan nào được ví như 'nhà máy sản xuất năng lượng ATP' của tế bào nhân thực?",
            options: ["A. Ti thể", "B. Ribosome", "C. Không bào", "D. Bộ máy Golgi"],
            correct: "A",
            explanation: "Ti thể là nơi diễn ra quá trình hô hấp tế bào, phân giải chất hữu cơ để tổng hợp phần lớn năng lượng ATP cung cấp cho các hoạt động sống."
        },
        {
            id: "b10_5", subject: "Sinh Học", grade: "10",
            content: "Pha sáng của quá trình quang hợp ở thực vật diễn ra tại đâu trong lục lạp?",
            options: ["A. Màng thylakoid", "B. Chất nền stroma", "C. Màng ngoài lục lạp", "D. Ribosome của lục lạp"],
            correct: "A",
            explanation: "Màng thylakoid chứa hệ sắc tố diệp lục và chuỗi truyền electron quang hợp, là nơi diễn ra các phản ứng của pha sáng."
        },
        {
            id: "b10_6", subject: "Sinh Học", grade: "10",
            content: "Kết quả của một lần phân bào nguyên phân từ một tế bào mẹ (2n) là tạo ra:",
            options: ["A. 2 tế bào con có bộ NST 2n giống hệt tế bào mẹ", "B. 4 tế bào con có bộ NST n", "C. 2 tế bào con có bộ NST n", "D. 4 tế bào con có bộ NST 2n"],
            correct: "A",
            explanation: "Nguyên phân là hình thức phân bào duy trì ổn định bộ NST lưỡng bội, tạo 2 tế bào con mang bộ NST 2n giống hệt tế bào mẹ."
        },
        {
            id: "b10_7", subject: "Sinh Học", grade: "10",
            content: "Hình thức phân chia tế bào sinh dục chín để tạo ra các giao tử mang bộ NST đơn bội (n) là:",
            options: ["A. Giảm phân", "B. Nguyên phân", "C. Trực phân", "D. Nảy chồi"],
            correct: "A",
            explanation: "Giảm phân gồm 2 lần phân bào liên tiếp nhưng chỉ nhân đôi NST 1 lần, tạo ra 4 tế bào con có bộ NST giảm đi một nửa (đơn bội n)."
        },
        {
            id: "b10_8", subject: "Sinh Học", grade: "10",
            content: "Nước có tính phân cực cao nhờ vào đặc điểm nào sau đây?",
            options: [
                "A. Nguyên tử Oxi mang điện tích âm cục bộ, hai nguyên tử Hiđro mang điện tích dương cục bộ",
                "B. Liên kết giữa H và O là liên kết ion",
                "C. Phân tử nước có dạng đường thẳng",
                "D. Khối lượng nguyên tử Oxi quá nhỏ"
            ],
            correct: "A",
            explanation: "Độ âm điện của O lớn hơn H làm cặp electron dùng chung lệch về phía O, tạo cho phân tử nước có tính phân cực và khả năng tạo liên kết hiđrô."
        },
        {
            id: "b10_9", subject: "Sinh Học", grade: "10",
            content: "Đặc điểm nào sau đây chứng minh virus chưa phải là một cơ thể sinh vật hoàn chỉnh?",
            options: ["A. Chưa có cấu tạo tế bào và chỉ nhân lên trong tế bào chủ", "B. Kích thước siêu hiển vi", "C. Không có vật chất di truyền", "D. Không có vỏ protein"],
            correct: "A",
            explanation: "Virus chỉ là dạng sống tiền tế bào gồm lõi axit nucleic và vỏ capsid protein, bắt buộc kí sinh nội bào."
        },
        {
            id: "b10_10", subject: "Sinh Học", grade: "10",
            content: "Loại đường nào sau đây là nguồn cung cấp năng lượng nhanh nhất cho các hoạt động của tế bào?",
            options: ["A. Glucozơ", "B. Xenlulozơ", "C. Tinh bột", "D. Glicogen"],
            correct: "A",
            explanation: "Glucozơ là đường đơn dễ dàng đi vào con đường đường phân để tạo ATP cung cấp năng lượng cho tế bào."
        }
    ],
    "Lịch Sử": [
        {
            id: "h10_1", subject: "Lịch Sử", grade: "10",
            content: "Khái niệm 'hiện thực lịch sử' dùng để chỉ:",
            options: [
                "A. Toàn bộ những gì đã diễn ra trong quá khứ, tồn tại độc lập khách quan",
                "B. Nhận thức chủ quan của các nhà sử học về quá khứ",
                "C. Những câu chuyện truyền thuyết dân gian truyền miệng",
                "D. Dự đoán về tương lai của nhân loại"
            ],
            correct: "A",
            explanation: "Hiện thực lịch sử là tất cả những sự kiện, biến cố đã diễn ra trong quá khứ, không phụ thuộc vào ý muốn của con người."
        },
        {
            id: "h10_2", subject: "Lịch Sử", grade: "10",
            content: "Điểm chung nổi bật về vị trí địa lí hình thành các nền văn minh cổ đại phương Đông là:",
            options: [
                "A. Đều hình thành trên lưu vực các con sông lớn màu mỡ",
                "B. Nằm ven bờ các vùng biển sâu thuận lợi giao thương hàng hải",
                "C. Nằm ở vùng cao nguyên hiểm trở",
                "D. Nằm ở vùng sa mạc khô hạn hoàn toàn"
            ],
            correct: "A",
            explanation: "Các nền văn minh phương Đông đều gắn liền với nông nghiệp trồng lúa nước ven các con sông lớn: sông Nin, sông Hằng, sông Hoàng Hà, sông Tigris và Euphrates."
        },
        {
            id: "h10_3", subject: "Lịch Sử", grade: "10",
            content: "Di vật tiêu biểu nhất phản ánh đỉnh cao kĩ thuật luyện kim và mỹ thuật của cư dân Văn Lang - Âu Lạc là:",
            options: ["A. Trống đồng Đông Sơn", "B. Cọc gỗ Bạch Đằng", "C. Tượng phật A Di Đà", "D. Gốm hoa nâu thời Lý"],
            correct: "A",
            explanation: "Trống đồng Đông Sơn (như trống đồng Ngọc Lũ) là hiện vật tiêu biểu rực rỡ nhất minh chứng cho nền văn minh sông Hồng thời kỳ đầu."
        },
        {
            id: "h10_4", subject: "Lịch Sử", grade: "10",
            content: "Công trình quân sự phòng thủ kiên cố hình xoáy ốc được xây dựng dưới thời An Dương Vương là:",
            options: ["A. Thành Cổ Loa", "B. Thành nhà Hồ", "C. Kinh thành Huế", "D. Hoàng thành Thăng Long"],
            correct: "A",
            explanation: "Thành Cổ Loa (Đông Anh, Hà Nội) là tòa thành quân sự độc đáo gồm nhiều vòng thành xoắn ốc của nhà nước Âu Lạc."
        },
        {
            id: "h10_5", subject: "Lịch Sử", grade: "10",
            content: "Cuộc khởi nghĩa mở đầu thời kì đấu tranh chống Bắc thuộc của nhân dân ta nổ ra vào mùa xuân năm 40 là:",
            options: ["A. Khởi nghĩa Hai Bà Trưng", "B. Khởi nghĩa Bà Triệu", "C. Khởi nghĩa Lý Bí", "D. Khởi nghĩa Mai Thúc Loan"],
            correct: "A",
            explanation: "Mùa xuân năm 40, Hai Bà Trưng phất cờ khởi nghĩa tại Hát Môn đánh đuổi thái thú Tô Định, xưng vương dựng quyền tự chủ."
        },
        {
            id: "h10_6", subject: "Lịch Sử", grade: "10",
            content: "Chiến thắng vang dội trên sông Bạch Đằng năm 938 do ai lãnh đạo đã chấm dứt hơn 1.000 năm Bắc thuộc?",
            options: ["A. Ngô Quyền", "B. Đinh Bộ Lĩnh", "C. Lê Hoàn", "D. Trần Hưng Đạo"],
            correct: "A",
            explanation: "Năm 938, Ngô Quyền dùng trận địa cọc ngầm đánh tan quân Nam Hán trên sông Bạch Đằng, mở ra kỉ nguyên độc lập lâu dài."
        },
        {
            id: "h10_7", subject: "Lịch Sử", grade: "10",
            content: "Di tích văn hóa Óc Eo (An Giang) thuộc về nền văn minh cổ đại nào ở Nam Bộ nước ta?",
            options: ["A. Văn minh Phù Nam", "B. Văn minh Champa", "C. Văn minh Đại Việt", "D. Văn minh Đông Sơn"],
            correct: "A",
            explanation: "Văn hóa Óc Eo là cơ sở vật chất hình thành và phát triển của vương quốc cổ Phù Nam từ thế kỉ I đến thế kỉ VII."
        },
        {
            id: "h10_8", subject: "Lịch Sử", grade: "10",
            content: "Hệ thống chữ viết tượng hình cổ xưa nhất của người Ai Cập cổ đại được khắc chủ yếu trên chất liệu nào?",
            options: ["A. Giấy papyrus và đá", "B. Vỏ rùa và xương thú", "C. Mai rùa và thẻ tre", "D. Giấy dó"],
            correct: "A",
            explanation: "Người Ai Cập cổ đại phát minh chữ tượng hình và viết trên giấy làm từ cây papyrus hoặc khắc trên vách đá lăng mộ, kim tự tháp."
        },
        {
            id: "h10_9", subject: "Lịch Sử", grade: "10",
            content: "Đại hội thể thao nào thời cổ đại bắt nguồn từ đất nước Hy Lạp để tôn vinh các vị thần?",
            options: ["A. Thế vận hội Olympic", "B. Đại hội thể thao ASIAD", "C. Giải bóng đá thế giới", "D. Đấu trường La Mã"],
            correct: "A",
            explanation: "Đại hội thể thao Olympic cổ đại được tổ chức 4 năm một lần tại đền thờ thần Zeus ở Olympia (Hy Lạp cổ đại)."
        },
        {
            id: "h10_10", subject: "Lịch Sử", grade: "10",
            content: "Nội dung nào phản ánh đúng mục tiêu cơ bản của các cuộc cách mạng tư sản thời cận đại?",
            options: [
                "A. Xóa bỏ chế độ phong kiến, mở đường cho chủ nghĩa tư bản phát triển",
                "B. Bảo vệ quyền lực tuyệt đối của vua chúa",
                "C. Xây dựng nền kinh tế tự cấp tự túc",
                "D. Khôi phục chế độ nô lệ cổ đại"
            ],
            correct: "A",
            explanation: "Các cuộc cách mạng tư sản nhằm lật đổ chế độ quân chủ chuyên chế hoặc ách thống trị ngoại bang để thiết lập quan hệ sản xuất tư bản chủ nghĩa."
        }
    ],
    "Địa Lí": [
        {
            id: "g10_1", subject: "Địa Lí", grade: "10",
            content: "Kinh tuyến gốc (kinh độ 0°) theo quy ước quốc tế đi qua địa điểm nào sau đây?",
            options: ["A. Đài thiên văn Greenwich (Luân Đôn, Anh)", "B. Tháp Eiffel (Paris, Pháp)", "C. Tượng Nữ thần Tự do (Mỹ)", "D. Quảng trường Đỏ (Nga)"],
            correct: "A",
            explanation: "Hội nghị kinh tuyến quốc tế năm 1884 quy định kinh tuyến 0° đi qua đài thiên văn Hoàng gia Greenwich ở ngoại ô Luân Đôn."
        },
        {
            id: "g10_2", subject: "Địa Lí", grade: "10",
            content: "Thạch quyển bao gồm những bộ phận nào của Trái Đất?",
            options: ["A. Vỏ Trái Đất và phần trên cùng của lớp manti", "B. Chỉ riêng lớp vỏ Trái Đất", "C. Vỏ Trái Đất và toàn bộ lớp nhân", "D. Toàn bộ lớp manti"],
            correct: "A",
            explanation: "Thạch quyển là phần cứng ngoài cùng của Trái Đất, có độ dày khoảng 100 km, gồm vỏ Trái Đất và phần trên lớp manti."
        },
        {
            id: "g10_3", subject: "Địa Lí", grade: "10",
            content: "Tầng đối lưu của khí quyển là nơi diễn ra các hiện tượng thời tiết chủ yếu do:",
            options: [
                "A. Tập trung khoảng 80% khối lượng không khí và hầu hết hơi nước",
                "B. Không khí loãng nhất trong các tầng",
                "C. Nhiệt độ tăng dần theo độ cao",
                "D. Chứa tầng ozon hấp thụ tia cực tím"
            ],
            correct: "A",
            explanation: "Tầng đối lưu chứa gần như toàn bộ hơi nước và các hạt nhân ngưng tụ nên sinh ra mây, mưa, sương mù, bão."
        },
        {
            id: "g10_4", subject: "Địa Lí", grade: "10",
            content: "Hiện tượng sóng thần trên các đại dương thường phát sinh chủ yếu do nguyên nhân nào?",
            options: ["A. Động đất hoặc núi lửa phun ngầm dưới đáy biển", "B. Gió bão cực mạnh trên mặt biển", "C. Lực hút của Mặt Trăng và Mặt Trời", "D. Dòng hải lưu ngầm dịch chuyển"],
            correct: "A",
            explanation: "Sóng thần là sóng biển có bước sóng cực dài do sự dịch chuyển khối nước đột ngột vì động đất hoặc sụt lún dưới đáy biển."
        },
        {
            id: "g10_5", subject: "Địa Lí", grade: "10",
            content: "Nhân tố nào đóng vai trò cung cấp chất khoáng vô cơ chủ yếu trong quá trình hình thành đất?",
            options: ["A. Đá mẹ", "B. Khí hậu", "C. Sinh vật", "D. Thời gian"],
            correct: "A",
            explanation: "Đá mẹ bị phong hóa sinh ra các hạt khoáng, quyết định thành phần khoáng vật và cơ giới của đất."
        },
        {
            id: "g10_6", subject: "Địa Lí", grade: "10",
            content: "Gia tăng dân số tự nhiên của một quốc gia được xác định bằng hiệu số giữa:",
            options: ["A. Tỉ suất sinh thô và tỉ suất tử thô", "B. Tỉ suất xuất cư và nhập cư", "C. Dân số thành thị và nông thôn", "D. Số người trong độ tuổi lao động và người già"],
            correct: "A",
            explanation: "Gia tăng tự nhiên (%) = Tỉ suất sinh thô (‰) - Tỉ suất tử thô (‰)."
        },
        {
            id: "g10_7", subject: "Địa Lí", grade: "10",
            content: "Quá trình đô thị hóa biểu hiện rõ nét nhất qua đặc điểm nào sau đây?",
            options: [
                "A. Tỉ lệ dân số thành thị tăng nhanh và lối sống đô thị phổ biến",
                "B. Thu hẹp diện tích đất đai của các thành phố",
                "C. Tăng tỉ trọng lao động làm nghề nông nghiệp",
                "D. Giảm số lượng các khu công nghiệp tập trung"
            ],
            correct: "A",
            explanation: "Đô thị hóa là quá trình kinh tế - xã hội thể hiện qua việc tăng tỉ lệ dân cư đô thị và mở rộng không gian, lối sống thành thị."
        },
        {
            id: "g10_8", subject: "Địa Lí", grade: "10",
            content: "Ngành sản xuất nông nghiệp có đặc điểm quan trọng khác biệt lớn nhất so với công nghiệp là:",
            options: [
                "A. Đất trồng là tư liệu sản xuất chủ yếu và không thể thay thế",
                "B. Không phụ thuộc vào điều kiện tự nhiên",
                "C. Sản xuất có tính tập trung cao độ trong các nhà máy",
                "D. Thời gian sản xuất ngắn hơn thời gian lao động"
            ],
            correct: "A",
            explanation: "Đất trồng là tư liệu sản xuất đặc biệt và đối tượng lao động là cây trồng, vật nuôi phụ thuộc vào quy luật sinh học."
        },
        {
            id: "g10_9", subject: "Địa Lí", grade: "10",
            content: "Loại hình giao thông vận tải có ưu điểm tiện lợi, cơ động, thích nghi cao với nhiều dạng địa hình là:",
            options: ["A. Đường ô tô (đường bộ)", "B. Đường sắt", "C. Đường hàng không", "D. Đường ống"],
            correct: "A",
            explanation: "Đường bộ có thể đi vào tận ngõ ngách, bản làng, phối hợp linh hoạt với mọi phương tiện vận tải khác."
        },
        {
            id: "g10_10", subject: "Địa Lí", grade: "10",
            content: "Phát triển bền vững là sự phát triển nhằm đáp ứng nhu cầu hiện tại mà:",
            options: [
                "A. Không làm tổn hại đến khả năng đáp ứng nhu cầu của các thế hệ tương lai",
                "B. Khai thác cạn kiệt tài nguyên thiên nhiên nhanh nhất để làm giàu",
                "C. Ưu tiên phát triển kinh tế bằng mọi giá bất chấp ô nhiễm",
                "D. Dừng toàn bộ các hoạt động sản xuất công nghiệp"
            ],
            correct: "A",
            explanation: "Định nghĩa chuẩn của Ủy ban Môi trường và Phát triển Thế giới (WCED) kết hợp hài hòa 3 trụ cột: Kinh tế - Xã hội - Môi trường."
        }
    ],
    "GDKT&PL": [
        {
            id: "l10_1", subject: "GDKT&PL", grade: "10",
            content: "Chủ thể nào trong nền kinh tế trực tiếp sử dụng các yếu tố sản xuất để tạo ra sản phẩm hàng hóa, dịch vụ?",
            options: ["A. Chủ thể sản xuất", "B. Chủ thể tiêu dùng", "C. Chủ thể trung gian", "D. Chủ thể nhà nước"],
            correct: "A",
            explanation: "Chủ thể sản xuất là những người trực tiếp sản xuất, cung cấp của cải vật chất và dịch vụ đáp ứng nhu cầu xã hội."
        },
        {
            id: "l10_2", subject: "GDKT&PL", grade: "10",
            content: "Quy luật kinh tế nào điều tiết tỉ lệ tương quan giữa người bán và người mua, tác động trực tiếp đến giá cả thị trường?",
            options: ["A. Quy luật cung - cầu", "B. Quy luật lưu thông tiền tệ", "C. Quy luật cạnh tranh", "D. Quy luật giá trị thặng dư"],
            correct: "A",
            explanation: "Cung - cầu là mối quan hệ tác động qua lại giữa người bán và người mua, quyết định mức giá cân bằng trên thị trường."
        },
        {
            id: "l10_3", subject: "GDKT&PL", grade: "10",
            content: "Khoản thu bắt buộc, không hoàn trả trực tiếp mà các tổ chức, cá nhân phải nộp vào ngân sách nhà nước là:",
            options: ["A. Thuế", "B. Phí dịch vụ", "C. Lệ phí", "D. Tiền phạt vi phạm"],
            correct: "A",
            explanation: "Thuế là nguồn thu cốt lõi của ngân sách nhà nước, có tính cưỡng chế và không mang tính hoàn trả trực tiếp."
        },
        {
            id: "l10_4", subject: "GDKT&PL", grade: "10",
            content: "Quan hệ chuyển nhượng quyền sử dụng vốn giữa bên cho vay và bên đi vay có thời hạn và phải trả lãi gọi là:",
            options: ["A. Tín dụng", "B. Khuyến mãi", "C. Đầu cơ", "D. Trợ cấp xã hội"],
            correct: "A",
            explanation: "Tín dụng là quan hệ vay mượn tài sản dựa trên nguyên tắc hoàn trả cả gốc lẫn lãi sau một thời gian nhất định."
        },
        {
            id: "l10_5", subject: "GDKT&PL", grade: "10",
            content: "Việc lập kế hoạch tài chính cá nhân mang lại lợi ích chủ yếu nào cho học sinh?",
            options: [
                "A. Quản lí chi tiêu hợp lí, chủ động nguồn tài chính và hình thành thói quen tiết kiệm",
                "B. Giúp kiếm được thật nhiều tiền ngay lập tức",
                "C. Không cần phải học tập kiến thức văn hóa",
                "D. Tiêu xài thoải mái không cần ghi chép"
            ],
            correct: "A",
            explanation: "Kế hoạch tài chính giúp phân bổ tiền tiêu vặt, học tập hợp lý, tránh lãng phí và chuẩn bị cho các mục tiêu tương lai."
        },
        {
            id: "l10_6", subject: "GDKT&PL", grade: "10",
            content: "Văn bản quy phạm pháp luật có hiệu lực pháp lí cao nhất trong hệ thống pháp luật Việt Nam là:",
            options: ["A. Hiến pháp", "B. Bộ luật Dân sự", "C. Luật Giáo dục", "D. Nghị định của Chính phủ"],
            correct: "A",
            explanation: "Hiến pháp là đạo luật cơ bản của Nhà nước, mọi văn bản pháp luật khác đều phải phù hợp với Hiến pháp."
        },
        {
            id: "l10_7", subject: "GDKT&PL", grade: "10",
            content: "Cơ quan duy nhất có quyền lập hiến và lập pháp ở nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là:",
            options: ["A. Quốc hội", "B. Chính phủ", "C. Viện kiểm sát nhân dân tối cao", "D. Mặt trận Tổ quốc"],
            correct: "A",
            explanation: "Điều 69 Hiến pháp quy định Quốc hội là cơ quan đại biểu cao nhất của Nhân dân, thực hiện quyền lập hiến và lập pháp."
        },
        {
            id: "l10_8", subject: "GDKT&PL", grade: "10",
            content: "Cơ quan thực hiện quyền xét xử, bảo vệ công lí và bảo vệ quyền con người ở nước ta là:",
            options: ["A. Tòa án nhân dân", "B. Công an nhân dân", "C. Ủy ban nhân dân", "D. Hội đồng nhân dân"],
            correct: "A",
            explanation: "Tòa án nhân dân là cơ quan xét xử của nước CHXHCN Việt Nam, thực hiện quyền tư pháp."
        },
        {
            id: "l10_9", subject: "GDKT&PL", grade: "10",
            content: "Công dân có quyền tự do lựa chọn ngành nghề kinh doanh mà pháp luật không cấm thể hiện nội dung của quyền nào?",
            options: ["A. Quyền tự do kinh doanh", "B. Quyền lao động công ích", "C. Quyền độc quyền sản xuất", "D. Quyền miễn trừ nộp thuế"],
            correct: "A",
            explanation: "Hiến pháp và pháp luật bảo đảm quyền tự do kinh doanh trong các ngành nghề mà pháp luật không cấm."
        },
        {
            id: "l10_10", subject: "GDKT&PL", grade: "10",
            content: "Hành vi nào sau đây thể hiện trách nhiệm của học sinh trong việc chấp hành pháp luật bảo vệ môi trường?",
            options: [
                "A. Phân loại rác thải tại nguồn và không vứt rác bừa bãi",
                "B. Tự ý xả hóa chất thí nghiệm xuống cống thoát nước",
                "C. Đốt rác nhựa công khai trong khuôn viên trường",
                "D. Khai thác cát trái phép trên sông"
            ],
            correct: "A",
            explanation: "Phân loại rác tại nguồn, giữ gìn vệ sinh chung là hành động thiết thực, văn minh của học sinh đối với môi trường sống."
        }
    ],
    "Tiếng Anh": [
        {
            id: "e10_1", subject: "Tiếng Anh", grade: "10",
            content: "My father usually ________ the newspaper while having morning coffee.",
            options: ["A. reads", "B. is reading", "C. read", "D. has read"],
            correct: "A",
            explanation: "Thì hiện tại đơn diễn tả thói quen lặp đi lặp lại có trạng từ 'usually': chủ ngữ 'My father' số ít đi với động từ thêm -s 'reads'."
        },
        {
            id: "e10_2", subject: "Tiếng Anh", grade: "10",
            content: "Listen! Someone ________ at the front door.",
            options: ["A. is knocking", "B. knocks", "C. knocked", "D. was knocking"],
            correct: "A",
            explanation: "Dấu hiệu 'Listen!' diễn tả hành động đang xảy ra tại thời điểm nói -> chia ở thì hiện tại tiếp diễn 'is knocking'."
        },
        {
            id: "e10_3", subject: "Tiếng Anh", grade: "10",
            content: "We ________ our grandparents in the countryside two weeks ago.",
            options: ["A. visited", "B. visit", "C. have visited", "D. are visiting"],
            correct: "A",
            explanation: "Dấu hiệu 'two weeks ago' là mốc thời gian xác định trong quá khứ -> dùng thì quá khứ đơn (V-ed) 'visited'."
        },
        {
            id: "e10_4", subject: "Tiếng Anh", grade: "10",
            content: "Learning English through songs is much ________ than memorising grammar rules alone.",
            options: ["A. more interesting", "B. interesting", "C. most interesting", "D. as interesting"],
            correct: "A",
            explanation: "So sánh hơn của tính từ dài 'interesting' có 'than' -> cấu trúc: more + adj + than -> 'more interesting'."
        },
        {
            id: "e10_5", subject: "Tiếng Anh", grade: "10",
            content: "Mount Everest is the ________ mountain peak in the world.",
            options: ["A. highest", "B. higher", "C. most high", "D. high"],
            correct: "A",
            explanation: "So sánh nhất của tính từ ngắn 'high' -> the + adj-est -> 'the highest'."
        },
        {
            id: "e10_6", subject: "Tiếng Anh", grade: "10",
            content: "Students ________ cheat in examinations under any circumstances.",
            options: ["A. mustn't", "B. needn't", "C. don't have to", "D. shouldn't"],
            correct: "A",
            explanation: "'mustn't' diễn tả sự cấm đoán tuyệt đối trong nội quy thi cử."
        },
        {
            id: "e10_7", subject: "Tiếng Anh", grade: "10",
            content: "________ it was raining heavily, the volunteers continued planting trees.",
            options: ["A. Although", "B. Because", "C. Despite", "D. In spite of"],
            correct: "A",
            explanation: "'Although' đi với một mệnh đề (S + V) diễn tả sự tương phản: Mặc dù trời mưa to nhưng các tình nguyện viên vẫn tiếp tục."
        },
        {
            id: "e10_8", subject: "Tiếng Anh", grade: "10",
            content: "The modern smartphone is considered one of the greatest ________ of the 21st century.",
            options: ["A. inventions", "B. inventors", "C. invent", "D. inventive"],
            correct: "A",
            explanation: "Sau 'one of the greatest' cần danh từ số nhiều chỉ vật: 'inventions' (những phát minh)."
        },
        {
            id: "e10_9", subject: "Tiếng Anh", grade: "10",
            content: "Young people enjoy ________ part in community service activities.",
            options: ["A. taking", "B. to take", "C. take", "D. took"],
            correct: "A",
            explanation: "Động từ 'enjoy' đi kèm với danh động từ V-ing: 'enjoy doing something' -> 'enjoy taking part in'."
        },
        {
            id: "e10_10", subject: "Tiếng Anh", grade: "10",
            content: "Our school's STEM competition will take place ________ October 15th.",
            options: ["A. on", "B. in", "C. at", "D. for"],
            correct: "A",
            explanation: "Giới từ đi với ngày cụ thể trong tháng (October 15th) luôn là 'on'."
        }
    ],
    "Tin Học": [
        {
            id: "t10_1", subject: "Tin Học", grade: "10",
            content: "Đơn vị cơ bản nhỏ nhất dùng để đo lường lượng thông tin trong máy tính là:",
            options: ["A. Bit", "B. Byte", "C. Kilobyte", "D. Megabyte"],
            correct: "A",
            explanation: "Bit (Binary Digit) nhận một trong hai giá trị 0 hoặc 1 là đơn vị cơ bản nhỏ nhất đo lường thông tin số."
        },
        {
            id: "t10_2", subject: "Tin Học", grade: "10",
            content: "Một Byte bằng bao nhiêu Bit?",
            options: ["A. 8 bit", "B. 2 bit", "C. 16 bit", "D. 1024 bit"],
            correct: "A",
            explanation: "1 Byte = 8 bits. Một byte đủ để biểu diễn một kí tự trong bảng mã ASCII."
        },
        {
            id: "t10_3", subject: "Tin Học", grade: "10",
            content: "Trong ngôn ngữ lập trình Python, hàm nào dùng để nhập dữ liệu từ bàn phím?",
            options: ["A. input()", "B. print()", "C. scan()", "D. read()"],
            correct: "A",
            explanation: "Hàm `input()` trong Python nhận một chuỗi ký tự người dùng nhập từ bàn phím."
        },
        {
            id: "t10_4", subject: "Tin Học", grade: "10",
            content: "Trong Python, kết quả của biểu thức `17 % 5` là:",
            options: ["A. 2", "B. 3", "C. 3.4", "D. 1"],
            correct: "A",
            explanation: "Toán tử `%` là phép chia lấy phần dư: 17 chia cho 5 được 3 dư 2, do đó `17 % 5 = 2`."
        },
        {
            id: "t10_5", subject: "Tin Học", grade: "10",
            content: "Vòng lặp `for i in range(1, 5):` trong Python sẽ thực hiện bao nhiêu lần lặp?",
            options: ["A. 4 lần (với i = 1, 2, 3, 4)", "B. 5 lần (với i = 1, 2, 3, 4, 5)", "C. 3 lần", "D. Vô hạn lần"],
            correct: "A",
            explanation: "Hàm `range(start, stop)` sinh các giá trị từ start đến stop - 1. Ở đây sinh các giá trị 1, 2, 3, 4 (tổng cộng 4 lần lặp)."
        },
        {
            id: "t10_6", subject: "Tin Học", grade: "10",
            content: "Kiểu dữ liệu nào trong Python được dùng để lưu trữ một tập hợp các phần tử có thứ tự và có thể thay đổi?",
            options: ["A. list", "B. tuple", "C. int", "D. str"],
            correct: "A",
            explanation: "Kiểu danh sách `list` (đặt trong dấu ngoặc vuông `[...]`) là cấu trúc dữ liệu có thứ tự và có thể thay đổi (mutable)."
        },
        {
            id: "t10_7", subject: "Tin Học", grade: "10",
            content: "Mạng máy tính được kết nối trong phạm vi hẹp như một phòng học, một tòa nhà gọi là mạng:",
            options: ["A. LAN (Local Area Network)", "B. WAN (Wide Area Network)", "C. MAN (Metropolitan Area Network)", "D. Internet"],
            correct: "A",
            explanation: "LAN là mạng cục bộ kết nối các máy tính trong một phạm vi địa lý hẹp."
        },
        {
            id: "t10_8", subject: "Tin Học", grade: "10",
            content: "Phần mềm nào sau đây là trình duyệt web dùng để truy cập Internet?",
            options: ["A. Google Chrome", "B. Microsoft Word", "C. Adobe Photoshop", "D. Python IDLE"],
            correct: "A",
            explanation: "Google Chrome, Mozilla Firefox, Microsoft Edge, Safari là các trình duyệt web phổ biến."
        },
        {
            id: "t10_9", subject: "Tin Học", grade: "10",
            content: "Mật khẩu nào sau đây được xem là mật khẩu có độ bảo mật cao và an toàn nhất?",
            options: ["A. Nls@2026#Stem", "B. 12345678", "C. namluongson", "D. 01012008"],
            correct: "A",
            explanation: "Mật khẩu mạnh kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt, không liên quan đến thông tin cá nhân dễ đoán."
        },
        {
            id: "t10_10", subject: "Tin Học", grade: "10",
            content: "Hành vi nào sau đây vi phạm quyền tác giả và đạo đức khi sử dụng công nghệ số?",
            options: [
                "A. Sao chép bài làm của người khác trên mạng rồi nộp làm của mình mà không trích dẫn nguồn",
                "B. Ghi rõ nguồn tác giả khi sử dụng tài liệu học tập",
                "C. Sử dụng phần mềm mã nguồn mở đúng quy định",
                "D. Chia sẻ kiến thức học tập bổ ích với bạn bè"
            ],
            correct: "A",
            explanation: "Đạo văn hoặc sao chép sản phẩm số của người khác mà không xin phép, không trích dẫn là hành vi vi phạm đạo đức và bản quyền số."
        }
    ],
    "Công Nghệ": [
        {
            id: "cn10_1", subject: "Công Nghệ", grade: "10", period: "mid1", topic: "Bản vẽ kĩ thuật & Hình chiếu",
            content: "Trong phương pháp chiếu góc thứ nhất, hướng chiếu từ trước tới vật thể cho ta hình chiếu nào?",
            options: ["A. Hình chiếu đứng", "B. Hình chiếu bằng", "C. Hình chiếu cạnh", "D. Hình chiếu trục đo"],
            correct: "A",
            explanation: "Hướng chiếu từ trước tới cho hình chiếu đứng; từ trên xuống cho hình chiếu bằng; từ trái sang cho hình chiếu cạnh."
        },
        {
            id: "cn10_2", subject: "Công Nghệ", grade: "10", period: "mid1", topic: "Bản vẽ kĩ thuật & Hình chiếu",
            content: "Kích thước tiêu chuẩn của khổ giấy vẽ A4 quy định trong tiêu chuẩn TCVN là:",
            options: ["A. 210 mm × 297 mm", "B. 297 mm × 420 mm", "C. 148 mm × 210 mm", "D. 420 mm × 594 mm"],
            correct: "A",
            explanation: "Khổ giấy A4 có kích thước tiêu chuẩn là 210 mm × 297 mm (khổ A3 là 297 × 420 mm)."
        },
        {
            id: "cn10_3", subject: "Công Nghệ", grade: "10", period: "final1", topic: "Hình cắt & Mặt cắt",
            content: "Hình biểu diễn nhận được trên mặt phẳng cắt khi cắt vật thể bằng một mặt phẳng tưởng tượng được gọi là:",
            options: ["A. Mặt cắt", "B. Hình chiếu đứng", "C. Hình phối cảnh", "D. Hình chiếu phối cảnh"],
            correct: "A",
            explanation: "Mặt cắt chỉ biểu diễn phần vật thể nằm ngay trên mặt phẳng cắt; còn hình cắt biểu diễn cả mặt cắt và các đường bao phía sau mặt phẳng cắt."
        },
        {
            id: "cn10_4", subject: "Công Nghệ", grade: "10", period: "final1", topic: "Quy trình thiết kế kĩ thuật",
            content: "Bước đầu tiên trong quy trình thiết kế kĩ thuật là bước nào?",
            options: ["A. Xác định vấn đề và tìm hiểu yêu cầu của sản phẩm", "B. Chế tạo mẫu thử nghiệm", "C. Đánh giá và lập hồ sơ kĩ thuật", "D. Sản xuất hàng loạt"],
            correct: "A",
            explanation: "Quy trình thiết kế bắt đầu từ việc phát hiện nhu cầu thực tiễn, xác định vấn đề và đặt ra các tiêu chuẩn kĩ thuật cần đạt."
        },
        {
            id: "cn10_5", subject: "Công Nghệ", grade: "10", period: "mid2", topic: "Thổ nhưỡng & Đất trồng",
            content: "Khả năng của đất cung cấp đủ nước, oxy và chất dinh dưỡng cho cây trồng sinh trưởng, phát triển tốt được gọi là:",
            options: ["A. Độ phì nhiêu của đất", "B. Độ chua của đất", "C. Thành phần cơ giới của đất", "D. Khối lượng riêng của đất"],
            correct: "A",
            explanation: "Độ phì nhiêu là đặc tính quan trọng nhất của đất trồng, quyết định năng suất và phẩm chất cây trồng."
        },
        {
            id: "cn10_6", subject: "Công Nghệ", grade: "10", period: "mid2", topic: "Phân bón & Dinh dưỡng cây trồng",
            content: "Loại phân bón nào sau đây có tác dụng kích thích sự phát triển mạnh mẽ của thân, cành và lá cây?",
            options: ["A. Phân đạm (chứa Nitơ - N)", "B. Phân lân (chứa Photpho - P)", "C. Phân kali (chứa Kali - K)", "D. Phân vôi khử chua"],
            correct: "A",
            explanation: "Đạm (N) kích thích sinh trưởng sinh dưỡng (thân lá); Lân (P) kích thích rễ và ra hoa; Kali (K) tăng cường quang hợp, phẩm chất củ quả và chống chịu."
        },
        {
            id: "cn10_7", subject: "Công Nghệ", grade: "10", period: "mid2", topic: "Phân bón & Dinh dưỡng cây trồng",
            content: "Để cải tạo đất chua (pH < 6,5), biện pháp phổ biến và kinh tế nhất mà người nông dân thường áp dụng là:",
            options: ["A. Bón vôi nông nghiệp (CaCO₃, CaO)", "B. Bón nhiều phân đạm sunfat", "C. Tưới nhiều nước phèn", "D. Phun thuốc trừ sâu"],
            correct: "A",
            explanation: "Vôi có tính kiềm, phản ứng trung hòa ion H⁺ trong đất, làm tăng độ pH và khử độc cho đất chua."
        },
        {
            id: "cn10_8", subject: "Công Nghệ", grade: "10", period: "final2", topic: "Phòng trừ sâu bệnh (IPM)",
            content: "Nguyên tắc cốt lõi trong phòng trừ tổng hợp dịch hại cây trồng (IPM) là gì?",
            options: [
                "A. Ưu tiên các biện pháp sinh học, canh tác; chỉ dùng thuốc hóa học khi mật độ dịch hại vượt ngưỡng gây hại kinh tế",
                "B. Phun thuốc hóa học định kì bất kể có sâu bệnh hay không",
                "C. Tiêu diệt triệt để 100% tất cả các loài sinh vật trên đồng ruộng",
                "D. Cấm hoàn toàn việc làm cỏ bắt sâu"
            ],
            correct: "A",
            explanation: "IPM kết hợp hài hòa các biện pháp canh tác, sinh học, vật lí để duy trì mật độ sâu hại dưới ngưỡng gây hại, bảo vệ thiên địch và môi trường."
        },
        {
            id: "cn10_9", subject: "Công Nghệ", grade: "10", period: "final2", topic: "Nông nghiệp công nghệ cao",
            content: "Ưu điểm nổi bật nhất của phương pháp tưới nhỏ giọt trong trồng trọt công nghệ cao là:",
            options: [
                "A. Tiết kiệm nước tối đa và đưa dinh dưỡng hòa tan trực tiếp tới vùng rễ cây",
                "B. Làm ẩm ướt toàn bộ không gian mặt lá cây",
                "C. Thay thế hoàn toàn phân bón hữu cơ",
                "D. Giúp cây phát triển không cần ánh sáng"
            ],
            correct: "A",
            explanation: "Tưới nhỏ giọt cung cấp nước và phân bón từng giọt một trực tiếp vào gốc rễ, giảm bốc hơi, tiết kiệm tới 50-70% lượng nước tưới."
        },
        {
            id: "cn10_10", subject: "Công Nghệ", grade: "10", period: "final2", topic: "Nông nghiệp công nghệ cao",
            content: "Phương pháp trồng cây trong dung dịch dinh dưỡng khoáng không cần sử dụng đất được gọi là:",
            options: ["A. Thủy canh (Hydroponics)", "B. Luân canh", "C. Thâm canh truyền thống", "D. Khai hoang"],
            correct: "A",
            explanation: "Thủy canh là kĩ thuật trồng cây không dùng đất, rễ cây ngập trực tiếp hoặc tiếp xúc với dung dịch dinh dưỡng hòa tan."
        }
    ],
    "GDQP&AN": [
        {
            id: "qp10_1", subject: "GDQP&AN", grade: "10", period: "mid1", topic: "Truyền thống đánh giặc giữ nước",
            content: "Chiến thắng lịch sử nào vào năm 938 đã đập tan quân Nam Hán xâm lược, chấm dứt hơn 1000 năm Bắc thuộc của dân tộc ta?",
            options: ["A. Chiến thắng Bạch Đằng do Ngô Quyền lãnh đạo", "B. Khởi nghĩa Hai Bà Trưng", "C. Chiến thắng Chi Lăng - Xương Giang", "D. Chiến thắng Ngọc Hồi - Đống Đa"],
            correct: "A",
            explanation: "Trận thủy chiến trên sông Bạch Đằng năm 938 do Ngô Quyền chỉ huy đã mở ra kỉ nguyên độc lập, tự chủ lâu dài cho đất nước ta."
        },
        {
            id: "qp10_2", subject: "GDQP&AN", grade: "10", period: "mid1", topic: "Truyền thống đánh giặc giữ nước",
            content: "Nét đặc sắc nổi bật nhất trong nghệ thuật đánh giặc của cha ông ta là:",
            options: [
                "A. Toàn dân đánh giặc, kết hợp chiến tranh du kích với tác chiến của các đạo quân chủ lực",
                "B. Chỉ dựa vào thành lũy kiên cố cố thủ",
                "C. Nhờ quân đội nước ngoài đánh giúp",
                "D. Đầu hàng nhượng đất để cầu hòa"
            ],
            correct: "A",
            explanation: "Tổ tiên ta luôn phát huy sức mạnh 'cả nước chung sức đánh giặc', 'trăm họ đều là binh', kết hợp linh hoạt du kích và chủ lực."
        },
        {
            id: "qp10_3", subject: "GDQP&AN", grade: "10", period: "final1", topic: "Nghệ thuật quân sự tổ tiên",
            content: "Ba lần kháng chiến chống quân xâm lược Mông - Nguyên (thế kỉ XIII) thắng lợi vang dội dưới sự lãnh đạo của triều đại nào?",
            options: ["A. Nhà Trần", "B. Nhà Lý", "C. Nhà Tiền Lê", "D. Nhà Hậu Lê"],
            correct: "A",
            explanation: "Nhà Trần với các vua Trần và vị tướng thiên tài Hưng Đạo Đại Vương Trần Quốc Tuấn đã ba lần đánh tan quân Mông - Nguyên hung bạo nhất thế giới lúc bấy giờ."
        },
        {
            id: "qp10_4", subject: "GDQP&AN", grade: "10", period: "final1", topic: "Nghệ thuật quân sự tổ tiên",
            content: "Hịch tướng sĩ do Trần Quốc Tuấn soạn thảo thể hiện tinh thần cốt lõi nào?",
            options: [
                "A. Lòng yêu nước nồng nàn, căm thù giặc sâu sắc và ý chí quyết chiến quyết thắng bảo vệ non sông",
                "B. Lời than thở trước sức mạnh của quân địch",
                "C. Kêu gọi quân lính trốn tránh đi làm ăn",
                "D. Khuyên tướng sĩ vui chơi hưởng lạc"
            ],
            correct: "A",
            explanation: "Hịch tướng sĩ là áng văn yêu nước bất hủ, khơi dậy mạnh mẽ lòng tự tôn dân tộc và ý chí 'Sát Thát' của toàn quân Đại Việt."
        },
        {
            id: "qp10_5", subject: "GDQP&AN", grade: "10", period: "mid2", topic: "Phòng chống tệ nạn & Ma túy",
            content: "Chất ma túy tác động nguy hiểm nhất đến cơ quan nào trong cơ thể con người?",
            options: [
                "A. Hệ thần kinh trung ương và não bộ, gây nghiện ngập và biến đổi nhân cách",
                "B. Chỉ làm mỏi các khớp xương nhẹ",
                "C. Làm tăng khả năng tập trung học tập",
                "D. Tăng cường thị lực"
            ],
            correct: "A",
            explanation: "Ma túy tàn phá hệ thần kinh trung ương, gây lệ thuộc tâm thần và thể chất, dẫn đến ảo giác, hủy hoại nhân cách và suy kiệt cơ thể."
        },
        {
            id: "qp10_6", subject: "GDQP&AN", grade: "10", period: "mid2", topic: "Phòng chống tệ nạn & Ma túy",
            content: "Học sinh THPT cần làm gì khi phát hiện hành vi lôi kéo sử dụng hoặc mua bán ma túy trong học đường?",
            options: [
                "A. Tuyệt đối không tham gia và báo ngay cho ban giám hiệu nhà trường hoặc cơ quan công an",
                "B. Thử một lần cho biết rồi thôi",
                "C. Giữ bí mật giúp người vi phạm",
                "D. Rủ thêm bạn bè cùng tham gia"
            ],
            correct: "A",
            explanation: "Học sinh phải có bản lĩnh kiên quyết nói không với ma túy và kịp thời tố giác tội phạm ma túy để bảo vệ bản thân và xã hội."
        },
        {
            id: "qp10_7", subject: "GDQP&AN", grade: "10", period: "final2", topic: "Điều lệnh đội ngũ từng người",
            content: "Khi thực hiện động tác 'Đằng sau - Quay!', người tập lấy điểm nào làm trụ để quay người 180 độ sang phải?",
            options: [
                "A. Gót chân phải và mũi chân trái",
                "B. Gót chân trái và mũi chân phải",
                "C. Hai gót chân cùng lúc",
                "D. Hai mũi chân cùng lúc"
            ],
            correct: "A",
            explanation: "Động tác đằng sau quay lấy gót chân phải và mũi chân trái làm trụ, quay người 180 độ sang bên phải rồi kéo chân trái về tư thế đứng nghiêm."
        },
        {
            id: "qp10_8", subject: "GDQP&AN", grade: "10", period: "final2", topic: "Điều lệnh đội ngũ từng người",
            content: "Khoảng cách cự li chuẩn giữa người đứng trước và người đứng sau trong đội hình một hàng dọc là bao nhiêu?",
            options: ["A. 1 bước chân (khoảng 75 cm)", "B. 2 mét", "C. 3 bước chân", "D. 30 cm"],
            correct: "A",
            explanation: "Cự li giữa người trước và người sau trong đội hình hàng dọc là 1 bước chân (tính từ gót chân người trước đến đầu mũi chân người sau)."
        },
        {
            id: "qp10_9", subject: "GDQP&AN", grade: "10", period: "final2", topic: "Cấp cứu ban đầu y tế học đường",
            content: "Biện pháp sơ cứu khẩn cấp đầu tiên và quan trọng nhất khi gặp người bị say nắng, say nóng là:",
            options: [
                "A. Đưa nạn nhân ngay vào chỗ râm mát, thoáng khí, nới rộng trang phục và chườm mát hạ nhiệt",
                "B. Bắt nạn nhân tiếp tục vận động mạnh",
                "C. Đắp thêm chăn ấm kín người",
                "D. Cho uống rượu mạnh kích thích"
            ],
            correct: "A",
            explanation: "Say nắng, say nóng làm rối loạn điều nhiệt cơ thể, cần lập tức đưa vào nơi râm mát, quạt nhẹ, chườm khăn mát vào trán, cổ, bẹn để hạ nhiệt độ."
        },
        {
            id: "qp10_10", subject: "GDQP&AN", grade: "10", period: "final2", topic: "Cấp cứu ban đầu y tế học đường",
            content: "Khi nạn nhân bị đuối nước được vớt lên bờ trong tình trạng bất tỉnh, ngừng thở, việc làm cần thực hiện ngay là:",
            options: [
                "A. Khai thông đường thở và thực hiện ngay hồi sức tim phổi (ép tim ngoài lồng ngực kết hợp hà hơi thổi ngạt)",
                "B. Dốc ngược nạn nhân chạy vòng quanh sân để nước chảy ra",
                "C. Đốt lửa sưởi ấm toàn thân trước",
                "D. Chờ đợi nhân viên y tế đến mà không làm gì"
            ],
            correct: "A",
            explanation: "Hồi sinh tim phổi (CPR) kịp thời trong 'thời gian vàng' 3 - 5 phút đầu là yếu tố sống còn để cứu sống nạn nhân ngừng tim phổi do ngạt nước."
        }
    ]
};

// ==============================================================================
// NGÂN HÀNG ĐỀ THI MẪU LỚP 11 (GDPT 2018)
// ==============================================================================
const BUILTIN_EXAM_BANK_11 = {
    "Toán": [
        // CHỦ ĐỀ 1: HÀM SỐ LƯỢNG GIÁC & PHƯƠNG TRÌNH LƯỢNG GIÁC (GIỮA KÌ 1)
        {
            id: "m11_trig_1", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Tập xác định D của hàm số y = tan(x) là:",
            options: [
                "A. D = ℝ \\ {π/2 + kπ, k ∈ ℤ}",
                "B. D = ℝ \\ {kπ, k ∈ ℤ}",
                "C. D = ℝ",
                "D. D = ℝ \\ {π/2 + k2π, k ∈ ℤ}"
            ],
            correct: "A",
            explanation: "Hàm số y = tan(x) = sin(x)/cos(x) xác định khi cos(x) ≠ 0 ⇔ x ≠ π/2 + kπ (k ∈ ℤ)."
        },
        {
            id: "m11_trig_2", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Trong các hàm số sau, hàm số nào là hàm số chẵn trên tập xác định của nó?",
            options: [
                "A. y = cos(x)",
                "B. y = sin(x)",
                "C. y = tan(x)",
                "D. y = cot(x)"
            ],
            correct: "A",
            explanation: "Với mọi x ∈ ℝ, ta có cos(-x) = cos(x) nên y = cos(x) là hàm số chẵn. Các hàm số sin(x), tan(x), cot(x) đều là hàm số lẻ."
        },
        {
            id: "m11_trig_3", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Tập giá trị của hàm số y = 3sin(x) - 2 là đoạn nào sau đây?",
            options: [
                "A. [-5; 1]",
                "B. [-1; 5]",
                "C. [-3; 3]",
                "D. [-2; 3]"
            ],
            correct: "A",
            explanation: "Vì -1 ≤ sin(x) ≤ 1 nên -3 ≤ 3sin(x) ≤ 3 ⇒ -5 ≤ 3sin(x) - 2 ≤ 1. Vậy tập giá trị là đoạn [-5; 1]."
        },
        {
            id: "m11_trig_4", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Nghiệm của phương trình lượng giác cơ bản sin(x) = 1 là:",
            options: [
                "A. x = π/2 + k2π (k ∈ ℤ)",
                "B. x = π/2 + kπ (k ∈ ℤ)",
                "C. x = k2π (k ∈ ℤ)",
                "D. x = π + k2π (k ∈ ℤ)"
            ],
            correct: "A",
            explanation: "Điểm có tung độ bằng 1 trên đường tròn lượng giác là điểm cực bắc (0; 1), tương ứng họ góc x = π/2 + k2π (k ∈ ℤ)."
        },
        {
            id: "m11_trig_5", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Chu kỳ tuần hoàn của hàm số y = cos(2x) là:",
            options: [
                "A. T = π",
                "B. T = 2π",
                "C. T = π/2",
                "D. T = 4π"
            ],
            correct: "A",
            explanation: "Chu kỳ của hàm số y = cos(ωx) là T = 2π / |ω|. Ở đây ω = 2 nên T = 2π / 2 = π."
        },
        {
            id: "m11_trig_6", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Tất cả các nghiệm của phương trình lượng giác cos(x) = 0 là:",
            options: [
                "A. x = π/2 + kπ (k ∈ ℤ)",
                "B. x = π/2 + k2π (k ∈ ℤ)",
                "C. x = kπ (k ∈ ℤ)",
                "D. x = π + k2π (k ∈ ℤ)"
            ],
            correct: "A",
            explanation: "Hoành độ bằng 0 tại hai điểm cực bắc và cực nam của đường tròn lượng giác: x = π/2 + kπ (k ∈ ℤ)."
        },
        {
            id: "m11_trig_7", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Phương trình lượng giác tan(x) = √3 có nghiệm là:",
            options: [
                "A. x = π/3 + kπ (k ∈ ℤ)",
                "B. x = π/6 + kπ (k ∈ ℤ)",
                "C. x = π/3 + k2π (k ∈ ℤ)",
                "D. x = -π/3 + kπ (k ∈ ℤ)"
            ],
            correct: "A",
            explanation: "Vì tan(π/3) = √3 nên phương trình tan(x) = tan(π/3) ⇔ x = π/3 + kπ (k ∈ ℤ)."
        },
        {
            id: "m11_trig_8", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Công thức cộng lượng giác nào sau đây là ĐÚNG?",
            options: [
                "A. sin(a + b) = sin(a)cos(b) + cos(a)sin(b)",
                "B. sin(a + b) = sin(a)cos(a) + sin(b)cos(b)",
                "C. cos(a + b) = cos(a)cos(b) + sin(a)sin(b)",
                "D. cos(a - b) = cos(a)sin(b) - sin(a)cos(b)"
            ],
            correct: "A",
            explanation: "Định lý cộng sin: sin(a + b) = sin(a)cos(b) + cos(a)sin(b). Với cos: cos(a + b) = cos(a)cos(b) - sin(a)sin(b)."
        },
        {
            id: "m11_trig_9", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Số nghiệm của phương trình sin(x) = 1/2 trên đoạn [0; 2π] là:",
            options: [
                "A. 2",
                "B. 1",
                "C. 3",
                "D. 4"
            ],
            correct: "A",
            explanation: "Trên một vòng tròn lượng giác [0; 2π], đường thẳng y = 1/2 cắt đường tròn tại đúng 2 điểm: x = π/6 và x = 5π/6."
        },
        {
            id: "m11_trig_10", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Khẳng định nào sau đây là công thức nhân đôi đúng?",
            options: [
                "A. cos(2x) = cos²(x) - sin²(x)",
                "B. cos(2x) = cos²(x) + sin²(x)",
                "C. sin(2x) = sin(x)cos(x)",
                "D. sin(2x) = 2sin²(x)"
            ],
            correct: "A",
            explanation: "Công thức nhân đôi chuẩn: cos(2x) = cos²(x) - sin²(x) = 2cos²(x) - 1 = 1 - 2sin²(x). Và sin(2x) = 2sin(x)cos(x)."
        },
        {
            id: "m11_trig_11", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Tập xác định của hàm số y = 1 / cos(x) là:",
            options: [
                "A. D = ℝ \\ {π/2 + kπ, k ∈ ℤ}",
                "B. D = ℝ \\ {kπ, k ∈ ℤ}",
                "C. D = ℝ",
                "D. D = ℝ \\ {0}"
            ],
            correct: "A",
            explanation: "Phân thức xác định khi mẫu số cos(x) ≠ 0 ⇔ x ≠ π/2 + kπ (k ∈ ℤ)."
        },
        {
            id: "m11_trig_12", subject: "Toán", grade: "11", period: "mid1", topic: "Hàm số lượng giác & Phương trình lượng giác",
            content: "Nghiệm của phương trình sin(x) = -1 là:",
            options: [
                "A. x = -π/2 + k2π (k ∈ ℤ)",
                "B. x = π/2 + k2π (k ∈ ℤ)",
                "C. x = -π/2 + kπ (k ∈ ℤ)",
                "D. x = π + k2π (k ∈ ℤ)"
            ],
            correct: "A",
            explanation: "Điểm có tung độ bằng -1 trên đường tròn lượng giác là điểm cực nam (0; -1), tương ứng x = -π/2 + k2π (k ∈ ℤ)."
        },

        // CHỦ ĐỀ 2: DÃY SỐ, CẤP SỐ CỘNG & CẤP SỐ NHÂN (CUỐI KÌ 1)
        {
            id: "m11_seq_1", subject: "Toán", grade: "11", period: "final1", topic: "Dãy số, Cấp số cộng & Cấp số nhân",
            content: "Cho cấp số cộng (u_n) có số hạng đầu u₁ = 3 và công sai d = 4. Giá trị của số hạng u₅ bằng:",
            options: ["A. 19", "B. 15", "C. 23", "D. 16"],
            correct: "A",
            explanation: "Công thức số hạng tổng quát của cấp số cộng: u_n = u₁ + (n - 1)d. Do đó: u₅ = 3 + 4*4 = 19."
        },
        {
            id: "m11_seq_2", subject: "Toán", grade: "11", period: "final1", topic: "Dãy số, Cấp số cộng & Cấp số nhân",
            content: "Cho cấp số nhân (u_n) có u₁ = 2 và công bội q = 3. Giá trị của số hạng thứ tư u₄ bằng:",
            options: ["A. 54", "B. 18", "C. 162", "D. 24"],
            correct: "A",
            explanation: "Số hạng tổng quát của cấp số nhân: u_n = u₁ . q^(n - 1). Do đó: u₄ = 2 * 3³ = 2 * 27 = 54."
        },
        {
            id: "m11_seq_3", subject: "Toán", grade: "11", period: "final1", topic: "Dãy số, Cấp số cộng & Cấp số nhân",
            content: "Cho cấp số cộng (u_n) có u₁ = 1 và công sai d = 2. Tổng của 10 số hạng đầu tiên S₁₀ bằng:",
            options: ["A. 100", "B. 90", "C. 110", "D. 120"],
            correct: "A",
            explanation: "Công thức tổng n số hạng cấp số cộng: S_n = n*u₁ + n(n-1)d/2. Vậy S₁₀ = 10*1 + 10*9*2/2 = 10 + 90 = 100."
        },
        {
            id: "m11_seq_4", subject: "Toán", grade: "11", period: "final1", topic: "Dãy số, Cấp số cộng & Cấp số nhân",
            content: "Dãy số nào sau đây là một dãy số tăng?",
            options: [
                "A. u_n = 2n + 1",
                "B. u_n = 1/n",
                "C. u_n = (-1)^n",
                "D. u_n = 5 - 3n"
            ],
            correct: "A",
            explanation: "Xét hiệu u_{n+1} - u_n = 2(n+1) + 1 - (2n + 1) = 2 > 0 với mọi n ≥ 1. Vậy dãy số u_n = 2n + 1 là dãy số tăng."
        },

        // CHỦ ĐỀ 3: GIỚI HẠN & HÀM SỐ LIÊN TỤC (GIỮA KÌ 2)
        {
            id: "m11_lim_1", subject: "Toán", grade: "11", period: "mid2", topic: "Giới hạn & Hàm số liên tục",
            content: "Giới hạn dãy số L = lim (2n + 1)/(n + 3) khi n tiến ra vô cực bằng:",
            options: ["A. 2", "B. 1/3", "C. 0", "D. +∞"],
            correct: "A",
            explanation: "Chia cả tử và mẫu cho n: L = lim (2 + 1/n) / (1 + 3/n) = 2/1 = 2."
        },
        {
            id: "m11_lim_2", subject: "Toán", grade: "11", period: "mid2", topic: "Giới hạn & Hàm số liên tục",
            content: "Giới hạn hàm số L = lim_{x → 2} (x² - 4)/(x - 2) bằng:",
            options: ["A. 4", "B. 2", "C. 0", "D. Vô cực"],
            correct: "A",
            explanation: "Phân tích tử số: x² - 4 = (x - 2)(x + 2). Rút gọn x - 2 ta được lim_{x → 2} (x + 2) = 2 + 2 = 4."
        },
        {
            id: "m11_lim_3", subject: "Toán", grade: "11", period: "mid2", topic: "Giới hạn & Hàm số liên tục",
            content: "Hàm số y = f(x) liên tục tại điểm x₀ khi và chỉ khi:",
            options: [
                "A. lim_{x → x₀} f(x) = f(x₀)",
                "B. lim_{x → x₀} f(x) = 0",
                "C. f(x₀) > 0",
                "D. lim_{x → x₀^+} f(x) ≠ lim_{x → x₀^-} f(x)"
            ],
            correct: "A",
            explanation: "Định nghĩa: Hàm số f(x) liên tục tại x₀ nếu hàm số xác định tại x₀, tồn tại giới hạn hữu hạn tại x₀ và lim_{x → x₀} f(x) = f(x₀)."
        },

        // CHỦ ĐỀ 4: ĐƯỜNG THẲNG & MẶT PHẲNG TRONG KHÔNG GIAN (GIỮA KÌ 1 & CUỐI KÌ 1)
        {
            id: "m11_geo_1", subject: "Toán", grade: "11", period: "mid1", topic: "Đường thẳng & Mặt phẳng trong không gian",
            content: "Trong không gian, cho đường thẳng d song song với mặt phẳng (α). Mặt phẳng (β) chứa d cắt (α) theo giao tuyến d'. Khi đó:",
            options: ["A. d // d'", "B. d cắt d'", "C. d trùng d'", "D. d và d' chéo nhau"],
            correct: "A",
            explanation: "Định lí giao tuyến: Nếu đường thẳng d song song với mp(α) thì bất kì mp(β) nào chứa d mà cắt (α) theo giao tuyến d' thì d' phải song song với d."
        },
        {
            id: "m11_geo_2", subject: "Toán", grade: "11", period: "final1", topic: "Đường thẳng & Mặt phẳng trong không gian",
            content: "Đường thẳng d vuông góc với mặt phẳng (P) khi và chỉ khi:",
            options: [
                "A. d vuông góc với hai đường thẳng cắt nhau nằm trong (P)",
                "B. d vuông góc với một đường thẳng nằm trong (P)",
                "C. d song song với một đường thẳng nằm trong (P)",
                "D. d vuông góc với hai đường thẳng song song nằm trong (P)"
            ],
            correct: "A",
            explanation: "Điều kiện để đường thẳng vuông góc với mặt phẳng là nó phải vuông góc với hai đường thẳng cắt nhau cùng nằm trong mặt phẳng đó."
        },
        {
            id: "m11_geo_3", subject: "Toán", grade: "11", period: "final1", topic: "Đường thẳng & Mặt phẳng trong không gian",
            content: "Cho hình chóp S.ABC có đáy ABC là tam giác vuông tại B, SA vuông góc với đáy (ABC). Góc giữa cạnh bên SC và đáy (ABC) là góc nào?",
            options: ["A. Góc SCA", "B. Góc SCB", "C. Góc SBC", "D. Góc SAB"],
            correct: "A",
            explanation: "Vì SA ⊥ (ABC) nên hình chiếu vuông góc của SC lên đáy (ABC) là AC. Do đó góc giữa SC và (ABC) là góc SCA."
        },

        // CHỦ ĐỀ 5: MẪU SỐ LIỆU GHÉP NHÓM & THỐNG KÊ (GIỮA KÌ 2)
        {
            id: "m11_stat_1", subject: "Toán", grade: "11", period: "mid2", topic: "Mẫu số liệu ghép nhóm & Thống kê",
            content: "Trong mẫu số liệu ghép nhóm, giá trị đại diện của nhóm [a; b) là:",
            options: ["A. (a + b) / 2", "B. b - a", "C. a + b", "D. a * b"],
            correct: "A",
            explanation: "Giá trị đại diện của nhóm nửa khoảng [a; b) là trung bình cộng hai đầu mút: (a + b) / 2."
        },
        {
            id: "m11_stat_2", subject: "Toán", grade: "11", period: "mid2", topic: "Mẫu số liệu ghép nhóm & Thống kê",
            content: "Trong mẫu số liệu ghép nhóm, nhóm chứa mốt là nhóm:",
            options: [
                "A. Có tần số lớn nhất",
                "B. Có độ dài lớn nhất",
                "C. Nằm chính giữa dãy số liệu",
                "D. Có giá trị đại diện nhỏ nhất"
            ],
            correct: "A",
            explanation: "Nhóm chứa mốt trong bảng số liệu ghép nhóm là nhóm có tần số lớn nhất."
        },

        // CHỦ ĐỀ 6: XÁC SUẤT & BIẾN CỐ (CUỐI KÌ 2)
        {
            id: "m11_prob_1", subject: "Toán", grade: "11", period: "final2", topic: "Xác suất & Biến cố",
            content: "Cho hai biến cố A và B thỏa mãn P(B) = 0.5 và P(A ∩ B) = 0.2. Xác suất có điều kiện P(A | B) bằng:",
            options: ["A. 0.4", "B. 0.1", "C. 0.7", "D. 0.25"],
            correct: "A",
            explanation: "Công thức xác suất có điều kiện: P(A | B) = P(A ∩ B) / P(B) = 0.2 / 0.5 = 0.4."
        },
        {
            id: "m11_prob_2", subject: "Toán", grade: "11", period: "final2", topic: "Xác suất & Biến cố",
            content: "Hai biến cố A và B được gọi là độc lập khi và chỉ khi:",
            options: [
                "A. P(A ∩ B) = P(A) . P(B)",
                "B. P(A ∪ B) = P(A) + P(B)",
                "C. P(A ∩ B) = 0",
                "D. P(A) = P(B)"
            ],
            correct: "A",
            explanation: "Hai biến cố A và B độc lập khi việc xảy ra hay không xảy ra của biến cố này không ảnh hưởng đến xác suất xảy ra biến cố kia: P(A ∩ B) = P(A).P(B)."
        },

        // CHỦ ĐỀ 7: ĐẠO HÀM & TIẾP TUYẾN (CUỐI KÌ 2)
        {
            id: "m11_der_1", subject: "Toán", grade: "11", period: "final2", topic: "Đạo hàm & Tiếp tuyến",
            content: "Đạo hàm của hàm số y = x³ - 3x² + 2x - 5 là:",
            options: ["A. y' = 3x² - 6x + 2", "B. y' = 3x² - 3x + 2", "C. y' = x² - 6x + 2", "D. y' = 3x² - 6x"],
            correct: "A",
            explanation: "Quy tắc lấy đạo hàm từng đơn thức: (x³)' = 3x², (-3x²)' = -6x, (2x)' = 2, (-5)' = 0. Vậy y' = 3x² - 6x + 2."
        },
        {
            id: "m11_der_2", subject: "Toán", grade: "11", period: "final2", topic: "Đạo hàm & Tiếp tuyến",
            content: "Hệ số góc k của tiếp tuyến của đồ thị hàm số y = f(x) tại điểm có hoành độ x₀ là:",
            options: [
                "A. k = f'(x₀)",
                "B. k = f(x₀)",
                "C. k = f''(x₀)",
                "D. k = -1 / f'(x₀)"
            ],
            correct: "A",
            explanation: "Ý nghĩa hình học của đạo hàm: Đạo hàm f'(x₀) chính là hệ số góc của tiếp tuyến tại điểm M(x₀; f(x₀))."
        }
    ],
    "Vật Lí": [
        {
            id: "p11_1", subject: "Vật Lí", grade: "11",
            content: "Một vật dao động điều hòa có phương trình li độ x = A cos(ωt + φ). Biểu thức gia tốc a của vật là:",
            options: ["A. a = -ω²x", "B. a = ω²x", "C. a = -ωx", "D. a = -ω²x²"],
            correct: "A",
            explanation: "Gia tốc là đạo hàm bậc hai của li độ theo thời gian: a = x'' = -ω² A cos(ωt + φ) = -ω²x."
        },
        {
            id: "p11_2", subject: "Vật Lí", grade: "11",
            content: "Trong sóng dừng, khoảng cách giữa hai nút sóng liên tiếp (hoặc hai bụng sóng liên tiếp) bằng:",
            options: ["A. Một nửa bước sóng (λ/2)", "B. Một bước sóng (λ)", "C. Một phần tư bước sóng (λ/4)", "D. Hai bước sóng (2λ)"],
            correct: "A",
            explanation: "Khoảng cách giữa hai nút sóng liền kề hoặc hai bụng sóng liền kề luôn bằng λ/2."
        },
        {
            id: "p11_3", subject: "Vật Lí", grade: "11",
            content: "Cường độ điện trường E do một điện tích điểm Q đặt trong chân không gây ra tại điểm cách nó một khoảng r là:",
            options: ["A. E = k.|Q| / r²", "B. E = k.Q / r", "C. E = k.|Q|² / r", "D. E = k.|Q| / r³"],
            correct: "A",
            explanation: "Định luật Culông và công thức điện trường: E = k.|Q| / r² (trong đó k = 9*10⁹ N.m²/C²)."
        },
        {
            id: "p11_4", subject: "Vật Lí", grade: "11",
            content: "Điện dung C của tụ điện được xác định bằng công thức nào?",
            options: ["A. C = Q / U", "B. C = Q . U", "C. C = U / Q", "D. C = Q / U²"],
            correct: "A",
            explanation: "Điện dung của tụ điện đặc trưng cho khả năng tích điện ở một hiệu điện thế nhất định: C = Q / U (đơn vị Fara)."
        },
        {
            id: "p11_5", subject: "Vật Lí", grade: "11",
            content: "Theo định luật Ôm đối với toàn mạch, cường độ dòng điện I chạy trong mạch kín tỉ lệ nghịch với:",
            options: [
                "A. Tổng trở toàn phần (R_ngoài + r_trong)",
                "B. Suất điện động của nguồn",
                "C. Chỉ điện trở ngoài",
                "D. Khối lượng dây dẫn"
            ],
            correct: "A",
            explanation: "Định luật Ôm cho toàn mạch: I = E / (R_ngoài + r), cường độ dòng điện tỉ lệ nghịch với điện trở toàn phần."
        },
        {
            id: "p11_6", subject: "Vật Lí", grade: "11",
            content: "Lực từ tác dụng lên một đoạn dây dẫn thẳng dài L mang dòng điện I đặt trong từ trường đều B hợp với véc-tơ B góc α có độ lớn:",
            options: ["A. F = B.I.L.sin(α)", "B. F = B.I.L.cos(α)", "C. F = B.I.L.tan(α)", "D. F = B.I.L"],
            correct: "A",
            explanation: "Độ lớn lực Ampe: F = B.I.L.sin(α)."
        },
        {
            id: "p11_7", subject: "Vật Lí", grade: "11",
            content: "Từ thông Φ qua diện tích S của một khung dây phẳng đặt trong từ trường đều B hợp với pháp tuyến n một góc α là:",
            options: ["A. Φ = B.S.cos(α)", "B. Φ = B.S.sin(α)", "C. Φ = B.S.tan(α)", "D. Φ = B / (S.cos(α))"],
            correct: "A",
            explanation: "Định nghĩa từ thông: Φ = B.S.cos(α) (đơn vị Vêbe - Wb)."
        },
        {
            id: "p11_8", subject: "Vật Lí", grade: "11",
            content: "Hiện tượng cảm ứng điện từ xuất hiện dòng điện cảm ứng trong một mạch kín khi nào?",
            options: [
                "A. Khi từ thông qua mạch biến thiên theo thời gian",
                "B. Khi từ thông qua mạch đạt giá trị cực đại và không đổi",
                "C. Khi khung dây đứng yên trong từ trường đều",
                "D. Khi cường độ từ trường luôn luôn bằng 0"
            ],
            correct: "A",
            explanation: "Theo định luật Fa-ra-đây: Dòng điện cảm ứng chỉ xuất hiện trong mạch kín trong khoảng thời gian từ thông qua mạch đó biến thiên."
        },
        {
            id: "p11_9", subject: "Vật Lí", grade: "11",
            content: "Biên độ của dao động cưỡng bức khi có hiện tượng cộng hưởng cơ học đạt giá trị:",
            options: ["A. Cực đại", "B. Bằng 0", "C. Cực tiểu", "D. Biến thiên điều hòa"],
            correct: "A",
            explanation: "Hiện tượng cộng hưởng xảy ra khi tần số ngoại lực bằng tần số riêng của hệ làm cho biên độ dao động đạt giá trị cực đại."
        },
        {
            id: "p11_10", subject: "Vật Lí", grade: "11",
            content: "Chiết suất tuyệt đối n của một môi trường trong suốt so với vận tốc ánh sáng c trong chân không và v trong môi trường là:",
            options: ["A. n = c / v", "B. n = v / c", "C. n = c . v", "D. n = c² / v"],
            correct: "A",
            explanation: "Chiết suất tuyệt đối là tỉ số vận tốc ánh sáng trong chân không và trong môi trường: n = c / v (luôn n ≥ 1)."
        }
    ],
    "Hóa Học": [
        {
            id: "c11_1", subject: "Hóa Học", grade: "11",
            content: "Theo nguyên lí chuyển dịch cân bằng Le Chatelier, khi tăng nhiệt độ của một hệ cân bằng thì cân bằng sẽ chuyển dịch theo chiều:",
            options: [
                "A. Phản ứng thu nhiệt (chiều có ΔH > 0)",
                "B. Phản ứng tỏa nhiệt (chiều có ΔH < 0)",
                "C. Chiều làm tăng áp suất",
                "D. Cân bằng không bao giờ chuyển dịch"
            ],
            correct: "A",
            explanation: "Tăng nhiệt độ thì cân bằng chuyển dịch theo chiều làm giảm tác động bên ngoài, tức là chiều phản ứng thu nhiệt."
        },
        {
            id: "c11_2", subject: "Hóa Học", grade: "11",
            content: "Ở 25°C, một dung dịch có nồng độ ion [H⁺] = 10⁻⁹ M thì môi trường của dung dịch này là:",
            options: ["A. Môi trường kiềm (bazơ), pH = 9", "B. Môi trường axit, pH = 9", "C. Môi trường trung tính, pH = 7", "D. Môi trường axit, pH = 5"],
            correct: "A",
            explanation: "Ta có pH = -log[H⁺] = 9 > 7 nên dung dịch có môi trường kiềm (bazơ)."
        },
        {
            id: "c11_3", subject: "Hóa Học", grade: "11",
            content: "Trong công nghiệp, amoniac (NH₃) được tổng hợp trực tiếp từ nitơ và hiđro theo phản ứng thuận nghịch có xúc tác là chất nào?",
            options: ["A. Sắt (Fe)", "B. Bạch kim (Pt)", "C. Đồng (Cu)", "D. Nhôm oxit (Al₂O₃)"],
            correct: "A",
            explanation: "Quá trình Haber-Bosch tổng hợp NH₃ sử dụng xúc tác là sắt (Fe) được hoạt hóa cùng nhiệt độ và áp suất cao."
        },
        {
            id: "c11_4", subject: "Hóa Học", grade: "11",
            content: "Khí metan (CH₄) và các ankan đồng đẳng tham gia phản ứng đặc trưng nào sau đây?",
            options: ["A. Phản ứng thế halogen", "B. Phản ứng cộng brom", "C. Phản ứng trùng hợp", "D. Phản ứng tráng bạc"],
            correct: "A",
            explanation: "Ankan chỉ chứa các liên kết đơn C-C và C-H bền vững nên phản ứng hóa học đặc trưng là phản ứng thế (như thế clo, brom chiếu sáng)."
        },
        {
            id: "c11_5", subject: "Hóa Học", grade: "11",
            content: "Ancol etylic (C₂H₅OH) tác dụng được với chất nào sau đây giải phóng khí hiđro?",
            options: ["A. Natri (Na)", "B. Dung dịch NaOH", "C. Dung dịch NaCl", "D. Đồng (Cu)"],
            correct: "A",
            explanation: "Ancol etylic có nguyên tử H linh động trong nhóm -OH nên phản ứng với kim loại kiềm Na sinh ra C₂H₅ONa và khí H₂."
        },
        {
            id: "c11_6", subject: "Hóa Học", grade: "11",
            content: "Chất nào sau đây phản ứng được với dung dịch AgNO₃ trong NH₃ đun nóng tạo kết tủa bạc trắng sáng (phản ứng tráng bạc)?",
            options: ["A. Fomanđehit (HCHO)", "B. Ancol etylic", "C. Axit axetic", "D. Etylen"],
            correct: "A",
            explanation: "Các hợp chất chứa nhóm chức anđehit (-CHO) như HCHO có phản ứng tráng bạc đặc trưng."
        },
        {
            id: "c11_7", subject: "Hóa Học", grade: "11",
            content: "Axit axetic (CH₃COOH) là thành phần chính có trong chất gia vị quen thuộc nào trong đời sống?",
            options: ["A. Giấm ăn", "B. Nước mắm", "C. Mì chính", "D. Dầu hào"],
            correct: "A",
            explanation: "Giấm ăn là dung dịch axit axetic có nồng độ từ 2% đến 5%."
        },
        {
            id: "c11_8", subject: "Hóa Học", grade: "11",
            content: "Axit sunfuric đặc (H₂SO₄ đặc) có tính chất đặc trưng nổi bật nào khiến đường mía chuyển thành than đen xốp?",
            options: ["A. Tính háo nước mạnh", "B. Tính bazơ mạnh", "C. Tính khử mạnh", "D. Tính tan kém"],
            correct: "A",
            explanation: "H₂SO₄ đặc có tính háo nước mãnh liệt, hút các nguyên tố H và O từ cacbohiđrat (C₁₂H₂₂O₁₁) để lại cacbon đen xốp bị đẩy trào lên."
        },
        {
            id: "c11_9", subject: "Hóa Học", grade: "11",
            content: "Khí sunfurơ (SO₂) sinh ra từ khí thải nhà máy là nguyên nhân chủ yếu gây ra hiện tượng thời tiết nguy hại nào?",
            options: ["A. Mưa axit", "B. Hiệu ứng nhà kính", "C. Thủng tầng ozon", "D. Động đất"],
            correct: "A",
            explanation: "SO₂ và NO_x trong khí quyển bị oxi hóa và tan trong nước mưa tạo thành H₂SO₄ và HNO₃ gây ra mưa axit."
        },
        {
            id: "c11_10", subject: "Hóa Học", grade: "11",
            content: "Chất nào sau đây làm mất màu dung dịch nước brom ở điều kiện thường?",
            options: ["A. Etylen (C₂H₄)", "B. Metan (CH₄)", "C. Propan (C₃H₈)", "D. Cacbon đioxit (CO₂)"],
            correct: "A",
            explanation: "Etylen là anken có chứa liên kết đôi C=C kém bền nên dễ dàng tham gia phản ứng cộng làm mất màu nâu đỏ của dung dịch brom."
        }
    ],
    "Sinh Học": [
        {
            id: "b11_1", subject: "Sinh Học", grade: "11",
            content: "Cơ quan và bộ phận đóng vai trò chủ yếu trong việc hút nước và ion khoáng từ đất của cây là:",
            options: ["A. Lông hút của rễ", "B. Chóp rễ", "C. Khí khổng ở lá", "D. Mạch rây của thân"],
            correct: "A",
            explanation: "Tế bào lông hút ở miền hút của rễ cây có diện tích bề mặt lớn, thành mỏng giúp thẩm thấu nước và ion khoáng hiệu quả."
        },
        {
            id: "b11_2", subject: "Sinh Học", grade: "11",
            content: "Động lực chủ yếu của dòng mạch gỗ vận chuyển nước từ rễ lên đến tận ngọn cây là:",
            options: [
                "A. Lực hút của lá do quá trình thoát hơi nước",
                "B. Lực đẩy của rễ do áp suất rễ",
                "C. Lực liên kết giữa các phân tử nước",
                "D. Hoạt động hô hấp của tế bào rễ"
            ],
            correct: "A",
            explanation: "Lực thoát hơi nước ở lá tạo ra một sức hút cực lớn (động lực đầu trên), kéo dòng nước và khoáng lên cao hàng chục mét."
        },
        {
            id: "b11_3", subject: "Sinh Học", grade: "11",
            content: "Khí khổng ở mặt dưới lá mở ra khi nào?",
            options: [
                "A. Khi hai tế bào hạt đậu no nước và trương nước",
                "B. Khi hai tế bào hạt đậu bị mất nước và co lại",
                "C. Vào ban đêm khi không có ánh sáng",
                "D. Khi cây bị héo khô hạn nghiêm trọng"
            ],
            correct: "A",
            explanation: "Thành trong tế bào hạt đậu dày, thành ngoài mỏng, khi no nước thành ngoài căng ra kéo thành trong mở rộng lỗ khí khổng."
        },
        {
            id: "b11_4", subject: "Sinh Học", grade: "11",
            content: "Động vật nào sau đây có hệ tuần hoàn hở?",
            options: ["A. Côn trùng (châu chấu, gián)", "B. Cá chép", "C. Thỏ", "D. Chim bồ câu"],
            correct: "A",
            explanation: "Chân khớp (côn trùng, tôm, cua) và thân mềm có hệ tuần hoàn hở, máu chảy vào khoang cơ thể tiếp xúc trực tiếp với tế bào."
        },
        {
            id: "b11_5", subject: "Sinh Học", grade: "11",
            content: "Huyết áp trong hệ mạch của người có giá trị cao nhất tại vị trí nào?",
            options: ["A. Động mạch chủ", "B. Tĩnh mạch chủ", "C. Mao mạch", "D. Tiểu tĩnh mạch"],
            correct: "A",
            explanation: "Huyết áp giảm dần từ động mạch chủ -> động mạch -> mao mạch -> tĩnh mạch chủ (nơi máu về tim có huyết áp thấp nhất)."
        },
        {
            id: "b11_6", subject: "Sinh Học", grade: "11",
            content: "Một cung phản xạ điển hình ở động vật có hệ thần kinh gồm bao nhiêu bộ phận cấu thành?",
            options: ["A. 5 bộ phận", "B. 3 bộ phận", "C. 2 bộ phận", "D. 4 bộ phận"],
            correct: "A",
            explanation: "5 bộ phận: (1) Thụ thể tiếp nhận, (2) Đường hướng tâm, (3) Trung ương thần kinh, (4) Đường li tâm, (5) Cơ quan đáp ứng."
        },
        {
            id: "b11_7", subject: "Sinh Học", grade: "11",
            content: "Hoocmôn thực vật nào kích thích sự sinh trưởng kéo dài của thân, cành và tính hướng sáng của cây?",
            options: ["A. Auxin", "B. Etilen", "C. Axit abxixic (AAB)", "D. Xitokinin"],
            correct: "A",
            explanation: "Auxin phân bố nhiều hơn ở phía tối làm tế bào phía tối dài nhanh hơn, uốn cong ngọn cây về phía nguồn sáng."
        },
        {
            id: "b11_8", subject: "Sinh Học", grade: "11",
            content: "Hoocmôn nào do tuyến tụy tiết ra có tác dụng làm giảm nồng độ đường glucozơ trong máu về mức cân bằng?",
            options: ["A. Insulin", "B. Glucagon", "C. Tiroxin", "D. Adrenalin"],
            correct: "A",
            explanation: "Insulin chuyển hóa glucozơ tự do trong máu thành glicogen dự trữ ở gan và cơ, giúp hạ đường huyết."
        },
        {
            id: "b11_9", subject: "Sinh Học", grade: "11",
            content: "Hình thức sinh sản của vi khuẩn bằng cách phân đôi tế bào là hình thức:",
            options: ["A. Sinh sản vô tính", "B. Sinh sản hữu tính", "C. Sinh sản bằng bào tử hữu tính", "D. Trinh sinh"],
            correct: "A",
            explanation: "Phân đôi là hình thức sinh sản vô tính cơ bản ở sinh vật nhân sơ, không có sự kết hợp giao tử."
        },
        {
            id: "b11_10", subject: "Sinh Học", grade: "11",
            content: "Hiện tượng cây trinh nữ (cây xấu hổ) cụp lá lại khi bị chạm vào là ví dụ về dạng cảm ứng nào?",
            options: ["A. Ứng động không sinh trưởng (ứng động va chạm)", "B. Hướng động tiếp xúc", "C. Hướng sáng", "D. Hướng trọng lực"],
            correct: "A",
            explanation: "Cụp lá ở cây trinh nữ xảy ra nhanh chóng do sự thay đổi sức trương nước ở cuống lá, không liên quan đến sinh trưởng phân chia tế bào."
        }
    ],
    "Lịch Sử": [
        {
            id: "h11_1", subject: "Lịch Sử", grade: "11",
            content: "Khẩu hiệu nổi tiếng 'Tự do - Bình đẳng - Bác ái' xuất hiện trong cuộc cách mạng tư sản nào?",
            options: ["A. Cách mạng tư sản Pháp (1789)", "B. Cách mạng tư sản Anh (1640)", "C. Chiến tranh giành độc lập Bắc Mỹ", "D. Cách mạng Tân Hợi (1911)"],
            correct: "A",
            explanation: "Tuyên ngôn Nhân quyền và Dân quyền thời Cách mạng tư sản Pháp 1789 đã nêu cao khẩu hiệu tiến bộ này."
        },
        {
            id: "h11_2", subject: "Lịch Sử", grade: "11",
            content: "Cách mạng tháng Mười Nga năm 1917 do V.I. Lênin và Đảng Bôn-sê-vích lãnh đạo đã lật đổ chính phủ nào?",
            options: ["A. Chính phủ tư sản lâm thời", "B. Chế độ phong kiến Nga hoàng", "C. Chính quyền Xô viết", "D. Quân đội phát xít"],
            correct: "A",
            explanation: "Cách mạng tháng Hai lật đổ Nga hoàng, còn Cách mạng tháng Mười lật đổ Chính phủ tư sản lâm thời, lập nên nhà nước công nông đầu tiên."
        },
        {
            id: "h11_3", subject: "Lịch Sử", grade: "11",
            content: "Chiến tranh thế giới thứ nhất (1914 - 1918) về thực chất mang tính chất gì?",
            options: [
                "A. Chiến tranh đế quốc phi nghĩa đối với cả hai phe tham chiến",
                "B. Chiến tranh chính nghĩa bảo vệ hòa bình thế giới",
                "C. Chiến tranh giải phóng dân tộc của các nước thuộc địa",
                "D. Chiến tranh chống chủ nghĩa phát xít"
            ],
            correct: "A",
            explanation: "Đây là cuộc chiến tranh tranh giành thuộc địa và phân chia lại thị trường giữa hai khối đế quốc Liên minh và Hiệp ước."
        },
        {
            id: "h11_4", subject: "Lịch Sử", grade: "11",
            content: "Sự kiện nào đánh dấu Chiến tranh thế giới thứ hai (1939 - 1945) hoàn toàn kết thúc?",
            options: [
                "A. Nhật Bản kí văn kiện đầu hàng không điều kiện (15/8/1945)",
                "B. Phát xít Đức đầu hàng tại Béc-lin",
                "C. Mĩ ném hai quả bom nguyên tử xuống Nhật Bản",
                "D. Phát xít Ý sụp đổ"
            ],
            correct: "A",
            explanation: "Ngày 15/8/1945 Nhật hoàng tuyên bố đầu hàng, và ngày 2/9/1945 kí văn kiện đầu hàng trên chiến hạm Missouri của Mĩ."
        },
        {
            id: "h11_5", subject: "Lịch Sử", grade: "11",
            content: "Chủ trương cứu nước của chí sĩ Phan Bội Châu vào đầu thế kỉ XX gắn liền với phong trào nào?",
            options: ["A. Phong trào Đông Du", "B. Phong trào Duy Tân", "C. Đông Kinh Nghĩa Thục", "D. Phong trào Cần Vương"],
            correct: "A",
            explanation: "Phan Bội Châu thành lập Duy Tân hội và tổ chức đưa thanh niên Việt Nam sang Nhật Bản học tập (phong trào Đông Du)."
        },
        {
            id: "h11_6", subject: "Lịch Sử", grade: "11",
            content: "Chí sĩ Phan Châu Trinh chủ trương cứu nước bằng phương pháp nào?",
            options: [
                "A. Đấu tranh ôn hòa, cải cách nâng cao dân trí, phát triển kinh tế ('Khai dân trí, chấn dân khí, hậu dân sinh')",
                "B. Dùng bạo động vũ trang và cầu viện nước ngoài",
                "C. Cầu viện đế quốc Pháp",
                "D. Khởi nghĩa nông dân tự phát"
            ],
            correct: "A",
            explanation: "Phan Châu Trinh theo xu hướng cải cách dân chủ, mở mang dân trí và canh tân đất nước."
        },
        {
            id: "h11_7", subject: "Lịch Sử", grade: "11",
            content: "Văn kiện nào của V.I. Lênin đã giúp Nguyễn Ái Quốc tìm thấy con đường cứu nước đúng đắn cho dân tộc Việt Nam vào tháng 7/1920?",
            options: [
                "A. Sơ thảo lần thứ nhất những luận cương về vấn đề dân tộc và vấn đề thuộc địa",
                "B. Tuyên ngôn của Đảng Cộng sản",
                "C. Tác phẩm Làm gì?",
                "D. Luận cương tháng Tư"
            ],
            correct: "A",
            explanation: "Đọc Luận cương của Lênin đăng trên báo Nhân đạo (Pháp), Nguyễn Ái Quốc đã khẳng định: 'Muốn cứu nước và giải phóng dân tộc không có con đường nào khác con đường cách mạng vô sản'."
        },
        {
            id: "h11_8", subject: "Lịch Sử", grade: "11",
            content: "Nhà cải cách nào trong lịch sử phong kiến Việt Nam đã cho phát hành tiền giấy 'Thông bảo hội sao' vào cuối thế kỉ XIV?",
            options: ["A. Hồ Quý Ly", "B. Lê Thánh Tông", "C. Minh Mạng", "D. Quang Trung"],
            correct: "A",
            explanation: "Năm 1396, Hồ Quý Ly cho phát hành tiền giấy đầu tiên trong lịch sử Việt Nam và thực hiện chính sách hạn điền, hạn nô."
        },
        {
            id: "h11_9", subject: "Lịch Sử", grade: "11",
            content: "Cuộc cải cách hành chính quy mô lớn của vua Minh Mạng (nhà Nguyễn) vào nửa đầu thế kỉ XIX đã chia cả nước thành:",
            options: ["A. 30 tỉnh và 1 phủ Thừa Thiên", "B. 24 lộ và đạo", "C. 12 xứ quân", "D. 3 kì riêng biệt"],
            correct: "A",
            explanation: "Vua Minh Mạng bãi bỏ Bắc Thành và Gia Định Thành, thống nhất chia cả nước thành 30 tỉnh và 1 phủ Thừa Thiên trực thuộc triều đình trung ương."
        },
        {
            id: "h11_10", subject: "Lịch Sử", grade: "11",
            content: "Hội nghị Ianta (tháng 2/1945) với sự tham gia của nguyên thủ ba cường quốc nào?",
            options: ["A. Liên Xô, Mĩ, Anh", "B. Liên Xô, Mĩ, Pháp", "C. Mĩ, Anh, Pháp", "D. Liên Xô, Mĩ, Trung Quốc"],
            correct: "A",
            explanation: "Ba nguyên thủ: Xtalin (Liên Xô), Ru-dơ-ven (Mĩ) và Sớc-sin (Anh) họp tại Ianta để phân chia phạm vi ảnh hưởng sau chiến tranh."
        }
    ],
    "Địa Lí": [
        {
            id: "g11_1", subject: "Địa Lí", grade: "11",
            content: "Toàn cầu hóa kinh tế là quá trình liên kết giữa các quốc gia trên thế giới về nhiều mặt, trong đó dẫn đầu là lĩnh vực:",
            options: ["A. Thương mại, tài chính và đầu tư", "B. Quốc phòng quân sự", "C. Ngôn ngữ giao tiếp", "D. Thể dục thể thao"],
            correct: "A",
            explanation: "Tự do hóa thương mại, luân chuyển dòng vốn và đầu tư trực tiếp nước ngoài là động lực chính của toàn cầu hóa."
        },
        {
            id: "g11_2", subject: "Địa Lí", grade: "11",
            content: "Tổ chức ASEAN được thành lập vào ngày 8/8/1967 tại thủ đô của quốc gia nào?",
            options: ["A. Băng Cốc (Thái Lan)", "B. Jakarta (Indonesia)", "C. Manila (Philippines)", "D. Singapore"],
            correct: "A",
            explanation: "Tuyên ngôn ASEAN được 5 nước sáng lập (Indonesia, Malaysia, Philippines, Singapore, Thái Lan) kí kết tại Bangkok (Thái Lan)."
        },
        {
            id: "g11_3", subject: "Địa Lí", grade: "11",
            content: "Hoa Kỳ là nền kinh tế số 1 thế giới với quy mô GDP khổng lồ, ngành đóng góp tỉ trọng lớn nhất trong cơ cấu kinh tế là:",
            options: ["A. Dịch vụ (tài chính, công nghệ, y tế, du lịch)", "B. Nông nghiệp", "C. Khai khoáng thủ công", "D. Đánh bắt thủy sản"],
            correct: "A",
            explanation: "Khu vực dịch vụ chiếm trên 80% GDP của Hoa Kỳ, dẫn đầu thế giới về công nghệ và tài chính."
        },
        {
            id: "g11_4", subject: "Địa Lí", grade: "11",
            content: "Đồng tiền chung châu Âu (Euro) là một trong những thành tựu hợp tác nổi bật nhất của liên minh nào?",
            options: ["A. Liên minh Châu Âu (EU)", "B. Tổ chức Thương mại Thế giới (WTO)", "C. Khối APEC", "D. Khối BRICS"],
            correct: "A",
            explanation: "EU đã thiết lập thị trường chung tự do luân chuyển và đưa đồng Euro vào lưu hành chính thức."
        },
        {
            id: "g11_5", subject: "Địa Lí", grade: "11",
            content: "Nguyên nhân chủ yếu giúp nền kinh tế Nhật Bản hồi phục và phát triển thần kì trong giai đoạn 1960 - 1973 là:",
            options: [
                "A. Coi trọng nhân tố con người và đầu tư mạnh mẽ cho khoa học kĩ thuật",
                "B. Nguồn tài nguyên khoáng sản phong phú",
                "C. Diện tích đất canh tác nông nghiệp rộng lớn",
                "D. Khai thác tài nguyên dầu mỏ dồi dào"
            ],
            correct: "A",
            explanation: "Nhật Bản nghèo nàn tài nguyên nên chiến lược phát triển then chốt là con người có kỷ luật cao và tiếp thu công nghệ tiên tiến."
        },
        {
            id: "g11_6", subject: "Địa Lí", grade: "11",
            content: "Đặc điểm nổi bật của vùng nông nghiệp miền Đông Trung Quốc so với miền Tây là:",
            options: [
                "A. Đồng bằng châu thổ màu mỡ, khí hậu gió mùa thuận lợi trồng trọt",
                "B. Khí hậu khô hạn, chủ yếu là hoang mạc và đồng cỏ",
                "C. Dân cư thưa thớt, nghèo nàn",
                "D. Địa hình hiểm trở đồi núi cao tuyết phủ"
            ],
            correct: "A",
            explanation: "Miền Đông Trung Quốc có các đồng bằng lớn (Hoa Bắc, Hoa Trung, Hoa Nam) trồng lúa gạo, lúa mì và dân cư tập trung đông đúc."
        },
        {
            id: "g11_7", subject: "Địa Lí", grade: "11",
            content: "Rừng Amazon nằm ở Nam Mỹ được coi là 'lá phổi xanh của hành tinh' vì:",
            options: [
                "A. Sản sinh lượng lớn khí oxi và hấp thụ cacbonic, điều hòa khí hậu toàn cầu",
                "B. Chứa mỏ dầu lớn nhất thế giới",
                "C. Cung cấp toàn bộ gỗ xây dựng cho thế giới",
                "D. Không có bất kì loài sinh vật nào sinh sống"
            ],
            correct: "A",
            explanation: "Rừng mưa nhiệt đới Amazon là hệ sinh thái giàu đa dạng sinh học nhất, có vai trò cân bằng khí hậu toàn Trái Đất."
        },
        {
            id: "g11_8", subject: "Địa Lí", grade: "11",
            content: "Vấn đề nào sau đây thuộc nhóm vấn đề 'an ninh phi truyền thống' mang tính toàn cầu?",
            options: ["A. Biến đổi khí hậu, an ninh mạng, dịch bệnh truyền nhiễm", "B. Xung đột biên giới vũ trang", "C. Chiến tranh xâm lược lãnh thổ", "D. Tranh chấp pháo đài quân sự"],
            correct: "A",
            explanation: "An ninh phi truyền thống bao gồm biến đổi khí hậu, khủng bố, tội phạm mạng, an ninh nguồn nước, an ninh năng lượng."
        },
        {
            id: "g11_9", subject: "Địa Lí", grade: "11",
            content: "Quốc gia nào ở khu vực Đông Nam Á có tỉ trọng ngành dịch vụ cảng biển và tài chính phát triển bậc nhất châu Á?",
            options: ["A. Singapore", "B. Lào", "C. Myanmar", "D. Campuchia"],
            correct: "A",
            explanation: "Singapore là quốc gia - thành phố có cảng biển trung chuyển hàng hóa và trung tâm tài chính ngân hàng hàng đầu thế giới."
        },
        {
            id: "g11_10", subject: "Địa Lí", grade: "11",
            content: "Hậu quả tiêu cực lớn nhất của xu hướng 'già hóa dân số' ở các nước phát triển là:",
            options: [
                "A. Thiếu hụt lực lượng lao động và tăng chi phí phúc lợi an sinh xã hội",
                "B. Thiếu chỗ ở và ô nhiễm môi trường đô thị",
                "C. Bùng nổ dân số quá tải trường học",
                "D. Giảm tuổi thọ trung bình của người dân"
            ],
            correct: "A",
            explanation: "Dân số già làm thiếu lao động bổ sung, áp lực quỹ hưu trí và chi phí chăm sóc sức khỏe người cao tuổi tăng cao."
        }
    ],
    "GDKT&PL": [
        {
            id: "l11_1", subject: "GDKT&PL", grade: "11",
            content: "Tác động tích cực hàng đầu của cạnh tranh lành mạnh trong sản xuất kinh doanh là:",
            options: [
                "A. Thúc đẩy cải tiến kĩ thuật, nâng cao năng suất và chất lượng sản phẩm",
                "B. Làm cho các doanh nghiệp nhỏ phá sản hàng loạt",
                "C. Gây khan hiếm hàng hóa giả tạo",
                "D. Làm kiệt quệ tài nguyên môi trường"
            ],
            correct: "A",
            explanation: "Cạnh tranh lành mạnh buộc các nhà sản xuất phải tìm cách áp dụng tiến bộ kỹ thuật, quản lý tối ưu để hạ giá thành và nâng cao chất lượng."
        },
        {
            id: "l11_2", subject: "GDKT&PL", grade: "11",
            content: "Hiện tượng nào sau đây phản ánh trạng thái 'lạm phát vừa phải' (lạm phát một con số)?",
            options: [
                "A. Mức giá tăng ở mức dưới 10%/năm, kích thích nền kinh tế tăng trưởng nhẹ",
                "B. Giá cả tăng vọt trên 1000%/năm (siêu lạm phát)",
                "C. Tiền tệ hoàn toàn mất giá, đình trệ sản xuất",
                "D. Mức giá chung giảm liên tục (giảm phát)"
            ],
            correct: "A",
            explanation: "Lạm phát vừa phải (dưới 10%) là mức độ có thể chấp nhận được và thường có tác dụng kích thích đầu tư sản xuất."
        },
        {
            id: "l11_3", subject: "GDKT&PL", grade: "11",
            content: "Nơi diễn ra các hoạt động trao đổi, thỏa thuận về việc làm và tiền lương giữa người lao động và người tuyển dụng là:",
            options: ["A. Thị trường lao động", "B. Thị trường bất động sản", "C. Thị trường chứng khoán", "D. Thị trường vàng"],
            correct: "A",
            explanation: "Thị trường lao động là nơi cung - cầu sức lao động gặp nhau, hình thành mức tiền công và quan hệ việc làm."
        },
        {
            id: "l11_4", subject: "GDKT&PL", grade: "11",
            content: "Hành vi nào sau đây thể hiện việc thực hiện tốt 'đạo đức kinh doanh'?",
            options: [
                "A. Cung cấp sản phẩm an toàn, đúng chất lượng cam kết và bảo vệ quyền lợi người tiêu dùng",
                "B. Trộn tạp chất vào thực phẩm để tăng trọng lượng",
                "C. Xả nước thải chưa qua xử lý ra sông ngòi để giảm chi phí",
                "D. Buôn bán hàng giả, hàng nhái nhãn hiệu nổi tiếng"
            ],
            correct: "A",
            explanation: "Đạo đức kinh doanh đòi hỏi doanh nghiệp trung thực, có trách nhiệm với người tiêu dùng và cộng đồng."
        },
        {
            id: "l11_5", subject: "GDKT&PL", grade: "11",
            content: "Mọi công dân không phân biệt dân tộc, giới tính, tôn giáo đều bình đẳng về quyền và nghĩa vụ trước pháp luật là thể hiện:",
            options: ["A. Quyền bình đẳng của công dân trước pháp luật", "B. Quyền tự do tuyệt đối", "C. Quyền ưu tiên cán bộ", "D. Quyền miễn trừ tư pháp"],
            correct: "A",
            explanation: "Hiến pháp khẳng định: Mọi công dân đều bình đẳng trước pháp luật, không ai bị phân biệt đối xử trong đời sống chính trị, dân sự, kinh tế."
        },
        {
            id: "l11_6", subject: "GDKT&PL", grade: "11",
            content: "Công dân đủ 18 tuổi trở lên có quyền nào sau đây để thực hiện quyền lực nhân dân?",
            options: ["A. Quyền bầu cử Quốc hội và Hội đồng nhân dân", "B. Quyền tự ý ban hành luật", "C. Quyền không chấp hành pháp luật", "D. Quyền chỉ định đại biểu"],
            correct: "A",
            explanation: "Theo Hiến pháp, công dân đủ mười tám tuổi trở lên có quyền bầu cử vào Quốc hội và Hội đồng nhân dân các cấp."
        },
        {
            id: "l11_7", subject: "GDKT&PL", grade: "11",
            content: "Khi phát hiện hành vi tham nhũng, lãng phí của cán bộ công chức, công dân có quyền thực hiện hành động nào?",
            options: ["A. Tố cáo đến cơ quan nhà nước có thẩm quyền", "B. Tự ý bắt giữ và xử phạt", "C. Đăng tin sai sự thật kích động bạo lực", "D. Im lặng không can thiệp"],
            correct: "A",
            explanation: "Quyền tố cáo cho phép công dân báo cho cơ quan có thẩm quyền về hành vi vi phạm pháp luật gây thiệt hại đến lợi ích Nhà nước và nhân dân."
        },
        {
            id: "l11_8", subject: "GDKT&PL", grade: "11",
            content: "Nghĩa vụ đóng thuế của công dân được Hiến pháp quy định là:",
            options: ["A. Nghĩa vụ bắt buộc của mọi cá nhân, tổ chức có thu nhập chịu thuế", "B. Việc làm tùy tâm tự nguyện", "C. Chỉ áp dụng cho các công ty nước ngoài", "D. Không bắt buộc đối với người kinh doanh"],
            correct: "A",
            explanation: "Nộp thuế là nghĩa vụ và trách nhiệm pháp lý của công dân để đóng góp cho ngân sách xây dựng đất nước."
        },
        {
            id: "l11_9", subject: "GDKT&PL", grade: "11",
            content: "Vi phạm pháp luật hình sự (tội phạm) là hành vi nguy hiểm cho xã hội được quy định cụ thể tại văn bản nào?",
            options: ["A. Bộ luật Hình sự", "B. Luật Giao thông đường bộ", "C. Nội quy nhà trường", "D. Quy ước làng văn hóa"],
            correct: "A",
            explanation: "Tội phạm và hình phạt đối với tội phạm chỉ được quy định duy nhất trong Bộ luật Hình sự do Quốc hội thông qua."
        },
        {
            id: "l11_10", subject: "GDKT&PL", grade: "11",
            content: "Trách nhiệm pháp lý áp dụng đối với cán bộ, công chức, viên chức vi phạm kỷ luật lao động trong nội bộ cơ quan là:",
            options: ["A. Trách nhiệm kỷ luật", "B. Trách nhiệm hình sự", "C. Trách nhiệm hành chính", "D. Trách nhiệm dân sự"],
            correct: "A",
            explanation: "Khi vi phạm kỷ luật nội bộ, người lao động chịu trách nhiệm kỷ luật như khiển trách, cảnh cáo, hạ bậc lương, buộc thôi việc."
        }
    ],
    "Tiếng Anh": [
        {
            id: "e11_1", subject: "Tiếng Anh", grade: "11",
            content: "The conference ________ we attended last Friday focused on artificial intelligence.",
            options: ["A. which", "B. who", "C. whom", "D. whose"],
            correct: "A",
            explanation: "Mệnh đề quan hệ: 'The conference' là danh từ chỉ vật làm tân ngữ -> đại từ quan hệ phù hợp là 'which' (hoặc 'that')."
        },
        {
            id: "e11_2", subject: "Tiếng Anh", grade: "11",
            content: "She looks very tired. She ________ have worked late last night.",
            options: ["A. must", "B. should", "C. can", "D. would"],
            correct: "A",
            explanation: "Cấu trúc suy đoán chắc chắn về một sự việc trong quá khứ có căn cứ: 'must have + V3/ed' (chắc hẳn là cô ấy đã làm việc muộn)."
        },
        {
            id: "e11_3", subject: "Tiếng Anh", grade: "11",
            content: "________ regular physical exercise helps students reduce academic stress.",
            options: ["A. Doing", "B. Do", "C. Did", "D. Done"],
            correct: "A",
            explanation: "Danh động từ V-ing đóng vai trò chủ ngữ của câu: 'Doing regular physical exercise helps...'."
        },
        {
            id: "e11_4", subject: "Tiếng Anh", grade: "11",
            content: "New solar panels ________ on the school roof next month to save energy.",
            options: ["A. will be installed", "B. will install", "C. installed", "D. are installing"],
            correct: "A",
            explanation: "Câu bị động ở thì tương lai đơn có dấu hiệu 'next month': will be + V3/ed -> 'will be installed'."
        },
        {
            id: "e11_5", subject: "Tiếng Anh", grade: "11",
            content: "If we continue cutting down forests, many wild animals ________ their natural habitats.",
            options: ["A. will lose", "B. lost", "C. would lose", "D. had lost"],
            correct: "A",
            explanation: "Câu điều kiện loại 1 (có thật ở hiện tại/tương lai): If + S + V(hiện tại), S + will + V(bare) -> 'will lose'."
        },
        {
            id: "e11_6", subject: "Tiếng Anh", grade: "11",
            content: "He tried his best; ________, he did not win the first prize in the singing contest.",
            options: ["A. however", "B. although", "C. because", "D. therefore"],
            correct: "A",
            explanation: "Liên từ trạng từ 'however' (tuy nhiên) đứng sau dấu chấm phẩy và trước dấu phẩy diễn tả sự nhượng bộ."
        },
        {
            id: "e11_7", subject: "Tiếng Anh", grade: "11",
            content: "The teacher asked Minh where he ________ the previous weekend.",
            options: ["A. had gone", "B. went", "C. has gone", "D. was going"],
            correct: "A",
            explanation: "Câu tường thuật gián tiếp dạng câu hỏi wh-: lùi từ thì quá khứ đơn sang quá khứ hoàn thành 'had gone'."
        },
        {
            id: "e11_8", subject: "Tiếng Anh", grade: "11",
            content: "Never ________ up on your dreams, even when facing significant challenges.",
            options: ["A. give", "B. take", "C. put", "D. look"],
            correct: "A",
            explanation: "Cụm động từ 'give up' có nghĩa là bỏ cuộc, từ bỏ."
        },
        {
            id: "e11_9", subject: "Tiếng Anh", grade: "11",
            content: "Switching to LED lights helps reduce our family's carbon ________.",
            options: ["A. footprint", "B. pollution", "C. warming", "D. emission"],
            correct: "A",
            explanation: "Cụm từ cố định 'carbon footprint' nghĩa là dấu chân cacbon (lượng khí nhà kính phát thải)."
        },
        {
            id: "e11_10", subject: "Tiếng Anh", grade: "11",
            content: "More strict regulations are needed to stop the ________ of rivers and lakes.",
            options: ["A. pollution", "B. pollute", "C. pollutant", "D. polluted"],
            correct: "A",
            explanation: "Sau mạo từ 'the' và trước giới từ 'of' cần danh từ: 'the pollution of rivers' (sự ô nhiễm sông hồ)."
        }
    ],
    "Tin Học": [
        {
            id: "t11_1", subject: "Tin Học", grade: "11",
            content: "Phần mềm cung cấp môi trường để tạo lập, lưu trữ, cập nhật và khai thác một cơ sở dữ liệu gọi là:",
            options: ["A. Hệ quản trị cơ sở dữ liệu (DBMS)", "B. Hệ điều hành (OS)", "C. Trình biên dịch (Compiler)", "D. Phần mềm soạn thảo văn bản"],
            correct: "A",
            explanation: "DBMS (Database Management System) như MySQL, SQL Server, Oracle là hệ quản trị cơ sở dữ liệu."
        },
        {
            id: "t11_2", subject: "Tin Học", grade: "11",
            content: "Trong một bảng dữ liệu quan hệ, mỗi cột biểu diễn một thuộc tính của đối tượng được gọi là:",
            options: ["A. Trường (Field)", "B. Bản ghi (Record)", "C. Khóa chính (Primary Key)", "D. Khung nhìn (View)"],
            correct: "A",
            explanation: "Trong bảng CSDL: Mỗi cột là một Trường (Field / Attribute), mỗi hàng là một Bản ghi (Record / Tuple)."
        },
        {
            id: "t11_3", subject: "Tin Học", grade: "11",
            content: "Một hoặc nhiều trường dùng để xác định duy nhất từng bản ghi trong bảng dữ liệu được gọi là:",
            options: ["A. Khóa chính (Primary Key)", "B. Khóa ngoại (Foreign Key)", "C. Chỉ mục phụ", "D. Thuộc tính suy diễn"],
            correct: "A",
            explanation: "Khóa chính (Primary Key) đảm bảo tính toàn vẹn thực thể, không được trùng lặp và không được để trống (NULL)."
        },
        {
            id: "t11_4", subject: "Tin Học", grade: "11",
            content: "Trong câu lệnh SQL: `SELECT HoTen, DiemTB FROM HOC_SINH WHERE DiemTB >= 8.0;`, từ khóa `WHERE` dùng để:",
            options: ["A. Thiết lập điều kiện lọc dữ liệu", "B. Sắp xếp thứ tự các bản ghi", "C. Nhóm dữ liệu lại với nhau", "D. Xóa dữ liệu thỏa mãn"],
            correct: "A",
            explanation: "Mệnh đề `WHERE` chỉ định điều kiện lọc các bản ghi cần lấy ra từ bảng."
        },
        {
            id: "t11_5", subject: "Tin Học", grade: "11",
            content: "Thiết bị mạng nào dùng để định tuyến và chuyển tiếp các gói tin giữa các mạng máy tính khác nhau?",
            options: ["A. Router (Bộ định tuyến)", "B. Switch (Bộ chuyển mạch)", "C. Cáp mạng LAN", "D. Card mạng (NIC)"],
            correct: "A",
            explanation: "Router hoạt động ở tầng Network (tầng 3) có chức năng định tuyến đường đi cho các gói tin giữa các mạng."
        },
        {
            id: "t11_6", subject: "Tin Học", grade: "11",
            content: "Địa chỉ nào sau đây định danh duy nhất cho một thiết bị trên mạng toàn cầu Internet?",
            options: ["A. Địa chỉ IP", "B. Địa chỉ email", "C. Tên tài khoản", "D. Mã số sinh viên"],
            correct: "A",
            explanation: "Địa chỉ IP (Internet Protocol) là định danh logic duy nhất của thiết bị tham gia mạng Internet."
        },
        {
            id: "t11_7", subject: "Tin Học", grade: "11",
            content: "Thuật toán tìm kiếm nhị phân (Binary Search) chỉ áp dụng được trên danh sách thỏa mãn điều kiện nào?",
            options: ["A. Danh sách đã được sắp xếp thứ tự", "B. Danh sách có số lượng phần tử lẻ", "C. Danh sách hoàn toàn ngẫu nhiên", "D. Danh sách chỉ chứa số nguyên dương"],
            correct: "A",
            explanation: "Thuật toán tìm kiếm nhị phân chia đôi phạm vi tìm kiếm nên bắt buộc dãy phần tử phải được sắp xếp trước."
        },
        {
            id: "t11_8", subject: "Tin Học", grade: "11",
            content: "Thuật toán sắp xếp nào hoạt động bằng cách so sánh và đổi chỗ liên tục hai phần tử kề nhau nếu chúng sai thứ tự?",
            options: ["A. Sắp xếp nổi bọt (Bubble Sort)", "B. Sắp xếp chèn (Insertion Sort)", "C. Sắp xếp chọn (Selection Sort)", "D. Tìm kiếm tuần tự"],
            correct: "A",
            explanation: "Bubble Sort liên tục so sánh 2 phần tử liền kề và hoán đổi, đẩy phần tử lớn nhất dần về cuối dãy như bọt khí nổi lên."
        },
        {
            id: "t11_9", subject: "Tin Học", grade: "11",
            content: "Trong Python, cú pháp nào sau đây dùng để mở một tệp văn bản để đọc dữ liệu an toàn?",
            options: ["A. with open('data.txt', 'r') as f:", "B. open('data.txt', 'write'):", "C. file = read('data.txt')", "D. input('data.txt', mode='read')"],
            correct: "A",
            explanation: "Cấu trúc `with open(...)` tự động đóng tệp tin sau khi hoàn thành khối lệnh, chế độ `'r'` là đọc (read)."
        },
        {
            id: "t11_10", subject: "Tin Học", grade: "11",
            content: "Hàm tự gọi lại chính nó trong quá trình thực thi được gọi là:",
            options: ["A. Hàm đệ quy (Recursive function)", "B. Hàm ẩn danh (Lambda)", "C. Vòng lặp vô tận", "D. Phương thức tĩnh"],
            correct: "A",
            explanation: "Đệ quy là kỹ thuật trong đó một hàm gọi lại chính nó với bài toán con nhỏ hơn có điểm dừng."
        }
    ],
    "Công Nghệ": [
        {
            id: "cn11_1", subject: "Công Nghệ", grade: "11", period: "mid1", topic: "Vật liệu cơ khí",
            content: "Thép là hợp kim của sắt (Fe) và cacbon (C) cùng một số nguyên tố khác, trong đó hàm lượng cacbon là:",
            options: ["A. Nhỏ hơn hoặc bằng 2,14%", "B. Lớn hơn 2,14%", "C. Bằng 5%", "D. Lớn hơn 10%"],
            correct: "A",
            explanation: "Thép có hàm lượng C ≤ 2,14%; nếu hàm lượng C > 2,14% thì gọi là gang."
        },
        {
            id: "cn11_2", subject: "Công Nghệ", grade: "11", period: "mid1", topic: "Vật liệu cơ khí",
            content: "Vật liệu composite cơ khí có ưu điểm vượt trội nào so với kim loại truyền thống?",
            options: [
                "A. Độ bền cơ học cao, khối lượng riêng nhẹ và chống ăn mòn hóa học tốt",
                "B. Dẫn điện tốt hơn đồng",
                "C. Dễ bị rỉ sét trong không khí ẩm",
                "D. Nhiệt độ nóng chảy cực thấp"
            ],
            correct: "A",
            explanation: "Composite kết hợp vật liệu nền và vật liệu cốt tạo ra tính chất cơ học ưu việt: độ bền cao, nhẹ, chịu mài mòn và không bị gỉ sét."
        },
        {
            id: "cn11_3", subject: "Công Nghệ", grade: "11", period: "final1", topic: "Gia công cơ khí & Động cơ",
            content: "Phương pháp gia công cắt gọt kim loại nào sau đây dùng để gia công các mặt tròn xoay (mặt trụ, mặt côn, tiện ren)?",
            options: ["A. Tiện", "B. Phay phẳng", "C. Bào", "D. Hàn hồ quang"],
            correct: "A",
            explanation: "Tiện là phương pháp gia công cắt gọt trong đó phôi quay tròn và dao tiện tịnh tiến, chuyên tạo các bề mặt tròn xoay."
        },
        {
            id: "cn11_4", subject: "Công Nghệ", grade: "11", period: "final1", topic: "Gia công cơ khí & Động cơ",
            content: "Chu trình làm việc của động cơ đốt trong 4 kỳ diễn ra theo trình tự nào sau đây?",
            options: [
                "A. Nạp - Nén - Cháy dãn nở (sinh công) - Thải",
                "B. Nén - Nạp - Thải - Cháy dãn nở",
                "C. Nạp - Thải - Nén - Sinh công",
                "D. Cháy dãn nở - Nạp - Nén - Thải"
            ],
            correct: "A",
            explanation: "Động cơ 4 kì hoàn thành chu trình công tác qua 4 hành trình của pittông: Kỳ 1 Nạp, Kỳ 2 Nén, Kỳ 3 Cháy dãn nở sinh công, Kỳ 4 Thải khí cháy."
        },
        {
            id: "cn11_5", subject: "Công Nghệ", grade: "11", period: "final1", topic: "Gia công cơ khí & Động cơ",
            content: "Cơ cấu trục khuỷu thanh truyền trong động cơ đốt trong có nhiệm vụ biến đổi:",
            options: [
                "A. Chuyển động tịnh tiến của pittông thành chuyển động quay tròn của trục khuỷu",
                "B. Chuyển động quay của trục khuỷu thành chuyển động lắc",
                "C. Nhiệt năng trực tiếp thành điện năng",
                "D. Áp suất khí quyển thành áp suất dầu"
            ],
            correct: "A",
            explanation: "Khi hỗn hợp cháy dãn nở đẩy pittông chuyển động tịnh tiến, thanh truyền truyền lực làm quay trục khuỷu sinh công cơ học."
        },
        {
            id: "cn11_6", subject: "Công Nghệ", grade: "11", period: "mid2", topic: "Chăn nuôi công nghệ cao",
            content: "Mô hình chuồng kín (chuồng lạnh) trong chăn nuôi công nghệ cao có ưu điểm vượt trội nào?",
            options: [
                "A. Kiểm soát chủ động nhiệt độ, độ ẩm, thông gió và ngăn ngừa tối đa mầm bệnh từ môi trường bên ngoài",
                "B. Không cần đầu tư thiết bị điện gió",
                "C. Gia súc gia cầm phát triển mà không cần ăn uống",
                "D. Chi phí xây dựng rẻ hơn chuồng hở tự nhiên"
            ],
            correct: "A",
            explanation: "Chuồng kín cách ly vật nuôi với nguồn lây bên ngoài, sử dụng quạt hút và giàn mát để điều hòa tiểu khí hậu tối ưu nhất."
        },
        {
            id: "cn11_7", subject: "Công Nghệ", grade: "11", period: "mid2", topic: "Chăn nuôi công nghệ cao",
            content: "Phương pháp bảo quản thức ăn thô xanh cho gia súc nhai lại bằng cách ủ chua (Silage) dựa trên hoạt động của:",
            options: [
                "A. Vi khuẩn lactic yếm khí tạo môi trường axit nhẹ ức chế vi sinh vật gây thối",
                "B. Nấm men rượu hiếu khí",
                "C. Vi khuẩn hoại sinh trong đất",
                "D. Hóa chất bảo quản công nghiệp"
            ],
            correct: "A",
            explanation: "Ủ chua tạo môi trường kị khí để vi khuẩn lactic lên men đường thành axit lactic (pH 3,8 - 4,2), bảo quản thức ăn xanh giàu dinh dưỡng quanh năm."
        },
        {
            id: "cn11_8", subject: "Công Nghệ", grade: "11", period: "final2", topic: "Công nghệ sinh học & An toàn",
            content: "Lợi ích lớn nhất của công nghệ thụ tinh nhân tạo trong chăn nuôi hiện đại là:",
            options: [
                "A. Khai thác tối đa tiềm năng di truyền của đực giống tốt và phòng tránh các bệnh truyền nhiễm qua đường giao phối",
                "B. Giúp con non sinh ra đều là con cái",
                "C. Làm cho vật nuôi không bao giờ bị ốm",
                "D. Tiết kiệm 100% thức ăn chăn nuôi"
            ],
            correct: "A",
            explanation: "Một con đực giống tốt có thể phối cho hàng nghìn con cái, giúp nhân giống nhanh, nâng cao chất lượng đàn và an toàn dịch bệnh."
        },
        {
            id: "cn11_9", subject: "Công Nghệ", grade: "11", period: "final2", topic: "Công nghệ sinh học & An toàn",
            content: "Biện pháp an toàn sinh học 'Cùng vào - Cùng ra' (All in - All out) trong chăn nuôi có tác dụng gì?",
            options: [
                "A. Giúp cắt đứt hoàn toàn vòng đời mầm bệnh giữa các lứa nuôi nhờ có thời gian trống chuồng vệ sinh khử trùng",
                "B. Tiết kiệm nhân công chăn thả tự do",
                "C. Cho vật nuôi tự do ra vào chuồng tự nhiên",
                "D. Tăng mật độ nuôi nhốt lên gấp 3 lần"
            ],
            correct: "A",
            explanation: "Nuôi cùng lứa và xuất bán cùng lúc cho phép tẩy uế, tiêu độc toàn bộ khu chuồng và để trống chuồng cắt đứt mầm bệnh truyền sang lứa sau."
        },
        {
            id: "cn11_10", subject: "Công Nghệ", grade: "11", period: "final2", topic: "Công nghệ sinh học & An toàn",
            content: "Xử lý chất thải chăn nuôi bằng hầm khí sinh học (Biogas) mang lại lợi ích kép nào?",
            options: [
                "A. Giảm thiểu ô nhiễm môi trường và tạo ra khí đốt metan (CH₄) phục vụ đun nấu, phát điện",
                "B. Biến phân gia súc trực tiếp thành thức ăn chăn nuôi",
                "C. Loại bỏ nhu cầu sử dụng vắc-xin cho vật nuôi",
                "D. Làm lạnh không khí chuồng trại"
            ],
            correct: "A",
            explanation: "Biogas lên men yếm khí chất thải chăn nuôi diệt mầm bệnh, đồng thời sinh khí CH₄ làm nhiên liệu sạch sinh thái."
        }
    ],
    "GDQP&AN": [
        {
            id: "qp11_1", subject: "GDQP&AN", grade: "11", period: "mid1", topic: "Luật Nghĩa vụ quân sự",
            content: "Theo Luật Nghĩa vụ quân sự năm 2015, độ tuổi gọi công dân nhập ngũ trong thời bình là:",
            options: [
                "A. Từ đủ 18 tuổi đến hết 25 tuổi (đến hết 27 tuổi với công dân học đại học, cao đẳng được tạm hoãn)",
                "B. Từ đủ 16 tuổi đến hết 22 tuổi",
                "C. Từ đủ 20 tuổi đến hết 30 tuổi",
                "D. Từ đủ 17 tuổi đến hết 25 tuổi"
            ],
            correct: "A",
            explanation: "Công dân đủ 18 tuổi đến hết 25 tuổi thuộc diện gọi nhập ngũ; người được tạm hoãn học đại học, cao đẳng thì gọi nhập ngũ đến hết 27 tuổi."
        },
        {
            id: "qp11_2", subject: "GDQP&AN", grade: "11", period: "mid1", topic: "Luật Nghĩa vụ quân sự",
            content: "Thời hạn phục vụ tại ngũ trong thời bình của hạ sĩ quan, binh sĩ Quân đội nhân dân Việt Nam là:",
            options: ["A. 24 tháng", "B. 12 tháng", "C. 36 tháng", "D. 18 tháng"],
            correct: "A",
            explanation: "Khoản 1 Điều 21 Luật Nghĩa vụ quân sự 2015 quy định thời hạn phục vụ tại ngũ trong thời bình là 24 tháng."
        },
        {
            id: "qp11_3", subject: "GDQP&AN", grade: "11", period: "final1", topic: "Vũ khí bộ binh & Lựu đạn",
            content: "Hộp tiếp đạn của súng tiểu liên AK chứa được tối đa bao nhiêu viên đạn?",
            options: ["A. 30 viên", "B. 20 viên", "C. 40 viên", "D. 50 viên"],
            correct: "A",
            explanation: "Hộp tiếp đạn tiêu chuẩn hình cong của súng tiểu liên AK chứa được 30 viên đạn 7,62 mm."
        },
        {
            id: "qp11_4", subject: "GDQP&AN", grade: "11", period: "final1", topic: "Vũ khí bộ binh & Lựu đạn",
            content: "Bán kính sát thương nguy hiểm của mảnh lựu đạn phòng ngự F-1 là bao nhiêu?",
            options: ["A. Khoảng 20 mét", "B. 5 mét", "C. 50 mét", "D. 100 mét"],
            correct: "A",
            explanation: "Lựu đạn F-1 là lựu đạn phòng ngự có vỏ gang khía rãnh, khi nổ tạo mảnh sát thương nguy hiểm trong bán kính 20 mét (người ném phải nấp sau công sự)."
        },
        {
            id: "qp11_5", subject: "GDQP&AN", grade: "11", period: "final1", topic: "Vũ khí bộ binh & Lựu đạn",
            content: "Thời gian cháy chậm của ngòi nổ lựu đạn F-1 từ khi rời tay ném đến khi nổ là khoảng:",
            options: ["A. 3,2 giây đến 4,2 giây", "B. 1 giây đến 2 giây", "C. 6 giây đến 8 giây", "D. Nổ tức thì khi rời tay"],
            correct: "A",
            explanation: "Thời gian cháy chậm của hạt lửa ngòi nổ lựu đạn F-1 kéo dài khoảng 3,2 đến 4,2 giây trước khi kích nổ kíp."
        },
        {
            id: "qp11_6", subject: "GDQP&AN", grade: "11", period: "mid2", topic: "Kĩ thuật băng bó & Cấp cứu",
            content: "Nguyên tắc cơ bản nhất khi cố định tạm thời gãy xương là gì?",
            options: [
                "A. Nẹp cố định phải đủ dài để bất động được cả 2 khớp liền kề (trên và dưới ổ gãy)",
                "B. Cố gắng nắn chỉnh xương gãy về vị trí cũ ngay tại hiện trường",
                "C. Bó thật chặt trực tiếp lên vị trí da bị gãy xương",
                "D. Cho nạn nhân đứng dậy đi thử"
            ],
            correct: "A",
            explanation: "Bất động ổ gãy xương đòi hỏi nẹp phải giữ cố định khớp trên và khớp dưới ổ gãy, có đệm lót êm, tuyệt đối không nắn bóp tại chỗ."
        },
        {
            id: "qp11_7", subject: "GDQP&AN", grade: "11", period: "mid2", topic: "Kĩ thuật băng bó & Cấp cứu",
            content: "Phương pháp đặt garô cầm máu chỉ được áp dụng trong trường hợp vết thương nào?",
            options: [
                "A. Vết thương đứt động mạch lớn ở chi chảy máu ồ ạt, phun thành tia",
                "B. Vết thương xây xát ngoài da chảy máu mao mạch nhỏ",
                "C. Chảy máu tĩnh mạch nông",
                "D. Bầm tím phần mềm"
            ],
            correct: "A",
            explanation: "Garô là biện pháp cầm máu tối khẩn cấp chỉ dùng khi đứt động mạch ở chi; phải ghi phiếu garô và nới garô định kì tránh hoại tử chi."
        },
        {
            id: "qp11_8", subject: "GDQP&AN", grade: "11", period: "final2", topic: "Bảo vệ an ninh trật tự & Phòng chống tội phạm",
            content: "Chiến lược 'Diễn biến hòa bình' của các thế lực thù địch chống phá cách mạng Việt Nam chủ yếu sử dụng phương thức nào?",
            options: [
                "A. Sử dụng các biện pháp phi vũ trang kết hợp kích động bạo loạn lật đổ từ bên trong",
                "B. Tiến công xâm lược quân sự quy mô lớn bằng xe tăng máy bay ngay lập tức",
                "C. Đóng cửa hoàn toàn biên giới trên bộ",
                "D. Cung cấp lương thực miễn phí cho nhân dân"
            ],
            correct: "A",
            explanation: "'Diễn biến hòa bình' là chiến lược dùng đòn bẩy kinh tế, chính trị, văn hóa, tư tưởng để chuyển hóa chế độ chính trị từ bên trong."
        },
        {
            id: "qp11_9", subject: "GDQP&AN", grade: "11", period: "final2", topic: "Bảo vệ an ninh trật tự & Phòng chống tội phạm",
            content: "Khi mang súng tiểu liên AK ở tư thế 'Treo súng', nòng súng được hướng như thế nào?",
            options: [
                "A. Nòng súng hướng lên trên, chếch sang vai trái khoảng 45 độ",
                "B. Nòng súng chúc thẳng xuống đất",
                "C. Nòng súng chĩa ngang sang người bên cạnh",
                "D. Nòng súng kẹp ngang thắt lưng"
            ],
            correct: "A",
            explanation: "Ở tư thế treo súng, súng vắt chéo trước ngực, nòng súng hướng lên trên chếch sang trái khoảng 45 độ đảm bảo an toàn tuyệt đối."
        },
        {
            id: "qp11_10", subject: "GDQP&AN", grade: "11", period: "final2", topic: "Bảo vệ an ninh trật tự & Phòng chống tội phạm",
            content: "Trách nhiệm của công dân học sinh trong phòng chống tội phạm công nghệ cao là:",
            options: [
                "A. Tuyệt đối không bấm vào các đường link lạ lừa đảo, không cung cấp mã OTP và tài khoản ngân hàng cho người lạ",
                "B. Chia sẻ thông tin tài khoản cá nhân cho mọi người trên mạng",
                "C. Giúp kẻ xấu rút tiền hoa hồng phi pháp",
                "D. Tải và cài đặt phần mềm độc hại gửi cho bạn bè"
            ],
            correct: "A",
            explanation: "Bảo vệ mã OTP, mật khẩu và cảnh giác trước các thủ đoạn lừa đảo trực tuyến là kĩ năng an ninh số quan trọng của học sinh."
        }
    ]
};

// ==============================================================================
// TỔNG HỢP NGÂN HÀNG ĐỀ THI THEO KHỐI LỚP 10, 11, 12
// ==============================================================================
const BUILTIN_EXAM_BANK = {
    "10": BUILTIN_EXAM_BANK_10,
    "11": BUILTIN_EXAM_BANK_11,
    "12": BUILTIN_EXAM_BANK_12
};

// CÁC HỌC KỲ / KỲ THI
const EXAM_PERIODS = {
    'all': { name: 'Tất Cả Kì (Tổng Hợp)', short: 'Tổng hợp', badgeCls: 'bg-purple-100 text-purple-800' },
    'mid1': { name: 'Giữa Kì 1', short: 'Giữa Kì 1', badgeCls: 'bg-blue-100 text-blue-800' },
    'final1': { name: 'Cuối Kì 1', short: 'Cuối Kì 1', badgeCls: 'bg-emerald-100 text-emerald-800' },
    'mid2': { name: 'Giữa Kì 2', short: 'Giữa Kì 2', badgeCls: 'bg-amber-100 text-amber-800' },
    'final2': { name: 'Cuối Kì 2', short: 'Cuối Kì 2', badgeCls: 'bg-rose-100 text-rose-800' }
};

// MA TRẬN CHỦ ĐỀ / BÀI HỌC TRỌNG TÂM THEO 11 MÔN VÀ KHỐI LỚP (GDPT 2018)
const SUBJECT_TOPICS_MAP = {
    'Toán': {
        '10': ['Mệnh đề & Tập hợp', 'Bất phương trình bậc nhất hai ẩn', 'Hệ thức lượng trong tam giác', 'Véctơ & Hệ trục tọa độ Oxy', 'Thống kê & Xác suất cơ bản'],
        '11': ['Hàm số lượng giác & Phương trình lượng giác', 'Dãy số, Cấp số cộng & Cấp số nhân', 'Giới hạn & Hàm số liên tục', 'Đường thẳng & Mặt phẳng trong không gian', 'Đạo hàm & Tiếp tuyến'],
        '12': ['Ứng dụng đạo hàm khảo sát hàm số', 'Tọa độ không gian Oxyz', 'Nguyên hàm & Tích phân', 'Xác suất có điều kiện', 'Phương trình mũ & Lôgarit']
    },
    'Vật Lí': {
        '10': ['Mô tả chuyển động & Vận tốc', 'Động lực học Newton', 'Công, Năng lượng & Công suất', 'Động lượng & Va chạm', 'Chuyển động tròn đều'],
        '11': ['Dao động điều hòa', 'Sóng cơ & Giao thoa sóng', 'Điện trường & Điện thế', 'Dòng điện không đổi & Mạch điện', 'Khúc xạ ánh sáng'],
        '12': ['Vật lí nhiệt & Khí lý tưởng', 'Từ trường & Cảm ứng điện từ', 'Vật lí hạt nhân & Phóng xạ', 'Sóng điện từ & Truyền thông tin', 'Dòng điện xoay chiều']
    },
    'Hóa Học': {
        '10': ['Cấu tạo nguyên tử & Bảng tuần hoàn', 'Liên kết hóa học & Phân tử', 'Phản ứng oxi hóa - khử', 'Năng lượng hóa học (Enthalpy)', 'Tốc độ phản ứng hóa học & Halogen'],
        '11': ['Cân bằng hóa học & pH dung dịch', 'Nitrogen & Sulfur', 'Đại cương hóa học hữu cơ', 'Hydrocarbon (Alkane, Alkene, Arene)', 'Dẫn xuất Halogen, Alcohol & Phenol'],
        '12': ['Ester - Lipid & Xà phòng', 'Carbohydrate (Glucose, Saccarozo, Tinh bột)', 'Amine, Amino Acid & Protein', 'Polymer & Vật liệu mới', 'Pin điện hóa & Kim loại']
    },
    'Sinh Học': {
        '10': ['Sinh học tế bào & Thành phần hóa học', 'Cấu trúc tế bào nhân sơ & nhân thực', 'Chuyển hóa vật chất & Năng lượng', 'Phân chia tế bào (Nguyên phân, Giảm phân)', 'Vi sinh vật & Virus'],
        '11': ['Trao đổi nước & Khoáng ở thực vật', 'Quang hợp & Hô hấp ở thực vật', 'Dinh dưỡng, Hô hấp & Tuần hoàn ở động vật', 'Cảm ứng & Tập tính sinh vật', 'Sinh trưởng & Sinh sản'],
        '12': ['Cơ chế di truyền và biến dị (ADN, Đột biến)', 'Quy luật di truyền Mendel & Mở rộng', 'Di truyền học quần thể & Người', 'Tiến hóa sinh học & Thuyết tiến hóa', 'Sinh thái học & Môi trường']
    },
    'Lịch Sử': {
        '10': ['Hiện thực lịch sử và nhận thức lịch sử', 'Các nền văn minh cổ - trung đại', 'Văn minh Đông Nam Á', 'Văn minh Đại Việt', 'Cách mạng công nghiệp'],
        '11': ['Cách mạng tư sản & Chủ nghĩa tư bản', 'Chủ nghĩa xã hội & Liên Xô', 'Chiến tranh thế giới thứ nhất & thứ hai', 'Lịch sử bảo vệ chủ quyền Biển Đảo', 'Kháng chiến chống ngoại xâm'],
        '12': ['Trật tự thế giới sau Chiến tranh thế giới thứ hai', 'Cách mạng tháng Tám 1945 & Kháng chiến chống Pháp', 'Kháng chiến chống Mỹ cứu nước (1954-1975)', 'Công cuộc Đổi mới đất nước từ năm 1986', 'Lịch sử đối ngoại & ASEAN']
    },
    'Địa Lí': {
        '10': ['Bản đồ & Hệ thống thông tin địa lí (GIS)', 'Thạch quyển & Nội lực, Ngoại lực', 'Khí quyển & Khí hậu', 'Thủy quyển & Thổ nhưỡng, Sinh quyển', 'Địa lí dân cư & Kinh tế ngành'],
        '11': ['Toàn cầu hóa & Khu vực hóa kinh tế', 'Địa lí Hoa Kỳ & EU', 'Địa lí Liên Bang Nga & Nhật Bản', 'Địa lí Trung Quốc & Ấn Độ', 'Địa lí khu vực Đông Nam Á (ASEAN)'],
        '12': ['Vị trí địa lí & Thiên nhiên nhiệt đới ẩm gió mùa', 'Địa hình & Tài nguyên khoáng sản', 'Vấn đề sử dụng tài nguyên & Môi trường', 'Địa lí dân cư & Đô thị hóa', 'Chuyển dịch cơ cấu kinh tế ngành & Vùng biển đảo']
    },
    'GDKT&PL': {
        '10': ['Nền kinh tế và các chủ thể kinh tế', 'Thị trường và cơ chế thị trường', 'Thuế và ngân sách nhà nước', 'Pháp luật và đời sống', 'Bộ máy nhà nước CHXHCN Việt Nam'],
        '11': ['Cạnh tranh, cung cầu trong kinh tế thị trường', 'Lạm phát & Thất nghiệp', 'Thị trường lao động & Việc làm', 'Quyền bình đẳng của công dân', 'Quyền tự do cơ bản của công dân'],
        '12': ['Tăng trưởng & Phát triển kinh tế', 'Hội nhập kinh tế quốc tế', 'Bảo hiểm và an sinh xã hội', 'Quyền và nghĩa vụ trong hôn nhân & gia đình', 'Pháp luật về bảo vệ môi trường & Quốc phòng an ninh']
    },
    'Tiếng Anh': {
        '10': ['Family Life & Daily Routines', 'Humans and the Environment', 'Music and Arts', 'Community Service & Volunteering', 'Inventions & Modern Tech'],
        '11': ['A Long and Healthy Life', 'The Generation Gap', 'Cities of the Future', 'ASEAN and Viet Nam', 'Global Warming & Climate Change'],
        '12': ['Life Stories & Inspirational Figures', 'A Diversity of Cultures', 'The Green Movement & Artificial Intelligence', 'Urbanisation & Mega Cities', 'The World of Work & Lifelong Learning']
    },
    'Tin Học': {
        '10': ['Máy tính và xã hội tri thức', 'Mạng máy tính & Internet an toàn', 'Đạo đức, pháp luật số', 'Lập trình Python cơ bản', 'Thuật toán tìm kiếm & sắp xếp'],
        '11': ['Hệ điều hành & Ứng dụng', 'Cơ sở dữ liệu quan hệ (RDBMS)', 'Truy vấn CSDL với SQL', 'Thiết kế trang web (HTML/CSS)', 'An toàn thông tin mạng'],
        '12': ['Hệ thống mạng máy tính & TCP/IP', 'Bảo mật mạng & Tường lửa', 'Trí tuệ nhân tạo (AI) ứng dụng', 'Khoa học dữ liệu & Big Data', 'Lập trình ứng dụng số']
    },
    'Công Nghệ': {
        '10': ['Công nghệ & Đời sống kĩ thuật', 'Bản vẽ kỹ thuật & Hình chiếu', 'Vật liệu kỹ thuật & Gia công', 'Công nghệ trồng trọt & Bảo vệ thực vật', 'Nông nghiệp công nghệ cao'],
        '11': ['Cơ khí chế tạo & Động cơ đốt trong', 'Hệ thống truyền động cơ khí', 'Công nghệ chăn nuôi & Thú y', 'Thức ăn chăn nuôi & Chế biến', 'Bảo vệ môi trường nông nghiệp'],
        '12': ['Kỹ thuật điện & An toàn điện', 'Mạch điện ba pha & Máy biến áp', 'Động cơ điện & Mạng lưới điện', 'Kỹ thuật điện tử & Bán dẫn', 'Lâm nghiệp & Thủy sản công nghệ cao']
    },
    'GDQP&AN': {
        '10': ['Truyền thống đánh giặc giữ nước của dân tộc', 'Lịch sử & Nghệ thuật quân sự', 'Xây dựng lực lượng vũ trang nhân dân', 'Bảo vệ chủ quyền lãnh thổ & Biên giới', 'Kỹ thuật cấp cứu & Băng bó vết thương'],
        '11': ['Bảo vệ Tổ quốc trong tình hình mới', 'Phòng chống chiến lược "Diễn biến hòa bình"', 'Tổ chức Quân đội & Công an nhân dân', 'Kỹ thuật bắn súng tiểu liên AK', 'Bảo vệ an ninh trật tự & Phòng chống tội phạm'],
        '12': ['Đường lối quốc phòng & An ninh của Đảng', 'Nền quốc phòng toàn dân vững mạnh', 'Chiến tranh nhân dân bảo vệ Tổ quốc', 'Phòng chống vũ khí công nghệ cao', 'Chủ quyền biển đảo & Vùng trời quốc gia']
    }
};

// BIẾN TRẠNG THÁI PHÒNG LUYỆN THI
let selectedExamGrade = '12'; // '10', '11', '12', 'all'
let selectedExamPeriod = 'all'; // 'all', 'mid1', 'final1', 'mid2', 'final2'
let selectedExamTopic = 'all'; // 'all' hoặc tên chủ đề
let selectedExamSubject = 'Toán';
let selectedExamMode = 'mini'; // 'mini' (10q, 15m), 'standard' (25q, 40m), 'full' (40q, 50m)
let currentExamSubTab = 'practice'; // 'practice', 'mistakes', 'import', 'history'

let activeExam = null; // Quản lý bài thi đang diễn ra
let currentReviewQuestions = []; // Danh sách câu hỏi vừa thi để review
let currentReviewFilter = 'all'; // 'all', 'wrong', 'correct'
let currentMistakeGradeFilter = 'all'; // 'all', '10', '11', '12'
let currentMistakePeriodFilter = 'all'; // 'all', 'mid1', 'final1', 'mid2', 'final2'
let currentMistakeFilter = 'all'; // 'all' hoặc tên môn

// KHỞI ĐỘNG MODULE PHÒNG THI
function initExamModule() {
    renderExamSubjectGrid();
    updateExamLobbyStats();
    renderMistakesGradeFilterChips();
    renderMistakesPeriodFilterChips();
    renderMistakesFilterChips();
    renderMistakeNotebook();
    renderExamHistory();
    selectExamGrade(selectedExamGrade);
    selectExamPeriod(selectedExamPeriod);
    renderExamTopicChips();
}

// 1. CẬP NHẬT THỐNG KÊ LOBBY
function updateExamLobbyStats() {
    const history = JSON.parse(localStorage.getItem('school_exam_history')) || [];
    const mistakes = JSON.parse(localStorage.getItem('school_mistake_notebook')) || [];

    const examCountEl = document.getElementById('stat-exam-count');
    const examAvgEl = document.getElementById('stat-exam-avg');
    const mistakeCountEl = document.getElementById('stat-mistake-count');
    const mistakeBadgeEl = document.getElementById('mistake-badge-count');

    if (examCountEl) examCountEl.innerText = history.length;
    if (mistakeCountEl) mistakeCountEl.innerText = mistakes.length;
    if (mistakeBadgeEl) mistakeBadgeEl.innerText = mistakes.length;

    if (examAvgEl) {
        if (history.length === 0) {
            examAvgEl.innerText = '--';
        } else {
            const sum = history.reduce((acc, h) => acc + (parseFloat(h.score) || 0), 0);
            const avg = (sum / history.length).toFixed(1);
            examAvgEl.innerText = avg;
        }
    }
}

// 2. CHUYỂN SUB-TABS TRONG LOBBY
function setExamSubTab(subTab) {
    currentExamSubTab = subTab;
    const tabs = ['practice', 'mistakes', 'import', 'history'];

    tabs.forEach(t => {
        const subView = document.getElementById(`sub-view-${t}`);
        const tabBtn = document.getElementById(`tab-btn-${t}`);
        if (subView) {
            if (t === subTab) subView.classList.remove('hidden');
            else subView.classList.add('hidden');
        }
        if (tabBtn) {
            if (t === subTab) {
                tabBtn.className = "flex-1 py-2 px-3 rounded-lg bg-white text-rose-600 shadow-sm transition flex items-center justify-center gap-1.5 whitespace-nowrap";
            } else {
                tabBtn.className = "flex-1 py-2 px-3 rounded-lg text-gray-600 hover:text-rose-600 transition flex items-center justify-center gap-1.5 whitespace-nowrap";
            }
        }
    });

    if (subTab === 'mistakes') {
        renderMistakesPeriodFilterChips();
        renderMistakeNotebook();
    }
    if (subTab === 'history') renderExamHistory();
}

// 3. RENDER LƯỚI CHỌN MÔN HỌC
function renderExamSubjectGrid() {
    const grid = document.getElementById('subject-exam-grid');
    if (!grid) return;

    grid.innerHTML = EXAM_SUBJECTS.map(s => {
        const isSelected = (s.id === selectedExamSubject);
        const activeClass = isSelected
            ? 'border-2 border-rose-500 bg-rose-50 text-rose-800 shadow-sm'
            : 'border border-gray-200 bg-white hover:border-rose-300 text-gray-700';

        return `
            <button type="button" onclick="selectExamSubject('${s.id}')" class="p-3 rounded-xl flex flex-col items-center gap-1.5 transition text-center ${activeClass}">
                <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${s.color} text-white shadow-2xs">
                    <i class="fa-solid ${s.icon} text-base"></i>
                </div>
                <span class="leading-tight text-xs">${s.name}</span>
            </button>
        `;
    }).join('');

    updateStartButtonText();
}

function selectExamSubject(subj) {
    selectedExamSubject = subj;
    selectedExamTopic = 'all'; // Đặt lại chủ đề khi đổi môn
    renderExamSubjectGrid();
    renderExamTopicChips();
    updateStartButtonText();
}

function selectExamMode(mode, element) {
    selectedExamMode = mode;
    const cards = document.querySelectorAll('.exam-mode-card');
    cards.forEach(c => {
        c.classList.remove('border-rose-500', 'bg-rose-50/50');
        c.classList.add('border-gray-200');
        const title = c.querySelector('span');
        if (title) {
            title.classList.remove('text-rose-700');
            title.classList.add('text-gray-800');
        }
    });

    if (element) {
        element.classList.remove('border-gray-200');
        element.classList.add('border-2', 'border-rose-500', 'bg-rose-50/50');
        const title = element.querySelector('span');
        if (title) {
            title.classList.remove('text-gray-800');
            title.classList.add('text-rose-700');
        }
    }

    updateStartButtonText();
}

// CHỌN KHỐI LỚP
function selectExamGrade(grade) {
    selectedExamGrade = grade;
    selectedExamTopic = 'all'; // Đặt lại chủ đề khi đổi khối lớp

    const gradeBtns = {
        '10': document.getElementById('btn-grade-10'),
        '11': document.getElementById('btn-grade-11'),
        '12': document.getElementById('btn-grade-12'),
        'all': document.getElementById('btn-grade-all')
    };

    const gradeClasses = {
        '10': 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900',
        '11': 'border-2 border-blue-500 bg-blue-50 text-blue-900',
        '12': 'border-2 border-rose-500 bg-rose-50 text-rose-900',
        'all': 'border-2 border-purple-500 bg-purple-50 text-purple-900'
    };

    const gradeLabels = {
        '10': 'Lớp 10 (GDPT 2018)',
        '11': 'Lớp 11 (GDPT 2018)',
        '12': 'Lớp 12 (Trọng tâm)',
        'all': 'Ôn Tốt Nghiệp THPT'
    };

    Object.keys(gradeBtns).forEach(k => {
        const btn = gradeBtns[k];
        if (btn) {
            btn.className = "grade-btn py-3 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition flex items-center justify-center gap-2";
            if (k === grade) {
                btn.className = `grade-btn py-3 px-3 rounded-xl ${gradeClasses[k]} shadow-xs transition flex items-center justify-center gap-2`;
            }
        }
    });

    const badge = document.getElementById('selected-grade-badge');
    if (badge) {
        badge.innerText = gradeLabels[grade] || 'Lớp 12 (Trọng tâm)';
        if (grade === '10') badge.className = "text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full";
        else if (grade === '11') badge.className = "text-xs bg-blue-100 text-blue-800 font-black px-2.5 py-0.5 rounded-full";
        else if (grade === '12') badge.className = "text-xs bg-rose-100 text-rose-800 font-black px-2.5 py-0.5 rounded-full";
        else badge.className = "text-xs bg-purple-100 text-purple-800 font-black px-2.5 py-0.5 rounded-full";
    }

    renderExamTopicChips();
    updateStartButtonText();
}

// CHỌN KỲ THI / HỌC KỲ
function selectExamPeriod(period) {
    selectedExamPeriod = period;

    const periods = ['all', 'mid1', 'final1', 'mid2', 'final2'];
    const periodClasses = {
        'all': 'border-2 border-purple-500 bg-purple-50 text-purple-900 shadow-2xs',
        'mid1': 'border-2 border-blue-500 bg-blue-50 text-blue-900 shadow-2xs',
        'final1': 'border-2 border-emerald-500 bg-emerald-50 text-emerald-900 shadow-2xs',
        'mid2': 'border-2 border-amber-500 bg-amber-50 text-amber-900 shadow-2xs',
        'final2': 'border-2 border-rose-500 bg-rose-50 text-rose-900 shadow-2xs'
    };

    periods.forEach(p => {
        const btn = document.getElementById(`btn-period-${p}`);
        if (btn) {
            if (p === period) {
                btn.className = `period-btn py-2.5 px-2 rounded-xl ${periodClasses[p]} transition flex items-center justify-center gap-1.5`;
            } else {
                btn.className = `period-btn py-2.5 px-2 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-gray-700 transition flex items-center justify-center gap-1.5`;
            }
        }
    });

    const badge = document.getElementById('selected-period-badge');
    if (badge) {
        const pInfo = EXAM_PERIODS[period] || EXAM_PERIODS['all'];
        badge.innerText = pInfo.name;
        badge.className = `text-xs ${pInfo.badgeCls || 'bg-purple-100 text-purple-800'} font-black px-2.5 py-0.5 rounded-full`;
    }

    updateStartButtonText();
}

// LẤY DANH SÁCH CHỦ ĐỀ / BÀI HỌC CHO MÔN & KHỐI ĐÃ CHỌN
function getTopicsForCurrentSelection() {
    let list = [];
    const grade = selectedExamGrade;
    const subj = selectedExamSubject;

    if (SUBJECT_TOPICS_MAP[subj]) {
        if (grade === 'all') {
            ['12', '11', '10'].forEach(g => {
                if (SUBJECT_TOPICS_MAP[subj][g]) {
                    list.push(...SUBJECT_TOPICS_MAP[subj][g]);
                }
            });
        } else if (SUBJECT_TOPICS_MAP[subj][grade]) {
            list = [...SUBJECT_TOPICS_MAP[subj][grade]];
        }
    }

    // Thu thập thêm các topic có trong ngân hàng đề thực tế
    let pool = [];
    if (grade === 'all') {
        const b12 = (BUILTIN_EXAM_BANK['12'] && BUILTIN_EXAM_BANK['12'][subj]) || [];
        const b11 = (BUILTIN_EXAM_BANK['11'] && BUILTIN_EXAM_BANK['11'][subj]) || [];
        const b10 = (BUILTIN_EXAM_BANK['10'] && BUILTIN_EXAM_BANK['10'][subj]) || [];
        pool = [...b12, ...b11, ...b10];
    } else {
        const gBank = BUILTIN_EXAM_BANK[grade];
        pool = (gBank && gBank[subj]) ? gBank[subj] : [];
    }

    pool.forEach(q => {
        if (q.topic && !list.includes(q.topic)) {
            list.push(q.topic);
        }
    });

    return Array.from(new Set(list));
}

// RENDER CHIPS CHỌN CHỦ ĐỀ / BÀI HỌC
function renderExamTopicChips() {
    const container = document.getElementById('exam-topic-chips-container');
    if (!container) return;

    const topics = getTopicsForCurrentSelection();
    const isAllSelected = (selectedExamTopic === 'all');

    let html = `
        <button type="button" onclick="selectExamTopic('all')" class="px-3 py-1.5 rounded-xl whitespace-nowrap transition text-xs font-bold shrink-0 ${isAllSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}">
            <i class="fa-solid fa-layer-group mr-1"></i> Tất cả bài học
        </button>
    `;

    topics.forEach((top, idx) => {
        const isSel = (selectedExamTopic === top);
        const cls = isSel 
            ? 'bg-indigo-600 text-white shadow-xs font-black' 
            : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-medium border border-indigo-200';

        html += `
            <button type="button" onclick="selectExamTopicByIndex(${idx})" class="px-3 py-1.5 rounded-xl whitespace-nowrap transition text-xs shrink-0 ${cls}">
                ${top}
            </button>
        `;
    });

    container.innerHTML = html;

    const topicBadge = document.getElementById('selected-topic-badge');
    if (topicBadge) {
        topicBadge.innerText = (selectedExamTopic === 'all') ? 'Tất cả bài học' : selectedExamTopic;
        topicBadge.title = (selectedExamTopic === 'all') ? 'Tất cả bài học' : selectedExamTopic;
    }
}

function selectExamTopicByIndex(idx) {
    const topics = getTopicsForCurrentSelection();
    if (idx >= 0 && idx < topics.length) {
        selectExamTopic(topics[idx]);
    }
}

function selectExamTopic(topicId) {
    selectedExamTopic = topicId;
    renderExamTopicChips();
    updateStartButtonText();
}

function updateStartButtonText() {
    const btnText = document.getElementById('btn-start-exam-text');
    if (!btnText) return;

    let qCount = 10;
    if (selectedExamMode === 'standard') qCount = 25;
    if (selectedExamMode === 'full') qCount = 40;

    let gradeText = "LỚP 12";
    if (selectedExamGrade === '10') gradeText = "LỚP 10";
    else if (selectedExamGrade === '11') gradeText = "LỚP 11";
    else if (selectedExamGrade === 'all') gradeText = "TỐT NGHIỆP THPT";

    let periodText = "";
    if (selectedExamPeriod !== 'all' && EXAM_PERIODS[selectedExamPeriod]) {
        periodText = ` - ${EXAM_PERIODS[selectedExamPeriod].short.toUpperCase()}`;
    }

    let topicText = "";
    if (selectedExamTopic !== 'all') {
        topicText = ` • ${selectedExamTopic.length > 25 ? selectedExamTopic.substring(0, 22) + '...' : selectedExamTopic}`;
    }

    btnText.innerText = `BẮT ĐẦU LÀM BÀI THI ${gradeText}${periodText} - ${selectedExamSubject.toUpperCase()}${topicText} (${qCount} CÂU)`;
}

// 4. BẮT ĐẦU BÀI THI ĐÃ CHỌN TỪ LOBBY
function startSelectedExam() {
    let pool = [];
    const grade = selectedExamGrade;

    if (grade === 'all') {
        const b12 = (BUILTIN_EXAM_BANK['12'] && BUILTIN_EXAM_BANK['12'][selectedExamSubject]) || [];
        const b11 = (BUILTIN_EXAM_BANK['11'] && BUILTIN_EXAM_BANK['11'][selectedExamSubject]) || [];
        const b10 = (BUILTIN_EXAM_BANK['10'] && BUILTIN_EXAM_BANK['10'][selectedExamSubject]) || [];
        pool = [...b12, ...b11, ...b10];
    } else {
        const gradeBank = BUILTIN_EXAM_BANK[grade] || BUILTIN_EXAM_BANK['12'];
        pool = (gradeBank && gradeBank[selectedExamSubject]) ? gradeBank[selectedExamSubject] : (gradeBank ? gradeBank['Toán'] : []);
    }

    if (!pool || pool.length === 0) {
        pool = (BUILTIN_EXAM_BANK['12'] && BUILTIN_EXAM_BANK['12']['Toán']) || [];
    }

    let finalFilteredPool = pool;

    // ƯU TIÊN 1: LỌC THEO CHỦ ĐỀ BÀI HỌC NẾU NGƯỜI DÙNG CHỌN CHỦ ĐỀ CỤ THỂ
    if (selectedExamTopic !== 'all') {
        const lowerTopic = selectedExamTopic.toLowerCase();
        
        const matchTopic = pool.filter(q => {
            if (!q.topic) return false;
            const qTop = q.topic.toLowerCase();
            if (qTop.includes(lowerTopic) || lowerTopic.includes(qTop)) return true;

            // Nhận diện từ khóa chuyên sâu từng chuyên đề môn học
            if (lowerTopic.includes('lượng giác') && qTop.includes('lượng giác')) return true;
            if (lowerTopic.includes('đạo hàm') && qTop.includes('đạo hàm')) return true;
            if (lowerTopic.includes('nguyên hàm') && (qTop.includes('nguyên hàm') || qTop.includes('tích phân'))) return true;
            if (lowerTopic.includes('tích phân') && (qTop.includes('tích phân') || qTop.includes('nguyên hàm'))) return true;
            if (lowerTopic.includes('cấp số') && qTop.includes('cấp số')) return true;
            if (lowerTopic.includes('giới hạn') && qTop.includes('giới hạn')) return true;
            if (lowerTopic.includes('mũ') && (qTop.includes('mũ') || qTop.includes('lôgarit'))) return true;
            if (lowerTopic.includes('oxyz') && qTop.includes('oxyz')) return true;
            if (lowerTopic.includes('không gian') && qTop.includes('không gian')) return true;
            if (lowerTopic.includes('mệnh đề') && qTop.includes('mệnh đề')) return true;
            if (lowerTopic.includes('tập hợp') && qTop.includes('tập hợp')) return true;
            if (lowerTopic.includes('bất phương trình') && qTop.includes('bất phương trình')) return true;
            if (lowerTopic.includes('thống kê') && qTop.includes('thống kê')) return true;
            if (lowerTopic.includes('xác suất') && qTop.includes('xác suất')) return true;
            if (lowerTopic.includes('vectơ') && (qTop.includes('vectơ') || qTop.includes('véctơ'))) return true;
            return false;
        });

        if (matchTopic.length > 0) {
            // NẾU CÓ CÂU HỎI ĐÚNG CHỦ ĐỀ: CHỈ LẤY ĐÚNG CÁC CÂU NÀY, KHÔNG PHA TRỘN CHỦ ĐỀ KHÁC!
            if (selectedExamPeriod !== 'all') {
                const matchTopicAndPeriod = matchTopic.filter(q => q.period === selectedExamPeriod || q.period === 'all');
                finalFilteredPool = (matchTopicAndPeriod.length > 0) ? matchTopicAndPeriod : matchTopic;
            } else {
                finalFilteredPool = matchTopic;
            }
        } else {
            // Chưa có câu hỏi cho chủ đề này trong ngân hàng: Lọc theo kỳ thi nếu có
            if (selectedExamPeriod !== 'all') {
                const matchPeriod = pool.filter(q => q.period === selectedExamPeriod);
                finalFilteredPool = (matchPeriod.length > 0) ? matchPeriod : pool;
            } else {
                finalFilteredPool = pool;
            }
        }
    } else if (selectedExamPeriod !== 'all') {
        // Người dùng chọn "Tất cả bài học" nhưng chọn một kỳ thi cụ thể
        const matchPeriod = pool.filter(q => q.period === selectedExamPeriod);
        finalFilteredPool = (matchPeriod.length > 0) ? matchPeriod : pool;
    }

    let targetCount = 10;
    let durationMins = 15;

    if (selectedExamMode === 'standard') {
        targetCount = 25;
        durationMins = 40;
    } else if (selectedExamMode === 'full') {
        targetCount = 40;
        durationMins = 50;
    }

    const gradeLabelMap = {
        '10': 'Lớp 10',
        '11': 'Lớp 11',
        '12': 'Lớp 12',
        'all': 'Tốt Nghiệp THPT'
    };
    const gradeLabel = gradeLabelMap[grade] || 'Lớp 12';
    const periodLabel = EXAM_PERIODS[selectedExamPeriod] ? EXAM_PERIODS[selectedExamPeriod].name : 'Tổng hợp';
    const topicLabel = (selectedExamTopic === 'all') ? '' : ` • ${selectedExamTopic}`;

    // Xáo trộn & tạo đủ số lượng câu hỏi với bảo toàn chủ đề chính xác
    const questions = generateExamQuestions(finalFilteredPool, targetCount, selectedExamSubject, gradeLabel, selectedExamPeriod, selectedExamTopic);
    setupAndStartExam(`Đề Thi ${gradeLabel} - ${periodLabel} - ${selectedExamSubject}${topicLabel} (${targetCount} câu)`, selectedExamSubject, questions, durationMins, grade, selectedExamPeriod, selectedExamTopic);
}

// Thuật toán nhân bản/xáo trộn để đủ số lượng câu hỏi mà không lỗi
function generateExamQuestions(sourceBank, targetCount, subjectName, defaultGrade, defaultPeriod = 'all', defaultTopic = 'all') {
    let pool = [...sourceBank];
    pool.sort(() => Math.random() - 0.5);

    let result = [];
    let counter = 1;

    while (result.length < targetCount) {
        for (let i = 0; i < pool.length && result.length < targetCount; i++) {
            const original = pool[i];
            const qGrade = original.grade 
                ? (original.grade.toString().startsWith('Lớp') ? original.grade : `Lớp ${original.grade}`) 
                : (defaultGrade || 'Lớp 12');
            
            // Giữ đúng period và topic gốc của từng câu hỏi
            const qPeriod = original.period || (defaultPeriod !== 'all' ? defaultPeriod : 'all');
            const qTopic = original.topic || (defaultTopic !== 'all' ? defaultTopic : 'Tổng hợp bài học');

            result.push({
                id: `q_${counter}`,
                num: counter,
                grade: qGrade,
                period: qPeriod,
                topic: qTopic,
                subject: subjectName,
                content: original.content,
                options: [...original.options],
                correct: original.correct,
                explanation: original.explanation
            });
            counter++;
        }
        pool.sort(() => Math.random() - 0.5);
    }

    return result;
}

// 5. THIẾT LẬP VÀ MỞ PHÒNG THI
function setupAndStartExam(title, subject, questionList, durationMinutes, grade = '12', period = 'all', topic = 'all') {
    if (!questionList || questionList.length === 0) {
        return alert("Chưa có câu hỏi cho bài thi này!");
    }

    // Xóa timer cũ nếu còn
    if (activeExam && activeExam.timerInterval) {
        clearInterval(activeExam.timerInterval);
    }

    activeExam = {
        title: title,
        grade: grade || '12',
        period: period || 'all',
        topic: topic || 'all',
        subject: subject,
        questions: questionList,
        userAnswers: {},
        flagged: {},
        currentIndex: 0,
        timeRemainingSeconds: durationMinutes * 60,
        totalSeconds: durationMinutes * 60,
        startTime: Date.now(),
        timerInterval: null
    };

    // Chuyển màn hình
    document.getElementById('exam-lobby-screen').classList.add('hidden');
    document.getElementById('exam-result-screen').classList.add('hidden');
    document.getElementById('exam-room-screen').classList.remove('hidden');

    // Cập nhật header phòng thi
    const roomTitle = document.getElementById('room-exam-title');
    const roomSub = document.getElementById('room-exam-subtitle');
    if (roomTitle) roomTitle.innerText = title;
    if (roomSub) {
        const pLabel = EXAM_PERIODS[period] ? EXAM_PERIODS[period].short : 'Tổng hợp';
        roomSub.innerText = `Môn: ${subject} • Kỳ: ${pLabel} • ${questionList.length} câu • ${durationMinutes} phút`;
    }

    // Hiển thị tiến độ & câu đầu tiên
    renderQuestionPalette();
    renderActiveQuestion();
    startCountdownTimer();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 6. HIỂN THỊ CÂU HỎI ĐANG LÀM
function renderActiveQuestion() {
    if (!activeExam) return;
    const q = activeExam.questions[activeExam.currentIndex];
    if (!q) return;

    // Cập nhật badge & subject
    const qBadge = document.getElementById('q-index-badge');
    const qGradeBadge = document.getElementById('q-grade-badge');
    const qSubj = document.getElementById('q-subject-badge');
    const qContent = document.getElementById('q-content-text');

    if (qBadge) qBadge.innerText = `Câu ${activeExam.currentIndex + 1} / ${activeExam.questions.length}`;
    if (qSubj) qSubj.innerText = activeExam.subject;
    if (qContent) qContent.innerText = q.content;

    if (qGradeBadge) {
        const gradeText = q.grade || (activeExam.grade === 'all' ? 'Tốt Nghiệp THPT' : `Lớp ${activeExam.grade || '12'}`);
        qGradeBadge.innerText = gradeText;
        if (gradeText.includes('10')) {
            qGradeBadge.className = "bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-md";
        } else if (gradeText.includes('11')) {
            qGradeBadge.className = "bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-md";
        } else if (gradeText.includes('12')) {
            qGradeBadge.className = "bg-rose-50 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-md";
        } else {
            qGradeBadge.className = "bg-purple-50 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-md";
        }
    }

    // Cập nhật huy hiệu kỳ thi
    const qPeriodBadge = document.getElementById('q-period-badge');
    if (qPeriodBadge) {
        const pKey = q.period || activeExam.period || 'all';
        const pInfo = EXAM_PERIODS[pKey] || EXAM_PERIODS['all'];
        qPeriodBadge.innerText = pInfo.short || pInfo.name;
        qPeriodBadge.className = `${pInfo.badgeCls || 'bg-purple-100 text-purple-800'} text-xs font-bold px-2 py-0.5 rounded-md hidden sm:inline-block`;
    }

    // Cập nhật huy hiệu chủ đề / bài học
    const qTopicBadge = document.getElementById('q-topic-badge');
    if (qTopicBadge) {
        const topText = q.topic || (activeExam.topic !== 'all' ? activeExam.topic : 'Tổng hợp bài học');
        qTopicBadge.innerText = topText;
        qTopicBadge.title = topText;
    }

    // Cập nhật nút gắn cờ (Flag)
    const isFlagged = !!activeExam.flagged[activeExam.currentIndex];
    const btnFlag = document.getElementById('btn-flag-q');
    const iconFlag = document.getElementById('icon-flag-q');
    const textFlag = document.getElementById('text-flag-q');

    if (btnFlag && iconFlag && textFlag) {
        if (isFlagged) {
            btnFlag.className = "text-xs font-bold text-amber-600 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-400 bg-amber-50 transition";
            iconFlag.className = "fa-solid fa-flag text-amber-500";
            textFlag.innerText = "Đã đánh dấu xem lại";
        } else {
            btnFlag.className = "text-xs font-bold text-gray-400 hover:text-amber-500 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-amber-400 transition";
            iconFlag.className = "fa-regular fa-flag";
            textFlag.innerText = "Đánh dấu xem lại";
        }
    }

    // Render 4 phương án A, B, C, D
    const optionsContainer = document.getElementById('q-options-container');
    const currentAnswer = activeExam.userAnswers[activeExam.currentIndex];

    if (optionsContainer) {
        optionsContainer.innerHTML = q.options.map(opt => {
            // Tách chữ cái A, B, C, D
            const optLetterMatch = opt.match(/^\s*([A-D])/i);
            const letter = optLetterMatch ? optLetterMatch[1].toUpperCase() : '';
            const isSelected = (currentAnswer === letter);

            const activeClass = isSelected
                ? 'border-2 border-rose-500 bg-rose-50 text-rose-900 shadow-sm font-bold'
                : 'border border-gray-200 bg-white hover:border-gray-300 text-gray-700';

            const radioBadge = isSelected
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-gray-100 text-gray-600 border-gray-300';

            return `
                <div onclick="selectAnswer('${letter}')" class="p-3.5 sm:p-4 rounded-xl cursor-pointer flex items-center gap-3 transition transform active:scale-[0.99] ${activeClass}">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border ${radioBadge}">
                        ${letter}
                    </div>
                    <div class="text-sm sm:text-base leading-relaxed flex-1">
                        ${opt.replace(/^[A-D][\s.:\)-]+/i, '').trim()}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Cập nhật nút điều hướng câu trước - câu sau
    const btnPrev = document.getElementById('btn-prev-q');
    const btnNext = document.getElementById('btn-next-q');
    const navIndicator = document.getElementById('q-nav-indicator');

    if (btnPrev) btnPrev.disabled = (activeExam.currentIndex === 0);
    if (navIndicator) navIndicator.innerText = `${activeExam.currentIndex + 1} / ${activeExam.questions.length}`;

    if (btnNext) {
        if (activeExam.currentIndex === activeExam.questions.length - 1) {
            btnNext.innerHTML = `Hoàn thành <i class="fa-solid fa-check"></i>`;
            btnNext.className = "px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-sm";
        } else {
            btnNext.innerHTML = `Câu tiếp theo <i class="fa-solid fa-arrow-right"></i>`;
            btnNext.className = "px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-sm";
        }
    }

    updateProgressBar();
    renderQuestionPalette();
}

// 7. CHỌN ĐÁP ÁN
function selectAnswer(letter) {
    if (!activeExam) return;
    activeExam.userAnswers[activeExam.currentIndex] = letter;
    renderActiveQuestion();
}

// 8. GẮN CỜ (FLAG)
function toggleFlagCurrentQuestion() {
    if (!activeExam) return;
    const cur = activeExam.currentIndex;
    activeExam.flagged[cur] = !activeExam.flagged[cur];
    renderActiveQuestion();
}

// 9. ĐIỀU HƯỚNG CÂU
function prevQuestion() {
    if (!activeExam || activeExam.currentIndex <= 0) return;
    activeExam.currentIndex--;
    renderActiveQuestion();
}

function nextQuestion() {
    if (!activeExam) return;
    if (activeExam.currentIndex < activeExam.questions.length - 1) {
        activeExam.currentIndex++;
        renderActiveQuestion();
    } else {
        submitExamPrompt();
    }
}

function jumpToQuestion(index) {
    if (!activeExam || index < 0 || index >= activeExam.questions.length) return;
    activeExam.currentIndex = index;
    renderActiveQuestion();
}

// 10. BẢNG SỐ THỨ TỰ CÂU HỎI (PALETTE)
function renderQuestionPalette() {
    if (!activeExam) return;
    const palette = document.getElementById('q-palette-grid');
    if (!palette) return;

    palette.innerHTML = activeExam.questions.map((q, idx) => {
        const isCurrent = (idx === activeExam.currentIndex);
        const hasAnswer = (activeExam.userAnswers[idx] !== undefined);
        const isFlagged = (activeExam.flagged[idx] === true);

        let colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200";
        if (hasAnswer) {
            colorClass = "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600";
        }
        if (isFlagged) {
            colorClass = "bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500";
        }

        const ringClass = isCurrent ? "ring-2 ring-rose-500 ring-offset-2 scale-105 z-10 shadow-sm" : "";

        return `
            <button type="button" onclick="jumpToQuestion(${idx})" class="w-full h-9 rounded-lg flex items-center justify-center font-bold text-xs border transition ${colorClass} ${ringClass}">
                ${idx + 1}
            </button>
        `;
    }).join('');
}

// 11. CẬP NHẬT THANH TIẾN ĐỘ
function updateProgressBar() {
    if (!activeExam) return;
    const total = activeExam.questions.length;
    const answeredCount = Object.keys(activeExam.userAnswers).length;
    const percent = Math.round((answeredCount / total) * 100);

    const answeredEl = document.getElementById('progress-answered-count');
    const totalEl = document.getElementById('progress-total-count');
    const percentEl = document.getElementById('progress-percent-text');
    const fillEl = document.getElementById('progress-bar-fill');

    if (answeredEl) answeredEl.innerText = answeredCount;
    if (totalEl) totalEl.innerText = total;
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
}

// 12. ĐỒNG HỒ ĐẾM NGƯỢC
function startCountdownTimer() {
    if (!activeExam) return;
    const timerText = document.getElementById('room-timer-text');
    const timerContainer = document.getElementById('room-timer-container');

    activeExam.timerInterval = setInterval(() => {
        if (!activeExam) return;
        activeExam.timeRemainingSeconds--;

        if (timerText) {
            timerText.innerText = formatTimeMMSS(activeExam.timeRemainingSeconds);
        }

        // Cảnh báo khi còn dưới 3 phút
        if (activeExam.timeRemainingSeconds <= 180 && timerContainer) {
            timerContainer.className = "bg-gradient-to-r from-red-600 to-rose-700 text-white font-mono font-black text-base sm:text-lg px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 animate-pulse";
        }

        // Hết giờ -> Nộp bài tự động
        if (activeExam.timeRemainingSeconds <= 0) {
            clearInterval(activeExam.timerInterval);
            alert("⏰ ĐÃ HẾT GIỜ LÀM BÀI! Hệ thống sẽ tự động chấm điểm bài làm của bạn.");
            submitExam();
        }
    }, 1000);
}

function formatTimeMMSS(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 13. NỘP BÀI THI
function submitExamPrompt() {
    if (!activeExam) return;
    const total = activeExam.questions.length;
    const answered = Object.keys(activeExam.userAnswers).length;
    const unanswered = total - answered;

    let confirmMsg = "Bạn có chắc chắn muốn nộp bài thi để chấm điểm không?";
    if (unanswered > 0) {
        confirmMsg = `⚠️ Chú ý: Bạn còn ${unanswered} câu chưa trả lời!\nBạn có chắc chắn muốn nộp bài sớm không?`;
    }

    if (confirm(confirmMsg)) {
        submitExam();
    }
}

function confirmExitExam() {
    if (confirm("Bạn có chắc chắn muốn thoát khỏi bài thi này? Kết quả làm bài hiện tại sẽ bị hủy.")) {
        if (activeExam && activeExam.timerInterval) {
            clearInterval(activeExam.timerInterval);
        }
        activeExam = null;
        backToExamLobby();
    }
}

function submitExam() {
    if (!activeExam) return;

    if (activeExam.timerInterval) {
        clearInterval(activeExam.timerInterval);
    }

    const total = activeExam.questions.length;
    let correctCount = 0;
    const mistakesToSave = [];
    const reviewData = [];

    activeExam.questions.forEach((q, idx) => {
        const userChoice = activeExam.userAnswers[idx] || null;
        const isCorrect = (userChoice === q.correct);
        if (isCorrect) correctCount++;

        const gradeText = q.grade || (activeExam.grade === 'all' ? 'Tốt Nghiệp THPT' : `Lớp ${activeExam.grade || '12'}`);
        const periodKey = q.period || activeExam.period || 'all';
        const topicText = q.topic || (activeExam.topic !== 'all' ? activeExam.topic : 'Tổng hợp bài học');

        const reviewItem = {
            num: idx + 1,
            grade: gradeText,
            period: periodKey,
            topic: topicText,
            subject: activeExam.subject,
            content: q.content,
            options: q.options,
            correct: q.correct,
            userChoice: userChoice,
            isCorrect: isCorrect,
            explanation: q.explanation
        };
        reviewData.push(reviewItem);

        if (!isCorrect) {
            mistakesToSave.push({
                id: `mis_${Date.now()}_${idx}`,
                grade: gradeText,
                period: periodKey,
                topic: topicText,
                subject: activeExam.subject,
                content: q.content,
                options: q.options,
                correct: q.correct,
                userChoice: userChoice,
                explanation: q.explanation,
                date: new Date().toLocaleDateString('vi-VN')
            });
        }
    });

    const score = Math.round((correctCount / total) * 10 * 10) / 10;
    const timeSpentSeconds = activeExam.totalSeconds - activeExam.timeRemainingSeconds;
    const timeSpentFormatted = formatTimeMMSS(timeSpentSeconds);

    // Lưu vào Lịch sử thi (school_exam_history)
    const history = JSON.parse(localStorage.getItem('school_exam_history')) || [];
    history.unshift({
        id: Date.now(),
        title: activeExam.title,
        grade: activeExam.grade || '12',
        period: activeExam.period || 'all',
        topic: activeExam.topic || 'all',
        subject: activeExam.subject,
        score: score,
        total: total,
        correctCount: correctCount,
        timeSpent: timeSpentFormatted,
        date: new Date().toLocaleString('vi-VN')
    });
    localStorage.setItem('school_exam_history', JSON.stringify(history.slice(0, 30))); // Giữ 30 lần thi gần nhất

    // Tự động gom câu sai vào Sổ Tay Lỗi Sai (loại bỏ trùng lặp nội dung)
    let mistakes = JSON.parse(localStorage.getItem('school_mistake_notebook')) || [];
    mistakesToSave.forEach(newItem => {
        const existed = mistakes.some(m => m.content.trim() === newItem.content.trim());
        if (!existed) mistakes.unshift(newItem);
    });
    localStorage.setItem('school_mistake_notebook', JSON.stringify(mistakes));

    currentReviewQuestions = reviewData;

    // Chuyển sang màn hình Kết quả
    document.getElementById('exam-room-screen').classList.add('hidden');
    document.getElementById('exam-result-screen').classList.remove('hidden');

    renderExamResultUI(score, correctCount, total, timeSpentFormatted);
    filterReviewQuestions('all');
    updateExamLobbyStats();

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 14. HIỂN THỊ MÀN HÌNH KẾT QUẢ
function renderExamResultUI(score, correctCount, total, timeSpent) {
    const scoreNum = document.getElementById('result-score-number');
    const rankTitle = document.getElementById('result-rank-title');
    const feedbackText = document.getElementById('result-feedback-text');
    const correctEl = document.getElementById('result-correct-count');
    const wrongEl = document.getElementById('result-wrong-count');
    const timeEl = document.getElementById('result-time-taken');

    if (scoreNum) scoreNum.innerText = score.toFixed(1);
    if (correctEl) correctEl.innerText = `${correctCount} câu`;
    if (wrongEl) wrongEl.innerText = `${total - correctCount} câu`;
    if (timeEl) timeEl.innerText = timeSpent;

    let rank = "Khá";
    let fb = "Cần rèn luyện thêm để đạt điểm số cao hơn bạn nhé!";

    if (score >= 9.0) {
        rank = "Xuất Sắc! 🎉";
        fb = "Phong độ thi tuyệt đỉnh! Bạn đã làm chủ hoàn toàn khối kiến thức môn này.";
    } else if (score >= 8.0) {
        rank = "Giỏi! 👏";
        fb = "Kiến thức rất vững vàng! Chỉ cần chú ý thêm một vài chi tiết nhỏ để bứt phá điểm 10.";
    } else if (score >= 6.5) {
        rank = "Khá! 👍";
        fb = "Bạn đã nắm được kiến thức nền tảng. Hãy xem kỹ lời giải các câu sai phía dưới nhé.";
    } else if (score >= 5.0) {
        rank = "Trung Bình ⚡";
        fb = "Cần tăng tốc ôn tập lý thuyết và mở Sổ tay lỗi sai để luyện lại ngay.";
    } else {
        rank = "Cần Cố Gắng Nhiều 📚";
        fb = "Đừng nản lòng! Hãy đọc kỹ lời giải chi tiết và thử sức lại bài thi nhé.";
    }

    if (rankTitle) rankTitle.innerText = rank;
    if (feedbackText) feedbackText.innerText = fb;
}

// 15. BỘ LỌC XEM LẠI LỜI GIẢI CHI TIẾT
function filterReviewQuestions(type) {
    currentReviewFilter = type;
    const btnAll = document.getElementById('rev-filter-all');
    const btnWrong = document.getElementById('rev-filter-wrong');
    const btnCorrect = document.getElementById('rev-filter-correct');

    if (btnAll) btnAll.className = (type === 'all') ? "px-2.5 py-1 rounded bg-white text-gray-800 shadow-2xs font-bold" : "px-2.5 py-1 rounded text-gray-500 hover:bg-white font-bold";
    if (btnWrong) btnWrong.className = (type === 'wrong') ? "px-2.5 py-1 rounded bg-white text-rose-600 shadow-2xs font-bold" : "px-2.5 py-1 rounded text-rose-600 hover:bg-white font-bold";
    if (btnCorrect) btnCorrect.className = (type === 'correct') ? "px-2.5 py-1 rounded bg-white text-emerald-600 shadow-2xs font-bold" : "px-2.5 py-1 rounded text-emerald-600 hover:bg-white font-bold";

    const container = document.getElementById('review-questions-container');
    if (!container) return;

    let filtered = currentReviewQuestions;
    if (type === 'wrong') filtered = currentReviewQuestions.filter(q => !q.isCorrect);
    if (type === 'correct') filtered = currentReviewQuestions.filter(q => q.isCorrect);

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-400 py-6 text-xs italic">Không có câu hỏi nào thuộc bộ lọc này.</p>`;
        return;
    }

    container.innerHTML = filtered.map(item => {
        const statusBadge = item.isCorrect
            ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i> Đúng</span>`
            : `<span class="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full"><i class="fa-solid fa-xmark mr-1"></i> Sai / Chưa làm</span>`;

        return `
            <div class="p-4 rounded-xl border ${item.isCorrect ? 'border-gray-200 bg-white' : 'border-rose-200 bg-rose-50/30'} space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-black text-gray-700">Câu ${item.num}:</span>
                    ${statusBadge}
                </div>

                <p class="text-sm font-bold text-gray-800 leading-relaxed">${item.content}</p>

                <!-- Lựa chọn -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    ${item.options.map(opt => {
                        const optLetter = (opt.match(/^\s*([A-D])/i) || [])[1];
                        let optStyle = "bg-gray-50 border-gray-200 text-gray-700";
                        if (optLetter === item.correct) {
                            optStyle = "bg-emerald-100 border-emerald-400 text-emerald-900 font-black";
                        } else if (optLetter === item.userChoice && !item.isCorrect) {
                            optStyle = "bg-rose-100 border-rose-400 text-rose-900 font-black line-through";
                        }
                        return `
                            <div class="p-2 rounded-lg border text-[11px] sm:text-xs flex items-center justify-between ${optStyle}">
                                <span>${opt}</span>
                                ${optLetter === item.correct ? '<i class="fa-solid fa-circle-check text-emerald-600"></i>' : ''}
                                ${optLetter === item.userChoice && !item.isCorrect ? '<i class="fa-solid fa-circle-xmark text-rose-600"></i>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- Lời giải chi tiết -->
                <div class="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-xs space-y-1">
                    <div class="font-bold text-blue-900 flex items-center gap-1.5">
                        <i class="fa-solid fa-lightbulb text-amber-500"></i> Lời giải chi tiết:
                    </div>
                    <p class="text-gray-700 leading-relaxed text-[11px] sm:text-xs">${item.explanation}</p>
                </div>
            </div>
        `;
    }).join('');
}

// 16. HÀNH ĐỘNG TỪ MÀN HÌNH KẾT QUẢ
function retryCurrentExam() {
    if (!activeExam) return backToExamLobby();
    const questions = [...activeExam.questions];
    setupAndStartExam(activeExam.title, activeExam.subject, questions, Math.round(activeExam.totalSeconds / 60), activeExam.grade, activeExam.period, activeExam.topic);
}

function backToExamLobby() {
    document.getElementById('exam-room-screen').classList.add('hidden');
    document.getElementById('exam-result-screen').classList.add('hidden');
    document.getElementById('exam-lobby-screen').classList.remove('hidden');
    setExamSubTab('practice');
    updateExamLobbyStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveAllMistakesToNotebook() {
    alert("✓ Đã đồng bộ tất cả câu trả lời sai vào Sổ Tay Lỗi Sai của bạn!");
    updateExamLobbyStats();
}

// 17. SỔ TAY LỖI SAI (MISTAKE NOTEBOOK)
function renderMistakesGradeFilterChips() {
    const container = document.getElementById('mistakes-grade-filter-chips');
    if (!container) return;

    const grades = [
        { id: 'all', name: 'Tất cả khối lớp' },
        { id: '10', name: 'Lớp 10' },
        { id: '11', name: 'Lớp 11' },
        { id: '12', name: 'Lớp 12' }
    ];

    container.innerHTML = grades.map(g => {
        const isSelected = (currentMistakeGradeFilter === g.id);
        const cls = isSelected
            ? 'bg-rose-600 text-white shadow-2xs font-black'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold';

        return `
            <button type="button" onclick="filterMistakesByGrade('${g.id}')" class="px-3 py-1 rounded-full whitespace-nowrap transition text-xs ${cls}">
                ${g.name}
            </button>
        `;
    }).join('');
}

function filterMistakesByGrade(grade) {
    currentMistakeGradeFilter = grade;
    renderMistakesGradeFilterChips();
    renderMistakeNotebook();
}

function renderMistakesPeriodFilterChips() {
    const container = document.getElementById('mistakes-period-filter-chips');
    if (!container) return;

    const periods = [
        { id: 'all', name: 'Tất cả kỳ thi' },
        { id: 'mid1', name: 'Giữa Kì 1' },
        { id: 'final1', name: 'Cuối Kì 1' },
        { id: 'mid2', name: 'Giữa Kì 2' },
        { id: 'final2', name: 'Cuối Kì 2' }
    ];

    container.innerHTML = periods.map(p => {
        const isSelected = (currentMistakePeriodFilter === p.id);
        const cls = isSelected
            ? 'bg-blue-600 text-white shadow-2xs font-black'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold';

        return `
            <button type="button" onclick="filterMistakesByPeriod('${p.id}')" class="px-3 py-1 rounded-full whitespace-nowrap transition text-xs ${cls}">
                ${p.name}
            </button>
        `;
    }).join('');
}

function filterMistakesByPeriod(period) {
    currentMistakePeriodFilter = period;
    renderMistakesPeriodFilterChips();
    renderMistakeNotebook();
}

function renderMistakesFilterChips() {
    const container = document.getElementById('mistakes-filter-chips');
    if (!container) return;

    const subjects = ['all', 'Toán', 'Vật Lí', 'Hóa Học', 'Sinh Học', 'Lịch Sử', 'Địa Lí', 'GDKT&PL', 'Tiếng Anh', 'Tin Học', 'Công Nghệ', 'GDQP&AN'];

    container.innerHTML = subjects.map(s => {
        const isSelected = (currentMistakeFilter === s);
        const name = (s === 'all') ? 'Tất cả môn' : s;
        const cls = isSelected
            ? 'bg-amber-500 text-white shadow-2xs font-black'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold';

        return `
            <button type="button" onclick="filterMistakesBySubject('${s}')" class="px-3 py-1 rounded-full whitespace-nowrap transition text-xs ${cls}">
                ${name}
            </button>
        `;
    }).join('');
}

function filterMistakesBySubject(subj) {
    currentMistakeFilter = subj;
    renderMistakesFilterChips();
    renderMistakeNotebook();
}

function renderMistakeNotebook() {
    const list = document.getElementById('mistakes-list-container');
    if (!list) return;

    const mistakes = JSON.parse(localStorage.getItem('school_mistake_notebook')) || [];
    let filtered = mistakes;

    // Lọc theo khối lớp
    if (currentMistakeGradeFilter !== 'all') {
        filtered = filtered.filter(m => {
            const g = (m.grade || '12').toString();
            return g.includes(currentMistakeGradeFilter);
        });
    }

    // Lọc theo kỳ thi
    if (currentMistakePeriodFilter !== 'all') {
        filtered = filtered.filter(m => {
            return (m.period === currentMistakePeriodFilter);
        });
    }

    // Lọc theo môn học
    if (currentMistakeFilter !== 'all') {
        filtered = filtered.filter(m => m.subject === currentMistakeFilter);
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="text-center py-10 space-y-2 text-gray-400">
                <i class="fa-solid fa-award text-4xl text-amber-300"></i>
                <p class="text-xs font-bold">Chưa có câu sai nào trong danh mục này!</p>
                <p class="text-[11px]">Khi làm bài thi, các câu bạn trả lời sai sẽ tự động được lưu vào đây để ôn tập lại.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filtered.map(item => {
        const itemGrade = item.grade || 'Lớp 12';
        let gradeBadgeCls = "bg-rose-100 text-rose-800";
        if (itemGrade.includes('10')) gradeBadgeCls = "bg-emerald-100 text-emerald-800";
        else if (itemGrade.includes('11')) gradeBadgeCls = "bg-blue-100 text-blue-800";
        else if (itemGrade.includes('all') || itemGrade.includes('Nghiệp')) gradeBadgeCls = "bg-purple-100 text-purple-800";

        const pInfo = EXAM_PERIODS[item.period] || (item.period && item.period !== 'all' ? { short: item.period, badgeCls: 'bg-blue-100 text-blue-800' } : null);
        const periodBadge = pInfo ? `<span class="${pInfo.badgeCls || 'bg-blue-100 text-blue-800'} text-[10px] font-black px-2 py-0.5 rounded-md">${pInfo.short || pInfo.name}</span>` : '';
        const topicBadge = (item.topic && item.topic !== 'all' && item.topic !== 'Tổng hợp bài học') ? `<span class="bg-indigo-50 text-indigo-800 text-[10px] font-medium px-2 py-0.5 rounded-md max-w-[180px] truncate">${item.topic}</span>` : '';

        return `
            <div class="p-4 rounded-xl border border-gray-200 bg-white hover:border-amber-300 transition space-y-2.5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="${gradeBadgeCls} text-[10px] font-black px-2 py-0.5 rounded-md">${itemGrade}</span>
                        ${periodBadge}
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md">${item.subject}</span>
                        ${topicBadge}
                        <span class="text-[10px] text-gray-400 font-medium">${item.date || ''}</span>
                    </div>
                    <button type="button" onclick="removeMistake('${item.id}')" class="text-xs text-gray-400 hover:text-red-500 font-bold flex items-center gap-1" title="Đã thuộc / Xóa">
                        <i class="fa-solid fa-check"></i> Đã thuộc
                    </button>
                </div>

                <p class="text-sm font-bold text-gray-800 leading-relaxed">${item.content}</p>

                <div class="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg font-bold">
                    ✓ Đáp án đúng: <span class="font-black">${item.correct}</span>
                </div>

                <div class="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-600">
                    <b class="text-gray-800">Lời giải:</b> ${item.explanation}
                </div>
            </div>
        `;
    }).join('');
}

function removeMistake(id) {
    let mistakes = JSON.parse(localStorage.getItem('school_mistake_notebook')) || [];
    mistakes = mistakes.filter(m => m.id !== id);
    localStorage.setItem('school_mistake_notebook', JSON.stringify(mistakes));
    renderMistakeNotebook();
    updateExamLobbyStats();
}

function clearMistakeNotebook() {
    if (confirm("Bạn có chắc chắn muốn xóa tất cả câu trong Sổ Tay Lỗi Sai không?")) {
        localStorage.removeItem('school_mistake_notebook');
        renderMistakeNotebook();
        updateExamLobbyStats();
    }
}

// Luyện tập chỉ các câu sai trong sổ tay
function practiceMistakes() {
    const mistakes = JSON.parse(localStorage.getItem('school_mistake_notebook')) || [];
    let list = mistakes;

    if (currentMistakeGradeFilter !== 'all') {
        list = list.filter(m => {
            const g = (m.grade || '12').toString();
            return g.includes(currentMistakeGradeFilter);
        });
    }

    if (currentMistakePeriodFilter !== 'all') {
        list = list.filter(m => m.period === currentMistakePeriodFilter);
    }

    if (currentMistakeFilter !== 'all') {
        list = list.filter(m => m.subject === currentMistakeFilter);
    }

    if (list.length === 0) {
        return alert("Sổ tay lỗi sai hiện đang trống trong danh mục đã chọn! Hãy chọn danh mục khác hoặc làm đề thi chuẩn.");
    }

    const questionList = list.map((m, idx) => ({
        id: `mis_practice_${idx}`,
        num: idx + 1,
        grade: m.grade || 'Lớp 12',
        period: m.period || 'all',
        topic: m.topic || 'Tổng hợp',
        subject: m.subject,
        content: m.content,
        options: m.options,
        correct: m.correct,
        explanation: m.explanation
    }));

    const duration = Math.max(10, Math.ceil(questionList.length * 1.5));
    const gradeTitle = currentMistakeGradeFilter === 'all' ? 'Tổng Hợp' : `Lớp ${currentMistakeGradeFilter}`;
    const periodTitle = EXAM_PERIODS[currentMistakePeriodFilter] ? EXAM_PERIODS[currentMistakePeriodFilter].short : 'Tất cả kì';
    const subjTitle = currentMistakeFilter === 'all' ? 'Tất cả môn' : currentMistakeFilter;
    setupAndStartExam(`Luyện Lại Sổ Tay Lỗi Sai - ${gradeTitle} (${periodTitle}) (${questionList.length} câu)`, subjTitle, questionList, duration, currentMistakeGradeFilter, currentMistakePeriodFilter);
}

// 18. DÁN ĐỀ THI NHANH TỪ WEB / WORD (SMART TEXT PARSER CHO KENHHOCTAP.EDU.VN)
let parsedExamData = [];

function loadSampleImportText() {
    const sample = `Câu 1. Cho hàm số y = f(x) có đạo hàm f'(x) = x(x - 1)(x + 2)^3. Số điểm cực trị của hàm số đã cho là
A. 1.
B. 2.
C. 3.
D. 4.
Đáp án: B
Lời giải: Ta thấy đạo hàm f'(x) đổi dấu khi đi qua các nghiệm đơn hoặc bội lẻ x = 0 và x = 1 (nghiệm bội 3 x = -2 cũng đổi dấu, tổng cộng là 3 điểm). Do đó hàm số có 3 điểm cực trị.

Câu 2: Kim loại nào sau đây có tính dẫn điện tốt nhất ở điều kiện thường?
A. Đồng (Cu)
B. Bạc (Ag)
C. Nhôm (Al)
D. Vàng (Au)
Đáp án: B
Lời giải: Tính dẫn điện giảm dần theo thứ tự Ag > Cu > Au > Al. Do đó Bạc dẫn điện tốt nhất.

Câu 3: Đặt điện áp xoay chiều u = U₀cos(ωt) vào hai đầu cuộn cảm thuần có độ tự cảm L. Cảm kháng của cuộn cảm là
A. ZL = ωL.
B. ZL = 1/(ωL).
C. ZL = ω/L.
D. ZL = L/ω.
Đáp án: A
Lời giải: Theo công thức cảm kháng của cuộn dây: ZL = ωL.

Câu 4: Quá trình nhân đôi ADN diễn ra theo nguyên tắc nào sau đây?
A. Nguyên tắc bổ sung và bán bảo toàn.
B. Nguyên tắc bảo tồn và gián đoạn.
C. Chỉ theo nguyên tắc bán bảo toàn.
D. Nguyên tắc khuôn mẫu và song song.
Đáp án: A
Lời giải: ADN nhân đôi theo 2 nguyên tắc then chốt: bổ sung (A-T, G-X) và bán bảo toàn (giữ lại 1 mạch cũ).

Câu 5: Trong ngôn ngữ Python, kết quả xuất ra màn hình của lệnh print(type(3.14)) là
A. <class 'float'>
B. <class 'int'>
C. <class 'str'>
D. <class 'number'>
Đáp án: A
Lời giải: Giá trị 3.14 có phần thập phân nên thuộc kiểu số thực float.`;

    const rawInput = document.getElementById('import-exam-raw');
    const titleInput = document.getElementById('import-exam-title');
    if (rawInput) rawInput.value = sample;
    if (titleInput && !titleInput.value) titleInput.value = "Đề Trắc Nghiệm Mẫu Kênh Học Tập";
    previewParsedExam();
}

function previewParsedExam() {
    const rawInput = document.getElementById('import-exam-raw');
    const rawText = rawInput ? rawInput.value.trim() : '';
    const statusBadge = document.getElementById('parse-status-badge');
    const previewContainer = document.getElementById('parse-preview-container');
    const previewItems = document.getElementById('parse-preview-items');
    const countText = document.getElementById('parse-count-text');

    if (!rawText) {
        if (statusBadge) statusBadge.innerText = "⚠️ Vui lòng dán nội dung đề thi vào ô trên!";
        return;
    }

    parsedExamData = parseExamText(rawText);

    if (parsedExamData.length === 0) {
        if (statusBadge) statusBadge.innerHTML = `<span class="text-rose-500 font-bold">❌ Không tìm thấy câu hỏi trắc nghiệm hợp lệ. Vui lòng kiểm tra lại định dạng (Câu 1. A. B. C. D.)</span>`;
        if (previewContainer) previewContainer.classList.add('hidden');
        return;
    }

    if (statusBadge) statusBadge.innerHTML = `<span class="text-emerald-600 font-bold">✓ Đã bóc tách thành công ${parsedExamData.length} câu trắc nghiệm!</span>`;
    if (countText) countText.innerText = parsedExamData.length;
    if (previewContainer) previewContainer.classList.remove('hidden');

    if (previewItems) {
        previewItems.innerHTML = parsedExamData.map((q, idx) => `
            <div class="p-2.5 rounded-lg bg-white border border-blue-100 text-xs space-y-1">
                <div class="font-bold text-blue-900 flex items-center justify-between">
                    <span>Câu ${idx + 1}: ${q.content.substring(0, 80)}${q.content.length > 80 ? '...' : ''}</span>
                    <span class="text-emerald-700 font-black">Đáp án: ${q.correct}</span>
                </div>
                <div class="text-[11px] text-gray-500 italic">Có ${q.options.length} phương án lựa chọn</div>
            </div>
        `).join('');
    }
}

// Thuật toán Regex bóc tách đề thông minh
function parseExamText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // 1. Kiểm tra bảng đáp án ở cuối văn bản (VD: "BẢNG ĐÁP ÁN: 1.A 2.B..." hoặc "1-A 2-B")
    const answerSheetMap = {};
    const answerSheetRegex = /(?:bảng\s*đáp\s*án|đáp\s*án\s*trắc\s*nghiệm|keys?)\s*[:\n]([\s\S]*)$/i;
    const answerSheetMatch = rawText.match(answerSheetRegex);
    let mainExamText = rawText;

    if (answerSheetMatch) {
        mainExamText = rawText.substring(0, answerSheetMatch.index);
        const sheetContent = answerSheetMatch[1];
        const sheetPairRegex = /(\d+)[\s.:\-\)]+([A-D])/gi;
        let match;
        while ((match = sheetPairRegex.exec(sheetContent)) !== null) {
            answerSheetMap[parseInt(match[1])] = match[2].toUpperCase();
        }
    }

    // 2. Tách theo pattern "Câu 1[:.]" hoặc "Bài 1[:.]" hoặc đầu dòng số "1."
    const questionSplits = mainExamText.split(/(?:^|\n)\s*(?:Câu|Bài|\b)\s*(\d+)[\s.:)]+/i);
    const questions = [];

    if (questionSplits.length > 2) {
        for (let i = 1; i < questionSplits.length; i += 2) {
            const qNum = parseInt(questionSplits[i]);
            const qBody = questionSplits[i + 1] || '';
            const parsedQ = extractSingleQuestion(qBody, qNum, answerSheetMap[qNum]);
            if (parsedQ) questions.push(parsedQ);
        }
    } else {
        // Fallback: nếu không có chữ Câu, tách theo số đầu dòng
        const numSplits = mainExamText.split(/(?:^|\n)\s*(\d+)[\s.:)]+/);
        if (numSplits.length > 2) {
            for (let i = 1; i < numSplits.length; i += 2) {
                const qNum = parseInt(numSplits[i]);
                const qBody = numSplits[i + 1] || '';
                const parsedQ = extractSingleQuestion(qBody, qNum, answerSheetMap[qNum]);
                if (parsedQ) questions.push(parsedQ);
            }
        }
    }

    return questions;
}

function extractSingleQuestion(bodyText, qNum, fallbackAnswer) {
    if (!bodyText.trim()) return null;

    // Tìm đáp án đúng nếu có sẵn trong câu
    let correctAnswer = fallbackAnswer || 'A';
    const ansMatch = bodyText.match(/(?:Đáp\s*án(?:\s*đúng)?|Key|Ans)\s*[:\s\-]*([A-D])/i);
    if (ansMatch) {
        correctAnswer = ansMatch[1].toUpperCase();
    }

    // Tìm lời giải nếu có
    let explanation = `Đáp án chính xác là ${correctAnswer}.`;
    const expMatch = bodyText.match(/(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*giải|Giải\s*thích)\s*[:\s\-]+([\s\S]*)/i);
    if (expMatch) {
        explanation = expMatch[1].trim();
    }

    // Cắt bỏ phần Đáp án/Lời giải trước khi tách option để không bị nhầm
    let optionsText = bodyText;
    const cutPos = bodyText.search(/(?:Đáp\s*án|Key|Ans|Lời\s*giải|Hướng\s*dẫn\s*giải)/i);
    if (cutPos > 0) {
        optionsText = bodyText.substring(0, cutPos);
    }

    // Regex tìm A, B, C, D
    const optRegex = /(?:^|\s|\n)([A-D])[\s.:\)\-]\s*(.*?)(?=(?:^|\s|\n)[A-D][\s.:\)\-]|$)/gi;
    const options = [];
    let optMatch;
    let firstOptIndex = -1;

    while ((optMatch = optRegex.exec(optionsText)) !== null) {
        if (firstOptIndex === -1) firstOptIndex = optMatch.index;
        const letter = optMatch[1].toUpperCase();
        const text = optMatch[2].trim();
        options.push(`${letter}. ${text}`);
    }

    let qContent = firstOptIndex > 0 ? optionsText.substring(0, firstOptIndex).trim() : optionsText.trim();

    if (options.length < 2) return null;

    return {
        id: `custom_${qNum}_${Date.now()}`,
        num: qNum,
        content: qContent || `Câu hỏi trắc nghiệm số ${qNum}`,
        options: options,
        correct: correctAnswer,
        explanation: explanation
    };
}

function saveAndStartImportedExam() {
    if (!parsedExamData || parsedExamData.length === 0) {
        return alert("Vui lòng phân tích đề thi trước!");
    }

    const gradeSelect = document.getElementById('import-exam-grade');
    const periodSelect = document.getElementById('import-exam-period');
    const subSelect = document.getElementById('import-exam-subject');
    const titleInput = document.getElementById('import-exam-title');

    const grade = gradeSelect ? gradeSelect.value : '12';
    const period = periodSelect ? periodSelect.value : 'all';
    const subject = subSelect ? subSelect.value : 'Toán';
    const gradeLabel = grade === 'all' ? 'Tốt Nghiệp THPT' : `Lớp ${grade}`;
    const periodLabel = EXAM_PERIODS[period] ? EXAM_PERIODS[period].short : 'Tổng hợp';
    const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : `Đề thi tự nạp ${gradeLabel} - ${periodLabel} (${parsedExamData.length} câu)`;

    // Đính kèm grade, period vào từng câu hỏi nếu chưa có
    const questionsWithMeta = parsedExamData.map(q => ({
        ...q,
        grade: q.grade || gradeLabel,
        period: q.period || period,
        topic: q.topic || 'Tự nạp từ Web'
    }));

    // Tính thời gian: ~1.5 phút/câu, tối thiểu 10 phút
    const duration = Math.max(10, Math.ceil(parsedExamData.length * 1.5));
    setupAndStartExam(title, subject, questionsWithMeta, duration, grade, period, 'Tự nạp từ Web');
}

// 19. LỊCH SỬ THI
function renderExamHistory() {
    const container = document.getElementById('exam-history-container');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('school_exam_history')) || [];
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400 space-y-1">
                <i class="fa-solid fa-clock-rotate-left text-3xl text-gray-300"></i>
                <p class="text-xs font-bold">Chưa có lịch sử làm bài nào.</p>
                <p class="text-[11px]">Hãy chọn một đề thi và bắt đầu thử sức ngay nhé!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = history.map(item => {
        let scoreColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
        if (item.score < 5.0) scoreColor = "text-red-600 bg-red-50 border-red-200";
        else if (item.score < 8.0) scoreColor = "text-blue-600 bg-blue-50 border-blue-200";

        const itemGrade = item.grade ? (item.grade === 'all' ? 'Tốt Nghiệp THPT' : (item.grade.toString().startsWith('Lớp') ? item.grade : `Lớp ${item.grade}`)) : 'Lớp 12';
        let gradeCls = "bg-rose-100 text-rose-800";
        if (itemGrade.includes('10')) gradeCls = "bg-emerald-100 text-emerald-800";
        else if (itemGrade.includes('11')) gradeCls = "bg-blue-100 text-blue-800";
        else if (itemGrade.includes('Nghiệp') || itemGrade.includes('all')) gradeCls = "bg-purple-100 text-purple-800";

        const pInfo = EXAM_PERIODS[item.period] || (item.period && item.period !== 'all' ? { short: item.period, badgeCls: 'bg-blue-100 text-blue-800' } : null);
        const periodBadge = pInfo ? `<span class="${pInfo.badgeCls || 'bg-blue-100 text-blue-800'} text-[10px] font-black px-2 py-0.5 rounded-md">${pInfo.short || pInfo.name}</span>` : '';

        return `
            <div class="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition flex items-center justify-between gap-3">
                <div class="space-y-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="${gradeCls} text-[10px] font-black px-2 py-0.5 rounded-md">${itemGrade}</span>
                        ${periodBadge}
                        <h4 class="font-bold text-gray-800 text-sm leading-tight">${item.title}</h4>
                    </div>
                    <p class="text-[11px] text-gray-500">
                        Môn: <span class="font-bold text-gray-700">${item.subject}</span> • Đúng: <span class="text-emerald-600 font-bold">${item.correctCount}/${item.total}</span> câu • Làm trong: ${item.timeSpent}
                    </p>
                    <p class="text-[10px] text-gray-400">${item.date}</p>
                </div>
                <div class="px-3 py-1.5 rounded-xl border text-center font-black text-base shrink-0 ${scoreColor}">
                    ${parseFloat(item.score).toFixed(1)}
                    <span class="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Điểm</span>
                </div>
            </div>
        `;
    }).join('');
}

function clearExamHistory() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử thi không?")) {
        localStorage.removeItem('school_exam_history');
        renderExamHistory();
        updateExamLobbyStats();
    }
}

// GÁN CÁC HÀM LÊN WINDOW ĐỂ GỌI TRỰC TIẾP TỪ GIAO DIỆN HTML
window.initExamModule = initExamModule;
window.setExamSubTab = setExamSubTab;
window.selectExamGrade = selectExamGrade;
window.selectExamPeriod = selectExamPeriod;
window.selectExamTopic = selectExamTopic;
window.selectExamTopicByIndex = selectExamTopicByIndex;
window.renderExamTopicChips = renderExamTopicChips;
window.selectExamSubject = selectExamSubject;
window.selectExamMode = selectExamMode;
window.startSelectedExam = startSelectedExam;
window.selectAnswer = selectAnswer;
window.toggleFlagCurrentQuestion = toggleFlagCurrentQuestion;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.jumpToQuestion = jumpToQuestion;
window.submitExamPrompt = submitExamPrompt;
window.confirmExitExam = confirmExitExam;
window.filterReviewQuestions = filterReviewQuestions;
window.saveAllMistakesToNotebook = saveAllMistakesToNotebook;
window.retryCurrentExam = retryCurrentExam;
window.backToExamLobby = backToExamLobby;
window.practiceMistakes = practiceMistakes;
window.clearMistakeNotebook = clearMistakeNotebook;
window.removeMistake = removeMistake;
window.filterMistakesByGrade = filterMistakesByGrade;
window.filterMistakesByPeriod = filterMistakesByPeriod;
window.renderMistakesPeriodFilterChips = renderMistakesPeriodFilterChips;
window.filterMistakesBySubject = filterMistakesBySubject;
window.loadSampleImportText = loadSampleImportText;
window.previewParsedExam = previewParsedExam;
window.saveAndStartImportedExam = saveAndStartImportedExam;
window.clearExamHistory = clearExamHistory;

