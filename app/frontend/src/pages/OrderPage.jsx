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
  Typography,
} from '@mui/material'
import { apiGet, apiPost } from '../utils/api.js'

function fmtIso(iso) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function OrderPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [opts, setOpts] = useState(null)
  const [pending, setPending] = useState([])

  // form state
  const [name, setName] = useState('')
  const [okazu, setOkazu] = useState('')
  const [gohan, setGohan] = useState('')
  const [okazuExpiry, setOkazuExpiry] = useState('')
  const [gohanExpiry, setGohanExpiry] = useState('')

  const itemToExpiry = useMemo(() => (opts?.item_to_expiry || {}), [opts])
  const qtyMap = useMemo(() => (opts?.qty_map || {}), [opts])

  const expiriesOf = (item) => itemToExpiry[item] || []
  const qtyOf = (item, expiry) => qtyMap[`${item}||${expiry}`]

  const load = async () => {
    setError(''); setSuccess('')
    const o = await apiGet('/api/options/')
    setOpts(o)
    const p = await apiGet('/api/pending/')
    setPending(p.orders || [])
  }

  // okazu/gohan が変わったら expiry を先頭に寄せる
  useEffect(() => {
    const ex = expiriesOf(okazu)
    if (!okazu) {
      if (okazuExpiry) setOkazuExpiry('')
      return
    }
    // おかずが選択されたら、期限未選択 or 不一致のときだけ先頭へ寄せる
    if (ex.length && !ex.includes(okazuExpiry)) setOkazuExpiry(ex[0])
  }, [okazu, opts])

  useEffect(() => {
    const ex = expiriesOf(gohan)
    if (!gohan) {
      if (gohanExpiry) setGohanExpiry('')
      return
    }
    if (ex.length && !ex.includes(gohanExpiry)) setGohanExpiry(ex[0])
  }, [gohan, opts])

  useEffect(() => { load().catch(e => setError(String(e.message || e))) }, [])

  const submit = async () => {
    setError(''); setSuccess('')
    try {
      await apiPost('/api/order/', {
        name, okazu, okazu_expiry: okazuExpiry, gohan, gohan_expiry: gohanExpiry
      })
      setSuccess('仮送信しました（未確定に追加 / 在庫はまだ減りません）')
      // 要望：仮送信後はコンボボックスを全て空に戻す
      setName('')
      setOkazu('')
      setOkazuExpiry('')
      setGohan('')
      setGohanExpiry('')
      await load()
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const cancelOne = async (id) => {
    setError(''); setSuccess('')
    try {
      await apiPost('/api/cancel/', { id })
      setSuccess('取消しました（在庫は減りません）')
      await load()
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const confirmAll = async () => {
    setError(''); setSuccess('')
    try {
      const res = await apiPost('/api/confirm/')
      if (!res?.ok) {
        setError((res?.errors || []).join('\n') || '確定エラー')
      } else {
        setSuccess('一括確定しました（おかず・ご飯をそれぞれ在庫-1）\n確定済みは取消できません。')
      }
      await load()
    } catch (e) {
      // confirm は JSON を返すが、例外時は text の可能性あり
      setError(String(e.message || e))
      await load()
    }
  }

  const names = opts?.names || []
  const okazuItems = opts?.okazu_items || []
  const gohanItems = opts?.gohan_items || []

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>注文票</Typography>

      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>名前</InputLabel>
                <Select label="名前" value={name} onChange={(e) => setName(e.target.value)}>
                  <MenuItem value="">（未選択）</MenuItem>
                  {names.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>おかず</InputLabel>
                <Select label="おかず" value={okazu} onChange={(e) => setOkazu(e.target.value)}>
                  <MenuItem value="">（なし）</MenuItem>
                  {okazuItems.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>おかず賞味期限</InputLabel>
                <Select label="おかず賞味期限" value={okazuExpiry} onChange={(e) => setOkazuExpiry(e.target.value)}>
                  <MenuItem value="">（未選択）</MenuItem>
                  {expiriesOf(okazu).map(ex => {
                    const q = qtyOf(okazu, ex)
                    const label = q === undefined ? ex : `${ex}（在庫:${q}）`
                    return <MenuItem key={ex} value={ex}>{label}</MenuItem>
                  })}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>ご飯</InputLabel>
                <Select label="ご飯" value={gohan} onChange={(e) => setGohan(e.target.value)}>
                  <MenuItem value="">（なし）</MenuItem>
                  {gohanItems.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>ご飯賞味期限</InputLabel>
                <Select label="ご飯賞味期限" value={gohanExpiry} onChange={(e) => setGohanExpiry(e.target.value)}>
                  <MenuItem value="">（未選択）</MenuItem>
                  {expiriesOf(gohan).map(ex => {
                    const q = qtyOf(gohan, ex)
                    const label = q === undefined ? ex : `${ex}（在庫:${q}）`
                    return <MenuItem key={ex} value={ex}>{label}</MenuItem>
                  })}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={submit}>仮送信（未確定に追加）</Button>
              <Button color="success" variant="contained" onClick={confirmAll}>一括確定（在庫-1）</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 1 }}>未確定一覧（取消も表示）</Typography>
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
                <TableCell>状態</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pending.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{fmtIso(o.created_at)}</TableCell>
                  <TableCell>{o.name}</TableCell>
                  <TableCell>{o.okazu}</TableCell>
                  <TableCell>{o.okazu_expiry}</TableCell>
                  <TableCell>{o.gohan}</TableCell>
                  <TableCell>{o.gohan_expiry}</TableCell>
                  <TableCell>{o.cancelled ? '取消' : '未確定'}</TableCell>
                  <TableCell>
                    {!o.cancelled && (
                      <Button size="small" color="error" variant="outlined" onClick={() => cancelOne(o.id)}>
                        取消
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!pending.length && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    未確定はありません
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
