import { Component, type ReactNode } from 'react';

interface Props {
  onError: (message: string) => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Turns a crash inside the 3D canvas into the shell's error state. */
export class CanvasErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error): void {
    this.props.onError(error.message ? `The 3D office stopped: ${error.message}` : 'The 3D office stopped.');
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
