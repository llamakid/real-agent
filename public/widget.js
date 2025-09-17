// public/widget.js
(function(){
  // Read endpoint from script tag, fallback to placeholder if not provided
  const scriptTag = document.currentScript;
  const API = scriptTag.getAttribute("data-api") || "https://us-central1-<PROJECT_ID>.cloudfunctions.net/api/chat";
  const agentId = scriptTag.getAttribute("data-agent") || "default";

  const css = `
  .rcc-wrap{position:fixed;right:20px;bottom:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,'Noto Sans',sans-serif;z-index:999999}
  .rcc-bubble{width:54px;height:54px;border-radius:50%;border:none;box-shadow:0 8px 24px rgba(0,0,0,.15);cursor:pointer}
  .rcc-panel{width:320px;height:420px;border:1px solid #e5e7eb;box-shadow:0 12px 28px rgba(0,0,0,.18);border-radius:16px;background:#fff;display:flex;flex-direction:column;overflow:hidden}
  .rcc-header{padding:10px 12px;background:#111827;color:#fff;font-weight:600}
  .rcc-log{flex:1;overflow:auto;padding:10px;font-size:14px;line-height:1.35;background:#f9fafb}
  .rcc-msg{margin:6px 0;max-width:85%;padding:8px 10px;border-radius:12px;white-space:pre-wrap}
  .rcc-user{margin-left:auto;background:#dbeafe}
  .rcc-bot{margin-right:auto;background:#fff;border:1px solid #e5e7eb}
  .rcc-form{border-top:1px solid #e5e7eb;padding:8px;background:#fff}
  .rcc-row{display:flex;gap:6px;margin-bottom:6px}
  .rcc-input{flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:8px}
  .rcc-send{padding:8px 12px;border:none;border-radius:8px;background:#111827;color:#fff;cursor:pointer}
  `;
  const sid = "sess_" + Math.random().toString(36).slice(2);

  function el(html){const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstChild;}
  function style(s){const st=document.createElement("style");st.textContent=s;document.head.appendChild(st);}

  style(css);

  const wrap = el(`<div class="rcc-wrap"></div>`);
  const bubble = el(`<button class="rcc-bubble" aria-label="Chat"></button>`);
  bubble.style.background = "linear-gradient(135deg,#111827,#374151)";
  bubble.title = "Chat with us";

  const panel = el(`
    <div class="rcc-panel" style="display:none">
      <div class="rcc-header">Chat with us</div>
      <div class="rcc-log" id="rcc-log"></div>
      <div class="rcc-form">
        <div class="rcc-row">
          <input id="rcc-name" class="rcc-input" placeholder="Name (optional)" />
        </div>
        <div class="rcc-row">
          <input id="rcc-email" class="rcc-input" placeholder="Email (optional)" />
        </div>
        <div class="rcc-row">
          <input id="rcc-phone" class="rcc-input" placeholder="Phone (optional)" />
        </div>
        <div class="rcc-row">
          <input id="rcc-text" class="rcc-input" placeholder="Ask about a property…" />
          <button id="rcc-send" class="rcc-send">Send</button>
        </div>
      </div>
    </div>`);

  wrap.appendChild(panel);
  wrap.appendChild(bubble);
  document.body.appendChild(wrap);

  const log = panel.querySelector("#rcc-log");
  const input = panel.querySelector("#rcc-text");
  const btn = panel.querySelector("#rcc-send");
  const nameI = panel.querySelector("#rcc-name");
  const emailI = panel.querySelector("#rcc-email");
  const phoneI = panel.querySelector("#rcc-phone");

  function add(role, text) {
    const m = el(`<div class="rcc-msg ${role==='user'?'rcc-user':'rcc-bot'}"></div>`);
    m.textContent = text;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  bubble.addEventListener("click", ()=> {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
  });

  async function send() {
    const text = input.value.trim();
    if(!text) return;
    add("user", text);
    input.value = "";
    btn.disabled = true;

    try {
      const r = await fetch(API, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sid,
          pageUrl: location.href,
          name: nameI.value || null,
          email: emailI.value || null,
          phone: phoneI.value || null,
          agentId
        })
      });
      const data = await r.json();
      add("bot", data.reply || "Thanks! We’ll follow up shortly.");
    } catch (e) {
      add("bot", "Sorry, there was a problem sending your message.");
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") send(); });

  // First boot message
  setTimeout(()=> add("bot","Hi! 👋 Looking to buy or sell? Ask me anything."), 400);
})();
