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
const STORE_KEY = "se_pcg101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "pcg101";
const COURSE_TITLE = "Professional Conduct and Grooming";
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

const MODULE_NAMES = ['Why Professional Presentation Matters', 'Personal Hygiene and Grooming Standards', 'Hair, Nails and Personal Care', 'Uniform and Dress Standards', 'Body Language and Professional Posture', 'Workplace Communication and Etiquette', 'Digital Conduct and Social Media Standards', 'Conduct in Guest-Facing Environments', 'Maintaining Standards Under Pressure', 'Building a Professional Reputation'];

const CHAPTERS = [
  {
    id: 1,
    title: "Why Presentation Matters",
    subtitle: "The impact of appearance and conduct on client and guest perceptions",
    duration: "18 min",
    slides: [
      { title: "Welcome to Professional Conduct and Grooming", type: "intro", body: "This course will equip you with the personal presentation standards, workplace etiquette, and professional conduct required to represent any brand or business with distinction.\n\nWhether you work at a corporate event, a government function, a hotel, or a restaurant, the way you present yourself determines how guests and clients perceive the organisation you represent." },
      { title: "Why Presentation Matters", type: "body", body: "Before you say a single word, people have already formed an opinion about you based on how you look, how you carry yourself, and the energy you bring into a room.\n\nIn a professional environment, your appearance is not a personal choice. It is a professional obligation. When you represent an employer or a brand, your presentation is their presentation.\n\nA well-groomed, professionally dressed, confident team member communicates quality, reliability, and respect. A poorly presented one communicates the opposite, regardless of how skilled they are." },
      { title: "The Impact on Perceptions", type: "highlight", points: [{ text: "Clients and guests make judgements about the quality of a service within seconds of encountering staff." }, { text: "A poorly groomed or unprofessionally dressed team member immediately undermines the credibility of the brand they represent." }, { text: "Professional presentation communicates that you take your role seriously and that the organisation values its guests." }, { text: "Consistent presentation across a team builds trust. When every team member looks the part, the guest feels they are in capable hands." }] },
      { title: "Presentation is a Professional Standard", type: "two-col", left: { heading: "WHEN PRESENTATION IS STRONG", items: ["Guests trust the team immediately", "The brand appears credible and professional", "Staff feel more confident in their role", "Clients re-book the same team", "The event runs with a sense of order and quality"] }, right: { heading: "WHEN PRESENTATION FAILS", items: ["Guests question the quality of the service", "The brand's reputation is undermined", "Staff morale declines in a culture of low standards", "Clients seek alternatives for future events", "The entire team is judged by the weakest link"] } },
      { title: "Your Appearance is Your First Communication", type: "body", body: "You are communicating before you open your mouth. The way your uniform is ironed, whether your shoes are clean, how your hair is styled, and whether you are standing upright or slouching, all of these send a message to every person in the room.\n\nThis course will set out exactly what professional presentation looks like in a hospitality and events environment, and give you the tools to meet that standard every single shift." },
    ],
    questions: [
      { q: "Why is personal presentation considered a professional obligation in events and hospitality?", opts: ["Because clients are often wealthy and judgmental", "Because when you represent an employer or brand, your presentation is their presentation", "Because it is required by law in most provinces", "Because it affects how fast you can work"], a: 1 },
      { q: "What does consistent professional presentation across a team communicate to guests?", opts: ["That the event is expensive", "That the team is experienced and capable", "That the brand values its guests and takes quality seriously", "That the employer has strict rules"], a: 2 },
      { q: "When does a guest begin forming an impression of a team member?", opts: ["After a full interaction", "Within the first few minutes of conversation", "Within seconds of encountering them", "Only after receiving service"], a: 2 },
      { q: "What happens to a team's reputation when one member is poorly presented?", opts: ["Nothing, guests judge each person individually", "Only that person is affected", "The entire team is judged by the weakest link", "The supervisor is held responsible only"], a: 2 },
    ],
  },
  {
    id: 2,
    title: "Grooming Standards",
    subtitle: "Hair, skin, nails, fragrance, and overall cleanliness for event environments",
    duration: "20 min",
    slides: [
      { title: "Grooming is Non-Negotiable", type: "body", body: "In a professional events and hospitality environment, grooming standards are not optional extras. They are baseline requirements that every team member is expected to meet before arriving at any shift.\n\nGrooming is not about vanity. It is about hygiene, professionalism, and respect for the guests and clients you are serving. A team member who is visibly unclean or poorly groomed makes guests uncomfortable and damages the brand immediately." },
      { title: "Hair Standards", type: "list", intro: "Hair must meet these standards for every professional shift:", items: ["Hair must be clean and freshly washed before each shift", "Long hair must be tied back securely and away from the face at all times", "Hair accessories must be discreet and professional in neutral or dark colours", "No extreme styles, colours, or accessories that draw attention away from the service", "Natural hairstyles are fully acceptable provided they are neat, clean, and secure", "Hair must not fall forward over the face or into food or drink service areas"] },
      { title: "Skin, Nails, and Hygiene", type: "two-col", left: { heading: "SKIN AND HYGIENE", items: ["Shower or bathe before every shift, no exceptions", "Deodorant is required and must be applied before service begins", "Avoid strong fragrances, some guests have allergies or sensitivities", "Avoid heavy makeup that appears theatrical or unprofessional", "Natural, light makeup is appropriate and encouraged for a polished appearance", "Teeth must be clean and breath fresh before guest interactions"] }, right: { heading: "NAILS", items: ["Nails must be clean and trimmed at all times", "Long nails are not appropriate in food and beverage service environments", "Nail polish if worn must be neutral, clear, or a single professional tone", "Chipped or peeling nail polish must be removed before the shift", "Artificial nails may be restricted in food service environments, confirm with your employer"] } },
      { title: "Fragrance Guidelines", type: "highlight", points: [{ text: "No perfume or cologne during food service, fragrance interferes with the guest's experience of food and drink aromas." }, { text: "In non-food service environments a light, subtle fragrance is acceptable. The rule is: if you can smell it yourself, it is too strong." }, { text: "Never use fragrance to mask body odour. Personal hygiene must come first." }, { text: "Some guests have serious fragrance allergies. Strong perfume at an event can cause medical reactions and reflects very poorly on the brand." }] },
      { title: "The Grooming Checklist", type: "list", intro: "Before every shift, confirm the following:", items: ["Hair: clean, tied back, secure, and professional", "Skin: clean, moisturised, no visible blemishes unaddressed", "Nails: trimmed, clean, no chipped polish", "Teeth: brushed, breath fresh", "Deodorant: applied", "Fragrance: none or very light only", "Overall: you would be comfortable standing in front of a senior client right now"] },
    ],
    questions: [
      { q: "Why must long hair be tied back during event service?", opts: ["It is a legal health and safety requirement everywhere", "To keep it away from the face and out of food and drink service areas", "Because clients prefer it", "To make the team look uniform"], a: 1 },
      { q: "Why is strong perfume not appropriate during food service?", opts: ["It is too expensive for work environments", "Fragrance interferes with the guest's experience of food and drink aromas", "It causes uniform damage", "It is unprofessional in all hospitality environments"], a: 1 },
      { q: "What is the rule regarding nail polish in professional events environments?", opts: ["Any colour is acceptable as long as nails are long", "Polish must be neutral, clear, or a single professional tone, never chipped", "Nail polish is never permitted in any hospitality setting", "Only natural nails are accepted"], a: 1 },
      { q: "What should a team member do if they realise they have body odour during a shift?", opts: ["Ignore it and continue working", "Apply more perfume to mask it", "Address it immediately during a break, personal hygiene must always come first", "Inform the supervisor and go home"], a: 2 },
      { q: "Natural hairstyles are acceptable in professional environments provided they are:", opts: ["Colourful and expressive", "Neat, clean, and secure", "Tied back in a specific prescribed style only", "Covered with a hat or cap at all times"], a: 1 },
    ],
  },
  {
    id: 3,
    title: "Dress Code and Uniform Standards",
    subtitle: "Correct wearing of uniforms, ironing, footwear, and accessories",
    duration: "20 min",
    slides: [
      { title: "Your Uniform is Your Professional Identity", type: "body", body: "In events and hospitality, your uniform is not just clothing. It is a visual statement about the brand you represent. A well-worn, clean, ironed uniform immediately communicates professionalism. A crumpled, stained, or incorrectly worn uniform communicates the opposite.\n\nYour uniform must be treated with the same care and respect you give to your work. It is part of the job." },
      { title: "Uniform Standards", type: "list", intro: "Every team member must meet these uniform standards before every shift:", items: ["Uniform must be freshly laundered and clean, no stains, marks, or odours", "Uniform must be ironed and crease-free, no exceptions for any role", "Uniform must fit correctly, not too tight, not too loose, not altered without permission", "Name badge must be worn visibly on the left chest where provided", "All buttons must be fastened correctly, no half-undone shirts or jackets", "Uniform must be complete, no missing items, no substitutions without authorisation"] },
      { title: "Footwear Standards", type: "two-col", left: { heading: "REQUIRED", items: ["Closed-toe, closed-heel shoes at all times in service environments", "Black shoes that are clean and polished before every shift", "Shoes must be in good condition, no scuffed, cracked, or worn-out soles", "Comfortable, professional shoes that allow you to stand for extended periods", "Non-slip soles are strongly recommended in all catering environments"] }, right: { heading: "NOT PERMITTED", items: ["Open-toe shoes or sandals in any service environment", "Casual trainers or sports shoes", "Boots with heels that are impractical for service", "Shoes that are visibly dirty or scuffed", "Any footwear that makes noise that distracts guests"] } },
      { title: "Accessories and Jewellery", type: "highlight", points: [{ text: "Jewellery must be minimal and discreet. Small stud earrings, a simple watch, and a plain ring are generally acceptable." }, { text: "No dangling earrings, large bangles, or statement necklaces in food service environments, they pose hygiene and safety risks." }, { text: "No visible piercings beyond small ear studs in most professional event environments. Confirm with your employer." }, { text: "No visible tattoos in formal corporate or government event environments. Cover where required." }, { text: "Watches must be simple and professional. Avoid large, flashy, or plastic watches in formal settings." }] },
      { title: "Caring for Your Uniform", type: "list", intro: "Treat your uniform as a professional asset:", items: ["Wash your uniform after every shift, never wear a used uniform two days in a row", "Iron your uniform the night before, not in a rush on the morning of the shift", "Store your uniform hanging to prevent creasing between shifts", "Report any damage to your uniform to your supervisor immediately", "Never wear your work uniform for personal activities before a shift", "If you are unsure about any element of your uniform, ask your supervisor before the event"] },
    ],
    questions: [
      { q: "What does a well-worn, clean, ironed uniform communicate immediately?", opts: ["That the team member is senior staff", "Professionalism and respect for the brand", "That the event is a formal occasion", "That the employer has a strict dress code"], a: 1 },
      { q: "What footwear is required in all professional service environments?", opts: ["Any comfortable shoe as long as it is clean", "Open-toe shoes for events held outdoors", "Closed-toe, closed-heel black shoes that are clean and polished", "Sports shoes with non-slip soles"], a: 2 },
      { q: "When should a uniform be ironed?", opts: ["On the morning of the shift to ensure freshness", "The night before to avoid rushing on the day", "Only when it looks visibly creased", "Once per week regardless of how often it is worn"], a: 1 },
      { q: "Why are dangling earrings not permitted in food service environments?", opts: ["They look unprofessional in all settings", "They pose hygiene and safety risks", "They are too expensive to risk losing at work", "They distract guests during service"], a: 1 },
    ],
  },
  {
    id: 4,
    title: "Body Language and Posture",
    subtitle: "Standing correctly, eye contact, facial expressions, and confident presence",
    duration: "20 min",
    slides: [
      { title: "Your Body Speaks Before You Do", type: "body", body: "Over 55% of what we communicate to others is non-verbal. Before you greet a guest, before you take an order, before you say a single word, your body has already sent a message.\n\nIn an events and hospitality environment, your posture, your facial expression, your eye contact, and the way you move all communicate your level of professionalism, confidence, and commitment to excellent service.\n\nMastering professional body language is one of the most powerful tools available to any team member." },
      { title: "Professional Posture", type: "list", intro: "These are the posture standards expected in all professional events environments:", items: ["Stand upright with shoulders back and head level, never slouch or lean against walls or furniture", "Weight should be evenly distributed on both feet, do not stand with weight shifted entirely to one side", "Arms should be at your sides or clasped loosely in front, never crossed over the chest", "Do not put hands in pockets while on duty, it communicates laziness and disinterest", "When stationary, stand in a ready position, alert, upright, and attentive", "When moving, walk with purpose and moderate pace, never shuffle, run, or drag your feet"] },
      { title: "Eye Contact and Facial Expressions", type: "two-col", left: { heading: "EYE CONTACT", items: ["Make comfortable, confident eye contact when speaking or being spoken to", "Look at the guest when taking their order or answering their question", "Avoid looking away repeatedly, it signals discomfort or disinterest", "Do not stare, hold eye contact naturally and break it occasionally", "In formal environments, lower your gaze slightly rather than holding intense eye contact with VIP guests"] }, right: { heading: "FACIAL EXPRESSIONS", items: ["Your default expression on duty must be warm and approachable, not blank or serious", "Smile genuinely when greeting or interacting with guests", "Avoid showing frustration, boredom, or impatience on your face, guests read it immediately", "Maintain a neutral, professional expression when not directly engaging with guests", "Never roll your eyes, sigh visibly, or show contempt in front of guests or clients"] } },
      { title: "Confident Presence", type: "highlight", points: [{ text: "Confidence is not arrogance. It is the quiet assurance that you know what you are doing and you are prepared to do it well." }, { text: "A confident team member moves with purpose, answers questions clearly, and does not appear flustered when things get busy." }, { text: "Confidence is built through preparation. Know the event, know the menu, know your role. Preparation is the foundation of confidence." }, { text: "Even when you are uncertain, remain composed. Find the answer, do not guess. Calmness under pressure is one of the most admired professional qualities." }] },
      { title: "What to Avoid", type: "warning", items: ["Slouching against walls, pillars, or furniture during service", "Crossing arms in front of guests, signals defensiveness and disinterest", "Looking at your phone while on duty, signals disrespect to guests and clients", "Yawning visibly in guest areas", "Whispering or laughing with colleagues in ways that make guests feel excluded", "Fidgeting with your uniform, hair, or accessories while guests are present"] },
    ],
    questions: [
      { q: "What percentage of communication is non-verbal?", opts: ["About 20%", "About 35%", "Over 55%", "About 80%"], a: 2 },
      { q: "What does crossing your arms in front of a guest communicate?", opts: ["Confidence and readiness", "Defensiveness and disinterest", "That you are cold", "A relaxed professional presence"], a: 1 },
      { q: "What is the correct posture standard when standing on duty?", opts: ["Relaxed and casual to appear approachable", "Weight on one side with arms crossed for comfort", "Upright, shoulders back, arms at sides or loosely clasped in front", "Leaning lightly against the nearest surface"], a: 2 },
      { q: "What is the foundation of professional confidence?", opts: ["Natural personality and charisma", "Years of experience only", "Preparation, knowing the event, the menu, and your role", "Physical appearance and grooming"], a: 2 },
      { q: "What should your default facial expression be while on duty?", opts: ["Serious and focused to appear professional", "Warm and approachable", "Neutral and blank to avoid distraction", "Formal and unsmiling at all times"], a: 1 },
    ],
  },
  {
    id: 5,
    title: "Punctuality and Time Management",
    subtitle: "Arriving on time, pre-event briefings, and managing breaks professionally",
    duration: "18 min",
    slides: [
      { title: "Punctuality is a Professional Statement", type: "body", body: "Arriving on time is not a courtesy in a professional environment. It is a fundamental obligation.\n\nWhen you arrive late to a shift, you communicate to your employer, your colleagues, and your client that your time is more important than theirs. You create pressure for the entire team and start the event on a poor footing.\n\nIn the events industry, the preparation that happens before the first guest arrives is critical. A team member who misses the briefing is a team member who goes into the event unprepared." },
      { title: "Arrival Standards", type: "list", intro: "These are the arrival standards expected in professional events environments:", items: ["Arrive at least 15 to 30 minutes before your scheduled shift start time, not at the start time", "Use this time to check your appearance, review the brief, and prepare your station", "Attend every pre-event briefing without exception, this is where critical information is shared", "If you are going to be late, communicate with your supervisor as early as possible, never arrive late without warning", "Prepare everything you need the night before: uniform, transport, alarm, do not leave it to the morning of the shift", "Being punctual is one of the most reliable ways to build your professional reputation"] },
      { title: "Pre-Event Briefings", type: "highlight", points: [{ text: "The pre-event briefing is not optional. It is where the team receives critical information about the event, the client, the guest list, the menu, and any special requirements." }, { text: "Missing the briefing means going into the event without key information. This leads to mistakes, gaps in service, and a poor guest experience." }, { text: "During the briefing, listen actively. Ask questions if anything is unclear. Write down key information if necessary." }, { text: "Arrive at the briefing in full uniform, groomed, and ready. The briefing is part of the shift, not pre-shift downtime." }] },
      { title: "Managing Breaks Professionally", type: "two-col", left: { heading: "CORRECT BREAK CONDUCT", items: ["Take breaks only when authorised by your supervisor", "Return from breaks on time, every time", "Eat and drink only in designated areas away from guest spaces", "Use breaks to rest, refresh, and prepare for the next phase of service", "Keep your phone use to break times only"] }, right: { heading: "INCORRECT BREAK CONDUCT", items: ["Taking breaks without informing your supervisor", "Returning late from breaks without communication", "Eating or drinking in guest-facing areas", "Using your phone during service and calling it a break", "Using break time to complain about the event or the client"] } },
      { title: "Time Management During Events", type: "list", intro: "Managing your time during a live event is a key professional skill:", items: ["Know the event timeline, when courses are served, when speeches happen, when the event ends", "Anticipate what is coming next and prepare in advance, do not react after the moment has passed", "Communicate delays or issues to your supervisor immediately so they can manage the timeline", "Never rush to the point of making mistakes, efficient is not the same as careless", "When the event ends, stay until the end unless released by your supervisor, do not disappear early"] },
    ],
    questions: [
      { q: "When should you arrive for a professional event shift?", opts: ["Exactly at your scheduled start time", "15 to 30 minutes before your scheduled start time", "5 minutes before the first guest arrives", "When you feel ready and prepared"], a: 1 },
      { q: "What does arriving late to a shift communicate?", opts: ["That you had unavoidable circumstances", "That you are overworked and need better conditions", "That your time is more important than your employer's, colleagues', and client's", "Nothing, as long as it does not happen often"], a: 2 },
      { q: "Why is the pre-event briefing non-negotiable?", opts: ["It is a legal health and safety requirement", "It is where critical event, client, and service information is shared", "It is how supervisors take attendance", "It is only important for new or junior team members"], a: 1 },
      { q: "Where should team members eat and drink during their break?", opts: ["In any quiet area of the venue", "In designated areas away from guest spaces", "Behind the service station between orders", "Wherever is most convenient during service"], a: 1 },
    ],
  },
  {
    id: 6,
    title: "Workplace Etiquette",
    subtitle: "Phone use, eating and drinking on duty, and speaking with supervisors",
    duration: "20 min",
    slides: [
      { title: "Etiquette is the Framework of Professionalism", type: "body", body: "Workplace etiquette is the set of unwritten and written rules that govern how professionals conduct themselves in a work environment.\n\nIn events and hospitality, the stakes are high. You are working in guest-facing environments where every action is visible. The way you use your phone, how you speak to supervisors, whether you eat in front of guests, all of these behaviours are observed and judged.\n\nProfessional etiquette is not about being rigid. It is about showing respect for your employer, your colleagues, and the guests you serve." },
      { title: "Phone Use on Duty", type: "two-col", left: { heading: "ACCEPTABLE PHONE USE", items: ["During authorised break times in designated areas", "If required for work purposes such as receiving an event update from a supervisor", "In genuine personal emergencies, with supervisor's knowledge", "Before the shift begins and after the shift ends"] }, right: { heading: "NEVER ACCEPTABLE", items: ["Using your phone in guest-facing areas at any time during service", "Texting or scrolling while positioned at your station", "Photographing guests, clients, or the event without explicit permission", "Taking personal calls in areas where guests can see or hear you", "Using social media during the event without employer authorisation"] } },
      { title: "Eating and Drinking on Duty", type: "list", intro: "Food and beverage conduct during events:", items: ["Never eat in areas where guests are present, this is non-negotiable", "Never drink from client or guest beverages or consume event food without supervisor authorisation", "Water is generally permitted during service, confirm with your supervisor and keep it discreet", "Chewing gum during service is not acceptable at any time", "If you need to eat or drink, do so during your authorised break in a designated area", "Never handle food for yourself while serving it to guests, hygiene and perception both matter"] },
      { title: "Speaking with Supervisors and Colleagues", type: "highlight", points: [{ text: "Address supervisors respectfully at all times. In most professional events environments this means using their name and a professional tone, not casual or dismissive language." }, { text: "Raise concerns or questions at an appropriate time, not during the middle of a critical service moment. Find the right moment." }, { text: "Never argue with a supervisor in front of guests or colleagues. If you disagree, address it privately and professionally after the event." }, { text: "Communicate clearly and directly. If you are unsure about your role or an instruction, ask immediately rather than guessing." }] },
      { title: "General Workplace Etiquette", type: "list", intro: "Additional standards for professional conduct on duty:", items: ["Never discuss your personal life, personal problems, or personal opinions loudly in the workplace", "Never speak negatively about the event, the client, or the employer with colleagues in earshot of guests", "Greet every colleague and supervisor professionally at the start of each shift", "If you witness a colleague behaving unprofessionally, do not join in, maintain your own standard", "Thank your supervisor at the end of the shift and confirm whether you are needed for future events", "Your conduct outside of working hours at the venue also reflects on your employer"] },
    ],
    questions: [
      { q: "When is phone use acceptable during an event shift?", opts: ["Whenever you are not actively serving a guest", "Only during authorised break times in designated areas", "When you are at your station between orders", "As long as you keep it quiet and discreet"], a: 1 },
      { q: "What should you do if you disagree with a supervisor's instruction?", opts: ["Refuse to follow it until it makes sense to you", "Argue your case immediately so it is resolved quickly", "Address it privately and professionally after the event, not in front of guests", "Ask other colleagues for their opinion before proceeding"], a: 2 },
      { q: "When is eating in guest-facing areas acceptable?", opts: ["During quiet periods when no guests are present", "Never, under any circumstances during service", "When the supervisor is not watching", "Only if the guest invites you to eat with them"], a: 1 },
      { q: "How should you address concerns or questions to a supervisor during service?", opts: ["Immediately, regardless of what is happening", "Loudly so the whole team can hear and contribute", "At an appropriate time, not during a critical service moment", "Via text message so you do not interrupt them"], a: 2 },
    ],
  },
  {
    id: 7,
    title: "Representing an Employer's Brand",
    subtitle: "Brand standards, loyalty, confidentiality, and pride in the role",
    duration: "18 min",
    slides: [
      { title: "You Are the Brand", type: "body", body: "Every time you put on a uniform and step into an event, you stop being just yourself. You become a representative of the brand that employed you.\n\nGuests and clients do not distinguish between the company and the individual in the moment of interaction. When you deliver excellent service, they credit the brand. When you behave unprofessionally, they blame the brand.\n\nThis is a significant responsibility. It is also a significant opportunity." },
      { title: "Understanding Brand Standards", type: "list", intro: "To represent a brand authentically, you must understand and uphold its standards:", items: ["Know the values and reputation of the company you are representing at each event", "Understand the standard of service the brand has committed to its clients", "Present yourself in a way that aligns with the brand's image, formal, welcoming, precise", "Ask questions before the event if you are unsure about specific brand requirements", "Your behaviour is the brand's behaviour. Act accordingly at all times.", "After the event, continue to represent the brand well. Do not speak negatively about clients or employers publicly."] },
      { title: "Loyalty and Professional Conduct", type: "highlight", points: [{ text: "Loyalty does not mean blind agreement. It means representing your employer with integrity and professionalism, even when things are imperfect." }, { text: "Do not discuss internal team issues, salary, or operational problems with clients or guests under any circumstances." }, { text: "If you are unhappy with your conditions, raise it with your supervisor through the correct channels, not on the event floor." }, { text: "Clients observe everything. A team member who is visibly unhappy or disloyal damages the brand's relationship with that client." }] },
      { title: "Confidentiality", type: "two-col", left: { heading: "WHAT STAYS CONFIDENTIAL", items: ["Client details, preferences, and event information", "Guest names, dietary requirements, or personal information", "Internal team structures, pay, or management issues", "Any conversation overheard between clients or VIP guests", "Details of events not yet announced publicly"] }, right: { heading: "WHY IT MATTERS", items: ["Clients trust the brand with sensitive information", "Breaching confidentiality can cost the brand the client relationship permanently", "It may have legal consequences in some circumstances", "It demonstrates professionalism and integrity", "Your discretion is part of what makes you a trusted professional"] } },
      { title: "Pride in Your Role", type: "body", body: "Pride in your role is not about ego. It is about showing up every shift with the intention to do your best work, regardless of the size of the event, the difficulty of the conditions, or how you are feeling personally.\n\nThe best hospitality professionals take pride in their craft. They iron their uniform because they care. They arrive early because they respect the process. They smile at every guest because they understand the impact of that smile.\n\nThat is the standard this industry demands. And it is the standard that builds careers." },
    ],
    questions: [
      { q: "When a guest receives excellent service, who do they credit?", opts: ["The individual team member personally", "The brand and organisation", "The event organiser", "The catering supplier"], a: 1 },
      { q: "What should you do if you are unhappy with your working conditions?", opts: ["Discuss it openly with colleagues so they are aware", "Raise it with clients so they can put pressure on the employer", "Raise it with your supervisor through the correct channels, not on the event floor", "Post about it on social media after the event"], a: 2 },
      { q: "Why is confidentiality important in events and hospitality?", opts: ["Because it is required by national law in all cases", "Because clients trust the brand with sensitive information and breaching it can permanently damage the relationship", "Because other staff members should not have access to client details", "Because it protects the team member from legal liability"], a: 1 },
      { q: "What does professional loyalty mean in an events environment?", opts: ["Agreeing with everything your employer does without question", "Representing your employer with integrity and professionalism, even when things are imperfect", "Never leaving for another employer regardless of conditions", "Only working for one employer at a time"], a: 1 },
    ],
  },
  {
    id: 8,
    title: "Conduct at Corporate and Government Events",
    subtitle: "Formality, discretion, VIP awareness, and behaviour around clients",
    duration: "22 min",
    slides: [
      { title: "The Highest Standard of Conduct", type: "body", body: "Corporate and government events represent the most demanding professional environments in the events industry. The guests and clients at these events include executives, government officials, VIPs, and senior stakeholders who expect, and deserve, the highest standard of professional conduct.\n\nAt these events, there is no margin for casual behaviour, lapses in grooming, or unprofessional communication. Every detail matters. Every interaction is observed. Your conduct at these events defines your reputation in the industry." },
      { title: "Formality Standards", type: "list", intro: "At corporate and government events, these elevated standards apply:", items: ["All grooming and uniform standards apply at the absolute highest level, no compromise", "Greet all guests with formal, professional language. 'Good afternoon, welcome' not informal greetings", "Do not initiate conversation with guests beyond what is required for service", "Speak only when necessary and spoken to in formal environments, be seen and not heard", "Never use first names with guests unless invited to do so", "Movement must be measured and composed, no rushing, no loud footsteps, no unnecessary noise"] },
      { title: "VIP Awareness", type: "highlight", points: [{ text: "Know who the VIP guests are before the event begins. Your supervisor will brief you. Never approach a VIP incorrectly." }, { text: "VIP guests may have dedicated protocols, specific seating, specific service order, dietary requirements, security considerations. Know these in advance." }, { text: "Do not photograph, film, or record any VIP guest under any circumstances. This is a serious breach of trust and may have legal consequences." }, { text: "If a VIP guest speaks to you, respond professionally and briefly, and involve your supervisor if any request is beyond your authority." }] },
      { title: "Discretion at All Times", type: "two-col", left: { heading: "REQUIRED BEHAVIOURS", items: ["Serve quietly and efficiently without drawing attention to yourself", "Handle all service disruptions calmly and without visible panic", "If you overhear sensitive conversations, treat them as completely confidential", "Position yourself where you can observe without being intrusive", "Always confirm with your supervisor before making any deviation from the service plan"] }, right: { heading: "STRICTLY PROHIBITED", items: ["Discussing what you hear or see at the event with anyone outside the team", "Taking photographs or videos at the event without explicit permission", "Interrupting client conversations or presentations unnecessarily", "Bringing personal views or opinions into any interaction at the event", "Any social media activity related to the event without employer authorisation"] } },
      { title: "Behaviour Around Clients", type: "list", intro: "When working in proximity to clients and decision-makers:", items: ["Always be on your best behaviour, clients observe team conduct as a reflection of the brand they hired", "If a client speaks to you, respond warmly, professionally, and briefly", "If a client raises a concern or complaint, listen respectfully and involve your supervisor immediately", "Never express personal opinions about the event, the food, the venue, or the programme to clients", "If you are introduced to a client, respond warmly, make eye contact, and use professional language", "Remember: every interaction with a client is an audition for the next event"] },
    ],
    questions: [
      { q: "What does 'be seen and not heard' mean in formal event environments?", opts: ["Team members should stay hidden from guests", "Speak only when necessary and required for service, keep interaction minimal and professional", "Team members should not make eye contact with guests", "Only supervisors are permitted to speak at formal events"], a: 1 },
      { q: "What should you do if you overhear a sensitive conversation between clients at an event?", opts: ["Report it to your supervisor immediately", "Share it with your team so they are aware", "Treat it as completely confidential and never discuss it", "Use it to better understand the client's needs"], a: 2 },
      { q: "Why is photographing VIP guests at an event a serious breach of conduct?", opts: ["It distracts the team from service duties", "It is a breach of trust that may have legal consequences and damages the brand's relationship with the client", "It violates the venue's photography policy", "VIP guests are camera-shy and it makes them uncomfortable"], a: 1 },
      { q: "When a client raises a concern with you during an event, what is the correct response?", opts: ["Resolve it yourself as quickly as possible to avoid involving others", "Listen respectfully and involve your supervisor immediately", "Apologise and explain that it is not your area of responsibility", "Ask the client to raise it with management after the event"], a: 1 },
      { q: "What does 'every interaction with a client is an audition for the next event' mean?", opts: ["Clients score team members and use scores to determine bookings", "Every interaction shapes the client's impression of the brand and influences future bookings", "Team members must perform for clients as if auditioning for a promotion", "Clients attend events specifically to evaluate the event team"], a: 1 },
    ],
  },
  {
    id: 9,
    title: "Common Conduct Mistakes",
    subtitle: "Unprofessional behaviour, appearance errors, and attitude issues",
    duration: "18 min",
    slides: [
      { title: "Learn What Costs Professionals Their Reputation", type: "body", body: "Most conduct mistakes in events and hospitality are not caused by bad intentions. They are caused by a lack of awareness, poor preparation, or the gradual erosion of standards over time.\n\nKnowing the most common mistakes and understanding why they matter is one of the fastest ways to elevate your professional standard. The professionals who last in this industry are those who consistently avoid these errors." },
      { title: "Appearance Mistakes", type: "list", intro: "These appearance errors are among the most common and most damaging:", items: ["Arriving with a creased or dirty uniform, signals a lack of care and preparation", "Wearing incorrect or dirty footwear, immediately noticeable to clients and guests", "Hair that is not properly tied back or is visibly unwashed", "Chipped nail polish or unclean nails in food and beverage environments", "Visible tattoos or extreme accessories in formal corporate environments without covering them", "Wearing jewellery that is too large, too loud, or poses a hygiene risk"] },
      { title: "Behaviour Mistakes", type: "two-col", left: { heading: "CONDUCT MISTAKES", items: ["Using a phone during service in guest areas", "Eating or chewing gum in view of guests", "Arriving late without communication", "Slouching, leaning, or appearing disengaged during service", "Leaving the event before being released by the supervisor"] }, right: { heading: "ATTITUDE MISTAKES", items: ["Visibly showing frustration or impatience with guests", "Speaking negatively about the event, food, or client to colleagues", "Ignoring instructions from supervisors", "Taking credit individually for team achievements", "Comparing this event unfavourably to previous ones in earshot of clients"] } },
      { title: "Communication Mistakes", type: "highlight", points: [{ text: "Using informal language with guests or clients, 'Hey', 'Yep', 'No worries', 'Guys' are not professional greetings or responses." }, { text: "Speaking too loudly in guest areas, conversations between team members should be quiet and purposeful." }, { text: "Arguing with a colleague or supervisor in front of guests, one of the most damaging things a team can do to a client's confidence." }, { text: "Failing to communicate a problem to a supervisor until it is too late to resolve, always raise issues early." }] },
      { title: "How to Correct a Mistake", type: "steps", intro: "Mistakes happen. What matters is how you respond:", steps: [{ number: "1", label: "Acknowledge it immediately", detail: "Do not hide or minimise a mistake. Acknowledge it to yourself and, where necessary, to your supervisor." }, { number: "2", label: "Address it correctly", detail: "Where the mistake affects a guest, apologise sincerely and involve your supervisor in the resolution." }, { number: "3", label: "Learn and apply", detail: "After the event, reflect on what happened and what you will do differently. Growth comes from honest self-assessment." }] },
    ],
    questions: [
      { q: "What is the most common cause of conduct mistakes in events and hospitality?", opts: ["Deliberate unprofessional behaviour", "Poor management and supervision", "A lack of awareness, poor preparation, or gradual erosion of standards over time", "Insufficient training provided by the employer"], a: 2 },
      { q: "Which of the following is listed as an attitude mistake?", opts: ["Arriving late without communication", "Speaking negatively about the event or client to colleagues", "Using a phone during service", "Wearing incorrect footwear"], a: 1 },
      { q: "Why is arguing with a colleague in front of guests one of the most damaging conduct mistakes?", opts: ["It wastes time during service", "It violates the employment contract", "It damages the client's confidence in the entire team and the brand", "It sets a bad example for junior staff"], a: 2 },
      { q: "What should you do after making a mistake at an event?", opts: ["Move on quickly and hope no one noticed", "Blame the circumstances rather than yourself", "Reflect on what happened and what you will do differently to grow from it", "Report it to management in writing immediately"], a: 2 },
    ],
  },
  {
    id: 10,
    title: "The Standard We Hold",
    subtitle: "Hospitality expectations and the mark of a true professional",
    duration: "15 min",
    slides: [
      { title: "What the Industry Expects", type: "body", body: "The hospitality and events industry operates at a standard that many people underestimate before they enter it. It demands consistency, resilience, and the ability to perform at your best even when conditions are difficult.\n\nShifts are long. Events can be chaotic. Guests can be demanding. Conditions are not always ideal. And yet the standard does not drop. The professional holds their presentation, their conduct, and their attitude regardless of the circumstances.\n\nThat is what separates the professionals who build lasting careers from those who drift in and out of the industry." },
      { title: "The Mark of a True Professional", type: "list", intro: "These are the qualities that define a true professional in events and hospitality:", items: ["Consistent: the same standard at every event, every shift, every interaction", "Prepared: arrives ready, groomed, informed, and on time, every time", "Composed: calm and professional regardless of what is happening around them", "Discreet: handles everything they hear and see with absolute confidentiality", "Reliable: does what they say they will do, when they say they will do it", "Proud: takes genuine pride in their appearance, their conduct, and the quality of their work"] },
      { title: "Building Your Professional Reputation", type: "highlight", points: [{ text: "Your reputation in the events industry is built shift by shift. Clients and agencies remember the professionals who consistently delivered." }, { text: "A recommendation from a satisfied client or supervisor is worth more than any qualification. Earn it through consistent excellence." }, { text: "The industry is smaller than it appears. How you conduct yourself at one event will follow you to the next." }, { text: "The professionals who last are those who treat every event, large or small, high profile or low key, with the same care and commitment." }] },
      { title: "The Sinotheni Events Standard", type: "body", body: "At Sinotheni Events, we hold ourselves and every person who represents our brand to a clear standard.\n\nWe arrive prepared. We present ourselves with pride. We serve with warmth and professionalism. We handle challenges with composure. We leave every client confident that their event was in capable hands.\n\nThis is not just a standard for events. It is a standard for a career. And it starts with how you show up today." },
      { title: "You Are Ready", type: "intro", body: "You have completed all ten modules of Professional Conduct and Grooming.\n\nYou now have the knowledge, standards, and awareness to represent any brand or business in any professional environment with confidence and distinction.\n\nComplete the final assessment to earn your official Certificate of Completion. You need 60% or more to pass.\n\nGo forward and represent your brand with pride." },
    ],
    questions: [
      { q: "What separates professionals who build lasting careers from those who drift in and out of the industry?", opts: ["Having the right connections and relationships", "Working at high-profile events early in their career", "Consistently holding their presentation, conduct, and attitude regardless of circumstances", "Having formal qualifications in hospitality management"], a: 2 },
      { q: "Which of the following is listed as a mark of a true professional?", opts: ["Flexible: adapts their standard depending on the event size", "Vocal: communicates their opinions clearly to clients", "Consistent: the same standard at every event, every shift, every interaction", "Confident: never asks questions and always acts independently"], a: 2 },
      { q: "How is a professional reputation in the events industry built?", opts: ["Through formal qualifications and training certificates", "Through social media presence and online reviews", "Shift by shift, through consistent excellent conduct", "Through seniority and years of experience only"], a: 2 },
      { q: "Why must every event, large or small, receive the same care and commitment?", opts: ["Because you never know who is watching and reporting back", "Because smaller events often pay better than large ones", "Because the industry is smaller than it appears and your conduct follows you", "Because inconsistency is grounds for dismissal in most companies"], a: 2 },
    ],
  },
];

