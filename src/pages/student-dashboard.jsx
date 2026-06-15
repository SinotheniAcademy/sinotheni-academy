import { useState, useEffect } from "react";

const G = "#C9A84C", BK = "#0D0D0D", CR = "#FAF7F2";

const COURSE_INFO = {
  waiters101:    { title:"Waiters 101",                              type:"Short Course",    path:"/waiters101",      modules:11 },
  housekeepers101:{ title:"Housekeepers 101",                       type:"Short Course",    path:"/housekeepers101", modules:10 },
  bar101:        { title:"Bar Service 101",                          type:"Short Course",    path:"/barservice101",   modules:10 },
  barista101:    { title:"Barista 101",                              type:"Short Course",    path:"/barista101",      modules:10 },
  receptionist101:{ title:"Hospitality Receptionist 101",            type:"Short Course",    path:"/receptionist101", modules:10 },
  cse101:        { title:"Customer Service Excellence",              type:"Short Course",    path:"/cse101",          modules:10 },
  pcg101:        { title:"Professional Conduct and Grooming",        type:"Short Course",    path:"/pcg101",          modules:10 },
  foh101:        { title:"Front of House Mastery",                   type:"Skills Programme",path:"/foh-mastery",     modules:11 },
  erp101:        { title:"Event Readiness Programme",                type:"Skills Programme",path:"/event-readiness", modules:11 },
  pst101:        { title:"Practical Service Training",               type:"Skills Programme",path:"/practical-service",modules:11 },
  ahm101:        { title:"Accommodation and Housekeeping Management",type:"Skills Programme",path:"/accommodation",   modules:15 },
  wep101:        { title:"Wedding and Event Planning",               type:"Skills Programme",path:"/wedding-planning",modules:15 },
  wec101:        { title:"Wedding and Event Coordination",           type:"Skills Programme",path:"/wedding-coordination",modules:15 },
};

function getSupaConfig() {
  try { const c = JSON.parse(localStorage.getItem("se_supabase_v1") || "null"); if(c?.enabled&&c?.url&&c?.key) return c; } catch {}
  return { enabled: true, url: "https://xshxikdmulrfyclbhlvu.supabase.co", key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4" };
}

function getStoredSession(cfg) {
  try {
    const ref = cfg?.url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!ref) return null;
    const data = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || "null");
    if (!data?.access_token) return null;
    if (data.expires_at && Math.floor(Date.now() / 1000) > data.expires_at - 60) return null;
    return data;
  } catch { return null; }
}

function clearSession(cfg) {
  try {
    const ref = cfg?.url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (ref) localStorage.removeItem(`sb-${ref}-auth-token`);
  } catch {}
}

function printDoc(html) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups."); return; }
  w.document.write(html); w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 1200);
}

