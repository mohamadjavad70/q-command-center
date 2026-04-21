import { createRoot } from "react-dom/client";
import { installGlobalGuards } from "./lib/globalGuards";
import App from "./App.tsx";
import "./index.css";

// نصب محافظ‌های جهانی قبل از رندر
installGlobalGuards();

createRoot(document.getElementById("root")!).render(<App />);
