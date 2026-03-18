let logEntries = [];
let logOk = 0;
let logErr = 0;
let whCount = 0;
let whTotal = 0;
let activeTab = { joke: "xhr" };

function showPanel(id, btn) {
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("panel-" + id).classList.add("active");
  btn.classList.add("active");
}

function showTab(panel, tab) {
  activeTab[panel] = tab;
  document
    .querySelectorAll(`#panel-${panel} .tab`)
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");
  if (panel === "joke") {
    document.getElementById("joke-xhr-tab").style.display =
      tab === "xhr" ? "block" : "none";
    document.getElementById("joke-fetch-tab").style.display =
      tab === "fetch" ? "block" : "none";
  }
}

function addLog(type, msg, meta) {
  const entry = {
    type,
    msg,
    meta,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
  logEntries.unshift(entry);
  if (type === "ok") logOk++;
  else if (type === "err") logErr++;
  renderLog();
}

function renderLog() {
  const total = logEntries.length;
  document.getElementById("log-count").textContent = total;
  document.getElementById("log-total").textContent = total;
  document.getElementById("log-ok").textContent = logOk;
  document.getElementById("log-err").textContent = logErr;

  const el = document.getElementById("log-entries");
  if (!logEntries.length) {
    el.innerHTML =
      '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No activity yet.</div>';
    return;
  }
  el.innerHTML = logEntries
    .map(
      (e) => `
    <div class="log-entry">
      <div class="log-dot ${e.type}"></div>
      <div class="log-time">${e.time}</div>
      <div>
        <div class="log-msg">${e.msg}</div>
        ${e.meta ? `<div class="log-meta">${e.meta}</div>` : ""}
      </div>
    </div>
  `
    )
    .join("");
}

function clearLog() {
  logEntries = [];
  logOk = 0;
  logErr = 0;
  renderLog();
}

function colorize(obj) {
  const s = JSON.stringify(obj, null, 2);
  return s
    .replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="str">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="num">$1</span>')
    .replace(/: (true|false)/g, ': <span class="bool">$1</span>')
    .replace(/: null/g, ': <span class="null-val">null</span>');
}

function setBox(id, html, cls = "") {
  const el = document.getElementById(id);
  el.innerHTML = html;
  el.className = "response-box " + cls;
}

function spin(id, on) {
  const el = document.getElementById(id);
  if (el) el.style.display = on ? "inline-block" : "none";
}

function setStatus(id, code, label) {
  const el = document.getElementById(id);
  if (!el) return;
  const ok = code >= 200 && code < 300;
  el.innerHTML = `<span class="status-badge ${ok ? "ok" : "err"}">${
    ok ? "●" : "✕"
  } ${code} ${label}</span>`;
}

async function fetchWeather() {
  const city = document.getElementById("weather-city").value.trim() || "Manila";
  spin("weather-spin", true);
  setBox("weather-raw", "Fetching geocoordinates…", "loading");
  document.getElementById("weather-result").style.display = "none";

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error("City not found");

    const { latitude, longitude, name, country } = geoData.results[0];
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover`;
    const wRes = await fetch(url);
    const wData = await wRes.json();
    const c = wData.current;

    setStatus("weather-status", wRes.status, wRes.statusText);
    setBox("weather-raw", colorize(wData), "success");

    const codes = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Icy fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      71: "Slight snow",
      80: "Rain showers",
      95: "Thunderstorm",
    };
    const desc = codes[c.weather_code] || `Code ${c.weather_code}`;

    document.getElementById("w-city").textContent = `${name}, ${country}`;
    document.getElementById("w-desc").textContent = desc;
    document.getElementById("w-temp").textContent = `${c.temperature_2m}°C`;
    document.getElementById("w-hum").textContent = `${c.relative_humidity_2m}%`;
    document.getElementById("w-wind").textContent = `${c.wind_speed_10m} km/h`;
    document.getElementById(
      "w-feels"
    ).textContent = `${c.apparent_temperature}°C`;
    document.getElementById("w-cloud").textContent = `${c.cloud_cover}%`;
    document.getElementById("weather-result").style.display = "block";

    addLog(
      "ok",
      `Weather fetched: ${name}, ${country}`,
      `${c.temperature_2m}°C · ${desc}`
    );
  } catch (e) {
    setBox("weather-raw", `Error: ${e.message}`, "error");
    addLog("err", "Weather fetch failed", e.message);
  }
  spin("weather-spin", false);
}

function fetchJoke() {
  const cat = document.getElementById("joke-cat").value;
  const type = document.getElementById("joke-type").value;
  const url = `https://v2.jokeapi.dev/joke/${cat}?type=${type}`;
  spin("joke-spin", true);
  document.getElementById("joke-display").style.display = "none";

  setBox("joke-xhr-box", "Sending XHR request…", "loading");
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const ok = xhr.status >= 200 && xhr.status < 300;
      document.getElementById(
        "joke-xhr-status"
      ).innerHTML = `<span class="status-badge ${ok ? "ok" : "err"}">● ${
        xhr.status
      }</span>`;
      try {
        const data = JSON.parse(xhr.responseText);
        setBox("joke-xhr-box", colorize(data), ok ? "success" : "error");
        if (!data.error) renderJoke(data);
        addLog(ok ? "ok" : "err", `Joke fetched [XHR]`, `Category: ${cat}`);
      } catch (e) {
        setBox("joke-xhr-box", xhr.responseText, "error");
      }
    }
  };
  xhr.send();

  setBox("joke-fetch-box", "Sending fetch() request…", "loading");
  fetch(url)
    .then((r) => r.json().then((d) => ({ d, status: r.status })))
    .then(({ d, status }) => {
      const ok = status >= 200 && status < 300;
      document.getElementById(
        "joke-fetch-status"
      ).innerHTML = `<span class="status-badge ${
        ok ? "ok" : "err"
      }">● ${status}</span>`;
      setBox("joke-fetch-box", colorize(d), ok ? "success" : "error");
    })
    .catch((e) => setBox("joke-fetch-box", `Error: ${e.message}`, "error"))
    .finally(() => spin("joke-spin", false));
}

