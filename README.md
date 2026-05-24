# Project Monitoring System

Static HTML Project Monitoring System for Contractor requests, Inspector approval/rejection, Inspector form accomplishment, and Project Engineer review.

## Start

Open `Updated Login.html` in a browser, or open `index.html` to redirect to the login page.

## Demo Accounts

- Inspector: `INS1234` / `INS1234`
- Contractor: `CON1234` / `CON1234`
- Project Engineer: `PE1234` / `PE1234`

## Notes

Workflow: Contractor requests a form, Inspector approves or rejects the request, and once approved the Inspector fills the requested form. If the Contractor requests another form using the same project name later, the new request is kept under the same project instead of creating a duplicate project row. Data is stored in the browser using `localStorage`. The current version includes a one-time reset for old saved project/form data.
## Program of Works

After the Contractor requests a form and the Inspector approves the requested scope, the dashboard automatically creates a Program of Works under `Reports` for that project. Each approved form request under the same project becomes its own Program of Works item. The Project Engineer can click Edit Program of Works, enter Estimated Cost and Actual Accomplishment, then click Save Program of Works. Computed SWA, row % Done, and Project Totals are calculated automatically. Other roles can view the report but cannot edit it.
