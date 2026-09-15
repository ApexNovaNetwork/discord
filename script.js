const ACCOUNTS = {
  player: { pass: "", role: "player" },
  staff: { pass: "shadowstaff", role: "staff" },
  admin: { pass: "shadowadmin", role: "admin" },
  founder: { pass: "shadowfounder", role: "founder" }
};

let currentUser = { username: "Guest Player", role: "player" };
let activePlayersList = [];

window.onload = () => {
  const saved = localStorage.getItem('shadowsmp_v8_session');
  if (saved) currentUser = JSON.parse(saved);
  updateUIState();
  fetchLiveServerData();
  fetchBotStatus();
};

function saveSession() {
  localStorage.setItem('shadowsmp_v8_session', JSON.stringify(currentUser));
}

function openAuthModal() { document.getElementById('auth-modal').classList.add('active'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.remove('active'); }

function applyPreset(roleKey) {
  document.getElementById('login-username').value = `${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}User`;
  document.getElementById('login-password').value = ACCOUNTS[roleKey].pass;
  document.getElementById('login-role').value = ACCOUNTS[roleKey].role;
}

function handleStandardLogin() {
  const user = document.getElementById('login-username').value.trim() || "User";
  const pass = document.getElementById('login-password').value.trim();
  const role = document.getElementById('login-role').value;

  if (role === "founder" && pass !== ACCOUNTS.founder.pass) return alert("Invalid Founder Key!");
  if (role === "admin" && pass !== ACCOUNTS.admin.pass && pass !== ACCOUNTS.founder.pass) return alert("Invalid Admin Key!");
  if (role === "staff" && pass !== ACCOUNTS.staff.pass && pass !== ACCOUNTS.admin.pass && pass !== ACCOUNTS.founder.pass) return alert("Invalid Staff Key!");

  currentUser = { username: user, role: role };
  saveSession();
  updateUIState();
  closeAuthModal();
  printLog(`Authenticated as ${user} (${role.toUpperCase()})`, "cmd");
}

function logout() {
  currentUser = { username: "Guest Player", role: "player" };
  localStorage.removeItem('shadowsmp_v8_session');
  updateUIState();
}

function updateUIState() {
  document.getElementById('user-name-text').innerText = currentUser.username;
  const roleText = document.getElementById('user-role-text');
  roleText.innerText = currentUser.role.toUpperCase();
  roleText.className = `role-badge role-${currentUser.role}`;

  const avatarContainer = document.getElementById('avatar-container');
  if (currentUser.username !== "Guest Player") {
    avatarContainer.innerHTML = `<img src="https://mc-heads.net/avatar/${currentUser.username}/32" class="avatar-img">`;
  } else {
    avatarContainer.innerHTML = `<i class="fa-solid fa-circle-user avatar"></i>`;
  }

  document.getElementById('role-pill-text').innerText = `${currentUser.role.toUpperCase()} MODE`;

  const roleLevels = { player: 1, staff: 2, admin: 3, founder: 4 };
  const currentLevel = roleLevels[currentUser.role] || 1;

  document.querySelectorAll('.staff-only').forEach(el => {
    el.style.setProperty('display', currentLevel >= 2 ? (el.tagName === 'TH' || el.tagName === 'TD' ? 'table-cell' : 'flex') : 'none', 'important');
  });
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.setProperty('display', currentLevel >= 3 ? 'flex' : 'none', 'important');
  });
  document.querySelectorAll('.founder-only').forEach(el => {
    el.style.setProperty('display', currentLevel >= 4 ? 'flex' : 'none', 'important');
  });
}

// REST API Fetch from host bot
async function fetchBotStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    document.getElementById('discord-sync-text').innerText = `Bot: ${data.status}`;
    document.getElementById('stat-bot-ping').innerText = data.ping;
  } catch (err) {
    document.getElementById('discord-sync-text').innerText = "Bot: Offline";
  }
}

async function fetchLiveServerData() {
  const ip = document.getElementById('server-address').value.trim() || 'play.shadowsmp.net';
  document.getElementById('ip-display').innerText = ip;

  try {
    const res = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
    const data = await res.json();

    if (data.online) {
      document.getElementById('stat-status').innerText = "ONLINE";
      document.getElementById('stat-status').className = "stat-value text-green";
      document.getElementById('stat-players').innerText = `${data.players.online} / ${data.players.max}`;
      document.getElementById('server-motd').innerText = data.motd?.clean ? data.motd.clean.join(' ') : "Server live.";

      activePlayersList = data.players.list || [];
      renderPlayerTable(activePlayersList);
    }
  } catch (err) {
    printLog("Error pinging MC server endpoint.", "error");
  }
}

function renderPlayerTable(players) {
  const tbody = document.getElementById('player-table-body');
  tbody.innerHTML = "";

  if (players.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-muted">No players online.</td></tr>`;
    return;
  }

  players.forEach(p => {
    tbody.innerHTML += `
      <tr>
        <td><div class="user-cell"><img src="https://mc-heads.net/avatar/${p}/26"><span>${p}</span></div></td>
        <td>18ms</td>
        <td><span class="btn-xs btn-purple">Member</span></td>
        <td class="staff-only">
          <button class="btn-xs btn-warning" onclick="modAction('kick', '${p}')">Kick</button>
        </td>
      </tr>
    `;
  });
  updateUIState();
}

async function runAdminCommand() {
  const input = document.getElementById('admin-cmd');
  const cmd = input.value.trim();
  if (!cmd) return;

  printLog(`Sending: /${cmd}...`, "cmd");

  try {
    const res = await fetch('/api/execute-cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd, user: currentUser.username, role: currentUser.role })
    });
    const data = await res.json();
    printLog(data.message, data.success ? "info" : "error");
  } catch (e) {
    printLog("Failed to reach server backend endpoint.", "error");
  }

  input.value = "";
}

function printLog(msg, type = "info") {
  const terminal = document.getElementById('terminal-output');
  terminal.innerHTML += `<div class="log-line ${type}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
  terminal.scrollTop = terminal.scrollHeight;
}

function copyIP() {
  navigator.clipboard.writeText(document.getElementById('ip-display').innerText);
  printLog("IP copied to clipboard.", "info");
}

function switchTab(tabId, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  el.classList.add('active');
}

function handleConsoleKey(e) { if(e.key === 'Enter') runAdminCommand(); }
function clearTerminal() { document.getElementById('terminal-output').innerHTML = ''; }
function powerAction(act) { printLog(`Power State Changed: ${act}`, "cmd"); }
function founderAction(act) { printLog(`Founder Override Execution: ${act}`, "gold"); }
function modAction(act, target) { printLog(`Mod Action (${act}) executed on ${target || document.getElementById('mod-target').value}`, "cmd"); }