export default function StudentDashboard() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState([]);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const cfg = getSupaConfig();
    if (!cfg?.enabled || !cfg?.url || !cfg?.key) {
      window.location.href = "/login";
      return;
    }
    const s = getStoredSession(cfg);
    if (!s?.user) { window.location.href = "/login"; return; }

    setSession(s);
    const u = s.user;
    setUser(u);

    const meta = u.user_metadata || {};
    const courseId = meta.course_id;
    if (courseId && COURSE_INFO[courseId]) setCourse({ id: courseId, ...COURSE_INFO[courseId] });

    // Load module progress
    if (courseId) {
      fetch(`${cfg.url}/rest/v1/student_progress?user_id=eq.${u.id}&course_id=eq.${courseId}&select=*`, {
        headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}` }
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data)) setProgress(data.filter(d => d.passed));
      }).catch(() => {});
    }

    // Load completion (cert/transcript)
    if (courseId) {
      fetch(`${cfg.url}/rest/v1/student_completions?user_id=eq.${u.id}&course_id=eq.${courseId}&select=*&limit=1`, {
        headers: { apikey: cfg.key, Authorization: `Bearer ${s.access_token}` }
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data) && data.length > 0) setCompletion(data[0]);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function changePassword() {
    if (!pwNew) { setPwMsg("Please enter a new password."); return; }
    if (pwNew.length < 6) { setPwMsg("Password must be at least 6 characters."); return; }
    if (pwNew !== pwConfirm) { setPwMsg("Passwords do not match."); return; }
    const cfg = getSupaConfig();
    setPwLoading(true); setPwMsg("");
    try {
      const r = await fetch(`${cfg.url}/auth/v1/user`, {
        method: "PUT",
        headers: { apikey: cfg.key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwNew })
      });
      if (r.ok) { setPwMsg("Password updated successfully."); setPwNew(""); setPwConfirm(""); setPwOld(""); }
      else { setPwMsg("Could not update password. Please try again."); }
    } catch { setPwMsg("Something went wrong. Please try again."); }
    finally { setPwLoading(false); }
  }

  function logout() {
    const cfg = getSupaConfig();
    clearSession(cfg);
    window.location.href = "/login";
  }

  const meta = user?.user_metadata || {};
  const fullName = meta.name || user?.email || "";
  const modulesDone = progress.length;
  const modulesTotal = course?.modules || 0;
  const pct = modulesTotal > 0 ? Math.round(modulesDone / modulesTotal * 100) : 0;
  const isMob = typeof window !== "undefined" && window.innerWidth < 600;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:BK, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@400;600&display=swap" rel="stylesheet"/>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:G, letterSpacing:2 }}>SINOTHENI EVENTS</div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:"#555", letterSpacing:3, marginTop:4 }}>Loading your dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:CR }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ background:BK, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?15:18, fontWeight:700, color:"#fff", letterSpacing:2 }}>SINOTHENI EVENTS</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:G, letterSpacing:3 }}>TRAINING ACADEMY</div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <a href="/" style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#555", textDecoration:"none" }}>All Courses</a>
          <button onClick={logout} style={{ padding:"5px 12px", border:"1px solid #333", background:"transparent", color:"#888", fontFamily:"'Montserrat',sans-serif", fontSize:9, cursor:"pointer", borderRadius:2 }}>SIGN OUT</button>
        </div>
      </div>

      <div style={{ maxWidth:720, margin:"0 auto", padding:isMob?"20px 16px":"32px 24px" }}>

        {/* Welcome */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:3, color:"#aaa", marginBottom:4 }}>STUDENT DASHBOARD</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?26:34, fontWeight:700, color:BK }}>Welcome back, {fullName.split(" ")[0] || "Student"}</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#888", marginTop:4 }}>{user?.email}</div>
        </div>

        {/* Course card */}
        {course ? (
          <div style={{ background:"#fff", border:"1px solid #e8e0d0", borderTop:`3px solid ${G}`, borderRadius:4, padding:20, marginBottom:16 }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, letterSpacing:3, color:G, marginBottom:4 }}>{course.type.toUpperCase()}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:BK, marginBottom:12 }}>{course.title}</div>

            {/* Progress bar */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#888" }}>Modules completed</div>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:BK, fontWeight:600 }}>{modulesDone} / {modulesTotal}</div>
              </div>
              <div style={{ height:6, background:"#f0e8d8", borderRadius:3 }}>
                <div style={{ height:6, background:G, borderRadius:3, width:`${pct}%`, transition:"width 0.5s ease" }}/>
              </div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#aaa", marginTop:4 }}>{pct}% complete</div>
            </div>

            {/* Status + action */}
            {completion ? (
              <div>
                <div style={{ background:"#e8f5ee", border:"1px solid #2d7a45", borderRadius:4, padding:"10px 14px", marginBottom:14, fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#2d7a45" }}>
                  ✓ Course completed · Final score: {completion.final_pct}%
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {completion.certificate_html && (
                    <button onClick={() => printDoc(completion.certificate_html)}
                      style={{ flex:1, padding:11, background:G, color:BK, border:"none", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:800, letterSpacing:1.5, cursor:"pointer", borderRadius:2 }}>
                      CERTIFICATE
                    </button>
                  )}
                  {completion.transcript_html && (
                    <button onClick={() => printDoc(completion.transcript_html)}
                      style={{ flex:1, padding:11, background:"#fff", color:BK, border:"1px solid #e0d8cc", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, cursor:"pointer", borderRadius:2 }}>
                      TRANSCRIPT
                    </button>
                  )}
                  <a href={course.path} style={{ flex:1, padding:11, background:"#fff", color:BK, border:"1px solid #e0d8cc", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, cursor:"pointer", borderRadius:2, textDecoration:"none", textAlign:"center" }}>
                    REVIEW COURSE
                  </a>
                </div>
              </div>
            ) : (
              <a href={course.path} style={{ display:"block", textAlign:"center", padding:12, background:BK, color:G, textDecoration:"none", fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, borderRadius:2 }}>
                {modulesDone === 0 ? "START MY COURSE" : "CONTINUE MY COURSE"}
              </a>
            )}
          </div>
        ) : (
          <div style={{ background:"#fff", border:"1px solid #e8e0d0", borderRadius:4, padding:20, marginBottom:16, textAlign:"center" }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#888", lineHeight:1.8 }}>
              Your course enrolment is pending. Please contact us if you believe this is an error.<br/>
              <a href="mailto:academy@sinothenievents.co.za" style={{ color:G }}>academy@sinothenievents.co.za</a>
            </div>
          </div>
        )}

        {/* Change password */}
        <div style={{ background:"#fff", border:"1px solid #e8e0d0", borderRadius:4, padding:20 }}>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, letterSpacing:2, color:"#aaa", marginBottom:12 }}>CHANGE PASSWORD</div>
          <div style={{ display:"grid", gridTemplateColumns:isMob?"1fr":"1fr 1fr", gap:10, marginBottom:10 }}>
            <input type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="New password"
              style={{ padding:"10px 12px", fontFamily:"'Montserrat',sans-serif", fontSize:12, border:"1px solid #e0d8cc", borderRadius:2, outline:"none" }}/>
            <input type="password" value={pwConfirm} onChange={e=>setPwConfirm(e.target.value)} placeholder="Confirm new password"
              style={{ padding:"10px 12px", fontFamily:"'Montserrat',sans-serif", fontSize:12, border:"1px solid #e0d8cc", borderRadius:2, outline:"none" }}/>
          </div>
          {pwMsg && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:pwMsg.includes("success")?"#2d7a45":"#c0392b", marginBottom:10 }}>{pwMsg}</div>}
          <button onClick={changePassword} disabled={pwLoading}
            style={{ padding:"9px 20px", background:G, color:BK, border:"none", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, letterSpacing:1.5, cursor:"pointer", borderRadius:2 }}>
            {pwLoading ? "UPDATING..." : "UPDATE PASSWORD"}
          </button>
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#aaa", lineHeight:1.8 }}>
          Need help? Contact us at <a href="mailto:academy@sinothenievents.co.za" style={{ color:G }}>academy@sinothenievents.co.za</a> · 083 249-5709
        </div>
      </div>
    </div>
  );
}
