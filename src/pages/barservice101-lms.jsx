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
    activateCodeRemote(code.code, name);
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
const STORE_KEY = "se_bar101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "bar101";
const COURSE_TITLE = "Bar Service 101";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 750;


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

const MODULE_NAMES = ['Introduction to Professional Bar Service', 'Bar Setup and Station Management', 'Glassware, Equipment and Hygiene', 'Beverages: Beer, Wine and Spirits', 'Cocktails, Mixers and Non-Alcoholic Drinks', 'Pour Standards and Measures', 'Guest Service and Order Management', 'Responsible Service of Alcohol', 'Handling Difficult Situations at the Bar', 'Career Development in Bar Service'];

const CHAPTERS = [
  {
    id: 1,
    title: "The Role of a Bar Attendant",
    subtitle: "Responsibilities, professional standards, working behind the bar",
    duration: "20 min",
    slides: [
      { title: "Welcome to Bar Service 101", type: "intro", body: "This course will prepare you for professional bar service. You will learn the standards, skills, and knowledge required to work confidently behind a bar at hotels, restaurants, events, and functions.\n\nBy the end of this course you will be equipped to serve guests with speed, accuracy, and professionalism in any bar environment." },
      { title: "Training Objectives", type: "list", intro: "By completing Bar Service 101, you will be able to:", items: ["Understand the responsibilities of a professional bar attendant", "Set up and maintain a clean, organised bar station", "Identify and correctly use different types of glassware", "Apply correct pour standards and measures consistently", "Maintain hygiene and safety standards behind the bar", "Serve guests with confidence, speed, and professionalism"] },
      { title: "Your Responsibilities", type: "list", intro: "As a bar attendant, you are responsible for:", items: ["Setting up the bar before service begins", "Serving drinks accurately and efficiently", "Maintaining a clean and organised bar station at all times", "Knowing the beverages you are serving", "Following hygiene and responsible service standards", "Delivering a professional guest experience from first interaction to last"] },
      { title: "Professional Standards Behind the Bar", type: "highlight", points: [{ text: "Every drink you serve is a reflection of your employer and the establishment." }, { text: "Guests judge the quality of a venue by the speed, accuracy, and presentation of bar service." }, { text: "A professional bar attendant is always alert, prepared, and focused on the guest." }, { text: "Your attitude, cleanliness, and product knowledge matter on every shift." }] },
      { title: "Why This Matters", type: "body", body: "Bar service is one of the most visible roles in any hospitality environment. Guests interact with bar staff repeatedly throughout an event or dining experience.\n\nA slow, disorganised, or unprofessional bar damages the reputation of the venue. A fast, accurate, and welcoming bar creates loyal guests.\n\nEvery shift is an opportunity to build your skills, your reputation, and your career in hospitality." },
    ],
    questions: [
      { q: "Which of the following is a responsibility of a bar attendant?", opts: ["Managing the venue's finances", "Maintaining a clean and organised bar station", "Booking suppliers for the event", "Designing the drinks menu"], a: 1 },
      { q: "Why does professional bar service matter to a venue?", opts: ["It helps the bar attendant earn more tips", "Guests judge the quality of a venue by the speed and accuracy of bar service", "It makes the event cheaper to run", "It is required by the liquor board"], a: 1 },
      { q: "A bar attendant's attitude and product knowledge:", opts: ["Only matter during peak hours", "Do not affect guest experience", "Matter on every shift", "Only matter at formal events"], a: 2 },
      { q: "What should a bar attendant do before service begins?", opts: ["Wait for the first guest to arrive", "Set up the bar station", "Check social media", "Ask the manager what is on the menu"], a: 1 },
    ],
  },
  {
    id: 2,
    title: "Bar Setup and Station Layout",
    subtitle: "Organising the bar, tools, equipment, stock placement, ice and garnishes",
    duration: "25 min",
    slides: [
      { title: "A Well-Set Bar is a Productive Bar", type: "body", body: "The way your bar is set up directly affects how quickly and efficiently you can serve guests. A disorganised bar leads to slow service, mistakes, and stress.\n\nBefore every service, your bar must be fully stocked, clean, and logically arranged so that every item you need is exactly where you expect it to be." },
      { title: "Bar Setup Checklist", type: "list", intro: "Before service begins, check that you have:", items: ["Sufficient stock of all beverages within easy reach", "Clean glassware polished and correctly positioned", "Ice bucket filled and ice scoop available", "Garnishes prepared, cut, and stored in designated containers", "Bar tools in place: bottle opener, corkscrew, bar spoon, strainer, jigger", "Cleaning cloths, glass rinser, and waste bin positioned correctly", "Till or payment point ready and tested"] },
      { title: "Stock Placement", type: "two-col", left: { heading: "Back Bar (Display)", items: ["Premium spirits and liqueurs on display", "Wines and champagnes visible but not in direct sunlight", "Branded items facing forward for visibility", "Clean glassware displayed neatly above or behind"] }, right: { heading: "Working Bar (Within Reach)", items: ["Most-used spirits at eye level", "Beer taps and fridges within arm's reach", "Ice, garnishes, and mixers immediately accessible", "Clean service cloths always within reach"] } },
      { title: "Essential Bar Tools", type: "list", intro: "Every professional bar station must have:", items: ["Jigger: for measuring accurate pours", "Bar spoon: for stirring and layering drinks", "Bottle opener and corkscrew: for beers and wines", "Strainer: for cocktails and chilled drinks", "Ice scoop: never use your hands or glass to scoop ice", "Cutting board and knife: for garnish preparation", "Service tray: for carrying multiple drinks safely"] },
      { title: "Ice and Garnishes", type: "highlight", points: [{ text: "Ice must be fresh, clean, and stored in a covered bucket. Never use ice that has been contaminated or melted and refrozen." }, { text: "Garnishes must be prepared fresh before service. Cut citrus fruits, olives, mint, and other garnishes in advance and stored in clean, covered containers." }, { text: "Never touch ice or garnishes with bare hands. Always use a scoop or tongs." }, { text: "Replenish ice and garnishes regularly throughout service so you never run out at a critical moment." }] },
    ],
    questions: [
      { q: "What is the purpose of a jigger at the bar?", opts: ["To stir drinks", "To measure accurate pours", "To scoop ice", "To open bottles"], a: 1 },
      { q: "How should ice be handled behind the bar?", opts: ["With clean bare hands if necessary", "Using an ice scoop or tongs, never bare hands", "With any available utensil", "It does not matter as long as it is cold"], a: 1 },
      { q: "Where should your most-used spirits be positioned?", opts: ["At the back of the bar for safety", "Locked away until ordered", "At eye level, within easy reach", "On the display shelf only"], a: 2 },
      { q: "Why must garnishes be prepared before service?", opts: ["To impress the manager", "So you are never scrambling to cut garnishes when guests are waiting", "Because guests prefer old garnishes", "It is a legal requirement"], a: 1 },
      { q: "What should a bar attendant never use to scoop ice?", opts: ["An ice scoop", "A designated glass", "Tongs", "A ladle"], a: 1 },
    ],
  },
  {
    id: 3,
    title: "Glassware Knowledge and Care",
    subtitle: "Glass types by beverage, correct handling, polishing, storage and hygiene",
    duration: "25 min",
    slides: [
      { title: "The Right Glass Matters", type: "body", body: "Serving a drink in the wrong glass is one of the most common mistakes in bar service. It signals a lack of product knowledge and reduces the guest experience.\n\nEvery glass is designed for a specific purpose. The shape affects the aroma, temperature, and enjoyment of the drink. Knowing your glassware is a mark of a professional bar attendant." },
      { title: "Glass Types by Beverage", type: "list", intro: "Know which glass to use for each beverage:", items: ["Pint glass: draught beer and cider", "Beer mug: bottled beer served at informal venues", "Wine glass (red): wide bowl to allow the wine to breathe", "Wine glass (white): narrower bowl to preserve temperature", "Champagne flute: sparkling wine and champagne, preserves bubbles", "Highball glass: long drinks, spirits with mixers, soft drinks", "Rocks glass (Old Fashioned): spirits on the rocks, short spirits drinks", "Shot glass: single spirit measures", "Cocktail (Martini) glass: martinis and up drinks"] },
      { title: "Correct Glass Handling", type: "two-col", left: { heading: "Always", items: ["Hold wine glasses by the stem, never the bowl", "Carry glasses on a tray, never stacked by hand", "Pick up glasses by the base or lower third", "Check for chips or cracks before use", "Use a glass rinser before pouring if available"] }, right: { heading: "Never", items: ["Touch the rim or bowl of any glass with bare hands", "Stack glasses inside each other when carrying", "Use a cracked or chipped glass, discard it immediately", "Dry glasses with a dirty or wet cloth", "Carry glasses with fingers inside the bowl"] } },
      { title: "Polishing and Storage", type: "list", intro: "Polished, spotless glassware is a non-negotiable standard:", items: ["Use a clean, dry lint-free cloth for polishing", "Hold the glass up to the light to check for streaks or spots", "Steam the glass over hot water before polishing for best results", "Store glasses upside down on a clean, dry surface or rack", "Never store glasses near strong-smelling cleaning products", "Rotate stock so older glasses are used first"] },
      { title: "Glassware Hygiene", type: "highlight", points: [{ text: "All glassware must be washed at the correct temperature in an approved glass washer or by hand with food-safe detergent." }, { text: "After washing, glasses must be allowed to air dry or be polished with a clean cloth. Never use the same cloth for multiple purposes." }, { text: "A cracked or chipped glass must be discarded immediately. It is a safety and hygiene risk." }, { text: "Never serve a guest in a glass that has lipstick, smudges, or any visible marks. It communicates carelessness." }] },
    ],
    questions: [
      { q: "Which glass is correct for serving draught beer?", opts: ["Highball glass", "Rocks glass", "Pint glass", "Champagne flute"], a: 2 },
      { q: "How should wine glasses be held?", opts: ["By the bowl to keep the wine warm", "By the rim for a firm grip", "By the stem to avoid warming the wine", "It does not matter"], a: 2 },
      { q: "What should you do if you find a cracked glass?", opts: ["Use it for soft drinks only", "Discard it immediately", "Put it to the back of the shelf", "Only discard it if a guest notices"], a: 1 },
      { q: "Why is a champagne flute the correct glass for sparkling wine?", opts: ["It holds more liquid", "It is easier to carry", "Its shape preserves the bubbles and carbonation", "It looks more expensive"], a: 2 },
      { q: "What is the correct way to store clean glasses?", opts: ["Right side up to avoid dust inside", "Upside down on a clean, dry surface or rack", "Stacked inside each other to save space", "In a damp area to keep them cool"], a: 1 },
    ],
  },
  {
    id: 4,
    title: "Beverage Knowledge",
    subtitle: "Beer types, wine varieties, spirits basics, soft drinks, mixers and garnishes",
    duration: "30 min",
    slides: [
      { title: "Know What You Are Serving", type: "body", body: "A professional bar attendant does not just pour drinks. They understand what they are serving.\n\nGuests will ask questions. What is on tap? What is the difference between a lager and an ale? Can you recommend a wine? Is this drink sweet or dry?\n\nIf you cannot answer these questions confidently, you lose the guest's trust. Product knowledge is one of the most valuable skills a bar attendant can develop." },
      { title: "Beer Knowledge", type: "list", intro: "Understanding the main types of beer:", items: ["Lager: light, crisp, and refreshing. Most popular beer style. Served cold. Examples: Castle, Heineken, Amstel.", "Ale: fuller-bodied, more complex flavour than lager. Served slightly cooler than room temperature.", "Stout: dark, rich, and creamy. Made from roasted malt. Examples: Guinness.", "Draught beer: served directly from a keg via a tap. Must be poured at the correct angle to control foam.", "Bottled beer: served cold in the original bottle, often with a glass depending on the establishment.", "Cider: made from fermented apples or pears. Often listed alongside beer on bar menus."] },
      { title: "Wine Knowledge", type: "list", intro: "The basics every bar attendant must know:", items: ["Red wine: served at room temperature or slightly below. Full-bodied, pairs with meat and rich foods. Examples: Cabernet Sauvignon, Merlot, Shiraz.", "White wine: served chilled. Lighter and crisper. Pairs with fish, chicken, and salads. Examples: Sauvignon Blanc, Chardonnay.", "Rose wine: between red and white in colour and taste. Served chilled.", "Sparkling wine and Champagne: served chilled in a flute. Bubbles are produced by secondary fermentation.", "Dry vs sweet: dry wine has very little residual sugar. Sweet wine has more. Guests often ask this question."] },
      { title: "Spirits and Mixers", type: "two-col", left: { heading: "Common Spirits", items: ["Vodka: clear, neutral spirit. Mixes with almost anything.", "Gin: botanical spirit. Pairs with tonic water and citrus.", "Rum: made from sugarcane. Light or dark varieties.", "Whisky/Whiskey: grain spirit, aged in barrels. Scotch, Irish, Bourbon.", "Brandy: distilled from wine. Often served as a digestif.", "Tequila: made from agave. Used in margaritas and shots."] }, right: { heading: "Common Mixers", items: ["Tonic water: pairs with gin", "Soda water: lightens any spirit drink", "Cola: pairs with rum, whisky, and vodka", "Lemonade: pairs with vodka, gin, and cider", "Ginger beer: used in Moscow Mule and Dark and Stormy", "Cranberry juice: pairs with vodka and gin"] } },
      { title: "Soft Drinks and Garnishes", type: "list", intro: "Know your non-alcoholic options and garnishes:", items: ["Soft drinks: Coke, Sprite, Fanta, still and sparkling water must always be available and well stocked.", "Juices: orange, apple, cranberry, pineapple. Always know what is available.", "Common garnishes: lemon and lime wedges and slices, orange slices, mint sprigs, olives, cocktail cherries, cucumber.", "Garnish purpose: garnishes enhance the appearance and aroma of the drink. They are part of the presentation.", "Always use fresh garnishes. Never use wilted or discoloured fruit."] },
    ],
    questions: [
      { q: "Which beer style is dark, rich, and made from roasted malt?", opts: ["Lager", "Ale", "Stout", "Cider"], a: 2 },
      { q: "At what temperature should red wine be served?", opts: ["Ice cold", "Straight from the fridge", "At room temperature or slightly below", "Warm"], a: 2 },
      { q: "Which mixer pairs most commonly with gin?", opts: ["Cola", "Tonic water", "Orange juice", "Ginger ale"], a: 1 },
      { q: "What does 'dry' mean when describing a wine?", opts: ["The wine has been stored without water", "The wine has very little residual sugar", "The wine is very old", "The wine was made without grapes"], a: 1 },
      { q: "Why is product knowledge important for a bar attendant?", opts: ["So they can impress colleagues", "Guests ask questions and a confident answer builds trust", "It is a legal requirement", "It helps them work faster"], a: 1 },
    ],
  },
  {
    id: 5,
    title: "Pour Standards and Measures",
    subtitle: "Correct measures, consistency, free-pour vs measured, spillage control",
    duration: "25 min",
    slides: [
      { title: "Why Measures Matter", type: "body", body: "Pouring the correct measure every time is one of the most important skills in bar service. Over-pouring costs the establishment money and can lead to responsible service issues. Under-pouring disappoints guests and damages trust.\n\nConsistency is the standard. Every guest should receive the same quality and quantity, every time." },
      { title: "Standard Measures in South Africa", type: "list", intro: "Know your standard bar measures:", items: ["Single spirit measure: 25ml", "Double spirit measure: 50ml", "Wine by the glass: 150ml to 175ml depending on the establishment", "Beer by the glass (draught pint): 500ml", "Half pint: 250ml", "Champagne or sparkling wine flute: 125ml to 150ml", "Always confirm the house standard with your manager before service."] },
      { title: "Measured vs Free Pour", type: "two-col", left: { heading: "Measured Pour (Recommended)", items: ["Use a jigger for every spirit pour", "Ensures consistency for every guest", "Protects the establishment from over-pouring losses", "Required in most professional and licensed venues", "Builds guest trust, they know they are getting the correct measure"] }, right: { heading: "Free Pour (Higher Risk)", items: ["Pouring without a measuring tool", "Requires significant practice to be accurate", "High risk of over or under pouring", "Not recommended for new bar attendants", "Only acceptable where the venue specifically permits it"] } },
      { title: "Pouring Beer Correctly", type: "list", intro: "Draught beer requires technique to pour correctly:", items: ["Hold the glass at a 45 degree angle under the tap", "Open the tap fully in one smooth motion", "Gradually straighten the glass as it fills", "The last quarter of the pour should be straight to create the correct head of foam", "A good head of foam is approximately 1 to 2 cm thick", "Too much foam means the glass was too straight too early", "Too little foam means the glass was kept at an angle too long"] },
      { title: "Spillage Control and Waste", type: "highlight", points: [{ text: "Spillage is one of the biggest sources of unnecessary cost at a bar. A small spill on every pour adds up to significant loss over a shift." }, { text: "Always pour over the bar mat or drip tray. Never pour over the guest area." }, { text: "Use the correct glass size for each drink. Overfilling a glass because the correct size is unavailable is not acceptable." }, { text: "Return partially opened bottles to the correct storage immediately. Never leave open bottles standing on the bar unnecessarily." }] },
    ],
    questions: [
      { q: "What is the standard single spirit measure in South Africa?", opts: ["15ml", "25ml", "50ml", "30ml"], a: 1 },
      { q: "Why is a measured pour recommended over a free pour?", opts: ["It is faster", "It ensures consistency and protects against over-pouring losses", "Guests prefer it visually", "It is required by national law in all venues"], a: 1 },
      { q: "At what angle should you hold a glass when starting a draught beer pour?", opts: ["Straight upright at 90 degrees", "At 45 degrees", "Completely horizontal", "At 30 degrees"], a: 1 },
      { q: "How thick should the head of foam be on a correctly poured draught beer?", opts: ["No foam at all", "Half the glass", "5 cm", "Approximately 1 to 2 cm"], a: 3 },
      { q: "What should you do with a partially opened bottle after serving?", opts: ["Leave it on the bar for convenience", "Return it to the correct storage immediately", "Give it to another guest", "Pour the remainder down the drain"], a: 1 },
    ],
  },
  {
    id: 6,
    title: "Bar Hygiene and Safety",
    subtitle: "Food safety, hygiene standards, responsible service of alcohol",
    duration: "25 min",
    slides: [
      { title: "Hygiene is Non-Negotiable", type: "body", body: "Behind the bar, hygiene is not optional. You are handling food items, ice, garnishes, and glassware that go directly to guests. Any lapse in hygiene can cause illness, damage the venue's reputation, and in serious cases, result in legal consequences.\n\nA clean bar communicates professionalism. A dirty bar communicates carelessness." },
      { title: "Personal Hygiene Standards", type: "list", intro: "Before every shift, ensure:", items: ["Hands are washed thoroughly before handling any glassware, ice, or garnishes", "Nails are short, clean, and free of nail polish where possible", "Hair is tied back and away from the face", "Uniform is clean, ironed, and odour-free", "No jewellery on hands or wrists that could contaminate ice or garnishes", "Do not handle your face, hair, or phone and then touch glassware without washing hands"] },
      { title: "Bar Cleaning Standards", type: "two-col", left: { heading: "During Service (Ongoing)", items: ["Wipe bar surface after every spill immediately", "Change bar cloths regularly, a dirty cloth spreads bacteria", "Rinse used glasses before loading the glass washer", "Empty drip trays regularly, never let them overflow", "Keep garnish containers covered when not in use"] }, right: { heading: "End of Service (Required)", items: ["Wash and sanitise all bar surfaces thoroughly", "Empty and clean all ice buckets and dry them completely", "Dispose of all cut garnishes, do not store overnight", "Clean all bar tools, bottle pourers, and equipment", "Restock, rotate stock, and prepare for next service"] } },
      { title: "Responsible Service of Alcohol", type: "list", intro: "You have a legal and ethical responsibility to serve alcohol responsibly:", items: ["Never serve alcohol to anyone who appears intoxicated. Inform your supervisor immediately.", "Never serve alcohol to anyone under the legal drinking age (18 in South Africa). Ask for ID if unsure.", "If a guest shows signs of intoxication (slurred speech, unsteady, aggressive), stop service and notify management.", "Encourage intoxicated guests to drink water and arrange safe transport where possible.", "You cannot be forced by a guest or manager to serve someone who is intoxicated or underage.", "Document incidents of refused service where possible."] },
      { title: "Food Safety at the Bar", type: "highlight", points: [{ text: "Ice is classified as a food item. It must be stored in a covered, clean container and scooped with a designated scoop only." }, { text: "Garnishes are food items. They must be prepared fresh, stored at the correct temperature, and discarded at the end of service." }, { text: "Mixers and juices must be kept refrigerated once opened and discarded after the recommended shelf life." }, { text: "Any glass or item that falls on the floor must be washed before use. No exceptions." }] },
    ],
    questions: [
      { q: "When must a bar attendant wash their hands?", opts: ["Only when they look dirty", "Before handling any glassware, ice, or garnishes", "Once at the beginning of the shift", "Only after using the bathroom"], a: 1 },
      { q: "What should you do if a guest appears intoxicated?", opts: ["Continue serving them until they ask you to stop", "Water it down to be safe", "Stop service and notify your supervisor immediately", "Ask the guest if they feel okay first"], a: 2 },
      { q: "How should ice be stored behind the bar?", opts: ["In any open container that is convenient", "In a covered, clean bucket with a designated scoop", "In the same area as cleaning products", "Directly in the glass before the drink is ordered"], a: 1 },
      { q: "What must you do with cut garnishes at the end of service?", opts: ["Store them in the fridge for the next day", "Cover them and leave them on the bar", "Dispose of them, do not store overnight", "Give them to kitchen staff"], a: 2 },
      { q: "What is the legal drinking age in South Africa?", opts: ["16", "21", "18", "17"], a: 2 },
    ],
  },
  {
    id: 7,
    title: "Guest Interaction at the Bar",
    subtitle: "Welcoming guests, taking drink orders, speed, accuracy, professionalism",
    duration: "20 min",
    slides: [
      { title: "The Bar is a Stage", type: "body", body: "Unlike waiters who move through a venue, bar attendants work in a visible, fixed space. Guests can watch you at all times. Every action you take, every expression on your face, every interaction you have, is on display.\n\nThis is an opportunity. When you perform with professionalism, speed, and warmth, guests notice and they remember it." },
      { title: "Welcoming Guests at the Bar", type: "steps", intro: "Every guest at the bar deserves immediate acknowledgement:", steps: [{ number: "1", label: "Acknowledge within 30 seconds", detail: "Even if you are busy, make eye contact and nod or say 'I will be with you shortly.' Never ignore a waiting guest." }, { number: "2", label: "Greet warmly and professionally", detail: "'Good evening, what can I get for you?' Use professional, friendly language." }, { number: "3", label: "Listen carefully to the order", detail: "Do not rush the guest. Confirm the order clearly before you begin making the drinks." }] },
      { title: "Taking Orders Accurately", type: "list", intro: "Accuracy prevents waste, rework, and guest dissatisfaction:", items: ["Repeat the order back to the guest before you begin preparing it", "Confirm preferences: ice or no ice, full fat or diet, lemon or lime", "If serving a group, take all orders before starting to pour", "Keep a mental note or use a notepad for large or complex orders", "Serve drinks in the order they were requested", "If you are unsure about any part of the order, ask. It is better to confirm than to make the wrong drink."] },
      { title: "Speed and Accuracy Standards", type: "two-col", left: { heading: "Speed", items: ["Acknowledge guests within 30 seconds of arrival at the bar", "Prepare simple drinks (beer, wine, spirits with mixer) within 60 to 90 seconds", "Never make a guest wait without acknowledging them", "Move with purpose, do not walk slowly behind the bar"] }, right: { heading: "Accuracy", items: ["Use the correct glass for every drink", "Use the correct measure for every spirit", "Add the correct garnish without being prompted", "Serve the drink exactly as ordered, not approximately"] } },
      { title: "Professionalism at the Bar", type: "highlight", points: [{ text: "Never argue with a guest at the bar. If there is a dispute about a drink or a charge, involve your supervisor." }, { text: "Never discuss other guests, colleagues, or venue issues with a guest at the bar." }, { text: "Keep your personal phone completely out of sight and out of mind during service." }, { text: "Maintain a clean bar surface at all times. A messy bar behind you communicates disorganisation." }] },
    ],
    questions: [
      { q: "How quickly should a guest at the bar be acknowledged?", opts: ["When you are ready and free", "Within 5 minutes", "Within 30 seconds", "Only when they call out to you"], a: 2 },
      { q: "What should you do before starting to prepare a drink?", opts: ["Start immediately to save time", "Repeat the order back to the guest to confirm it", "Ask the manager for approval", "Check if you have all the ingredients first"], a: 1 },
      { q: "When serving a group, when should you start pouring?", opts: ["As soon as you receive the first order", "After taking all orders from the group first", "After serving the most important-looking guest first", "Whenever you feel ready"], a: 1 },
      { q: "If you are unsure about part of a guest's order, you should:", opts: ["Make your best guess to save time", "Ask the guest to clarify, it is better to confirm than make the wrong drink", "Ask a colleague to handle the order", "Serve the most common option"], a: 1 },
      { q: "Why should the bar surface always be kept clean during service?", opts: ["The manager will penalise you if it is dirty", "A messy bar communicates disorganisation to guests", "It helps drinks taste better", "It is only important at formal events"], a: 1 },
    ],
  },
  {
    id: 8,
    title: "Handling Busy Periods",
    subtitle: "Managing queues, prioritising orders, staying composed under pressure",
    duration: "20 min",
    slides: [
      { title: "Busy Periods Are Inevitable", type: "body", body: "Every bar will have its rush periods. Events, happy hours, post-dinner drinks, and halftime intervals create waves of simultaneous demand.\n\nHow you handle these periods defines your ability as a bar attendant. The worst thing you can do is panic, rush carelessly, or ignore guests. The best thing you can do is stay calm, work systematically, and communicate clearly." },
      { title: "Managing the Queue", type: "list", intro: "A controlled queue system prevents chaos and guest frustration:", items: ["Always serve guests in the order they arrived. First come, first served.", "If you cannot get to someone immediately, acknowledge them. Eye contact and a nod buys goodwill.", "Never skip a waiting guest to serve someone who just arrived, regardless of who they are.", "Group orders together where possible. Ask waiting guests nearby if they are ready to order.", "Call out drinks clearly as you place them on the bar so the correct guest collects them."] },
      { title: "Prioritising Efficiently", type: "two-col", left: { heading: "What to Do First", items: ["Acknowledge all waiting guests immediately", "Take orders in sequence, work systematically", "Prepare multiple drinks at once where possible", "Simple drinks first, complex orders next", "Keep moving, do not stop and chat during rush"] }, right: { heading: "What to Avoid", items: ["Do not panic, it causes mistakes", "Do not rush so fast that you spill or over-pour", "Do not ignore guests even when overwhelmed", "Do not let the bar become disorganised under pressure", "Do not forget to use your jigger because you are rushed"] } },
      { title: "Staying Composed", type: "highlight", points: [{ text: "Your energy behind the bar is visible to every guest. Panic is contagious. Calm confidence reassures guests that they will be served." }, { text: "If you are falling behind, communicate with your supervisor or a colleague. Call for backup early, not after you are already overwhelmed." }, { text: "Take one breath between orders if needed. A two-second reset prevents costly mistakes." }, { text: "After the rush, restock immediately. A depleted bar during the next wave is entirely preventable." }] },
      { title: "Communication During Busy Periods", type: "list", intro: "Clear communication prevents mistakes under pressure:", items: ["Call out orders loudly and clearly if working with a colleague behind the bar", "Confirm with colleagues who is serving which guests to avoid duplication", "If you run out of a product, communicate immediately to guests and management", "Never guess what a guest ordered during a rush. If unsure, ask again quickly.", "A brief apology for a wait goes a long way: 'Thank you for your patience, here is your order.'"] },
    ],
    questions: [
      { q: "What is the correct order in which to serve guests at a busy bar?", opts: ["Most important-looking guests first", "Regular customers first", "First come, first served, in the order they arrived", "Whoever calls out loudest first"], a: 2 },
      { q: "What should you do if you cannot get to a guest immediately?", opts: ["Ignore them until you are free", "Acknowledge them with eye contact and a nod", "Ask them to come back later", "Tell them to wait at a table"], a: 1 },
      { q: "What should you do if you are falling behind during a rush?", opts: ["Panic and speed up carelessly", "Ignore the queue and focus on current drinks", "Communicate with your supervisor or colleague early and call for backup", "Close the bar temporarily"], a: 2 },
      { q: "What should you do immediately after a rush period?", opts: ["Take a break, you have earned it", "Restock immediately to prepare for the next wave", "Clean the bar only", "Wait for the manager to tell you what to do"], a: 1 },
    ],
  },
  {
    id: 9,
    title: "Common Bar Mistakes",
    subtitle: "Incorrect pours, poor hygiene, wrong glassware, slow service",
    duration: "20 min",
    slides: [
      { title: "Learn from the Mistakes Others Make", type: "body", body: "The most effective way to become a great bar attendant quickly is to know exactly what separates average service from excellent service.\n\nMost bar mistakes are predictable and preventable. They are not caused by bad intentions. They are caused by rushing, poor preparation, or a lack of knowledge. This covers the most common mistakes and exactly how to avoid each one." },
      { title: "Mistakes That Cost You the Job", type: "list", intro: "These are the most common errors that damage your reputation:", items: ["Serving in the wrong glass: shows a lack of product knowledge", "Over-pouring or under-pouring spirits: costs the establishment money or disappoints guests", "Touching the rim or bowl of a glass: transfers bacteria and looks unhygienic", "Using your hands to scoop ice: a serious hygiene violation", "Leaving the bar disorganised during service: leads to slow, error-prone work", "Ignoring a waiting guest even briefly: the number one guest complaint", "Serving an intoxicated guest: a legal and ethical violation"] },
      { title: "Mistakes in Presentation", type: "two-col", left: { heading: "Drink Presentation Mistakes", items: ["Wrong garnish or no garnish when required", "Dirty or smudged glass", "Flat beer due to incorrect pour angle", "Ice not in the drink when ordered with ice", "Wrong mixer with the spirit ordered"] }, right: { heading: "What Great Presentation Looks Like", items: ["Correct glass, clean and polished", "Correct measure, confirmed with jigger", "Correct garnish on the rim or in the drink", "Served on a cocktail napkin or coaster", "Announced correctly as it is placed before the guest"] } },
      { title: "Hygiene Mistakes That Cannot Be Overlooked", type: "highlight", points: [{ text: "Wiping a glass with a dirty cloth and then serving it. Any cloth used more than once without washing must be replaced." }, { text: "Leaving garnishes uncovered or using garnishes from the previous shift. Fresh garnishes only." }, { text: "Handling your phone and then handling glassware without washing your hands." }, { text: "Using the same cloth to wipe the bar surface and then wipe a glass. These must always be separate cloths." }] },
      { title: "How to Correct a Mistake", type: "steps", intro: "Mistakes will happen. What matters is how you handle them:", steps: [{ number: "1", label: "Acknowledge it immediately", detail: "Do not try to hide a mistake. If you made the wrong drink, own it promptly." }, { number: "2", label: "Apologise sincerely", detail: "'I apologise for that, let me make you the correct drink right away.'" }, { number: "3", label: "Fix it quickly and correctly", detail: "Remake the drink to the correct standard. Do not rush the correction." }] },
    ],
    questions: [
      { q: "Serving a drink in the wrong glass communicates what to the guest?", opts: ["That the bar is busy", "A lack of product knowledge and attention to detail", "That the correct glass is being washed", "Nothing, guests do not notice glassware"], a: 1 },
      { q: "What is the most common guest complaint about bar service?", opts: ["Drinks being too strong", "Wrong garnish on a drink", "Being ignored even briefly while waiting", "The music being too loud"], a: 2 },
      { q: "A bar attendant makes the wrong drink for a guest. What should they do?", opts: ["Serve it anyway and hope the guest does not notice", "Blame the noise in the bar", "Acknowledge the mistake, apologise, and remake the drink correctly", "Charge the guest for both drinks"], a: 2 },
      { q: "Which hygiene mistake is considered a serious violation?", opts: ["Serving water without ice", "Using your bare hands to scoop ice", "Forgetting a garnish", "Running out of a mixer"], a: 1 },
    ],
  },
  {
    id: 10,
    title: "Qualities of a Great Bar Attendant",
    subtitle: "Speed, accuracy, presentation, product knowledge, attitude",
    duration: "15 min",
    slides: [
      { title: "What Separates Good from Great", type: "body", body: "The technical skills of bar service can be taught in a short time. What separates a good bar attendant from a great one is harder to teach, but essential to develop.\n\nIt is the combination of speed, accuracy, product knowledge, presentation, and attitude that creates a bar attendant who guests request by name, venues re-book without hesitation, and colleagues enjoy working with." },
      { title: "The Five Qualities of Excellence", type: "list", intro: "Develop these five qualities and you will always be in demand:", items: ["Speed: serve guests promptly without sacrificing accuracy or presentation. Speed comes from preparation, not rushing.", "Accuracy: every drink must match exactly what was ordered. No approximations.", "Presentation: every glass clean and polished, correct garnish, correct serve. First impressions of the drink matter.", "Product knowledge: know what you are serving. Be able to answer questions about beer, wine, and spirits confidently.", "Attitude: warm, professional, and calm at all times. Guests come back for how you made them feel, not just the drink."] },
      { title: "Building Your Reputation", type: "highlight", points: [{ text: "Your reputation in hospitality is built shift by shift. Venues and event companies remember bar attendants who were reliable, skilled, and professional." }, { text: "A recommendation from a satisfied client or manager is worth more than any qualification. Earn it consistently." }, { text: "Invest in your own product knowledge. Taste different wines, learn the spirits you serve, understand what goes into a great drink." }, { text: "Show up on time, in uniform, prepared, and ready to work. Reliability is one of the most valued qualities in hospitality staffing." }] },
      { title: "You Are Ready", type: "intro", body: "You have completed all ten chapters of Bar Service 101.\n\nYou now have the knowledge, standards, and mindset to work professionally behind a bar in any hospitality environment.\n\nComplete the final assessment to earn your official Certificate of Completion. You need 60% or more to pass.\n\nGood luck." },
    ],
    questions: [
      { q: "Which of the following is listed as one of the five qualities of a great bar attendant?", opts: ["Creativity", "Accuracy", "Seniority", "Physical strength"], a: 1 },
      { q: "Where does speed in bar service come from?", opts: ["Rushing through each drink", "Skipping garnishes to save time", "Preparation and organisation, not rushing", "Serving fewer guests"], a: 2 },
      { q: "Why do guests return to the same bar attendant?", opts: ["Because the drinks are free", "Because of how the bar attendant made them feel, not just the drink", "Because they are the only one working", "Because the manager instructs them to"], a: 1 },
      { q: "What is one of the most valued qualities in hospitality staffing?", opts: ["Working the fastest shifts", "Knowing the most cocktail recipes", "Reliability, showing up on time, prepared, and ready to work", "Never making any mistakes"], a: 2 },
    ],
  },
];

