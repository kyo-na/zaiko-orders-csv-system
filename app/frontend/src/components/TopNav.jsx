import React from 'react'
import { AppBar, Toolbar, Typography, Button, Stack } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

export default function TopNav() {
  const loc = useLocation()
  const is = (p) => loc.pathname === p
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          弁当 在庫管理
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            variant={is('/') ? 'outlined' : 'text'}
          >
            注文票
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/inventory/"
            variant={is('/inventory/') ? 'outlined' : 'text'}
          >
            在庫
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/history/"
            variant={is('/history/') ? 'outlined' : 'text'}
          >
            注文履歴
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
