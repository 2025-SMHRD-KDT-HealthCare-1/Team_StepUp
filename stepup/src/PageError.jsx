// src/PageError.jsx
import React from "react";

export default class PageError extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, err: error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#ffe0e0", padding: "12px" }}>
          이 화면을 그리다가 에러가 났어요.
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.err && this.state.err.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
