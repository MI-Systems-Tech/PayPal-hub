import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { getToken } from "./auth";

const Home = lazy(() => import("./Home"));
const Login = lazy(() => import("./Login"));
const Register = lazy(() => import("./Register"));
const Hub = lazy(() => import("./Hub"));
const Discover = lazy(() => import("./Discover"));
const Checkout = lazy(() => import("./Checkout").then((m) => ({ default: m.default })));
const PayPalReturn = lazy(() => import("./Checkout").then((m) => ({ default: m.PayPalReturn })));

const Guard = ({ children }) =>
  getToken() ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <Suspense
      fallback={
        <main className="hb ledger-page">
          <p className="ledger-method">Loading PayPal Hub…</p>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/hub" element={<Guard><Hub /></Guard>} />
        <Route path="/discover" element={<Guard><Discover /></Guard>} />
        <Route path="/checkout" element={<Navigate to="/checkout/c1" replace />} />
        <Route path="/checkout/:id" element={<Guard><Checkout /></Guard>} />

        <Route
          path="/payment/approved"
          element={<Guard><PayPalReturn kind="payment" outcome="approved" /></Guard>}
        />
        <Route
          path="/payment/cancelled"
          element={<Guard><PayPalReturn kind="payment" outcome="cancelled" /></Guard>}
        />
        <Route
          path="/subscription/approved"
          element={<Guard><PayPalReturn kind="subscription" outcome="approved" /></Guard>}
        />
        <Route
          path="/subscription/cancelled"
          element={<Guard><PayPalReturn kind="subscription" outcome="cancelled" /></Guard>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
