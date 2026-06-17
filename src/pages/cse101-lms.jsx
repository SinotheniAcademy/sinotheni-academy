import { useState, useEffect } from "react";

const CODES_KEY = "se_codes_v1";
const BANKING_KEY = "se_banking_v1";

// UPDATE THESE if you are not using the Settings tab in admin
const FALLBACK_BANKING = {
  bank: "FNB",
  accountName: "Sinotheni In Trading (Pty) Ltd",
  accountNo: "UPDATE IN ADMIN SETTINGS",
  branchCode: "250655",
  accountType: "Cheque Account",
  ref: "Your Full Name and Course Name"
};

function loadCodes() { try { return JSON.parse(localStorage.getItem(CODES_KEY) || "[]"); } catch { return []; } }
function saveCodes(c) { try { localStorage.setItem(CODES_KEY, JSON.stringify(c)); } catch {} }
function loadBanking() { try { const v = JSON.parse(localStorage.getItem(BANKING_KEY)); return v || FALLBACK_BANKING; } catch { return FALLBACK_BANKING; } }
function sessionKey(id) { return `se_unlocked_${id}`; }



const _SECRET = "sne2025xk";
const _CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function _hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function _computeChecksum(randomPart, courseId) {
  let h = _hash(courseId + _SECRET + randomPart);
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += _CHARS[h % _CHARS.length];
    h = Math.floor(h / _CHARS.length);
  }
  return out;
}

async function validateCode(input, courseId) {
  const code = input.trim().toUpperCase();
  if (!code) return { valid: false, message: "Please enter your access code." };
  const parts = code.split("-");
  if (parts.length !== 2 || parts[0].length !== 4 || parts[1].length !== 4) {
    return { valid: false, message: "Code format is incorrect. Codes look like XXXX-XXXX." };
  }
  const [randomPart, checksum] = parts;
  const expected = _computeChecksum(randomPart, courseId);
  if (checksum !== expected) {
    return { valid: false, message: "That code is not valid for this course. Please check your email or contact academy@sinothenievents.co.za" };
  }
  return { valid: true, code: { code, courseId, studentName: "", confirmedName: "" } };
}

async function activateCode(code, studentName, courseId) {
  // Record activation in Supabase (non-blocking)
  try {
    fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/access_codes?code=eq." + encodeURIComponent(code), {
      method: "PATCH",
      headers: { 
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4", 
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "active", confirmed_name: studentName, activated_at: new Date().toISOString() })
    });
  } catch {}
}


function LockScreen({ courseId, courseTitle, courseType, coursePrice, onUnlock }) {
  const [step, setStep] = useState("code");
  const [inputCode, setInputCode] = useState("");
  const [inputName, setInputName] = useState("");
  const [foundCode, setFoundCode] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-detect code from URL link
  useEffect(() => {
    const urlCode = new URLSearchParams(window.location.search).get("code");
    if (urlCode) {
      const c = urlCode.trim().toUpperCase();
      setInputCode(c);
      setLoading(true);
      validateCode(c, courseId).then(result => {
        setLoading(false);
        if (result.valid) {
          setFoundCode(result.code);
          if (result.code.confirmedName) {
            doUnlock(result.code, result.code.confirmedName);
          } else {
            setInputName(result.code.studentName || "");
            setStep("name");
          }
        } else {
          setError("This link has an invalid or expired code. Please contact us.");
        }
      });
    }
  }, []);

  async function doCode() {
    const t = inputCode.trim();
    if (!t) { setError("Please enter your access code."); return; }
    setLoading(true); setError("");

    // Try Supabase first, fall back to localStorage
    const result = await validateCode(t, courseId);

    setLoading(false);
    if (!result.valid) {
      setError("That code is not valid for this course. Please check your email or contact us.");
      return;
    }
    setFoundCode(result.code);
    if (result.code.confirmedName) {
      doUnlock(result.code, result.code.confirmedName);
    } else {
      setInputName(result.code.studentName || "");
      setStep("name");
    }
  }

  function doUnlock(code, name) {
    activateCode(code, name);
    sessionStorage.setItem(sessionKey(courseId), JSON.stringify({ code: code.code, name }));
    onUnlock({ code: code.code, name });
  }

  function doName() {
    const n = inputName.trim();
    if (!n) { setError("Please enter your full name."); return; }
    doUnlock(foundCode, n);
  }

  function requestAccess() {
    const bk = loadBanking();
    const bankBlock = bk.accountNo && !bk.accountNo.includes("UPDATE")
      ? `\n\nBANKING DETAILS:\nBank: ${bk.bank}\nAccount Name: ${bk.accountName}\nAccount Number: ${bk.accountNo}\nBranch Code: ${bk.branchCode}\nAccount Type: ${bk.accountType}\nReference: [Your Full Name and ${courseTitle}]`
      : "";
    const priceText = coursePrice ? `R${coursePrice}` : "please confirm the price with us";
    const subj = encodeURIComponent(`Course Access Request: ${courseTitle}`);
    const body = encodeURIComponent(`Hi Sinotheni Events Team,

I would like to enrol for the following course:

Course: ${courseTitle}
Course Type: ${courseType}
Price: ${priceText}

My Details:
Full Name:
Phone:
Email: (this address)

I am attaching my proof of payment.

Please send my access code to this email. I understand you respond within 48 hours.${bankBlock}

Kind regards,`);
    window.open(`mailto:academy@sinothenievents.co.za?subject=${subj}&body=${body}`);
  }

  const isMob = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div style={{ minHeight:"100vh", background:"#0D0D0D", display:"flex", flexDirection:"column" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      <div style={{ padding: isMob ? "14px 20px" : "14px 40px", borderBottom:"1px solid #1a1a1a" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?16:20, fontWeight:700, color:"#fff", letterSpacing:2 }}>SINOTHENI EVENTS</div>
        <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:7, color:"#C9A84C", letterSpacing:3 }}>TRAINING ACADEMY</div>
      </div>

      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:isMob?"20px 20px":"24px 40px" }}>
        <div style={{ width:"100%", maxWidth:420 }}>

          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, letterSpacing:3, color:"#555", marginBottom:8 }}>{courseType.toUpperCase()}</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMob?24:34, fontWeight:700, color:"#fff", lineHeight:1.1, marginBottom:6 }}>{courseTitle}</div>
            <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#555" }}>Sinotheni Events Training Academy</div>
          </div>

          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", border:"2px solid #C9A84C", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🔐</div>
          </div>

          {step === "code" && (
            <div style={{ background:"#111", padding:isMob?22:28, borderRadius:4 }}>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8.5, letterSpacing:2, color:"#555", marginBottom:6, textAlign:"center" }}>ENTER YOUR ACCESS CODE</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#666", textAlign:"center", marginBottom:18, lineHeight:1.7 }}>You received this code by email after enrolling.</div>
              <input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && doCode()}
                placeholder="e.g. ABCD-EFGH"
                maxLength={9}
                style={{ width:"100%", padding:"13px 14px", fontFamily:"monospace", fontSize:18, letterSpacing:4, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", textAlign:"center", marginBottom:error?10:14, boxSizing:"border-box" }}
              />
              {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12, lineHeight:1.6, textAlign:"center" }}>{error}</div>}
              <button onClick={doCode} disabled={loading} style={{ width:"100%", background:loading?"#444":"#C9A84C", color:"#0D0D0D", border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:loading?"default":"pointer", borderRadius:2 }}>
                {loading ? "CHECKING..." : "ACCESS MY COURSE"}
              </button>
              <div style={{ borderTop:"1px solid #1a1a1a", marginTop:20, paddingTop:18, textAlign:"center" }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#444", marginBottom:10 }}>Don't have a code yet?</div>
                <button onClick={requestAccess} style={{ width:"100%", background:"transparent", border:"1px solid #333", color:"#888", padding:"10px", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, letterSpacing:1.5, cursor:"pointer", borderRadius:2 }}>
                  REQUEST ACCESS BY EMAIL
                </button>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#333", marginTop:8, lineHeight:1.6 }}>
                  We respond within 48 hours.
                </div>
              </div>
            </div>
          )}

          {step === "name" && (
            <div style={{ background:"#111", padding:isMob?22:28, borderRadius:4 }}>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8.5, letterSpacing:2, color:"#C9A84C", marginBottom:6, textAlign:"center" }}>CODE ACCEPTED</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#666", textAlign:"center", marginBottom:18, lineHeight:1.7 }}>Enter your full name and surname exactly as you want them to appear on your certificate.</div>
              <input
                type="text"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                onInput={e => setInputName(e.target.value)}
                autoComplete="off"
                onKeyDown={e => e.key === "Enter" && doName()}
                placeholder="e.g. Thandi Dlamini"
                style={{ width:"100%", padding:"13px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:14, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", textAlign:"center", marginBottom:error?10:14, boxSizing:"border-box" }}
              />
              {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12 }}>{error}</div>}
              <button onClick={doName} style={{ width:"100%", background:"#C9A84C", color:"#0D0D0D", border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:"pointer", borderRadius:2 }}>
                BEGIN MY COURSE
              </button>
            </div>
          )}

          <div style={{ textAlign:"center", marginTop:20 }}>
            <a href="/" style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#333", textDecoration:"none", letterSpacing:1 }}>Back to all courses</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// For group mode: add this component above the main App export in each LMS file

// END OF SHARED LOCKSCREEN CODE

function CourseInfoScreen({onHaveCode}){
  const bk=()=>{try{return JSON.parse(localStorage.getItem("se_banking_v1")||"null");}catch{return null;}};
  const b=bk();
  const bankStr=b?`\n\nBANKING DETAILS:\nBank: ${b.bank}\nAccount Name: ${b.account}\nAccount Number: ${b.accountNo}\nReference: ${COURSE_TITLE}`:"\n\nPlease reply and we will send you banking details.";
  const subj=encodeURIComponent(`Enrolment: ${COURSE_TITLE}`);
  const body=encodeURIComponent(`Hi Sinotheni Events Team,\n\nI would like to enrol for:\n\nCourse: ${COURSE_TITLE}\nCourse Type: ${COURSE_TYPE}\nPrice: R${COURSE_PRICE.toLocaleString()}${bankStr}\n\nMy Details:\nFull Name:\nPhone:\nEmail: (this address)\n\nI will attach proof of payment once payment is made.\n\nKind regards,`);
  const isMob=typeof window!=="undefined"&&window.innerWidth<600;
  return(
    <div style={{minHeight:"100vh",background:"#0D0D0D",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{padding:isMob?"12px 20px":"14px 40px",borderBottom:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?15:18,fontWeight:700,color:"#fff",letterSpacing:2}}>SINOTHENI EVENTS</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:"#C9A84C",letterSpacing:3}}>TRAINING ACADEMY</div>
        </div>
        <a href="/" style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#555",textDecoration:"none",letterSpacing:1}}>All Courses</a>
      </div>
      <div style={{flex:1,maxWidth:680,margin:"0 auto",padding:isMob?"24px 20px":"40px 24px",width:"100%",boxSizing:"border-box"}}>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:"#C9A84C",marginBottom:10}}>{COURSE_TYPE}</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?32:44,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:16}}>{COURSE_TITLE}</div>
        <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}>
          {[["INVESTMENT",`R${COURSE_PRICE.toLocaleString()}`,"#C9A84C"],["MODULES",MODULE_NAMES.length,"#fff"],["CERTIFICATE","Included","#fff"],["PASS MARK","60%","#fff"]].map(([label,val,col])=>(
            <div key={label} style={{background:"#111",border:"1px solid #1a1a1a",padding:"8px 14px",borderRadius:2}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:3,color:"#555",marginBottom:3}}>{label}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:14,fontWeight:700,color:col}}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#555",marginBottom:12}}>WHAT YOU WILL LEARN</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {MODULE_NAMES.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{minWidth:18,height:18,borderRadius:"50%",background:"transparent",border:"1px solid #C9A84C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#C9A84C",fontWeight:700,marginTop:2,flexShrink:0}}>{i+1}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",lineHeight:1.6,paddingTop:1}}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:"1px solid #1a1a1a",paddingTop:24,display:"flex",flexDirection:"column",gap:10}}>
          <a href={`mailto:academy@sinothenievents.co.za?subject=${subj}&body=${body}`}
            style={{display:"block",textAlign:"center",padding:14,background:"#C9A84C",color:"#0D0D0D",textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,borderRadius:2}}>
            ENROL NOW, REQUEST ACCESS
          </a>
          <button onClick={onHaveCode}
            style={{width:"100%",padding:12,background:"transparent",border:"1px solid #2a2a2a",color:"#666",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>
            I ALREADY HAVE MY ACCESS CODE
          </button>
        </div>
      </div>
    </div>
  );
}

async function saveStaffingApplication(profile, courseId, courseTitle) {
  try {
    await fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/staffing_applications", {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        city: profile.city,
        province: profile.province,
        dob: profile.dob || "",
        qualification: profile.qualification,
        availability: profile.availability,
        course_id: courseId,
        course_title: courseTitle,
        submitted_at: new Date().toISOString()
      })
    });
  } catch(e) { console.log("Staffing save error:", e); }
}

