const STARTING_POINTS = 100;
const DEFAULT_CLASSES = ['10A1', '10A2', '10A3', '11B1', '11B2', '12C1', '12C2'];

let classes = JSON.parse(localStorage.getItem('thiduaso_classes')) || DEFAULT_CLASSES;
let violations = JSON.parse(localStorage.getItem('thiduaso_violations')) || [];
let students = JSON.parse(localStorage.getItem('thiduaso_students')) || {};
let qaList = JSON.parse(localStorage.getItem('school_qa')) || [];
let notices = JSON.parse(localStorage.getItem('school_notices')) || [];
let resources = JSON.parse(localStorage.getItem('school_resources')) || [];
let polls = JSON.parse(localStorage.getItem('school_polls')) || [];

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
    
    // Tự động dọn dẹp các lớp rác (bị parse nhầm ngày tháng) khỏi bộ nhớ
    const originalLength = classes.length;
    classes = classes.filter(c => !c.includes('/'));
    if (classes.length !== originalLength) {
        localStorage.setItem('thiduaso_classes', JSON.stringify(classes));
    }

    initApp();

    // Thanh tìm kiếm Giáo viên
    document.getElementById('tkb-teacher-search').addEventListener('input', function(e) {
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

    document.getElementById('edit-tkb-class').addEventListener('change', loadEditTkbData);
    document.getElementById('edit-tkb-teacher-input').addEventListener('blur', loadEditTkbData);

    document.getElementById('add-vote-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const question = document.getElementById('vote-question').value.trim();
        const optionsRaw = document.getElementById('vote-options').value;
        const options = optionsRaw.split(',').map(opt => opt.trim()).filter(opt => opt);
        if(question && options.length > 1) {
            polls.push({
                id: Date.now(), question: question, totalVotes: 0,
                options: options.map(opt => ({ text: opt, votes: 0 })),
                timestamp: new Date().toLocaleString('vi-VN')
            });
            localStorage.setItem('school_polls', JSON.stringify(polls));
            this.reset(); renderPolls();
        } else alert("Vui lòng nhập ít nhất 2 lựa chọn (ngăn cách bằng dấu phẩy)!");
    });

    document.getElementById('edit-tkb-form').addEventListener('submit', function(e) {
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

    document.getElementById('violation-form').addEventListener('submit', function(e) {
        e.preventDefault(); 
        const className = document.getElementById('class-select').value;
        const ruleValue = document.getElementById('rule-select').value;
        const note = document.getElementById('note-input').value;
        const studentName = document.getElementById('student-select') ? document.getElementById('student-select').value : '';
        if(!className || !ruleValue) return alert("Vui lòng chọn đầy đủ thông tin!");
        const [ruleName, penaltyStr] = ruleValue.split('|');
        violations.push({ id: Date.now(), class: className, student: studentName, rule: ruleName, penalty: parseInt(penaltyStr), note: note, timestamp: new Date().toLocaleString('vi-VN') });
        localStorage.setItem('thiduaso_violations', JSON.stringify(violations));
        this.reset(); updateStudentSelect(); initApp(); alert(`Đã ghi nhận thành công!`);
    });

    document.getElementById('ask-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const subject = document.getElementById('qa-subject').value;
        const content = document.getElementById('qa-content').value.trim();
        if(subject && content) {
            qaList.push({ id: Date.now(), subject: subject, question: content, answer: null, timestamp: new Date().toLocaleString('vi-VN') });
            localStorage.setItem('school_qa', JSON.stringify(qaList));
            this.reset(); renderQA(); alert("Đã gửi câu hỏi ẩn danh thành công!");
        }
    });

    document.getElementById('add-notice-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const content = document.getElementById('notice-input').value.trim();
        if(content) { notices.push({ id: Date.now(), text: content, timestamp: new Date().toLocaleString('vi-VN') }); localStorage.setItem('school_notices', JSON.stringify(notices)); this.reset(); renderNotices(); }
    });

    document.getElementById('add-resource-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const subject = document.getElementById('res-subject').value; const targetClass = document.getElementById('res-class').value;
        const title = document.getElementById('res-title').value.trim(); const url = document.getElementById('res-url').value.trim();
        if(subject && title && url && targetClass) {
            resources.push({ id: Date.now(), subject, targetClass, title, url, timestamp: new Date().toLocaleString('vi-VN') });
            localStorage.setItem('school_resources', JSON.stringify(resources));
            this.reset(); document.getElementById('res-class').value = 'ALL'; renderResources();
        }
    });

    document.getElementById('add-class-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const newClass = document.getElementById('new-class-input').value.trim().toUpperCase();
        if(newClass && !classes.includes(newClass)) { classes.push(newClass); classes.sort(); localStorage.setItem('thiduaso_classes', JSON.stringify(classes)); students[newClass] = []; localStorage.setItem('thiduaso_students', JSON.stringify(students)); document.getElementById('new-class-input').value = ''; initApp(); }
    });

    document.getElementById('add-student-form').addEventListener('submit', function(e) {
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
});

