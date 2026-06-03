import { useEffect, useState } from "react";
import "./HRForm.css";
import {
  departmentDirectory,
  getInitialFormData,
  officialEmailDomain,
} from "./onboardingData";

const personalEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const officialEmailUserRegex = /^[a-zA-Z0-9._]+$/;

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
}) {
  const [formData, setFormData] = useState(() => mergeFormData(initialData));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({
    type: "",
    mailMessage: "",
  });

  const selectedDepartment = departmentDirectory[formData.department];
  const managerOptions = selectedDepartment?.managers ?? [];
  const hodOptions = selectedDepartment?.hods ?? [];

  useEffect(() => {
    setFormData(mergeFormData(initialData));
    setErrors({});
    setIsSubmitting(false);
    setSubmitState({
      type: "",
      mailMessage: "",
    });
  }, [initialData]);

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
    setSubmitState({
      type: "",
      mailMessage: "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm(formData);
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
        ? await onSubmitForm(formData)
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
      onSuccess?.(formData, payload);
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
