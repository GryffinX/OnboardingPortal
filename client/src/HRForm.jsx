import { useEffect, useState } from "react";
import "./HRForm.css";
import { validateName, validateEmail, validateEmployeePhoneNumber, getInitialFormData } from "./utils";

const officialEmailUserRegex = /^[a-zA-Z0-9._]+$/;

function validateForm(formData) {
  const nextErrors = {};

  const nameError = validateName(formData.name);
  if (nameError) nextErrors.name = nameError;

  const empPhoneError = validateEmployeePhoneNumber(formData.employeePhoneNumber);
  if (empPhoneError) nextErrors.employeePhoneNumber = empPhoneError;

  const emailError = validateEmail(formData.personalEmail);
  if (emailError) nextErrors.personalEmail = emailError;

  if (!formData.officialEmailUser) {
    nextErrors.officialEmail = "Official email username is required.";
  } else if (!officialEmailUserRegex.test(formData.officialEmailUser)) {
    nextErrors.officialEmail = "Enter a valid official email username.";
  }

  if (!formData.department) {
    nextErrors.department = "Select a line department.";
  }

  if (!formData.lineManager) {
    nextErrors.lineManager = "Select a line manager.";
  }

  if (!formData.hod) {
    nextErrors.hod = "Select a HOD.";
  }

  return nextErrors;
}

function mergeFormData(initialData) {
  return {
    ...getInitialFormData(),
    ...(initialData || {}),
  };
}

export default function HRForm({
  title = "Onboarding Form",
  subtitle = "Fill in employee details and assign reporting contacts before submission.",
  submitLabel = "Submit",
  successPrimaryMessage = "Successfully submitted.",
  initialData,
  onSubmitForm,
  onSuccess,
  onCancel,
  resetOnSuccess = true,
  embedded = false,
  apiBaseUrl = "http://127.0.0.1:8000",
  officialEmailDomain: explicitOfficialEmailDomain = "",
}) {
  const [formData, setFormData] = useState(() => mergeFormData(initialData));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({
    type: "",
    mailMessage: "",
  });
  const [staff, setStaff] = useState([]);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/users`);
        const data = await response.json();
        if (response.ok) {
          setStaff(data.users);
        }
      } catch (err) {
        console.error("Failed to fetch staff", err);
      }
    };
    fetchStaff();
  }, [apiBaseUrl]);

  const departments = [...new Set(staff.map(u => u.department).filter(Boolean))];
  const managerOptions = staff
    .filter(u => u.role === "Manager" && u.department === formData.department)
    .map(u => u.name);
  const hodOptions = staff
    .filter(u => u.role === "HOD" && u.department === formData.department)
    .map(u => u.name);

  function handleChange(event) {
    let { name, value } = event.target;

    // Strict input masking
    if (name === "employeePhoneNumber") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    if (name === "name") {
      value = value.replace(/[^a-zA-Z ]/g, "").slice(0, 50);
    }
    if (name === "officialEmailUser") {
      value = value.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 50);
    }
    if (name === "personalEmail") {
      value = value.replace(/[^a-zA-Z0-9.@]/g, "").slice(0, 100);
    }

    setFormData((prevFormData) => {
      if (name === "department") {
        const nextManagers = staff
          .filter(u => u.role === "Manager" && u.department === value)
          .map(u => u.name);
        const nextHods = staff
          .filter(u => u.role === "HOD" && u.department === value)
          .map(u => u.name);

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
    setSubmitState({
      type: "",
      mailMessage: "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const resolvedFormData = {
      ...formData,
      lineManager: formData.lineManager || (managerOptions.length === 1 ? managerOptions[0] : ""),
      hod: formData.hod || (hodOptions.length === 1 ? hodOptions[0] : ""),
    };

    const nextErrors = validateForm(resolvedFormData);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitState({
      type: "",
      mailMessage: "",
    });

    try {
      const payload = onSubmitForm
        ? await onSubmitForm(resolvedFormData)
        : { ok: false, message: "No submit handler is configured for this form." };

      if (!payload?.ok) {
        if (payload?.errors) {
          setErrors(payload.errors);
        }

        setSubmitState({
          type: "error",
          mailMessage: payload?.message || "Unable to submit the form.",
        });
        return;
      }

      setSubmitState({
        type: "success",
        mailMessage: payload.message || "Mail sent successfully",
      });

      if (resetOnSuccess) {
        setFormData(getInitialFormData());
      }

      setErrors({});
      onSuccess?.(resolvedFormData, payload);
    } catch {
      setSubmitState({
        type: "error",
        mailMessage: "Unable to reach the mail service.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setFormData(mergeFormData(initialData));
    setErrors({});
    setSubmitState({
      type: "",
      mailMessage: "",
    });
    onCancel?.();
  }

  return (
    <section className={`hr-form-shell ${embedded ? "hr-form-shell-embedded" : "hr-form-page"}`}>
      <div className="hr-form-card">
        <div className="hr-form-header">
          <h2 className="hr-form-title">{title}</h2>
        </div>

        <div className="hr-form-body">
          <p className="hr-form-subtitle">
            {subtitle}
          </p>

          {submitState.type === "success" ? (
            <div className="hr-form-status hr-form-status-success">
              <p>{successPrimaryMessage}</p>
              <p>{submitState.mailMessage}</p>
            </div>
          ) : null}

          {submitState.type === "error" ? (
            <div className="hr-form-status hr-form-status-error">
              <p>{submitState.mailMessage}</p>
            </div>
          ) : null}

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
                maxLength={50}
              />
              {errors.name ? <p className="hr-form-error">{errors.name}</p> : null}
            </label>

            <label className="hr-form-field">
              <span className="hr-form-label">Employee Phone Number</span>
              <input
                className="hr-form-input"
                type="text"
                name="employeePhoneNumber"
                value={formData.employeePhoneNumber}
                onChange={handleChange}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
              {errors.employeePhoneNumber ? (
                <p className="hr-form-error">{errors.employeePhoneNumber}</p>
              ) : null}
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
                maxLength={100}
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
                  maxLength={50}
                />
                <span className="hr-form-email-domain">
                  {explicitOfficialEmailDomain}
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
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
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
                disabled={!formData.department}
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
                disabled={!formData.department}
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
              <button
                type="submit"
                className="hr-form-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : submitLabel}
              </button>
              <button
                type="button"
                className="hr-form-cancel"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
