import { createRoot } from "react-dom/client";
import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import App from "./App.tsx";
import "./index.css";

// ─── Guarda global no nível do root ──────────────────────────────────────────
// Impede que QUALQUER erro de render transforme o app em tela branca.
// Captura tudo que não foi tratado pelas ErrorBoundaries dos filhos.
class RootErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean; msg: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { crashed: false, msg: "" };
  }
  static getDerivedStateFromError(e: Error) {
    return { crashed: true, msg: e?.message ?? String(e) };
  }
  componentDidCatch(e: Error, info: ErrorInfo) {
    console.error("[RootErrorBoundary] erro fatal:", e, info);
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", padding: "2rem",
          fontFamily: "system-ui, sans-serif", textAlign: "center", gap: "1rem",
        }}>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <p style={{ fontWeight: 700, color: "#dc2626", fontSize: "1rem" }}>
            Ocorreu um erro inesperado
          </p>
          <pre style={{
            fontSize: "0.7rem", background: "#f3f4f6", padding: "0.75rem 1rem",
            borderRadius: "0.5rem", maxWidth: "500px", overflowX: "auto",
            color: "#374151", textAlign: "left", whiteSpace: "pre-wrap",
          }}>
            {this.state.msg}
          </pre>
          <button
            style={{
              background: "#164B6E", color: "white", border: "none",
              borderRadius: "0.5rem", padding: "0.5rem 1.5rem", cursor: "pointer",
              fontSize: "0.875rem",
            }}
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Handler global para Promises não capturadas ──────────────────────────────
// React 18 em dev mode reage a unhandledrejection desmontando o app.
// Este handler previne que promessas rejeitadas destruam a UI.
window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandledrejection] Promise rejeitada sem catch:", event.reason);
  event.preventDefault(); // impede que o React dev mode desmonte o app
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
