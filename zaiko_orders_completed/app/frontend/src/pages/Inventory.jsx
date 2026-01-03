import React, { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { apiGet } from "../utils/api";

function parseExpiry(expiry) {
  if (!expiry) return null;
  const s = String(expiry).trim().replaceAll("/", "-");
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return null;
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  // 要望：検索の品目はコンボボックス（一覧は常に表示）
  const [itemSel, setItemSel] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    apiGet("/api/inventory/").then((j) => setItems(j.items ?? []));
  }, []);

  const now = useMemo(() => new Date(), []);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (items ?? []).filter((x) => {
      if (itemSel && x.item !== itemSel) return false;
      if (!qq) return true;
      return `${x.item} ${x.expiry}`.toLowerCase().includes(qq);
    });
  }, [items, itemSel, q]);

  const itemOptions = useMemo(() => {
    return Array.from(new Set((items ?? []).map((x) => x.item))).sort((a, b) => String(a).localeCompare(String(b), "ja"));
  }, [items]);

  const daysBetween = (a, b) => Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5">在庫</Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>品目</InputLabel>
            <Select label="品目" value={itemSel} onChange={(e) => setItemSel(e.target.value)}>
              <MenuItem value="">（全件）</MenuItem>
              {itemOptions.map((x) => (
                <MenuItem key={x} value={x}>
                  {x}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="キーワード(任意)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: 2025-12"
          />
        </Box>
      </Box>

      <TableContainer sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>品目</TableCell>
              <TableCell>賞味期限</TableCell>
              <TableCell align="right">在庫数</TableCell>
              <TableCell>状態</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((x) => {
              const d = parseExpiry(x.expiry);
              const diff = d ? daysBetween(d, now) : null;
              const isExpired = diff !== null && diff < 0;
              const isNear = diff !== null && diff >= 0 && diff <= 3;

              return (
                <TableRow key={x.id} hover>
                  <TableCell>{x.item}</TableCell>
                  <TableCell sx={{ fontWeight: isExpired || isNear ? 800 : 400, color: isExpired || isNear ? "error.main" : "inherit" }}>
                    {x.expiry}
                  </TableCell>
                  <TableCell align="right">{x.qty}</TableCell>
                  <TableCell>
                    {isExpired && <Chip label="期限切れ" color="error" size="small" sx={{ mr: 1 }} />}
                    {!isExpired && isNear && <Chip label="期限間近(3日)" color="error" variant="outlined" size="small" sx={{ mr: 1 }} />}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
