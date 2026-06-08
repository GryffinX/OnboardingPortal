import { useEffect } from "react";

function AppNotice({ notice, onClear }) {
  useEffect(() => {
    if (!notice) return;
    
    const timer = setTimeout(() => {
      onClear();
    }, 1500);

    return () => clearTimeout(timer);
  }, [notice, onClear]);

  if (!notice) {
    return null;
  }

  return (
    <div className={`app-notice app-notice-${notice.type}`}>
      <div className="app-notice-content">
        <div className="app-notice-text">
          <strong>{notice.title}</strong>
          <p>{notice.message}</p>
        </div>
        <button type="button" className="ghost-button app-notice-close" onClick={onClear}>
          ✕
        </button>
      </div>
      <div className="app-notice-progress">
        <div className="app-notice-progress-bar"></div>
      </div>
    </div>
  );
}

export default AppNotice;
