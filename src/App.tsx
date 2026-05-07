import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { GestaoDataProvider } from "./context/GestaoDataContext";

function App() {
  return (
    <BrowserRouter>
      <GestaoDataProvider>
        <AppRoutes />
      </GestaoDataProvider>
    </BrowserRouter>
  );
}

export default App;
