import { Component } from "react";

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Page render failed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="dashboard-panel">
          <div className="request-empty">
            This page could not be rendered. Please refresh the page and try again.
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