function renderJoke(data) {
  const el = document.getElementById("joke-display");
  const setup = document.getElementById("joke-setup");
  const punchline = document.getElementById("joke-punchline");
  if (data.type === "twopart") {
    setup.textContent = data.setup;
    punchline.textContent = `▸ ${data.delivery}`;
  } else {
    setup.textContent = data.joke;
    punchline.textContent = "";
  }
  el.style.display = "block";
}

async function fetchDog() {
  const breed = document.getElementById("dog-breed").value;
  spin("dog-spin", true);
  setBox("dog-raw", "Fetching dog image…", "loading");
  document.getElementById("dog-img").style.display = "none";
  document.getElementById("dog-result-meta").style.display = "none";

  const url =
    breed === "random"
      ? "https://dog.ceo/api/breeds/image/random"
      : `https://dog.ceo/api/breed/${breed}/images/random`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    setBox("dog-raw", colorize(data), "success");
    setStatus("dog-status", res.status, res.statusText);

    const img = document.getElementById("dog-img");
    img.src = data.message;
    img.onload = () => {
      img.style.display = "block";
      document.getElementById("dog-result-meta").style.display = "flex";
      document.getElementById("dog-url").textContent =
        data.message.substring(0, 55) + "…";
    };
    addLog("ok", `Dog image fetched [${breed}]`, data.message.substring(0, 60));
  } catch (e) {
    setBox("dog-raw", `Error: ${e.message}`, "error");
    addLog("err", "Dog API failed", e.message);
  }
  spin("dog-spin", false);
}

