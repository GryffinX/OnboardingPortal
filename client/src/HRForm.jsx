import { useState } from "react";
import "./HRForm.css";

const departmentDirectory = {
  IT: {
    managers: ["Bharat Sinha"],
    hods: ["Anjali Mehta"],
  },
  HR: {
    managers: ["Priya Sharma", "Neha Kapoor"],
    hods: ["Rohit Nair"],
  },
  BGV: {
    managers: ["Amit Verma"],
    hods: ["Sneha Iyer"],
  },
};

function getInitialFormData() {
  return {
    name: "",
    personalEmail: "",
    officialEmailUser: "",
    department: "",
    lineManager: "",
    hod: "",
  };
}

const personalEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const officialEmailUserRegex = /^[a-zA-Z0-9._]+$/;
const officialEmailDomain = "@securitas-india.com";

function validateForm(formData) {
  const nextErrors = {};

  if (!formData.name.trim()) {
    nextErrors.name = "Employee name is required.";
  }

  if (!personalEmailRegex.test(formData.personalEmail)) {
    nextErrors.personalEmail = "Enter a valid personal email address.";
  }

  if (!officialEmailUserRegex.test(formData.officialEmailUser)) {
    nextErrors.officialEmail =
      "Enter a valid official email username.";
  }

  if (!formData.department) {
    nextErrors.department = "Select a line department.";
  }

  if (!formData.lineManager) {
    nextErrors.lineManager = "Select a line manager.";
  }

  if (!formData.hod) {
    nextErrors.hod = "Select an HOD.";
  }

  return nextErrors;
}

export default function HRForm() {
  const [formData, setFormData] = useState(() => getInitialFormData());
  const [errors, setErrors] = useState({});

  const selectedDepartment = departmentDirectory[formData.department];
  const managerOptions = selectedDepartment?.managers ?? [];
  const hodOptions = selectedDepartment?.hods ?? [];

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prevFormData) => {
      if (name === "department") {
        const nextDepartment = departmentDirectory[value];
        const nextManagers = nextDepartment?.managers ?? [];
        const nextHods = nextDepartment?.hods ?? [];

        return {
          ...prevFormData,
          department: value,
          lineManager: nextManagers.length === 1 ? nextManagers[0] : "",
          hod: nextHods.length === 1 ? nextHods[0] : "",
        };
      }

      return {
        ...prevFormData,
        [name]: value,
      };
    });

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(formData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    console.log({
      ...formData,
      officialEmail: `${formData.officialEmailUser}${officialEmailDomain}`,
    });
  }

  function handleCancel() {
    setFormData(getInitialFormData());
    setErrors({});
  }

  return (
    <section className="hr-form-page">
      <div className="hr-form-card">
        <h2 className="hr-form-title">Employee Onboarding Form</h2>
        <p className="hr-form-subtitle">
          Fill in employee details and assign reporting contacts before
          submission.
        </p>

        <form onSubmit={handleSubmit} className="hr-form-grid" noValidate>
          <label className="hr-form-field">
            <span className="hr-form-label">Employee Name</span>
            <input
              className="hr-form-input"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter employee name"
            />
            {errors.name ? <p className="hr-form-error">{errors.name}</p> : null}
          </label>

          <label className="hr-form-field">
            <span className="hr-form-label">Personal Email</span>
            <input
              className="hr-form-input"
              type="email"
              name="personalEmail"
              value={formData.personalEmail}
              onChange={handleChange}
              placeholder="name@example.com"
            />
            {errors.personalEmail ? (
              <p className="hr-form-error">{errors.personalEmail}</p>
            ) : null}
          </label>

          <label className="hr-form-field">
            <span className="hr-form-label">Proposed Official Mail</span>
            <div className="hr-form-email-wrap">
              <input
                className="hr-form-input hr-form-email-input"
                type="text"
                name="officialEmailUser"
                value={formData.officialEmailUser}
                onChange={handleChange}
                placeholder="username"
                autoComplete="off"
              />
              <span className="hr-form-email-domain">
                {officialEmailDomain}
              </span>
            </div>
            {errors.officialEmail ? (
              <p className="hr-form-error">{errors.officialEmail}</p>
            ) : null}
          </label>

          <label className="hr-form-field">
            <span className="hr-form-label">Department</span>
            <select
              className="hr-form-input"
              name="department"
              value={formData.department}
              onChange={handleChange}
            >
              <option value="">Select department</option>
              {Object.keys(departmentDirectory).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            {errors.department ? (
              <p className="hr-form-error">{errors.department}</p>
            ) : null}
          </label>

          <label className="hr-form-field">
            <span className="hr-form-label">Line Manager</span>
            <select
              className="hr-form-input"
              name="lineManager"
              value={formData.lineManager}
              onChange={handleChange}
              disabled={!selectedDepartment}
            >
              <option value="">Select line manager</option>
              {managerOptions.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
            {errors.lineManager ? (
              <p className="hr-form-error">{errors.lineManager}</p>
            ) : null}
          </label>

          <label className="hr-form-field">
            <span className="hr-form-label">HOD</span>
            <select
              className="hr-form-input"
              name="hod"
              value={formData.hod}
              onChange={handleChange}
              disabled={!selectedDepartment}
            >
              <option value="">Select HOD</option>
              {hodOptions.map((hod) => (
                <option key={hod} value={hod}>
                  {hod}
                </option>
              ))}
            </select>
            {errors.hod ? <p className="hr-form-error">{errors.hod}</p> : null}
          </label>

          <div className="hr-form-actions">
            <button type="submit" className="hr-form-submit">
              Submit
            </button>
            <button
              type="button"
              className="hr-form-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