function initApp() {
    populateClassSelect(); renderLeaderboard(); renderHistory(); renderQA();
    renderNotices(); renderResources(); renderSettings(); renderStats(); renderPolls();
    switchTab('home');
}

function switchTab(tabName) {
    const tabs = ['home', 'leaderboard', 'grade', 'qa', 'settings', 'notice', 'resource', 'vote', 'timetable'];
    const backBtn = document.getElementById('btn-back'); const spacer = document.getElementById('header-spacer');
    if(tabName === 'home') { backBtn.classList.add('hidden'); spacer.classList.add('hidden'); } else { backBtn.classList.remove('hidden'); spacer.classList.remove('hidden'); }
    tabs.forEach(tab => { const view = document.getElementById(`view-${tab}`); if(tab === tabName) view.classList.remove('hidden'); else view.classList.add('hidden'); });
    if(tabName === 'timetable') { setTkbTab(currentTkbTab); }
}

function populateClassSelect() {
    const selectForm = document.getElementById('class-select'); const selectFilter = document.getElementById('filter-class');
    const selectManage = document.getElementById('manage-class-select'); const selectResClass = document.getElementById('res-class');
    const filterResClass = document.getElementById('filter-resource-class');
    const currentManage = selectManage.value; const currentFilterRes = filterResClass.value;
    selectForm.innerHTML = '<option value="">-- Chọn lớp --</option>'; selectFilter.innerHTML = '<option value="">Tất cả các lớp</option>';
    selectManage.innerHTML = '<option value="">-- Chọn lớp quản lý --</option>'; selectResClass.innerHTML = '<option value="ALL">Gửi Toàn trường</option>'; filterResClass.innerHTML = '<option value="">Tất cả tài liệu</option>';
    classes.forEach(c => {
        selectForm.innerHTML += `<option value="${c}">Lớp ${c}</option>`; selectFilter.innerHTML += `<option value="${c}">Lớp ${c}</option>`;
        selectManage.innerHTML += `<option value="${c}" ${c === currentManage ? 'selected' : ''}>Lớp ${c}</option>`;
        selectResClass.innerHTML += `<option value="${c}">Gửi riêng Lớp ${c}</option>`; filterResClass.innerHTML += `<option value="${c}" ${c === currentFilterRes ? 'selected' : ''}>Tài liệu Lớp ${c}</option>`;
    });
    renderStudents();
}

function setTkbTab(tabType) {
    currentTkbTab = tabType;
    ['main', 'prep', 'teacher'].forEach(t => {
        const btn = document.getElementById(`tab-tkb-${t}`);
        if(t === tabType) btn.className = "px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold whitespace-nowrap shadow-sm transition";
        else btn.className = "px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-bold whitespace-nowrap hover:bg-gray-300 transition";
    });
    
    const label = document.getElementById('tkb-select-label'); 
    const select = document.getElementById('tkb-target-select');
    const searchInput = document.getElementById('tkb-teacher-search');
    
    select.innerHTML = '<option value="">-- Chọn --</option>';
    searchInput.value = '';
    
    if(tabType === 'main') { 
        label.innerText = 'Lớp chính:'; 
        searchInput.classList.add('hidden');
        classes.forEach(c => select.innerHTML += `<option value="${c}">Lớp ${c}</option>`); 
    }
    else if (tabType === 'prep') { 
        label.innerText = 'Lớp 12:'; 
        searchInput.classList.add('hidden');
        const class12 = classes.filter(c => c.startsWith('12')); 
        class12.forEach(c => select.innerHTML += `<option value="${c}">Lớp ${c} (Ôn)</option>`); 
        if(class12.length === 0) select.innerHTML = '<option value="">Không có dữ liệu</option>'; 
    }
    else if (tabType === 'teacher') { 
        label.innerText = 'Giáo viên:'; 
        searchInput.classList.remove('hidden');
        const teacherList = Object.keys(timetables.teacher).sort(); 
        teacherList.forEach(t => select.innerHTML += `<option value="${t}">Thầy/Cô ${t}</option>`); 
        if(teacherList.length === 0) select.innerHTML = '<option value="">Chưa có dữ liệu GV</option>'; 
    }
    renderTimetable();
}

