import { useState } from "react";
import DashboardTabBar from "./components/DashboardTabBar";
import HRForm from "./HRForm";
import RequestTable from "./components/RequestTable";
import RequestDetailPanel from "./components/RequestDetailPanel";
import { pages } from "./constants";

const HRDashboard = ({
  requests,
  currentUser,
  allUsers,
  workflowOptions,
  selectedRequestId,
  onSelectRequest,
  onShowNotice,
  onSubmitForm,
  onApprove,
  onSendToHr,
  onStopCase,
  onSaveSoftware,
  onStartHrEdit,
  editingHrRequestId,
  setEditingHrRequestId,
  queueTabConfig,
  visibleRequests,
  searchTerm,
  onSearchChange,
  getQueueTitle,
  getQueueSubtitle
}) => {
  // Tabs: queue (Review Queue), submit (New Onboarding)
  const [activeTab, setActiveTab] = useState(editingHrRequestId ? "submit" : "queue");

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "queue" && editingHrRequestId) {
        setEditingHrRequestId(null);
    }
  };

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || null;

  return (
    <div className="hr-dashboard">
      <DashboardTabBar
        tabs={[
          { key: "queue", label: "Review Queue", badge: queueTabConfig.tabs.find(t => t.key === 'hr_review')?.badge || 0 },
          { key: "submit", label: editingHrRequestId ? "Edit Request" : "New Onboarding" },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {activeTab === "queue" && (
        <div style={{ marginTop: 20 }}>
          {queueTabConfig.tabs.length > 0 && (
            <DashboardTabBar
              tabs={queueTabConfig.tabs}
              activeTab={queueTabConfig.activeTab}
              onTabChange={queueTabConfig.onTabChange}
              style={{ marginBottom: 20 }}
            />
          )}
          <div className="dashboard-layout" style={{ marginTop: queueTabConfig.tabs.length ? 0 : 20 }}>
            <RequestDetailPanel
              key={`${selectedRequest?.id}-${selectedRequest?.revisionCount || 0}`}
              request={selectedRequest}
              role={pages.hr}
              userDepartment={currentUser?.department}
              allUsers={allUsers}
              onShowNotice={onShowNotice}
              onSaveSoftware={onSaveSoftware}
              onStartHrEdit={(id) => {
                onStartHrEdit(id);
                setActiveTab("submit");
              }}
              onApprove={onApprove}
              onSendToHr={onSendToHr}
              onStopCase={onStopCase}
            />
            <RequestTable
              title={getQueueTitle()}
              subtitle={getQueueSubtitle()}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              requests={visibleRequests}
              selectedRequestId={selectedRequestId}
              onSelectRequest={onSelectRequest}
            />
          </div>
        </div>
      )}

      {activeTab === "submit" && (
        <section className="dashboard-panel">
          <div className="dashboard-head">
            <div>
              <h2>{editingHrRequestId ? "Edit Onboarding Request" : "Submit New Onboarding"}</h2>
              <p>{editingHrRequestId ? "Update details and re-submit to Manager" : "Initiate a new onboarding request for a team member"}</p>
            </div>
          </div>
          <HRForm
            key={editingHrRequestId || "new-onboarding"}
            apiBaseUrl={currentUser?.apiBaseUrl} // Assuming passed or available
            onShowNotice={onShowNotice}
            officialEmailDomain={workflowOptions.officialEmailDomain}
            onSubmitForm={async (data) => {
                const ok = await onSubmitForm(data);
                if (ok) {
                    setActiveTab("queue");
                }
            }}
            initialData={editingHrRequestId ? requests.find(r => r.id === editingHrRequestId)?.formData : null}
            onCancel={() => {
              if (editingHrRequestId) setEditingHrRequestId(null);
              setActiveTab("queue");
            }}
          />
        </section>
      )}
    </div>
  );
};

export default HRDashboard;
