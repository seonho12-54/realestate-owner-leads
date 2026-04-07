import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "@/App";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { SessionProvider } from "@/context/SessionContext";

import "@/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppErrorBoundary>
      <SessionProvider>
        <App />
      </SessionProvider>
    </AppErrorBoundary>
  </BrowserRouter>,
);