function handleEditTkbTypeChange() {
    const type = document.getElementById('edit-tkb-type').value;
    const selectClass = document.getElementById('edit-tkb-class'); const inputTeacher = document.getElementById('edit-tkb-teacher-input');
    if(type === 'main' || type === 'prep') {
        selectClass.classList.remove('hidden'); inputTeacher.classList.add('hidden'); inputTeacher.removeAttribute('required');
        selectClass.innerHTML = ''; const targetClasses = type === 'main' ? classes : classes.filter(c => c.startsWith('12'));
        targetClasses.forEach(c => selectClass.innerHTML += `<option value="${c}">Lớp ${c}</option>`);
        setTimeout(loadEditTkbData, 50);
    } else { selectClass.classList.add('hidden'); inputTeacher.classList.remove('hidden'); inputTeacher.setAttribute('required', 'true'); setTimeout(loadEditTkbData, 50); }
}

function loadEditTkbData() {
    const type = document.getElementById('edit-tkb-type').value;
    const target = type === 'teacher' ? document.getElementById('edit-tkb-teacher-input').value.trim() : document.getElementById('edit-tkb-class').value;
    if(target && timetables[type][target]) { ['t2', 't3', 't4', 't5', 't6', 't7'].forEach(day => { document.getElementById(`tkb-${day}`).value = timetables[type][target][day] || ''; });
    } else { ['t2', 't3', 't4', 't5', 't6', 't7'].forEach(day => { document.getElementById(`tkb-${day}`).value = ''; }); }
}

function toggleEditTkb() {
    const section = document.getElementById('tkb-edit-section'); section.classList.toggle('hidden');
    if(!section.classList.contains('hidden')) { document.getElementById('edit-tkb-type').value = currentTkbTab; handleEditTkbTypeChange(); }
}

function renderTimetable() {
    const target = document.getElementById('tkb-target-select').value; const display = document.getElementById('tkb-display');
    if(!target) return display.innerHTML = `<p class="text-center text-gray-500 text-sm">Vui lòng chọn thông tin phía trên.</p>`;
    const tkb = timetables[currentTkbTab][target];
    if(!tkb) return display.innerHTML = `<p class="text-center text-gray-500 text-sm italic py-4 bg-gray-50 rounded-lg border border-dashed">Chưa có dữ liệu Thời khóa biểu.<br>Hãy nhấn nút "Thêm / Chỉnh sửa" bên dưới.</p>`;
    const currentDayOfWeek = new Date().getDay(); 
    let html = '<div class="space-y-3">';
    const days = [ { key: 't2', name: 'Thứ 2', idx: 1 }, { key: 't3', name: 'Thứ 3', idx: 2 }, { key: 't4', name: 'Thứ 4', idx: 3 }, { key: 't5', name: 'Thứ 5', idx: 4 }, { key: 't6', name: 'Thứ 6', idx: 5 }, { key: 't7', name: 'Thứ 7', idx: 6 } ];
    days.forEach(d => {
        const isToday = currentDayOfWeek === d.idx;
        const bgClass = isToday ? 'bg-blue-50 border-blue-400 border-2 shadow-md' : 'bg-gray-50 border-gray-200 border';
        const titleColor = isToday ? 'text-blue-700 font-black' : 'text-gray-700 font-bold';
        let subjectsHtml = '';
        if(tkb[d.key] && tkb[d.key].trim() !== '') {
            const subjects = tkb[d.key].split(',').map(s => s.trim()).filter(s => s);
            subjects.forEach(subj => { subjectsHtml += `<span class="bg-white px-3 py-1 rounded-md text-sm font-medium text-gray-700 shadow-sm border border-gray-200">${subj}</span>`; });
        } else subjectsHtml = '<span class="text-xs text-gray-400 italic">Trống</span>';
        html += `<div class="${bgClass} p-3 rounded-xl transition-all duration-300"><div class="${titleColor} text-sm mb-2">${d.name} ${isToday ? '<span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded ml-2 animate-pulse">HÔM NAY</span>' : ''}</div><div class="flex flex-wrap gap-2">${subjectsHtml}</div></div>`;
    });
    html += '</div>'; display.innerHTML = html;
}

