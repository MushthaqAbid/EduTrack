
"use strict";

// ----------------------------------
// 1. STUDENT DATA
// ----------------------------------

const defaultStudents = [
    { id: "S001", name: "Alex Tan", programme: "Information Security", gpa: 3.82 },
    { id: "S002", name: "Sarah Lim", programme: "Computer Science", gpa: 3.45 },
    { id: "S003", name: "Daniel Lee", programme: "Information Security", gpa: 1.85 },
    { id: "S004", name: "Priya Kumar", programme: "Software Engineering", gpa: 3.90 },
    { id: "S005", name: "Ryan Wong", programme: "Computer Science", gpa: 2.75 },
    { id: "S006", name: "Nur Aisyah", programme: "Information Security", gpa: 3.65 },
    { id: "S007", name: "John Ng", programme: "Software Engineering", gpa: 1.50 },
    { id: "S008", name: "Emma Chen", programme: "Computer Science", gpa: 3.20 }];

    
const STORAGE_KEY = "edutrack_students_v1";

// Read saved data safely
function loadStudents() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        // First visit: use the eight sample students
        if (savedData === null) {
            return defaultStudents.map(student => ({ ...student }));
        }

        const parsedData = JSON.parse(savedData);

        // Make sure the saved data is a valid student array
        if (!Array.isArray(parsedData)) {
            throw new Error("Saved data is not an array");
        }

        const isValid = parsedData.every(student =>
            student !== null &&
            typeof student.id === "string" &&
            typeof student.name === "string" &&
            typeof student.programme === "string" &&
            typeof student.gpa === "number" &&
            Number.isFinite(student.gpa) &&
            student.gpa >= 0 &&
            student.gpa <= 4
        );

        if (!isValid) {
            throw new Error("Invalid student records");
        }

        return parsedData;

    } catch (error) {
        console.error("Could not load saved students:", error);
        return defaultStudents.map(student => ({ ...student }));
    }
}

// The rest of the application will use this array
let students = loadStudents();

// Save the latest records to browser storage
function saveStudents() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(students)
        );
        return true;
    } catch (error) {
        console.error("Could not save students:", error);
        alert("Changes could not be saved in this browser.");
        return false;
    }
}



// null means we are adding a new student.
// Otherwise, it stores the ID of the student being edited.
let editingStudentId = null;

// ----------------------------------
// 2. GET HTML ELEMENTS
// ----------------------------------

const tableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const programmeFilter = document.getElementById("programmeFilter");

const studentModal = document.getElementById("studentModal");
const studentForm = document.getElementById("studentForm");

const studentIdInput = document.getElementById("studentId");
const studentNameInput = document.getElementById("studentName");
const studentProgrammeInput = document.getElementById("studentProgramme");
const studentGPAInput = document.getElementById("studentGPA");

// ----------------------------------
// 3. SEARCH AND FILTER
// ----------------------------------


    
function getFilteredStudents() {
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedProgramme = programmeFilter.value;

    return students.filter(student => {
        // Search by name or ID
        const matchesSearch =
            student.name.toLowerCase().includes(searchText) ||
            student.id.toLowerCase().includes(searchText);

        // Check academic status
        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "pass" && student.gpa >= 2.0) ||
            (selectedStatus === "risk" && student.gpa < 2.0);

        // Check programme
        const matchesProgramme =
            selectedProgramme === "all" ||
            student.programme === selectedProgramme;

        // Student must satisfy all three conditions
        return matchesSearch &&
               matchesStatus &&
               matchesProgramme;
    });
}


// ----------------------------------
// 4. DISPLAY STUDENTS
// ----------------------------------

function displayStudents() {
    tableBody.innerHTML = "";

    const filteredStudents = getFilteredStudents();

    if (filteredStudents.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No matching students found.";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    filteredStudents.forEach(student => {
        const row = document.createElement("tr");

        // Add cells safely using textContent
        [
            student.id,
            student.name,
            student.programme,
            student.gpa.toFixed(2)
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        // Academic status
        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        const isPassing = student.gpa >= 2.0;

        badge.className = isPassing
            ? "status pass"
            : "status risk";

        badge.textContent = isPassing
            ? "Passing"
            : "At Risk";

        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        // Edit and Delete buttons
        const actionsCell = document.createElement("td");
        const buttonGroup = document.createElement("div");

        buttonGroup.className = "action-buttons";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            openEditModal(student.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteStudent(student.id);
        });

        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(deleteButton);

        actionsCell.appendChild(buttonGroup);
        row.appendChild(actionsCell);

        tableBody.appendChild(row);
    });
}

// ----------------------------------
// 5. UPDATE DASHBOARD STATISTICS
// ----------------------------------

function updateStatistics() {
    const total = students.length;

    const totalGPA = students.reduce(
        (sum, student) => sum + student.gpa,
        0
    );

    const average = total > 0 ? totalGPA / total : 0;

    const passing = students.filter(
        student => student.gpa >= 2.0
    ).length;

    const atRisk = total - passing;

    const passRate = total > 0
        ? (passing / total) * 100
        : 0;

    document.getElementById("totalStudents").textContent = total;
    document.getElementById("averageGPA").textContent = average.toFixed(2);
    document.getElementById("passRate").textContent =
        passRate.toFixed(1) + "%";
    document.getElementById("atRisk").textContent = atRisk;
}

// ----------------------------------
// 6. UPDATE PERFORMANCE CHART
// ----------------------------------


