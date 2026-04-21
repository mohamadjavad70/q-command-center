import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/routes";
import { AppErrorBoundary } from "@/lib/AppErrorBoundary";

const App = () => (
  <AppErrorBoundary moduleName="Q Command Center">
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </AppErrorBoundary>
);

export default App;
