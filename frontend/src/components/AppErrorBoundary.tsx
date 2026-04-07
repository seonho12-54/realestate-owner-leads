import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Downy frontend crashed", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-crash-shell">
        <section className="app-crash-card">
          <span className="eyebrow">Runtime Error</span>
          <h1 className="page-title page-title-medium">화면 렌더링 중 오류가 발생했습니다</h1>
          <p className="page-copy compact-copy">
            앱이 백지로 사라지지 않도록 오류를 잡아두었습니다. 아래 메시지를 보내주시면 다음 원인을 바로 이어서 잡을 수
            있습니다.
          </p>
          <div className="inline-diagnostic">
            <strong>오류 메시지</strong>
            <div>{this.state.error.message || "알 수 없는 런타임 오류"}</div>
          </div>
          <div className="button-row">
            <button type="button" className="button button-primary" onClick={this.handleReload}>
              새로고침
            </button>
          </div>
        </section>
      </div>
    );
  }
}
