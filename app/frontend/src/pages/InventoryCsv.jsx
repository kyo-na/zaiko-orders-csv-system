import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  Divider,
  TextField,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { apiGet, apiPost } from "../utils/api";

function levelColor(level) {
  if (level === "CRITICAL") return "error";
  if (level === "WARN") return "warning";
  if (level === "INFO") return "info";
  return "success";
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ mt: 2 }}>{children}</Box>;
}

export default function InventoryCsv() {
  const [tab, setTab] = useState(0);

  const [summary, setSummary] = useState([]);
  const [lots, setLots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [exportedName, setExportedName] = useState("");
  const [carry, setCarry] = useState({ month: "", has_snapshot: false, rows: [] });

  const [sync, setSync] = useState({ meibo_mtime: 0, zaiko_mtime: 0 });
  const lastSyncRef = useRef({ meibo_mtime: 0, zaiko_mtime: 0 });
  const [pollMs, setPollMs] = useState(2000);

  const loadAll = async () => {
    const [s1, s2, s3, s4] = await Promise.all([
      apiGet("/api/inventory_csv/summary/"),
      apiGet("/api/inventory_csv/lots/"),
      apiGet("/api/inventory_csv/alerts/"),
      apiGet("/api/carryover/report/"),
    ]);
    setSummary(s1.summary || []);
    setLots(s2.lots || []);
    setAlerts(s3.alerts || []);
    setExportedName(s3.exported || "");
    setCarry(s4 || { month: "", has_snapshot: false, rows: [] });
  };

  const loadSync = async () => {
    const s = await apiGet("/api/sync/status/");
    setSync(s);
    const last = lastSyncRef.current;
    if (last.meibo_mtime && (s.meibo_mtime !== last.meibo_mtime || s.zaiko_mtime !== last.zaiko_mtime)) {
      // CSVが更新されたので自動リフレッシュ
      await loadAll();
    }
    lastSyncRef.current = s;
  };

  useEffect(() => {
    loadAll();
    loadSync();
    const t = setInterval(() => {
      loadSync().catch(() => {});
    }, pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  const downloadLatest = () => {
    window.open("/api/inventory_csv/export/latest.csv", "_blank");
  };

  const makeCarryoverSnapshot = async () => {
    await apiPost("/api/carryover/snapshot/", { month: "" }); // 省略で前月
    const r = await apiGet("/api/carryover/report/");
    setCarry(r);
  };

  const criticalCount = useMemo(() => summary.filter((x) => x.alert_level === "CRITICAL").length, [summary]);
  const warnCount = useMemo(() => summary.filter((x) => x.alert_level === "WARN").length, [summary]);
  const infoCount = useMemo(() => summary.filter((x) => x.alert_level === "INFO").length, [summary]);

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              在庫管理（CSV運用）
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              zaikokanri.csv / meibo.csv を読み込み → SQLiteに同期 → 画面自動更新（ポーリング）
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip icon={<WarningAmberIcon />} label={`CRITICAL ${criticalCount}`} color="error" variant="outlined" />
            <Chip label={`WARN ${warnCount}`} color="warning" variant="outlined" />
            <Chip label={`INFO ${infoCount}`} color="info" variant="outlined" />
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAll}>
              更新
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="① 在庫閾値" />
            <Tab label="② アラート" />
            <Tab label="③ 自動発注" />
            <Tab label="④ 前月繰越" />
            <Tab label="⑤ 同期" />
          </Tabs>

          <TabPanel value={tab} index={0}>
            <Alert severity="info" sx={{ mb: 2 }}>
              お弁当ごとに在庫をロット合算し、補填ライン（閾値）を下回ると WARN / CRITICAL にします。
              賞味期限が近いロットも INFO/WARN にします。
            </Alert>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>品目</TableCell>
                    <TableCell align="right">合計在庫</TableCell>
                    <TableCell align="right">補填ライン</TableCell>
                    <TableCell>最短賞味期限</TableCell>
                    <TableCell>レベル</TableCell>
                    <TableCell>理由</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary.map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{r.item}</TableCell>
                      <TableCell align="right">{r.total_qty}</TableCell>
                      <TableCell align="right">{r.threshold || "-"}</TableCell>
                      <TableCell>{r.earliest_expiry || "-"}</TableCell>
                      <TableCell>
                        <Chip size="small" color={levelColor(r.alert_level)} label={r.alert_level} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 400 }}>
                        {(r.reasons || []).join(" / ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              ロット（zaikokanri.csv行そのまま）
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>品目</TableCell>
                    <TableCell>賞味期限</TableCell>
                    <TableCell align="right">在庫</TableCell>
                    <TableCell align="right">補填ライン</TableCell>
                    <TableCell>メモ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lots.map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{r.item}</TableCell>
                      <TableCell>{r.expiry || "-"}</TableCell>
                      <TableCell align="right">{r.qty}</TableCell>
                      <TableCell align="right">{r.refill_line || "-"}</TableCell>
                      <TableCell>{r.alert || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadLatest}>
                発注候補CSVをダウンロード（最新）
              </Button>
              <Chip label={exportedName ? `直近出力: ${exportedName}` : "未出力"} variant="outlined" />
            </Stack>

            {alerts.length === 0 ? (
              <Alert severity="success">現在、補填ライン割れの発注候補はありません。</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>品目</TableCell>
                      <TableCell align="right">現在在庫</TableCell>
                      <TableCell align="right">補填ライン</TableCell>
                      <TableCell align="right">必要数</TableCell>
                      <TableCell>最短賞味期限</TableCell>
                      <TableCell>レベル</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {alerts.map((r, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>{r.item}</TableCell>
                        <TableCell align="right">{r.current_qty}</TableCell>
                        <TableCell align="right">{r.threshold}</TableCell>
                        <TableCell align="right">{r.need}</TableCell>
                        <TableCell>{r.earliest_expiry || "-"}</TableCell>
                        <TableCell>
                          <Chip size="small" color={levelColor(r.alert_level)} label={r.alert_level} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Alert severity="warning" sx={{ mt: 2 }}>
              ここでの「発注候補」は自動発注の“たたき台”です。最終判断は現場で調整してください。
            </Alert>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              自動発注は <b>CSVの発注リスト生成</b> を実装済み。
              Google Apps Script / スプレッドシート / メール送信は、後で有効化できるよう <b>コメントアウトでソースを残してあります</b>（バックエンド側）。
            </Alert>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button variant="contained" startIcon={<AutoFixHighIcon />} onClick={loadAll}>
                発注候補を再計算
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadLatest}>
                発注リストCSV（最新）を開く
              </Button>
            </Stack>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                運用イメージ
              </Typography>
              <Box component="ol" sx={{ m: 0, pl: 2 }}>
                <li>zaikokanri.csv を更新（補填ラインや在庫数を入力）</li>
                <li>自動的に画面/SQLiteが同期（このページがポーリング）</li>
                <li>補填ライン割れの品目が発注候補としてCSV出力</li>
                <li>（将来）GASでスプレッドシート作成→メール送信を有効化</li>
              </Box>
            </Paper>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Alert severity={carry.has_snapshot ? "info" : "warning"} sx={{ mb: 2 }}>
              {carry.has_snapshot
                ? `前月(${carry.month})のスナップショットとの差分を表示しています。`
                : `前月(${carry.month})のスナップショットがありません。月末に「スナップショット作成」を押してください。`}
            </Alert>

            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
              <Button variant="contained" onClick={makeCarryoverSnapshot}>
                前月スナップショット作成（上書き）
              </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>品目</TableCell>
                    <TableCell>賞味期限</TableCell>
                    <TableCell align="right">前月在庫</TableCell>
                    <TableCell align="right">現在在庫</TableCell>
                    <TableCell align="right">差分</TableCell>
                    <TableCell align="right">残日数</TableCell>
                    <TableCell align="right">ロス推定</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(carry.rows || []).map((r, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{r.item}</TableCell>
                      <TableCell>{r.expiry || "-"}</TableCell>
                      <TableCell align="right">{r.prev_qty}</TableCell>
                      <TableCell align="right">{r.current_qty}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={r.diff}
                          color={r.diff === 0 ? "success" : r.diff < 0 ? "warning" : "info"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{r.days_to_expiry ?? "-"}</TableCell>
                      <TableCell align="right">
                        {r.loss_qty > 0 ? (
                          <Chip size="small" color="error" label={`${r.loss_qty}`} />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="error" sx={{ mt: 2 }}>
              ロス推定は「賞味期限切れ & 現在在庫が残っている数量」を暫定的に表示しています（運用に合わせて調整可能）。
            </Alert>
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                CSV同期ステータス
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Chip label={`meibo.csv mtime: ${sync.meibo_mtime || 0}`} variant="outlined" />
                <Chip label={`zaikokanri.csv mtime: ${sync.zaiko_mtime || 0}`} variant="outlined" />
                <TextField
                  label="ポーリング(ms)"
                  size="small"
                  type="number"
                  value={pollMs}
                  onChange={(e) => setPollMs(Number(e.target.value || 2000))}
                  sx={{ width: 160 }}
                />
              </Stack>
            </Paper>

            <Alert severity="info">
              Windows上でCSVを更新 → 保存すると、mtimeが変わります。
              この画面は一定間隔で /api/sync/status/ を見に行き、変更があれば自動で再読み込みします。
            </Alert>
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
