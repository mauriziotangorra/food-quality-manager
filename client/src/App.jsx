import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { ModalProvider } from "./context/ModalContext";
import ModalHost from "./components/ModalHost";
import PortalRouter from "./pages/PortalRouter";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ModalProvider>
          <BrowserRouter>
            <PortalRouter />
          </BrowserRouter>
          <ModalHost />
        </ModalProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