const FINAL_EXAM = [
  { q: "What is the primary goal of Bar Service 101?", opts: ["Learn cocktail recipes", "Prepare students for professional bar service in any hospitality environment", "Train students to manage a venue", "Teach bartending tricks"], a: 1 },
  { q: "Which tool is used to measure accurate spirit pours?", opts: ["Bar spoon", "Strainer", "Jigger", "Ice scoop"], a: 2 },
  { q: "How should ice be scooped behind the bar?", opts: ["With a clean glass", "With bare hands if they are clean", "With a designated ice scoop only", "With any available utensil"], a: 2 },
  { q: "Which glass is correct for draught beer?", opts: ["Rocks glass", "Champagne flute", "Highball glass", "Pint glass"], a: 3 },
  { q: "How should wine glasses be held?", opts: ["By the rim for a firm grip", "By the bowl to keep the wine warm", "By the stem to avoid warming the wine", "It does not matter"], a: 2 },
  { q: "What is the standard single spirit measure in South Africa?", opts: ["15ml", "25ml", "50ml", "35ml"], a: 1 },
  { q: "At what angle do you start pouring a draught beer?", opts: ["Straight upright", "At 45 degrees", "Completely horizontal", "At 30 degrees"], a: 1 },
  { q: "What should you do if a guest appears intoxicated?", opts: ["Continue serving until they ask you to stop", "Water down their drinks", "Stop service and notify your supervisor immediately", "Ask them politely to leave"], a: 2 },
  { q: "How quickly should a guest at the bar be acknowledged?", opts: ["Within 5 minutes", "When you are free", "Within 30 seconds", "Only when they call out"], a: 2 },
  { q: "What should you do before starting to prepare a drink?", opts: ["Start immediately", "Repeat the order back to confirm it", "Check with the manager", "Get the garnish ready first"], a: 1 },
  { q: "In what order should guests be served at a busy bar?", opts: ["Most important-looking guests first", "Regular customers first", "First come, first served", "Whoever calls loudest"], a: 2 },
  { q: "What should you do immediately after a rush period?", opts: ["Take a break", "Wait for instructions", "Restock immediately", "Clean the bar only"], a: 2 },
  { q: "Which beer style is dark, rich, and made from roasted malt?", opts: ["Lager", "Ale", "Cider", "Stout"], a: 3 },
  { q: "What does 'dry' mean when describing a wine?", opts: ["The wine was stored without water", "The wine has very little residual sugar", "The wine is very old", "The wine was made without grapes"], a: 1 },
  { q: "What should you do with cut garnishes at the end of service?", opts: ["Store in the fridge for tomorrow", "Cover and leave on the bar", "Dispose of them, do not store overnight", "Give to kitchen staff"], a: 2 },
  { q: "What does serving a drink in the wrong glass communicate?", opts: ["That the bar is busy", "That the correct glass is being washed", "A lack of product knowledge", "Nothing, guests do not notice"], a: 2 },
  { q: "What is the most common guest complaint at a bar?", opts: ["Drinks too strong", "Wrong garnish", "Being ignored while waiting", "Music too loud"], a: 2 },
  { q: "A cracked glass should be:", opts: ["Used for soft drinks only", "Placed at the back of the shelf", "Discarded immediately", "Returned to the supplier"], a: 2 },
  { q: "Why should the bar surface always be kept clean during service?", opts: ["The manager will penalise you", "It helps drinks taste better", "A messy bar communicates disorganisation to guests", "It is only important at formal events"], a: 2 },
  { q: "What separates a great bar attendant from a good one?", opts: ["Knowing more cocktail recipes", "The combination of speed, accuracy, presentation, product knowledge, and attitude", "Working more shifts", "Serving more guests per hour"], a: 1 },
];