function displayChart() {
    const chart = document.getElementById("gradeChart");
    chart.innerHTML = "";

    const ranges = [
        { label: "0–0.99", min: 0, max: 1 },
        { label: "1–1.99", min: 1, max: 2 },
        { label: "2–2.99", min: 2, max: 3 },
        { label: "3–4.00", min: 3, max: 4.01 }
    ];

    // Count students within each GPA range
    const counts = ranges.map(range =>
        students.filter(student =>
            student.gpa >= range.min &&
            student.gpa < range.max
        ).length
    );

    const maxCount = Math.max(...counts, 1);

    ranges.forEach((range, index) => {
        const count = counts[index];

        // Container for the bar and its label
        const group = document.createElement("div");
        group.className = "chart-group";

        const barArea = document.createElement("div");
        barArea.className = "chart-bar-area";

        // Numeric count shown above the bar
        const countLabel = document.createElement("span");
        countLabel.className = "chart-count";
        countLabel.textContent = count;

        // Actual bar
        const bar = document.createElement("div");
        bar.className = "chart-bar";

       const heightPercent = (count / maxCount) * 80;
        bar.style.height = `${heightPercent}%`;

        // Highlight students at academic risk
        if (range.max <= 2) {
            bar.classList.add("risk-bar");
        }

        bar.title = `${count} students with GPA ${range.label}`;

        // GPA range shown below the bar
        const rangeLabel = document.createElement("span");
        rangeLabel.className = "chart-label";
        rangeLabel.textContent = range.label;

        barArea.appendChild(countLabel);
        barArea.appendChild(bar);

        group.appendChild(barArea);
        group.appendChild(rangeLabel);

        chart.appendChild(group);
    });
}


// ----------------------------------
// 7. OPEN ADD STUDENT FORM
// ----------------------------------

function openAddModal() {
    editingStudentId = null;

    studentForm.reset();
    studentIdInput.readOnly = false;

    document.getElementById("modalTitle").textContent =
        "Add Student";

    studentModal.hidden = false;
    studentIdInput.focus();
}

// ----------------------------------
// 8. OPEN EDIT STUDENT FORM
// ----------------------------------

function openEditModal(id) {
    const student = students.find(s => s.id === id);

    if (!student) return;

    editingStudentId = id;

    studentIdInput.value = student.id;
    studentNameInput.value = student.name;
    studentProgrammeInput.value = student.programme;
    studentGPAInput.value = student.gpa;

    // Student IDs are unique identifiers.
    studentIdInput.readOnly = true;

    document.getElementById("modalTitle").textContent =
        "Edit Student";

    studentModal.hidden = false;
    studentNameInput.focus();
}

// ----------------------------------
// 9. CLOSE FORM
// ----------------------------------

function closeModal() {
    studentModal.hidden = true;
    studentForm.reset();
    editingStudentId = null;
}

// ----------------------------------
// 10. ADD OR UPDATE STUDENT
// ----------------------------------

function saveStudent(event) {
    event.preventDefault();

    const id = studentIdInput.value.trim().toUpperCase();
    const name = studentNameInput.value.trim();
    const programme = studentProgrammeInput.value;
    const gpaText = studentGPAInput.value.trim();
    const gpa = Number(gpaText);

    // Validate inputs
    if (!id || !name || !programme || gpaText === "" ||
        !Number.isFinite(gpa) || gpa < 0 || gpa > 4) {
        alert("Please enter valid student information.");
        return;
    }

    // Allow a maximum of 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(gpaText)) {
        alert("GPA must have at most 2 decimal places.");
        return;
    }

    if (editingStudentId === null) {
        // CREATE operation
        const idExists = students.some(s => s.id === id);

        if (idExists) {
            alert("This Student ID already exists.");
            return;
        }

        students.push({
            id: id,
            name: name,
            programme: programme,
            gpa: gpa
        });

    } else {
        // UPDATE operation
        const student = students.find(
            s => s.id === editingStudentId
        );

        if (!student) {
            alert("Student record not found.");
            return;
        }

        student.name = name;
        student.programme = programme;
        student.gpa = gpa;
    }

    closeModal();
    refreshDashboard(true);
}

// ----------------------------------
// 11. DELETE STUDENT
// ----------------------------------

function deleteStudent(id) {
    const student = students.find(s => s.id === id);

    if (!student) return;

    const confirmed = confirm(
        `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) return;

    students = students.filter(s => s.id !== id);

    refreshDashboard(true);
}

// ----------------------------------
// 12. REFRESH ALL DASHBOARD COMPONENTS
// ----------------------------------


function refreshDashboard(save = false) {
    displayStudents();
    updateStatistics();
    displayChart();

    if (save) {
        saveStudents();
    }
}


// ----------------------------------
// 13. EVENT LISTENERS
// ----------------------------------

// Search updates while typing
searchInput.addEventListener("input", displayStudents);

// Filter updates when selection changes
statusFilter.addEventListener("change", displayStudents);

// Open Add Student form
document.getElementById("addStudentBtn")
    .addEventListener("click", openAddModal);

programmeFilter.addEventListener("change", displayStudents);

// Save form
studentForm.addEventListener("submit", saveStudent);

// Close form
document.getElementById("closeModalBtn")
    .addEventListener("click", closeModal);

document.getElementById("cancelBtn")
    .addEventListener("click", closeModal);

// Close with Escape key
document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !studentModal.hidden) {
        closeModal();
    }
});

// Initial rendering
refreshDashboard();