async function fetchIP() {
  const ipInput = document.getElementById("ip-input").value.trim();
  const target = ipInput || "";
  spin("ip-spin", true);
  setBox("ip-raw", "Looking up IP geolocation…", "loading");
  document.getElementById("ip-result").style.display = "none";

  try {
    const urls = target
      ? [
          `https://ipapi.co/${encodeURIComponent(target)}/json/`,
          `https://ipwho.is/${encodeURIComponent(target)}`,
        ]
      : ["https://ipapi.co/json/", "https://ipwho.is/"];
    let data = null;
    let source = "none";

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        if (json.success === false) continue;
        data = json;
        source = url.includes("ipapi.co") ? "ipapi.co" : "ipwho.is";
        break;
      } catch (_) {
        continue;
      }
    }

    if (!data) {
      throw new Error("All IP lookup services failed");
    }

    const normalized = {
      ip: data.ip || data.query,
      city: data.city || data.region || "N/A",
      country: data.country_name || data.country || "N/A",
      latitude: data.latitude || data.lat || 0,
      longitude: data.longitude || data.lon || 0,
      timezone: data.timezone || data.timezone || "UTC",
    };

    setBox("ip-raw", colorize(data), "success");
    setStatus("ip-status", 200, `OK (${source})`);

    const grid = document.getElementById("ip-grid");
    grid.innerHTML = [
      ["ip", normalized.ip],
      ["city", normalized.city],
      ["country", normalized.country],
      ["latitude", normalized.latitude],
      ["longitude", normalized.longitude],
      ["timezone", normalized.timezone],
    ]
      .map(
        ([k, v]) =>
          `\n      <div class="weather-stat">\n        <div class="weather-stat-label">${k}</div>\n        <div class="weather-stat-value" style="font-size:13px;word-break:break-all">${v}</div>\n      </div>`
      )
      .join("");
    document.getElementById("ip-result").style.display = "block";
    addLog(
      "ok",
      `IP lookup: ${normalized.ip}`,
      `${normalized.city}, ${normalized.country}`
    );
  } catch (e) {
    const fallback = {
      ip: target || "127.0.0.1",
      city: "Localhost",
      country: "Local",
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    };
    setBox(
      "ip-raw",
      `All IP services failed; using local fallback data.`,
      "error"
    );
    setStatus("ip-status", 500, "Fallback");
    document.getElementById("ip-grid").innerHTML = `
      <div class="weather-stat"><div class="weather-stat-label">ip</div><div class="weather-stat-value">${fallback.ip}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">city</div><div class="weather-stat-value">${fallback.city}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">country</div><div class="weather-stat-value">${fallback.country}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">latitude</div><div class="weather-stat-value">${fallback.latitude}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">longitude</div><div class="weather-stat-value">${fallback.longitude}</div></div>
      <div class="weather-stat"><div class="weather-stat-label">timezone</div><div class="weather-stat-value">${fallback.timezone}</div></div>`;
    document.getElementById("ip-result").style.display = "block";
    addLog("err", "IP API failed, fallback used", e.message);
  }
  spin("ip-spin", false);
}

