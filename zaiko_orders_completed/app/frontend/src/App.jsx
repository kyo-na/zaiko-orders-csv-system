import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { Container, Box } from "@mui/material";
import Order from "./pages/Order";
import Pending from "./pages/Pending";
import Inventory from "./pages/Inventory";
import InventoryCsv from "./pages/InventoryCsv";
import History from "./pages/History";
import Nav from "./Nav";
import { ensureCsrf } from "./utils/api";

export default function App() {
  useEffect(() => {
    ensureCsrf();
  }, []);

  return (
    <>
      <Nav />
      <Box sx={{ py: 3 }}>
        <Container maxWidth="lg">
          <Routes>
            <Route path="/" element={<Order />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory_csv" element={<InventoryCsv />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Container>
      </Box>
    </>
  );
}
