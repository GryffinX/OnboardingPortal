import { useState, useRef, useEffect } from "react";
import SoftwareSection from "./SoftwareSection";
import { pages, workflowStages } from "../constants";
import { getStageMeta, normalizeSoftwareList } from "../utils";

function getInitialSoftwareDraft(request, role) {
  if (role === pages.manager) {
    return request?.managerSoftware?.join(", ") || "";
  }

  if (role === pages.hod) {
    return request?.hodSoftware?.join(", ") || "";
  }

  return "";
}

function RequestDetailPanel({
  request,
  role,
  onApprove,
  onSendToHr,
  onSaveSoftware,
  onStartHrEdit,
  onStopCase,
}) {
  const [softwareDraft, setSoftwareDraft] = useState(() => getInitialSoftwareDraft(request, role));
  const [assetCodeDraft, setAssetCodeDraft] = useState(() => request?.assetCode || "");
  const [hodCommentDraft, setHodCommentDraft] = useState(() => request?.hodComment || "");
  const [assetCodeError, setAssetCodeError] = useState("");
  const assetCodeRef = useRef(null);

  const [showHrModal, setShowHrModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [hrReason, setHrReason] = useState("");
  const [stopReason, setStopReason] = useState("");

  useEffect(() => {
    if (request?.assetCode) {
      setAssetCodeError("");
    }
  }, [request?.assetCode]);

  const handleHrReviewSubmit = () => {
    if (!hrReason.trim()) {
      alert("A reason is required to send back to HR.");
      return;
    }
    onSendToHr(request.id, role === pages.manager ? "Line Manager" : "HOD", hrReason);
    setShowHrModal(false);
    setHrReason("");
  };

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
  const isHrRole = role === pages.hr;
  const isHrStep = isHrRole && request.stage === workflowStages.hr;
  const canAct = isManagerStep || isHodStep;
  const canHrStop = isHrRole && request.stage !== workflowStages.approved && request.stage !== workflowStages.stopped;
  const canHrEdit = isHrStep;

  const handleStopCaseSubmit = () => {
    if (!stopReason.trim()) {
      alert("A reason is required to stop the case.");
      return;
    }

    onStopCase?.(request.id, stopReason);
    setShowStopModal(false);
    setStopReason("");
  };

  const handleSaveManagerExtras = () => {
    onSaveSoftware?.(request.id, normalizeSoftwareList(softwareDraft), role, {
      assetCode: assetCodeDraft,
    });
  };

  const handleSaveHodComment = () => {
    onSaveSoftware?.(request.id, [], role, {
      hodComment: hodCommentDraft,
    });
  };

  const handleApproveClick = () => {
    if (role === pages.manager && !request.assetCode) {
      setAssetCodeError("Asset code is required before approval.");
      assetCodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setAssetCodeError("");
    onApprove(request.id);
  };

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
        <div>
          <span>Asset Code</span>
          <strong style={assetCodeError ? { color: "#ef4444" } : {}}>
            {request.assetCode || "Not assigned"}
          </strong>
        </div>
        <div>
          <span>HOD Comment</span>
          <strong>{request.hodComment || "No comment yet"}</strong>
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

      {canAct && (
        <section className="software-input-card">
          <h4>Add/Edit Software List</h4>
          <p>
            {role === pages.manager
              ? "List any additional software and asset code needed for this employee."
              : "Add a comment for approval. HOD does not edit software."}
          </p>
          {role === pages.manager ? (
            <>
              <textarea
                value={softwareDraft}
                onChange={(event) => setSoftwareDraft(event.target.value)}
                placeholder="Example: Tableau, Figma, Adobe Acrobat"
              />
              <div ref={assetCodeRef} style={{ position: "relative", marginTop: "12px" }}>
                <input
                  type="text"
                  className="dashboard-search"
                  style={{ 
                    width: "100%",
                    border: assetCodeError ? "1px solid #ef4444" : "1px solid #e2e8f0"
                  }}
                  value={assetCodeDraft}
                  onChange={(event) => {
                    setAssetCodeDraft(event.target.value);
                    if (assetCodeError) setAssetCodeError("");
                  }}
                  placeholder="Asset code"
                />
                {assetCodeError && (
                  <div style={{ 
                    color: "#ef4444", 
                    fontSize: "0.8rem", 
                    marginTop: "4px",
                    fontWeight: "500" 
                  }}>
                    {assetCodeError}
                  </div>
                )}
              </div>
              <div className="detail-actions detail-actions-compact">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveManagerExtras}
                >
                  Save Software and Asset Code
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                value={hodCommentDraft}
                onChange={(event) => setHodCommentDraft(event.target.value)}
                placeholder="Add approval comment"
              />
              <div className="detail-actions detail-actions-compact">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveHodComment}
                >
                  Save Comment
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {request.reviewReason && request.stage === workflowStages.hr ? (
        <div className="review-banner" style={{ borderLeft: "4px solid #f59e0b", background: "#fffbeb", color: "#92400e" }}>
          <strong>Reason for HR Review:</strong>
          <p style={{ marginTop: "4px" }}>{request.reviewReason}</p>
          <small style={{ display: "block", marginTop: "8px", opacity: 0.8 }}>Requested by: {request.reviewRequestedBy}</small>
        </div>
      ) : null}

      {request.stopReason && request.stage === workflowStages.stopped ? (
        <div className="review-banner" style={{ borderLeft: "4px solid #ef4444", background: "#fef2f2", color: "#991b1b" }}>
          <strong>Stop Case Reason:</strong>
          <p style={{ marginTop: "4px" }}>{request.stopReason}</p>
        </div>
      ) : null}

      {canAct ? (
        <div className="detail-actions">
          <button
            type="button"
            className="primary-button"
            onClick={handleApproveClick}
          >
            {role === pages.manager ? "Approve & Send to HOD" : "Approve Request"}
          </button>
          <button
            type="button"
            className="warning-button"
            onClick={() => setShowHrModal(true)}
          >
            HR Review
          </button>
        </div>
      ) : null}

      {(canHrStop || canHrEdit) ? (
        <div className="detail-actions">
          {canHrStop && (
            <button type="button" className="warning-button" onClick={() => setShowStopModal(true)}>
              Stop Case
            </button>
          )}
          {canHrEdit && (
            <button type="button" className="primary-button" onClick={() => onStartHrEdit(request.id)}>
              Edit and Re-submit
            </button>
          )}
        </div>
      ) : null}

      {showHrModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Request HR Review</h3>
                <p>Provide a reason for sending this request back to HR.</p>
              </div>
              <button className="ghost-button" onClick={() => setShowHrModal(false)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <div className="form-group">
                <label>Reason for Review</label>
                <textarea
                  required
                  value={hrReason}
                  onChange={(e) => setHrReason(e.target.value)}
                  placeholder="e.g. Please verify the personal email domain."
                  style={{ width: "100%", height: "100px", marginTop: "8px" }}
                  className="dashboard-search"
                />
              </div>
              <div className="detail-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="primary-button" onClick={handleHrReviewSubmit}>
                  Submit to HR
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowHrModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStopModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "400px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Stop Case</h3>
                <p>Provide the reason the employee backed out.</p>
              </div>
              <button className="ghost-button" onClick={() => setShowStopModal(false)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  required
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  placeholder="e.g. Employee declined onboarding after offer acceptance."
                  style={{ width: "100%", height: "100px", marginTop: "8px" }}
                  className="dashboard-search"
                />
              </div>
              <div className="detail-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="warning-button" onClick={handleStopCaseSubmit}>
                  Stop Case
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowStopModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!canAct && !isHrStep ? (
        <p className="detail-note">{stageMeta.description}</p>
      ) : null}
    </aside>
  );
}

export default RequestDetailPanel;
