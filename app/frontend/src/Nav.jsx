import { Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

export default function Nav() {
  const location = useLocation();
  const current = location.pathname;

  const btn = (to, label) => (
    <Button
      component={Link}
      to={to}
      color={current === to ? "secondary" : "inherit"}
      sx={{ mr: 1 }}
    >
      {label}
    </Button>
  );

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          弁当 在庫管理
        </Typography>
        {btn("/", "注文")}
        {btn("/pending", "未確定")}
        {btn("/inventory", "在庫")}
        {btn("/inventory_csv", "在庫(CSV)")}
        {btn("/history", "履歴")}
      </Toolbar>
    </AppBar>
  );
}
