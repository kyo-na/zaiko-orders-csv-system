import React, { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Divider,
  Stack,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { apiGet } from "../utils/api";

ChartJS.register(ArcElement, Tooltip, Legend);

const palette = ["#1976d2", "#9c27b0", "#2e7d32", "#ed6c02", "#d32f2f", "#0288d1", "#6d4c41", "#1565c0"];

function formatJst(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function History() {
  const [opt, setOpt] = useState(null);
  const [start, setStart] = useState("2025-12-26");
  const [end, setEnd] = useState("2025-12-26");
  const [name, setName] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ okazu: [], gohan: [] });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (name) qs.set("name", name);
      if (start) qs.set("start", start);
      if (end) qs.set("end", end);

      const h = await apiGet(`/api/history/?${qs.toString()}`);
      setRows((h.orders ?? []).map((o) => ({ ...o, id: o.id })));

      const s = await apiGet(`/api/summary/?${qs.toString()}`);
      setSummary(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiGet("/api/options/").then(setOpt);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { field: "created_at", headerName: "日時", width: 180, valueFormatter: (v) => formatJst(v.value) },
      { field: "name", headerName: "名前", width: 140 },
      { field: "okazu", headerName: "おかず", width: 220 },
      { field: "okazu_expiry", headerName: "おかず期限", width: 140 },
      { field: "gohan", headerName: "ご飯", width: 120 },
      { field: "gohan_expiry", headerName: "ご飯期限", width: 140 },
    ],
    []
  );

  const pieData = useMemo(() => {
    const top = (summary.okazu ?? []).slice(0, 8);
    return {
      labels: top.map((x) => x.label),
      datasets: [
        {
          data: top.map((x) => x.count),
          backgroundColor: top.map((_, i) => palette[i % palette.length]),
          borderColor: "#fff",
          borderWidth: 1,
        },
      ],
    };
  }, [summary]);

  const qsForExport = () => {
    const qs = new URLSearchParams();
    if (name) qs.set("name", name);
    if (start) qs.set("start", start);
    if (end) qs.set("end", end);
    return qs.toString();
  };

  const exportHistory = () => window.open(`/api/export/history.csv?${qsForExport()}`, "_blank");
  const exportRanking = () => window.open(`/api/export/ranking.csv?${qsForExport()}`, "_blank");

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5">注文履歴 / 集計</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
          <Button variant="outlined" onClick={exportHistory}>
            履歴CSV
          </Button>
          <Button variant="outlined" onClick={exportRanking}>
            ランキングCSV
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          label="開始日"
          type="date"
          value={start || ""}
          onChange={(e) => setStart(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="終了日"
          type="date"
          value={end || ""}
          onChange={(e) => setEnd(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>名前</InputLabel>
          <Select value={name} label="名前" onChange={(e) => setName(e.target.value)}>
            <MenuItem value="">（全員）</MenuItem>
            {(opt?.names ?? []).map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={load} disabled={loading}>
          検索
        </Button>
        <Button
          variant="text"
          onClick={() => {
            setStart("2025-12-26");
            setEnd("2025-12-26");
            setName("");
          }}
        >
          条件リセット(本日)
        </Button>
        <Button
          variant="text"
          onClick={() => {
            setStart("");
            setEnd("");
            setName("");
          }}
        >
          全件条件(重いかも)
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 380 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
            履歴（仮想スクロール）
          </Typography>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            density="compact"
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 50, page: 0 } } }}
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            売れ筋（期間指定）
          </Typography>
          <Typography variant="caption" color="text.secondary">
            おかずTop / ご飯Top
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {(summary.okazu ?? []).length ? <Pie data={pieData} /> : <Typography color="text.secondary">データなし</Typography>}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                おかずTop10
              </Typography>
              <List dense sx={{ p: 0 }}>
                {(summary.okazu ?? []).slice(0, 10).map((x, i) => (
                  <ListItem key={`o-${i}`} sx={{ px: 0 }}>
                    <ListItemText primary={`${i + 1}. ${x.label}`} secondary={`${x.count} 件`} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                ご飯Top10
              </Typography>
              <List dense sx={{ p: 0 }}>
                {(summary.gohan ?? []).slice(0, 10).map((x, i) => (
                  <ListItem key={`g-${i}`} sx={{ px: 0 }}>
                    <ListItemText primary={`${i + 1}. ${x.label}`} secondary={`${x.count} 件`} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Paper>
  );
}
