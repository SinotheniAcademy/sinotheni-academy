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
const STORE_KEY = "se_waiters101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "waiters101";
const COURSE_TITLE = "Waiters 101";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

const MODULE_NAMES = ["The Role of a Waiter", "Professional Appearance", "Professional Behaviour", "Understanding the Menu", "Service Basics: Serving and Clearing", "Guest Interaction", "Handling Complaints", "Teamwork", "Common Mistakes to Avoid", "Qualities of a Great Waiter", "Delivering Excellent Service"];

const CHAPTERS = [{"id": 1, "title": "The Role of a Waiter", "subtitle": "What waiters do, why they matter, and the standard expected at professional events", "duration": "20 min", "slides": [{"title": "Welcome to Waiters 101", "type": "intro", "body": "A waiter is more than someone who carries plates. At a professional event or in a quality hospitality environment, the waiter is the face of the operation \u2014 the person every guest interacts with, and the one who determines whether they feel welcomed, valued and well served.\n\nThis course prepares you to perform at the standard Sinotheni Events expects from every staff member deployed on events and in hospitality venues. Eleven modules. Practical content. The real professional standard."}, {"title": "What Waiters Do", "type": "list", "intro": "The waiter's responsibilities at a professional event or hospitality venue:", "items": ["Prepare and maintain their section before service begins", "Welcome guests and manage their table throughout the event", "Take orders accurately and communicate them to the kitchen", "Serve food and beverages to the correct guest at the correct time", "Clear courses, reset covers and keep the table presentation professional", "Handle guest requests, concerns and complaints with professionalism", "Support their team and contribute to the smooth running of the event"]}, {"title": "Why It Matters", "type": "body", "body": "Guests at a professional event experience the venue, the food, the d\u00e9cor \u2014 but what they remember and share is how they were treated. A waiter who greets warmly, serves attentively and handles problems with composure leaves a lasting positive impression on behalf of the entire event.\n\nAt Sinotheni Events, the staff we deploy represent our business and our clients' brands. The standard expected is not average. It is professional, consistent and guest-focused from first greeting to final clearance."}, {"title": "The Standard at Professional Events", "type": "highlight", "points": [{"text": "Arrive on time, in full uniform, ready to work. A waiter who arrives late or unprepared creates a problem before the event has started."}, {"text": "Know the event: venue layout, menu, service sequence, your section, and who you report to. Briefings are not optional \u2014 they are where you get the information you need to do your job."}, {"text": "Be visible and attentive without hovering. Guests should feel looked after without feeling watched. Read your tables and be where you are needed."}, {"text": "Carry yourself professionally at all times. Your body language, facial expression and manner communicate your attitude before you say a word."}]}], "questions": [{"q": "What do guests most often remember about a professional event?", "opts": ["The food quality and portion sizes", "How they were treated by the staff", "The venue's d\u00e9cor and setting", "The timing and sequence of the programme"], "a": 1}, {"q": "When does a waiter's professional responsibility begin?", "opts": ["When the first guests are seated", "When the service begins and orders are taken", "Before the event \u2014 arriving on time, in uniform and ready to work", "When the event manager gives the instruction to begin service"], "a": 2}, {"q": "Which of the following is a waiter's responsibility during service?", "opts": ["Managing the kitchen output and plating", "Handling guest requests and complaints with professionalism", "Coordinating the event programme and MC cues", "Managing supplier deliveries and setup"], "a": 1}, {"q": "What does 'being visible and attentive without hovering' mean?", "opts": ["Standing at the guest's table throughout service", "Checking every table every two minutes regardless of need", "Being present and available while reading tables and approaching only when needed", "Remaining at the service station unless specifically called by a guest"], "a": 2}]}, {"id": 2, "title": "Professional Appearance", "subtitle": "Dress code, grooming, uniform standards, hygiene and personal presentation", "duration": "20 min", "slides": [{"title": "Your Appearance Is Your First Statement", "type": "body", "body": "Before you greet a guest, before you take an order, before you say a single word \u2014 your appearance has already communicated something about the standard of service they are about to receive.\n\nA clean, correctly worn, well-pressed uniform says: this person is professional, this event is well-managed, and this guest matters. A wrinkled shirt, a stained apron or improperly worn uniform communicates the opposite. Your appearance is not a personal matter on a work shift. It is a professional standard and a non-negotiable."}, {"title": "Uniform Standards", "type": "list", "intro": "Follow these uniform standards on every shift without exception:", "items": ["Uniform clean, ironed and in good condition \u2014 no stains, tears or missing buttons", "Shirt fully tucked in at all times during service", "Black non-slip, closed-toe shoes \u2014 polished and in good condition", "Apron tied correctly and clean at the start of every shift", "Name badge worn if issued \u2014 straight, at chest height, visible", "No personal jewellery below the wrist during food service", "Hair secured \u2014 no loose hair in a food and beverage environment"]}, {"title": "Grooming and Hygiene", "type": "list", "intro": "Personal hygiene standards are non-negotiable in hospitality:", "items": ["Shower before every shift \u2014 body odour in a guest environment is unacceptable", "Deodorant used \u2014 fragrance should be subtle, not overpowering", "Hands washed correctly before service and after every contamination point", "Nails short and clean \u2014 no nail polish in food service environments", "Hair clean, styled appropriately and secured if longer than collar length", "Face clean and, for those who wear it, makeup natural and professional", "Teeth brushed \u2014 fresh breath matters when speaking with guests at close range"]}, {"title": "Before Every Shift", "type": "highlight", "points": [{"text": "Do a full uniform check before leaving home or the changing room. It is too late to fix your appearance once you are in the guest environment."}, {"text": "Carry a lint roller if your uniform attracts lint or pet hair. Arriving looking neat requires preparation, not luck."}, {"text": "Replace any uniform item that is worn or damaged before your next shift \u2014 do not wait to be told. A professional takes responsibility for their appearance."}, {"text": "Your appearance at the end of the shift matters too. Maintain your standard throughout \u2014 not just when service begins."}]}], "questions": [{"q": "What does a correctly worn uniform communicate before a waiter says a word?", "opts": ["The waiter's years of experience in the industry", "That the event is well-managed and the guest matters", "The level of food quality the guest can expect", "The formality of the event they are attending"], "a": 1}, {"q": "What is the correct footwear standard for waiters during service?", "opts": ["Any clean, dark-coloured shoe that the waiter is comfortable in", "White or black sneakers that allow the waiter to move quickly", "Black, non-slip, closed-toe shoes \u2014 polished and in good condition", "Formal dress shoes regardless of the surface being worked on"], "a": 2}, {"q": "Why is fragrance guidance important in hospitality?", "opts": ["Strong fragrance can mask food odours and confuse guests", "Fragrance is a personal choice with no impact on the guest experience", "Heavy fragrance in a dining environment competes with food aromas and may affect guests", "Guests associate strong fragrance with unprofessionalism in staff"], "a": 2}, {"q": "When is it acceptable to wear nail polish as a waiter in food service?", "opts": ["When the nail polish is a neutral or clear colour", "When gloves are worn during the full service", "It is never acceptable to wear nail polish in food service environments", "When specifically permitted by the event manager"], "a": 2}]}, {"id": 3, "title": "Professional Behaviour", "subtitle": "Punctuality, attitude, conduct, phone etiquette and working under pressure", "duration": "20 min", "slides": [{"title": "Behaviour Defines Your Reputation", "type": "body", "body": "Your professional appearance gets you through the door. Your behaviour determines whether you are invited back.\n\nAt Sinotheni Events, how you behave on a shift \u2014 your attitude, your punctuality, how you treat colleagues and guests, how you handle pressure \u2014 builds or damages your professional reputation. In the staffing industry, word travels fast. A waiter known for professionalism, reliability and a positive attitude is one who gets called for the best events. One known for lateness, attitude or poor conduct does not."}, {"title": "Conduct Standards on Shift", "type": "list", "intro": "These conduct standards apply on every shift without exception:", "items": ["Arrive at least 15 minutes before the briefing \u2014 not at the briefing time", "Greet your supervisor and team on arrival. A professional acknowledges their colleagues.", "Do not eat, drink or chew gum in guest areas. Staff meals happen before service or in the staff area.", "Do not sit in areas designated for guests. You are working.", "Do not engage in personal conversations with staff within guest earshot", "Speak respectfully to all team members including those in junior roles", "If you make a mistake, acknowledge it and correct it \u2014 do not hide it"]}, {"title": "Phone Etiquette on Shift", "type": "list", "intro": "Your phone does not belong in your hand during service:", "items": ["Phone on silent and out of sight during service \u2014 in a pocket, locker or bag", "No texting, scrolling or calls in guest areas at any time during service", "If an emergency call is expected, inform your supervisor before the shift begins", "Do not photograph guests, d\u00e9cor or food without explicit permission", "Social media posts during or about a private event are a serious breach of professionalism", "After the event, you may be photographed for Sinotheni's social media \u2014 this will be communicated"]}, {"title": "Working Under Pressure", "type": "highlight", "points": [{"text": "Pressure is part of the job. A full section, a demanding guest, a delayed course and a short team all at once \u2014 how you respond in these moments defines your professional standard."}, {"text": "Stay calm and prioritise. Identify the most urgent need and address it first. A waiter who becomes visibly stressed communicates that the event is not under control."}, {"text": "Ask for help. Acknowledging that you need support is professional. Struggling silently and falling behind is not."}, {"text": "Your attitude is contagious. Negativity during service affects your colleagues and can be sensed by guests. A composed, professional attitude lifts the whole team."}]}], "questions": [{"q": "What time should a waiter arrive relative to the pre-shift briefing?", "opts": ["Exactly at the briefing start time", "5 minutes before the briefing", "At least 15 minutes before the briefing", "As early as possible, ideally 30 minutes before service begins"], "a": 2}, {"q": "What is the correct approach when a waiter makes a mistake during service?", "opts": ["Cover the mistake if possible to avoid drawing attention to it", "Blame the kitchen or another team member to explain the error to the guest", "Acknowledge the mistake and correct it \u2014 do not hide it", "Wait until after the event to report the mistake to the supervisor"], "a": 1}, {"q": "What is the correct phone standard during service?", "opts": ["Phone may be used between courses during quiet periods", "Phone used only for work-related communication during service", "Phone on silent and out of sight in guest areas at all times", "Phone on silent but accessible in the apron pocket for emergencies"], "a": 2}, {"q": "What does working under pressure professionally require?", "opts": ["Working faster regardless of accuracy to manage the volume", "Informing guests of any delays so they are aware of the situation", "Staying calm, prioritising the most urgent need and asking for help when necessary", "Completing all tasks independently without requesting support from colleagues"], "a": 2}]}, {"id": 4, "title": "Understanding the Menu", "subtitle": "Reading menus, allergens, dietary requirements and communicating with the kitchen", "duration": "25 min", "slides": [{"title": "Know What You Are Serving", "type": "body", "body": "A waiter who cannot describe what is on the menu is not ready for professional service. Menu knowledge is one of the most visible markers of a professional waiter \u2014 and one of the most common failures in event staff.\n\nYou do not need to know the recipe. You need to know the dish: what it contains, what the key ingredients are, what dietary requirements it accommodates or does not accommodate, and what a guest who has not seen the menu would need to know to make a decision. Study the menu before every shift. Ask questions during the briefing. Know what you are serving before you serve it."}, {"title": "Allergens and Dietary Requirements", "type": "list", "intro": "Every waiter must understand the most common dietary requirements at South African events:", "items": ["Vegetarian: no meat, poultry or seafood \u2014 dairy and eggs are usually acceptable", "Vegan: no animal products at all \u2014 confirm with the kitchen", "Gluten-free: no wheat, rye, barley or oats \u2014 cross-contamination is a serious risk", "Halaal: no pork, no alcohol in preparation \u2014 confirm the kitchen's Halaal compliance", "Kosher: strict dietary laws \u2014 confirm with the caterer before advising the guest", "Nut allergy: severe and potentially life-threatening \u2014 any nut content must be confirmed exactly", "Dairy-free: no milk, butter, cream or cheese in any form", "If you are unsure: do not guess. Go to the kitchen and confirm before advising the guest."]}, {"title": "Communicating with the Kitchen", "type": "steps", "intro": "When a guest has a dietary requirement, follow this sequence:", "steps": [{"number": "1", "label": "Take the full order first", "detail": "Record the guest's requirement clearly on your order pad. Do not attempt to assess the menu yourself \u2014 you are not the chef."}, {"number": "2", "label": "Confirm with the kitchen", "detail": "Go directly to the kitchen and ask: 'Can this dish be prepared without [ingredient]?' or 'Which dishes on tonight's menu are [dietary category]-safe?' Get a clear yes or no."}, {"number": "3", "label": "Return to the guest with an answer", "detail": "Return to the guest, confirm what is available, and repeat the order back including the modification. Document it clearly on the docket."}]}, {"title": "What You Must Never Do", "type": "highlight", "points": [{"text": "Never tell a guest a dish is allergy-safe without confirming with the kitchen. A wrong answer can cause a serious medical emergency."}, {"text": "Never make assumptions based on the appearance of a dish. Hidden allergens \u2014 nuts in a sauce, dairy in a marinade \u2014 are common."}, {"text": "Never dismiss a guest's dietary requirement as a preference. Treat every requirement as if it is medically necessary."}, {"text": "Never forget to flag a dietary modification on the docket. A verbal note that does not reach the kitchen has not been communicated."}]}], "questions": [{"q": "What should a waiter do when they are unsure whether a dish contains a specific allergen?", "opts": ["Advise the guest it is probably safe based on their knowledge of the menu", "Tell the guest to choose a simpler dish to avoid any risk", "Go to the kitchen and confirm before returning to the guest with an answer", "Ask a senior waiter who may know the menu better"], "a": 2}, {"q": "What does 'vegan' mean in the context of dietary requirements?", "opts": ["No red meat \u2014 poultry and seafood are acceptable", "No meat or poultry \u2014 dairy and eggs are acceptable", "No animal products of any kind", "No meat products \u2014 honey and dairy are acceptable"], "a": 2}, {"q": "Why must a dietary modification always be written on the docket?", "opts": ["So the kitchen manager can review all special requests at the end of the event", "A verbal note that does not reach the kitchen in writing has not been communicated", "So the client can track the number of dietary requirements at their event", "So the waiter can charge the correct price for modified dishes"], "a": 1}, {"q": "How should a waiter treat every guest's dietary requirement?", "opts": ["As a personal preference that may or may not be medically important", "As medically necessary \u2014 regardless of whether the waiter believes it is", "As important only if the guest specifically mentions a medical condition", "As important only for guests with a visible medical need"], "a": 1}]}, {"id": 5, "title": "Service Basics: Serving and Clearing", "subtitle": "Correct carrying technique, order of service, presenting food and clearing tables", "duration": "25 min", "slides": [{"title": "How You Serve Is as Important as What You Serve", "type": "body", "body": "The food may be exceptional. But if it arrives at the table from the wrong side, dropped carelessly in front of the guest, without announcement, with fingerprints on the plate rim \u2014 the impression is poor.\n\nServing and clearing correctly is a skill that must be practised and applied consistently. Every plate placed, every glass refilled, every course cleared follows a standard. The guest should not be able to tell the difference between the third table you served and the thirtieth."}, {"title": "The Order of Service", "type": "list", "intro": "Apply this sequence consistently at every table:", "items": ["Serve from the left, clear from the right \u2014 the standard convention at formal service", "Ladies before gentlemen at each table \u2014 host or most senior guest served last", "Move clockwise around the table for both serving and clearing", "Never reach across a guest \u2014 always move to the correct side", "Announce each dish as you place it: name the dish and any key item briefly", "Both plates at a table arrive at the same time \u2014 coordinate with your team if required", "Clear only when every guest at the table has finished \u2014 never while someone is still eating"]}, {"title": "Carrying Plates Correctly", "type": "steps", "intro": "Plates are carried and placed using this professional technique:", "steps": [{"number": "1", "label": "Hold from below", "detail": "Support the plate from below using your palm and fingers. Never grip the rim \u2014 this is both unhygienic and unprofessional. Your thumb should not touch the eating surface."}, {"number": "2", "label": "Carry two comfortably", "detail": "Learn to carry two plates in one hand before attempting three. A plate dropped because you overloaded yourself reflects on your preparation and professionalism."}, {"number": "3", "label": "Present with an announcement", "detail": "Place from the correct side. Make brief eye contact. Name the dish. Step back. Do not linger. Move to the next guest."}]}, {"title": "Clearing the Table", "type": "highlight", "points": [{"text": "Wait for all guests at the table to finish before clearing any plate. One guest still eating while plates are cleared around them is uncomfortable for everyone."}, {"text": "When clearing, remove the plate with your right hand. Stack carefully in your left \u2014 do not scrape or stack noisily. Never clear from the table directly into a rubbish bin in view of guests."}, {"text": "After clearing a course, crumb the table with a crumber or clean folded cloth before laying the next cover."}, {"text": "An empty glass is cleared. A glass still containing a beverage is refilled or left. Never take a glass a guest is still using."}]}], "questions": [{"q": "From which side should food be served to a seated guest?", "opts": ["Right side, with the right hand", "Left side, with the right hand", "Either side \u2014 what matters is that service is smooth and efficient", "Behind the guest to minimise disruption to their space"], "a": 1}, {"q": "When should a course be cleared from a table?", "opts": ["When the majority of guests have finished", "When the fastest guest at the table has finished and plates are pushed aside", "When every guest at the table has finished eating", "At a fixed time interval regardless of guest status"], "a": 2}, {"q": "What is the correct way to hold a plate when serving?", "opts": ["Grip the rim firmly with thumb and forefinger for a secure hold", "Hold from below with the palm and fingers \u2014 thumb and fingers must not touch the rim", "Hold with both hands for larger or heavier plates", "Use a clean service cloth wrapped around the base for a professional appearance"], "a": 1}, {"q": "What should a waiter do after clearing a course?", "opts": ["Immediately present the next course to maintain service flow", "Return to the kitchen and wait for the next course to be ready", "Crumb the table and reset the cover before the next course is served", "Ask the guest whether they are ready for the next course"], "a": 2}]}, {"id": 6, "title": "Guest Interaction", "subtitle": "Greeting guests, taking orders, handling requests and upselling professionally", "duration": "25 min", "slides": [{"title": "Every Interaction Shapes the Experience", "type": "body", "body": "A guest's experience at an event is not one thing \u2014 it is a series of moments. The greeting when they are seated. The way their order was taken. Whether their water was refilled before they had to ask. How a request was handled. Whether the waiter knew the menu.\n\nEvery one of these moments is an interaction, and every interaction is an opportunity to either add to the experience or detract from it. A professional waiter approaches every interaction with genuine attention and a service mindset."}, {"title": "Greeting and Seating Guests", "type": "list", "intro": "The first interaction sets the tone for everything that follows:", "items": ["Acknowledge every guest within 30 seconds of them being seated \u2014 even if it is just eye contact and a nod to signal you have seen them", "Greet warmly and professionally: 'Good evening, welcome. My name is [name] and I will be looking after you this evening.'", "Present menus promptly and pour water without waiting to be asked", "Allow guests a natural settling period before pressing for orders \u2014 read the energy of the table", "If the table has not been ready when guests arrive, apologise briefly and resolve it immediately \u2014 do not explain the reasons"]}, {"title": "Taking Orders and Handling Requests", "type": "steps", "intro": "Take every order using this consistent process:", "steps": [{"number": "1", "label": "Be ready and attentive", "detail": "Have your order pad open, pen ready, and your full attention on the guest. Do not approach the table and then fumble for your pen."}, {"number": "2", "label": "Repeat the order back", "detail": "Before leaving the table, repeat the full order back to confirm accuracy. Include any modifications. This is not optional \u2014 it prevents errors."}, {"number": "3", "label": "Act on requests immediately", "detail": "A guest request is actioned immediately \u2014 not when it is convenient. 'I'll be right back with that' means right back, not five minutes later after completing three other tasks."}]}, {"title": "Upselling Without Pressure", "type": "highlight", "points": [{"text": "Upselling is a genuine service, not a sales tactic. When you describe a dish enthusiastically, recommend a wine pairing, or suggest a dessert with a personal note, you enhance the guest's experience."}, {"text": "One confident recommendation beats a list of options. 'The malva pudding tonight is exceptional' is more effective than 'Would you like to see the dessert menu?'"}, {"text": "Read the table. A guest who knows exactly what they want does not need guidance. A guest who is undecided or curious welcomes a confident recommendation."}, {"text": "Never pressure. If the guest declines a suggestion, move on warmly. Upselling that makes a guest uncomfortable damages the experience \u2014 the opposite of its purpose."}]}], "questions": [{"q": "Within how many seconds should a newly seated guest be acknowledged?", "opts": ["60 seconds, giving them time to settle", "30 seconds \u2014 even just eye contact to show they have been seen", "As soon as they signal they are ready for service", "After 2 minutes, allowing them a comfortable settling period"], "a": 1}, {"q": "Why should a waiter repeat the order back before leaving the table?", "opts": ["To demonstrate their menu knowledge and professionalism to the guest", "To give the guest a final opportunity to add to their order", "To confirm accuracy and prevent errors \u2014 this is not optional", "To allow the kitchen to begin preparation before the order is docketed"], "a": 2}, {"q": "What is the professional approach to upselling?", "opts": ["Suggest every available upgrade or addition to maximise the table's spend", "Make one confident, genuine recommendation and accept the guest's decision", "Upsell only to guests who appear to be celebrating a special occasion", "Reserve upselling for the dessert course when guests are most relaxed"], "a": 1}, {"q": "How should a guest request be handled when you are in the middle of another task?", "opts": ["Complete your current task fully before attending to the new request", "Acknowledge the request immediately and action it as soon as your current task allows \u2014 not when convenient", "Delegate the request to a colleague who is less busy at that moment", "Ask the guest to wait while you finish your current task, explaining what you are doing"], "a": 1}]}, {"id": 7, "title": "Handling Complaints", "subtitle": "Listening, de-escalating, resolving and knowing when to escalate to a supervisor", "duration": "20 min", "slides": [{"title": "A Complaint Is a Second Chance", "type": "body", "body": "When a guest complains, they are telling you something went wrong and giving you an opportunity to fix it. The alternative \u2014 a guest who says nothing and leaves unhappy \u2014 is worse. They share their experience with others and do not return.\n\nA guest whose complaint is handled with genuine professionalism, speed and care often leaves more satisfied than one who had no problem at all. This is not theory \u2014 it is consistently proven in hospitality research. How you handle a complaint is one of the most powerful moments in the service experience."}, {"title": "The Complaint Resolution Process", "type": "steps", "intro": "Apply this consistent process to every complaint, large or small:", "steps": [{"number": "1", "label": "Listen completely", "detail": "Let the guest finish. Do not interrupt, explain or defend while they are speaking. Your body language matters \u2014 face them, make eye contact, nod. They need to feel heard before anything else."}, {"number": "2", "label": "Acknowledge and apologise", "detail": "'I completely understand, and I am very sorry.' Apologise sincerely before any explanation. A guest who receives a genuine apology first is ready to accept a solution."}, {"number": "3", "label": "Act and follow up", "detail": "Tell the guest exactly what you will do and by when. Do it. Return personally to confirm the issue is resolved. Do not delegate and disappear."}]}, {"title": "Common Complaint Scenarios", "type": "list", "intro": "Know how to respond to these frequent situations:", "items": ["Wrong dish: apologise, remove the incorrect dish, confirm the correct order with the kitchen, return as quickly as possible", "Cold food: apologise, take the dish to be replaced \u2014 do not reheat in view of the guest", "Long wait: acknowledge the delay before the guest raises it, apologise, give an honest timeframe", "Missing item: apologise, go immediately and return with the item", "Rude or inattentive service: apologise sincerely, take ownership of the failure \u2014 do not blame a colleague"]}, {"title": "When to Escalate", "type": "highlight", "points": [{"text": "Minor issues \u2014 a cold dish, a missing item \u2014 are resolved by the waiter directly. Not everything needs the supervisor."}, {"text": "Escalate when: the guest remains upset after your resolution attempt, a billing dispute arises, there is a health or safety concern, or the guest requests the manager specifically."}, {"text": "When escalating, brief the supervisor before they reach the table. Do not make the guest explain everything again \u2014 the supervisor should arrive informed and ready to act."}, {"text": "Never argue with a guest, even when you believe they are wrong. Your goal is to restore their experience, not to win the argument."}]}], "questions": [{"q": "What does research consistently show about a complaint that is handled professionally?", "opts": ["The guest becomes one of the operation's most vocal critics regardless of the resolution", "The guest often leaves more satisfied than one who had no complaint at all", "The guest requires financial compensation to be fully satisfied", "The guest is unlikely to return even if the complaint is resolved"], "a": 1}, {"q": "What is the first action in the complaint resolution process?", "opts": ["Apologise before the guest has finished speaking to show immediate care", "Listen completely without interrupting, explaining or defending", "Identify and fix the issue before returning to acknowledge the complaint", "Escalate to the supervisor immediately so the problem is resolved by authority"], "a": 1}, {"q": "When should a waiter escalate a complaint to a supervisor?", "opts": ["Every complaint should be escalated to protect the waiter from liability", "When the guest remains upset after the waiter's resolution attempt, or requests the manager", "Only when the complaint involves a billing dispute", "When the waiter is not sure they caused the problem"], "a": 1}, {"q": "What should a waiter never do during a complaint interaction?", "opts": ["Offer a solution before the guest has fully explained the complaint", "Apologise before understanding exactly what went wrong", "Argue with the guest, even when the waiter believes the guest is wrong", "Return to the table to confirm the complaint has been resolved"], "a": 2}]}, {"id": 8, "title": "Teamwork", "subtitle": "Working with fellow staff, back-of-house coordination and pre-event briefings", "duration": "20 min", "slides": [{"title": "Events Run on Teams", "type": "body", "body": "No waiter runs a successful event alone. The quality of the evening depends on how well every team member \u2014 front of house, kitchen, management, technical \u2014 performs their role and supports the roles around them.\n\nA waiter who focuses only on their own section while colleagues struggle is not a professional. A waiter who communicates clearly, helps where needed, and treats every team member with respect builds the trust that makes the whole operation function. At Sinotheni Events, the team is the product."}, {"title": "Supporting Your Team During Service", "type": "list", "intro": "On every shift, these team behaviours are expected:", "items": ["If you pass a table that needs water and your colleague is occupied, fill it \u2014 it takes 30 seconds", "If a colleague drops something, help them \u2014 your table can wait", "Communicate clearly when you need help: 'I need support on tables 4 and 5' is professional", "Share side work equally \u2014 clearing, resetting and cleaning at the end of the event is everyone's responsibility", "Do not complain about colleagues in earshot of guests \u2014 professional disagreements are resolved privately after the event", "Acknowledge when a colleague has done something well \u2014 recognition between team members builds a stronger team"]}, {"title": "Pre-Event Briefing", "type": "steps", "intro": "Every professional event begins with a briefing \u2014 attend it fully:", "steps": [{"number": "1", "label": "Arrive for the briefing ready", "detail": "You should know your section, have your notepad and pen, and be in full uniform before the briefing. The briefing is not the time to get ready."}, {"number": "2", "label": "Listen and take notes", "detail": "The briefing covers the event programme, menu, your specific role, the client and any special requirements. Write it down \u2014 do not rely on memory."}, {"number": "3", "label": "Ask questions before service", "detail": "If something is unclear, ask during the briefing. Asking during service in front of guests communicates that you were not prepared."}]}, {"title": "BOH and FOH Communication", "type": "highlight", "points": [{"text": "The kitchen and front of house must communicate to deliver a smooth event. A waiter who ignores the kitchen, or who creates conflict with kitchen staff, makes both their job and the kitchen's job harder."}, {"text": "When a course is delayed, communicate to the floor immediately. The event manager and your team need to know \u2014 not just you."}, {"text": "When a dietary modification exists, it must reach the kitchen on the docket. Verbal-only communication fails regularly in a busy kitchen."}, {"text": "Treat kitchen staff with respect. They are executing the food component you depend on. A professional relationship with the kitchen team produces better service outcomes."}]}], "questions": [{"q": "What is the correct response when you walk past a colleague's table that needs attention?", "opts": ["Continue \u2014 attending to another section creates confusion in responsibilities", "Note it and mention it to the colleague when they are next available", "Help immediately \u2014 filling a water glass or acknowledging the guest takes seconds", "Inform the event manager so the responsibility is properly assigned"], "a": 2}, {"q": "What should a waiter do if they are unclear about an instruction given in the briefing?", "opts": ["Ask a fellow waiter quietly during service when the manager is not nearby", "Figure it out during service based on what they observe other waiters doing", "Ask during the briefing \u2014 before service begins, not in front of guests", "Leave it and manage based on their previous experience"], "a": 2}, {"q": "Why must a dietary modification be documented on the docket rather than communicated verbally?", "opts": ["Written records protect the waiter if a dispute arises after the event", "Verbal communication fails regularly in a busy kitchen \u2014 the docket ensures the information reaches the chef", "Kitchen staff are not permitted to act on verbal instructions from waiters", "Written dockets are required by law for all events involving modified dishes"], "a": 1}, {"q": "What does 'the team is the product' mean at Sinotheni Events?", "opts": ["Each team member is evaluated and ranked individually after every event", "The quality of the event experience depends on how the full team performs together", "Sinotheni's product is the training programme, delivered by the team", "Team members are the primary brand asset and must dress to represent this"], "a": 1}]}, {"id": 9, "title": "Common Mistakes to Avoid", "subtitle": "Errors in service, body language, communication and appearance", "duration": "20 min", "slides": [{"title": "Mistakes That Cost Placements", "type": "body", "body": "In the staffing industry, your reputation is built or damaged one shift at a time. The event manager who books staff remembers who performed professionally and who did not. The mistakes covered in this module are the ones that get staff removed from a placement roster \u2014 not because the event manager is harsh, but because these failures directly impact the guest experience and the client's event.\n\nKnowing what not to do is as important as knowing what to do. Study this module as carefully as any other."}, {"title": "Service and Conduct Errors", "type": "two-col", "left": {"heading": "WHAT PROFESSIONALS DO", "items": ["Carry plates from below, never touching food surfaces", "Move clockwise and serve from the correct side consistently", "Clear only when every guest has finished", "Remain composed when things go wrong", "Acknowledge guests within 30 seconds of seating", "Keep the uniform correct throughout the full shift"]}, "right": {"heading": "WHAT COSTS YOU PLACEMENTS", "items": ["Gripping plate rims or touching food during service", "Reaching across guests because approaching from the correct side is inconvenient", "Clearing the fastest guest's plate while others are still eating", "Becoming visibly flustered when service gets busy", "Leaving guests unacknowledged while attending to other tables", "Untucking the shirt or removing the apron in guest areas before service ends"]}}, {"title": "Body Language and Communication Errors", "type": "list", "intro": "These non-verbal and verbal mistakes damage the professional impression:", "items": ["Rolling eyes, sighing audibly or showing frustration in front of guests \u2014 never", "Crossing arms or standing with hands in pockets in guest areas \u2014 communicate disinterest", "Yawning visibly in the guest environment \u2014 unacceptable regardless of how long the shift has been", "Speaking loudly with colleagues about personal matters near guest tables", "Using slang, informal language or abbreviations when speaking with guests", "Responding to a guest complaint with 'but' or 'actually' \u2014 these words begin arguments", "Checking your phone, even briefly, in a guest-visible area during service"]}, {"title": "Appearance Mistakes", "type": "highlight", "points": [{"text": "Arriving for the shift with an unpressed or stained uniform \u2014 this should be addressed before you leave home, not at the venue."}, {"text": "Loose or unsecured hair during food and beverage service \u2014 a hygiene failure and a presentation failure simultaneously."}, {"text": "Removing uniform elements in guest areas before the event is fully closed \u2014 the event is not over until you are dismissed."}, {"text": "Strong perfume or cologne that competes with food aromas in a dining environment \u2014 fragrance must be subtle in hospitality settings."}]}], "questions": [{"q": "Why does reaching across a guest to serve or clear rather than moving to the correct side reflect poorly on a waiter?", "opts": ["It is slower and less efficient than moving to the correct position", "It communicates that convenience matters more to the waiter than the guest's comfort", "It is against health and safety regulations in food service", "It disrupts the guest's table arrangement and place setting"], "a": 1}, {"q": "What does responding to a guest complaint with 'but' or 'actually' signal?", "opts": ["That the waiter is providing helpful context to explain what happened", "That the waiter is about to begin an argument rather than resolve the complaint", "That the waiter is experienced and confident in their knowledge of the situation", "That the waiter is acknowledging partial responsibility for the issue"], "a": 1}, {"q": "Why is a visible yawn in the guest environment considered unacceptable?", "opts": ["It is a contagious behaviour that may cause guests to feel tired", "It communicates lack of care and professionalism regardless of the actual reason", "It is disrespectful to the client who is paying for the event", "It suggests the waiter is unwell and should not be working with food"], "a": 1}, {"q": "When is a waiter permitted to remove uniform elements such as the apron in guest areas?", "opts": ["After all food courses have been served and cleared", "When a supervisor gives permission during a quiet period in service", "After the event is fully closed and the waiter has been dismissed", "Never \u2014 uniform must be maintained throughout the full shift"], "a": 2}]}, {"id": 10, "title": "Qualities of a Great Waiter", "subtitle": "Attitude, attention to detail, memory, speed and professionalism", "duration": "20 min", "slides": [{"title": "What Separates Good from Exceptional", "type": "body", "body": "Technical skills can be trained. The qualities covered in this module \u2014 attitude, attention, memory, composure, professionalism \u2014 are what determine whether a waiter is merely competent or genuinely excellent.\n\nSinotheni Events deploys staff at corporate functions, government events and formal hospitality settings where the standard demanded is consistently high. Clients and guests have expectations. The waiters who meet and exceed those expectations are the ones who build sustainable careers in this industry. This module is about becoming that kind of professional."}, {"title": "The Qualities Sinotheni Looks For", "type": "list", "intro": "These are the qualities that define a great waiter in professional event and hospitality environments:", "items": ["Attention to detail: noticing the empty glass, the dropped napkin, the guest who has been waiting \u2014 before being told", "Memory: remembering the table's order, the guest with the dietary requirement, the preference mentioned at the start of the evening", "Speed without rushing: moving efficiently through the event without creating an atmosphere of chaos or pressure", "Composure: remaining calm and professional whether serving 30 or 300 guests", "Genuine warmth: the ability to make a guest feel genuinely welcomed \u2014 not performed warmth, but real care", "Reliability: arriving when committed, performing the full shift at full standard, every time"]}, {"title": "The Professional Mindset", "type": "highlight", "points": [{"text": "A great waiter does not wait to be told what needs to be done. They look at the room, identify what is needed, and do it. Proactivity is a professional standard, not an above-and-beyond."}, {"text": "Consistency is more valuable than occasional excellence. A waiter who is exceptional sometimes and average other times is not a professional. The standard is the standard, every shift."}, {"text": "Take pride in the work. Pouring a glass of water correctly, placing a plate from the right side, clearing with timing and care \u2014 these are skills. Own them."}, {"text": "The guests you serve are someone's clients, family or occasion. Serve them as if what happens at their table is the most important thing in the room \u2014 because for them, it is."}]}, {"title": "Building Your Reputation", "type": "body", "body": "In the hospitality and events industry, your name is your business. Event managers, staffing coordinators and clients remember who performed well. A waiter known for reliability, professionalism and a consistently high standard is one who gets called first for the best events.\n\nEvery shift is an opportunity to build or add to that reputation. Your performance at your next event is your portfolio. Treat it accordingly."}], "questions": [{"q": "What does 'consistency is more valuable than occasional excellence' mean?", "opts": ["A waiter who performs well at one event is more valuable than one who performs adequately at all events", "Performing at a professional standard every shift is more valuable than being exceptional sometimes and average other times", "Consistent speed and efficiency is more important than the quality of individual service interactions", "A consistent appearance standard is more important than service quality at individual events"], "a": 1}, {"q": "What does 'proactivity' mean in a professional service context?", "opts": ["Completing assigned tasks without being told twice", "Anticipating what is needed and acting before being directed \u2014 not waiting to be told", "Volunteering for additional responsibilities beyond the waiter role", "Proactively communicating complaints to the supervisor before the guest raises them"], "a": 1}, {"q": "Which quality allows a waiter to recall a guest's dietary requirement without checking notes?", "opts": ["Speed \u2014 the ability to process and remember information quickly during service", "Attention to detail \u2014 noticing and recording all guest-specific information", "Memory \u2014 retaining information about each table, order and guest requirement", "Reliability \u2014 consistently applying the same thorough approach to every table"], "a": 2}, {"q": "How does a waiter build a strong professional reputation in the events industry?", "opts": ["By networking with event managers at industry events and functions", "By performing at a consistent professional standard on every shift over time", "By specialising in high-profile or formal events where standards are most visible", "By obtaining formal hospitality qualifications and certifications"], "a": 1}]}, {"id": 11, "title": "Delivering Excellent Service", "subtitle": "Going beyond the basics and creating memorable guest experiences", "duration": "25 min", "slides": [{"title": "What Excellent Actually Looks Like", "type": "body", "body": "Every waiter in this room knows the basics: serve from the left, clear from the right, repeat the order back. Excellence is built on top of those basics \u2014 it is the layer that turns a competent service into a memorable experience.\n\nExcellence at Sinotheni Events means: the water is refilled before the guest notices it is empty. The guest with the birthday receives a warm acknowledgement. The delayed course is communicated before the guest has to ask. The problem is resolved before it becomes a complaint. These are not accidents \u2014 they are the result of genuine attention, care and professional commitment."}, {"title": "The Details That Create Memorable Experiences", "type": "list", "intro": "Excellent service lives in the details that most guests never consciously notice but always feel:", "items": ["Refilling water glasses proactively \u2014 before the guest has to ask or wait with an empty glass", "Placing the correct dish in front of the correct guest without asking 'who had the chicken?'", "Noticing and acknowledging a special occasion without being intrusive about it", "Keeping the table clear of clutter \u2014 menus removed after ordering, finished glasses cleared promptly", "Checking back after two bites while any issue can still be corrected", "Making every guest at the table feel equally attended to \u2014 not just the host or most vocal guest", "Knowing when to step back: a table deep in conversation does not want to be interrupted every five minutes"]}, {"title": "Anticipating Needs", "type": "highlight", "points": [{"text": "The highest skill in service is anticipation \u2014 identifying what a guest will need before they identify it themselves. A guest who has just finished their first course needs their glass checked. A guest who has been waiting longer than expected needs acknowledgement."}, {"text": "Anticipation is learned by paying attention. Watch your tables. A guest who is looking around the room is often looking for you. A guest whose glass is at the three-quarter mark will need a refill soon."}, {"text": "Anticipating the needs of a guest with a dietary requirement is especially important. Confirm before service begins that their modified dish has been communicated. Check with the kitchen before every course."}, {"text": "You cannot anticipate every need. But a waiter who anticipates more needs than the guest expects creates an impression of exceptional service with relatively small actions."}]}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Waiters 101.\n\nYou now have the professional knowledge to serve guests at the standard Sinotheni Events expects at every corporate function, wedding, government event and hospitality placement.\n\nThe final assessment covers all eleven modules. You need 60% to pass and receive your Certificate of Completion. On passing, you are eligible for entry into the Sinotheni Events staffing register.\n\nThis is where the knowledge begins. The floor is where it becomes skill.\n\nGo and serve with excellence."}], "questions": [{"q": "What distinguishes excellent service from merely competent service?", "opts": ["The speed at which orders are taken and dishes are served", "The physical presentation quality of the food and table setting", "Anticipating what guests need before they have to ask \u2014 acting on attention rather than instruction", "The formal qualifications and experience level of the waiter"], "a": 2}, {"q": "Why should a waiter never ask 'who had the chicken?' when placing dishes at a table?", "opts": ["It disrupts the conversation and draws attention to the food being served", "It communicates that the waiter did not remember or note which guest ordered which dish", "It is considered rude in formal dining environments to ask guests to identify their own order", "It slows service significantly when managing multiple courses across a large section"], "a": 1}, {"q": "What does proactive water glass management mean?", "opts": ["Filling glasses to the brim at the start of service and refilling when empty", "Refilling glasses before the guest notices they are empty or has to ask", "Checking in with guests every 10 minutes to ask whether they would like water", "Placing full water jugs on each table so guests can manage their own refills"], "a": 1}, {"q": "What does it mean to 'check back after two bites'?", "opts": ["Return to the table two minutes after the first course to take dessert orders", "Return to check on the guest shortly after they begin eating so any issue can be corrected while there is still time", "Check the table twice during each course to ensure nothing is needed", "Return after the second course to ask whether the guest is satisfied with the full meal"], "a": 1}]}];

const FINAL_EXAM = [{"q": "What is the first priority when beginning any professional shift?", "opts": ["Completing paperwork", "Personal appearance and uniform check", "Introducing yourself to colleagues", "Setting up your station immediately"], "a": 1}, {"q": "When a guest makes a complaint, what is the first step?", "opts": ["Apologise and offer a solution immediately", "Listen completely without interrupting or defending", "Escalate to the supervisor", "Explain what went wrong"], "a": 1}, {"q": "What does 'serving from the left and clearing from the right' ensure?", "opts": ["Faster service during busy periods", "A consistent professional standard of table service", "The guest's comfort during the meal", "Proper communication between front and back of house"], "a": 1}, {"q": "How should a professional handle working under pressure?", "opts": ["Work faster and prioritise speed above quality", "Inform guests that service may be delayed", "Stay calm, prioritise correctly and ask for help when needed", "Complete your assigned tasks only"], "a": 2}, {"q": "What is the correct approach to dietary requirements and allergens?", "opts": ["Advise guests based on your knowledge of the menu", "Never confirm without checking with the kitchen directly", "Treat common dietary preferences as medically unnecessary", "Delegate dietary questions to the event manager"], "a": 1}, {"q": "When should a waiter clear plates from a table?", "opts": ["When the fastest guest at the table has finished", "At fixed time intervals regardless of guests", "When every guest at the table has finished eating", "When asked by the guest"], "a": 2}, {"q": "What does 'anticipating guest needs' mean in professional service?", "opts": ["Asking guests frequently what they need next", "Identifying what a guest will need before they have to ask", "Preparing all items in advance regardless of whether they are needed", "Following a fixed service sequence for every table"], "a": 1}, {"q": "When is it acceptable to use your phone during service?", "opts": ["During quiet periods between courses", "When you need to check a work-related message", "It is never acceptable to use your phone in guest areas during service", "When your supervisor is not nearby"], "a": 2}, {"q": "What should you do if you are uncertain about an instruction during a briefing?", "opts": ["Figure it out during the event", "Ask a colleague quietly during service", "Ask during the briefing before service begins", "Proceed based on past experience"], "a": 2}, {"q": "How do you build a professional reputation in hospitality and events?", "opts": ["By working only at premium events and venues", "By performing consistently at the professional standard on every shift over time", "By obtaining formal qualifications as quickly as possible", "By networking with event managers and clients"], "a": 1}, {"q": "In the context of the role of a waiter, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of professional appearance, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of professional behaviour, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of understanding the menu, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of service basics: serving and clearing, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of guest interaction, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of handling complaints, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of teamwork, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of common mistakes to avoid, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of qualities of a great waiter, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}, {"q": "In the context of delivering excellent service, what is the professional standard?", "opts": ["Complete the minimum required tasks", "Apply the correct standard consistently on every shift", "Focus on speed over quality", "Follow your own judgment above training guidelines"], "a": 1}];

const RESOURCES = [{"filename": "WAITERS101_Resource_1.txt", "title": "Course Quick Reference Guide", "desc": "Key concepts and professional standards for Waiters 101", "content": "SINOTHENI EVENTS TRAINING ACADEMY\\nWaiters 101 Quick Reference\\n\\nModule 1: The Role of a Waiter\\nModule 2: Professional Appearance\\nModule 3: Professional Behaviour\\nModule 4: Understanding the Menu\\nModule 5: Service Basics: Serving and Clearing\\nModule 6: Guest Interaction\\nModule 7: Handling Complaints\\nModule 8: Teamwork\\nModule 9: Common Mistakes to Avoid\\nModule 10: Qualities of a Great Waiter\\nModule 11: Delivering Excellent Service"}]
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
