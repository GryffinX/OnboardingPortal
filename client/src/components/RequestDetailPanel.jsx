import { useState, useRef } from "react";
import SoftwareSection from "./SoftwareSection";
import { pages, workflowStages } from "../constants";
import { getStageMeta, normalizeSoftwareList, validateGenericInput, validateCommentInput } from "../utils";

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
  userDepartment,
  allUsers = [],
  onApprove,
  onSendToHr,
  onSaveSoftware,
  onStartHrEdit,
  onStopCase,
  onDeleteRequest,
  onShowNotice,
}) {
  const [softwareDraft, setSoftwareDraft] = useState(() => getInitialSoftwareDraft(request, role));
  const [assetCodeDraft, setAssetCodeDraft] = useState(() => request?.assetCode || "");
  const [hodCommentDraft, setHodCommentDraft] = useState(() => request?.hodComment || "");
  
  const [infraAdminCommentDraft, setInfraAdminCommentDraft] = useState(() => request?.infraAdminComment || "");
  const [infraExecutiveDraft, setInfraExecutiveDraft] = useState(() => request?.infraExecutive?.id || "");
  const [laptopModelDraft, setLaptopModelDraft] = useState(() => request?.laptopModel || "");
  const [laptopRamDraft, setLaptopRamDraft] = useState(() => request?.laptopRam || "");
  const [laptopStorageDraft, setLaptopStorageDraft] = useState(() => request?.laptopStorage || "");
  const [laptopProcessorDraft, setLaptopProcessorDraft] = useState(() => request?.laptopProcessor || "");

  const [assetCodeError, setAssetCodeError] = useState("");
  const assetCodeRef = useRef(null);

  const [showHrModal, setShowHrModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [hrReason, setHrReason] = useState("");
  const [stopReason, setStopReason] = useState("");

  const [adminEmpCodeDraft, setAdminEmpCodeDraft] = useState(() => request?.employeeCode || "");
  const [adminAssetCodeDraft, setAdminAssetCodeDraft] = useState(() => request?.assetCode || "");

  const handleSaveAdminOverrides = () => {
    onSaveSoftware?.(request.id, [], pages.admin, {
      employeeCode: adminEmpCodeDraft,
      assetCode: adminAssetCodeDraft,
    });
  };

  const handleHrReviewSubmit = () => {
    const error = validateCommentInput(hrReason, "Reason");
    if (error) {
      onShowNotice?.("error", "Validation Error", error);
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
  const isInfraAdminStep = role === pages.infraAdmin && request.stage === workflowStages.infraAdmin;
  const isInfraExecutiveStep = role === pages.infraExecutive && request.stage === workflowStages.infraExecutive;
  const isHrDept = String(userDepartment).trim().toUpperCase() === "HR";
  const isHrRole = role === pages.hr;
  const isHrStep = isHrRole && request.stage === workflowStages.hr;
  const canAct = isManagerStep || isHodStep || isInfraAdminStep || isInfraExecutiveStep;
  const canHrStop = isHrDept && typeof onStopCase === "function" && request.stage !== workflowStages.approved && request.stage !== workflowStages.stopped;
  const canHrEdit = isHrDept && isHrStep && typeof onStartHrEdit === "function";

  const handleStopCaseSubmit = () => {
    const error = validateCommentInput(stopReason, "Reason");
    if (error) {
      onShowNotice?.("error", "Validation Error", error);
      return;
    }

    onStopCase?.(request.id, stopReason);
    setShowStopModal(false);
    setStopReason("");
  };

  const handleSaveManagerExtras = () => {
    if (!assetCodeDraft || !assetCodeDraft.trim()) {
      onShowNotice?.("error", "Validation Error", "Asset code is required.");
      return;
    }
    const error = validateGenericInput(assetCodeDraft, "Asset code");
    if (error) {
      onShowNotice?.("error", "Validation Error", error);
      return;
    }
    
    onSaveSoftware?.(request.id, normalizeSoftwareList(softwareDraft), role, {
      assetCode: assetCodeDraft,
    });
  };

  const handleSaveHodComment = () => {
    if (hodCommentDraft) {
      const error = validateCommentInput(hodCommentDraft, "Comment");
      if (error) {
        onShowNotice?.("error", "Validation Error", error);
        return;
      }
    }
    onSaveSoftware?.(request.id, [], role, {
      hodComment: hodCommentDraft,
    });
  };

  const handleSaveInfraAdminComment = () => {
    if (infraAdminCommentDraft) {
      const error = validateCommentInput(infraAdminCommentDraft, "Comment");
      if (error) {
        onShowNotice?.("error", "Validation Error", error);
        return;
      }
    }
    if (!infraExecutiveDraft) {
      onShowNotice?.("error", "Validation Error", "Please assign an Infrastructure Executive.");
      return;
    }
    onSaveSoftware?.(request.id, [], role, {
      infraAdminComment: infraAdminCommentDraft,
      infraExecutive: infraExecutiveDraft,
    });
  };

  const handleSaveInfraExecutiveSpecs = () => {
    const errorModel = validateGenericInput(laptopModelDraft, "Laptop Model");
    const errorRam = validateGenericInput(laptopRamDraft, "Laptop RAM");
    const errorStorage = validateGenericInput(laptopStorageDraft, "Laptop Storage");
    const errorProcessor = validateGenericInput(laptopProcessorDraft, "Laptop Processor");
    
    if (errorModel || errorRam || errorStorage || errorProcessor) {
      onShowNotice?.("error", "Validation Error", errorModel || errorRam || errorStorage || errorProcessor);
      return;
    }
    
    onSaveSoftware?.(request.id, [], role, {
      laptopModel: laptopModelDraft,
      laptopRam: laptopRamDraft,
      laptopStorage: laptopStorageDraft,
      laptopProcessor: laptopProcessorDraft,
    });
  };

  const handleApproveClick = () => {
    if (role === pages.manager) {
      if (!request.assetCode && !assetCodeDraft) {
        setAssetCodeError("Asset code is required before approval.");
        assetCodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (assetCodeDraft && assetCodeDraft !== request.assetCode) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Software and Asset Code' before approving.");
        return;
      }
    }

    if (role === pages.hod) {
      if (!request.hodComment && !hodCommentDraft) {
        onShowNotice?.("error", "Validation Error", "An approval comment is required.");
        return;
      }
      if (hodCommentDraft && hodCommentDraft !== request.hodComment) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Comment' before approving.");
        return;
      }
    }
    
    if (role === pages.infraAdmin) {
      if (!request.infraExecutive && !infraExecutiveDraft) {
        onShowNotice?.("error", "Validation Error", "An Infrastructure Executive assignment is required.");
        return;
      }
      if (infraExecutiveDraft && infraExecutiveDraft !== request.infraExecutive?.id) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Assignment & Comment' before approving.");
        return;
      }
    }
    
    if (role === pages.infraExecutive) {
      if (!request.laptopModel || !request.laptopRam || !request.laptopStorage || !request.laptopProcessor) {
        onShowNotice?.("error", "Validation Error", "All laptop specifications must be saved before approving.");
        return;
      }
      if (
        laptopModelDraft !== request.laptopModel || 
        laptopRamDraft !== request.laptopRam || 
        laptopStorageDraft !== request.laptopStorage || 
        laptopProcessorDraft !== request.laptopProcessor
      ) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Specifications' before approving.");
        return;
      }
    }

    setAssetCodeError("");
    onApprove(request.id);
  };

  const displayAssetCodeError = request?.assetCode ? "" : assetCodeError;

  return (
    <aside className="detail-panel">
      <div className="detail-top">
        <div>
          <h3>{request.formData.name}</h3>
          <p>{request.requestCode} {request.employeeCode ? `| ${request.employeeCode}` : ""}</p>
        </div>
        <span className={`status-pill status-pill-${stageMeta.tone}`}>
          {stageMeta.label}
        </span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Employee Code</span>
          <strong>{request.employeeCode || "Pending Assignment"}</strong>
        </div>
        <div>
          <span>Phone Number</span>
          <strong>{request.formData.employeePhoneNumber}</strong>
        </div>
        <div>
          <span>Personal Email</span>
          <strong>{request.formData.personalEmail}</strong>
        </div>
        <div>
          <span>Proposed Official Email</span>
          <strong>{request.officialEmail}</strong>
        </div>
        <div>
          <span>Line Manager</span>
          <strong>{request.formData.lineManager} {request.formData.lineManagerCode ? `(${request.formData.lineManagerCode})` : ""}</strong>
        </div>
        <div>
          <span>HOD</span>
          <strong>{request.formData.hod} {request.formData.hodCode ? `(${request.formData.hodCode})` : ""}</strong>
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
          <strong style={displayAssetCodeError ? { color: "#ef4444" } : {}}>
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

      {role === pages.admin && (
        <section className="software-input-card" style={{ borderTop: "2px solid #102a43", background: "#f8fafc" }}>
          <h4>Admin Institutional Overrides</h4>
          <p>Directly modify unique identifiers. Changes will sync with user profiles where applicable.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
            <div className="form-group">
              <label>Employee Code</label>
              <input
                type="text"
                className="dashboard-search"
                value={adminEmpCodeDraft}
                onChange={(e) => setAdminEmpCodeDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1001"
                maxLength={4}
              />
            </div>
            <div className="form-group">
              <label>Asset Code</label>
              <input
                type="text"
                className="dashboard-search"
                value={adminAssetCodeDraft}
                onChange={(e) => setAdminAssetCodeDraft(e.target.value.slice(0, 100))}
                placeholder="LP-XXX"
                maxLength={100}
              />
            </div>
          </div>
          <div className="detail-actions detail-actions-compact" style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={handleSaveAdminOverrides}
              style={{ background: "#102a43" }}
            >
              Save Institutional Overrides
            </button>
          </div>
        </section>
      )}

      {canAct && (
        <section className="software-input-card">
          <h4>
            {role === pages.manager ? "Add/Edit Software List" : 
             role === pages.hod ? "Add comments" : 
             role === pages.infraAdmin ? "Assign Infrastructure Executive" : 
             role === pages.infraExecutive ? "Assign Hardware Specifications" : ""}
          </h4>
          <p>
            {role === pages.manager ? "List any additional software and asset code needed for this employee." : 
             role === pages.hod ? "Add a comment for approval." : 
             role === pages.infraAdmin ? "Provide instructions and assign an executive for hardware provisioning." : 
             role === pages.infraExecutive ? "Enter the specifications of the assigned laptop." : ""}
          </p>
          {role === pages.manager && (
            <>
              <textarea
                value={softwareDraft}
                onChange={(event) => setSoftwareDraft(event.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 500))}
                placeholder="Example: Tableau, Figma, Adobe Acrobat"
                maxLength={500}
              />
              <div ref={assetCodeRef} style={{ position: "relative", marginTop: "12px" }}>
                <input
                  type="text"
                  className="dashboard-search"
                  style={{ 
                    width: "100%",
                    border: displayAssetCodeError ? "1px solid #ef4444" : "1px solid #e2e8f0"
                  }}
                  value={assetCodeDraft}
                  onChange={(event) => {
                    setAssetCodeDraft(event.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 100));
                    if (assetCodeError) setAssetCodeError("");
                  }}
                  placeholder="Asset code"
                  maxLength={100}
                />
                {displayAssetCodeError && (
                  <div style={{ 
                    color: "#ef4444", 
                    fontSize: "0.8rem", 
                    marginTop: "4px",
                    fontWeight: "500" 
                  }}>
                    {displayAssetCodeError}
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
          )}

          {role === pages.hod && (
            <>
              <textarea
                value={hodCommentDraft}
                onChange={(event) => setHodCommentDraft(event.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 500))}
                placeholder="Add approval comment"
                maxLength={500}
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

          {role === pages.infraAdmin && (
            <>
              <textarea
                value={infraAdminCommentDraft}
                onChange={(event) => setInfraAdminCommentDraft(event.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 500))}
                placeholder="Add instructions for the Infra Executive"
                maxLength={500}
              />
              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Assign Executive
                </label>
                <select
                  className="dashboard-search"
                  value={infraExecutiveDraft}
                  onChange={(e) => setInfraExecutiveDraft(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">-- Select Executive --</option>
                  {allUsers
                    .filter(u => u.role === "Infrastructure Executive" && u.isActive)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.employeeCode ? `(${u.employeeCode})` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="detail-actions detail-actions-compact">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveInfraAdminComment}
                >
                  Save Assignment & Comment
                </button>
              </div>
            </>
          )}

          {role === pages.infraExecutive && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Laptop Model</label>
                  <input
                    type="text"
                    className="dashboard-search"
                    value={laptopModelDraft}
                    onChange={(e) => setLaptopModelDraft(e.target.value.slice(0, 100))}
                    placeholder="e.g. ThinkPad T14"
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label>Processor</label>
                  <input
                    type="text"
                    className="dashboard-search"
                    value={laptopProcessorDraft}
                    onChange={(e) => setLaptopProcessorDraft(e.target.value.slice(0, 100))}
                    placeholder="e.g. Intel Core i7"
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label>RAM</label>
                  <input
                    type="text"
                    className="dashboard-search"
                    value={laptopRamDraft}
                    onChange={(e) => setLaptopRamDraft(e.target.value.slice(0, 50))}
                    placeholder="e.g. 16GB DDR4"
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label>Storage</label>
                  <input
                    type="text"
                    className="dashboard-search"
                    value={laptopStorageDraft}
                    onChange={(e) => setLaptopStorageDraft(e.target.value.slice(0, 50))}
                    placeholder="e.g. 512GB SSD"
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="detail-actions detail-actions-compact" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveInfraExecutiveSpecs}
                >
                  Save Specifications
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
                  onChange={(e) => setHrReason(e.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 500))}
                  placeholder="e.g. Please verify the personal email domain."
                  style={{ width: "100%", height: "100px", marginTop: "8px" }}
                  className="dashboard-search"
                  maxLength={500}
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
                  onChange={(e) => setStopReason(e.target.value.replace(/[%:;"'<>(){}[\]|\\~`^!*+?]/g, "").slice(0, 500))}
                  placeholder="e.g. Employee declined onboarding after offer acceptance."
                  style={{ width: "100%", height: "100px", marginTop: "8px" }}
                  className="dashboard-search"
                  maxLength={500}
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

      {role === pages.admin && onDeleteRequest && (
        <div className="detail-actions" style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
          <button 
            type="button" 
            className="warning-button" 
            style={{ width: "100%", background: "#ef4444" }}
            onClick={() => onDeleteRequest(request.id)}
          >
            Delete Permanently from Database
          </button>
        </div>
      )}
    </aside>
  );
}

export default RequestDetailPanel;
