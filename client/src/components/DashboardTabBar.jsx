function DashboardTabBar({ tabs, activeTab, onTabChange, className = "", style = {} }) {
  if (!tabs?.length) return null;

  return (
    <div className={`dashboard-tabs ${className}`.trim()} style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`dashboard-tab ${activeTab === tab.key ? "dashboard-tab-active" : ""}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
          {tab.badge > 0 ? <span className="dashboard-tab-badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export default DashboardTabBar;
