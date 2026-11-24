import "./devtools/dev-bootstrap";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles/tokens.css";
import "./styles/shell.css";
import "./styles/headers.css";
import "./styles/login.css";
import "./styles/raid.css";
import "./styles/view-toggle.css";
import "./styles/ost.css";
import "./styles/usm.css";
import "./styles/side-modal.css";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { DevErrorBoundary } from "./devtools/DevErrorBoundary";
import { devLogger } from "./devtools/dev-logger";
import { DevProfiler } from "./devtools/DevProfiler";
import { theme } from "./theme";

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: devLogger.queryCacheOnError }),
  mutationCache: new MutationCache({ onError: devLogger.mutationCacheOnError }),
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } },
});

// Dev diagnostics context: the signed-in user's id and role only, read from the query cache.
devLogger.setContextProvider(() => {
  const me = queryClient.getQueryData<{ id: string; role: string } | null>(["me"]);
  return { user: me ? { id: me.id, role: me.role } : null };
});

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <DevProfiler id="root">
      <DevErrorBoundary>
        <MantineProvider theme={theme} forceColorScheme="light">
          <Notifications position="top-right" />
          <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </MantineProvider>
      </DevErrorBoundary>
    </DevProfiler>
  </StrictMode>,
);
