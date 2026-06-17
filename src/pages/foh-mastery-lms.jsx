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
const STORE_KEY = "se_foh101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "foh101";
const COURSE_TITLE = "Front of House Mastery";
const COURSE_TYPE = "SKILLS PROGRAMME";
const COURSE_PRICE = 1250;

const MODULE_NAMES = ["Introduction to Front of House Excellence", "Professional Appearance and FOH Standards", "Guest Reception and First Impressions", "Guest Flow, Seating and Crowd Management", "VIP and VVIP Handling and Escort Protocol", "Five-Star Hospitality and Luxury Service Standards", "Event Formality, Protocol and Diplomatic Etiquette", "Conflict Resolution: The CALM Framework", "Communication and Team Coordination", "Event Safety and Emergency Awareness", "FOH Leadership and Career Development"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Front of House Excellence", "subtitle": "Responsibilities, expectations and the difference between FOH and BOH", "duration": "35 min", "slides": [{"title": "Welcome to Front of House Mastery", "type": "intro", "body": "The front of house is every area of an event or venue where guests are present and being served. It is the reception desk, the dining floor, the cocktail area, the ceremony space, the registration point \u2014 anywhere a guest is standing or seated and someone is there to receive them.\n\nFront of House Mastery prepares you for the highest standard of FOH performance across hospitality venues, corporate events, government functions and formal occasions. Eleven modules. The full professional framework."}, {"title": "FOH vs BOH: The Complete Picture", "type": "two-col", "left": {"heading": "FRONT OF HOUSE (FOH)", "items": ["Every area accessible to guests", "Reception, dining room, cocktail spaces", "Registration, welcome and escort areas", "All service that guests directly experience", "Your appearance and conduct are constantly visible", "Guest experience is your primary responsibility"]}, "right": {"heading": "BACK OF HOUSE (BOH)", "items": ["All non-guest-facing areas", "Kitchen, prep areas, storage, admin", "Technical, staging and supplier areas", "All preparation that supports FOH delivery", "BOH professionals support what guests experience", "Communication with FOH is essential to event quality"]}}, {"title": "FOH Responsibilities at a Professional Event", "type": "list", "intro": "The FOH professional is responsible for the complete guest-facing operation:", "items": ["Guest reception: welcoming, registering and orienting every guest from the moment they arrive", "Seating and floor management: directing guests, managing covers and maintaining the floor plan", "Service delivery: food and beverage service executed to the prescribed standard", "Guest interaction: every question answered, every request managed, every complaint handled", "VIP management: identifying and serving distinguished guests at the elevated standard they require", "Team coordination: communicating with the BOH, event management and technical teams to ensure a seamless event"]}, {"title": "The FOH Standard", "type": "highlight", "points": [{"text": "FOH professionals are visible every moment of the event. There is no 'off' \u2014 no moment where your conduct and appearance are not being observed by guests, clients or event management."}, {"text": "Your section is your responsibility. Every table, every glass, every guest in your designated area is within your professional accountability."}, {"text": "The standard is set before the first guest arrives. A FOH professional who is not fully prepared \u2014 in appearance, knowledge and position \u2014 before the event opens has already failed."}, {"text": "Excellence in FOH is not about performing. It is about being genuinely present, genuinely attentive, and genuinely committed to the guest experience in front of you."}]}], "questions": [{"q": "Which areas of an event constitute the 'front of house'?", "opts": ["Only the dining room and bar service areas", "All areas accessible to and experienced by guests", "The registration desk and entrance only", "Any area staffed by uniformed event personnel"], "a": 1}, {"q": "What is the FOH professional's primary responsibility?", "opts": ["Supporting the kitchen and BOH team during busy service periods", "The complete guest-facing operation \u2014 reception, service, interaction and experience", "Managing the event programme and coordinating the MC and technical team", "Coordinating supplier logistics and venue setup"], "a": 1}, {"q": "When does the FOH professional's standard of conduct apply?", "opts": ["During the service periods only \u2014 setup and breakdown are informal", "Throughout the event but not during team briefings", "Every moment the professional is visible in the guest environment", "From guest arrival to first departure"], "a": 2}, {"q": "What distinguishes FOH from BOH in an event environment?", "opts": ["FOH is paid more because the work is more visible and demanding", "FOH professionals deal with guests; BOH professionals support the experience guests receive", "FOH manages the event programme; BOH manages the physical setup", "FOH staff are employed by the venue; BOH by the caterer"], "a": 1}]}, {"id": 2, "title": "Professional Appearance and FOH Standards", "subtitle": "Grooming, dress code, posture and brand representation at events", "duration": "30 min", "slides": [{"title": "FOH Appearance Is a Client Brand Standard", "type": "body", "body": "When you stand at the welcome desk of a corporate function or escort a guest to their table at a formal gala, you are not representing yourself \u2014 you are representing the client's brand, the venue's standard and Sinotheni Events' professional reputation simultaneously.\n\nFOH appearance at this level goes beyond a clean uniform. It encompasses posture, movement, facial expression and the subtle details that communicate the quality of the event to every guest who encounters you."}, {"title": "Uniform and Dress Standards", "type": "list", "intro": "The FOH uniform must be immaculate and correctly worn at all times:", "items": ["Uniform clean, pressed and complete \u2014 every item, every shift, without exception", "Name badge straight, at chest height, facing forward and clearly legible", "Shoes black, closed-toe, non-slip, polished \u2014 not merely clean but visually maintained", "Hair secured and professionally styled \u2014 not simply tied back, but presented", "No personal jewellery below the wrist \u2014 watches and earrings are generally acceptable within reasonable limits", "Female staff: natural, professional makeup; nails neat and presentable", "All staff: fresh, subtle scent \u2014 never competing with the dining environment"]}, {"title": "Posture and Presence", "type": "highlight", "points": [{"text": "Stand with weight evenly distributed, shoulders back and head up. This is not formality for its own sake \u2014 it communicates attentiveness, confidence and professionalism to every guest who sees you."}, {"text": "Move with controlled purpose. Walking quickly through a crowded event space without awareness of your surroundings creates collisions, spills and an impression of chaos."}, {"text": "Hands at the sides or one hand resting at the front \u2014 never crossed, never in pockets, never behind the back in a way that communicates disengagement."}, {"text": "Your facial expression is always communicating. A neutral, warm expression communicates availability and care. A distracted or closed expression tells guests you are elsewhere."}]}, {"title": "Brand Representation", "type": "body", "body": "Many events at which Sinotheni Events deploys staff are client-branded \u2014 corporate dinners, product launches, government functions, award ceremonies. The appearance of the FOH team becomes, in the guest's mind, the appearance of the client's brand.\n\nThis elevates the responsibility. A guest who observes a poorly presented FOH team at a corporate event forms a view about the company running the event. A guest who observes a sharp, professional team forms the opposite view. Understand that your appearance is not personal \u2014 it is part of the event's brand delivery."}], "questions": [{"q": "Why is FOH appearance described as a 'client brand standard' rather than just a personal standard?", "opts": ["Clients set specific dress codes that take precedence over individual preferences", "The FOH team's appearance shapes the guest's perception of the client's brand at the event", "FOH team members are required to wear client-branded uniforms at all events", "Clients review appearance standards as part of the event post-mortem"], "a": 1}, {"q": "What does professionally controlled movement communicate to guests?", "opts": ["That the team is working efficiently and productively", "Attentiveness, confidence and a professional standard of service", "That the team has been formally trained in event movement protocols", "That the event is running to schedule and within management's control"], "a": 1}, {"q": "Why is strong fragrance inappropriate in a FOH dining environment?", "opts": ["It creates a health hazard for guests with fragrance sensitivity", "Strong fragrance competes with food aromas and affects the dining experience", "Regulations in the hospitality industry restrict fragrance during food service", "It draws attention to the staff member rather than the food and event"], "a": 1}, {"q": "What does a FOH professional represent when they are on duty at a client event?", "opts": ["Themselves, as an independent professional contracted for the event", "Sinotheni Events, the client's brand, and the venue's standard simultaneously", "The hospitality industry's collective professional standards", "The event manager who briefed them for the specific assignment"], "a": 2}]}, {"id": 3, "title": "Guest Reception and First Impressions", "subtitle": "Welcome protocols, registration, name badge management and first contact", "duration": "35 min", "slides": [{"title": "First Impressions Are Final Impressions", "type": "body", "body": "Research consistently shows that guests form a lasting impression of an event within the first 90 seconds of arrival. The welcome they receive at the entrance, the efficiency of the registration process, the warmth and confidence of the first staff member they encounter \u2014 these moments set the tone for everything that follows.\n\nAn event that begins with a long queue, a confused registration process and an indifferent greeter begins at a deficit that is difficult to recover. An event that begins with a smooth arrival, an immediate warm welcome and an efficient, professional registration begins with the guest already well-disposed to everything that follows."}, {"title": "Welcome Protocol", "type": "steps", "intro": "Apply this sequence to every arriving guest:", "steps": [{"number": "1", "label": "Acknowledge immediately", "detail": "Every guest is acknowledged within 30 seconds of entering the reception area \u2014 even during a busy arrival period. A wave, direct eye contact and 'Good evening, welcome \u2014 I'll be with you in just one moment' is enough if you are occupied."}, {"number": "2", "label": "Greet and register", "detail": "'Good evening, welcome to [event name]. May I have your name please?' Check the register clearly and efficiently. Do not fumble, scroll slowly or show uncertainty. Confidence is reassuring."}, {"number": "3", "label": "Direct or escort", "detail": "For large events, direct clearly: 'The cocktail reception is through the doors on your left.' For VIP guests or intimate events, escort personally and introduce if appropriate."}]}, {"title": "Registration Management", "type": "list", "intro": "A professional registration process leaves every guest feeling expected and welcomed:", "items": ["Alphabetical register clearly visible and accessible \u2014 no searching through pages", "Mark off each arrival immediately and clearly \u2014 a confident tick is reassuring", "Know the registration list: VIPs, keynote guests, dietary requirements and any flagged guests", "If a guest is not on the register, do not say 'you're not on the list' \u2014 say 'let me check this for you' and escalate calmly", "Name badges: double-check names before handing to the guest \u2014 errors in name badges at formal events are noticed", "Pronounce names correctly: if uncertain, ask \u2014 'I want to make sure I pronounce your name correctly'"]}, {"title": "The Tone of the First Contact", "type": "highlight", "points": [{"text": "'Welcome' is not a word \u2014 it is a feeling. A guest who hears 'welcome' while being looked at directly, greeted with a genuine expression and registered efficiently feels it."}, {"text": "Be warm, not familiar. Professional warmth is friendly and genuine. Over-familiarity \u2014 calling every guest 'my friend' or 'love' \u2014 is inappropriate at formal events."}, {"text": "Manage queues actively. If guests are waiting, acknowledge them: 'I'll be with you in just a moment \u2014 thank you for your patience.' Silence in a queue creates anxiety."}, {"text": "End every arrival interaction with a clear, positive direction: 'Enjoy the evening.' 'The bar is straight through.' 'Your table number is fourteen \u2014 I hope you enjoy the event.'"}]}], "questions": [{"q": "Within how many seconds should an arriving guest be acknowledged?", "opts": ["60 seconds", "30 seconds \u2014 even a brief acknowledgement if occupied", "After completing the current registration", "When they approach the registration desk directly"], "a": 1}, {"q": "What is the correct response when an arriving guest is not on the event register?", "opts": ["Inform the guest clearly that they are not on the list and ask for their invitation", "Say 'let me check this for you' and escalate calmly \u2014 never 'you're not on the list'", "Ask the guest to wait while you contact the event organiser", "Admit the guest and flag the issue with management after the event"], "a": 1}, {"q": "Why is pronouncing a guest's name correctly important at a formal event?", "opts": ["An incorrect pronunciation may cause a guest to be confused about their own registration", "Guests at formal events expect their names to be known and used correctly \u2014 it signals preparation", "Name pronunciation is required as part of formal event protocol", "Incorrect pronunciation is seen as poor registration management by clients"], "a": 1}, {"q": "How should queues at a registration desk be actively managed?", "opts": ["Allow guests to queue without interruption so the registration process is completed quickly", "Acknowledge waiting guests verbally \u2014 'I'll be with you in just a moment, thank you for your patience'", "Direct queuing guests to a seating area until the registration desk is clear", "Ask a colleague to manage the queue while the registering staff member focuses on each guest fully"], "a": 1}]}, {"id": 4, "title": "Guest Flow, Seating and Crowd Management", "subtitle": "Floor plans, table assignments, managing changes and directing guest movement", "duration": "35 min", "slides": [{"title": "The Flow of an Event Is Managed, Not Accidental", "type": "body", "body": "Every large event has a guest flow \u2014 the way guests move through the space from arrival to departure. When the flow is well-managed, the event feels effortless and comfortable. When it breaks down \u2014 bottlenecks at entrances, confusion about seating, guests wandering without direction \u2014 the quality of the event deteriorates regardless of the food, d\u00e9cor or programme.\n\nThe FOH professional is an active manager of guest flow. You are not a passive direction-giver \u2014 you are someone who anticipates where guests will move, prepares the space and the team accordingly, and manages the flow in real time."}, {"title": "Reading the Floor Plan", "type": "list", "intro": "Every FOH professional must be fluent in the event floor plan before doors open:", "items": ["Know every table number and its location \u2014 guests should never have to wait while you search for their table", "Know the seating plan: reserved tables, VIP positions, accessibility seating, client preferences", "Know the flow routes: ceremony to cocktail, cocktail to reception \u2014 how guests will move and where", "Know the exits and emergency routes \u2014 not just for safety, but for flow management", "Know the capacity of every area \u2014 when an area is at capacity, you manage access actively", "Know where every service station, bar and bathroom is \u2014 you will be asked constantly"]}, {"title": "Managing Seating Changes", "type": "steps", "intro": "Changes to the seating plan \u2014 guests who have not arrived, last-minute additions, table swaps \u2014 are managed with this approach:", "steps": [{"number": "1", "label": "Receive the change early", "detail": "Monitor for late changes in the 30 minutes before guests arrive. A change communicated at the door is harder to manage than one managed before guests enter."}, {"number": "2", "label": "Update the record and brief the team", "detail": "Change the register, update the table assignment, and communicate to the relevant waiter or table host immediately. One person knowing about a change is not the same as the change being managed."}, {"number": "3", "label": "Manage the guest personally", "detail": "Any guest affected by a seating change should be escorted personally to their revised table with a brief, warm explanation. Do not point and direct \u2014 escort and settle."}]}, {"title": "Crowd Flow Management", "type": "highlight", "points": [{"text": "Bottlenecks form where the flow has not been prepared: narrow doorways, single-lane registration desks, bars positioned at the only route through a space. Identify and address these before guests arrive."}, {"text": "Position staff at every transition point: entrance to cocktail area, cocktail to reception, ceremony to canap\u00e9s. A staff member at each transition actively directs \u2014 they are not decoration."}, {"text": "When a space is at capacity, manage access politely and confidently: 'We're just managing numbers through the doors \u2014 it will only be a moment.' Never leave guests standing without communication."}, {"text": "The end of the event is as important as the beginning. Manage the departure: active farewell, direction to transport, prevention of crowd build-up at the exit."}]}], "questions": [{"q": "Why must a FOH professional know every table number before the event opens?", "opts": ["Table numbers are tested by clients during quality audits before events", "Guests should never have to wait while the FOH professional searches for their table", "Table number knowledge is required for the event management software to function", "Knowing table numbers allows the FOH professional to manage the seating plan independently"], "a": 1}, {"q": "When a seating change affects a guest, how should it be managed?", "opts": ["Update the register and direct the guest to their new table when they arrive", "Escort the guest personally to their revised table with a warm, brief explanation", "Inform the guest by message or at registration so they know before they sit down", "Allow the relevant waiter to manage the change when the guest reaches their section"], "a": 1}, {"q": "Where should FOH staff be positioned during major transitions in an event?", "opts": ["At the main bar where the highest concentration of guests will gather", "At every transition point \u2014 entrance to cocktail, cocktail to reception, ceremony to canap\u00e9s", "At the event manager's position to receive instructions in real time", "Evenly distributed across the venue space to cover all guest areas"], "a": 1}, {"q": "How should a FOH professional manage a guest when a space is at capacity?", "opts": ["Ask the guest to wait outside until the space is under capacity", "Politely explain the situation and communicate that it will be a brief wait", "Allow the guest through and manage the overcapacity issue with management later", "Redirect the guest to a different area of the event"], "a": 1}]}, {"id": 5, "title": "VIP and VVIP Handling and Escort Protocol", "subtitle": "Identifying VIPs, escorting procedures, seating priority and discretion", "duration": "35 min", "slides": [{"title": "VIP Handling Is a Specialised Skill", "type": "body", "body": "Very Important Persons and Very Very Important Persons at an event include government officials, executives, celebrities, principal guests of the host organisation and any individual specifically flagged in the event brief as requiring elevated attention.\n\nVIP handling requires a specific skill set: the ability to identify and acknowledge these guests with appropriate priority, to escort and manage them with discretion, to anticipate their needs without intruding, and to manage the attention of other guests around them professionally. This module covers the full protocol."}, {"title": "The VIP Brief", "type": "list", "intro": "Every VIP at an event must be known to the FOH team before arrival:", "items": ["Obtain the VIP list from the event manager at the pre-event briefing", "Know the name and face of every flagged VIP \u2014 do not rely on others to identify them for you", "Know the seating assignment, escort route and any specific preferences or requirements", "Know who is meeting and greeting each VIP \u2014 this is typically a specific team member or the client themselves", "Know the order of precedence at government and corporate events \u2014 who is most senior matters", "Flag in your register which arrivals are VIP so they can be prioritised immediately on arrival"]}, {"title": "Escort Protocol", "type": "steps", "intro": "Escorting a VIP guest follows a precise and consistent sequence:", "steps": [{"number": "1", "label": "Welcome and position", "detail": "Welcome the VIP by name. 'Good evening Minister Dlamini, welcome. My name is [name], I will escort you this evening.' Position yourself at their right side, slightly ahead \u2014 you are leading, not following."}, {"number": "2", "label": "Lead clearly and deliberately", "detail": "Move at a pace appropriate to the guest \u2014 not too fast, not too slow. Announce your route naturally: 'We'll proceed through here to the reception hall.' Manage any crowd that is in the route."}, {"number": "3", "label": "Seat and settle", "detail": "Bring the guest to their exact seat. Pull the chair if the occasion requires it. Ensure they are settled comfortably before leaving. Brief the table's waiter that the VIP has arrived."}]}, {"title": "Discretion in VIP Management", "type": "highlight", "points": [{"text": "Never discuss a VIP guest's presence, movements or personal details with other guests, staff members or publicly. What you observe in your professional capacity stays in your professional capacity."}, {"text": "Do not stare, photograph or point at VIP guests. Treat their presence with exactly the same composure with which you treat every other guest \u2014 just with greater care and priority."}, {"text": "If a VIP guest is approached by another guest or the media in a way that seems unwelcome, position yourself between them and the situation and manage it with a quiet, confident intervention."}, {"text": "VIPs have personal staff, security or assistants. Know who they are and defer to their guidance \u2014 but remain available and attentive throughout the event."}]}], "questions": [{"q": "When should a FOH professional identify VIP guests from the event brief?", "opts": ["When VIPs arrive and the event manager points them out", "At the pre-event briefing \u2014 names, faces, seating and escort protocol must be known before arrival", "When the VIP list is confirmed, usually one hour before doors open", "When VIPs arrive early and can be identified before the main guest arrival period"], "a": 1}, {"q": "Where does the escort position themselves when leading a VIP to their seat?", "opts": ["Behind the guest, at a respectful distance", "Beside the guest on their left side, matching their pace", "At the guest's right side, slightly ahead \u2014 leading, not following", "In front of the guest at a significant distance to clear the path"], "a": 2}, {"q": "What is the correct response when another guest approaches a VIP in a way that seems unwelcome?", "opts": ["Alert the event manager and wait for instructions", "Intervene quietly by positioning between the situation and the VIP and managing it with composure", "Ask the approaching guest to return to their seat and explain the protocol", "Inform the VIP's personal security or assistant and step back"], "a": 1}, {"q": "What does discretion in VIP management require?", "opts": ["Sharing VIP information only with the immediate FOH team for service coordination", "Never discussing a VIP's presence, movements or personal details publicly or with other guests", "Confirming VIP identity with other staff members before providing elevated service", "Keeping VIP guest information documented for post-event reporting"], "a": 1}]}, {"id": 6, "title": "Five-Star Hospitality and Luxury Service Standards", "subtitle": "Exceeding expectations, anticipating needs and delivering luxury service", "duration": "35 min", "slides": [{"title": "What Five-Star Service Actually Means", "type": "body", "body": "Five-star service is not about the number of knives on the table or the price of the venue. It is a standard of attention, anticipation and care that makes a guest feel \u2014 genuinely and without conscious awareness \u2014 that every detail of their experience was considered and prepared.\n\nAt the highest events in South Africa \u2014 state dinners, corporate gala evenings, high-profile weddings \u2014 the service standard is set not by rules but by the consistent application of genuine attentiveness. This module covers the principles and the specific standards that define luxury service delivery."}, {"title": "The Standards of Luxury Service", "type": "list", "intro": "Five-star FOH delivery requires these specific standards:", "items": ["Every guest addressed by name from their third interaction onwards \u2014 learn names from the register", "No request answered with 'I don't know' \u2014 'I will find out immediately' is always the correct answer", "Every problem solved before the guest has to ask twice \u2014 anticipate and act", "Waits of any kind are communicated proactively and with a timeframe: 'Your table will be ready in approximately five minutes'", "Tables are reset between courses without the guest noticing the mechanics of service", "Water, bread and beverages are managed without the guest's glass or plate ever appearing empty or forgotten"]}, {"title": "Anticipating Needs", "type": "highlight", "points": [{"text": "Anticipation is learned by paying attention. A guest who has just finished their third glass of water will need a fourth. A guest who has glanced at the door twice may need directions. A guest looking around the room while others are seated may be looking for you."}, {"text": "At five-star events, the guest should never be in the position of looking for a staff member. A professional FOH team is visible and available before the need arises."}, {"text": "Anticipate the end of each course. When guests at a table begin to slow their eating \u2014 conversation increasing, food being pushed \u2014 the next transition is approaching. Prepare."}, {"text": "Special needs flagged in the brief \u2014 accessibility requirements, dietary needs, medical conditions \u2014 are anticipated and prepared for before arrival, not discovered on the day."}]}, {"title": "When Things Go Wrong at a Five-Star Level", "type": "body", "body": "At five-star events, problems are inevitable. The kitchen runs late. A VIP's seating preference was not communicated. A guest's dietary requirement was misrecorded. The five-star standard is not the absence of these problems \u2014 it is the quality of the response when they occur.\n\nAt this level, the guest should not experience the problem \u2014 they should experience the solution. A mistake handled with genuine professionalism, speed and grace is often remembered more positively than an event where nothing went wrong. The service is the standard, not the absence of difficulty."}], "questions": [{"q": "What defines five-star service above all else?", "opts": ["The price and prestige of the venue and event", "The consistent application of genuine attentiveness and anticipation of needs", "The formal training qualifications of the service team", "The number of service staff deployed relative to the guest count"], "a": 1}, {"q": "What is the correct response when a FOH professional does not know the answer to a guest's question?", "opts": ["Provide the best answer available based on their knowledge", "'I don't know' \u2014 honesty is always the best policy", "'I will find out immediately' \u2014 and then find out", "Refer the guest to the event manager who will have accurate information"], "a": 2}, {"q": "At what point should a guest's water glass ideally be refilled?", "opts": ["When the guest asks for a refill or signals they would like more", "When the glass is completely empty and the guest has waited", "Before the guest notices the glass is low \u2014 proactively, without being asked", "At fixed intervals during service regardless of individual guest consumption"], "a": 2}, {"q": "How is a problem handled at a five-star standard?", "opts": ["By preventing it from occurring through rigorous pre-event planning", "With speed and composure so the guest experiences the solution, not the problem", "By informing the guest proactively that a problem has occurred before they notice", "By escalating immediately to management so a senior person manages the response"], "a": 1}]}, {"id": 7, "title": "Event Formality, Protocol and Diplomatic Etiquette", "subtitle": "Corporate etiquette, government functions and formal dining protocols", "duration": "35 min", "slides": [{"title": "Formality Is a Language", "type": "body", "body": "Every event has a level of formality, and that formality has a protocol \u2014 a set of conventions about how people are addressed, how they are seated, how they are served, and how the event is conducted. At corporate events, government functions and formal dinners, these conventions are not optional preferences. They are expectations.\n\nA FOH professional who understands formal protocol communicates competence and reliability to clients and guests who operate in formal environments. One who does not is visibly out of place."}, {"title": "Order of Precedence at Formal Events", "type": "list", "intro": "Order of precedence governs who is greeted, seated and served first:", "items": ["Government functions: rank is determined by protocol \u2014 Cabinet Ministers outrank Deputy Ministers, Members of Parliament outrank general guests", "Corporate functions: the host organisation's most senior executive is the principal guest; board members and executives take precedence over general delegates", "Weddings: the bridal couple are the principal guests; their immediate families take precedence in reception and seating", "Always defer to the event brief \u2014 client-specific precedence lists are provided for formal events", "When uncertain: senior age and seniority of role are the general guides", "Never assume precedence based on appearance \u2014 a guest in casual dress may be the most senior person in the room"]}, {"title": "Forms of Address at Formal Events", "type": "highlight", "points": [{"text": "Government officials: 'Minister [Surname]', 'Deputy Minister [Surname]', 'Director-General [Surname]'. Never use first names unless specifically invited to."}, {"text": "Ambassadors and High Commissioners: 'Your Excellency' on first address, 'Ambassador [Surname]' thereafter."}, {"text": "Traditional leaders: 'Your Highness' or 'Chief [Name]' \u2014 confirm the correct form of address from the event brief for any traditional leadership guests."}, {"text": "When in doubt: 'Sir' and 'Ma'am' are always appropriate and never offensive. They signal respect when you are uncertain of the correct title."}]}, {"title": "Formal Dining Protocol", "type": "steps", "intro": "At a formal seated dinner, the service sequence follows specific protocol:", "steps": [{"number": "1", "label": "The host or principal guest is served last", "detail": "Service begins with guests furthest from the host and proceeds inward, or follows the precedence list. The host is always served last \u2014 this is a mark of respect that is observed in formal settings."}, {"number": "2", "label": "Wine service follows precedence", "detail": "Wine is presented and tasted by the most senior guest at the table, or the host if a private function. Approval is sought before pouring for the table."}, {"number": "3", "label": "Toasts and speeches create pauses", "detail": "Service pauses during toasts and formal speeches. Glasses must be filled before a toast. No clearing or service occurs while the principal speaker is at the podium."}]}], "questions": [{"q": "At a government function, who takes precedence in greeting and seating?", "opts": ["The guest who arrives first, regardless of rank", "Protocol-determined rank \u2014 Cabinet Ministers above Deputy Ministers, above general guests", "The event host organisation's most senior representative", "The oldest guest present, as a mark of respect in South African culture"], "a": 1}, {"q": "What is the correct form of address for a government minister at a formal function?", "opts": ["'Good evening sir/ma'am' \u2014 formal titles create distance at modern events", "'Minister [Surname]' \u2014 first names are not used unless specifically invited", "'Minister [First Name]' \u2014 South African protocol permits a friendly first-name approach", "'The Honourable [Full Name]' \u2014 formal functions require the full honorific"], "a": 1}, {"q": "What should a FOH professional do when they are uncertain of a guest's formal title?", "opts": ["Use 'sir' or 'ma'am' \u2014 always appropriate and never offensive when uncertain", "Ask a colleague in front of the guest to confirm the correct title", "Check the registration list for the guest's title before greeting them", "Avoid using a direct form of address until the title can be confirmed"], "a": 0}, {"q": "When does service pause during a formal seated dinner?", "opts": ["When the event manager instructs the service team to hold", "During toasts and formal speeches \u2014 glasses must be filled before the toast", "When the kitchen signals that a course is not ready", "During the principal guest's arrival and welcome to the room"], "a": 1}]}, {"id": 8, "title": "Conflict Resolution: The CALM Framework", "subtitle": "Quick decisions, real-time scenarios and staying composed under pressure", "duration": "35 min", "slides": [{"title": "Conflict Is Part of the FOH Reality", "type": "body", "body": "At any event involving guests, alcohol, seating plans, late arrivals and competing expectations, conflict will arise. A guest who is unhappy with their seating. Two guests who have a history. A VIP whose arrival has not been prepared for. A guest who has had too much to drink.\n\nThe CALM framework gives FOH professionals a consistent, professional tool for managing these moments. The goal is not to eliminate conflict \u2014 it is to prevent escalation, protect the guest experience and protect the client's event."}, {"title": "The CALM Framework", "type": "steps", "intro": "Apply CALM consistently to every conflict situation:", "steps": [{"number": "C", "label": "Control the environment", "detail": "Move the situation out of the general guest area if possible. A disagreement handled in the middle of a reception floor is visible to every guest. An issue managed in a corner, a hallway or a quiet space is contained."}, {"number": "A", "label": "Acknowledge the guest's experience", "detail": "'I can see this is frustrating, and I understand.' Acknowledgement is not agreement \u2014 it is recognition of the guest's emotional state. A guest who feels heard de-escalates more quickly than one who feels dismissed."}, {"number": "L", "label": "Lead to a solution", "detail": "'Here is what I am going to do right now.' State the action clearly and specifically. Vague promises \u2014 'we'll look into it' \u2014 do not resolve conflict. Specific, immediate actions do."}, {"number": "M", "label": "Monitor and follow up", "detail": "Once the immediate situation is resolved, monitor the guest for the remainder of the event. A guest whose situation was managed professionally but who is then ignored may re-escalate. Follow up personally."}]}, {"title": "Common FOH Conflict Scenarios", "type": "list", "intro": "These are the most frequent conflict situations in FOH management:", "items": ["Seating dissatisfaction: guest unhappy with table position \u2014 escalate to seating coordinator immediately, do not argue", "Queue frustration: long registration queue \u2014 acknowledge waiting guests, give timeframes, escalate to add staff", "Intoxicated guest: manage with calm, non-confrontational firmness \u2014 remove from the area, involve security if required", "Uninvited guest: 'Let me check the list and speak to the event manager' \u2014 never a public confrontation", "VIP protocol not followed: manage the guest's immediate need, brief the event manager privately", "Dietary complaint at table: apologise, involve the waiter and kitchen, manage the resolution personally"]}, {"title": "Staying Composed Under Pressure", "type": "highlight", "points": [{"text": "Your composure during conflict is your most powerful professional tool. A calm FOH professional de-escalates most situations through tone and presence alone."}, {"text": "Lower your voice slightly when responding to an escalating guest. Volume matching escalates conflict; volume reduction de-escalates it."}, {"text": "Never argue. Even when the guest is factually wrong, your goal is resolution, not correction. 'Let me see what I can do for you right now' is always more effective than 'actually, the policy is...'"}, {"text": "After managing a significant conflict, brief the event manager immediately \u2014 even if the situation is resolved. Management needs to know what happened on their floor."}]}], "questions": [{"q": "What is the first step of the CALM framework?", "opts": ["Acknowledge the guest's feelings before attempting resolution", "Control the environment \u2014 move the situation away from the general guest area", "Listen to the full complaint before taking any action", "Lead with a clear and immediate solution to demonstrate competence"], "a": 1}, {"q": "What does 'acknowledgement' mean in the CALM framework?", "opts": ["Agreeing that the guest is correct and the event team was at fault", "Formally apologising on behalf of the event management team", "Recognising the guest's emotional state \u2014 'I can see this is frustrating' \u2014 without necessarily agreeing", "Recording the guest's complaint for the post-event debrief"], "a": 2}, {"q": "Why does lowering your voice help when a guest is escalating?", "opts": ["It signals authority and commands the guest's attention", "Volume matching escalates conflict; volume reduction tends to de-escalate it", "A lower voice signals that the conversation is being managed confidentially", "It reduces the chance of other guests overhearing the exchange"], "a": 1}, {"q": "When should the event manager be briefed about a conflict situation?", "opts": ["Only when the FOH professional cannot resolve it independently", "After every conflict situation \u2014 even when resolved \u2014 so management knows what happened on the floor", "Only when the conflict involved a VIP or senior client guest", "At the post-event debrief, when all incidents can be reviewed together"], "a": 1}]}, {"id": 9, "title": "Communication and Team Coordination", "subtitle": "Radio communication, timing signals, service cues and pre-event briefings", "duration": "30 min", "slides": [{"title": "Communication Is the Event's Nervous System", "type": "body", "body": "Every element of a well-run event \u2014 timing, service, flow, VIP management, conflict resolution \u2014 depends on clear, fast, accurate communication between the FOH team, the event manager, the kitchen and the technical team.\n\nWhen communication breaks down, events go wrong. Courses arrive at the wrong time. VIPs are not met at the door. A guest's complaint reaches the event manager an hour after it happened. Professional FOH communication prevents these failures."}, {"title": "Radio and Earpiece Protocol", "type": "list", "intro": "At large formal events, radio communication follows strict protocol:", "items": ["Keep radio communications brief and clear: name, position, message, over", "Use the established channel \u2014 no cross-channel communication unless the primary channel fails", "Do not use the radio for non-operational communication \u2014 it is a professional tool, not a conversation channel", "Confirm receipt of instructions: 'Received' or 'Copy' \u2014 silence is not confirmation", "If using an earpiece, keep the radio volume low enough not to be heard by nearby guests", "Batteries checked and radio tested before the event opens \u2014 a radio that fails during the event is a preparation failure"]}, {"title": "Service Cues and Timing Signals", "type": "highlight", "points": [{"text": "At seated events, the kitchen signals readiness for each course through a designated system \u2014 radio, bell or physical cue from the head waiter. Know the system before service begins."}, {"text": "Every FOH team member must know the full event programme. A cue called by the event manager only works if every team member understands what it means."}, {"text": "Timing is collective. One team member who is not in position when a transition is called delays the full team. Be in position before the cue, not after."}, {"text": "When you receive a cue and cannot execute \u2014 you are with a VIP, managing a conflict \u2014 communicate immediately so a colleague can cover. Silence creates gaps in service."}]}, {"title": "Team Briefing Participation", "type": "body", "body": "The pre-event briefing is where the event is built in words before it is built in action. Every FOH team member who is fully briefed \u2014 who knows their position, their role, the VIP list, the programme, the menu and the communication protocol \u2014 is a professional asset on the floor.\n\nEvery FOH team member who did not fully attend or engage with the briefing is an operational risk \u2014 someone who may be in the wrong position, uninformed about a VIP, unaware of a menu change or unclear about the service sequence. Attend every briefing. Engage fully. Ask every question before the floor opens."}], "questions": [{"q": "What does 'silence is not confirmation' mean in radio communication?", "opts": ["The radio channel has failed if there is no response from a team member", "Receiving an instruction without verbal confirmation may mean it was not received or understood", "Silent communication through pre-agreed signals is not sufficient at large events", "Background noise at events makes silent radio protocols unreliable"], "a": 1}, {"q": "When must a service cue be communicated to a colleague?", "opts": ["When the event manager calls the cue on the radio channel", "When every team member is in position and has confirmed readiness", "When you receive a cue but cannot execute it \u2014 so a colleague can cover", "Only when a cue affects a VIP guest or a transition involving the full floor"], "a": 2}, {"q": "What risk does a team member who did not fully attend the briefing create?", "opts": ["They may request to be briefed individually during service, creating delays", "They become an operational risk \u2014 possibly in the wrong position, uninformed about key details", "They will need to be assigned to a lower-priority section during the event", "Their placement record will be affected even if the event runs without obvious issues"], "a": 1}, {"q": "Why must radios be tested before the event opens?", "opts": ["Radio testing is required by health and safety regulations at formal events", "A radio that fails during the event is a preparation failure \u2014 batteries and function must be confirmed in advance", "Testing confirms that the event manager's channel is clear and accessible", "Radio testing allows the event manager to confirm all team members are in position"], "a": 1}]}, {"id": 10, "title": "Event Safety and Emergency Awareness", "subtitle": "Health and safety, emergency protocols and incident handling", "duration": "30 min", "slides": [{"title": "Safety Is a Professional Responsibility", "type": "body", "body": "At any event \u2014 a 50-person corporate dinner or a 2,000-person gala \u2014 the safety of every guest in the space is a professional and legal responsibility shared by every person working the event.\n\nFOH professionals are often the first person a guest approaches when something goes wrong. Knowing the emergency procedures, knowing the location of first aid, knowing how to manage an evacuation calmly and knowing when and how to escalate an incident is not optional preparation. It is basic professional competence."}, {"title": "What Every FOH Professional Must Know", "type": "list", "intro": "Before the event opens, every FOH team member must know:", "items": ["The location of all emergency exits \u2014 and the evacuation route from your specific zone", "The location of the first aid kit, the designated first aider and the defibrillator if present", "The fire assembly point \u2014 and whether the venue has had a recent fire drill", "The emergency contact chain: who you call for a medical emergency, a fire, a security incident", "The event's incident reporting procedure \u2014 verbal notification is never enough; incidents are documented", "The location of the nearest water or toilets \u2014 you will be asked regularly"]}, {"title": "Managing a Medical Emergency", "type": "steps", "intro": "When a guest has a medical emergency during an event:", "steps": [{"number": "1", "label": "Stay calm and secure the area", "detail": "Visibly panicking communicates to every nearby guest that something serious has occurred. Calmly move other guests away from the affected person, creating space."}, {"number": "2", "label": "Call for the first aider immediately", "detail": "Use your radio or send a colleague directly. State clearly: 'Medical emergency at [location]. First aider required immediately.' Do not leave the guest unattended."}, {"number": "3", "label": "Brief the event manager and manage guest communication", "detail": "Inform the event manager immediately. If guests nearby are watching, calmly acknowledge: 'A guest has become unwell \u2014 our team is assisting.' This reduces anxiety and prevents speculation."}]}, {"title": "Incident Reporting", "type": "highlight", "points": [{"text": "Every incident \u2014 medical, conflict, accident, near-miss \u2014 must be reported to the event manager immediately, even when managed successfully. Incidents not reported are incidents the client does not know about."}, {"text": "An incident report should cover: what happened, when, where, who was involved, what action was taken, and who was informed. Document while the details are fresh."}, {"text": "Do not discuss incidents with guests beyond what is necessary to manage the immediate situation. Speculation and information-sharing create anxiety and potential reputational damage."}, {"text": "Reporting an incident is not an admission of fault. It is professional practice. The organisation that reports and documents incidents is the one that learns from them and prevents recurrences."}]}], "questions": [{"q": "What must every FOH professional know before the event opens regarding safety?", "opts": ["The contact details of every supplier and the event manager's emergency number", "Emergency exits, first aid location, evacuation route, first aider's name, emergency contact chain", "The venue's full safety management plan and all relevant insurance documentation", "The event's legal compliance certification and occupancy permit details"], "a": 1}, {"q": "What is the correct first action when a guest has a medical emergency?", "opts": ["Call emergency services immediately", "Announce the situation to the event manager via radio", "Stay calm, move nearby guests away and call for the first aider immediately", "Sit the guest down and assess the severity before calling for assistance"], "a": 2}, {"q": "Why must every incident be reported to the event manager even when resolved?", "opts": ["It protects the FOH professional from personal liability", "Incidents not reported are incidents the client does not know about \u2014 documentation is a professional requirement", "Incident reports are required for Sinotheni Events' insurance compliance", "The event manager must sign off on all incidents before the event continues"], "a": 1}, {"q": "What does 'document while the details are fresh' mean in incident reporting?", "opts": ["Incidents must be reported within one hour of the event closing", "Write the incident report immediately after the event is over", "Record what happened, when, where and who was involved as soon as possible after the incident", "Incidents are documented only if they resulted in a guest complaint"], "a": 2}]}, {"id": 11, "title": "FOH Leadership and Career Development", "subtitle": "Leading a FOH team, shift management and building your career in events", "duration": "35 min", "slides": [{"title": "From Team Member to Team Leader", "type": "body", "body": "The difference between a strong FOH team member and a FOH leader is not seniority \u2014 it is mindset. A leader on the floor notices what needs to be done without being told. They support colleagues who are struggling. They brief new team members during a busy service. They catch problems before they reach the event manager.\n\nThis module prepares you for the shift from performing your role to leading others in theirs \u2014 and for building a professional career in the events and hospitality industry that reflects the standard you have reached in this programme."}, {"title": "Leading on the Floor", "type": "list", "intro": "FOH leadership is demonstrated through action, not title:", "items": ["Position new or less experienced team members near you during setup \u2014 lead by example, not instruction", "Communicate changes to the whole team, not just the person directly affected", "At every transition, check in with the team: 'Are we ready?' before calling the event manager that the floor is ready", "After a difficult service period, acknowledge the team: 'That was well managed.' Recognition between team members matters.", "Flag concerns to the event manager before they become problems \u2014 a leader protects the team and the event", "Take responsibility for your section without blame \u2014 when something goes wrong in your area, address it before it is pointed out"]}, {"title": "Managing a FOH Shift", "type": "highlight", "points": [{"text": "Know your full team before the briefing: who is in each position, who has done this event before, who needs more guidance. Brief accordingly."}, {"text": "Manage the energy of the team throughout the event \u2014 not just the logistics. A team that starts with good energy and loses it halfway through a 6-hour event produces inconsistent service."}, {"text": "Debrief after every event, even briefly. What worked? What should be different? Two minutes of honest, positive debrief builds a stronger team for the next event."}, {"text": "After the event, thank the team. It takes 10 seconds and costs nothing. A team that is thanked consistently performs better over time."}]}, {"title": "Building Your Events Career", "type": "intro", "body": "You have completed Front of House Mastery.\n\nYou are now equipped to perform at the highest standard in FOH roles across South Africa's hospitality and events industry \u2014 from corporate functions and government events to five-star hospitality venues and formal occasions.\n\nThe skills in this programme are your professional portfolio. Your reputation is built event by event. Your certificate demonstrates the standard you hold yourself to.\n\nComplete the final assessment to earn your Certificate of Completion. 60% to pass.\n\nGo and lead from the front."}], "questions": [{"q": "What distinguishes a FOH leader from a strong FOH team member?", "opts": ["A formal team leader title assigned by the event manager", "Longer experience in the events industry", "A mindset that notices what needs to be done without being told and supports the team around them", "Greater technical knowledge of event logistics and floor management"], "a": 2}, {"q": "What is the responsibility of a FOH leader regarding concerns during an event?", "opts": ["Address concerns themselves without involving the event manager", "Document concerns for the post-event debrief", "Flag concerns to the event manager before they become problems", "Share concerns with the team to ensure everyone is aware"], "a": 2}, {"q": "What does 'brief accordingly' mean when managing a FOH team?", "opts": ["Brief every team member identically to ensure consistent information", "Know who has relevant experience and who needs more guidance, and adjust the briefing to meet the team's actual needs", "Brief only new team members \u2014 experienced staff do not require a pre-event briefing", "Give team members the option to ask for a briefing or opt out if they are familiar with the event format"], "a": 1}, {"q": "Why is a brief post-event debrief valuable even after a successful event?", "opts": ["It is required for the event's compliance documentation", "It builds a stronger team for the next event by acknowledging what worked and what could improve", "It allows the event manager to assess each team member's performance individually", "It provides the documentation needed for Sinotheni Events' post-event client report"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What is the first priority when beginning any professional shift?", "opts": ["Completing paperwork", "Personal appearance and uniform check", "Introducing yourself to colleagues", "Setting up your station immediately"], "a": 1}, {"q": "When a guest makes a complaint, what is the first step?", "opts": ["Apologise immediately", "Listen completely without interrupting", "Escalate to the supervisor", "Explain what went wrong"], "a": 1}, {"q": "What should you do when working under pressure?", "opts": ["Work faster prioritising speed", "Inform guests service may be delayed", "Stay calm, prioritise correctly and ask for help when needed", "Complete assigned tasks only"], "a": 2}, {"q": "How is a professional reputation built?", "opts": ["Through formal qualifications only", "By working at prestigious venues", "One shift at a time through consistent professional performance", "Through networking"], "a": 2}, {"q": "When is it acceptable to use your phone during service?", "opts": ["During quiet periods", "For work messages", "Never in guest areas during service", "When supervisor is not nearby"], "a": 2}, {"q": "What does anticipating guest needs mean?", "opts": ["Asking guests frequently", "Identifying what a guest needs before they ask", "Preparing all items in advance", "Following a fixed sequence"], "a": 1}, {"q": "What should you do if uncertain about an instruction?", "opts": ["Figure it out during the event", "Ask a colleague quietly", "Ask during briefing before service begins", "Proceed based on past experience"], "a": 2}, {"q": "How do you handle a dietary requirement query?", "opts": ["Answer based on menu knowledge", "Never confirm without checking with the kitchen", "Treat as medically unnecessary", "Delegate to the event manager"], "a": 1}, {"q": "When should plates be cleared from a table?", "opts": ["When the fastest guest finishes", "At fixed time intervals", "When every guest at the table has finished", "When asked by the guest"], "a": 2}, {"q": "What is the correct body language when approaching a guest?", "opts": ["Casual and relaxed", "Upright posture, eye contact, warm professional smile", "Neutral and business-like", "Energetic and enthusiastic"], "a": 1}, {"q": "In the context of introduction to front of house excellence, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professional appearance and foh standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest reception and first impressions, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest flow, seating and crowd management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of vip and vvip handling and escort protocol, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of five-star hospitality and luxury service standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event formality, protocol and diplomatic etiquette, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of conflict resolution: the calm framework, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of communication and team coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event safety and emergency awareness, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of foh leadership and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to front of house excellence, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professional appearance and foh standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest reception and first impressions, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest flow, seating and crowd management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of vip and vvip handling and escort protocol, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of five-star hospitality and luxury service standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event formality, protocol and diplomatic etiquette, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of conflict resolution: the calm framework, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of communication and team coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event safety and emergency awareness, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of foh leadership and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to front of house excellence, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professional appearance and foh standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest reception and first impressions, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest flow, seating and crowd management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of vip and vvip handling and escort protocol, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of five-star hospitality and luxury service standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event formality, protocol and diplomatic etiquette, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of conflict resolution: the calm framework, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of communication and team coordination, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event safety and emergency awareness, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of foh leadership and career development, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of introduction to front of house excellence, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of professional appearance and foh standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest reception and first impressions, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of guest flow, seating and crowd management, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of vip and vvip handling and escort protocol, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of five-star hospitality and luxury service standards, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}, {"q": "In the context of event formality, protocol and diplomatic etiquette, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow personal judgment above training guidelines"], "a": 1}];
const RESOURCES = [{"filename": "FOH101_R1.txt", "title": "Course Quick Reference", "desc": "Professional standards for Front of House Mastery", "content": "SINOTHENI EVENTS TRAINING ACADEMY\nFront of House Mastery\n\nModule 1: Introduction to Front of House Excellence\\nModule 2: Professional Appearance and FOH Standards\\nModule 3: Guest Reception and First Impressions\\nModule 4: Guest Flow, Seating and Crowd Management\\nModule 5: VIP and VVIP Handling and Escort Protocol\\nModule 6: Five-Star Hospitality and Luxury Service Standards\\nModule 7: Event Formality, Protocol and Diplomatic Etiquette\\nModule 8: Conflict Resolution: The CALM Framework\\nModule 9: Communication and Team Coordination\\nModule 10: Event Safety and Emergency Awareness\\nModule 11: FOH Leadership and Career Development"}];


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
