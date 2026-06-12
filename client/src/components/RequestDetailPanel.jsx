import { useState, useEffect } from "react";
import { api } from "../services/api";
import SoftwareSection from "./SoftwareSection";
import { pages, workflowStages } from "../constants";
import { 
  getStageMeta, 
  normalizeSoftwareList,
  validateCommentInput,
  cleanTextInput,
  cleanCommentInput,
  cleanNumericInput
} from "../utils";

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
  onAcknowledgeLaptop,
}) {
  const [softwareDraft, setSoftwareDraft] = useState(() => getInitialSoftwareDraft(request, role));
  const [assetCodeDraft, setAssetCodeDraft] = useState(() => request?.assetCode || "");
  const [hodCommentDraft, setHodCommentDraft] = useState(() => request?.hodComment || "");
  const [dateOfJoiningDraft, setDateOfJoiningDraft] = useState(() => request?.dateOfJoining || "");
  
  const [infraAdminCommentDraft, setInfraAdminCommentDraft] = useState(() => request?.infraAdminComment || "");
  const [infraAdminDraft, setInfraAdminDraft] = useState(() => request?.infraAdmin?.id || "");
  const [infraExecutiveDraft, setInfraExecutiveDraft] = useState(() => request?.infraExecutive?.id || "");
  const [laptopModelDraft, setLaptopModelDraft] = useState(() => request?.laptopModel || "");
  const [laptopRamDraft, setLaptopRamDraft] = useState(() => request?.laptopRam || "");
  const [laptopStorageDraft, setLaptopStorageDraft] = useState(() => request?.laptopStorage || "");
  const [laptopProcessorDraft, setLaptopProcessorDraft] = useState(() => request?.laptopProcessor || "");
  const [laptopGpuDraft, setLaptopGpuDraft] = useState(() => request?.laptopGpu || "");

  const [adminEmpCodeDraft, setAdminEmpCodeDraft] = useState(() => request?.employeeCode || "");
  const [adminAssetCodeDraft, setAdminAssetCodeDraft] = useState(() => request?.assetCode || "");

  const [assetInventory, setAssetInventory] = useState([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [newInventoryAsset, setNewInventoryAsset] = useState({ assetCode: '', laptopModel: '', laptopProcessor: '', laptopRam: '', laptopStorage: '', laptopGpu: '' });

  useEffect(() => {
    if (role === pages.infraExecutive) {
      const loadAssets = async () => {
        const { ok, data } = await api.getAssets();
        if (ok) setAssetInventory(data.assets || []);
      };
      loadAssets();
    }
  }, [role]);

  const filteredAssets = assetInventory.filter(a => 
    (a.assetCode.toLowerCase().includes(assetSearch.toLowerCase()) || 
     a.laptopModel.toLowerCase().includes(assetSearch.toLowerCase()))
  );

  const handleSelectAsset = (asset) => {
    setAssetCodeDraft(asset.assetCode);
    setLaptopModelDraft(asset.laptopModel);
    setLaptopProcessorDraft(asset.laptopProcessor);
    setLaptopRamDraft(asset.laptopRam);
    setLaptopStorageDraft(asset.laptopStorage);
    setLaptopGpuDraft(asset.laptopGpu);
    setAssetSearch(asset.assetCode);
    setIsAssetDropdownOpen(false);
  };

  const handleCreateAndSelectAsset = async (e) => {
    e.preventDefault();
    const { ok, data } = await api.createAsset(newInventoryAsset);
    if (ok) {
      const createdAsset = { ...newInventoryAsset, id: data.asset.id };
      handleSelectAsset(createdAsset);
      setShowNewAssetModal(false);
      setNewInventoryAsset({ assetCode: '', laptopModel: '', laptopProcessor: '', laptopRam: '', laptopStorage: '', laptopGpu: '' });
      // Refresh inventory in background
      const { ok: refreshOk, data: refreshData } = await api.getAssets();
      if (refreshOk) setAssetInventory(refreshData.assets || []);
    } else {
      onShowNotice?.("error", "Error", data.message);
    }
  };

  const [showHrModal, setShowHrModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [hrReason, setHrReason] = useState("");
  const [stopReason, setStopReason] = useState("");

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

    let actorLabel = "HOD";
    if (role === pages.manager) actorLabel = "Line Manager";
    else if (role === pages.infraAdmin) actorLabel = "Infrastructure Admin";
    else if (role === pages.infraExecutive) actorLabel = "Infrastructure Executive";

    onSendToHr(request.id, actorLabel, hrReason);
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
  const isEmployee = role === pages.status;
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
    onSaveSoftware?.(request.id, normalizeSoftwareList(softwareDraft), role, {
      dateOfJoining: dateOfJoiningDraft,
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
    if (!infraAdminDraft) {
      onShowNotice?.("error", "Validation Error", "Please assign an Infrastructure Admin.");
      return;
    }
    onSaveSoftware?.(request.id, [], role, {
      hodComment: hodCommentDraft,
      infraAdminId: infraAdminDraft,
    });
  };

  const handleSaveInfraAdminComment = () => {
    const error = validateCommentInput(infraAdminCommentDraft, "Comment");
    if (error) {
      onShowNotice?.("error", "Validation Error", error);
      return;
    }
    if (!infraExecutiveDraft) {
      onShowNotice?.("error", "Validation Error", "Please assign an Infrastructure Executive.");
      return;
    }
    onSaveSoftware?.(request.id, normalizeSoftwareList(softwareDraft), role, {
      infraAdminComment: infraAdminCommentDraft,
      infraExecutive: infraExecutiveDraft,
      employeeCode: adminEmpCodeDraft,
      assetCode: assetCodeDraft,
    });
  };

  const handleApproveClick = () => {
    if (role === pages.manager) {
      // Asset code assignment is no longer done by Manager
    }

    if (role === pages.hod) {
      if (!request.hodComment && !hodCommentDraft) {
        onShowNotice?.("error", "Validation Error", "An approval comment is required.");
        return;
      }
      if (hodCommentDraft && hodCommentDraft !== request.hodComment) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Comment & Assignment' before approving.");
        return;
      }
      if (!request.infraAdmin && !infraAdminDraft) {
        onShowNotice?.("error", "Validation Error", "An Infrastructure Admin assignment is required.");
        return;
      }
      if (infraAdminDraft && String(infraAdminDraft) !== String(request.infraAdmin?.id || "")) {
        onShowNotice?.("error", "Validation Error", "Please click 'Save Comment & Assignment' before approving.");
        return;
      }
    }
    
    if (role === pages.infraAdmin) {
      if (!request.infraExecutive && !infraExecutiveDraft) {
        onShowNotice?.("error", "Validation Error", "An Infrastructure Executive assignment is required.");
        return;
      }
      if (infraExecutiveDraft && String(infraExecutiveDraft) !== String(request.infraExecutive?.id || "")) {
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

    onApprove(request.id);
  };

  const displayAssetCodeError = "";

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
          <strong>{request.employeeCode || "N/A"}</strong>
        </div>
        <div>
          <span>Date of Joining</span>
          <strong>{request.dateOfJoining || "N/A"}</strong>
        </div>
        <div>
          <span>Phone Number</span>
          <strong>{request.formData.employeePhoneNumber || "N/A"}</strong>
        </div>
        <div>
          <span>Personal Email</span>
          <strong>{request.formData.personalEmail || "N/A"}</strong>
        </div>
        <div>
          <span>Proposed Official Email</span>
          <strong>{request.officialEmail || "N/A"}</strong>
        </div>
        <div>
          <span>Line Manager</span>
          <strong>{request.formData.lineManager || "N/A"} {request.formData.lineManagerCode ? `(${request.formData.lineManagerCode})` : ""}</strong>
        </div>
        <div>
          <span>HOD Name</span>
          <strong>{request.formData.hod || "N/A"} {request.formData.hodCode ? `(${request.formData.hodCode})` : ""}</strong>
        </div>
        <div>
          <span>Infra Admin Name</span>
          <strong>{request.infraAdmin?.name || "N/A"} {request.infraAdmin?.employeeCode ? `(${request.infraAdmin.employeeCode})` : ""}</strong>
        </div>
        <div>
          <span>Infra Executive Name</span>
          <strong>{request.infraExecutive?.name || "N/A"} {request.infraExecutive?.employeeCode ? `(${request.infraExecutive.employeeCode})` : ""}</strong>
        </div>
        <div>
          <span>Department</span>
          <strong>{request.formData.department || "N/A"}</strong>
        </div>
        <div>
          <span>Revision Count</span>
          <strong>{request.revisionCount}</strong>
        </div>
        <div>
          <span>Asset Code</span>
          <strong style={displayAssetCodeError ? { color: "#ef4444" } : {}}>
            {request.assetCode || "N/A"}
          </strong>
        </div>
        {!isEmployee && (
          <>
            <div>
              <span>HOD Comment</span>
              <strong>{request.hodComment || "No Comment"}</strong>
            </div>
            <div>
              <span>Infra Admin Comment</span>
              <strong>{request.infraAdminComment || "No Comment"}</strong>
            </div>
          </>
        )}
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

      {request.laptopModel && (
        <section className="software-input-card" style={{ borderTop: "2px solid #10b981", background: "#f0fdf4" }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0 }}>Assigned Hardware Specifications</h4>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#15803d', padding: '4px 10px', textTransform: 'uppercase'}}>
              {request.infraExecutive?.name || "N/A"}
            </span>
          </div>
          <p>Details of the laptop assigned by the Infrastructure team.</p>
          <div className="detail-grid" style={{ marginTop: "16px", borderBottom: "none", paddingBottom: 0 }}>
            <div><span>Laptop Model</span><strong>{request.laptopModel}</strong></div>
            <div><span>Processor</span><strong>{request.laptopProcessor}</strong></div>
            <div><span>RAM</span><strong>{request.laptopRam}</strong></div>
            <div><span>Storage</span><strong>{request.laptopStorage}</strong></div>
            <div><span>GPU</span><strong>{request.laptopGpu || "N/A"}</strong></div>
          </div>
          {isEmployee && !request.laptopAcknowledged && (
            <div className="detail-actions" style={{ marginTop: "24px" }}>
              <button 
                type="button" 
                className="primary-button" 
                style={{ background: "#10b981", width: "100%" }}
                onClick={() => onAcknowledgeLaptop?.(request.id)}
              >
                Acknowledge Receipt of Laptop
              </button>
            </div>
          )}
          {request.laptopAcknowledged && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#dcfce7", color: "#166534", borderRadius: "8px", textAlign: "center", fontWeight: "600" }}>
              ✓ Laptop receipt acknowledged.
            </div>
          )}
        </section>
      )}

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
                onChange={(e) => setAdminEmpCodeDraft(cleanNumericInput(e.target.value, 4))}
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
                onChange={(e) => setAdminAssetCodeDraft(cleanTextInput(e.target.value, 20))}
                placeholder="LP-XXX"
                maxLength={20}
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
                onChange={(event) => setSoftwareDraft(cleanCommentInput(event.target.value, 500))}
                placeholder="Example: Tableau, Figma, Adobe Acrobat"
                maxLength={500}
              />
              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Date of Joining
                </label>
                <input
                  type="date"
                  className="dashboard-search"
                  style={{ width: "100%" }}
                  value={dateOfJoiningDraft}
                  onChange={(event) => setDateOfJoiningDraft(event.target.value)}
                />
              </div>
              <div className="detail-actions detail-actions-compact" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSaveManagerExtras}
                >
                  Save Software and Date of Joining
                </button>
              </div>
            </>
          )}

          {role === pages.hod && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <textarea
                  value={hodCommentDraft}
                  onChange={(event) => setHodCommentDraft(cleanCommentInput(event.target.value, 500))}
                  placeholder="Add approval comment"
                  maxLength={500}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Assign Infrastructure Admin
                </label>
                <select
                  className="dashboard-search"
                  value={infraAdminDraft}
                  onChange={(e) => setInfraAdminDraft(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">-- Select Infra Admin --</option>
                  {allUsers
                    .filter(u => u.role === "Infrastructure Admin" && u.isActive)
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
                  onClick={handleSaveHodComment}
                >
                  Save Comment & Assignment
                </button>
              </div>
            </>
          )}

          {role === pages.infraAdmin && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Edit Software List
                </label>
                <textarea
                  value={softwareDraft}
                  onChange={(event) => setSoftwareDraft(cleanCommentInput(event.target.value, 500))}
                  placeholder="Example: Tableau, Figma, Adobe Acrobat"
                  maxLength={500}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div className="form-group">
                  <label>Employee Code (Optional)</label>
                  <input
                    type="text"
                    className="dashboard-search"
                    value={adminEmpCodeDraft}
                    onChange={(e) => setAdminEmpCodeDraft(cleanNumericInput(e.target.value, 4))}
                    placeholder="Auto-generated if blank"
                    maxLength={4}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Instructions for Infra Executive
                </label>
                <textarea
                  value={infraAdminCommentDraft}
                  onChange={(event) => setInfraAdminCommentDraft(cleanCommentInput(event.target.value, 500))}
                  placeholder="Add instructions for the Infra Executive"
                  maxLength={500}
                />
              </div>

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
                  Save Details & Assignment
                </button>
              </div>
            </>
          )}

          {role === pages.infraExecutive && (
            <>
              <div style={{ marginBottom: "20px", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", fontWeight: "600", color: "#475569" }}>
                  Search & Select Asset Code
                </label>
                <input
                  type="text"
                  className="dashboard-search"
                  style={{ width: "100%", paddingRight: "40px" }}
                  value={assetSearch}
                  onChange={(e) => {
                    setAssetSearch(e.target.value);
                    setIsAssetDropdownOpen(true);
                  }}
                  onFocus={() => setIsAssetDropdownOpen(true)}
                  placeholder="Type to search asset code or laptop model..."
                />
                <button 
                  type="button" 
                  className="ghost-button" 
                  style={{ position: "absolute", right: "8px", top: "32px", padding: "4px" }}
                  onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                >
                  {isAssetDropdownOpen ? "▲" : "▼"}
                </button>

                {isAssetDropdownOpen && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    maxHeight: "250px",
                    overflowY: "auto",
                    marginTop: "4px"
                  }}>
                    <div 
                      style={{ padding: "12px 16px", cursor: "pointer", borderBottom: "2px solid #f1f5f9", color: "#2563eb", fontWeight: "600", background: "#eff6ff" }}
                      onClick={() => { setShowNewAssetModal(true); setIsAssetDropdownOpen(false); }}
                    >
                      + Create & Assign New Asset
                    </div>
                    {filteredAssets.length === 0 ? (
                      <div style={{ padding: "12px", color: "#64748b", textAlign: "center" }}>No matching assets found.</div>
                    ) : (
                      filteredAssets.map(asset => (
                        <div 
                          key={asset.id} 
                          style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                          onClick={() => handleSelectAsset(asset)}
                          className="asset-option-hover"
                        >
                          <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{asset.assetCode} {asset.isAssigned ? "(Already Assigned)" : ""}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{asset.laptopModel} | {asset.laptopProcessor} | {asset.laptopRam} | {asset.laptopStorage}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div className="form-group">
                  <label>Selected Model</label>
                  <input type="text" className="dashboard-search" value={laptopModelDraft} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </div>
                <div className="form-group">
                  <label>Processor</label>
                  <input type="text" className="dashboard-search" value={laptopProcessorDraft} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </div>
                <div className="form-group">
                  <label>RAM</label>
                  <input type="text" className="dashboard-search" value={laptopRamDraft} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </div>
                <div className="form-group">
                  <label>Storage</label>
                  <input type="text" className="dashboard-search" value={laptopStorageDraft} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>GPU</label>
                  <input type="text" className="dashboard-search" value={laptopGpuDraft} readOnly style={{ background: "#f1f5f9", cursor: "not-allowed" }} />
                </div>
              </div>
              
              <div className="detail-actions detail-actions-compact" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onSaveSoftware?.(request.id, [], role, {
                      assetCode: assetCodeDraft,
                      laptopModel: laptopModelDraft,
                      laptopRam: laptopRamDraft,
                      laptopStorage: laptopStorageDraft,
                      laptopProcessor: laptopProcessorDraft,
                      laptopGpu: laptopGpuDraft,
                    });
                  }}
                >
                  Save Assigned Asset
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
                  onChange={(e) => setHrReason(cleanCommentInput(e.target.value, 500))}
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
                  onChange={(e) => setStopReason(cleanCommentInput(e.target.value, 500))}
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

      {showNewAssetModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ width: "450px" }}>
            <div className="modal-topbar">
              <div>
                <h3>Create & Assign New Asset</h3>
                <p>Register new hardware and link it to this candidate</p>
              </div>
              <button className="ghost-button" onClick={() => setShowNewAssetModal(false)}>✕</button>
            </div>
            <div style={{ padding: "24px" }}>
              <form onSubmit={handleCreateAndSelectAsset} style={{ display: "grid", gap: "16px" }}>
                <div className="form-group">
                  <label>Asset Code (Unique Machine ID)</label>
                  <input 
                    type="text" required 
                    value={newInventoryAsset.assetCode} 
                    onChange={(e) => setNewInventoryAsset({...newInventoryAsset, assetCode: cleanTextInput(e.target.value, 20)})} 
                    className="dashboard-search" placeholder="e.g. SEC-LP-105" maxLength={20} 
                  />
                </div>
                <div className="form-group">
                  <label>Laptop Model</label>
                  <input 
                    type="text" required 
                    value={newInventoryAsset.laptopModel} 
                    onChange={(e) => setNewInventoryAsset({...newInventoryAsset, laptopModel: cleanTextInput(e.target.value, 100)})} 
                    className="dashboard-search" placeholder="e.g. ThinkPad P1 Gen 6" maxLength={100} 
                  />
                </div>
                <div className="form-group">
                  <label>Processor</label>
                  <input 
                    type="text" required 
                    value={newInventoryAsset.laptopProcessor} 
                    onChange={(e) => setNewInventoryAsset({...newInventoryAsset, laptopProcessor: cleanTextInput(e.target.value, 100)})} 
                    className="dashboard-search" placeholder="e.g. Intel Core i9" maxLength={100} 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label>RAM</label>
                    <input 
                      type="text" required 
                      value={newInventoryAsset.laptopRam} 
                      onChange={(e) => setNewInventoryAsset({...newInventoryAsset, laptopRam: cleanTextInput(e.target.value, 20)})} 
                      className="dashboard-search" placeholder="32GB" maxLength={20} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Storage</label>
                    <input 
                      type="text" required 
                      value={newInventoryAsset.laptopStorage} 
                      onChange={(e) => setNewInventoryAsset({...newInventoryAsset, laptopStorage: cleanTextInput(e.target.value, 20)})} 
                      className="dashboard-search" placeholder="1TB SSD" maxLength={20} 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>GPU</label>
                  <input 
                    type="text" 
                    value={newInventoryAsset.laptopGpu} 
                    onChange={(e) => setNewInventoryAsset({...newInventoryAsset, laptopGpu: cleanTextInput(e.target.value, 100)})} 
                    className="dashboard-search" placeholder="e.g. NVIDIA RTX A2000" maxLength={100} 
                  />
                </div>
                <div className="detail-actions" style={{ marginTop: "16px" }}>
                  <button type="submit" className="primary-button">Create and Select</button>
                  <button type="button" className="secondary-button" onClick={() => setShowNewAssetModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default RequestDetailPanel;
