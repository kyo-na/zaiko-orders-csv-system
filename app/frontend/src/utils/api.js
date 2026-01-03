function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return "";
}

export async function ensureCsrf() {
  await fetch("/api/csrf/", { credentials: "include" });
}

export async function apiGet(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
