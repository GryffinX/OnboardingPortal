import { useState, useEffect } from "react";
import SoftwareSection from "./SoftwareSection";
import { pages, workflowStages } from "../constants";
import { getStageMeta, normalizeSoftwareList } from "../utils";

function RequestDetailPanel({
  request,
  role,
  onApprove,
  onSendToHr,
  onSaveSoftware,
  onStartHrEdit,
}) {
  const [softwareDraft, setSoftwareDraft] = useState("");

  useEffect(() => {
    // Determine draft based on current role
    if (role === pages.manager) {
      setSoftwareDraft(request?.managerSoftware?.join(", ") || "");
    } else if (role === pages.hod) {
      setSoftwareDraft(request?.hodSoftware?.join(", ") || "");
    } else {
      setSoftwareDraft("");
    }
  }, [request, role]);

  if (!request) {
    return (
      <aside className="detail-panel">
        <div className="detail-empty">
          Select a request to view the complete onboarding details.
        </div>
      </aside>
    );
  }

  const stageMeta = getStageMeta(request.stage);
  const isManagerStep = role === pages.manager && request.stage === workflowStages.manager;
  const isHodStep = role === pages.hod && request.stage === workflowStages.hod;
  const isHrStep = role === pages.hr && request.stage === workflowStages.hr;
  const canAct = isManagerStep || isHodStep;

  return (
    <aside className="detail-panel">
      <div className="detail-top">
        <div>
          <h3>{request.formData.name}</h3>
          <p>{request.requestCode}</p>
        </div>
        <span className={`status-pill status-pill-${stageMeta.tone}`}>
          {stageMeta.label}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Personal Email</span>
          <strong>{request.formData.personalEmail}</strong>
        </div>
        <div>
          <span>Official Email</span>
          <strong>{request.officialEmail}</strong>
        </div>
        <div>
          <span>Line Manager</span>
          <strong>{request.formData.lineManager}</strong>
        </div>
        <div>
          <span>HOD</span>
          <strong>{request.formData.hod}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{request.formData.department}</strong>
        </div>
        <div>
          <span>Revision Count</span>
          <strong>{request.revisionCount}</strong>
        </div>
      </div>

      <SoftwareSection
        title="Pre-installed on company laptop"
        tone="blue"
        items={request.preInstalledSoftware}
      />

      <SoftwareSection
        title="To be installed by employee"
        tone="yellow"
        items={request.employeeInstalledSoftware}
      />

      <SoftwareSection
        title="Software listed by Line Manager"
        tone="orange"
        items={request.managerSoftware}
        headerLabel={request.formData.lineManager}
      />

      <SoftwareSection
        title="Software listed by HOD"
        tone="black"
        items={request.hodSoftware}
        headerLabel={request.formData.hod}
      />

      {canAct && (
        <section className="software-input-card">
          <h4>Add/Edit Software List</h4>
          <p>
            {role === pages.manager 
              ? "List any additional software needed for this employee." 
              : "Review or add more software to the HOD software list."}
          </p>
          <textarea
            value={softwareDraft}
            onChange={(event) => setSoftwareDraft(event.target.value)}
            placeholder="Example: Tableau, Figma, Adobe Acrobat"
          />
          <div className="detail-actions detail-actions-compact">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onSaveSoftware(request.id, normalizeSoftwareList(softwareDraft), role)}
            >
              Save My Software List
            </button>
          </div>
        </section>
      )}

      {request.reviewReason ? (
        <div className="review-banner" style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", color: "#92400e" }}>
          <strong>Reason for HR Review:</strong>
          <p style={{ marginTop: "4px" }}>{request.reviewReason}</p>
          <small style={{ display: "block", marginTop: "8px", opacity: 0.8 }}>Requested by: {request.reviewRequestedBy}</small>
        </div>
      ) : null}

      {canAct ? (
        <div className="detail-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => onApprove(request.id)}
          >
            {role === pages.manager ? "Approve & Send to HOD" : "Approve Request"}
          </button>
          <button
            type="button"
            className="warning-button"
            onClick={() => {
              const reason = window.prompt("Please provide a reason for sending back to HR:");
              if (reason !== null && reason.trim() !== "") {
                onSendToHr(request.id, role === pages.manager ? "Line Manager" : "HOD", reason);
              } else if (reason !== null) {
                alert("A reason is required to send back to HR.");
              }
            }}
          >
            HR Review
          </button>
        </div>
      ) : null}

      {isHrStep ? (
        <div className="detail-actions">
          <button type="button" className="primary-button" onClick={() => onStartHrEdit(request.id)}>
            Edit and Re-submit
          </button>
        </div>
      ) : null}

      {!canAct && !isHrStep ? (
        <p className="detail-note">{stageMeta.description}</p>
      ) : null}
    </aside>
  );
}

export default RequestDetailPanel;
