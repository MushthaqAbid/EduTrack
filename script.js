
"use strict";


const SUPABASE_URL = "https://lhnsdbemyogtsimteayl.supabase.co";

// Replace this with your own publishable API key
const SUPABASE_KEY = "sb_publishable_hbBXhNDdMlQw5XhyiAbp_A_qCUfnCOJ";

// Create Supabase connection
const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ----------------------------------
// ADMIN AUTHENTICATION
// ----------------------------------

const showLoginBtn = document.getElementById("showLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginForm = document.getElementById("loginForm");
const authStatus = document.getElementById("authStatus");
const loginMessage = document.getElementById("loginMessage");

// Your admin UID, copied from Authentication > Users
const ADMIN_UID = "5734872e-d92f-4918-b90d-c890bdd8fd7a";

async function updateAuthUI() {
    const { data, error } = await db.auth.getUser();

    const user = error ? null : data.user;
    const isAdmin = user?.id === ADMIN_UID;

    authStatus.textContent = isAdmin
        ? "Signed in as Administrator"
        : "Viewing as Guest";

    showLoginBtn.hidden = isAdmin;
    logoutBtn.hidden = !user;

    // Hide the login form after successful login
    if (isAdmin) {
        loginForm.hidden = true;
        loginMessage.textContent = "";
        document.getElementById("adminPassword").value = "";
    }

    // Store the status for the CRUD interface later
    document.body.dataset.isAdmin = String(isAdmin);
    // Redraw the table when authentication changes
    displayStudents();  
}

// Show login form
showLoginBtn.addEventListener("click", () => {
    loginForm.hidden = !loginForm.hidden;
    loginMessage.textContent = "";
});

// Sign in using Supabase Authentication
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    loginMessage.textContent = "Signing in...";

    const { error } = await db.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMessage.textContent = "Login failed. Check your credentials.";
        return;
    }

    await updateAuthUI();

    if (document.body.dataset.isAdmin !== "true") {
        loginMessage.textContent =
            "This account does not have administrator access.";
    }
});

// Log out
logoutBtn.addEventListener("click", async () => {
    const { error } = await db.auth.signOut();

    if (error) {
        alert("Could not sign out. Please try again.");
        return;
    }

    loginForm.hidden = true;
    await updateAuthUI();
});

// Keep the interface in sync with authentication changes
db.auth.onAuthStateChange(() => {
    updateAuthUI();
});

// Check for an existing login when the page opens
updateAuthUI();


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
let students = [];


async function loadStudentsFromDatabase() {
    try {
        const { data, error } = await db
            .from("students")
            .select("id, name, programme, gpa")
            .order("id", { ascending: true });

        if (error) {
            throw error;
        }

        // Convert database GPA values into numbers
        students = (data || []).map(student => ({
            ...student,
            gpa: Number(student.gpa)
        }));

        console.log("Loaded students from Supabase:", students);

        refreshDashboard();

    } catch (error) {
        console.error("Error loading students:", error);
        alert("Unable to load student records from Supabase.");
    }
}


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



async function saveStudent(event) {
    event.preventDefault();

    // Check that the user is the administrator
    const { data: authData, error: authError } =
        await db.auth.getUser();

    if (authError || authData.user?.id !== ADMIN_UID) {
        alert("Only the administrator can modify records.");
        return;
    }

    const id = studentIdInput.value.trim().toUpperCase();
    const name = studentNameInput.value.trim();
    const programme = studentProgrammeInput.value;
    const gpaText = studentGPAInput.value.trim();
    const gpa = Number(gpaText);

    // Validate user input
    if (!id || !name || !programme ||
        gpaText === "" ||
        !Number.isFinite(gpa) ||
        gpa < 0 || gpa > 4 ||
        !/^\d+(\.\d{1,2})?$/.test(gpaText)) {

        alert("Please enter valid student information.");
        return;
    }

    try {
        let result;

        if (editingStudentId === null) {
            // CREATE: Add a record to Supabase
            result = await db
                .from("students")
                .insert({ id, name, programme, gpa });

        } else {
            // UPDATE: Modify an existing record
            result = await db
                .from("students")
                .update({ name, programme, gpa })
                .eq("id", editingStudentId)
                .select("id");

            if (!result.error && result.data.length === 0) {
                throw new Error("Student not found or update denied.");
            }
        }

        if (result.error) throw result.error;

        closeModal();

        // Reload the latest database records
        await loadStudentsFromDatabase();

        alert("Student record saved successfully!");

    } catch (error) {
        console.error("Error saving student:", error);
        alert("Unable to save student: " + error.message);
    }
}


// ----------------------------------
// 11. DELETE STUDENT
// ----------------------------------


   
async function deleteStudent(id) {
    const { data: authData, error: authError } =
        await db.auth.getUser();

    if (authError || authData.user?.id !== ADMIN_UID) {
        alert("Only the administrator can delete students.");
        return;
    }

    const student = students.find(s => s.id === id);

    if (!student) return;

    const confirmed = confirm(
        `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) return;

    try {
        const { data, error } = await db
            .from("students")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) throw error;

        if (data.length === 0) {
            throw new Error("Student not found or deletion denied.");
        }

        // Retrieve latest records from Supabase
        await loadStudentsFromDatabase();

        alert("Student deleted successfully!");

    } catch (error) {
        console.error("Error deleting student:", error);
        alert("Unable to delete student: " + error.message);
    }
}



// ----------------------------------
// 12. REFRESH ALL DASHBOARD COMPONENTS
// ----------------------------------


function refreshDashboard() {
    displayStudents();
    updateStatistics();
    displayChart();

    // if (save) {
    //     saveStudents();
    // }
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
// Initial rendering: load records from Supabase
loadStudentsFromDatabase();
