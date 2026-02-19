import { useRoutes, Navigate } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LogicPage from "./pages/LogicPage";
import ManualPage from "./pages/ManualPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import SettingsPage from "./pages/SettingsPage";
import { useAppSelector } from "./store";

const Protected = ({ children, roles }: { children: JSX.Element; roles?: string[] }) => {
  const { token, user } = useAppSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role ?? "")) return <Navigate to="/" replace />;
  return children;
};

export default function Router() {
  return useRoutes([
    { path: "/login", element: <LoginPage /> },
    { path: "/signup", element: <SignupPage /> },
    { path: "/forgot-password", element: <ForgotPasswordPage /> },
    {
      path: "/",
      element: (
        <Protected>
          <AppLayout />
        </Protected>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: "logic", element: <LogicPage /> },
        { path: "manual", element: <ManualPage /> },
        {
          path: "admin",
          element: (
            <Protected roles={["head_admin", "admin"]}>
              <AdminPanelPage />
            </Protected>
          ),
        },
        { path: "settings", element: <SettingsPage /> },
      ],
    },
  ]);
}
