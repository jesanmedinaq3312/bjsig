import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { LoadingProvider } from "@/components/LoadingProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function BjsigApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmProvider>
            <LoadingProvider>
              <App />
            </LoadingProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