async function fetchCurrency() {
  const amount = parseFloat(document.getElementById("fx-amount").value) || 1;
  const from = document.getElementById("fx-from").value;
  const to = document.getElementById("fx-to").value;
  spin("fx-spin", true);
  document.getElementById("fx-result").style.display = "none";

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`
    );
    const data = await res.json();
    const converted = data.rates[to];

    setStatus("fx-status", res.status, res.statusText);
    setBox("fx-raw", colorize(data), "success");

    document.getElementById("fx-converted").textContent = `${converted.toFixed(
      2
    )} ${to}`;
    document.getElementById("fx-rate").textContent = `1 ${from} = ${(
      converted / amount
    ).toFixed(4)} ${to} · Date: ${data.date}`;
    document.getElementById("fx-result").style.display = "block";

    addLog(
      "ok",
      `FX: ${amount} ${from} → ${converted.toFixed(2)} ${to}`,
      `Rate: ${(converted / amount).toFixed(4)}`
    );
  } catch (e) {
    addLog("err", "Currency API failed", e.message);
    alert("Error: " + e.message);
  }
  spin("fx-spin", false);
}

async function simulateWebhook() {
  const event = document.getElementById("wh-event").value;
  let payload;
  try {
    payload = JSON.parse(document.getElementById("wh-payload").value);
  } catch (e) {
    alert("Invalid JSON payload");
    return;
  }

  spin("wh-spin", true);
  const body = { event, timestamp: new Date().toISOString(), data: payload };

  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Event": event },
      body: JSON.stringify(body),
    });
    const resp = await res.json();
    receiveWebhook(event, body, res.status);
    addLog(
      "ok",
      `Webhook fired: ${event}`,
      `Status: ${res.status} · id: ${resp.id}`
    );
  } catch (e) {
    addLog("err", "Webhook failed", e.message);
  }
  spin("wh-spin", false);
}

function receiveWebhook(event, body, status) {
  whCount++;
  whTotal++;
  document.getElementById("wh-count").textContent = `${whCount} events`;
  document.getElementById("wh-total").textContent = whTotal;
  document.getElementById("wh-last").textContent = event.split(".")[0];
  document.getElementById("wh-metric-row").style.display = "flex";

  const log = document.getElementById("wh-log");
  if (log.querySelector('[style*="text-align:center"]')) log.innerHTML = "";

  const entry = document.createElement("div");
  entry.className = "webhook-entry";
  const t = new Date().toLocaleTimeString();
  entry.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <div><span class="webhook-method">POST</span><span class="webhook-path">/webhook · ${event}</span></div>
      <span class="status-badge ok">● ${status}</span>
    </div>
    <div class="webhook-body">${JSON.stringify(body.data)}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:4px;font-family:var(--mono)">${t} · ${
    body.timestamp
  }</div>
  `;
  log.insertBefore(entry, log.firstChild);
}

function clearWebhookLog() {
  document.getElementById("wh-log").innerHTML =
    '<div style="color:var(--muted);font-size:12px;padding:12px 0;text-align:center">Waiting for events…</div>';
  whCount = 0;
  document.getElementById("wh-count").textContent = "0 events";
  document.getElementById("wh-metric-row").style.display = "none";
}

document.addEventListener("input", updatePostPreview);
function updatePostPreview() {
  const uid = document.getElementById("post-userid")?.value || "1";
  const title = document.getElementById("post-title")?.value || "";
  const body = document.getElementById("post-body")?.value || "";
  const ct = document.getElementById("post-ctype")?.value || "application/json";
  const payload = { userId: parseInt(uid), title, body };
  const el = document.getElementById("post-preview");
  if (el)
    el.innerHTML = `<span class="key">POST</span> https://jsonplaceholder.typicode.com/posts\nContent-Type: <span class="str">${ct}</span>\n\n${colorize(
      payload
    )}`;
}
setTimeout(updatePostPreview, 100);

async function sendPost() {
  const userId = parseInt(document.getElementById("post-userid").value) || 1;
  const title = document.getElementById("post-title").value;
  const body = document.getElementById("post-body").value;
  const ct = document.getElementById("post-ctype").value;

  spin("post-spin", true);
  setBox("post-raw", "Sending POST request…", "loading");

  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": ct },
      body: JSON.stringify({ userId, title, body }),
    });
    const data = await res.json();
    setStatus("post-status", res.status, res.statusText);
    setBox("post-raw", colorize(data), "success");
    addLog("ok", `POST /posts — id: ${data.id}`, `"${title.substring(0, 40)}"`);
  } catch (e) {
    setBox("post-raw", `Error: ${e.message}`, "error");
    addLog("err", "POST request failed", e.message);
  }
  spin("post-spin", false);
}
