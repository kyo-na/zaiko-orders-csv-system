import React, { useEffect, useState } from 'react'
import { Alert, Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { apiGet } from '../utils/api.js'

export default function InventoryPage() {
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

  const load = async () => {
    const data = await apiGet('/api/inventory/')
    setItems(data.items || [])
  }

  useEffect(() => { load().catch(e => setError(String(e.message || e))) }, [])

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2 }}>在庫</Typography>
      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>品目</TableCell>
                <TableCell>賞味期限</TableCell>
                <TableCell>在庫</TableCell>
                <TableCell>補填ライン</TableCell>
                <TableCell>アラート</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(x => (
                <TableRow key={x.id}>
                  <TableCell>{x.item}</TableCell>
                  <TableCell>{x.expiry}</TableCell>
                  <TableCell>{x.qty}</TableCell>
                  <TableCell>{x.refill_line}</TableCell>
                  <TableCell>{x.alert || ''}</TableCell>
                </TableRow>
              ))}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                    データがありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
