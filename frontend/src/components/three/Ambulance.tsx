import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ProceduralAmbulance, ProceduralAmbulanceProps } from './ProceduralAmbulance';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AmbulanceErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Ambulance 3D model error boundary caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const Ambulance: React.FC<ProceduralAmbulanceProps> = (props) => {
  return (
    <AmbulanceErrorBoundary fallback={<ProceduralAmbulance {...props} />}>
      <ProceduralAmbulance {...props} />
    </AmbulanceErrorBoundary>
  );
};

export default Ambulance;
