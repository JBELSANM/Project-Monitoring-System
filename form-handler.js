(function () {
    "use strict";

    const DATA_RESET_VERSION = "2026-05-16-dark-checks-reset-v1";
    function resetSavedDataOnce() {
        if (localStorage.getItem("spmsDataResetVersion") === DATA_RESET_VERSION) return;
        [
            "spms_projects", "formSubmissions", "activityLogs", "projectForms", "formRequests",
            "currentProjectId", "currentProjectName", "currentFormType", "currentProjectLocation", "currentInspector",
            "viewFormProjectId", "viewFormProjectName", "viewFormFileName", "viewFormData", "viewSubmissionId",
            "editSubmissionId", "formMode", "editMode", "viewModeFormData"
        ].forEach(function (key) { localStorage.removeItem(key); });
        localStorage.setItem("spmsDataResetVersion", DATA_RESET_VERSION);
    }
    resetSavedDataOnce();

    const params = new URLSearchParams(window.location.search);
    const fileName = decodeURIComponent((window.location.pathname.split(/[\\/]/).pop() || "").trim());
    const requestedMode = params.get("mode") || localStorage.getItem("formMode") || "fill";
    const isViewMode = requestedMode === "view";
    const isEditMode = requestedMode === "edit";

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function queryAll(selector, root) {
        return Array.from((root || document).querySelectorAll(selector));
    }

    function getSubmissions() {
        return readJSON("formSubmissions", []);
    }

    function setSubmissions(submissions) {
        writeJSON("formSubmissions", submissions);
    }

    function getProjects() {
        return readJSON("spms_projects", []);
    }

    function setProjects(projects) {
        writeJSON("spms_projects", projects);
    }

    function latestMatchingSubmission(projectId, formType) {
        const matches = getSubmissions().filter(function (submission) {
            return submission.projectId === projectId &&
                (!formType || submission.formType === formType || submission.formFileName === fileName);
        });
        return matches.length ? matches[matches.length - 1] : null;
    }

    function selectedSubmission() {
        const selectedId = isViewMode ? localStorage.getItem("viewSubmissionId") : localStorage.getItem("editSubmissionId");
        const submissions = getSubmissions();
        if (selectedId) {
            const explicit = submissions.find(function (submission) { return submission.id === selectedId; });
            if (explicit) return explicit;
        }

        const projectId = localStorage.getItem("currentProjectId") || localStorage.getItem("viewFormProjectId") || params.get("projectId") || "";
        const formType = localStorage.getItem("currentFormType") || "";
        return latestMatchingSubmission(projectId, formType);
    }

    const existingSubmission = selectedSubmission();
    const context = {
        projectId: localStorage.getItem("currentProjectId") || localStorage.getItem("viewFormProjectId") || (existingSubmission && existingSubmission.projectId) || params.get("projectId") || "",
        projectName: localStorage.getItem("currentProjectName") || localStorage.getItem("viewFormProjectName") || (existingSubmission && existingSubmission.projectName) || "",
        formType: localStorage.getItem("currentFormType") || (existingSubmission && existingSubmission.formType) || document.title || "Inspection Form",
        location: localStorage.getItem("currentProjectLocation") || (existingSubmission && existingSubmission.location) || "",
        inspector: localStorage.getItem("currentInspector") || (existingSubmission && existingSubmission.inspector) || localStorage.getItem("userID") || "Inspector"
    };

    function injectStyles() {
        if (document.getElementById("sharedFormHandlerStyles")) return;
        const style = document.createElement("style");
        style.id = "sharedFormHandlerStyles";
        style.textContent = [
            ".form-mode-banner{font-family:Arial,sans-serif;padding:12px 16px;text-align:center;font-weight:700;background:#eef6ff;color:#1f4e79;border-bottom:1px solid #b8d6f0;}",
            ".form-mode-banner.view{background:#fff7e6;color:#8a5a00;border-bottom-color:#f0cf83;}",
            ".form-mode-banner.edit{background:#ecfdf3;color:#176b3a;border-bottom-color:#9bd6b0;}",
            ".save-draft-btn{background:#607d8b;color:#fff;border:none;padding:12px 24px;font-size:14px;font-weight:700;border-radius:4px;cursor:pointer;margin-right:8px;}",
            ".save-draft-btn:hover{background:#546e7a;}",
            ".readonly-note{font-family:Arial,sans-serif;margin:12px 0;color:#555;font-size:13px;text-align:center;}",
            "body.view-mode input[type='checkbox'],body.view-mode input[type='radio']{accent-color:#000!important;filter:contrast(220%) saturate(0)!important;}",
            "body.view-mode input[type='checkbox']:checked,body.view-mode input[type='radio']:checked{box-shadow:0 0 0 1px #000!important;}",
            ".submit-section{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;}",
            ".submit-section .submit-btn{margin-left:0;}"
        ].join("\n");
        document.head.appendChild(style);
    }

    function addBanner() {
        const container = document.querySelector(".form-container") || document.body;
        if (document.getElementById("formModeBanner")) return;
        const banner = document.createElement("div");
        banner.id = "formModeBanner";
        banner.className = "form-mode-banner" + (isViewMode ? " view" : (isEditMode ? " edit" : ""));
        if (isViewMode) {
            banner.textContent = "VIEW ONLY - Saved accomplished form for " + (context.projectName || "this project");
        } else if (isEditMode) {
            banner.textContent = "EDIT MODE - Update the saved accomplished form, then save or submit again";
        } else {
            banner.textContent = "FILL FORM - " + (context.formType || "Inspection Form") + " for " + (context.projectName || "selected project");
        }
        container.insertBefore(banner, container.firstChild);
    }

    function fields() {
        return queryAll("input, select, textarea").filter(function (field) {
            const type = (field.type || "").toLowerCase();
            return type !== "button" && type !== "submit" && type !== "reset";
        });
    }

    function keyForField(field, index) {
        if (field.id) return "id:" + field.id;
        if (field.name) return "name:" + field.name;
        return "idx:" + index;
    }

    function markFieldKeys() {
        fields().forEach(function (field, index) {
            field.dataset.storeKey = keyForField(field, index);
        });
    }

    function setValue(field, value) {
        const type = (field.type || "").toLowerCase();
        if (type === "checkbox" || type === "radio") {
            field.checked = value === true || value === "true";
        } else if (value !== undefined && value !== null) {
            field.value = value;
        }
    }

    function applyStoredFields(submission) {
        if (!submission) return;
        const data = submission.formData || {};
        const storedFields = data.fields || data;
        fields().forEach(function (field) {
            const key = field.dataset.storeKey;
            const idFallback = field.id ? field.id : null;
            const nameFallback = field.name ? field.name : null;
            if (Object.prototype.hasOwnProperty.call(storedFields, key)) setValue(field, storedFields[key]);
            else if (idFallback && Object.prototype.hasOwnProperty.call(storedFields, idFallback)) setValue(field, storedFields[idFallback]);
            else if (nameFallback && Object.prototype.hasOwnProperty.call(storedFields, nameFallback)) setValue(field, storedFields[nameFallback]);
        });
    }

    function findDetailInput(labelText) {
        const wanted = labelText.toUpperCase();
        const rows = queryAll(".details-table tr");
        for (const row of rows) {
            if (row.innerText.toUpperCase().indexOf(wanted) !== -1) {
                const inputs = queryAll("input, select, textarea", row);
                if (inputs.length) return inputs[0];
            }
        }
        return null;
    }

    function fillIfEmpty(input, value) {
        if (input && value && !input.value) input.value = value;
    }

    function autoFillHeaderFields() {
        fillIfEmpty(document.getElementById("contractNameField"), context.projectName);
        fillIfEmpty(document.getElementById("locationField"), context.location);
        fillIfEmpty(document.getElementById("inspectedBy"), context.inspector);
        fillIfEmpty(findDetailInput("CONTRACT NAME"), context.projectName);
        fillIfEmpty(findDetailInput("LOCATION"), context.location);
        fillIfEmpty(findDetailInput("DATE REQUESTED"), new Date().toLocaleDateString());
    }

    function getFieldValues() {
        const values = {};
        fields().forEach(function (field) {
            const type = (field.type || "").toLowerCase();
            values[field.dataset.storeKey] = (type === "checkbox" || type === "radio") ? field.checked : field.value;
        });
        return values;
    }

    function getGeneralInfo() {
        const info = {};
        queryAll(".details-table tr").forEach(function (row) {
            const labels = queryAll(".label-cell", row).map(function (cell) {
                return cell.innerText.replace(/[:\s]+$/g, "").trim();
            });
            const inputs = queryAll("input, select, textarea", row);
            inputs.forEach(function (input, index) {
                const label = labels[index] || labels[0] || ("Field " + (index + 1));
                if (label) info[label] = input.value || "";
            });
        });
        return info;
    }

    function getChecklistValues() {
        const items = [];
        queryAll(".inspection-table tbody tr").forEach(function (row) {
            const descCell = row.querySelector(".item-desc");
            if (!descCell) return;
            const checkboxes = queryAll(".check-box-input", row);
            const labels = checkboxes.length >= 4 ? ["DFC", "YES", "NO", "N/A"] : ["YES", "NO", "N/A"];
            let status = "";
            checkboxes.forEach(function (checkbox, index) {
                if (checkbox.checked) status = labels[index] || ("Checked " + (index + 1));
            });
            items.push({
                desc: descCell.innerText.trim(),
                status: status,
                remark: (row.querySelector(".remark-input") || {}).value || "",
                action: (row.querySelector(".action-input") || {}).value || ""
            });
        });
        return items;
    }

    function getWorkApproval() {
        const accept = document.querySelector(".accept-check, #acceptCheck");
        const reject = document.querySelector(".reject-check, #rejectCheck");
        if (accept && accept.checked) return "Accepted";
        if (reject && reject.checked) return "Rejected";
        return "Pending";
    }

    function collectFormData() {
        return {
            fields: getFieldValues(),
            generalInfo: getGeneralInfo(),
            checklistValues: getChecklistValues()
        };
    }

    function logAction(action) {
        const logs = readJSON("activityLogs", []);
        logs.unshift({
            time: new Date().toLocaleString(),
            action: action,
            user: localStorage.getItem("userID") || context.inspector
        });
        writeJSON("activityLogs", logs.slice(0, 50));
    }

    function updateProjectReference(submission) {
        const projects = getProjects();
        const index = projects.findIndex(function (project) { return project._id === submission.projectId; });
        if (index === -1) return;

        const project = projects[index];
        if (!project.submittedForms) project.submittedForms = [];
        let reference = project.submittedForms.find(function (item) {
            return item.submissionId === submission.id || item.formType === submission.formType;
        });
        if (!reference) {
            reference = {};
            project.submittedForms.push(reference);
        }
        reference.submissionId = submission.id;
        reference.formType = submission.formType;
        reference.formFileName = submission.formFileName;
        reference.status = submission.status;
        reference.savedAt = submission.savedAt;
        reference.submittedAt = submission.submittedAt;
        reference.updatedAt = submission.updatedAt;
        reference.inspector = submission.inspector;
        reference.workApproval = submission.workApproval;
        setProjects(projects);

        try {
            if (window.opener && !window.opener.closed && typeof window.opener.refreshProjectsFromStorage === "function") {
                window.opener.refreshProjectsFromStorage();
            }
        } catch (error) {
            // Same-origin file windows can refresh; otherwise localStorage is already saved.
        }
    }

    function saveForm(status) {
        if (!context.projectId) {
            alert("Please open this form from the dashboard so it can be linked to a project.");
            return;
        }

        const submissions = getSubmissions();
        const explicitId = isEditMode ? localStorage.getItem("editSubmissionId") : "";
        const existing = (explicitId && submissions.find(function (item) { return item.id === explicitId; })) || latestMatchingSubmission(context.projectId, context.formType);
        const now = new Date().toLocaleString();
        const id = (existing && existing.id) || (context.projectId + "-" + Date.now());
        const finalStatus = status === "Submitted" ? "Submitted" : "Draft";
        const submission = Object.assign({}, existing || {}, {
            id: id,
            projectId: context.projectId,
            projectName: context.projectName,
            formType: context.formType,
            formFileName: fileName,
            location: context.location,
            inspector: context.inspector,
            status: finalStatus,
            savedAt: now,
            updatedAt: now,
            submittedAt: finalStatus === "Submitted" ? now : ((existing && existing.submittedAt) || ""),
            workApproval: getWorkApproval(),
            formData: collectFormData()
        });

        const currentIndex = submissions.findIndex(function (item) { return item.id === id; });
        if (currentIndex === -1) submissions.push(submission);
        else submissions[currentIndex] = submission;
        setSubmissions(submissions);
        updateProjectReference(submission);
        localStorage.setItem("editSubmissionId", id);
        localStorage.setItem("viewSubmissionId", id);
        logAction((finalStatus === "Submitted" ? "Submitted" : "Saved draft for") + " " + context.formType + " on \"" + context.projectName + "\"");

        if (finalStatus === "Submitted") {
            alert("Form submitted and saved successfully. Contractor and Engineer can now view it.");
            setTimeout(function () { window.close(); }, 700);
        } else {
            alert("Draft saved. You can continue editing or submit it later.");
        }
    }

    function wireExclusiveChecks() {
        queryAll(".inspection-table tbody tr").forEach(function (row) {
            const checkboxes = queryAll(".check-box-input", row);
            checkboxes.forEach(function (checkbox) {
                checkbox.addEventListener("change", function () {
                    if (!checkbox.checked) return;
                    checkboxes.forEach(function (other) {
                        if (other !== checkbox) other.checked = false;
                    });
                });
            });
        });

        const accept = document.querySelector(".accept-check, #acceptCheck");
        const reject = document.querySelector(".reject-check, #rejectCheck");
        if (accept && reject) {
            accept.addEventListener("change", function () { if (accept.checked) reject.checked = false; });
            reject.addEventListener("change", function () { if (reject.checked) accept.checked = false; });
        }
    }

    function disableForViewMode() {
        document.body.classList.add("view-mode");
        fields().forEach(function (field) {
            const type = (field.type || "").toLowerCase();
            if (type === "checkbox" || type === "radio") {
                field.disabled = false;
                field.readOnly = true;
                field.tabIndex = -1;
                field.setAttribute("aria-disabled", "true");
                field.style.accentColor = "#000";
                field.style.pointerEvents = "none";
                field.style.cursor = "not-allowed";
                return;
            }
            if (field.tagName === "SELECT") field.disabled = true;
            else field.readOnly = true;
            field.style.backgroundColor = "#f5f5f5";
            field.style.cursor = "not-allowed";
        });
        const submitSection = document.querySelector(".submit-section");
        if (submitSection) {
            const note = document.createElement("div");
            note.className = "readonly-note";
            note.textContent = "This accomplished form is locked for review.";
            submitSection.innerHTML = "";
            submitSection.appendChild(note);
        }
    }

    function wireButtons() {
        const submitBtn = document.getElementById("submitBtn") || document.querySelector(".submit-btn");
        if (!submitBtn) return;
        submitBtn.removeAttribute("onclick");
        submitBtn.type = "button";

        if (isViewMode) {
            disableForViewMode();
            return;
        }

        submitBtn.textContent = isEditMode ? "SUBMIT UPDATED FORM" : "SUBMIT FORM";
        submitBtn.addEventListener("click", function (event) {
            event.preventDefault();
            saveForm("Submitted");
        });

        const draftBtn = document.createElement("button");
        draftBtn.type = "button";
        draftBtn.className = "save-draft-btn";
        draftBtn.textContent = "SAVE DRAFT";
        draftBtn.addEventListener("click", function (event) {
            event.preventDefault();
            saveForm("Draft");
        });

        const section = submitBtn.closest(".submit-section") || submitBtn.parentElement;
        if (section && !section.querySelector(".save-draft-btn")) {
            section.insertBefore(draftBtn, submitBtn);
        }
    }

    function init() {
        injectStyles();
        addBanner();
        markFieldKeys();
        autoFillHeaderFields();
        applyStoredFields(existingSubmission);
        wireExclusiveChecks();
        wireButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();