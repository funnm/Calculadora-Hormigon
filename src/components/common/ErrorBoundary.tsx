import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Modulo no disponible.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Concrete Design Pro render error', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-6">
        <section className="pro-card max-w-xl w-full text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/10 dark:text-amber-300 dark:border-amber-900/40">
            <AlertTriangle size={28} />
          </div>
          <p className="label-tech">Proteccion de modulo</p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">No se pudo renderizar esta vista</h1>
          <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
            La aplicacion se mantuvo activa para evitar una pantalla blanca. Detalle tecnico: {this.state.message}
          </p>
          <button type="button" onClick={this.handleReset} className="pro-btn-primary mt-6 mx-auto">
            <RotateCcw size={18} /> Reintentar
          </button>
        </section>
      </main>
    );
  }
}