function importExcel() {
    const fileInput = document.getElementById('excel-file-input');
    const file = fileInput.files[0];
    if(!file) return alert("Vui lòng chọn file Excel trước!");

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        let countMain = 0; let countPrep = 0; let countTeacher = 0;
        let rawTkbMain = {}; let rawTkbPrep = {}; let rawTkbTeacher = {};

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            let normalizedSheetName = sheetName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            let targetType = null; 
            
            if(normalizedSheetName.includes('SANG') || normalizedSheetName.includes('TKBLOP') && !normalizedSheetName.includes('GIAOVIEN')) targetType = 'main';
            else if(normalizedSheetName.includes('CHIEU') || normalizedSheetName.includes('2B')) targetType = 'prep';
            else if(normalizedSheetName.includes('GIAOVIEN') || normalizedSheetName.includes('GIAO VIEN') || normalizedSheetName.includes('GV')) targetType = 'teacher';
            else return;

            if (targetType === 'main' || targetType === 'prep') {
                let targetRaw = targetType === 'main' ? rawTkbMain : rawTkbPrep;
                let headerRowIndex = -1;
                for(let i=0; i<rows.length; i++) {
                    if(rows[i] && rows[i].length > 2) {
                        let c0 = rows[i][0] ? rows[i][0].toString().toLowerCase().trim() : '';
                        let c1 = rows[i][1] ? rows[i][1].toString().toLowerCase().trim() : '';
                        
                        // Siết chặt việc nhận diện tiêu đề Lớp: Bắt buộc Cột A là "ngày" và Cột B có chữ "tiết"
                        if(c0.includes('ngày') && c1.includes('tiết')) {
                            headerRowIndex = i; break;
                        }
                    }
                }
                
                if(headerRowIndex === -1) return; // Bỏ qua nếu không tìm thấy dòng Tiêu đề chuẩn

                const headers = rows[headerRowIndex];
                for(let col = 2; col < headers.length; col++) {
                    let className = headers[col];
                    // Loại bỏ bất kỳ Lớp nào bị parse nhầm thành ngày tháng (có chứa dấu /)
                    if(className && className.toString().trim() !== '' && !className.toString().includes('/')) {
                        targetRaw[className.toString().trim()] = { t2:[], t3:[], t4:[], t5:[], t6:[], t7:[] };
                    }
                }
                let currentDayKey = '';
                for(let i = headerRowIndex + 1; i < rows.length; i++) {
                    let row = rows[i];
                    if(!row || row.length === 0) continue;
                    let dayCell = row[0];
                    if(dayCell && typeof dayCell === 'string') {
                        let d = dayCell.toLowerCase();
                        if(d.includes('2')) currentDayKey = 't2'; else if(d.includes('3')) currentDayKey = 't3'; else if(d.includes('4')) currentDayKey = 't4'; else if(d.includes('5')) currentDayKey = 't5'; else if(d.includes('6')) currentDayKey = 't6'; else if(d.includes('7')) currentDayKey = 't7';
                    }
                    if(!currentDayKey) continue;
                    for(let col = 2; col < headers.length; col++) {
                        let className = headers[col];
                        if(!className || !className.toString().trim() || className.toString().includes('/')) continue;
                        className = className.toString().trim();
                        if(targetRaw[className]) {
                            let subject = row[col];
                            if(subject) { subject = subject.toString().replace(/\r?\n|\r/g, " ").trim(); targetRaw[className][currentDayKey].push(subject); }
                        }
                    }
                }
            } 
            else if (targetType === 'teacher') {
                let currentTeacher = null;
                let dayColMap = {};
                let isInsideGrid = false;
                let gridRowsParsed = 0;
                let currentSession = 'Sáng';
                
                for(let i=0; i<rows.length; i++) {
                    let row = rows[i] || [];
                    let rowStr = row.join(' ').toLowerCase();

                    if (isInsideGrid && currentTeacher) {
                        if (gridRowsParsed < 5) {
                            let periodNum = gridRowsParsed + 1; 
                            if (row.length > 0) { 
                                for (let col in dayColMap) {
                                    let dayKey = dayColMap[col];
                                    let cellValue = row[col];
                                    if(cellValue && cellValue.toString().trim()) {
                                        let subject = cellValue.toString().replace(/\r?\n|\r/g, " ").trim();
                                        let fullText = `${subject} - Tiết ${periodNum} ${currentSession}`;
                                        rawTkbTeacher[currentTeacher][dayKey].push(fullText);
                                    }
                                }
                            }
                            gridRowsParsed++;
                            if (gridRowsParsed >= 5) { isInsideGrid = false; }
                        }
                        continue; 
                    }

                    if (row.length === 0) continue; 

                    if (rowStr.includes('giáo viên')) {
                        let tempTeacher = null;
                        let combinedCell = row.find(c => c && c.toString().toLowerCase().includes('giáo viên') && c.toString().length > 11);
                        if (combinedCell) { let parts = combinedCell.toString().split(/giáo viên:?/i); if(parts.length > 1 && parts[1].trim()) tempTeacher = parts[1].trim(); }
                        if (!tempTeacher) {
                            let gvIdx = row.findIndex(c => c && c.toString().toLowerCase().includes('giáo viên'));
                            if (gvIdx !== -1) { for (let k = gvIdx + 1; k < row.length; k++) { if (row[k] && row[k].toString().trim()) { tempTeacher = row[k].toString().trim(); break; } } }
                        }
                        if (tempTeacher) { currentTeacher = tempTeacher; if(!rawTkbTeacher[currentTeacher]) rawTkbTeacher[currentTeacher] = { t2:[], t3:[], t4:[], t5:[], t6:[], t7:[] }; isInsideGrid = false; currentSession = 'Sáng'; continue; }
                    }

                    if(rowStr.includes('buổi sáng')) { currentSession = 'Sáng'; continue; }
                    if(rowStr.includes('buổi chiều')) { currentSession = 'Chiều'; continue; }
                    if(rowStr.includes('có tác dụng')) { isInsideGrid = false; continue; }

                    if(rowStr.includes('thứ 2') && rowStr.includes('thứ 3')) {
                        dayColMap = {};
                        for(let col=0; col<row.length; col++) {
                            let val = row[col];
                            if(val && typeof val === 'string') {
                                let d = val.toLowerCase();
                                if(d.includes('2')) dayColMap[col] = 't2'; else if(d.includes('3')) dayColMap[col] = 't3'; else if(d.includes('4')) dayColMap[col] = 't4'; else if(d.includes('5')) dayColMap[col] = 't5'; else if(d.includes('6')) dayColMap[col] = 't6'; else if(d.includes('7')) dayColMap[col] = 't7';
                            }
                        }
                        isInsideGrid = true; gridRowsParsed = 0; continue;
                    }
                }
            }
        });

        const formatTkbObj = (rawObj) => { return { t2: rawObj.t2.join(", "), t3: rawObj.t3.join(", "), t4: rawObj.t4.join(", "), t5: rawObj.t5.join(", "), t6: rawObj.t6.join(", "), t7: rawObj.t7.join(", ") }; };

        for (let name in rawTkbMain) { timetables.main[name] = formatTkbObj(rawTkbMain[name]); if(!classes.includes(name)) { classes.push(name); students[name] = []; } countMain++; }
        for (let name in rawTkbPrep) { timetables.prep[name] = formatTkbObj(rawTkbPrep[name]); if(!classes.includes(name)) { classes.push(name); students[name] = []; } countPrep++; }
        for (let name in rawTkbTeacher) { timetables.teacher[name] = formatTkbObj(rawTkbTeacher[name]); countTeacher++; }

        if (countMain === 0 && countPrep === 0 && countTeacher === 0) { return alert("❌ Lỗi: Không quét được Sheet nào hợp lệ. Đảm bảo file gốc của bạn không bị đổi định dạng."); }

        classes.sort(); localStorage.setItem('thiduaso_classes', JSON.stringify(classes)); localStorage.setItem('thiduaso_students', JSON.stringify(students));
        localStorage.setItem('school_tkb_main', JSON.stringify(timetables.main)); localStorage.setItem('school_tkb_prep', JSON.stringify(timetables.prep)); localStorage.setItem('school_tkb_teacher', JSON.stringify(timetables.teacher));
        
        let msg = "✅ ĐÃ TẢI THÀNH CÔNG TOÀN BỘ FILE!\n\n";
        if(countMain > 0) msg += `- TKB Sáng: ${countMain} lớp\n`; if(countPrep > 0) msg += `- TKB Chiều (Ôn thi): ${countPrep} lớp\n`; if(countTeacher > 0) msg += `- TKB Giáo viên: ${countTeacher} giáo viên\n`;
        alert(msg); fileInput.value = ''; document.getElementById('tkb-edit-section').classList.add('hidden'); initApp();
        if(countTeacher > 0) setTkbTab('teacher'); else if (countMain > 0) setTkbTab('main');
    };
    reader.readAsArrayBuffer(file);
}

