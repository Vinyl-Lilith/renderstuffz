import { useAppSelector } from "./store";
import Router from "./routes";
import NotificationBell from "./components/notifications/NotificationBell";

function App() {
  const theme = useAppSelector((s) => s.ui.theme);
  return (
    <div data-theme={theme}>
      <NotificationBell />
      <Router />
    </div>
  );
}

export default App;
