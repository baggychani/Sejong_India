import { Component, type ReactNode } from "react";

/** Shows a recoverable message instead of a blank page when a page fails to load or render. */
export class LoadErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <article className="reading" role="alert">
        <h1>페이지를 불러오지 못했습니다</h1>
        <p className="lede">
          사이트가 새로 배포되었거나 연결이 끊겼을 수 있습니다.{" "}
          <button type="button" className="text-button" onClick={() => location.reload()}>새로고침</button>
        </p>
      </article>
    );
  }
}
