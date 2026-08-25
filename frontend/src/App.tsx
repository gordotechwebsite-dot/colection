import { BrowserRouter, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import { SessionProvider } from "./lib/session";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Publish from "./pages/Publish";
import Register from "./pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/anuncio/:id" element={<ListingDetail />} />
            <Route path="/ingresar" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/publicar" element={<Publish />} />
            <Route path="/mi-cuenta" element={<Account />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
