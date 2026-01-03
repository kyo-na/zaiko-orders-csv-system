import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { apiGet } from '../utils/api.js'

import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(ArcElement, Tooltip, Legend)

function fmtIso(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function HistoryPage() {
  const [error, setError] = useState('')
  const [names, setNames] = useState([])
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [rows, setRows] = useState([])
  const [sumLabels, setSumLabels] = useState([])
  const [sumValues, setSumValues] = useState([])

  const buildQuery = () => {
    const p = new URLSearchParams()
    if (start) p.set('start', start)
    if (end) p.set('end', end)
    if (name) p.set('name', name)
    return p.toString()
  }

  const search = async () => {
    setError('')
    const q = buildQuery()
    const h = await apiGet('/api/history/?' + q)
    setRows(h.orders || [])
    const s = await apiGet('/api/summary/?' + q)
    setSumLabels(s.labels || [])
    setSumValues(s.values || [])
  }

  useEffect(() => {
    (async () => {
      const o = await apiGet('/api/options/')
      setNames(o.names || [])
      await search()
    })().catch(e => setError(String(e.message || e)))
  }, [])

  const pieData = useMemo(() => ({
    labels: sumLabels,
    datasets: [{ data: sumValues }]
  }), [sumLabels, sumValues])

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>注文履歴</Typography>
      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
            <TextField
              label="開始日"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="終了日"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>名前（任意）</InputLabel>
              <Select label="名前（任意）" value={name} onChange={(e) => setName(e.target.value)}>
                <MenuItem value="">(全員)</MenuItem>
                {names.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={() => search().catch(e => setError(String(e.message || e)))} sx={{ minWidth: 120 }}>
              検索
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>集計（おかず別）</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {sumLabels.length ? <Pie data={pieData} /> : <Typography color="text.secondary">データがありません</Typography>}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>履歴一覧（確定済みのみ）</Typography>
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>日時</TableCell>
                <TableCell>名前</TableCell>
                <TableCell>おかず</TableCell>
                <TableCell>おかず期限</TableCell>
                <TableCell>ご飯</TableCell>
                <TableCell>ご飯期限</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{fmtIso(o.created_at)}</TableCell>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.okazu}</TableCell>
                  <TableCell>{o.okazu_expiry}</TableCell>
                  <TableCell>{o.gohan}</TableCell>
                  <TableCell>{o.gohan_expiry}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    データがありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  )
}
