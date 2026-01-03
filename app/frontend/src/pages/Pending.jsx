import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Box,
} from "@mui/material";
import { apiGet, apiPost } from "../utils/api";

export default function Pending() {
  const [rows, setRows] = useState([]);

  const load = async () => {
    const res = await apiGet("/api/pending/");
    setRows(res.orders ?? []);
  };

  const confirmAll = async () => {
    await apiPost("/api/confirm/", {});
    load();
  };

  const cancel = async (id) => {
    await apiPost("/api/cancel/", { id });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5">未確定注文</Typography>
        <Button variant="contained" color="primary" onClick={confirmAll}>
          一括確定
        </Button>
      </Box>

      <Stack spacing={1}>
        {rows.map((o) => (
          <Paper key={o.id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ minWidth: 120 }}>{o.name}</Typography>
              {o.okazu && <Chip label={`おかず: ${o.okazu}`} />}
              {o.gohan && <Chip label={`ご飯: ${o.gohan}`} />}
              <Chip label={o.status} color="warning" size="small" />
              <Button
                size="small"
                color="error"
                onClick={() => cancel(o.id)}
              >
                取消
              </Button>
            </Stack>
          </Paper>
        ))}
        {rows.length === 0 && (
          <Typography color="text.secondary">未確定注文はありません</Typography>
        )}
      </Stack>
    </Paper>
  );
}
