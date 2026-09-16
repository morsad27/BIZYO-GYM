import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import Memberships from "./pages/Memberships";
import DashboardLayout from "./layouts/DashboardLayout";
import Payments from "./pages/Payments";
import EntryLog from "./pages/EntryLog";  
import Equipment from "./pages/Equipment";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/memberships" element={<Memberships />} />
          <Route path="/entry-log" element={<EntryLog />} />
          <Route path="/payments" element={<Payments />} /> 
          <Route path="/equipment" element={<Equipment />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;