const FINAL_EXAM = [
  { q: "Why is personal presentation a professional obligation in events and hospitality?", opts: ["Clients are often wealthy and judgmental", "It is required by law in all provinces", "When you represent a brand, your presentation is their presentation", "It affects how quickly you can complete your tasks"], a: 2 },
  { q: "What does consistent professional presentation across a team communicate to guests?", opts: ["That the event is expensive", "That the team values its guests and takes quality seriously", "That the employer has very strict rules", "That every team member has been formally trained"], a: 1 },
  { q: "Why must long hair be tied back during event service?", opts: ["It is a legal requirement in all venues", "To keep it away from the face and out of food and drink service areas", "Because clients prefer it", "To make the team look uniform"], a: 1 },
  { q: "What is the rule regarding fragrance during food service?", opts: ["A light fragrance is always acceptable", "Strong fragrance is preferred to mask kitchen odours", "No fragrance at all during food service", "Fragrance is a personal choice with no restrictions"], a: 2 },
  { q: "When should a uniform be ironed?", opts: ["On the morning of the shift", "The night before to avoid rushing on the day", "Once per week", "Only when it looks visibly creased"], a: 1 },
  { q: "What footwear is required in all professional service environments?", opts: ["Any comfortable shoe as long as it is clean", "Open-toe shoes for outdoor events", "Closed-toe, closed-heel black shoes that are clean and polished", "Sports shoes with non-slip soles"], a: 2 },
  { q: "What percentage of communication is non-verbal?", opts: ["About 20%", "About 35%", "About 80%", "Over 55%"], a: 3 },
  { q: "What does crossing your arms in front of a guest communicate?", opts: ["Confidence and readiness", "That you are cold", "Defensiveness and disinterest", "A relaxed professional presence"], a: 2 },
  { q: "When should you arrive for a professional event shift?", opts: ["Exactly at your scheduled start time", "5 minutes before the first guest arrives", "15 to 30 minutes before your scheduled start time", "When you feel ready and prepared"], a: 2 },
  { q: "Why is the pre-event briefing non-negotiable?", opts: ["It is a legal requirement", "It is where critical event, client, and service information is shared", "It is how supervisors take attendance", "It is only important for new team members"], a: 1 },
  { q: "When is phone use acceptable during an event shift?", opts: ["Whenever you are not actively serving a guest", "When you are at your station between orders", "Only during authorised break times in designated areas", "As long as you keep it quiet"], a: 2 },
  { q: "What should you do if you disagree with a supervisor's instruction?", opts: ["Refuse until it makes sense", "Argue immediately so it is resolved quickly", "Ask colleagues for their opinion first", "Address it privately and professionally after the event"], a: 3 },
  { q: "When a guest receives excellent service, who do they credit?", opts: ["The individual team member personally", "The event organiser", "The brand and organisation", "The catering supplier"], a: 2 },
  { q: "What does professional loyalty mean in an events environment?", opts: ["Agreeing with everything your employer does", "Representing your employer with integrity even when things are imperfect", "Never leaving for another employer", "Only working for one employer at a time"], a: 1 },
  { q: "What does 'be seen and not heard' mean in formal event environments?", opts: ["Team members should stay hidden", "Only supervisors may speak at formal events", "Speak only when necessary and required for service", "Team members should not make eye contact with guests"], a: 2 },
  { q: "What should you do if you overhear a sensitive conversation between clients?", opts: ["Report it to your supervisor immediately", "Share it with your team", "Use it to better understand the client's needs", "Treat it as completely confidential and never discuss it"], a: 3 },
  { q: "Which of the following is listed as an attitude mistake?", opts: ["Arriving late without communication", "Wearing incorrect footwear", "Using a phone during service", "Speaking negatively about the event or client to colleagues"], a: 3 },
  { q: "What is the most common cause of conduct mistakes in events and hospitality?", opts: ["Deliberate unprofessional behaviour", "Poor management and supervision", "A lack of awareness, poor preparation, or gradual erosion of standards", "Insufficient training from the employer"], a: 2 },
  { q: "Which quality is listed as a mark of a true professional?", opts: ["Flexible: adapts standard depending on event size", "Vocal: communicates opinions clearly to clients", "Confident: never asks questions", "Consistent: the same standard at every event, every shift"], a: 3 },
  { q: "How is a professional reputation in the events industry built?", opts: ["Through formal qualifications only", "Through social media presence", "Through seniority and years only", "Shift by shift, through consistent excellent conduct"], a: 3 },
];