async function saveProgress(code, courseId, studentName, progressData) {
  try {
    await fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/student_progress_v2", {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        code: code,
        course_id: courseId,
        student_name: studentName,
        progress_data: progressData,
        last_updated: new Date().toISOString()
      })
    });
  } catch(e) { console.log("Progress save:", e); }
}

async function loadProgress(code, courseId) {
  try {
    const res = await fetch(
      `https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/student_progress_v2?code=eq.${encodeURIComponent(code)}&select=*`,
      { headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4", Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4" } }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0].progress_data;
    return null;
  } catch(e) { return null; }
}


function downloadNotes(chapter) {
  const res = (typeof RESOURCES !== 'undefined' ? RESOURCES : []).find(r => r.filename && r.filename.includes(String(chapter.id).padStart(2,'0'))) || (typeof RESOURCES !== 'undefined' ? RESOURCES[Math.min(chapter.id - 1, RESOURCES.length - 1)] : null);
  if (!res) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=Montserrat:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#FAF7F2;padding:14mm 16mm;font-family:'Montserrat',sans-serif;}
.hdr{display:flex;align-items:center;justify-content:space-between;padding-bottom:4mm;border-bottom:2px solid #C9A84C;margin-bottom:5mm;}
.logo-area{display:flex;align-items:center;gap:4mm;}
.logo{width:38px;}
.brand-name{font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:700;color:#0D0D0D;}
.brand-sub{font-family:'Montserrat',sans-serif;font-size:6pt;color:#C9A84C;letter-spacing:3px;}
.doc-label{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:3px;color:#888;}
.course-tag{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:3px;color:#C9A84C;margin-bottom:2mm;}
.title{font-family:'Cormorant Garamond',serif;font-size:20pt;font-weight:700;color:#0D0D0D;margin-bottom:1mm;}
.subtitle{font-family:'Montserrat',sans-serif;font-size:8pt;color:#888;margin-bottom:5mm;}
.divider{height:1px;background:#e8e0d0;margin-bottom:5mm;}
.body{font-family:'Montserrat',sans-serif;font-size:9pt;color:#444;line-height:2;white-space:pre-line;}
.footer{margin-top:8mm;padding-top:4mm;border-top:1px solid #e8e0d0;display:flex;justify-content:space-between;}
.footer-brand{font-family:'Montserrat',sans-serif;font-size:6.5pt;color:#aaa;letter-spacing:1px;}
</style></head><body>
<div class="hdr">
<div class="logo-area">
<img class="logo" src="${window.location.origin}/logo.png"/>
<div><div class="brand-name">Sinotheni Events</div><div class="brand-sub">TRAINING ACADEMY</div></div>
</div>
<div class="doc-label">COURSE RESOURCE</div>
</div>
<div class="course-tag">${COURSE_TITLE} &middot; ${COURSE_TYPE}</div>
<div class="title">${res.title}</div>
<div class="subtitle">${res.desc}</div>
<div class="divider"></div>
<div class="body">${res.content}</div>
<div class="footer"><div class="footer-brand">SINOTHENI EVENTS TRAINING ACADEMY &middot; Reg No: K2021422957</div></div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to download resources."); return; }
  w.document.write(html);
  w.document.close();
  w.print();
}


const G = "#C9A84C", BK = "#0D0D0D", CR = "#FAF7F2";
const STORE_KEY = "se_cse101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "cse101";
const COURSE_TITLE = "Customer Service Excellence";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 900;


function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v=>v.name.includes("Google")&&v.lang.startsWith("en"))||voices.find(v=>v.lang==="en-ZA")||voices.find(v=>v.lang.startsWith("en-GB"))||voices.find(v=>v.lang.startsWith("en"));
  if(v) u.voice=v; u.rate = 1.0; u.pitch=1.1; u.volume=1.0; u.lang="en-ZA";
  u.onend=()=>{if(onEnd)onEnd();}; u.onerror=()=>{if(onEnd)onEnd();};
  window.speechSynthesis.speak(u);
}

function downloadResource(res) {
  try{const a=document.createElement("a");a.href="data:text/plain;charset=utf-8,"+encodeURIComponent(res.content);a.download=res.filename;a.style.display="none";document.body.appendChild(a);a.click();setTimeout(()=>document.body.removeChild(a),100);}
  catch(e){const w=window.open("","_blank");if(w){w.document.write("<pre style='padding:20px;font-family:monospace;'>"+res.content.replace(/</g,"&lt;")+"</pre>");w.document.close();}}
}

const MODULE_NAMES = ['The Customer Service Mindset', 'First Impressions and Professional Communication', 'Understanding Guest Expectations', 'Active Listening and Empathy', 'Handling Difficult Guests', 'Complaint Resolution: The AAAF Framework', 'Telephone and Digital Communication Standards', 'Working as a Service Team', 'Brand Representation and Service Culture', 'Building a Career in Service Excellence'];

const CHAPTERS = [
  {
    id: 1,
    title: "What is Customer Service Excellence?",
    subtitle: "Definition, importance, impact on brand reputation and repeat business",
    duration: "20 min",
    slides: [
      { title: "Welcome to Customer Service Excellence", type: "intro", body: "This course will equip you with the mindset, skills, and tools to deliver outstanding customer service in any professional environment.\n\nWhether you work in hospitality, events, retail, corporate services, or any guest-facing role, the principles in this course will transform how you interact with people and how people experience your service." },
      { title: "What is Customer Service Excellence?", type: "body", body: "Customer service excellence is not simply being polite. It is the consistent delivery of an experience that meets and exceeds what a guest or client expects.\n\nIt means anticipating needs before they are expressed. It means resolving problems with grace. It means making every person feel valued, heard, and respected, every single time.\n\nExcellence is not an occasional effort. It is a standard that is maintained whether the venue is quiet or overwhelmed, whether the guest is easy or difficult, and whether or not anyone is watching." },
      { title: "Why It Matters", type: "highlight", points: [{ text: "A guest who receives excellent service tells an average of 9 people. A guest who receives poor service tells an average of 16 people." }, { text: "It costs five times more to attract a new client than to retain an existing one. Service excellence drives repeat business." }, { text: "Brand reputation is built or destroyed in individual guest interactions. Every team member is a brand ambassador." }, { text: "In a competitive market, price and product can be matched. The service experience is the true differentiator." }] },
      { title: "The Impact on Business", type: "two-col", left: { heading: "When Service is Excellent", items: ["Guests return and spend more", "Positive word of mouth drives new business", "Staff morale improves in a culture of excellence", "The brand grows its reputation organically", "Clients choose you over competitors on service alone"] }, right: { heading: "When Service Fails", items: ["Guests leave and do not return", "Negative reviews spread faster than positive ones", "Staff motivation declines in a culture of complaints", "The brand suffers long-term reputational damage", "Competitors gain the clients you lose"] } },
      { title: "Excellence is a Choice", type: "body", body: "Customer service excellence does not happen by accident. It is the result of deliberate decisions made by individuals who take pride in their work.\n\nYou choose how you greet someone. You choose how you respond to a complaint. You choose whether to go the extra step or to do the minimum.\n\nThis course will give you the tools. The choice to apply them, consistently and with commitment, is yours." },
    ],
    questions: [
      { q: "What is customer service excellence?", opts: ["Being polite when you feel like it", "The consistent delivery of an experience that meets and exceeds guest expectations", "Doing the minimum required by your job description", "Being friendly only with regular guests"], a: 1 },
      { q: "How many people does a guest who receives poor service typically tell?", opts: ["About 3 people", "About 9 people", "About 16 people", "About 5 people"], a: 2 },
      { q: "What is the true differentiator between competitors in a service environment?", opts: ["Price", "Product quality", "Location", "The service experience"], a: 3 },
      { q: "Customer service excellence is:", opts: ["An occasional effort when guests are watching", "Only important at high-end venues", "A standard maintained consistently, whether or not anyone is watching", "The responsibility of management only"], a: 2 },
    ],
  },
  {
    id: 2,
    title: "First Impressions",
    subtitle: "Appearance, greeting, tone of voice, body language, approachability",
    duration: "25 min",
    slides: [
      { title: "You Never Get a Second Chance", type: "body", body: "Research consistently shows that people form a first impression within the first seven seconds of meeting someone.\n\nIn a service environment, that impression is formed before you have said a single word. Your appearance, your posture, your expression, and the energy you project all communicate who you are and what standard of service the guest can expect.\n\nA strong first impression creates trust instantly. A poor one creates a barrier that is very difficult to overcome, no matter how good the service becomes afterwards." },
      { title: "Professional Appearance", type: "list", intro: "Your appearance is your first communication with every guest:", items: ["Uniform or professional attire must be clean, ironed, and well-fitted at all times", "Shoes must be clean and appropriate for the environment", "Hair must be neat, tidy, and away from the face where required", "Personal hygiene is non-negotiable: fresh, clean, no strong fragrances", "Minimal jewellery and conservative accessories in professional environments", "Name badge visible and correctly worn where applicable", "Your appearance communicates your pride in your role. Dress like you mean it."] },
      { title: "The Power of a Greeting", type: "steps", intro: "A great greeting sets the tone for the entire interaction:", steps: [{ number: "1", label: "Acknowledge immediately", detail: "Make eye contact and acknowledge the guest within seconds of their arrival. Never let a guest feel invisible." }, { number: "2", label: "Smile genuinely", detail: "A real smile communicates warmth and welcome. It is the most powerful tool in service." }, { number: "3", label: "Greet professionally and personally", detail: "Use the guest's name if known. Use warm, professional language. 'Good morning, welcome. How may I assist you?'" }] },
      { title: "Tone of Voice and Language", type: "two-col", left: { heading: "Professional Tone", items: ["Warm and welcoming, not cold or robotic", "Clear and calm, not rushed or loud", "Confident, not apologetic or uncertain", "Positive language: 'Certainly' not 'I suppose'", "Consistent regardless of how busy you are"] }, right: { heading: "Language to Avoid", items: ["Slang or informal language with guests", "Negative phrases: 'I don't know', 'That's not my problem'", "Aggressive or dismissive tone", "Speaking too fast or mumbling", "Sighing, eye-rolling, or visible impatience"] } },
      { title: "Body Language and Approachability", type: "highlight", points: [{ text: "Stand upright with open posture. Crossed arms signal disinterest and defensiveness." }, { text: "Face the guest fully when speaking to them. Partial attention communicates that something else is more important." }, { text: "Nodding while listening shows engagement. It reassures the guest that they are being heard." }, { text: "Maintain comfortable eye contact. Looking away repeatedly signals discomfort or disinterest." }, { text: "Move with purpose and energy. Slow, slouched movement communicates a lack of enthusiasm for the role." }] },
    ],
    questions: [
      { q: "How quickly do people form a first impression?", opts: ["Within 1 minute", "Within 30 seconds", "Within 7 seconds", "After a full conversation"], a: 2 },
      { q: "What is the most powerful tool in customer service?", opts: ["A loud, confident voice", "A genuine smile", "An expensive uniform", "A formal greeting script"], a: 1 },
      { q: "Which body language signal communicates disinterest or defensiveness?", opts: ["Nodding while listening", "Open posture", "Crossed arms", "Making eye contact"], a: 2 },
      { q: "Which of the following is an example of professional language?", opts: ["'I suppose I can help you.'", "'That's not really my department.'", "'Certainly, allow me to assist you.'", "'I dunno, let me check.'"], a: 2 },
      { q: "When should you acknowledge a guest upon their arrival?", opts: ["When you are free and ready", "Within 5 minutes", "Within seconds of their arrival", "Only after they approach you directly"], a: 2 },
    ],
  },
  {
    id: 3,
    title: "Communication Skills",
    subtitle: "Active listening, clear speech, professional language, non-verbal cues",
    duration: "25 min",
    slides: [
      { title: "Communication is Everything", type: "body", body: "Almost every service failure can be traced back to a communication breakdown. A guest who felt unheard. A staff member who assumed instead of asking. A message that was unclear.\n\nExcellent communication is not about talking the most. It is about listening well, speaking clearly, and ensuring that both parties leave the interaction with the same understanding." },
      { title: "Active Listening", type: "list", intro: "Active listening is the foundation of excellent service communication:", items: ["Give the guest your full attention. Put down what you are doing and focus.", "Do not interrupt. Allow the guest to finish their thought completely.", "Do not formulate your response while the guest is still speaking. Listen first.", "Confirm understanding by summarising: 'So what I am hearing is...'", "Ask clarifying questions if anything is unclear, never assume.", "Non-verbal listening cues: nod, maintain eye contact, lean slightly forward."] },
      { title: "Speaking Clearly and Professionally", type: "list", intro: "How you say something is as important as what you say:", items: ["Speak at a moderate pace. Too fast suggests nerves or rushing. Too slow suggests disinterest.", "Articulate clearly. Do not mumble or trail off at the end of sentences.", "Use professional vocabulary appropriate to your environment.", "Avoid filler words: 'um', 'like', 'you know', 'basically'.", "Adjust your volume to the environment: quieter in intimate settings, clearer in noisy ones.", "Confirm the guest has understood by asking: 'Does that make sense?' or 'Is there anything I can clarify?'"] },
      { title: "Professional Language Standards", type: "two-col", left: { heading: "Say This", items: ["'Certainly, I will attend to that immediately.'", "'Allow me to check that for you.'", "'I apologise for the inconvenience.'", "'May I assist you with anything else?'", "'Thank you for bringing this to my attention.'"] }, right: { heading: "Not This", items: ["'No problem.' (implies there could be a problem)", "'I'll try.' (implies uncertainty)", "'That's not my job.' (dismissive)", "'Calm down.' (escalates tension)", "'I don't know.' (without offering to find out)"] } },
      { title: "Non-Verbal Communication", type: "highlight", points: [{ text: "Over 55% of communication is non-verbal. What your body communicates often carries more weight than your words." }, { text: "Facial expressions must match your words. Saying 'I am happy to help' with a flat expression sends a contradictory message." }, { text: "Personal space: respect a professional distance of approximately one arm's length in most service interactions." }, { text: "Gestures should be open and calm. Pointing, finger-wagging, or aggressive gestures undermine your professionalism immediately." }] },
    ],
    questions: [
      { q: "What is active listening?", opts: ["Talking more than the guest to show knowledge", "Giving the guest your full attention, not interrupting, and confirming understanding", "Listening while doing other tasks at the same time", "Nodding repeatedly without processing what is being said"], a: 1 },
      { q: "What percentage of communication is non-verbal?", opts: ["Over 80%", "About 20%", "Over 55%", "About 35%"], a: 2 },
      { q: "What is wrong with saying 'No problem' to a guest?", opts: ["It is too informal for most settings", "It implies there could have been a problem", "It is grammatically incorrect", "Guests find it offensive"], a: 1 },
      { q: "How should you respond if you do not know the answer to a guest's question?", opts: ["Say 'I don't know' and move on", "Make up an answer to avoid seeming uninformed", "Acknowledge you are unsure and offer to find out immediately", "Direct them to someone else without offering further help"], a: 2 },
      { q: "Which of the following is an example of active listening?", opts: ["Formulating your response while the guest is still speaking", "Interrupting to clarify before the guest finishes", "Summarising what the guest said to confirm understanding", "Looking around the room while the guest speaks"], a: 2 },
    ],
  },
  {
    id: 4,
    title: "Understanding Guest Expectations",
    subtitle: "Guest types, reading the room, anticipating needs before being asked",
    duration: "25 min",
    slides: [
      { title: "Every Guest is Different", type: "body", body: "No two guests are the same. A corporate client arriving for a boardroom lunch has entirely different expectations from a young couple celebrating an anniversary. A first-time visitor needs more guidance. A returning regular appreciates being remembered.\n\nUnderstanding your guest before they tell you what they need is one of the highest expressions of service excellence. It requires observation, empathy, and experience." },
      { title: "Common Guest Types", type: "list", intro: "Learn to recognise and adapt to different guest profiles:", items: ["The Decisive Guest: knows exactly what they want, moves quickly. Match their pace. Do not over-explain.", "The Uncertain Guest: needs guidance and reassurance. Offer options with confidence. Be patient and warm.", "The Detail-Oriented Guest: asks many questions. Provide thorough, accurate answers. Do not rush them.", "The VIP or Regular: expects to be remembered and treated with extra care. Use their name, recall their preferences.", "The Impatient Guest: frustrated by delays. Acknowledge the wait, communicate clearly, and prioritise their resolution.", "The Difficult Guest: emotional or demanding. Remain calm, empathetic, and professional. Never mirror their frustration."] },
      { title: "Reading the Room", type: "highlight", points: [{ text: "Observe before you approach. Is the guest relaxed or tense? Rushed or leisurely? In conversation or waiting for attention?" }, { text: "Body language tells you a great deal. A guest looking around is looking for help. A guest checking their watch is feeling the pressure of time." }, { text: "Listen to the environment. A quiet, intimate setting calls for a softer, more personal approach. A busy event calls for efficiency and energy." }, { text: "Adapt your pace to the guest, not the other way around. Service at your speed is service for you. Service at the guest's speed is service for them." }] },
      { title: "Anticipating Needs", type: "list", intro: "The best service is given before it is asked for:", items: ["If a guest has an empty glass, refill it before they notice it is empty.", "If a guest is waiting alone, acknowledge them and give them a timeframe.", "If a guest is carrying heavy items, offer to assist without being asked.", "If a guest looks confused or lost, approach them proactively.", "If a guest has a dietary restriction on record, ensure it is accommodated without them having to remind you.", "Anticipating needs communicates that you are present, attentive, and invested in their experience."] },
      { title: "Personalisation", type: "body", body: "Guests remember how you made them feel. The most powerful service moments are personal ones.\n\nUsing a guest's name. Remembering their preference from a previous visit. Noticing that they celebrate a milestone and acknowledging it.\n\nPersonalisation does not require expensive systems. It requires attention, memory, and the genuine desire to make every guest feel individually valued rather than just another transaction." },
    ],
    questions: [
      { q: "How should you serve a decisive guest who knows exactly what they want?", opts: ["Over-explain to show your knowledge", "Take your time to ensure they consider all options", "Match their pace and be efficient", "Ask multiple clarifying questions before proceeding"], a: 2 },
      { q: "What does a guest looking around the room typically signal?", opts: ["They are enjoying the ambience", "They are looking for someone specific", "They are looking for help or attention", "They are dissatisfied with their experience"], a: 2 },
      { q: "What is the highest expression of service excellence in terms of guest needs?", opts: ["Responding quickly when asked", "Anticipating needs before the guest has to ask", "Providing detailed explanations of all services", "Greeting every guest with the same script"], a: 1 },
      { q: "When a guest is impatient or frustrated, you should:", opts: ["Mirror their urgency and rush the service", "Ignore the frustration and continue as normal", "Acknowledge the wait, communicate clearly, and prioritise resolution", "Ask them to be patient and wait their turn"], a: 2 },
    ],
  },
  {
    id: 5,
    title: "Handling Difficult Guests",
    subtitle: "Staying calm, empathy, de-escalation techniques, setting boundaries professionally",
    duration: "25 min",
    slides: [
      { title: "Difficult Guests Are Part of the Role", type: "body", body: "In any service environment, you will encounter guests who are frustrated, demanding, unreasonable, or emotional. This is not a failure of your service. It is an inevitable part of working with people.\n\nHow you handle these moments defines your professional character. The ability to remain calm, empathetic, and solution-focused under pressure is one of the most valuable skills in service.\n\nA difficult guest who is handled well often becomes a loyal one." },
      { title: "Common Causes of Difficult Behaviour", type: "list", intro: "Understanding why guests become difficult helps you respond with empathy:", items: ["Unmet expectations: they expected something that was not delivered.", "Communication failure: something was misunderstood or not communicated clearly.", "Previous negative experience: they arrived already frustrated from elsewhere.", "Personal stress: the guest is dealing with pressures unrelated to you.", "Genuine service failure: something actually went wrong and they have a legitimate complaint.", "In most cases, the guest is not attacking you personally. They are expressing frustration about a situation."] },
      { title: "De-escalation Techniques", type: "steps", intro: "Follow these steps when a guest becomes difficult:", steps: [{ number: "1", label: "Stay calm, lower your voice", detail: "Your calm energy is contagious. Lower your voice slightly. Speak slowly and steadily. Do not match the guest's emotional pitch." }, { number: "2", label: "Listen fully without interrupting", detail: "Let the guest say everything they need to say. Do not defend, explain, or justify while they are still expressing frustration." }, { number: "3", label: "Acknowledge and empathise", detail: "'I completely understand why that is frustrating, and I sincerely apologise.' Validation before solution." }] },
      { title: "Empathy vs Sympathy", type: "two-col", left: { heading: "Empathy (What to Do)", items: ["Acknowledge the guest's feelings without judgement", "Say: 'I understand how frustrating this must be.'", "Focus on what you can do to help", "Stay present and engaged throughout", "Make the guest feel heard before offering a solution"] }, right: { heading: "Sympathy (What to Avoid)", items: ["Over-identifying emotionally with the guest's frustration", "Agreeing that colleagues or the venue were wrong without knowing the facts", "Making promises you cannot keep out of sympathy", "Becoming emotional yourself", "Losing professional composure"] } },
      { title: "Setting Boundaries Professionally", type: "highlight", points: [{ text: "You have a right and a responsibility to maintain a professional boundary. No guest has the right to verbally abuse, demean, or threaten a staff member." }, { text: "If a guest becomes abusive, you may calmly say: 'I am here to help you and I want to resolve this. I do need us to communicate respectfully in order to do so.'" }, { text: "If the situation escalates beyond your ability to manage it, involve a supervisor immediately. Never try to manage an abusive situation alone." }, { text: "Documenting incidents protects you, your colleagues, and the establishment. Always report serious incidents to management." }] },
    ],
    questions: [
      { q: "When a guest becomes difficult, what is the most effective first response?", opts: ["Match their energy to show you take it seriously", "Defend yourself and explain why they are wrong", "Stay calm, lower your voice, and listen without interrupting", "Ask them to come back when they have calmed down"], a: 2 },
      { q: "What does empathy in a service context mean?", opts: ["Agreeing with everything the guest says", "Acknowledging the guest's feelings and focusing on what you can do to help", "Feeling sorry for the guest and making promises to fix everything", "Avoiding the emotional topic and focusing only on the solution"], a: 1 },
      { q: "In most cases, when a guest is difficult, they are:", opts: ["Trying to get something for free", "Attacking you personally", "Expressing frustration about a situation, not about you as a person", "Deliberately trying to cause problems"], a: 2 },
      { q: "What should you do if a guest becomes verbally abusive?", opts: ["Raise your voice to assert authority", "Walk away immediately without saying anything", "Calmly set a boundary and involve a supervisor if it escalates", "Apologise repeatedly until they stop"], a: 2 },
      { q: "What should you do before offering a solution to a difficult guest?", opts: ["Explain the venue's policy", "Validate their feelings and ensure they feel heard", "Offer compensation immediately", "Ask them to put their complaint in writing"], a: 1 },
    ],
  },
  {
    id: 6,
    title: "Complaint Resolution",
    subtitle: "Acknowledging, apologising, acting, following through, recording incidents",
    duration: "25 min",
    slides: [
      { title: "A Complaint is an Opportunity", type: "body", body: "Most dissatisfied guests do not complain. They simply leave and do not return. A guest who complains is giving you the opportunity to fix something, retain their loyalty, and improve your service.\n\nHandling complaints well is one of the most powerful trust-building tools in service. A guest whose complaint was resolved excellently often has more loyalty to a venue than a guest who never had a problem at all.\n\nThe way you handle a complaint matters as much as the complaint itself." },
      { title: "The AAAF Framework", type: "steps", intro: "Use this four-step framework for every complaint:", steps: [{ number: "A", label: "Acknowledge", detail: "Acknowledge the complaint immediately and sincerely. 'Thank you for bringing this to my attention. I completely understand your concern.'" }, { number: "A", label: "Apologise", detail: "Offer a genuine, unconditional apology. Do not qualify it with 'but' or 'however'. 'I sincerely apologise for the experience you had.'" }, { number: "A", label: "Act", detail: "Take ownership and act. Tell the guest exactly what you will do and when. If it requires a colleague or supervisor, involve them immediately." }] },
      { title: "Following Through", type: "list", intro: "Acting on a complaint is only half the resolution. Following through completes it:", items: ["Return to the guest after the action has been taken to confirm the issue is resolved.", "Ask: 'Has that addressed your concern? Is there anything else I can do for you?'", "If the resolution requires time (e.g. a replacement, a refund), communicate a clear timeframe.", "Never leave a guest wondering whether their complaint was taken seriously.", "Following through communicates respect. It tells the guest their experience matters beyond just the moment of complaint."] },
      { title: "What Not to Do", type: "warning", items: ["Argue with the guest about whether their complaint is valid", "Blame a colleague, the kitchen, or another department in front of the guest", "Offer solutions you do not have authority to fulfil", "Dismiss the complaint as unimportant or overreacting", "Forget to follow through after promising action", "Leave the guest without a clear next step or timeframe"] },
      { title: "Recording and Reporting", type: "highlight", points: [{ text: "Every complaint should be reported to a supervisor, even if you resolved it successfully. This enables patterns to be identified and systemic issues to be fixed." }, { text: "Document the key details: what the complaint was, what was done, and the outcome. This protects the guest, the staff member, and the establishment." }, { text: "Repeated complaints about the same issue are a signal that something needs to change. A culture of recording is a culture of improvement." }, { text: "Never feel that reporting a resolved complaint is unnecessary. Information is the foundation of continuous service improvement." }] },
    ],
    questions: [
      { q: "Why is a complaint considered an opportunity?", opts: ["It gives you a chance to argue your case", "It allows you to identify and fix issues and potentially retain a loyal guest", "It gives management something to discuss", "It rarely happens so it should be treated as special"], a: 1 },
      { q: "What does the first 'A' in the AAAF framework stand for?", opts: ["Avoid", "Acknowledge", "Apologise", "Act"], a: 1 },
      { q: "What should you avoid when apologising to a guest?", opts: ["Using the guest's name", "Qualifying the apology with 'but' or 'however'", "Making eye contact", "Speaking calmly"], a: 1 },
      { q: "What should you do after taking action on a complaint?", opts: ["Wait for the guest to let you know if the issue is resolved", "Return to the guest to confirm the issue has been resolved", "Assume it is resolved and move on", "Ask a colleague to follow up on your behalf"], a: 1 },
      { q: "Why should resolved complaints still be reported to a supervisor?", opts: ["It is a legal requirement", "So the guest can be charged less", "To identify patterns and enable systemic improvements", "To prove that you handled it correctly"], a: 2 },
    ],
  },
  {
    id: 7,
    title: "Creating Memorable Experiences",
    subtitle: "Going above expectations, personalisation, service recovery",
    duration: "20 min",
    slides: [
      { title: "Good Service is Expected. Memorable Service is Rare.", type: "body", body: "Guests do not talk about service that was adequate. They do not recommend a venue because it was fine. They share and return to experiences that surprised them, moved them, or made them feel genuinely special.\n\nCreating memorable experiences is not about grand gestures. It is about small, intentional moments of genuine care that communicate to the guest that they are more than a transaction.\n\nThese moments are available to every service professional in every interaction, regardless of budget or environment." },
      { title: "Going Above Expectations", type: "highlight", points: [{ text: "Remembering a returning guest's name and preference without being reminded." }, { text: "Noticing that a guest is celebrating something and acknowledging it warmly." }, { text: "Offering an umbrella at the door when it starts to rain before the guest asks." }, { text: "Ensuring a guest with a dietary requirement has every course catered for without them having to ask each time." }, { text: "Following up with a guest after a complaint to ensure they are satisfied, even a day later." }] },
      { title: "Personalisation in Practice", type: "list", intro: "Personalisation makes every guest feel individually valued:", items: ["Use the guest's name in conversation where appropriate and natural.", "Reference previous interactions: 'Welcome back. Would you like the same table as last time?'", "Notice and respond to individual preferences without being prompted.", "Tailor your communication style to the guest: more formal with corporate clients, warmer with families.", "Small personal touches leave lasting impressions: a handwritten note, a complimentary item, an unexpected gesture."] },
      { title: "Service Recovery", type: "body", body: "Service recovery is the process of turning a negative experience into a positive one.\n\nWhen something goes wrong, the guest's loyalty is not necessarily lost. It depends entirely on how quickly, sincerely, and effectively the problem is addressed.\n\nStudies show that a guest whose problem was resolved excellently can have a higher satisfaction score than a guest who had no problem at all. This is known as the service recovery paradox. It is one of the most powerful arguments for investing in excellent complaint resolution." },
      { title: "The Lasting Impact of Excellence", type: "highlight", points: [{ text: "Guests who feel genuinely valued become advocates. They recommend you without being asked." }, { text: "Memorable service creates emotional connection to a brand. Emotional connection drives loyalty more than any loyalty programme." }, { text: "Every service professional has the power to create a memorable moment in every interaction. It costs nothing but intention and attention." }, { text: "The guest leaves the venue. But the feeling of being valued stays with them. That feeling is what brings them back." }] },
    ],
    questions: [
      { q: "What do guests typically share and return for?", opts: ["Adequate, satisfactory service", "The cheapest prices", "Experiences that surprised them or made them feel genuinely special", "Venues that are closest to their home"], a: 2 },
      { q: "What is the service recovery paradox?", opts: ["Guests always leave after a problem regardless of resolution", "A guest whose problem was resolved excellently can have higher satisfaction than one who had no problem", "Service recovery always costs the business money", "Guests rarely complain even when dissatisfied"], a: 1 },
      { q: "Which of the following is an example of personalisation in service?", opts: ["Greeting every guest with the exact same scripted welcome", "Remembering a returning guest's preference without being reminded", "Offering the same menu to all guests regardless of dietary needs", "Using formal language with all guests regardless of the occasion"], a: 1 },
      { q: "What drives guest loyalty more than any loyalty programme?", opts: ["The lowest prices in the market", "The largest portion sizes", "Emotional connection created through memorable service experiences", "The most convenient location"], a: 2 },
    ],
  },
  {
    id: 8,
    title: "Representing a Brand",
    subtitle: "Brand values, consistency, confidentiality, professional image",
    duration: "20 min",
    slides: [
      { title: "You Are the Brand", type: "body", body: "Every staff member is a brand ambassador. Not just the marketing team. Not just senior management. Every person who interacts with a guest or client represents the values, standards, and identity of the organisation.\n\nWhen a guest has a great experience, they associate it with the brand. When they have a poor one, they associate that with the brand too. The individual who served them, positively or negatively, IS the brand in that moment." },
      { title: "Understanding Brand Values", type: "list", intro: "To represent a brand authentically, you must understand its values:", items: ["Know the organisation's vision and what it stands for.", "Understand the standard of service the brand has promised its clients.", "Know what makes this brand different from its competitors.", "Align your behaviour and communication style with the brand's character.", "Ask: 'Does what I am about to do or say reflect the standard this brand is known for?'"] },
      { title: "Consistency is the Brand", type: "highlight", points: [{ text: "A brand is not what you say about yourself. It is what guests consistently experience when they interact with you." }, { text: "Consistency means the same high standard whether the venue is quiet or at full capacity." }, { text: "Consistency means the same professional image whether the client is a first-time visitor or a regular." }, { text: "Inconsistency destroys trust. A guest who received excellent service once and poor service the next visit does not know what to expect, and uncertainty leads to seeking alternatives." }] },
      { title: "Confidentiality and Professionalism", type: "two-col", left: { heading: "What to Keep Confidential", items: ["Guest personal information and preferences", "Client financial or contractual details", "Internal staff conflicts or management issues", "Other guests' behaviour or complaints", "Business operations, pricing, or supplier information"] }, right: { heading: "What Professionalism Looks Like", items: ["Discretion in all guest-facing conversations", "Never discussing internal issues in front of guests", "Not sharing client information with unauthorised parties", "Maintaining professional composure at all times", "Representing the brand with the same care in and outside of work"] } },
      { title: "Professional Image Beyond the Uniform", type: "body", body: "Your professional image extends beyond what you wear at work. In the age of social media, what you post, how you speak about your employer publicly, and how you conduct yourself outside of work can all impact the brand you represent.\n\nThis does not mean you have no private life. It means that the values of professionalism, integrity, and respect that define excellent service do not switch off when your shift ends.\n\nRepresent your brand as if someone is always watching, because increasingly, they are." },
    ],
    questions: [
      { q: "Who is considered a brand ambassador in an organisation?", opts: ["Only the marketing and communications team", "Only senior management", "Every staff member who interacts with guests or clients", "Only those who have been formally trained in brand standards"], a: 2 },
      { q: "What is the most accurate definition of a brand?", opts: ["The logo and visual identity of a company", "What you say about yourself in your marketing materials", "What guests consistently experience when they interact with you", "The company's mission statement on its website"], a: 2 },
      { q: "What does consistency in service mean?", opts: ["Serving regular guests better than new guests", "Maintaining the same high standard regardless of how busy or quiet the venue is", "Using the same greeting script with every guest", "Only performing at your best when management is present"], a: 1 },
      { q: "Which of the following should always be kept confidential?", opts: ["The venue's opening hours", "Other guests' behaviour or complaints", "The menu and pricing structure", "The names of team members on shift"], a: 1 },
    ],
  },
  {
    id: 9,
    title: "Teamwork and Internal Service",
    subtitle: "Serving colleagues well, communication between staff, supporting each other",
    duration: "20 min",
    slides: [
      { title: "The Guest Experience Starts Internally", type: "body", body: "The service a guest receives is a direct reflection of how well a team functions internally. A team that communicates poorly, supports each other reluctantly, and operates in silos cannot deliver seamless, excellent service externally.\n\nInternal service is the way team members treat each other. It is the quality of communication between departments. It is the willingness to help a colleague who is struggling, even when it is not technically your responsibility.\n\nYou cannot give what you do not have. A team that serves each other well, serves guests well." },
      { title: "Internal Service Standards", type: "list", intro: "Apply the same standards to colleagues that you apply to guests:", items: ["Respond to colleague requests promptly and professionally.", "Communicate changes, delays, or issues proactively, do not wait until someone asks.", "Complete handovers thoroughly so the next team member has everything they need.", "If a colleague is overwhelmed, offer help without waiting to be asked.", "Give feedback to colleagues constructively and respectfully.", "Acknowledge and appreciate colleagues who support you. Recognition builds team culture."] },
      { title: "Communication Between Departments", type: "highlight", points: [{ text: "Most service failures that reach the guest started as a communication breakdown between departments." }, { text: "A guest's dietary requirement communicated to the front of house but not to the kitchen results in a service failure that is entirely preventable." }, { text: "Proactive communication: share information that a colleague or another department needs before they have to ask for it." }, { text: "Written communication in handovers ensures nothing is lost between shifts or teams." }] },
      { title: "Conflict in the Workplace", type: "two-col", left: { heading: "Professional Approach to Conflict", items: ["Address issues directly and privately with the relevant colleague", "Focus on the behaviour or situation, not the person", "Listen to understand, not to respond", "Involve a supervisor if direct resolution is not possible", "Never let internal conflict become visible to guests"] }, right: { heading: "Behaviours That Damage Teams", items: ["Gossip and speaking negatively about colleagues", "Publicly disagreeing with or undermining colleagues in front of guests", "Withholding information that a colleague needs", "Taking credit for team achievements individually", "Refusing to help when asked because it is 'not your job'"] } },
      { title: "A Culture of Excellence Starts with the Team", type: "body", body: "The most successful hospitality environments are those where every team member feels responsible for the overall guest experience, not just their specific role.\n\nWhen the kitchen runs behind, the front of house team manages the guest with grace. When a waiter is overwhelmed, the bar team supports. When something goes wrong, the team fixes it together rather than pointing fingers.\n\nBuilding this culture is not management's job alone. It is built, one interaction at a time, by individuals who choose to show up for their team." },
    ],
    questions: [
      { q: "What is internal service?", opts: ["The service provided in the kitchen area", "The way team members treat and support each other within the organisation", "The back-of-house operations that guests never see", "The IT and administrative support functions"], a: 1 },
      { q: "Where do most service failures that reach the guest originate?", opts: ["In the kitchen", "In a communication breakdown between departments or team members", "From insufficient staffing levels", "From guests with unreasonable expectations"], a: 1 },
      { q: "What is the professional approach when you disagree with a colleague?", opts: ["Address it publicly so everyone is aware", "Express disagreement in front of guests to show transparency", "Address it directly and privately with the relevant colleague", "Ignore it and hope it resolves itself"], a: 2 },
      { q: "What does a strong team culture look like in a hospitality environment?", opts: ["Each person focuses only on their specific assigned role", "Team members choose to show up for each other and share responsibility for the overall guest experience", "Management dictates all decisions and team members follow instructions only", "Only senior staff are responsible for the guest experience"], a: 1 },
    ],
  },
  {
    id: 10,
    title: "The Service Mindset",
    subtitle: "Pride in service, ownership, continuous improvement, the hospitality spirit",
    duration: "20 min",
    slides: [
      { title: "Service is a Profession, Not a Stepping Stone", type: "body", body: "Hospitality and service are among the most human professions that exist. At their core, they are about making people feel welcome, valued, and cared for.\n\nSome people treat service roles as temporary, something to do while waiting for something else. But the professionals who build remarkable careers in hospitality understand something different. They understand that service, done excellently, is one of the most skilled, demanding, and rewarding professions available.\n\nThe service mindset begins with taking genuine pride in what you do." },
      { title: "Taking Ownership", type: "highlight", points: [{ text: "Ownership means not waiting to be told. It means seeing something that needs to be done and doing it." }, { text: "Ownership means when something goes wrong, asking 'What can I do to fix this?' rather than 'Whose fault is this?'" }, { text: "Ownership means taking responsibility for the guest experience as if the venue were your own." }, { text: "Ownership means following through. If you said you would do something, you do it. If circumstances change, you communicate immediately." }] },
      { title: "Continuous Improvement", type: "list", intro: "A service mindset is never finished learning:", items: ["After every shift, ask: what went well and what could have been better?", "Seek feedback actively. Ask supervisors and trusted colleagues for honest input.", "Observe exceptional colleagues and identify what they do differently.", "Invest in your own learning. Read, take courses, and stay current in your field.", "Treat every mistake as information, not failure. Extract the lesson and apply it.", "Small improvements made consistently over time create exceptional professionals."] },
      { title: "The Hospitality Spirit", type: "body", body: "The hospitality spirit is difficult to teach and impossible to fake. It is a genuine desire to make people feel welcome. It is warmth that comes from within rather than a script. It is the pleasure of seeing a guest's face light up because of something you did.\n\nNot everyone feels it naturally. But it can be cultivated. It grows when you connect your work to its deeper purpose: you are not just serving food or managing an event. You are creating the memories people will tell their families about for years.\n\nThat is not a small thing. That is a significant and honourable purpose." },
      { title: "You Are Ready", type: "intro", body: "You have completed all ten modules of Customer Service Excellence.\n\nYou now have the mindset, skills, and standards to deliver exceptional service in any professional environment.\n\nComplete the final assessment to earn your official Certificate of Completion. You need 60% or more to pass.\n\nGo forward and serve with excellence." },
    ],
    questions: [
      { q: "What does taking ownership in service mean?", opts: ["Waiting to be told what to do before acting", "Taking responsibility for the guest experience and acting without being prompted", "Owning up to mistakes only when caught", "Managing only your specific assigned responsibilities"], a: 1 },
      { q: "What is the recommended approach to mistakes in a service mindset?", opts: ["Hide them to avoid negative consequences", "Blame circumstances or colleagues", "Treat every mistake as information, extract the lesson, and apply it", "Only report major mistakes to management"], a: 2 },
      { q: "What is the hospitality spirit?", opts: ["A set of scripted responses for guest interactions", "A genuine desire to make people feel welcome that comes from within", "The formal training programme for hospitality staff", "The rules and policies of a hospitality establishment"], a: 1 },
      { q: "A service mindset professional, after every shift, should ask:", opts: ["How much did I earn and was it worth it?", "How quickly did I complete my tasks?", "What went well and what could have been better?", "Did I do the minimum required to keep my job?"], a: 2 },
    ],
  },
];

const FINAL_EXAM = [
  { q: "What is customer service excellence?", opts: ["Being polite occasionally", "The consistent delivery of an experience that meets and exceeds guest expectations", "Following the minimum job requirements", "Being friendly only with regular guests"], a: 1 },
  { q: "How quickly do people form a first impression?", opts: ["Within 1 minute", "After a full conversation", "Within 7 seconds", "Within 30 seconds"], a: 2 },
  { q: "What is the most powerful tool in customer service?", opts: ["A formal greeting script", "An expensive uniform", "A genuine smile", "A loud, confident voice"], a: 2 },
  { q: "What does active listening require?", opts: ["Formulating your response while the guest speaks", "Giving full attention, not interrupting, and confirming understanding", "Agreeing with everything the guest says", "Nodding repeatedly without processing information"], a: 1 },
  { q: "What percentage of communication is non-verbal?", opts: ["About 20%", "Over 80%", "About 35%", "Over 55%"], a: 3 },
  { q: "What is the best response when a guest becomes difficult?", opts: ["Match their energy", "Defend yourself and explain why they are wrong", "Stay calm, lower your voice, and listen without interrupting", "Ask them to come back when they have calmed down"], a: 2 },
  { q: "What does empathy in service mean?", opts: ["Agreeing with everything the guest says", "Feeling sorry for the guest and making promises", "Acknowledging feelings and focusing on what you can do to help", "Avoiding emotional topics and focusing only on solutions"], a: 2 },
  { q: "What is the first step of the AAAF complaint resolution framework?", opts: ["Act", "Apologise", "Avoid", "Acknowledge"], a: 3 },
  { q: "Why should resolved complaints still be reported to a supervisor?", opts: ["It is a legal requirement", "To identify patterns and enable systemic improvements", "So the guest can receive compensation", "To prove you handled it correctly"], a: 1 },
  { q: "What is the service recovery paradox?", opts: ["Guests always leave after a problem", "Service recovery always costs money", "A guest whose problem was resolved excellently can have higher satisfaction than one with no problem", "Guests rarely complain even when dissatisfied"], a: 2 },
  { q: "Who is considered a brand ambassador?", opts: ["Only the marketing team", "Only senior management", "Only formally trained staff", "Every staff member who interacts with guests or clients"], a: 3 },
  { q: "What is the most accurate definition of a brand?", opts: ["The company logo and visual identity", "What you say in your marketing materials", "The mission statement on the website", "What guests consistently experience when they interact with you"], a: 3 },
  { q: "What does consistency in service mean?", opts: ["Serving regular guests better than new guests", "Using the same script with every guest", "Maintaining the same high standard regardless of how busy the venue is", "Only performing at your best when management is present"], a: 2 },
  { q: "What is internal service?", opts: ["Back-of-house kitchen operations", "IT and administrative support", "The way team members treat and support each other", "Services that guests cannot see"], a: 2 },
  { q: "Where do most service failures that reach the guest originate?", opts: ["In the kitchen", "From unreasonable guests", "From insufficient staffing", "In a communication breakdown between departments or team members"], a: 3 },
  { q: "What is the highest expression of service excellence regarding guest needs?", opts: ["Responding quickly when asked", "Providing detailed explanations of all services", "Anticipating needs before the guest has to ask", "Greeting every guest with the same script"], a: 2 },
  { q: "What should you do before offering a solution to a difficult guest?", opts: ["Explain the venue's policy", "Offer compensation immediately", "Ask them to put their complaint in writing", "Validate their feelings and ensure they feel heard"], a: 3 },
  { q: "What drives guest loyalty more than any loyalty programme?", opts: ["The lowest prices", "The most convenient location", "The largest portion sizes", "Emotional connection created through memorable service experiences"], a: 3 },
  { q: "What does taking ownership in service mean?", opts: ["Waiting to be told what to do", "Managing only your assigned responsibilities", "Taking responsibility for the guest experience and acting without being prompted", "Owning up to mistakes only when caught"], a: 2 },
  { q: "What is the hospitality spirit?", opts: ["A set of scripted responses", "The formal training programme for hospitality staff", "The rules and policies of an establishment", "A genuine desire to make people feel welcome that comes from within"], a: 3 },
];

function genDocs(firstName, lastName, score, total, date) {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 90 ? "outstanding" : pct >= 75 ? "excellent" : "solid";
  const remarks = `${firstName} ${lastName} has successfully completed the Customer Service Excellence course, achieving a ${grade} score of ${pct}% in the final assessment. This result demonstrates a thorough understanding of professional service standards, guest interaction, complaint resolution, and the service mindset required to deliver exceptional experiences in any hospitality or guest-facing environment.`;
  const achievement = `In completing this programme, they have shown a clear understanding of customer service excellence, professional communication skills and complaint resolution, brand representation, teamwork, and the service mindset, as assessed by the Sinotheni Events Training Academy.`;
  return { transcript: { remarks }, certificate: { achievement }, date };
}

function printDoc(html, name) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow popups to download your documents."); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>${name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap');body{margin:0;padding:0;}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 1000);
}

function certHTML(name, date, achievement, moduleList) {
  const month = new Date(date).toLocaleDateString("en-ZA", {month:"long", year:"numeric"});
  const courseTitle = COURSE_TITLE;
  const courseType = COURSE_TYPE;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:297mm;height:210mm;overflow:hidden;background:#FAF7F2;}
body{display:flex;align-items:center;justify-content:center;position:relative;}
.outer{position:absolute;inset:7mm;border:2px solid #C9A84C;}
.inner{position:absolute;inset:10.5mm;border:0.5px solid rgba(201,168,76,0.35);}
.c{position:absolute;width:14mm;height:14mm;border-color:#C9A84C;border-style:solid;}
.tl{top:5mm;left:5mm;border-width:2.5px 0 0 2.5px;}
.tr{top:5mm;right:5mm;border-width:2.5px 2.5px 0 0;}
.bl{bottom:5mm;left:5mm;border-width:0 0 2.5px 2.5px;}
.br{bottom:5mm;right:5mm;border-width:0 2.5px 2.5px 0;}
.body{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;height:100%;padding:18mm 28mm;}
.logo{width:62px;margin-bottom:5mm;}
.acad{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:5px;color:#C9A84C;margin-bottom:4mm;}
.line{width:70mm;height:0.5px;background:rgba(201,168,76,0.5);margin:0 auto 4mm;}
.heading{font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:400;letter-spacing:6px;color:#555;text-transform:uppercase;margin-bottom:5mm;}
.certifies{font-family:'Cormorant Garamond',serif;font-size:11pt;font-style:italic;color:#888;margin-bottom:3.5mm;}
.name{font-family:'Cormorant Garamond',serif;font-size:38pt;font-weight:600;color:#0D0D0D;line-height:1;margin-bottom:4mm;}
.completed{font-family:'Cormorant Garamond',serif;font-size:11pt;font-style:italic;color:#888;margin-bottom:3mm;}
.course{font-family:'Cormorant Garamond',serif;font-size:20pt;font-weight:700;color:#C9A84C;margin-bottom:3.5mm;}
.stmt{font-family:'Montserrat',sans-serif;font-size:7pt;color:#aaa;max-width:145mm;line-height:1.9;margin-bottom:7mm;}
.footer{display:flex;justify-content:space-between;align-items:flex-end;width:100%;}
.sigline{width:52mm;height:0.5px;background:#C9A84C;margin:0 auto 2.5mm;}
.signame{font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:600;color:#0D0D0D;}
.sigtitle{font-family:'Montserrat',sans-serif;font-size:6.5pt;color:#aaa;letter-spacing:1px;margin-top:1mm;}
.dateval{font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:600;color:#0D0D0D;text-align:right;}
.datelbl{font-family:'Montserrat',sans-serif;font-size:6.5pt;color:#aaa;letter-spacing:1.5px;margin-top:1.5mm;text-align:right;}
.reg{position:absolute;bottom:14mm;left:50%;transform:translateX(-50%);font-family:'Montserrat',sans-serif;font-size:6pt;color:#ccc;white-space:nowrap;}
</style></head><body>
<div class="outer"></div><div class="inner"></div>
<div class="c tl"></div><div class="c tr"></div><div class="c bl"></div><div class="c br"></div>
<div class="body">
<img class="logo" src="${window.location.origin}/logo.png"/>
<div class="acad">SINOTHENI EVENTS TRAINING ACADEMY</div>
<div class="line"></div>
<div class="heading">Certificate of Completion</div>
<div class="certifies">This is to certify that</div>
<div class="name">${name}</div>
<div class="completed">has successfully completed</div>
<div class="course">${courseTitle}</div>
<div class="stmt">and has demonstrated the required standard of knowledge and professional competency as assessed by Sinotheni Events Training Academy</div>
<div class="footer">
<div style="text-align:center"><div class="sigline"></div><div class="signame">Luyanda Khumalo</div><div class="sigtitle">FOUNDER AND DIRECTOR</div></div>
<div style="flex:0.4"></div>
<div><div class="dateval">${month}</div><div class="datelbl">DATE OF COMPLETION</div></div>
</div>
</div>
<div class="reg">Reg No: K2021422957 &nbsp;&middot;&nbsp; sinothenievents.co.za &nbsp;&middot;&nbsp; academy@sinothenievents.co.za</div>
</body></html>`;
}

function transcriptHTML(name, score, total, date, remarks, moduleList) {
  const pct = Math.round((score/total)*100);
  const completionDate = new Date(date).toLocaleDateString("en-ZA", {day:"numeric",month:"long",year:"numeric"});
  const modRows = moduleList.map((m,i) => `<tr><td>${String(i+1).padStart(2,"0")}</td><td>${m}</td><td style="color:#C9A84C;font-weight:600;text-align:right;">PASS</td></tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=Montserrat:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#FAF7F2;padding:14mm 16mm;font-family:'Montserrat',sans-serif;}
.hdr{display:flex;align-items:center;gap:5mm;padding-bottom:4mm;border-bottom:2px solid #C9A84C;margin-bottom:5mm;}
.logo{width:44px;}
.hdr-text{flex:1;}
.acad-name{font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:700;color:#0D0D0D;}
.acad-sub{font-family:'Montserrat',sans-serif;font-size:6.5pt;color:#C9A84C;letter-spacing:3px;margin-top:1mm;}
.doc-type{font-family:'Montserrat',sans-serif;font-size:8pt;letter-spacing:3px;color:#888;}
.stu-box{background:#0D0D0D;color:#fff;padding:4.5mm 6mm;margin-bottom:5mm;border-radius:2px;}
.stu-lbl{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:3px;color:#C9A84C;margin-bottom:1.5mm;}
.stu-name{font-family:'Cormorant Garamond',serif;font-size:18pt;font-weight:600;}
.stu-course{font-family:'Montserrat',sans-serif;font-size:8pt;color:#aaa;margin-top:1mm;}
.section{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:3px;color:#C9A84C;margin-bottom:3mm;margin-top:5mm;}
table{width:100%;border-collapse:collapse;}
th{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:1px;color:#888;padding:2mm 3mm;border-bottom:1px solid #e8e0d0;text-align:left;font-weight:500;}
th:last-child{text-align:right;}
td{font-family:'Montserrat',sans-serif;font-size:8pt;color:#333;padding:2.5mm 3mm;border-bottom:0.5px solid #f0ebe3;}
.final td{font-weight:700;color:#0D0D0D;border-top:1px solid #C9A84C;}
.footer{margin-top:7mm;padding-top:4mm;border-top:1px solid #e8e0d0;display:flex;justify-content:space-between;align-items:flex-end;}
.sigline{width:45mm;height:0.5px;background:#C9A84C;margin-bottom:2mm;}
.signame{font-family:'Cormorant Garamond',serif;font-size:11pt;font-weight:600;}
.sigtitle{font-family:'Montserrat',sans-serif;font-size:6pt;color:#888;letter-spacing:1px;margin-top:0.5mm;}
.verify{font-family:'Montserrat',sans-serif;font-size:6pt;color:#bbb;text-align:right;line-height:1.8;}
</style></head><body>
<div class="hdr">
<img class="logo" src="${window.location.origin}/logo.png"/>
<div class="hdr-text"><div class="acad-name">Sinotheni Events Training Academy</div><div class="acad-sub">EVENTS &middot; STAFFING &middot; TRAINING</div></div>
<div class="doc-type">OFFICIAL TRANSCRIPT</div>
</div>
<div class="stu-box"><div class="stu-lbl">STUDENT</div><div class="stu-name">${name}</div><div class="stu-course">${COURSE_TITLE} &middot; ${COURSE_TYPE}</div></div>
<div class="section">MODULE RESULTS</div>
<table><thead><tr><th>No</th><th>Module</th><th style="text-align:right;">Result</th></tr></thead><tbody>${modRows}</tbody></table>
<div class="section">FINAL ASSESSMENT</div>
<table><thead><tr><th>Assessment</th><th>Score</th><th style="text-align:right;">Result</th></tr></thead>
<tbody>
<tr><td colspan="2">Final Examination (${total} questions)</td><td style="color:#C9A84C;font-weight:600;text-align:right;">${pct}%</td></tr>
<tr class="final"><td colspan="2">OVERALL RESULT</td><td style="text-align:right;">PASS</td></tr>
</tbody></table>
<div class="footer">
<div><div class="sigline"></div><div class="signame">Luyanda Khumalo</div><div class="sigtitle">FOUNDER AND DIRECTOR &middot; SINOTHENI EVENTS TRAINING ACADEMY</div></div>
<div class="verify">sinothenievents.co.za<br/>academy@sinothenievents.co.za<br/>Reg No: K2021422957<br/>${completionDate}</div>
</div>
</body></html>`;
}

function downloadChapterPDF(chapter) {
  const lines = [`SINOTHENI EVENTS TRAINING ACADEMY`, `Customer Service Excellence`, `Module ${chapter.id}: ${chapter.title}`, `${chapter.subtitle}`, ``, `─────────────────────────────────────────────`, ``];
  chapter.slides.forEach((slide, i) => {
    lines.push(`SLIDE ${i + 1}: ${slide.title.toUpperCase()}`, ``);
    if (slide.body) slide.body.split("\n").forEach(l => lines.push(l));
    if (slide.intro) lines.push(slide.intro);
    if (slide.items) slide.items.forEach(item => lines.push(`  - ${item}`));
    if (slide.points) slide.points.forEach(p => lines.push(`  - ${p.text}`));
    if (slide.steps) slide.steps.forEach(s => lines.push(`  ${s.number}. ${s.label}: ${s.detail}`));
    if (slide.left) { lines.push(slide.left.heading); slide.left.items.forEach(item => lines.push(`  - ${item}`)); lines.push(``); lines.push(slide.right.heading); slide.right.items.forEach(item => lines.push(`  - ${item}`)); }
    if (slide.warning) slide.warning.forEach(item => lines.push(`  x ${item}`));
    lines.push(``, `─────────────────────────────────────────────`, ``);
  });
  lines.push(`sinothenievents.co.za`);
  const text = lines.join("\n");
  try {
    const a = document.createElement("a");
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
  a.download = `CSE101_Module${chapter.id}.txt`;
  a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  } catch(e) {
    const w = window.open("", "_blank");
    if (w) { w.document.write("<pre>" + text + "</pre>"); w.document.close(); }
  }
}

function Slide({ slide }) {
  const h = { fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: BK, marginBottom: 20, borderLeft: `4px solid ${OR}`, paddingLeft: 14 };
  const item = (txt, i, good = true) => (
    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
      <span style={{ color: good ? "#2d7a45" : "#c0392b", flexShrink: 0, marginTop: 2 }}>{good ? "+" : "x"}</span>
      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "#444", lineHeight: 1.7 }}>{txt}</span>
    </div>
  );
  return (
    <div>
      {slide.type !== "cover" && slide.type !== "intro" && <div style={h}>{slide.title}</div>}
      {(slide.type === "body" || slide.type === "intro") && (<div>{slide.type === "intro" && <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 700, color: BK, marginBottom: 20 }}>{slide.title}</div>}<div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "#444", lineHeight: 1.9, whiteSpace: "pre-line" }}>{slide.body}</div></div>)}
      {slide.type === "list" && (<div>{slide.intro && <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#888", marginBottom: 16 }}>{slide.intro}</div>}{slide.items.map((t, i) => item(t, i))}</div>)}
      {slide.type === "warning" && (<div><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#c0392b", marginBottom: 16 }}>Never do the following:</div>{slide.items.map((t, i) => item(t, i, false))}</div>)}
      {slide.type === "highlight" && (<div>{slide.intro && <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#888", marginBottom: 16 }}>{slide.intro}</div>}<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{slide.points.map((p, i) => (<div key={i} style={{ background: CR, border: "1px solid #e8e0d0", borderRadius: 8, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: G, flexShrink: 0, display: "inline-block" }}></span><span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: "#333", lineHeight: 1.6 }}>{p.text}</span></div>))}</div></div>)}
      {slide.type === "two-col" && (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>{[slide.left, slide.right].map((col, ci) => (<div key={ci} style={{ background: ci === 0 ? "#f0faf5" : "#fff5f5", border: `1px solid ${ci === 0 ? "#c3e8d1" : "#f5c6c6"}`, borderRadius: 8, padding: "18px" }}><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 600, color: ci === 0 ? "#2d7a45" : "#c0392b", marginBottom: 14, letterSpacing: 1 }}>{col.heading}</div>{col.items.map((t, i) => item(t, i, ci === 0))}</div>))}</div>)}
      {slide.type === "steps" && (<div>{slide.intro && <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#888", marginBottom: 20 }}>{slide.intro}</div>}<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{slide.steps.map((s, i) => (<div key={i} style={{ display: "flex", gap: 18, background: CR, borderRadius: 10, padding: "16px 18px", border: "1px solid #e8e0d0", alignItems: "center" }}><div style={{ width: 42, height: 42, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: BK, flexShrink: 0 }}>{s.number}</div><div><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, fontWeight: 600, color: BK, marginBottom: 3 }}>{s.label}</div><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#888" }}>{s.detail}</div></div></div>))}</div></div>)}
    </div>
  );
}


export default function App() {
  // ACCESS CONTROL: Check session first
  const [_unlocked, _setUnlocked] = useState(() => {
    try {
      const s = sessionStorage.getItem(sessionKey(COURSE_ID));
      if (s) {
        const data = JSON.parse(s);
        return data;
      }
    } catch {}
    return null;
  });



  const [screen, setScreen] = useState("welcome");
  const [profile, setProfile] = useState({firstName:"",lastName:"",email:"",qualification:"",wantsDB:undefined,phone:"",province:"",city:"",age:"",dob:"",availability:""});
  const [chapterProgress, setChapterProgress] = useState({});
  const [chapterTestProgress, setChapterTestProgress] = useState({});
  const [finalPassed, setFinalPassed] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [docs, setDocs] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [quizMode, setQuizMode] = useState(null);
  const [quizChapter, setQuizChapter] = useState(null);
  const [quizQs, setQuizQs] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [qAnswers, setQAnswers] = useState([]);
  const [qSelected, setQSelected] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(()=>{
    const saved=loadState();
    if(saved){
      if(saved.profile) setProfile(saved.profile);
      if(saved.chapterProgress) setChapterProgress(saved.chapterProgress);
      if(saved.chapterTestProgress) setChapterTestProgress(saved.chapterTestProgress);
      if(saved.finalPassed) setFinalPassed(saved.finalPassed);
      if(saved.finalScore!==undefined) setFinalScore(saved.finalScore);
      if(saved.profile?.firstName) setScreen("dashboard");
    }
  },[]);

  if (!_unlocked) {
    return <LockScreen courseId={COURSE_ID} courseTitle={COURSE_TITLE} courseType={COURSE_TYPE} coursePrice={COURSE_PRICE} onUnlock={async data => {
      _setUnlocked(data);
      const saved = await loadProgress(data.code, COURSE_ID);
      if (saved) {
        if (saved.completedChapters) setCompletedChapters(new Set(saved.completedChapters));
        if (saved.currentChapter !== undefined) setCurrentChapter(saved.currentChapter);
        if (saved.screen) setScreen(saved.screen === 'exam' ? 'dashboard' : saved.screen);
      }
    }} />;
  }

  function persist(u){saveState({profile,chapterProgress,chapterTestProgress,finalPassed,finalScore,...u});}
  function isUnlocked(ci){return ci===0||chapterTestProgress[CHAPTERS[ci-1].id]?.passed===true;}
  function allDone(){return CHAPTERS.every(ch=>chapterTestProgress[ch.id]?.passed);}
  function toggleAudio(text){if(speaking){window.speechSynthesis.cancel();setSpeaking(false);}else{speak(text,()=>setSpeaking(false));setSpeaking(true);}}
  useEffect(()=>{window.speechSynthesis.cancel();setSpeaking(false);},[slideIdx,screen]);

  function slideText(slide){
    if(slide.body) return slide.body;
    if(slide.items) return (slide.intro||"")+" "+slide.items.join(". ");
    if(slide.points) return slide.points.map(p=>p.text).join(". ");
    if(slide.steps) return (slide.intro||"")+" "+slide.steps.map(s=>s.label+": "+s.detail).join(". ");
    if(slide.left) return slide.left.items.join(". ")+". "+slide.right.items.join(". ");
    return slide.title;
  }

  function openChapter(ch){setActiveChapter(ch);setSlideIdx(0);setScreen("chapter");}
  function nextSlide(){
    if(slideIdx<activeChapter.slides.length-1){setSlideIdx(slideIdx+1);}
    else{const cp={...chapterProgress,[activeChapter.id]:{completed:true}};setChapterProgress(cp);persist({chapterProgress:cp});startQuiz("chapter",activeChapter);}
  }
  function startQuiz(mode,chapter=null){
    setQuizMode(mode);setQuizChapter(chapter);
    setQuizQs(mode==="chapter"?chapter.questions:FINAL_EXAM);
    setQIdx(0);setQAnswers([]);setQSelected(null);
    setScreen(mode==="chapter"?"chapterTest":"finalExam");
  }
  function submitAnswer(){
    if(qSelected===null) return;
    const ans=[...qAnswers,qSelected];
    if(qIdx+1<quizQs.length){setQAnswers(ans);setQIdx(qIdx+1);setQSelected(null);}
    else{
      const score=ans.filter((a,i)=>a===quizQs[i].a).length;
      const pct=Math.round((score/quizQs.length)*100);
      const passed=pct>=60;
      if(quizMode==="chapter"){
        const ctp={...chapterTestProgress,[quizChapter.id]:{passed,score,total:quizQs.length,pct}};
        setChapterTestProgress(ctp);persist({chapterTestProgress:ctp});setScreen("chapterTestResult");
        if(_unlocked?.userId&&passed)saveCourseProgress(_unlocked.userId,COURSE_ID,quizChapter.id,passed,score,quizQs.length);
      } else {
        const fs={score,total:quizQs.length,pct,passed};
        setFinalScore(fs);setFinalPassed(passed);
        if(passed) updateAcademyStatus({completed:true,completedAt:new Date().toISOString(),score:pct});
        persist({finalPassed:passed,finalScore:fs});setScreen("examResult");
      }
    }
  }
  function generateDocs(){
    const date=new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"});
    const pct=finalScore.pct;
    const grade=pct>=90?"outstanding":pct>=80?"excellent":pct>=70?"very good":"solid";
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed Customer Service Excellence with a score of ${pct}% in the final assessment. Throughout the programme, ${profile.firstName} completed the programme with a genuine understanding of professional guest service, the mindset, the communication skills and the practical frameworks that elevate service delivery in any South African hospitality environment.`;
    const achievement=`In completing this programme, they have shown a clear understanding of the professional service mindset, guest expectation management, active listening, complaint resolution and brand representation.`;
    setDocs({remarks,achievement,date});setScreen("docs");
    if(_unlocked?.userId)saveCourseCompletion(_unlocked.userId,COURSE_ID,COURSE_TITLE,`${profile.firstName} ${profile.lastName}`,profile.email||_unlocked.email||'',finalScore.score,finalScore.total,certHTML(`${profile.firstName} ${profile.lastName}`,date,achievement,MODULE_NAMES),transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,date,remarks,MODULE_NAMES));
  }

  const S={
    wrap:{minHeight:"100vh",background:CR,fontFamily:"'Montserrat',sans-serif"},
    hdr:{background:BK,padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100},
    card:{background:"#fff",borderRadius:8,padding:"28px",maxWidth:720,margin:"0 auto",border:"1px solid #e8e0d0",boxShadow:"0 2px 20px rgba(0,0,0,0.06)"},
    inp:{width:"100%",padding:"10px 13px",border:"1px solid #ddd",borderRadius:5,fontFamily:"'Montserrat',sans-serif",fontSize:12,outline:"none",boxSizing:"border-box",background:"#fafafa",color:BK},
    lbl:{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",marginBottom:5,display:"block"},
    btn:(p,full)=>({background:p!==false?G:"transparent",color:p!==false?BK:G,border:`2px solid ${G}`,borderRadius:4,padding:"10px 22px",fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,cursor:"pointer",width:full?"100%":"auto",textAlign:"center",display:"inline-block"}),
    title:{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:BK,marginBottom:5},
    sub:{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#888",marginBottom:24},
    tag:{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:6,display:"block"},
  };

  const Slide=({slide})=>{
    const h={fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:BK,marginBottom:16,borderLeft:`4px solid ${G}`,paddingLeft:14};
    const item=(txt,i,good=true)=>(<div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}><span style={{color:good?"#2d7a45":"#c0392b",flexShrink:0,marginTop:2,fontWeight:700}}>{good?"+":"✗"}</span><span style={{fontFamily:"'Montserrat',sans-serif",fontSize:12.5,color:"#444",lineHeight:1.75}}>{txt}</span></div>);
    return(<div>
      {slide.type!=="intro"&&<div style={h}>{slide.title}</div>}
      {(slide.type==="body"||slide.type==="intro")&&<div>{slide.type==="intro"&&<div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:BK,marginBottom:16}}>{slide.title}</div>}<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,color:"#444",lineHeight:1.95,whiteSpace:"pre-line"}}>{slide.body}</div></div>}
      {slide.type==="list"&&<div>{slide.intro&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#666",marginBottom:14,lineHeight:1.7}}>{slide.intro}</div>}{slide.items.map((t,i)=>item(t,i))}</div>}
      {slide.type==="highlight"&&<div>{slide.points.map((p,i)=>(<div key={i} style={{background:CR,border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:6,padding:"12px 16px",marginBottom:10,display:"flex",gap:12,alignItems:"flex-start"}}><span style={{width:7,height:7,borderRadius:"50%",background:G,flexShrink:0,marginTop:6,display:"inline-block"}}></span><span style={{fontFamily:"'Montserrat',sans-serif",fontSize:12.5,color:"#333",lineHeight:1.7}}>{p.text}</span></div>))}</div>}
      {slide.type==="two-col"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{[slide.left,slide.right].map((col,ci)=>(<div key={ci} style={{background:ci===0?"#f0faf5":"#fff5f5",border:`1px solid ${ci===0?"#c3e8d1":"#f5c6c6"}`,borderRadius:7,padding:"16px"}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:700,color:ci===0?"#2d7a45":"#c0392b",marginBottom:12,letterSpacing:0.5}}>{col.heading}</div>{col.items.map((t,i)=>item(t,i,ci===0))}</div>))}</div>}
      {slide.type==="steps"&&<div>{slide.intro&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#666",marginBottom:18,lineHeight:1.7}}>{slide.intro}</div>}<div style={{display:"flex",flexDirection:"column",gap:12}}>{slide.steps.map((s,i)=>(<div key={i} style={{display:"flex",gap:16,background:CR,borderRadius:8,padding:"14px 16px",border:"1px solid #e8e0d0",alignItems:"flex-start"}}><div style={{width:42,height:42,borderRadius:"50%",background:G,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:BK,flexShrink:0}}>{s.number}</div><div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:600,color:BK,marginBottom:4}}>{s.label}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#666",lineHeight:1.7}}>{s.detail}</div></div></div>))}</div></div>}
    </div>);
  };

  const Header=()=>(<div style={S.hdr}><div style={{display:"flex",alignItems:"center",gap:14}}><div onClick={()=>screen!=="welcome"&&screen!=="profile"&&setScreen("dashboard")} style={{cursor:"pointer"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:"#fff",letterSpacing:3}}>SINOTHENI EVENTS</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3,marginTop:1}}>TRAINING ACADEMY · SHORT COURSE</div></div><button onClick={()=>{try{window.parent.postMessage("goToAcademy","*")}catch(e){}window.history.back()}} style={{background:"transparent",border:"1px solid #333",color:"#888",padding:"5px 11px",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,cursor:"pointer",borderRadius:2}}>ALL COURSES</button></div>{profile.firstName&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#aaa"}}>Welcome, {profile.firstName}</div>}</div>);

  if(screen==="welcome") return(
    <div style={S.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <Header/>
      <div style={{background:BK,padding:"52px 22px 0"}}>
        <div style={{maxWidth:840,margin:"0 auto"}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{background:G,color:BK,fontFamily:"'Montserrat',sans-serif",fontSize:8,fontWeight:800,letterSpacing:2,padding:"3px 10px"}}>SHORT COURSE</span>
            <span style={{background:"#1a1a1a",color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,padding:"3px 10px",border:"1px solid #333"}}>10 MODULES</span>
            <span style={{background:"#1a1a1a",color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,padding:"3px 10px",border:"1px solid #333"}}>FULLY ONLINE</span>
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.0,marginBottom:4}}>Customer Service Excellence</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Professional Housekeeping Standards and Procedures</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>Everything you need to work as a professional housekeeper, cleaning procedures, linen standards, guest privacy, bathroom hygiene, and workplace safety.</div>
          <div style={{display:"flex",gap:14,marginBottom:40,flexWrap:"wrap",alignItems:"flex-start"}}>
            <div style={{background:"#111",border:`2px solid ${G}`,padding:"18px 22px",minWidth:170}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:G,letterSpacing:3,marginBottom:5}}>COURSE FEE</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,color:"#fff",lineHeight:1}}>R350</div>
              <div style={{borderTop:"1px solid #222",marginTop:12,paddingTop:12}}>{["Once-off payment","Certificate included","Lifetime access","Fully online"].map((f,i)=>(<div key={i} style={{display:"flex",gap:7,marginBottom:5,alignItems:"center"}}><div style={{width:4,height:4,borderRadius:"50%",background:G}}/><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa"}}>{f}</div></div>))}</div>
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginBottom:12}}>{[["10","Modules"],["20Q","Final Exam"],["60%","Pass Mark"],["3-4hr","Study Time"]].map(([val,label])=>(<div key={label} style={{background:"#111",padding:"12px 16px"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:G}}>{val}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"#777",letterSpacing:2,marginTop:2}}>{label.toUpperCase()}</div></div>))}</div>
              <button onClick={()=>setScreen("profile")} style={{...S.btn(true),padding:"12px 26px",fontSize:11}}>ENROL NOW</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{maxWidth:840,margin:"0 auto",padding:"36px 22px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:36}}>
          <div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:9}}>WHAT YOU WILL LEARN</div><div style={{width:32,height:2,background:G,marginBottom:16}}/>{["Introduction to professional housekeeping","Grooming, uniform, and conduct standards","Cleaning equipment, products, and chemical safety","Room cleaning procedures and correct sequence","Bed making and linen standards","Bathroom cleaning and presentation standards","Guest privacy, security, and confidentiality","Laundry and linen management","Handling guest requests and complaints","Health, safety, and career development"].map((item,i)=>(<div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:8}}><div style={{width:4,height:4,borderRadius:"50%",background:G,flexShrink:0,marginTop:7}}/><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#555",lineHeight:1.7}}>{item}</div></div>))}</div>
          <div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:9}}>RESOURCES INCLUDED</div><div style={{width:32,height:2,background:G,marginBottom:16}}/>{RESOURCES.map((r,i)=>(<div key={i} style={{borderTop:"1px solid #e8e0d0",padding:"10px 0"}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:600,color:BK,marginBottom:2}}>{r.title}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888"}}>{r.desc}</div><button onClick={()=>downloadResource(r)} style={{...S.btn(false),fontSize:8,padding:"4px 8px",marginLeft:8,flexShrink:0}}>↓</button></div></div>))}</div>
        </div>
      </div>
    </div>
  );

  if(screen==="profile"){
    const provinces=["Mpumalanga","Gauteng","KwaZulu-Natal","Western Cape","Eastern Cape","Limpopo","North West","Free State","Northern Cape"];
    const qualifications=["Grade 10","Grade 11","Grade 12 / Matric","Higher Education"];
    const wantsDB=profile.wantsDB;
    const basicReady=profile.firstName&&profile.lastName&&profile.email&&profile.qualification;
    const dbReady=basicReady&&profile.phone&&profile.province&&profile.city&&profile.age&&profile.availability;
    const canSubmit=wantsDB===false?basicReady:wantsDB===true?dbReady:false;
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"32px 20px"}}><div style={S.card}><span style={S.tag}>ENROLMENT, CUSTOMER SERVICE EXCELLENCE</span><div style={S.title}>Your Details</div><div style={S.sub}>Your name will appear on your certificate exactly as entered here.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>FIRST NAME *</label><input style={S.inp} value={profile.firstName||""} onChange={e=>setProfile({...profile,firstName:e.target.value})} placeholder="e.g. Thandi"/></div><div><label style={S.lbl}>LAST NAME *</label><input style={S.inp} value={profile.lastName||""} onChange={e=>setProfile({...profile,lastName:e.target.value})} placeholder="e.g. Dlamini"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>EMAIL ADDRESS *</label><input style={S.inp} type="email" value={profile.email||""} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="your@email.com"/></div><div style={{marginBottom:20}}><label style={S.lbl}>HIGHEST QUALIFICATION *</label><select style={{...S.inp,appearance:"none"}} value={profile.qualification||""} onChange={e=>setProfile({...profile,qualification:e.target.value})}><option value="">Select qualification</option>{qualifications.map(q=><option key={q} value={q}>{q}</option>)}</select></div>
    {basicReady&&wantsDB===undefined&&(<div style={{background:CR,border:`1px solid ${G}`,borderRadius:7,padding:"17px 19px",marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:5}}>JOB OPPORTUNITIES</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:BK,marginBottom:7}}>Would you like to join our staffing database?</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#666",lineHeight:1.7,marginBottom:15}}>Sinotheni Events contacts qualified professionals for hospitality staffing opportunities.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setProfile({...profile,wantsDB:true})} style={{...S.btn(true),flex:1,fontSize:11}}>YES, ADD ME</button><button onClick={()=>setProfile({...profile,wantsDB:false})} style={{...S.btn(false),flex:1,fontSize:11}}>NO THANKS</button></div></div>)}
    {wantsDB===true&&(<div style={{borderTop:"1px solid #e8e0d0",paddingTop:18,marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:12}}>STAFFING DATABASE DETAILS</div><div style={{marginBottom:13}}><label style={S.lbl}>PHONE NUMBER *</label><input style={S.inp} value={profile.phone||""} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="e.g. 0821234567"/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>PROVINCE *</label><select style={{...S.inp,appearance:"none"}} value={profile.province||""} onChange={e=>setProfile({...profile,province:e.target.value})}><option value="">Select province</option>{provinces.map(p=><option key={p} value={p}>{p}</option>)}</select></div><div><label style={S.lbl}>CITY / TOWN *</label><input style={S.inp} value={profile.city||""} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="e.g. Secunda"/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>DATE OF BIRTH *</label><input style={S.inp} type="date" value={profile.dob||""} onChange={e=>setProfile({...profile,dob:e.target.value})}/></div><div><label style={S.lbl}>AGE *</label><input style={S.inp} type="number" min="16" max="70" value={profile.age||""} onChange={e=>setProfile({...profile,age:e.target.value})} placeholder="e.g. 24"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>AVAILABILITY *</label><select style={{...S.inp,appearance:"none"}} value={profile.availability||""} onChange={e=>setProfile({...profile,availability:e.target.value})}><option value="">Select availability</option><option value="Weekends only">Weekends only</option><option value="Weekdays only">Weekdays only</option><option value="Weekdays and weekends">Weekdays and weekends</option><option value="Flexible">Flexible, any day</option></select></div></div>)}
    {wantsDB===false&&(<div style={{background:"#f5f5f5",borderRadius:5,padding:"9px 13px",marginBottom:15,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888"}}>Not joining the job database</div><button onClick={()=>setProfile({...profile,wantsDB:undefined})} style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:G,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button></div>)}
    {wantsDB!==undefined&&(<div><div style={{background:CR,border:"1px solid #e8e0d0",borderRadius:5,padding:"13px 16px",marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:G,marginBottom:4}}>COURSE FEE</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,color:BK}}>R 350</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888"}}>Once-off · Lifetime access · Certificate included</div></div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa",textAlign:"right"}}>PayFast integration<br/>coming soon</div></div></div><button onClick={()=>{if(canSubmit){persist({profile});updateAcademyStatus({enrolled:true,name:profile.firstName+" "+profile.lastName,startedAt:new Date().toISOString()});if(profile.wantsDB)saveStaffingApplication(profile,COURSE_ID,COURSE_TITLE);setScreen("dashboard")}}} disabled={!canSubmit} style={{...S.btn(true,true),opacity:canSubmit?1:0.4}}>BEGIN MY COURSE</button></div>)}
    </div></div></div>);
  }

  if(screen==="dashboard"){
    const total=Object.values(chapterTestProgress).filter(c=>c.passed).length;
    const pct=Math.round((total/CHAPTERS.length)*100);
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/>
    <div style={{padding:"24px 20px",maxWidth:760,margin:"0 auto"}}>
      <div style={{background:BK,padding:"20px 24px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><span style={S.tag}>CUSTOMER SERVICE EXCELLENCE</span><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:2}}>Welcome back, {profile.firstName}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666"}}>{total} of {CHAPTERS.length} modules complete · {pct}% progress</div></div>
        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:38,fontWeight:700,color:G,lineHeight:1}}>{pct}%</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"#555",letterSpacing:2}}>COMPLETE</div></div>
      </div>
      <div style={{height:4,background:"#e0d8cc",borderRadius:2,marginBottom:20}}><div style={{height:"100%",width:`${pct}%`,background:G,borderRadius:2,transition:"width 0.5s"}}/></div>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:14}}>
        {CHAPTERS.map((ch,ci)=>{
          const unlocked=isUnlocked(ci);const cpDone=chapterProgress[ch.id]?.completed;const ctDone=chapterTestProgress[ch.id]?.passed;const ctp=chapterTestProgress[ch.id];
          return(<div key={ch.id} style={{background:"#fff",border:`1px solid ${ctDone?G:unlocked?"#e0d8cc":"#eee"}`,padding:"12px 15px",opacity:unlocked?1:0.5,position:"relative",overflow:"hidden"}}>
            {ctDone&&<div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:G}}/>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:9}}>
              <div style={{paddingLeft:ctDone?8:0,flex:1}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:G,marginBottom:1}}>MODULE {String(ch.id).padStart(2,"0")} · {ch.duration}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontWeight:700,color:BK,marginBottom:1}}>{ch.title}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#888"}}>{ch.subtitle}</div>
                {ctp&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#2d7a45",marginTop:2}}>Passed · {ctp.pct}% ({ctp.score}/{ctp.total})</div>}
                {!unlocked&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#c0392b",marginTop:2}}>Complete previous module to unlock</div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end",flexShrink:0}}>
                {unlocked&&(<><button onClick={()=>openChapter(ch)} style={{...S.btn(!ctDone),fontSize:9,padding:"5px 11px"}}>{ctDone?"REVIEW":cpDone?"TAKE TEST":"START"}</button>{cpDone&&!ctDone&&<button onClick={()=>startQuiz("chapter",ch)} style={{...S.btn(true),fontSize:9,padding:"5px 11px"}}>TAKE TEST</button>}{cpDone&&<button onClick={()=>downloadNotes(ch)} style={{...S.btn(false),fontSize:8,padding:"4px 10px",borderColor:"#ccc",color:"#888"}}>DOWNLOAD NOTES</button>}</>)}
              </div>
            </div>
          </div>);
        })}
      </div>
      <div style={{background:"#fff",border:"1px solid #e0d8cc",borderTop:`3px solid ${G}`,padding:"16px 18px",marginBottom:11}}>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:4}}>COURSE RESOURCES</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:12}}>Downloadable professional resources, yours to keep.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>{RESOURCES.map((res,i)=>(<button key={i} onClick={()=>downloadResource(res)} style={{...S.btn(false),fontSize:9,padding:"6px 10px",textAlign:"left",display:"block",width:"100%",borderColor:"#e0d8cc",color:"#555"}}>↓ {res.title}</button>))}</div>
      </div>
      <div style={{background:allDone()?BK:"#f5f5f5",border:`2px solid ${allDone()?G:"#ddd"}`,padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:allDone()?G:"#bbb",marginBottom:3}}>FINAL ASSESSMENT · 30 QUESTIONS</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:allDone()?"#fff":"#bbb"}}>Final Assessment</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:allDone()?"#aaa":"#ccc",marginTop:2}}>20 questions across all 10 modules · 60% to pass</div>{finalPassed&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#2d7a45",marginTop:3}}>Passed · {finalScore?.pct}%</div>}</div>
          {allDone()&&(<button onClick={()=>finalPassed?setScreen("docs"):startQuiz("final")} style={{...S.btn(true),fontSize:10,padding:"9px 16px"}}>{finalPassed?"GET CERTIFICATE":"START FINAL EXAM"}</button>)}
        </div>
      </div>
    </div></div>);
  }

  if(screen==="chapter"&&activeChapter){
    const slide=activeChapter.slides[slideIdx];const prog=((slideIdx+1)/activeChapter.slides.length)*100;
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/>
    <div style={{padding:"22px 20px",maxWidth:720,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:G}}>MODULE {String(activeChapter.id).padStart(2,"0")}: {activeChapter.title.toUpperCase()}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#888"}}>{slideIdx+1} / {activeChapter.slides.length}</div></div>
      <div style={{height:4,background:"#e0d8cc",borderRadius:2,marginBottom:18}}><div style={{height:"100%",width:`${prog}%`,background:G,borderRadius:2,transition:"width 0.4s"}}/></div>
      <div style={{background:CR,borderTop:`4px solid ${G}`,border:"1px solid #e8e0d0",borderRadius:6,padding:"26px 24px",marginBottom:13,minHeight:360,boxShadow:"0 2px 18px rgba(0,0,0,0.05)"}}><Slide slide={slide}/></div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <button onClick={()=>{if(slideIdx>0)setSlideIdx(slideIdx-1);else setScreen("dashboard")}} style={{...S.btn(false),fontSize:10,padding:"7px 13px"}}>Previous</button>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={()=>toggleAudio(slideText(slide))} style={{...S.btn(false),fontSize:9,padding:"7px 11px",borderColor:speaking?"#E8632A":G,color:speaking?"#E8632A":G}}>{speaking?"Stop":"Listen"}</button>
          <button onClick={()=>downloadNotes(activeChapter)} style={{...S.btn(false),fontSize:9,padding:"7px 11px",borderColor:"#ccc",color:"#888"}}>Download Notes</button>
          <div style={{display:"flex",gap:3}}>{activeChapter.slides.map((_,i)=>(<div key={i} onClick={()=>setSlideIdx(i)} style={{width:i===slideIdx?18:4,height:4,borderRadius:2,background:i===slideIdx?G:"#ddd",cursor:"pointer",transition:"all 0.3s"}}/>))}</div>
        </div>
        <button onClick={nextSlide} style={{...S.btn(true),fontSize:10,padding:"7px 13px"}}>{slideIdx===activeChapter.slides.length-1?"TAKE MODULE TEST":"NEXT"}</button>
      </div>
    </div></div>);
  }

  if(screen==="chapterTest"||screen==="finalExam"){
    const q=quizQs[qIdx];
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={S.tag}>{screen==="finalExam"?`FINAL ASSESSMENT · ${quizQs.length} QUESTIONS`:`MODULE ${String(quizChapter?.id).padStart(2,"0")} TEST`}</span><span style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888"}}>{qIdx+1} / {quizQs.length}</span></div>
      <div style={{height:4,background:"#e0d8cc",borderRadius:2,marginBottom:20}}><div style={{height:"100%",width:`${(qIdx/quizQs.length)*100}%`,background:G,borderRadius:2,transition:"width 0.3s"}}/></div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,color:BK,marginBottom:18,lineHeight:1.5}}>{q.q}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>{q.opts.map((opt,i)=>(<div key={i} onClick={()=>setQSelected(i)} style={{padding:"11px 14px",border:`2px solid ${qSelected===i?G:"#e0d8cc"}`,borderRadius:7,cursor:"pointer",background:qSelected===i?CR:"#fff",fontFamily:"'Montserrat',sans-serif",fontSize:12,color:qSelected===i?BK:"#555",transition:"all 0.15s",display:"flex",gap:11,alignItems:"center"}}><span style={{width:23,height:23,borderRadius:"50%",border:`2px solid ${qSelected===i?G:"#ccc"}`,background:qSelected===i?G:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:qSelected===i?BK:"#ccc",flexShrink:0,fontWeight:700}}>{String.fromCharCode(65+i)}</span>{opt}</div>))}</div>
      <button onClick={submitAnswer} disabled={qSelected===null} style={{...S.btn(true,true),opacity:qSelected===null?0.4:1}}>{qIdx+1===quizQs.length?"SUBMIT":"NEXT"}</button>
    </div></div></div>);
  }

  if(screen==="chapterTestResult"&&quizChapter){
    const ctp=chapterTestProgress[quizChapter.id];
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:22}}><div style={S.title}>{ctp?.passed?"Module Passed!":"Not Yet"}</div><div style={S.sub}>Module {String(quizChapter.id).padStart(2,"0")}: {quizChapter.title}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>{[["SCORE",`${ctp?.score}/${ctp?.total}`],["PERCENTAGE",`${ctp?.pct}%`],["RESULT",ctp?.passed?"PASS":"FAIL"]].map(([k,v],i)=>(<div key={i} style={{background:CR,padding:"13px",borderRadius:7,textAlign:"center",borderTop:`3px solid ${i===2?(ctp?.passed?"#2d7a45":"#c0392b"):G}`}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:4}}>{k}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:25,fontWeight:700,color:i===2?(ctp?.passed?"#2d7a45":"#c0392b"):BK}}>{v}</div></div>))}</div>
      {ctp?.passed?(<button onClick={()=>setScreen("dashboard")} style={S.btn(true,true)}>{quizChapter.id<CHAPTERS.length?`CONTINUE TO MODULE ${String(quizChapter.id+1).padStart(2,"0")}`:"GO TO FINAL EXAM"}</button>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:11,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.7}}>You scored {ctp?.pct}%. You need 60% to unlock the next module.</div><div style={{display:"flex",gap:11}}><button onClick={()=>openChapter(quizChapter)} style={{...S.btn(false),flex:1}}>REVIEW MODULE</button><button onClick={()=>startQuiz("chapter",quizChapter)} style={{...S.btn(true),flex:1}}>RETRY TEST</button></div></div>)}
    </div></div></div>);
  }

  if(screen==="examResult"&&finalScore){
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:22}}><div style={S.title}>{finalScore.passed?"Congratulations!":"Not Quite Yet"}</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Customer Service Excellence</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>{[["SCORE",`${finalScore.score}/${finalScore.total}`],["PERCENTAGE",`${finalScore.pct}%`],["RESULT",finalScore.passed?"PASS":"FAIL"]].map(([k,v],i)=>(<div key={i} style={{background:CR,padding:"14px",borderRadius:7,textAlign:"center",borderTop:`3px solid ${i===2?(finalScore.passed?"#2d7a45":"#c0392b"):G}`}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:4}}>{k}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:27,fontWeight:700,color:i===2?(finalScore.passed?"#2d7a45":"#c0392b"):BK}}>{v}</div></div>))}</div>
      {finalScore.passed?(<div><div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#2d7a45",lineHeight:1.8}}>Congratulations, {profile.firstName}! Your certificate will be issued to <strong>{profile.firstName} {profile.lastName}</strong>.</div><button onClick={generateDocs} style={S.btn(true,true)}>GET MY CERTIFICATE AND TRANSCRIPT</button></div>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.8}}>You scored {finalScore.pct}%. You need 60% to pass.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setScreen("dashboard")} style={{...S.btn(false),flex:1}}>REVIEW MODULES</button><button onClick={()=>startQuiz("final")} style={{...S.btn(true),flex:1}}>RETRY EXAM</button></div></div>)}
    </div></div></div>);
  }

  if(screen==="docs"){
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Customer Service Excellence</div></div>
      {docs&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,docs.date,docs.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(`${profile.firstName} ${profile.lastName}`,docs.date,docs.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>)}
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the print dialog opens, select <strong>Save as PDF</strong> as the destination.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
