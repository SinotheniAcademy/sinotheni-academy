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
const STORE_KEY = "se_erp101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "erp101";
const COURSE_TITLE = "Event Readiness Programme";
const COURSE_TYPE = "SKILLS PROGRAMME";
const COURSE_PRICE = 1250;

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


const MODULE_NAMES = ["Introduction to Professional Event Work", "Reading an Event Brief and Understanding the Client", "Venue Setup and Physical Preparation", "Event Logistics and Supplier Coordination", "Guest Registration and Arrival Management", "Crowd Flow and Access Control", "Working with AV, Staging and Technical Teams", "Food and Beverage at Events", "Emergency and Contingency Protocols", "Event Breakdown and Post-Event Administration", "Professionalism, Conduct and Career Development"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Professional Event Work", "subtitle": "Event types, structures, what makes a successful event and team roles", "duration": "30 min", "slides": [{"title": "Welcome to the Event Readiness Programme", "type": "intro", "body": "Professional event work is one of the most demanding and dynamic roles in the hospitality and events industry. Every event is different \u2014 the client, the venue, the scale, the format, the team. What remains constant is the standard: prepared, professional, punctual, attentive and guest-focused from arrival to breakdown.\n\nThe Event Readiness Programme prepares you for the full lifecycle of a live event \u2014 from pre-event briefing through setup, execution, emergency management and post-event administration. Eleven modules. The complete professional framework."}, {"title": "Types of Events and Their Requirements", "type": "list", "intro": "Event professionals work across a wide range of event formats, each with different demands:", "items": ["Corporate events: product launches, conferences, seminars, team functions \u2014 formal, brand-driven, precision is expected", "Government and official events: state functions, ministerial events, departmental conferences \u2014 high formality, protocol-driven", "Social events: weddings, milestone birthdays, family celebrations \u2014 emotional significance, client-centred", "Gala dinners and award ceremonies: formal seated dining, entertainment, presentations \u2014 high visibility, full service", "Exhibitions and expos: large footprint, long operating hours, high volume \u2014 logistics and stamina", "Sports hospitality and stadium events: large-scale, crowd management, safety emphasis"]}, {"title": "What Makes a Successful Event", "type": "highlight", "points": [{"text": "A successful event is one where every guest feels the experience was prepared with their comfort and enjoyment in mind \u2014 even when behind the scenes, the team was managing complexity."}, {"text": "Events succeed when the team is fully briefed, every role is clear, every supplier is confirmed and every contingency has been considered before the doors open."}, {"text": "The team's visible composure is the event's invisible backbone. Guests should not be able to tell whether the event is running perfectly or has three active problems being managed simultaneously."}, {"text": "After the event, the measure of success is not whether everything went perfectly \u2014 it is whether the guest left with a positive experience. The team's ability to manage imperfection professionally is the real skill."}]}, {"title": "Team Roles at a Professional Event", "type": "two-col", "left": {"heading": "EVENT OPERATIONS TEAM", "items": ["Event Manager: overall accountability", "FOH Coordinator: guest-facing operations", "Registration Staff: arrivals and badging", "Service Staff: food, beverage, table management", "Floor Manager: floor supervision and coordination", "Technical Support: AV, lighting, sound"]}, "right": {"heading": "SUPPORT AND LOGISTICS", "items": ["Setup Crew: physical preparation", "Catering Team: kitchen and service preparation", "Security: access control and safety", "Transport Coordinator: guest and VIP logistics", "Supplier Liaison: third-party management", "Post-Event Team: breakdown and administration"]}}], "questions": [{"q": "What remains constant across all event types regardless of the format or scale?", "opts": ["The number of staff required relative to guest count", "The standard: prepared, professional, punctual, attentive and guest-focused", "The formality level and protocol requirements of the event", "The client brief and the service sequence used throughout"], "a": 1}, {"q": "What distinguishes government events from corporate events in terms of operational requirements?", "opts": ["Government events have a higher guest count and require more staff", "Government events are protocol-driven with formal orders of precedence; corporate events are brand-driven", "Government events require higher security clearance from all staff", "Government events are conducted over multiple days; corporate events are single-day"], "a": 1}, {"q": "What is the measure of a successful event according to this module?", "opts": ["Everything went perfectly and no incidents were recorded", "Every guest left with a positive experience \u2014 including those occasions where problems were professionally managed", "The event ran exactly to the run sheet with no timing deviations", "The client confirmed satisfaction with all elements in the post-event debrief"], "a": 1}, {"q": "What is the Event Manager's primary role within the event operations team?", "opts": ["Managing guest-facing operations and FOH coordination", "Overall accountability for the event from pre-briefing to post-event administration", "Floor supervision and real-time coordination of the service team", "Managing third-party supplier relationships and logistics"], "a": 1}]}, {"id": 2, "title": "Reading an Event Brief and Understanding the Client", "subtitle": "Interpreting briefs, client expectations, brand alignment and confidentiality", "duration": "30 min", "slides": [{"title": "The Brief Is Your Operational Foundation", "type": "body", "body": "An event brief is the single document that translates the client's vision into operational instructions for every team member. It tells you what the event is, who it is for, what the client expects, what the programme looks like, what your specific role is and what the standards are.\n\nA team member who does not read and understand the brief is an operational risk. A team member who reads, understands and internalises the brief before arriving on site is a professional asset."}, {"title": "What a Professional Event Brief Contains", "type": "list", "intro": "A complete event brief covers:", "items": ["Event name, client name, date, venue, time from setup to close", "Guest profile: how many, who they are, demographics, expectations, VIPs", "Programme: full run of show with times, transitions and key moments", "Your specific role: what you are responsible for, your position and your supervisor", "Dress code and appearance requirements: exact uniform, grooming standard", "Client standards and preferences: what they care most about, what they expect to be different about this event", "Confidentiality requirements: what information about the event may not be shared publicly"]}, {"title": "Understanding the Client", "type": "highlight", "points": [{"text": "Every client has a specific purpose for their event. Understanding that purpose shapes how you perform. A product launch is about brand impression. A government conference is about dignity and protocol. A wedding is about a once-in-a-lifetime experience."}, {"text": "Read the brief for what the client values most. Is it punctuality? Discretion? A certain level of energy? These are not stated preferences \u2014 they are embedded in the event format and client profile."}, {"text": "Never assume the standards from one client apply to another. A client who valued informality last event may have a very different requirement this event. Read the brief fresh every time."}, {"text": "The client's name, their event's details and any information about their guests is confidential. It does not belong on social media or in personal conversations during or after the event."}]}, {"title": "Confidentiality in Professional Event Work", "type": "body", "body": "Many events at which Sinotheni Events deploys staff involve private, sensitive or commercially significant information. A corporate event may involve unannounced product launches. A government function may involve official business. A private celebration may involve public figures who have not publicised their attendance.\n\nEvery team member on a Sinotheni Events deployment is required to treat all event information as confidential. This includes the guest list, the venue, the programme and any conversations or incidents observed during the event. What happens at the event stays at the event."}], "questions": [{"q": "What is a team member who does not read and understand the event brief described as?", "opts": ["Inexperienced and in need of additional briefing", "An operational risk", "Unprofessional \u2014 grounds for removal from the placement", "Unfamiliar with Sinotheni Events' standard process"], "a": 1}, {"q": "Why should a team member read the brief fresh for each new event?", "opts": ["Each event has a different format requiring different technical skills", "Standards from one client do not automatically apply to another \u2014 each event has its own requirements", "Event briefs are legally required to be acknowledged before deployment", "Reading each brief fresh prevents recollection errors from previous events"], "a": 1}, {"q": "What information about an event is required to be treated as confidential?", "opts": ["Only guest names and VIP information", "Only information specifically marked confidential in the brief", "All event information: guest list, venue, programme and any observed incidents or conversations", "Financial information only \u2014 event format and programme details are generally public"], "a": 2}, {"q": "What does understanding the client's purpose for their event allow a team member to do?", "opts": ["Request assignment to events that align with their personal experience and expertise", "Adjust their performance to match what the specific client values most", "Advise the event manager on improvements to the event programme", "Identify the event type and apply the correct technical service sequence"], "a": 1}]}, {"id": 3, "title": "Venue Setup and Physical Preparation", "subtitle": "Setting up your station, layout adherence, signage and equipment checks", "duration": "30 min", "slides": [{"title": "Setup Is Where the Event Begins", "type": "body", "body": "The way a venue is set up communicates the quality of the event before the first guest arrives. A room set up precisely to the layout, with every table perfect, every station stocked, every sign correctly placed, and every equipment item tested and ready \u2014 this is a room that immediately communicates competence to whoever walks in.\n\nSetup is your first quality control point of the event. The standards applied here determine the baseline every guest experiences. Do not wait for the event manager to check your work. Check your own work against the brief, correct what is not right, and present your area as ready."}, {"title": "Your Setup Responsibilities", "type": "list", "intro": "Every team member has specific setup responsibilities. Complete these before the event opens:", "items": ["Read the floor plan and layout: understand exactly where everything goes before touching anything", "Set up your station according to the brief: position, stock levels, equipment placement", "Check signage: is it in the right position? Straight? Legible from the guest's approach angle?", "Equipment check: test every item in your station that requires testing \u2014 microphone, printer, scanner", "Confirm stock: count consumables against the brief \u2014 name badges, programmes, table allocations", "Conduct a final self-check from the guest's perspective: walk in as a guest would and observe your area", "Report any deficiency to the event manager before the event opens \u2014 not after guests have noticed"]}, {"title": "Layout Adherence", "type": "highlight", "points": [{"text": "The floor plan is not a suggestion \u2014 it is an instruction. Every table, sign, bar and station is positioned for a reason: flow, sight lines, capacity, safety or protocol. Move elements from the plan only with the event manager's explicit instruction."}, {"text": "If your brief calls for a 1.2-metre gap between tables and the setup crew has left a 0.6-metre gap, correct it. You are responsible for your area matching the plan."}, {"text": "AV and technical equipment positions are set by the technical team and the floor plan. Do not move speakers, screens or microphone stands \u2014 these positions affect sound quality and sight lines."}, {"text": "At the end of setup, walk the space from the entrance. If anything looks wrong from that angle, it will look wrong to every arriving guest. Fix it before they arrive."}]}, {"title": "Equipment and Technology Checks", "type": "steps", "intro": "Complete these checks before every event opens:", "steps": [{"number": "1", "label": "Test before guests arrive", "detail": "A registration scanner that fails at the first guest, a printer that jams during the arrival rush, a microphone with feedback \u2014 all are preventable with a pre-event test. Test everything."}, {"number": "2", "label": "Know the backup procedure", "detail": "Every piece of equipment has a failure mode. Know the manual alternative: if the scanner fails, you use the paper register; if the printer fails, you have pre-printed badges. Brief yourself on the fallback."}, {"number": "3", "label": "Report faults immediately", "detail": "If equipment fails or is missing, report to the event manager immediately \u2014 not two minutes before the event opens. Early reporting allows solutions. Late reporting creates crises."}]}], "questions": [{"q": "When should a deficiency in your setup area be reported?", "opts": ["When the event manager conducts their pre-event walkthrough", "Immediately upon discovering it \u2014 before the event opens, not after guests notice", "During the post-event debrief so it can be addressed for future events", "When it is confirmed that the deficiency cannot be resolved without additional resources"], "a": 1}, {"q": "What does layout adherence mean in event setup?", "opts": ["Following the floor plan exactly \u2014 positions are set for specific operational reasons", "Ensuring the setup is completed within the allocated time window", "Checking that all team members are in position according to the assignment", "Verifying that the layout matches the client's original concept brief"], "a": 0}, {"q": "When should equipment be tested?", "opts": ["When the event manager calls for a technical check 30 minutes before opening", "Before guests arrive \u2014 failures at the point of arrival are preventable with pre-event testing", "At the start of the setup period so issues can be addressed during the full setup window", "Equipment is tested by the technical team \u2014 FOH staff are not responsible for equipment checks"], "a": 1}, {"q": "What does 'walking the space from the entrance' achieve?", "opts": ["It confirms the setup was completed according to the run sheet", "It shows the space from the guest's perspective \u2014 if something looks wrong from there, it looks wrong to every arrival", "It allows the team member to check all stations sequentially for efficiency", "It confirms the flow route from entrance to seating is clear and accessible"], "a": 1}]}, {"id": 4, "title": "Event Logistics and Supplier Coordination", "subtitle": "Working with suppliers, logistics flow and pre-event communication", "duration": "30 min", "slides": [{"title": "Logistics Is the Skeleton of the Event", "type": "body", "body": "The food arrives. The flowers are delivered. The AV equipment is installed. The chairs are set. The programmes are printed. Each of these elements is delivered by a supplier, and every supplier has a schedule, a delivery window and a communication protocol.\n\nWhen supplier logistics are well-managed, the event setup proceeds smoothly and on time. When they are not \u2014 deliveries are late, access is denied, team members are uninformed, items are in the wrong place \u2014 the setup is chaotic and the event pays the price."}, {"title": "Your Logistics Responsibilities", "type": "list", "intro": "As an event professional, you interact with supplier logistics at every event:", "items": ["Know the delivery schedule: which supplier arrives when, and what they are delivering", "Know the access points: loading bay, service entrance, elevator \u2014 suppliers go to the right door", "Direct suppliers on arrival: 'The catering team uses the service entrance on the left side of the building'", "Confirm deliveries against the brief: count items, check quantities, report discrepancies immediately", "Do not accept deliveries of items that are damaged, incorrect or incomplete without flagging to the event manager", "When a delivery is late: inform the event manager immediately, do not wait to see if it arrives"]}, {"title": "Pre-Event Communication", "type": "highlight", "points": [{"text": "Every team member should know who every supplier is before they arrive. A delivery person who is questioned by an uninformed staff member loses time and creates frustration at the access point."}, {"text": "Supplier briefings happen before the event, not at the door. A caterer who is directed to the kitchen on arrival because they have already been briefed is more efficient than one receiving instructions for the first time."}, {"text": "When communicating with suppliers, be specific: 'The linen delivery goes to the storage room on Level 2, the second door on the right.' Vague directions create wasted time."}, {"text": "Build professional courtesy into supplier interactions. A supplier who is treated respectfully by the event team is a supplier who communicates proactively when something changes."}]}, {"title": "Managing Supply Discrepancies", "type": "steps", "intro": "When a supplier delivery does not match the brief:", "steps": [{"number": "1", "label": "Document the discrepancy", "detail": "Count exactly what was delivered against exactly what was ordered. Note the difference clearly before the supplier leaves the site."}, {"number": "2", "label": "Escalate immediately", "detail": "Inform the event manager immediately with the specific discrepancy. 'We ordered 200 programmes and 160 have been delivered' \u2014 specific numbers, not general concerns."}, {"number": "3", "label": "Do not fill gaps independently", "detail": "Do not attempt to compensate for a supply shortfall by redistributing items or improvising alternatives without the event manager's instruction. Manage the information, not the solution."}]}], "questions": [{"q": "Why is directing suppliers to the correct access point important?", "opts": ["Incorrect access points create security risks at formal events", "Suppliers at the wrong door lose time and create frustration that affects the setup schedule", "Access point management is a venue requirement for all commercial deliveries", "Directing suppliers correctly demonstrates the team's event knowledge to the client"], "a": 1}, {"q": "When a delivery arrives late, what should the event team do?", "opts": ["Wait to see if it arrives before the event opens", "Inform the event manager immediately \u2014 do not wait", "Contact the supplier directly to get an estimated arrival time", "Proceed with setup without the delayed item and manage the gap during service"], "a": 1}, {"q": "What is the correct approach to a supply discrepancy?", "opts": ["Compensate by redistributing available items to cover the shortfall", "Document exactly what was delivered, escalate to the event manager and await instruction", "Manage the discrepancy independently to avoid burdening the event manager with minor issues", "Accept the shortfall, note it and include it in the post-event report"], "a": 1}, {"q": "Why does professional courtesy toward suppliers benefit the event?", "opts": ["It creates a positive working environment that motivates all parties", "A supplier treated respectfully communicates proactively when something changes", "Professional relationships with suppliers result in preferential rates and priority service", "Courtesy ensures the supplier team works harder to meet event standards"], "a": 1}]}, {"id": 5, "title": "Guest Registration and Arrival Management", "subtitle": "Arrival procedures, registration desks, name badges and queue management", "duration": "30 min", "slides": [{"title": "Arrival Is the First Chapter of the Event", "type": "body", "body": "For every guest at your event, the arrival experience is the first chapter of the experience they will have and later describe to others. A smooth, warm, efficient arrival process begins the evening with the guest well-disposed and ready to enjoy what follows.\n\nA chaotic arrival \u2014 long queues, uninformed staff, name badge errors, unclear directions \u2014 begins the event at a deficit. The rest of the evening will need to work harder to overcome that first impression. Get the arrival right."}, {"title": "Registration Desk Setup", "type": "list", "intro": "The registration desk must be fully prepared before the first guest arrives:", "items": ["Alphabetical register clearly organised \u2014 by surname if individual, by company if corporate", "Name badges sorted alphabetically and immediately accessible \u2014 no searching through boxes", "Directional signage from venue entrance to registration: guests should not have to look for the desk", "Pens, spare badges and a clean surface \u2014 the desk should look professional, not like a packing area", "Clear visibility from the entrance \u2014 guests should see the registration desk from the door", "A designated queuing area marked or managed \u2014 a disorganised queue creates the impression of chaos"]}, {"title": "The Arrival Interaction", "type": "steps", "intro": "Every arriving guest receives the same professional arrival sequence:", "steps": [{"number": "1", "label": "Welcome and acknowledge", "detail": "Every guest is acknowledged within 30 seconds of entering the reception area. A warm greeting \u2014 'Good evening, welcome' \u2014 before the registration process begins."}, {"number": "2", "label": "Register efficiently", "detail": "'May I have your name please?' Check the list. Mark arrival. Issue the name badge. Do this with confidence \u2014 no hesitation, no visible searching."}, {"number": "3", "label": "Direct and farewell", "detail": "'Your table is number 12 \u2014 it's through the doors on the right.' Or escort if appropriate. 'Enjoy the evening.' Send every guest forward positively."}]}, {"title": "Queue Management", "type": "highlight", "points": [{"text": "If registration volume creates a queue, acknowledge waiting guests: 'We'll be with you shortly \u2014 thank you for your patience.' Silence in a queue creates anxiety."}, {"text": "Triage: have a team member move down the queue collecting names so registration begins before the guest reaches the desk. This reduces perceived wait time significantly."}, {"text": "If the queue is beyond management, inform the event manager immediately. Adding a team member to registration is a 30-second decision \u2014 not one made after 20 guests have been waiting for 10 minutes."}, {"text": "At high-volume arrivals, speed and warmth must coexist. Efficiency that feels cold is not guest service \u2014 it is processing. Maintain genuine warmth even under volume pressure."}]}], "questions": [{"q": "Why is the arrival experience described as the first chapter of the event?", "opts": ["It determines the formal protocol for the entire event sequence", "The guest's first impression shapes their disposition for everything that follows", "Arrival management is the most operationally complex part of the event", "The arrival sequence is the most visible part of the event for the client"], "a": 1}, {"q": "How should name badges be organised at the registration desk?", "opts": ["By table number so they can be issued with the table allocation", "Alphabetically by surname \u2014 immediately accessible without searching", "By registration order so early guests are processed fastest", "By company name for corporate events, surname for social events"], "a": 1}, {"q": "What is 'triaging' in queue management?", "opts": ["Prioritising guests by seniority so VIPs bypass the main queue", "Moving down the queue collecting names so registration begins before the guest reaches the desk", "Assessing each guest's registration status to determine the fastest processing route", "Dividing the queue into two lanes to process arrivals twice as fast"], "a": 1}, {"q": "When should the event manager be informed that the registration queue is beyond management?", "opts": ["When every guest has waited more than 10 minutes", "Immediately \u2014 adding a team member is a 30-second decision; do not delay until the situation is critical", "After the peak arrival period, when the full impact of the queue can be assessed", "When the first guest formally complains about the wait time"], "a": 1}]}, {"id": 6, "title": "Crowd Flow and Access Control", "subtitle": "Managing guest movement, directing traffic and preventing bottlenecks", "duration": "30 min", "slides": [{"title": "Crowd Flow Is Managed, Not Accidental", "type": "body", "body": "At any event with a significant number of guests, how people move through the space is a management challenge. Doors that release too many guests at once. Bars positioned at route intersections. Single-lane transitions between event areas. These structural features create bottlenecks unless actively managed.\n\nAn event professional who understands crowd flow principles can position themselves and their team to prevent congestion, guide guests smoothly between areas and maintain the comfort of the event environment."}, {"title": "Identifying and Preventing Bottlenecks", "type": "list", "intro": "Bottlenecks form at predictable points \u2014 anticipate and prepare:", "items": ["Registration desks: single-desk registration for 200 guests \u2014 plan for multiple desks or triage", "Doorways and transitions: ceremony to cocktail, cocktail to reception \u2014 position staff at every transition", "Bars: the first bar stop after a ceremony will draw every guest \u2014 plan bar positions to distribute the crowd", "Stage and programme exits: when a programme ends, 500 guests leave simultaneously \u2014 manage the exit", "Bathrooms: positioned at route intersections cause congestion \u2014 staff nearby to direct", "Narrow corridors: physical pinch points must be actively managed with directional staff at peak flow periods"]}, {"title": "Directing Guest Movement", "type": "highlight", "points": [{"text": "Active directing is not pointing at a sign. It is standing in the visible position, making eye contact with approaching guests and physically indicating the direction while verbally confirming: 'The dining room is through here.'"}, {"text": "Position matters more than signage. A team member in the right position guides hundreds of guests in the right direction without a single sign being read."}, {"text": "When a transition is called, every team member at every transition point must be in position before the movement begins. One gap in the coverage creates a gap in the flow."}, {"text": "After directing the flow, do not leave your position. A staff member who leaves their transition point during a crowd flow movement creates a gap that every subsequent guest walks through unguided."}]}, {"title": "Access Control", "type": "steps", "intro": "Control access to areas requiring restricted entry:", "steps": [{"number": "1", "label": "Know the access protocol", "detail": "What areas are restricted? Who has access to each area? Are there colour-coded wristbands, lanyards or badges that indicate access level? Know before the event opens."}, {"number": "2", "label": "Check politely and consistently", "detail": "'This area is reserved for [category] \u2014 may I see your [badge/lanyard]?' Consistent application is professional. Inconsistent access control \u2014 letting some through unchecked \u2014 undermines the whole system."}, {"number": "3", "label": "Manage denied access with dignity", "detail": "'I'm sorry, this area requires a [gold/VIP/speaker] pass. The [general area] is back through those doors and to your left.' Never make a guest feel accused \u2014 they may simply not know the protocol."}]}], "questions": [{"q": "What is the most effective tool for managing crowd flow at event transitions?", "opts": ["Clear and well-positioned signage throughout the venue", "A team member actively positioned and directing guests at each transition point", "A digital event guide app that guests access on their phones", "Announcements from the MC directing guests between areas"], "a": 1}, {"q": "Why must all team members be in position before a transition is called?", "opts": ["The event manager checks positions before calling transitions as a quality control step", "A gap in the team coverage creates a gap in the flow \u2014 unguided guests create congestion", "Team members in position signal to the event manager that the space is ready for guests", "Regulations require all directional staff to be in position at formal events"], "a": 1}, {"q": "What is the correct approach when a guest is denied access to a restricted area?", "opts": ["Explain that their registration level does not permit access and direct them to the correct area", "Ask them to return to registration to upgrade their access level", "Inform the event manager who will make the access decision", "Direct them to the VIP coordinator who manages all access exceptions"], "a": 0}, {"q": "At which point in an event do the most significant crowd flow management challenges typically occur?", "opts": ["During the setup and breakdown periods when suppliers are on site", "At transitions \u2014 ceremony to cocktail, programme end exits, bar service opening", "During meal service when all guests are stationary in one area", "At registration when all guests arrive within the same 30-minute window"], "a": 1}]}, {"id": 7, "title": "Working with AV, Staging and Technical Teams", "subtitle": "Coordination with technical teams, cue systems and run-of-show awareness", "duration": "30 min", "slides": [{"title": "Technical Teams Make the Programme Possible", "type": "body", "body": "The sound, the lighting, the presentation, the video feed, the microphone on the podium \u2014 every technical element of the event programme is managed by the technical team. The FOH and event operations team's job is to work with the technical team, not around them.\n\nA team member who moves a speaker, adjusts a microphone stand, steps in front of a camera or enters the stage area without permission creates a technical problem that may not be fixable during the event. Understand the technical team's role and the boundaries of your own."}, {"title": "Technical Boundaries and Permissions", "type": "list", "intro": "Apply these rules consistently in relation to the technical team:", "items": ["Never move or adjust any technical equipment without the technical team's knowledge and instruction", "Stage and podium areas are technical zones \u2014 do not enter without clearance", "Cable runs on the floor are deliberately placed \u2014 do not move or cover them", "If a microphone is not working, inform the technical team \u2014 do not attempt to fix it yourself", "Sound and visual adjustments are made by the technical operator \u2014 not by event staff", "If a guest requests a technical adjustment (louder sound, brighter lighting) relay the request to the technical team"]}, {"title": "Understanding the Run of Show", "type": "highlight", "points": [{"text": "The run of show is the technical version of the event programme \u2014 it includes every cue, every transition, every technical change and every timing marker. Know the key moments even if you do not have the full document."}, {"text": "Know when the programme starts, when each major transition happens, and when service pauses are required. These moments require FOH to be in specific positions or to be in specific states of readiness."}, {"text": "When the event manager calls a cue, it is a technical instruction being executed simultaneously by multiple teams \u2014 FOH, kitchen, technical. Your cue response must be immediate."}, {"text": "Technical delays happen. When a cue is held \u2014 'hold on the programme' \u2014 FOH continues managing the guest environment calmly. Announce to guests only if a significant delay requires communication."}]}, {"title": "AV and Technical Support During the Programme", "type": "steps", "intro": "Support the technical team's programme execution:", "steps": [{"number": "1", "label": "Brief yourself on the technical needs", "detail": "Know which guests require microphones, which presenters need clicker remotes, which table hosts need to hand off items to the stage. These handoffs require coordination."}, {"number": "2", "label": "Manage cables and equipment in your area", "detail": "You are responsible for ensuring your team members and guests do not trip on cables or disturb equipment in your section. Brief your team on cable positions."}, {"number": "3", "label": "Communicate technical faults immediately", "detail": "If you observe a technical fault \u2014 a screen going dark, a microphone cutting out, a projector issue \u2014 inform the technical team immediately via the designated communication channel."}]}], "questions": [{"q": "What should a FOH team member do if they notice a microphone is not working?", "opts": ["Replace the battery if one is accessible and test it", "Inform the technical team \u2014 do not attempt to fix it yourself", "Ask the presenter to move closer to the microphone", "Report it to the event manager who will relay it to the technical team"], "a": 1}, {"q": "Why must cables and technical equipment positions not be moved by FOH staff?", "opts": ["Technical equipment is expensive and moving it creates liability risks", "Cable positions are set deliberately \u2014 moving them can affect sound quality and sight lines, and creates trip hazards", "Technical equipment movement requires written authorisation from the venue", "FOH staff are not trained in technical systems and could damage equipment"], "a": 1}, {"q": "What must FOH do when the event manager calls a cue?", "opts": ["Wait for confirmation that the kitchen team is ready before responding", "Respond immediately \u2014 cues are executed simultaneously by multiple teams", "Confirm the cue back to the event manager before acting", "Check that all guests in the section are ready for the transition before proceeding"], "a": 1}, {"q": "How should FOH respond to a significant technical delay during the programme?", "opts": ["Inform all guests in the room of the delay and estimated resumption time", "Continue managing the guest environment calmly \u2014 communicate to guests only if the delay is significant", "Escalate to the event manager and request permission to inform guests", "Allow the MC to manage all communication about delays \u2014 FOH does not address programme issues"], "a": 1}]}, {"id": 8, "title": "Food and Beverage at Events", "subtitle": "F&B logistics, service timing and coordinating with catering teams", "duration": "30 min", "slides": [{"title": "F&B Is the Experience Guests Remember Most", "type": "body", "body": "Ask anyone about an event they attended and they will first describe the food and beverage experience. Was the food hot and well-presented? Were drinks served promptly? Were dietary requirements managed correctly? Was there enough? Was the service attentive?\n\nFood and beverage at events is a complex logistical operation \u2014 and every event team member who interfaces with the catering team is part of that operation's success or failure."}, {"title": "F&B Coordination Responsibilities", "type": "list", "intro": "Your F&B coordination responsibilities at an event:", "items": ["Know the menu and service format before the event opens: seated plated, buffet, cocktail canap\u00e9s or a combination", "Know the dietary flags: which table has a vegan, which guest has a nut allergy \u2014 confirm with the caterer before service begins", "Know the service timing: when does canap\u00e9 service begin, when is each course served, when does the bar open", "Communicate timing changes between FOH and the kitchen \u2014 if the programme is running late, the kitchen needs to know immediately", "Never release a course from the kitchen without the event manager's instruction", "Monitor the buffet and drinks service: empty platters and unmanned bars are visible service failures"]}, {"title": "Managing Dietary Requirements", "type": "steps", "intro": "Dietary requirements at events are managed with this sequence:", "steps": [{"number": "1", "label": "Confirm the list before service", "detail": "You have a list from registration of all dietary requirements. Confirm with the caterer that each requirement has been prepared for. Verbal confirmation is not enough \u2014 walk the list."}, {"number": "2", "label": "Identify the guests before service begins", "detail": "Know which guest at which table has which requirement. Do not arrive at the table and ask 'who ordered the vegan?'"}, {"number": "3", "label": "Serve the dietary alternative simultaneously", "detail": "The guest with a dietary requirement receives their meal at the same time as all other guests \u2014 not 10 minutes later as a visible afterthought."}]}, {"title": "Beverage Service Management", "type": "highlight", "points": [{"text": "Water is the baseline of event beverage service. Every seated table must have water on it when guests sit down \u2014 not five minutes later."}, {"text": "Monitor bar queues actively. A bar with a 20-person queue is a crowd management and service failure. Communicate to the event manager if additional bar points are needed."}, {"text": "Wine and formal beverage service at seated events follows the protocol: present, taste, approve, pour. Do not begin pouring before the host has approved."}, {"text": "The end of a beverage service period \u2014 when the bar closes \u2014 must be communicated to guests in advance. A bar that closes without notice creates frustration. 'Last drinks will be in 15 minutes' is a professional and courteous standard."}]}], "questions": [{"q": "Why must dietary requirements be confirmed with the caterer before service begins?", "opts": ["To ensure the catering team has priced the modifications correctly", "To confirm each requirement has been prepared for \u2014 verbal confirmation is not sufficient", "So the event manager can brief the catering team on guest preferences", "Dietary confirmations are legally required at formal events"], "a": 1}, {"q": "What is the correct timing for serving a guest's dietary alternative meal?", "opts": ["After all standard meals have been served to confirm the kitchen has the capacity", "At the same time as all other guests \u2014 not visibly later", "Before standard meals so the catering team can focus on the main service", "When the dietary guest signals they are ready to be served"], "a": 1}, {"q": "When must a programme timing change be communicated to the kitchen?", "opts": ["At the scheduled transition point in the run of show", "Immediately \u2014 the kitchen plans preparation around programme timing", "When the event manager confirms the change is definite", "After the current course is cleared so the kitchen can focus on completion"], "a": 1}, {"q": "How should bar service closing be communicated to guests?", "opts": ["An announcement when the bar closes is sufficient", "Communicate 'last drinks in 15 minutes' \u2014 guests should not be surprised by a bar closing", "Allow guests to notice the bar has closed naturally \u2014 a formal announcement is unnecessary", "Communicate through the MC at the programme's natural closing point"], "a": 1}]}, {"id": 9, "title": "Emergency and Contingency Protocols", "subtitle": "Health and safety, fire procedures, incident handling and medical emergencies", "duration": "30 min", "slides": [{"title": "Every Event Has a Safety Responsibility", "type": "body", "body": "When you are working a professional event, the safety of every guest in that space is part of your professional responsibility. You are not a passive observer when something goes wrong \u2014 you are a trained, briefed professional who knows the emergency procedures and acts on them.\n\nThe most important preparation for any emergency is the knowledge acquired before it happens. This module covers what every event professional must know."}, {"title": "What You Must Know Before Every Event", "type": "list", "intro": "Before the event opens, confirm:", "items": ["The location of all emergency exits and the evacuation route from your specific zone", "The designated fire assembly point \u2014 and who accounts for guests at the assembly point", "The location of the first aid kit and the designated first aider for this event", "The emergency contact chain: who you call, in what order, for a medical emergency, fire or security incident", "Whether the venue has a defibrillator (AED) and its location", "The incident reporting procedure: who receives the report and in what format"]}, {"title": "Medical Emergency Response", "type": "steps", "intro": "When a guest is unwell or has a medical emergency:", "steps": [{"number": "1", "label": "Stay calm \u2014 you are the professional", "detail": "Every guest nearby is watching how the team responds. Visible panic creates panic. A composed, decisive response communicates that the situation is being managed."}, {"number": "2", "label": "Secure space and call for the first aider", "detail": "Create space around the affected guest. Use your radio: 'Medical emergency at [specific location]. First aider required immediately.' Do not leave the guest."}, {"number": "3", "label": "Escalate and manage the environment", "detail": "Inform the event manager immediately. If bystanders are gathered, manage them calmly: 'Please give the guest space \u2014 our team is assisting.' Call emergency services if the first aider directs."}]}, {"title": "Fire and Evacuation Protocol", "type": "highlight", "points": [{"text": "On the fire alarm activating: your immediate instruction is to move guests toward the nearest emergency exit calmly and with clear verbal direction. 'Please make your way to the emergency exit on your left.'"}, {"text": "Never assume a fire alarm is a drill at a live event. Treat every activation as real until told otherwise by the venue's safety officer."}, {"text": "Account for guests in your zone at the assembly point. Report to the event manager with a head count \u2014 'I have 34 guests from Zone 3 at the assembly point.'"}, {"text": "Do not re-enter the venue until the venue safety officer or fire service formally clears the building. No equipment, bag or personal item is worth a re-entry before clearance."}]}], "questions": [{"q": "What must every event professional confirm before the event opens regarding emergencies?", "opts": ["The venue's insurance coverage and event liability documentation", "Emergency exits, evacuation route, assembly point, first aider, first aid kit and emergency contact chain", "The client's preferred procedure for managing incidents during their event", "Whether the event has been registered with local emergency services"], "a": 1}, {"q": "What should you do immediately when you reach a guest who is unwell?", "opts": ["Assess the severity and call emergency services if the situation is serious", "Stay calm, create space around the guest and call for the first aider immediately via radio", "Ask the guest what is wrong and try to address the issue before escalating", "Inform the event manager and await instructions before approaching the guest"], "a": 1}, {"q": "How should bystanders at a medical emergency be managed?", "opts": ["Ask them to return to their tables and wait for the first aider", "Manage them calmly: 'Please give the guest space \u2014 our team is assisting'", "Allow them to remain \u2014 witnesses may be useful if the incident is later reviewed", "Inform the event manager who will address the bystanders through the MC"], "a": 1}, {"q": "When can an event team member re-enter the venue after a fire evacuation?", "opts": ["When they have confirmed their personal equipment is still inside", "When the majority of guests have re-entered without incident", "Only when the venue safety officer or fire service formally clears the building", "When the event manager gives the instruction to re-enter"], "a": 2}]}, {"id": 10, "title": "Event Breakdown and Post-Event Administration", "subtitle": "Packing down, stock return, venue handover and post-event reporting", "duration": "30 min", "slides": [{"title": "The Event Is Not Over When the Guests Leave", "type": "body", "body": "When the last guest departs, the event professionals still on site have a significant amount of professional work remaining. Breakdown, pack-down, stock return, venue handover, incident documentation and post-event communication are all part of the professional event lifecycle.\n\nA team that performs at a high standard during the event and then breaks down professionally closes the evening on a quality note that clients and venue teams remember."}, {"title": "Breakdown Responsibilities", "type": "list", "intro": "Post-event breakdown is completed systematically:", "items": ["Pack down your station according to the brief \u2014 know what goes where and in what order", "Count all items against the delivery list: returned stock must match dispatched stock", "Furniture and equipment is returned to the position or storage specified in the venue brief", "Remove all event branding, signage and client-specific materials \u2014 nothing is left behind", "Check your area for guest belongings left behind: report these to the event manager immediately", "A damaged item is reported, not quietly removed \u2014 report all damage before leaving site"]}, {"title": "Venue Handover", "type": "steps", "intro": "The venue handover is the official close of the event:", "steps": [{"number": "1", "label": "Conduct a full venue walkthrough", "detail": "Walk every area of the event space with the venue representative. Identify and document any damage or items not returned to their original state. This protects the client from unjust damage claims."}, {"number": "2", "label": "Confirm all areas are clear", "detail": "Confirm that all event branding has been removed, all areas are clean to the venue's standard and all supplier equipment has been collected or confirmed for collection."}, {"number": "3", "label": "Sign off and receive confirmation", "detail": "The handover document is signed by the event manager and the venue representative. Keep a copy. This is the official record of the event's conclusion on the premises."}]}, {"title": "Post-Event Documentation", "type": "highlight", "points": [{"text": "Incident reports are completed within 24 hours of the event. What happened, when, where, who was involved, what action was taken, what the outcome was. Document while the details are fresh."}, {"text": "Stock discrepancies are reported before leaving site \u2014 not the next day. A missing item flagged that evening is recoverable. Flagged the next morning, it is lost."}, {"text": "Post-event feedback to the event manager is professional and specific: what worked, what could improve, what the client would have noticed. Vague feedback serves no one."}, {"text": "Your contribution to the post-event record is your contribution to the next event's quality. Every event should be better than the last \u2014 documentation is how that happens."}]}], "questions": [{"q": "When should a damaged item be reported during breakdown?", "opts": ["In the post-event debrief report submitted the following day", "As part of the stock count at the end of the breakdown", "Immediately \u2014 before leaving site \u2014 not quietly removed", "When the venue representative conducts their post-event inspection"], "a": 2}, {"q": "What is the purpose of the venue walkthrough during handover?", "opts": ["To ensure all event branding has been removed from public-facing areas", "To document any damage and confirm the venue is returned correctly \u2014 protecting the client from unjust claims", "To confirm that the event ran according to the floor plan as presented to the venue", "To provide the venue with an accurate guest count for their records"], "a": 1}, {"q": "Within how long after the event should incident reports be completed?", "opts": ["Before leaving site", "Within 24 hours \u2014 while details are fresh", "Within 48 hours \u2014 allowing time for full reflection", "At the next team briefing"], "a": 1}, {"q": "Why is stock discrepancy reporting done before leaving site?", "opts": ["Venue policy requires all stock discrepancies to be confirmed on the night", "A missing item flagged that evening is recoverable \u2014 flagged the next morning, it is effectively lost", "Stock discrepancy reports are signed off by the venue representative during the handover walkthrough", "The event manager requires stock confirmation before releasing the team for the night"], "a": 1}]}, {"id": 11, "title": "Professionalism, Conduct and Career Development", "subtitle": "Professional standards on the floor and career growth in event work", "duration": "25 min", "slides": [{"title": "Professionalism Is a Daily Decision", "type": "body", "body": "Professionalism in the events industry is not a qualification \u2014 it is a daily decision. On every shift, you choose whether to arrive early or just on time. Whether to help a struggling colleague or stay in your section. Whether to maintain the standard when no one is watching or let it slip. Whether to treat every guest as important or reserve attention for the obvious VIPs.\n\nThese decisions, made consistently over many events, build a professional reputation that either opens doors in the industry or closes them."}, {"title": "The Standards That Define Professional Conduct", "type": "list", "intro": "These standards are non-negotiable at every Sinotheni Events deployment:", "items": ["Punctuality: 15 minutes early, in full uniform, ready to work", "Reliability: if you commit to a shift, you are there \u2014 if an emergency arises, you communicate as early as possible", "Attitude: positive, solution-focused and supportive of the team regardless of the pressure of the event", "Conduct: professional at all times in appearance, language and behaviour \u2014 on duty and in transit", "Confidentiality: all event information is private \u2014 client names, guest lists, incidents, conversations", "Feedback: after events, share what worked and what could improve \u2014 constructive feedback builds better teams", "Appearance: every shift begins with a full uniform check \u2014 the standard is consistent, not selective"]}, {"title": "Building Your Events Career", "type": "highlight", "points": [{"text": "Every event is an audition. The event manager, the coordinator, the client \u2014 they all observe performance. A consistently professional team member is one who gets requested for future events."}, {"text": "Build relationships professionally. The network you develop across events \u2014 with managers, coordinators, venue staff and colleagues \u2014 is a professional asset. Treat every interaction as a relationship investment."}, {"text": "Document your experience. Keep a record of every event type, role and scale you have worked. This becomes your professional portfolio when applying for event management or hospitality roles."}, {"text": "Your certificate from this programme demonstrates the standard you have committed to. It is the beginning of the standard, not the ceiling. Continue learning with every event you work."}]}, {"title": "You Are Ready", "type": "intro", "body": "You have completed the Event Readiness Programme.\n\nYou are now equipped for the full lifecycle of professional event work \u2014 from pre-event briefing and setup through registration, crowd management, F&B coordination, emergency response and post-event administration.\n\nThe final assessment covers all eleven modules. You need 60% to pass and receive your Certificate of Completion. On passing, you are eligible for the Sinotheni Events staffing register.\n\nEvery event from here is an opportunity to apply what you have learned and build your reputation as a professional.\n\nGo and be ready."}], "questions": [{"q": "What does 'professionalism is a daily decision' mean in the context of event work?", "opts": ["Professional status must be re-earned through formal certification at regular intervals", "Every shift, you choose how you perform \u2014 consistently good decisions build your professional reputation", "Professionalism in events is defined by the client's evaluation of each individual event", "Professional conduct decisions are made during the pre-event briefing and applied throughout the shift"], "a": 1}, {"q": "What is the punctuality standard at Sinotheni Events?", "opts": ["Arrive at the briefing start time", "Arrive 5 minutes before the briefing", "Arrive at least 15 minutes before the briefing \u2014 in full uniform, ready to work", "Arrive at the venue call time specified in the brief"], "a": 2}, {"q": "Why is every event described as 'an audition'?", "opts": ["Performance is formally evaluated and scored after every event", "Event managers, coordinators and clients observe performance \u2014 consistent professionals are requested for future events", "Auditions determine whether a team member is allocated to premium or standard events", "Event auditions are how Sinotheni Events builds its talent database"], "a": 1}, {"q": "What is the professional value of documenting your event experience?", "opts": ["It is required for tax and employment compliance purposes", "It builds a professional portfolio demonstrating event types, roles and scale \u2014 useful for career advancement", "It allows Sinotheni Events to allocate appropriate events based on experience level", "It creates a record that protects the professional if a dispute arises about their event performance"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What is the first priority when beginning any professional shift?", "opts": ["Completing paperwork", "Personal appearance and uniform check", "Introducing yourself to colleagues", "Setting up your station immediately"], "a": 1}, {"q": "When a guest makes a complaint, what is the first step?", "opts": ["Apologise immediately", "Listen completely without interrupting", "Escalate to the supervisor", "Explain what went wrong"], "a": 1}, {"q": "What should you do when working under pressure?", "opts": ["Work faster prioritising speed", "Inform guests service may be delayed", "Stay calm, prioritise correctly and ask for help when needed", "Complete assigned tasks only"], "a": 2}, {"q": "How is a professional reputation built?", "opts": ["Through formal qualifications only", "By working at prestigious venues", "One shift at a time through consistent professional performance", "Through networking"], "a": 2}, {"q": "When is it acceptable to use your phone during service?", "opts": ["During quiet periods", "For work messages", "Never in guest areas during service", "When supervisor is not nearby"], "a": 2}, {"q": "What does anticipating guest needs mean?", "opts": ["Asking guests frequently", "Identifying what a guest needs before they ask", "Preparing all items in advance", "Following a fixed sequence"], "a": 1}, {"q": "What should you do if uncertain about an instruction?", "opts": ["Figure it out during the event", "Ask a colleague quietly", "Ask during briefing before service begins", "Proceed based on past experience"], "a": 2}, {"q": "How do you handle a dietary requirement query?", "opts": ["Answer based on menu knowledge", "Never confirm without checking with the kitchen", "Treat as medically unnecessary", "Delegate to the event manager"], "a": 1}, {"q": "When should plates be cleared from a table?", "opts": ["When the fastest guest finishes", "At fixed time intervals", "When every guest at the table has finished", "When asked by the guest"], "a": 2}, {"q": "What is the correct body language when approaching a guest?", "opts": ["Casual and relaxed", "Upright posture, eye contact, warm professional smile", "Neutral and business-like", "Energetic and enthusiastic"], "a": 1}, {"q": "In the context of introduction to professional event work, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of reading an event brief and understanding the client, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of venue setup and physical preparation, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event logistics and supplier coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest registration and arrival management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of crowd flow and access control, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of working with av, staging and technical teams, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of food and beverage at events, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of emergency and contingency protocols, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event breakdown and post-event administration, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professionalism, conduct and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to professional event work, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of reading an event brief and understanding the client, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of venue setup and physical preparation, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event logistics and supplier coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest registration and arrival management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of crowd flow and access control, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of working with av, staging and technical teams, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of food and beverage at events, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of emergency and contingency protocols, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event breakdown and post-event administration, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professionalism, conduct and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to professional event work, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of reading an event brief and understanding the client, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of venue setup and physical preparation, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event logistics and supplier coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest registration and arrival management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of crowd flow and access control, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of working with av, staging and technical teams, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of food and beverage at events, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of emergency and contingency protocols, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event breakdown and post-event administration, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professionalism, conduct and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to professional event work, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of reading an event brief and understanding the client, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of venue setup and physical preparation, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event logistics and supplier coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest registration and arrival management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of crowd flow and access control, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of working with av, staging and technical teams, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}];
const RESOURCES = [{"filename": "ERP101_R1.txt", "title": "Course Quick Reference", "desc": "Professional standards for Event Readiness Programme", "content": "SINOTHENI EVENTS TRAINING ACADEMY\nEvent Readiness Programme\n\nModule 1: Introduction to Professional Event Work\\nModule 2: Reading an Event Brief and Understanding the Client\\nModule 3: Venue Setup and Physical Preparation\\nModule 4: Event Logistics and Supplier Coordination\\nModule 5: Guest Registration and Arrival Management\\nModule 6: Crowd Flow and Access Control\\nModule 7: Working with AV, Staging and Technical Teams\\nModule 8: Food and Beverage at Events\\nModule 9: Emergency and Contingency Protocols\\nModule 10: Event Breakdown and Post-Event Administration\\nModule 11: Professionalism, Conduct and Career Development"}];


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
      {slide.type === "warning" && (<div><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#c0392b", marginBottom: 16 }}>The following are NOT permitted:</div>{slide.items.map((t, i) => item(t, i, false))}</div>)}
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
    return <LockScreen courseId={COURSE_ID} courseTitle={COURSE_TITLE} courseType={COURSE_TYPE} coursePrice={COURSE_PRICE} onUnlock={data => {
      _setUnlocked(data);
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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a score of ${pct}% in the final assessment. Throughout the programme, ${profile.firstName} completed the programme demonstrating solid knowledge of professional bar operations, beverage service, responsible alcohol service and the guest-facing standards expected in South African hospitality environments.`;
    const achievement=`In completing this programme, they have shown a thorough understanding of bar station management, glassware care, beverage knowledge, pour standards and responsible service of alcohol.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.0,marginBottom:4}}>{COURSE_TITLE}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>${COURSE_TITLE} — Professional Standards</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>${COURSE_TITLE} course content covering all professional standards and practical competencies required in this fieldfety.</div>
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
          <div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:9}}>WHAT YOU WILL LEARN</div><div style={{width:32,height:2,background:G,marginBottom:16}}/>{MODULE_NAMES.map((item,i)=>(<div key={i} style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:8}}><div style={{width:4,height:4,borderRadius:"50%",background:G,flexShrink:0,marginTop:7}}/><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#555",lineHeight:1.7}}>{item}</div></div>))}</div>
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
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"32px 20px"}}><div style={S.card}><span style={S.tag}>ENROLMENT, BAR SERVICE 101</span><div style={S.title}>Your Details</div><div style={S.sub}>Your name will appear on your certificate exactly as entered here.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>FIRST NAME *</label><input style={S.inp} value={profile.firstName||""} onChange={e=>setProfile({...profile,firstName:e.target.value})} placeholder="e.g. Thandi"/></div><div><label style={S.lbl}>LAST NAME *</label><input style={S.inp} value={profile.lastName||""} onChange={e=>setProfile({...profile,lastName:e.target.value})} placeholder="e.g. Dlamini"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>EMAIL ADDRESS *</label><input style={S.inp} type="email" value={profile.email||""} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="your@email.com"/></div><div style={{marginBottom:20}}><label style={S.lbl}>HIGHEST QUALIFICATION *</label><select style={{...S.inp,appearance:"none"}} value={profile.qualification||""} onChange={e=>setProfile({...profile,qualification:e.target.value})}><option value="">Select qualification</option>{qualifications.map(q=><option key={q} value={q}>{q}</option>)}</select></div>
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
        <div><span style={S.tag}>BAR SERVICE 101</span><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:2}}>Welcome back, {profile.firstName}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666"}}>{total} of {CHAPTERS.length} modules complete · {pct}% progress</div></div>
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
      <div style={{textAlign:"center",marginBottom:22}}><div style={S.title}>{finalScore.passed?"Congratulations!":"Not Quite Yet"}</div><div style={S.sub}>{profile.firstName} {profile.lastName} · {COURSE_TITLE}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>{[["SCORE",`${finalScore.score}/${finalScore.total}`],["PERCENTAGE",`${finalScore.pct}%`],["RESULT",finalScore.passed?"PASS":"FAIL"]].map(([k,v],i)=>(<div key={i} style={{background:CR,padding:"14px",borderRadius:7,textAlign:"center",borderTop:`3px solid ${i===2?(finalScore.passed?"#2d7a45":"#c0392b"):G}`}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:4}}>{k}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:27,fontWeight:700,color:i===2?(finalScore.passed?"#2d7a45":"#c0392b"):BK}}>{v}</div></div>))}</div>
      {finalScore.passed?(<div><div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#2d7a45",lineHeight:1.8}}>Congratulations, {profile.firstName}! Your certificate will be issued to <strong>{profile.firstName} {profile.lastName}</strong>.</div><button onClick={generateDocs} style={S.btn(true,true)}>GET MY CERTIFICATE AND TRANSCRIPT</button></div>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.8}}>You scored {finalScore.pct}%. You need 60% to pass.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setScreen("dashboard")} style={{...S.btn(false),flex:1}}>REVIEW MODULES</button><button onClick={()=>startQuiz("final")} style={{...S.btn(true),flex:1}}>RETRY EXAM</button></div></div>)}
    </div></div></div>);
  }

  if(screen==="docs"){
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{profile.firstName} {profile.lastName} · {COURSE_TITLE}</div></div>
      {docs&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,docs.date,docs.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(`${profile.firstName} ${profile.lastName}`,docs.date,docs.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>)}
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the print dialog opens, select <strong>Save as PDF</strong> as the destination.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
