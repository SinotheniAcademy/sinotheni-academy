import { useState, useEffect } from "react";

const G = "#C9A84C", BK = "#0D0D0D";

function getSupaConfig() {
  try { const c = JSON.parse(localStorage.getItem("se_supabase_v1") || "null"); if(c?.enabled&&c?.url&&c?.key) return c; } catch {}
  return { enabled: true, url: "https://xshxikdmulrfyclbhlvu.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4" };
}

function storeSession(cfg, data) {
  try {
    const ref = cfg.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return;
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(data));
  } catch {}
}

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | forgot | sent | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Check if arriving from a password reset link
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    if (params.get("type") === "recovery" && params.get("access_token")) {
      setMode("reset");
    }
  }, []);

  // Check if already logged in
  useEffect(() => {
    const cfg = getSupaConfig();
    if (!cfg?.url) return;
    try {
      const ref = cfg.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (!ref) return;
      const session = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || "null");
      if (session?.access_token && session.expires_at > Math.floor(Date.now() / 1000)) {
        window.location.href = "/student-dashboard";
      }
    } catch {}
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    const cfg = getSupaConfig();
    if (!cfg?.enabled || !cfg?.url || !cfg?.key) {
      setError("The academy login system is not yet active. Please use your access code at the course link provided in your enrolment email.");
      return;
    }
    setLoading(true); setError("");
    try {
      const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: cfg.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      const data = await r.json();
      if (data.access_token) {
        storeSession(cfg, data);
        window.location.href = "/student-dashboard";
      } else {
        setError(data.error_description || data.msg || "Incorrect email or password. Your password is the access code you received by email.");
      }
    } catch { setError("Could not connect. Please check your internet and try again."); }
    finally { setLoading(false); }
  }

  async function handleForgot() {
    if (!email) { setError("Please enter your email address."); return; }
    const cfg = getSupaConfig();
    if (!cfg?.enabled || !cfg?.url || !cfg?.key) {
      setError("The login system is not yet active. Please contact academy@sinothenievents.co.za.");
      return;
    }
    setLoading(true); setError("");
    try {
      await fetch(`${cfg.url}/auth/v1/recover`, {
        method: "POST",
        headers: { apikey: cfg.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      setMode("sent");
    } catch { setError("Could not send reset email. Please try again."); }
    finally { setLoading(false); }
  }

  async function handleReset() {
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    const cfg = getSupaConfig();
    if (!cfg?.url || !cfg?.key) { setError("System not configured."); return; }
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const token = params.get("access_token");
    setLoading(true); setError("");
    try {
      const r = await fetch(`${cfg.url}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: cfg.key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });
      if (r.ok) { setInfo("Password updated successfully."); setTimeout(() => window.location.href = "/login", 2000); }
      else { setError("Could not update password. Please request a new reset link."); }
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  const isMob = typeof window !== "undefined" && window.innerWidth < 600;

  return (
    <div style={{ minHeight:"100vh", background:BK, display:"flex", flexDirection:"column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      <div style={{ padding:isMob?"14px 20px":"14px 40px", borderBottom:"1px solid #1a1a1a" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?16:20, fontWeight:700, color:"#fff", letterSpacing:2 }}>SINOTHENI EVENTS</div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:G, letterSpacing:3 }}>TRAINING ACADEMY</div>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ width:"100%", maxWidth:380 }}>

          {mode === "login" && (
            <>
              <div style={{ textAlign:"center", marginBottom:28 }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, letterSpacing:4, color:"#555", marginBottom:10 }}>STUDENT LOGIN</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?26:34, fontWeight:700, color:"#fff", lineHeight:1.1 }}>Welcome Back</div>
              </div>
              <div style={{ background:"#111", padding:isMob?22:28, borderRadius:4 }}>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:2, color:"#666", display:"block", marginBottom:4 }}>EMAIL ADDRESS</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="your@email.com"
                    style={{ width:"100%", padding:"12px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:13, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div style={{ marginBottom:error?10:16 }}>
                  <label style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:2, color:"#666", display:"block", marginBottom:4 }}>PASSWORD</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Your access code or password"
                    style={{ width:"100%", padding:"12px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:13, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", boxSizing:"border-box" }}/>
                  <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#444", marginTop:5 }}>First time? Your password is the access code from your enrolment email.</div>
                </div>
                {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12, lineHeight:1.6 }}>{error}</div>}
                <button onClick={handleLogin} disabled={loading}
                  style={{ width:"100%", background:loading?"#444":G, color:BK, border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:loading?"default":"pointer", borderRadius:2, marginBottom:14 }}>
                  {loading ? "SIGNING IN..." : "SIGN IN"}
                </button>
                <div style={{ textAlign:"center" }}>
                  <button onClick={()=>{setMode("forgot");setError("");}} style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#555", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}>
                    Forgot your password?
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === "forgot" && (
            <>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, letterSpacing:4, color:"#555", marginBottom:10 }}>RESET PASSWORD</div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, color:"#fff" }}>Forgot Password</div>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#555", marginTop:8, lineHeight:1.7 }}>Enter your email address and we will send you a reset link.</div>
              </div>
              <div style={{ background:"#111", padding:24, borderRadius:4 }}>
                <label style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:2, color:"#666", display:"block", marginBottom:4 }}>EMAIL ADDRESS</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleForgot()} placeholder="your@email.com"
                  style={{ width:"100%", padding:"12px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:13, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", boxSizing:"border-box", marginBottom:error?10:16 }}/>
                {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12 }}>{error}</div>}
                <button onClick={handleForgot} disabled={loading}
                  style={{ width:"100%", background:loading?"#444":G, color:BK, border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:"pointer", borderRadius:2, marginBottom:12 }}>
                  {loading ? "SENDING..." : "SEND RESET LINK"}
                </button>
                <button onClick={()=>{setMode("login");setError("");}} style={{ width:"100%", background:"transparent", border:"1px solid #333", color:"#666", padding:11, fontFamily:"'Montserrat',sans-serif", fontSize:9, cursor:"pointer", borderRadius:2 }}>
                  BACK TO LOGIN
                </button>
              </div>
            </>
          )}

          {mode === "sent" && (
            <div style={{ background:"#111", padding:28, borderRadius:4, textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:14 }}>✉️</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:G, marginBottom:8 }}>Check Your Email</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#666", lineHeight:1.8, marginBottom:20 }}>
                If an account exists for <strong style={{color:"#aaa"}}>{email}</strong>, a password reset link has been sent. Check your inbox and spam folder.
              </div>
              <button onClick={()=>{setMode("login");setError("");}} style={{ width:"100%", background:G, color:BK, border:"none", padding:12, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:"pointer", borderRadius:2 }}>
                BACK TO LOGIN
              </button>
            </div>
          )}

          {mode === "reset" && (
            <>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:700, color:"#fff" }}>Set New Password</div>
              </div>
              <div style={{ background:"#111", padding:24, borderRadius:4 }}>
                {["New Password","Confirm Password"].map((label, i) => (
                  <div key={i} style={{ marginBottom:14 }}>
                    <label style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:2, color:"#666", display:"block", marginBottom:4 }}>{label.toUpperCase()}</label>
                    <input type="password" value={i===0?newPassword:confirmPassword} onChange={e=>i===0?setNewPassword(e.target.value):setConfirmPassword(e.target.value)}
                      style={{ width:"100%", padding:"12px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:13, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", boxSizing:"border-box" }}/>
                  </div>
                ))}
                {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12 }}>{error}</div>}
                {info && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#2d7a45", marginBottom:12 }}>{info}</div>}
                <button onClick={handleReset} disabled={loading}
                  style={{ width:"100%", background:G, color:BK, border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:"pointer", borderRadius:2 }}>
                  {loading ? "UPDATING..." : "SET NEW PASSWORD"}
                </button>
              </div>
            </>
          )}

          <div style={{ textAlign:"center", marginTop:20 }}>
            <a href="/" style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#333", textDecoration:"none", letterSpacing:1 }}>Back to all courses</a>
          </div>
        </div>
      </div>
    </div>
  );
}