function genDocs(firstName, lastName, score, total, date) {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 90 ? "outstanding" : pct >= 75 ? "excellent" : "solid";
  const remarks = `${firstName} ${lastName} has successfully completed the Professional Conduct and Grooming course, achieving a ${grade} score of ${pct}% in the final assessment. This result demonstrates a thorough understanding of professional presentation, workplace etiquette, personal grooming standards, and conduct in formal hospitality and events environments.`;
  const achievement = `Having shown a thorough working knowledge of professional conduct and grooming standards including personal presentation, workplace etiquette, brand representation, and conduct at corporate and government events, as assessed by the Sinotheni Events Training Academy.`;
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
  const lines = [`SINOTHENI EVENTS TRAINING ACADEMY`, `Professional Conduct and Grooming`, `Module ${chapter.id}: ${chapter.title}`, `${chapter.subtitle}`, ``, `─────────────────────────────────────────────`, ``];
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
  a.download = `PCG101_Module${chapter.id}.txt`;
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
      {slide.type === "warning" && (<div><div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: "#c0392b", marginBottom: 16 }}>Avoid the following at all times:</div>{slide.items.map((t, i) => item(t, i, false))}</div>)}
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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed Professional Conduct and Grooming with a score of ${pct}% in the final assessment. Throughout the programme, ${profile.firstName} completed the programme demonstrating a clear understanding of professional presentation standards, grooming, workplace conduct, body language and the etiquette expected when representing any South African employer.`;
    const achievement=`In completing this programme, they have shown a solid understanding of personal grooming standards, uniform compliance, professional body language, workplace etiquette and digital conduct.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.0,marginBottom:4}}>Professional Conduct and Grooming</div>
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
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"32px 20px"}}><div style={S.card}><span style={S.tag}>ENROLMENT, PROFESSIONAL CONDUCT AND GROOMING</span><div style={S.title}>Your Details</div><div style={S.sub}>Your name will appear on your certificate exactly as entered here.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>FIRST NAME *</label><input style={S.inp} value={profile.firstName||""} onChange={e=>setProfile({...profile,firstName:e.target.value})} placeholder="e.g. Thandi"/></div><div><label style={S.lbl}>LAST NAME *</label><input style={S.inp} value={profile.lastName||""} onChange={e=>setProfile({...profile,lastName:e.target.value})} placeholder="e.g. Dlamini"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>EMAIL ADDRESS *</label><input style={S.inp} type="email" value={profile.email||""} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="your@email.com"/></div><div style={{marginBottom:20}}><label style={S.lbl}>HIGHEST QUALIFICATION *</label><select style={{...S.inp,appearance:"none"}} value={profile.qualification||""} onChange={e=>setProfile({...profile,qualification:e.target.value})}><option value="">Select qualification</option>{qualifications.map(q=><option key={q} value={q}>{q}</option>)}</select></div>
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
        <div><span style={S.tag}>PROFESSIONAL CONDUCT AND GROOMING</span><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:2}}>Welcome back, {profile.firstName}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666"}}>{total} of {CHAPTERS.length} modules complete · {pct}% progress</div></div>
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
      <div style={{textAlign:"center",marginBottom:22}}><div style={S.title}>{finalScore.passed?"Congratulations!":"Not Quite Yet"}</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Professional Conduct and Grooming</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>{[["SCORE",`${finalScore.score}/${finalScore.total}`],["PERCENTAGE",`${finalScore.pct}%`],["RESULT",finalScore.passed?"PASS":"FAIL"]].map(([k,v],i)=>(<div key={i} style={{background:CR,padding:"14px",borderRadius:7,textAlign:"center",borderTop:`3px solid ${i===2?(finalScore.passed?"#2d7a45":"#c0392b"):G}`}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:4}}>{k}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:27,fontWeight:700,color:i===2?(finalScore.passed?"#2d7a45":"#c0392b"):BK}}>{v}</div></div>))}</div>
      {finalScore.passed?(<div><div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#2d7a45",lineHeight:1.8}}>Congratulations, {profile.firstName}! Your certificate will be issued to <strong>{profile.firstName} {profile.lastName}</strong>.</div><button onClick={generateDocs} style={S.btn(true,true)}>GET MY CERTIFICATE AND TRANSCRIPT</button></div>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.8}}>You scored {finalScore.pct}%. You need 60% to pass.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setScreen("dashboard")} style={{...S.btn(false),flex:1}}>REVIEW MODULES</button><button onClick={()=>startQuiz("final")} style={{...S.btn(true),flex:1}}>RETRY EXAM</button></div></div>)}
    </div></div></div>);
  }

  if(screen==="docs"){
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Professional Conduct and Grooming</div></div>
      {docs&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,docs.date,docs.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(`${profile.firstName} ${profile.lastName}`,docs.date,docs.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>)}
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the print dialog opens, select <strong>Save as PDF</strong> as the destination.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
