import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureAmplify } from "./lib/amplify.ts";

// Configure Amplify before rendering the app
configureAmplify();

createRoot(document.getElementById("root")!).render(<App />);