// CÁC HÀM PHỤ TRỢ
function renderPolls() { const container = document.getElementById('vote-list'); container.innerHTML = ''; if(polls.length === 0) return container.innerHTML = '<p class="text-center text-gray-500 text-sm">Chưa có bình chọn nào.</p>'; const sorted = [...polls].sort((a,b) => b.id - a.id); sorted.forEach(poll => { let optionsHtml = ''; poll.options.forEach((opt, index) => { const percent = poll.totalVotes === 0 ? 0 : Math.round((opt.votes / poll.totalVotes) * 100); optionsHtml += `<div class="mb-2 relative cursor-pointer" onclick="castVote(${poll.id}, ${index})"><div class="w-full text-left bg-gray-50 hover:bg-pink-50 border border-gray-200 p-3 rounded-lg flex justify-between items-center relative z-10 transition"><span class="font-medium text-gray-700">${opt.text}</span><span class="text-xs font-bold text-pink-600">${percent}% (${opt.votes})</span></div><div class="absolute top-0 left-0 h-full bg-pink-100 rounded-lg transition-all duration-500" style="width: ${percent}%; z-index: 0;"></div></div>`; }); container.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200"><h3 class="font-bold text-gray-800 text-lg mb-1">${poll.question}</h3><p class="text-[10px] text-gray-400 mb-4"><i class="fa-regular fa-clock"></i> ${poll.timestamp} • ${poll.totalVotes} lượt bình chọn</p><div>${optionsHtml}</div><div class="text-right mt-3"><button onclick="deletePoll(${poll.id})" class="text-gray-400 hover:text-red-500 text-sm transition"><i class="fa-solid fa-trash"></i></button></div></div>`; }); }
function castVote(pollId, optionIndex) { const pollIndex = polls.findIndex(p => p.id === pollId); if(pollIndex !== -1) { polls[pollIndex].options[optionIndex].votes++; polls[pollIndex].totalVotes++; localStorage.setItem('school_polls', JSON.stringify(polls)); renderPolls(); } }
function deletePoll(id) { if(confirm("Xóa cuộc bình chọn này?")) { polls = polls.filter(p => p.id !== id); localStorage.setItem('school_polls', JSON.stringify(polls)); renderPolls(); } }
function updateStudentSelect() { const className = document.getElementById('class-select').value; const container = document.getElementById('student-select-container'); const select = document.getElementById('student-select'); if(!className || !students[className] || students[className].length === 0) { container.classList.add('hidden'); select.innerHTML = ''; return; } container.classList.remove('hidden'); select.innerHTML = '<option value="">-- Cả lớp (Không chọn cá nhân) --</option>'; students[className].sort().forEach(s => { select.innerHTML += `<option value="${s}">${s}</option>`; }); }
function renderLeaderboard() { const container = document.getElementById('leaderboard-container'); container.innerHTML = ''; let leaderboard = classes.map(className => { let currentPoints = STARTING_POINTS; let classViolations = violations.filter(v => v.class === className); classViolations.forEach(v => { currentPoints += v.penalty; }); return { name: className, points: currentPoints, count: classViolations.length }; }); leaderboard.sort((a, b) => b.points - a.points); leaderboard.forEach((cls, index) => { let rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `<span class="text-gray-400 font-bold ml-1">${index + 1}</span>`; let pointColor = cls.points < 90 ? 'text-red-500' : 'text-green-500'; container.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transform transition hover:scale-[1.02]"><div class="flex items-center"><div class="w-10 text-2xl text-center mr-3">${rankIcon}</div><div><h3 class="font-bold text-lg text-gray-800">Lớp ${cls.name}</h3><p class="text-xs text-gray-500">${cls.count} lượt đánh giá</p></div></div><div class="text-right"><span class="text-3xl font-black ${pointColor}">${cls.points}</span><span class="text-[10px] uppercase font-bold text-gray-400 block -mt-1">Điểm</span></div></div>`; }); }
function renderHistory() { const container = document.getElementById('history-container'); const filterClass = document.getElementById('filter-class').value; container.innerHTML = ''; const sorted = [...violations].sort((a,b) => b.id - a.id); const filtered = filterClass ? sorted.filter(v => v.class === filterClass) : sorted; if(filtered.length === 0) return container.innerHTML = '<p class="text-gray-500 text-center text-sm mt-5">Chưa có dữ liệu.</p>'; filtered.forEach(v => { const isBonus = v.penalty > 0; const color = isBonus ? 'text-green-600' : 'text-red-600'; const sign = isBonus ? '+' : ''; const icon = isBonus ? 'fa-star' : 'fa-triangle-exclamation'; const studentText = v.student ? `<span class="text-blue-600 ml-1 font-bold">(${v.student})</span>` : ''; container.innerHTML += `<div class="bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full ${isBonus ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center ${color} shrink-0 text-sm"><i class="fa-solid ${icon}"></i></div><div><p class="font-bold text-gray-800 text-sm">Lớp ${v.class} ${studentText}</p><p class="text-[11px] text-gray-700">${v.rule} ${v.note ? `- <i>${v.note}</i>` : ''}</p></div></div><div class="flex items-center gap-2 shrink-0"><span class="font-bold ${color}">${sign}${v.penalty}</span><button onclick="deleteViolation(${v.id})" class="text-gray-400 hover:text-red-500 px-2"><i class="fa-solid fa-trash-can"></i></button></div></div>`; }); }
function deleteViolation(id) { if(confirm("Xóa bản ghi này?")) { violations = violations.filter(v => v.id !== id); localStorage.setItem('thiduaso_violations', JSON.stringify(violations)); initApp(); } }
function renderNotices() { const container = document.getElementById('notice-list'); container.innerHTML = ''; if(notices.length === 0) return container.innerHTML = '<p class="text-center text-gray-500 text-sm">Chưa có thông báo nào.</p>'; const sorted = [...notices].sort((a, b) => b.id - a.id); sorted.forEach(n => { container.innerHTML += `<div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm"><p class="text-gray-800 whitespace-pre-wrap">${n.text}</p><div class="mt-2 text-[10px] text-gray-500 flex justify-between items-center"><span><i class="fa-regular fa-clock"></i> ${n.timestamp}</span><button onclick="deleteNotice(${n.id})" class="hover:text-red-500"><i class="fa-solid fa-trash"></i></button></div></div>`; }); }
function deleteNotice(id) { if(confirm("Xóa thông báo này?")) { notices = notices.filter(n => n.id !== id); localStorage.setItem('school_notices', JSON.stringify(notices)); renderNotices(); } }
function renderResources() { const container = document.getElementById('resource-list'); const filterClass = document.getElementById('filter-resource-class').value; container.innerHTML = ''; if(resources.length === 0) return container.innerHTML = '<p class="text-center text-gray-500 text-sm">Chưa có tài liệu nào.</p>'; const sorted = [...resources].sort((a, b) => b.id - a.id); const filtered = filterClass ? sorted.filter(r => r.targetClass === 'ALL' || r.targetClass === filterClass) : sorted; if(filtered.length === 0) return container.innerHTML = '<p class="text-center text-gray-500 text-sm">Không có tài liệu nào cho lớp này.</p>'; filtered.forEach(r => { const targetText = r.targetClass && r.targetClass !== 'ALL' ? `<span class="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold ml-2">Riêng: ${r.targetClass}</span>` : `<span class="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold ml-2">Toàn trường</span>`; container.innerHTML += `<div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold shrink-0">${r.subject.substring(0,2)}</div><div><h4 class="font-bold text-gray-800 text-sm">${r.title}</h4><p class="text-[10px] text-gray-500 mt-1">${r.timestamp} ${targetText}</p></div></div><div class="flex gap-2"><a href="${r.url}" target="_blank" class="bg-blue-100 text-blue-600 w-8 h-8 rounded flex items-center justify-center hover:bg-blue-200 transition"><i class="fa-solid fa-download"></i></a><button onclick="deleteResource(${r.id})" class="bg-gray-100 text-gray-400 w-8 h-8 rounded flex items-center justify-center hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button></div></div>`; }); }
function deleteResource(id) { if(confirm("Xóa tài liệu này?")) { resources = resources.filter(r => r.id !== id); localStorage.setItem('school_resources', JSON.stringify(resources)); renderResources(); } }
function renderQA() { const container = document.getElementById('qa-list'); const filterSubject = document.getElementById('filter-qa-subject').value; container.innerHTML = ''; if(qaList.length === 0) return container.innerHTML = '<p class="text-gray-500 text-center text-sm mt-5">Chưa có câu hỏi nào.</p>'; const sortedQA = [...qaList].sort((a, b) => b.id - a.id); const filteredQA = filterSubject ? sortedQA.filter(qa => qa.subject === filterSubject) : sortedQA; if(filteredQA.length === 0) return container.innerHTML = '<p class="text-gray-500 text-center text-sm mt-5">Chưa có câu hỏi nào cho môn này.</p>'; filteredQA.forEach(qa => { const hasAnswer = !!qa.answer; const statusBadge = hasAnswer ? `<span class="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold">Đã giải đáp</span>` : `<span class="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-1 rounded-full font-bold">Đang chờ</span>`; const answerSection = hasAnswer ? `<div class="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100"><p class="text-xs font-bold text-blue-800 mb-1"><i class="fa-solid fa-graduation-cap"></i> Giáo viên:</p><p class="text-sm text-gray-800 leading-relaxed">${qa.answer}</p></div>` : `<div class="mt-3 flex gap-2"><input type="text" id="reply-input-${qa.id}" placeholder="Nhập câu trả lời..." class="flex-1 text-sm border p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"><button onclick="submitAnswer(${qa.id})" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1 rounded-lg text-sm font-bold transition"><i class="fa-solid fa-reply"></i></button></div>`; container.innerHTML += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200"><div class="flex justify-between items-start mb-2"><span class="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">Môn ${qa.subject}</span>${statusBadge}</div><p class="text-gray-800 text-sm font-medium mb-1">"${qa.question}"</p><p class="text-[10px] text-gray-400 mb-2">${qa.timestamp}</p>${answerSection}</div>`; }); }
function submitAnswer(id) { const input = document.getElementById(`reply-input-${id}`); const answer = input.value.trim(); if(answer) { const qIndex = qaList.findIndex(q => q.id === id); if(qIndex !== -1) { qaList[qIndex].answer = answer; localStorage.setItem('school_qa', JSON.stringify(qaList)); renderQA(); } } }
function renderSettings() { const list = document.getElementById('classes-list'); list.innerHTML = ''; classes.forEach(c => { list.innerHTML += `<div class="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2 text-sm border border-gray-200"><span class="font-bold text-gray-700">${c}</span><button onclick="removeClass('${c}')" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button></div>`; }); }
function removeClass(className) { if(confirm(`Xóa lớp ${className}?`)) { classes = classes.filter(c => c !== className); localStorage.setItem('thiduaso_classes', JSON.stringify(classes)); initApp(); } }
function renderStudents() { const className = document.getElementById('manage-class-select').value; const form = document.getElementById('add-student-form'); const list = document.getElementById('students-list'); list.innerHTML = ''; if(!className) return form.classList.add('hidden'); form.classList.remove('hidden'); if(!students[className] || students[className].length === 0) return list.innerHTML = '<p class="text-gray-500 text-sm italic">Lớp này chưa có học sinh nào.</p>'; students[className].sort().forEach(s => { list.innerHTML += `<div class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100"><span class="text-sm font-medium text-gray-700"><i class="fa-solid fa-user text-gray-400 mr-2"></i> ${s}</span><button onclick="removeStudent('${className}', '${s}')" class="text-gray-400 hover:text-red-500 px-2"><i class="fa-solid fa-trash-can"></i></button></div>`; }); }
function removeStudent(className, studentName) { if(confirm(`Xóa học sinh ${studentName}?`)) { students[className] = students[className].filter(s => s !== studentName); localStorage.setItem('thiduaso_students', JSON.stringify(students)); renderStudents(); updateStudentSelect(); } }
function renderStats() { const container = document.getElementById('stats-container'); const counts = {}; let totalNegative = 0; violations.forEach(v => { if(v.penalty < 0) { counts[v.rule] = (counts[v.rule] || 0) + 1; totalNegative++; } }); if (totalNegative === 0) return container.classList.add('hidden'); let maxRule = ''; let maxCount = 0; for(let rule in counts) { if(counts[rule] > maxCount) { maxCount = counts[rule]; maxRule = rule; } } const percent = Math.round((maxCount / totalNegative) * 100); container.classList.remove('hidden'); container.innerHTML = `<strong>📈 Thống kê:</strong> Lỗi vi phạm nhiều nhất tuần này là <strong>"${maxRule}"</strong> (chiếm ${percent}%).`; }
function resetData() { if(confirm("⚠️ Xóa toàn bộ lịch sử điểm số?")) { violations = []; localStorage.removeItem('thiduaso_violations'); initApp(); } }