function genDocs(firstName, lastName, score, total, date) {
  const pct = Math.round((score / total) * 100);
  const grade = pct >= 90 ? "outstanding" : pct >= 75 ? "excellent" : "solid";
  const remarks = `${firstName} ${lastName} has successfully completed the Bar Service 101 Professional Hospitality course, achieving a ${grade} score of ${pct}% in the final assessment. This result demonstrates a sound understanding of bar setup, beverage knowledge, pour standards, hygiene, and professional guest interaction, and reflects readiness to deliver quality bar service in any hospitality environment.`;
  const achievement = `In completing this programme, they have shown a thorough understanding of professional bar service, beverage knowledge, pour standards and glassware handling, bar hygiene, responsible service of alcohol, and guest interaction, as assessed by the Sinotheni Events Training Academy.`;
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
  const lines = [`SINOTHENI EVENTS TRAINING ACADEMY`, `Bar Service 101`, `Chapter ${chapter.id}: ${chapter.title}`, `${chapter.subtitle}`, ``, `─────────────────────────────────────────────`, ``];
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
  a.download = `BarService101_Chapter${chapter.id}.txt`;
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
  if (!_unlocked) {
    return <LockScreen courseId={COURSE_ID} courseTitle={COURSE_TITLE} courseType={COURSE_TYPE} coursePrice={COURSE_PRICE} onUnlock={async data => {
      _setUnlocked(data);
      // Load saved progress from Supabase
      const saved = await loadProgress(data.code, COURSE_ID);
      if (saved) {
        if (saved.completedChapters) setCompletedChapters(new Set(saved.completedChapters));
        if (saved.currentChapter !== undefined) setCurrentChapter(saved.currentChapter);
        if (saved.screen) setScreen(saved.screen === 'exam' ? 'dashboard' : saved.screen);
      }
    }} />;
  }

  // Student is unlocked, pre-fill profile if not set
  // (profile name will be pre-populated from the access code)
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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed Bar Service 101 with a score of ${pct}% in the final assessment. Throughout the programme, ${profile.firstName} completed the programme demonstrating solid knowledge of professional bar operations, beverage service, responsible alcohol service and the guest-facing standards expected in South African hospitality environments.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.0,marginBottom:4}}>Bar Service 101</div>
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
      <div style={{textAlign:"center",marginBottom:22}}><div style={S.title}>{finalScore.passed?"Congratulations!":"Not Quite Yet"}</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Bar Service 101</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:20}}>{[["SCORE",`${finalScore.score}/${finalScore.total}`],["PERCENTAGE",`${finalScore.pct}%`],["RESULT",finalScore.passed?"PASS":"FAIL"]].map(([k,v],i)=>(<div key={i} style={{background:CR,padding:"14px",borderRadius:7,textAlign:"center",borderTop:`3px solid ${i===2?(finalScore.passed?"#2d7a45":"#c0392b"):G}`}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:4}}>{k}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:27,fontWeight:700,color:i===2?(finalScore.passed?"#2d7a45":"#c0392b"):BK}}>{v}</div></div>))}</div>
      {finalScore.passed?(<div><div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#2d7a45",lineHeight:1.8}}>Congratulations, {profile.firstName}! Your certificate will be issued to <strong>{profile.firstName} {profile.lastName}</strong>.</div><button onClick={generateDocs} style={S.btn(true,true)}>GET MY CERTIFICATE AND TRANSCRIPT</button></div>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.8}}>You scored {finalScore.pct}%. You need 60% to pass.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setScreen("dashboard")} style={{...S.btn(false),flex:1}}>REVIEW MODULES</button><button onClick={()=>startQuiz("final")} style={{...S.btn(true),flex:1}}>RETRY EXAM</button></div></div>)}
    </div></div></div>);
  }

  if(screen==="docs"){
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{profile.firstName} {profile.lastName} · Bar Service 101</div></div>
      {docs&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,docs.date,docs.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(`${profile.firstName} ${profile.lastName}`,docs.date,docs.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>)}
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the print dialog opens, select <strong>Save as PDF</strong> as the destination.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
