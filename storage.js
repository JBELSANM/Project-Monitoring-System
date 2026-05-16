function getForms() {
    return JSON.parse(localStorage.getItem('projectForms')) || [];
}

function saveForms(forms) {
    localStorage.setItem('projectForms', JSON.stringify(forms));
}

function getRequests() {
    return JSON.parse(localStorage.getItem('formRequests')) || [];
}

function saveRequests(requests) {
    localStorage.setItem('formRequests', JSON.stringify(requests));
}