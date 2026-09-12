import { useState, useEffect } from "react";

const BANKING_KEY = "se_banking_v1";

const FALLBACK_BANKING = {
  bank: "Standard Bank",
  accountName: "Asinotheni In Trading (Pty) Ltd",
  accountNo: "10146048316",
  branchCode: "051001",
  accountType: "Cheque Account",
  ref: "Your Full Name and Course Name"
};

function loadBanking() { try { const v = JSON.parse(localStorage.getItem(BANKING_KEY)); return v || FALLBACK_BANKING; } catch { return FALLBACK_BANKING; } }
function sessionKey(id) { return `se_unlocked_${id}`; }

const _SECRET = "sne2025xk";
const _CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function _hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
  return h;
}

function _computeChecksum(randomPart, courseId) {
  let h = _hash(courseId + _SECRET + randomPart);
  let out = "";
  for (let i = 0; i < 4; i++) { out += _CHARS[h % _CHARS.length]; h = Math.floor(h / _CHARS.length); }
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

async function activateCode(code, studentName) {
  try {
    fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/access_codes?code=eq." + encodeURIComponent(code.code), {
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
          setInputName(result.code.studentName || "");
          setStep("name");
        } else {
          setError("This link has an invalid or expired code. Please enter your code below or contact us.");
        }
      });
    }
  }, []);

  async function doCode() {
    const t = inputCode.trim();
    if (!t) { setError("Please enter your access code."); return; }
    setLoading(true); setError("");
    const result = await validateCode(t, courseId);
    setLoading(false);
    if (!result.valid) { setError("That code is not valid for this course. Please check your email or contact us."); return; }
    setFoundCode(result.code);
    setInputName(result.code.studentName || "");
    setStep("name");
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
    const body = encodeURIComponent(`Hi Sinotheni Events Team,\n\nI would like to enrol for the following course:\n\nCourse: ${courseTitle}\nCourse Type: ${courseType}\nPrice: ${priceText}\n\nMy Details:\nFull Name:\nPhone:\nEmail: (this address)\n\nI am attaching my proof of payment.\n\nPlease send my access code to this email. I understand you respond within 48 hours.${bankBlock}\n\nKind regards,`);
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
              <input type="text" value={inputCode} onChange={e => setInputCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && doCode()} placeholder="e.g. ABCD-EFGH" maxLength={9}
                style={{ width:"100%", padding:"13px 14px", fontFamily:"monospace", fontSize:18, letterSpacing:4, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", textAlign:"center", marginBottom:error?10:14, boxSizing:"border-box" }}/>
              {error && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#e74c3c", marginBottom:12, lineHeight:1.6, textAlign:"center" }}>{error}</div>}
              <button onClick={doCode} disabled={loading} style={{ width:"100%", background:loading?"#444":"#C9A84C", color:"#0D0D0D", border:"none", padding:13, fontFamily:"'Montserrat',sans-serif", fontSize:10, fontWeight:800, letterSpacing:2, cursor:loading?"default":"pointer", borderRadius:2 }}>
                {loading ? "CHECKING..." : "ACCESS MY COURSE"}
              </button>
              <div style={{ borderTop:"1px solid #1a1a1a", marginTop:20, paddingTop:18, textAlign:"center" }}>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#444", marginBottom:10 }}>Don't have a code yet?</div>
                <button onClick={requestAccess} style={{ width:"100%", background:"transparent", border:"1px solid #333", color:"#888", padding:"10px", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, letterSpacing:1.5, cursor:"pointer", borderRadius:2 }}>
                  REQUEST ACCESS BY EMAIL
                </button>
                <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:9, color:"#333", marginTop:8, lineHeight:1.6 }}>We respond within 48 hours.</div>
              </div>
            </div>
          )}
          {step === "name" && (
            <div style={{ background:"#111", padding:isMob?22:28, borderRadius:4 }}>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8.5, letterSpacing:2, color:"#C9A84C", marginBottom:6, textAlign:"center" }}>CODE ACCEPTED</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#666", textAlign:"center", marginBottom:18, lineHeight:1.7 }}>Enter your full name and surname exactly as you want them to appear on your certificate.</div>
              <input type="text" value={inputName} onChange={e => setInputName(e.target.value)} autoComplete="off" onKeyDown={e => e.key === "Enter" && doName()} placeholder="e.g. Thandi Dlamini"
                style={{ width:"100%", padding:"13px 14px", fontFamily:"'Montserrat',sans-serif", fontSize:14, border:"1px solid #222", background:"#1a1a1a", color:"#fff", outline:"none", textAlign:"center", marginBottom:error?10:14, boxSizing:"border-box" }}/>
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

async function saveStaffingApplication(profile, courseId, courseTitle) {
  try {
    await fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/staffing_applications", {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        "Content-Type": "application/json", Prefer: "return=minimal"
      },
      body: JSON.stringify({
        first_name: profile.firstName, last_name: profile.lastName, email: profile.email, phone: profile.phone,
        city: profile.city, province: profile.province, dob: profile.dob || "", qualification: profile.qualification,
        availability: profile.availability, course_id: courseId, course_title: courseTitle, submitted_at: new Date().toISOString()
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
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        code, course_id: courseId, student_name: studentName, progress_data: progressData, last_updated: new Date().toISOString()
      })
    });
  } catch(e) { console.log("Progress save:", e); }
}

const G = "#C9A84C", BK = "#0D0D0D", CR = "#FAF7F2";
const STORE_KEY = "se_front_office_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "front-office";
const COURSE_TITLE = "Front Office \u0026 Reception Operations";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

const MODULE_NAMES = ["Introduction to Front Office Operations", "Professional Appearance and Conduct", "The Check-In Process", "Reservations and Booking Management", "Guest Requests and Concierge Services", "Telephone and Communication Skills", "Check-Out and Billing", "Handling Complaints at the Front Desk", "Security, Privacy and Emergency Procedures", "Teamwork and Shift Handover", "Delivering a Memorable Front Office Experience"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Front Office Operations", "subtitle": "What the front office does, types of environments, core responsibilities and the professional standard", "duration": "20 min", "slides": [{"title": "Welcome to Front Office and Reception Operations", "type": "intro", "body": "The front office is the face of every hospitality operation. Whether it is the reception desk of a boutique hotel, the check-in counter of a game lodge, the welcome desk of a conference centre or the front desk of a busy corporate venue, the people working here make the first, last and most lasting impression on every guest who enters.\n\nThis course teaches the professional standards, practical skills and interpersonal capabilities needed to run a front office operation to a high standard. Eleven modules, covering everything from check-in and reservations through to complaints, security and the handover between shifts."}, {"title": "The Front Office as the Heart of the Operation", "type": "body", "body": "The front office is not simply where guests are received. It is the information and coordination hub for the entire venue. A guest's first enquiry arrives here. A complaint is often escalated here. A room change is managed here. An emergency is coordinated from here. A departing guest's final billing question is resolved here.\n\nThe front office professional therefore needs a broader skill set than almost any other hospitality role: communication, organisation, problem-solving, product knowledge, composure under pressure and genuine warmth, all deployed simultaneously throughout every shift."}, {"title": "Types of Front Office Environments", "type": "list", "intro": "Front office professionals work across a diverse range of hospitality settings:", "items": ["Hotels and lodges: the most complex front office environment, combining reservations, check-in, check-out, concierge and coordination with multiple departments", "Game and safari lodges: smaller operations with a more personal guest relationship and often more flexible service standards", "Conference and events venues: a front desk that coordinates large groups, manages arrival and departure flows and handles client communications", "Boutique and guesthouse operations: intimate settings requiring high personalisation and broad knowledge of all venue functions", "Corporate accommodation: professional guests with efficiency expectations, frequent travellers who value speed and accuracy above all else", "Resorts: complex multi-facility operations requiring knowledge across food and beverage, activities, spa and accommodation"]}, {"title": "Core Responsibilities of a Front Office Professional", "type": "list", "intro": "These responsibilities apply in every front office environment:", "items": ["Receive and welcome every guest warmly and professionally at the point of arrival", "Process check-ins accurately, efficiently and with genuine hospitality", "Manage reservations and bookings with full accuracy and clear communication", "Handle guest requests and enquiries, connecting them with the relevant departments", "Process check-outs correctly, including accurate billing and genuine farewell", "Manage communications: phone, email, in-person and digital simultaneously", "Coordinate between departments to meet guest needs throughout their stay", "Maintain the security and privacy standards that protect every guest"]}, {"title": "Why the Front Office Standard Matters", "type": "body", "body": "A poorly managed front office creates problems that cascade through every part of a guest's experience. An incorrect check-in places a guest in the wrong room. A missed reservation creates an arrival with no accommodation. A billing error creates a complaint at the worst possible moment. A security failure can have consequences that go far beyond a single stay.\n\nEqually, a front office operated to a high standard creates a positive foundation for everything that follows. A guest who arrives and is greeted correctly, checked in accurately and settled efficiently begins their stay in the best possible mood. They are more forgiving of small issues elsewhere in the venue and more likely to return."}, {"title": "The Professional Standard", "type": "body", "body": "The front office professional is expected to be simultaneously warm and efficient, knowledgeable and approachable, composed under pressure and consistently attentive to detail. This is a high standard, and meeting it requires preparation before every shift, focus during it, and the discipline to maintain the same level of service for the last check-in of the day as for the first.\n\nThis course builds the skills to meet that standard. Each module addresses a specific area of front office operations, from the most common daily tasks to the situations that test professional capability under pressure."}], "questions": [{"q": "What makes the front office different from most other hospitality roles?", "opts": ["It is the only role that interacts with guests at the venue", "It requires a broader skill set combining communication, organisation, problem-solving and warmth simultaneously", "Front office staff are required to have formal qualifications in hospitality management", "It is the highest-paid role in the hospitality industry"], "a": 1}, {"q": "What happens when a front office is poorly managed?", "opts": ["Only the guest's first impression is affected", "Problems cascade through every part of the guest's experience", "The impact is limited to check-in and check-out interactions", "The effect is felt only in revenue, not in guest satisfaction"], "a": 1}, {"q": "Which of the following is a core responsibility of every front office professional?", "opts": ["Managing the venue's social media presence and online reputation", "Training new staff in all areas of hospitality operations", "Coordinating between departments to meet guest needs throughout their stay", "Setting room rates and managing the venue's yield strategy"], "a": 2}, {"q": "Why does a well-managed check-in benefit the guest's entire stay?", "opts": ["It ensures the billing system is correctly configured from the start", "A guest who arrives and is settled efficiently begins their stay in the best possible mood", "It guarantees the guest will leave a positive review on departure", "A smooth check-in means the guest is unlikely to require further assistance"], "a": 1}, {"q": "What does the front office professional standard require?", "opts": ["Being warm OR efficient depending on the current demand level of the shift", "Maintaining a higher standard during peak hours and adjusting during quieter periods", "Being simultaneously warm and efficient with consistent attention to detail throughout the shift", "Following a scripted interaction model for every guest encounter"], "a": 2}]}, {"id": 2, "title": "Professional Appearance and Conduct", "subtitle": "Uniform, grooming, posture, behaviour, phone etiquette and maintaining professionalism all day", "duration": "20 min", "slides": [{"title": "First Impressions Begin Before You Speak", "type": "body", "body": "At the front desk, a guest's first impression is formed within seconds of seeing you. Your uniform, your posture, your expression and your presence communicate a great deal before you say a single word. A front desk professional who appears polished, composed and attentive immediately signals that the guest is in capable hands.\n\nThe front office is a high-visibility position. Unlike back-of-house roles, every moment of your shift is spent in a guest-facing environment. The standard you maintain in your appearance and conduct is therefore not just a personal matter. It is a direct representation of the venue's brand."}, {"title": "Uniform and Grooming Standards for the Front Desk", "type": "list", "intro": "The standard for front office appearance is among the highest in any hospitality role:", "items": ["Uniform clean, pressed and in perfect condition at the start and end of every shift", "Hair clean, neat and secured or styled to a professional standard", "Makeup, where worn, to a professional and understated standard appropriate for a business environment", "Fragrance subtle. The front desk is a close-contact environment. Overpowering fragrance is unprofessional.", "Nails clean and trimmed. Nail art or polish should be conservative and within the venue's specific guidelines.", "Name badge worn correctly, straight and visible at chest height", "No excessive jewellery. Professional accessories only. Follow the venue's specific jewellery policy."]}, {"title": "Posture, Presence and Body Language at the Front Desk", "type": "highlight", "points": [{"text": "Stand or sit upright. Slouching at the front desk communicates boredom or disinterest to approaching guests."}, {"text": "Face the guest fully when they approach. Turning partially away while continuing another task is common and always wrong."}, {"text": "Smile genuinely on greeting. A forced smile is immediately detectable. A genuine one changes the entire temperature of the interaction."}, {"text": "Never cross arms behind the desk. Even unconsciously, this creates a barrier between you and the guest."}, {"text": "Control your facial expressions, particularly during stressful moments. A frustrated expression while dealing with a system error is seen by every guest at and near the desk."}]}, {"title": "Conduct Standards on Shift", "type": "list", "intro": "Behaviour standards for every front desk shift:", "items": ["Arrive at least 15 minutes before your shift begins to receive a proper handover from the departing colleague", "Personal phone calls and text messages are managed away from the front desk and away from guest sight lines", "Personal conversations between colleagues stop when a guest approaches, without exception", "Do not eat at the front desk. Any meals or refreshments are taken on a designated break away from the desk area.", "Maintain professionalism in all interactions with colleagues that guests might observe. Internal tensions must never be visible to guests.", "If you are dealing with a difficult situation at the desk, request a colleague's presence before the situation escalates"]}, {"title": "Phone and Device Etiquette at the Front Desk", "type": "body", "body": "The front desk telephone is a primary communication tool and must be managed professionally. Answer every call within three rings. Use the venue's approved greeting. Take accurate messages. Never leave a caller on hold for more than sixty seconds without checking in.\n\nPersonal devices belong away from the front desk. Even the appearance of a personal phone on the desk communicates that your attention is divided. In an era of constant digital distraction, a front desk professional who is fully present and fully attentive when guests arrive stands out immediately as exceptional."}, {"title": "Maintaining Professionalism All Day", "type": "body", "body": "The front desk professional who is warm and attentive during the early part of a shift and visibly tired, short-tempered or distracted by the end has not met the professional standard. The last guest of the day deserves exactly the same quality of interaction as the first.\n\nMaintaining this standard requires physical preparation: adequate rest before a shift, proper nutrition and hydration during it, and the mental discipline to stay present even when the shift has been long and demanding. It also requires a clear understanding of why the standard matters: not because of the manager watching, but because every guest in front of you deserves genuine service regardless of what time their check-in falls."}], "questions": [{"q": "Why is the appearance and conduct standard higher for front desk staff than for many other roles?", "opts": ["Front desk staff are paid more and therefore expected to maintain higher standards", "The front desk is a high-visibility, permanently guest-facing position that directly represents the venue's brand", "Front desk staff interact with more senior guests than other hospitality roles", "Industry regulations require stricter standards for reception professionals"], "a": 1}, {"q": "What does arriving 15 minutes before your shift enable?", "opts": ["It allows you to set up the desk before the previous colleague leaves", "It gives you time to review overnight bookings before receiving the handover", "It ensures you receive a proper handover from the departing colleague", "It is required by the South African Basic Conditions of Employment Act"], "a": 2}, {"q": "What is wrong with turning partially away from a guest while continuing another task?", "opts": ["It is rude and should be reported to the manager immediately", "It communicates that the other task is more important than the guest's needs", "It creates a security risk at the front desk", "It is only unacceptable during peak hours when guests are more observant"], "a": 1}, {"q": "Why should personal devices not be visible at the front desk?", "opts": ["Personal devices must be switched off for security reasons during guest interactions", "Even the appearance of a personal phone communicates divided attention to the guest", "Venues are legally prohibited from allowing personal phones at guest-facing positions", "Personal devices interfere with the venue's PMS and communication systems"], "a": 1}, {"q": "What is the professional standard for the quality of service at the end of a long shift?", "opts": ["Service quality can reasonably decline towards the end of a long and demanding shift", "The standard is maintained at busy periods but can be slightly relaxed during quiet end-of-shift periods", "The last guest of the day deserves exactly the same quality of interaction as the first", "End-of-shift interactions can be shorter and more efficient given the reduced guest volume"], "a": 2}]}, {"id": 3, "title": "The Check-In Process", "subtitle": "Preparing for arrivals, the check-in sequence, special requirements, room assignment and welcoming the guest", "duration": "25 min", "slides": [{"title": "Check-In Is the Guest's First Full Experience", "type": "body", "body": "Everything a guest has anticipated about their stay crystallises at the check-in desk. The friendliness of the greeting, the speed of the process, the accuracy of the reservation, the readiness of the room: all of these come together in this single moment. A smooth, warm, accurate check-in sets a positive tone for the entire stay. A difficult, slow or error-prone one starts the relationship on a note that must be actively recovered.\n\nThe check-in process must therefore be simultaneously efficient and genuinely hospitable. Speed that feels cold is not good service. Warmth that takes twelve minutes is not good service either."}, {"title": "Preparing for Arrivals", "type": "steps", "intro": "Professional check-ins begin before the guest arrives:", "steps": [{"number": "1", "label": "Review the arrival list", "detail": "Before your shift or at the start of it, review all expected arrivals. Note any VIPs, returning guests, special requests, pre-assigned rooms and celebration arrangements."}, {"number": "2", "label": "Confirm room readiness", "detail": "Coordinate with housekeeping to confirm that rooms are clean and ready. A room that is not ready when the guest arrives is a common and preventable failure."}, {"number": "3", "label": "Pre-key rooms where possible", "detail": "If the venue's system allows and the reservation is confirmed, pre-keying the room speeds the check-in considerably."}, {"number": "4", "label": "Note special requirements", "detail": "Flag any dietary needs for welcome amenities, accessibility requirements, early arrivals or any communication from reservations about the booking."}, {"number": "5", "label": "Brief the team", "detail": "Make sure all front desk colleagues are aware of any significant arrivals or special arrangements for the shift."}]}, {"title": "The Check-In Sequence", "type": "steps", "intro": "Follow this sequence for every guest check-in:", "steps": [{"number": "1", "label": "Welcome the guest", "detail": "Stand, make eye contact, smile genuinely and greet warmly: 'Good afternoon, welcome to [Venue Name]. My name is [Name], how may I assist you?'"}, {"number": "2", "label": "Retrieve the reservation", "detail": "Ask for the guest's name and retrieve the reservation. Confirm the key details: dates, room type, rate and any inclusions."}, {"number": "3", "label": "Verify identity", "detail": "Follow the venue's ID verification policy. In South Africa, this is standard practice and most guests expect it."}, {"number": "4", "label": "Confirm special requirements", "detail": "Before issuing keys, confirm any requests or arrangements: 'I can see you have a late checkout requested. I have that confirmed for you.' This demonstrates attentiveness."}, {"number": "5", "label": "Issue keys and provide key information", "detail": "Provide the room key, confirm the room number, give the wi-fi details and direct the guest to the lift, restaurant and any relevant facilities."}, {"number": "6", "label": "Offer assistance and close warmly", "detail": "'Is there anything else I can help you with before you head up? Please do not hesitate to call the front desk at any time. Enjoy your stay.'"}]}, {"title": "Identifying and Addressing Special Requirements", "type": "highlight", "points": [{"text": "A VIP or returning guest should be acknowledged as such. 'Welcome back, Mr Dlamini, it is wonderful to have you with us again' is one of the most powerful phrases in front office."}, {"text": "A guest celebrating an anniversary, birthday or honeymoon needs a warm, discreet acknowledgement and confirmation of any arranged amenities."}, {"text": "A guest with a mobility requirement needs to know the lift location, the accessible route to their room and who to contact for assistance."}, {"text": "An international guest, particularly one who may not speak English confidently, needs a slower, clearer and more patient check-in interaction."}, {"text": "An early arrival who cannot yet access their room should be offered luggage storage and directed to available facilities while they wait. Do not simply turn them away."}]}, {"title": "Room Assignment Considerations", "type": "body", "body": "Room assignment should not be arbitrary. Where the Property Management System assigns rooms automatically, review the assignment against what you know about the guest before confirming it. A guest who has requested high floor should not be assigned ground floor. A guest who has previously noted noise sensitivity should not be next to the service lift.\n\nA returning guest whose previous room preference is on file should, where availability allows, receive a room consistent with that preference. This is one of the most powerful loyalty gestures available to any front desk professional and requires no additional cost to the venue."}, {"title": "The Welcoming Gesture", "type": "body", "body": "Beyond the functional elements of check-in, every interaction should contain a moment of genuine human warmth. This does not require an elaborate gesture. It is the smile that reaches your eyes. The use of the guest's name naturally, not formulaically. The brief, genuine expression of pleasure at the guest's arrival.\n\nGuests can distinguish between a professional who is going through a check-in procedure and one who is genuinely pleased to receive them. The difference is not technique. It is intent. A front desk professional who approaches every check-in as an opportunity to make a person feel genuinely welcomed creates the start of an exceptional stay."}], "questions": [{"q": "What must be confirmed before a guest's expected arrival to prevent a common and preventable failure?", "opts": ["That the guest's credit card has sufficient funds for the stay", "That the guest's room is clean and ready with housekeeping", "That the guest's reservation has been paid in full before arrival", "That the guest's dietary preferences have been sent to the kitchen"], "a": 1}, {"q": "What should a front desk professional do when a returning guest checks in?", "opts": ["Process their check-in as standard to avoid drawing attention to their history", "Acknowledge them by name and express genuine pleasure at welcoming them back", "Offer an automatic upgrade as a standard returning guest courtesy", "Ask the guest whether they would like the same room as their previous visit"], "a": 1}, {"q": "What is the correct response when a guest arrives for an early check-in and their room is not yet ready?", "opts": ["Apologise and ask the guest to return at the standard check-in time", "Offer luggage storage and direct the guest to available facilities while they wait", "Immediately request housekeeping to prioritise the room over all other work", "Offer the guest a room type upgrade to compensate for the inconvenience"], "a": 1}, {"q": "Why should room assignments be reviewed even when the PMS assigns them automatically?", "opts": ["PMS systems frequently assign rooms incorrectly due to software limitations", "Manual review is required by South African hotel star grading standards", "The automated assignment may not reflect individual guest preferences or previous requests", "Automatic assignments do not account for the current housekeeping status of each room"], "a": 2}, {"q": "What distinguishes a professional check-in from an exceptional one?", "opts": ["The speed at which the administrative process is completed", "The accuracy of the billing and pre-keying of the room", "The presence of a moment of genuine human warmth that makes the guest feel truly welcomed", "The number of facilities and amenities the guest is informed about during the interaction"], "a": 2}]}, {"id": 4, "title": "Reservations and Booking Management", "subtitle": "Taking reservations correctly, modifications and cancellations, overbooking and data accuracy", "duration": "25 min", "slides": [{"title": "The Reservation as a Promise", "type": "body", "body": "Every reservation taken by a front office professional is a promise made on behalf of the venue. A guest who books a room, a table or a service is planning their time, their travel and often their finances around that promise. When a reservation is incorrectly taken, poorly recorded or mismanaged, the consequence is a real person whose expectations have been failed.\n\nReservation management is therefore a zero-error standard. Accuracy, confirmation and clear communication are the foundations of every booking interaction, whether taken by phone, email, in person or through a digital system."}, {"title": "Taking a Reservation Correctly", "type": "steps", "intro": "The correct sequence for taking any reservation:", "steps": [{"number": "1", "label": "Gather essential information", "detail": "Guest name, contact details, date of arrival and departure, number of guests, room type or service required, and any special requests. All of these must be captured."}, {"number": "2", "label": "Confirm availability", "detail": "Check the system before confirming availability. Never confirm a reservation without verifying availability first."}, {"number": "3", "label": "Confirm the rate", "detail": "State the rate clearly, including what is and is not included. Ambiguity about pricing is the most common source of check-out disputes."}, {"number": "4", "label": "Discuss and note special requests", "detail": "If the guest has a dietary requirement, an anniversary arrangement or an accessibility need, note it accurately in the booking and flag it for the relevant department."}, {"number": "5", "label": "Confirm everything back to the guest", "detail": "Before ending the call or interaction, repeat the full booking back: dates, room type, rate, inclusions and any arrangements. Then confirm the guest's contact details for a written confirmation."}, {"number": "6", "label": "Send a written confirmation", "detail": "Every reservation should be followed by a written confirmation, by email or in writing, within a reasonable timeframe. This gives the guest a record and protects the venue from disputes."}]}, {"title": "Modifying and Cancelling Reservations", "type": "highlight", "points": [{"text": "All modifications must be processed in the PMS immediately and a new written confirmation sent to the guest."}, {"text": "Know the venue's cancellation policy before every shift. A guest who calls to cancel must be given accurate information about whether a charge applies."}, {"text": "When a cancellation is received within the policy period, process it promptly and send a cancellation confirmation. Leaving a reservation active when the guest has cancelled creates a no-show entry that distorts the operation."}, {"text": "A modification that involves a rate change must be communicated clearly to the guest. Never change a booking rate without notifying the guest."}, {"text": "Document who made the modification and when. This is essential for dispute resolution."}]}, {"title": "Overbooking: Causes and Professional Management", "type": "body", "body": "Overbooking occurs when the number of confirmed reservations exceeds available rooms or capacity. It is a common reality in hotel management, intentionally managed to offset expected no-shows. When overbooking results in a guest arriving to find no accommodation, the front office professional is responsible for managing the situation.\n\nThe correct response to a walk-in overbook is to apologise sincerely and personally, to offer alternative accommodation at a comparable or superior venue at no additional charge to the guest, to arrange transport to the alternative venue and to escalate immediately to a supervisor. The guest must never be made to feel that this is their problem to solve."}, {"title": "Reservation Records and Data Accuracy", "type": "list", "intro": "Reservation records are the foundation of every downstream operation:", "items": ["A reservation with an incorrect date creates a no-room situation for the guest and a revenue loss for the venue", "A reservation with no special request noted means a guest with a serious dietary need arrives without arrangement", "A reservation with an incorrect rate creates a billing dispute that erodes the guest's goodbill at the point of departure", "A reservation with missing contact details cannot be contacted if the property needs to communicate a change", "Data accuracy is a shared responsibility. Every member of the front desk team must enter and review records with the same standard of precision"]}, {"title": "Common Reservation Systems and Best Practices", "type": "list", "intro": "Regardless of which Property Management System your venue uses:", "items": ["Understand the booking flow from front to back before going live on the system", "Never create a manual reservation that is not entered into the PMS", "Check the system regularly for new bookings, particularly from online travel agents", "Understand the rate categories and do not apply rates without authorisation", "Back up and print arrival lists at the start of each shift in case of system outages", "Report any system anomalies, double bookings or rate errors to your supervisor immediately"]}], "questions": [{"q": "What should you always do before confirming availability to a guest?", "opts": ["Ask a senior colleague to verify the system reading", "Check the system to verify actual availability", "Request the guest's credit card details to secure the reservation", "Confirm the rate before checking availability to save time"], "a": 1}, {"q": "What must always be sent after a reservation is confirmed?", "opts": ["A payment invoice for the full amount of the stay", "A written confirmation giving the guest a record of the booking details", "A welcome pack with venue information and local recommendations", "A request for the guest's identification documents for pre-registration"], "a": 1}, {"q": "What is the correct response when a guest arrives to a room that has been overbooked?", "opts": ["Ask the guest to wait while you try to find a solution", "Apologise sincerely, offer comparable accommodation elsewhere at no charge and arrange transport", "Offer the guest a refund and advise them to find their own alternative accommodation", "Upgrade the guest to the most expensive available room in the venue"], "a": 1}, {"q": "When must a reservation modification be processed?", "opts": ["Within 24 hours of the change being communicated", "At the end of the shift when all changes can be processed together", "Immediately, with a new written confirmation sent to the guest", "Before the guest's arrival date, but not necessarily on the same day"], "a": 2}, {"q": "Why does an incorrect rate on a reservation cause a problem?", "opts": ["It creates a revenue audit issue that requires management approval to resolve", "It causes the PMS to generate incorrect reports for the revenue team", "It creates a billing dispute at check-out that erodes the guest's goodwill at departure", "It triggers an automatic price review that may affect other bookings"], "a": 2}]}, {"id": 5, "title": "Guest Requests and Concierge Services", "subtitle": "Handling requests, local knowledge, fulfilling complex arrangements and going beyond the ask", "duration": "20 min", "slides": [{"title": "Every Request Is a Service Opportunity", "type": "body", "body": "A guest request is a moment of trust. The guest is telling you they need something and believing you have the knowledge and willingness to help. How that request is handled determines a significant portion of their overall experience.\n\nThe front office professional who treats every request, however small, with the same competence and care as the check-in process itself is creating the conditions for guest loyalty. The one who sighs, shrugs or passes the guest off without genuinely trying is creating the conditions for a complaint and a departure to a competitor."}, {"title": "Handling Standard Guest Requests", "type": "steps", "intro": "The correct sequence for any guest request:", "steps": [{"number": "1", "label": "Acknowledge immediately", "detail": "Show the guest that their request has your full attention, even if you cannot action it immediately."}, {"number": "2", "label": "Note the request accurately", "detail": "Write down the details for any request that requires action by another person or department."}, {"number": "3", "label": "Confirm what you will do and when", "detail": "'I will have that extra pillow sent up within fifteen minutes' is a commitment. Make only commitments you can keep."}, {"number": "4", "label": "Follow through", "detail": "Action the request promptly. A request noted but not actioned is worse than one never acknowledged."}, {"number": "5", "label": "Confirm completion", "detail": "Where possible, follow up to confirm the request was fulfilled to the guest's satisfaction. This is the step that elevates competent service to exceptional."}]}, {"title": "Local Knowledge as a Service Tool", "type": "list", "intro": "A front office professional with excellent local knowledge is invaluable to any guest:", "items": ["Know the best restaurants within reasonable distance: different price points, cuisines and atmospheres", "Know the transport options: taxi services, car hire, shuttle companies, bus routes and rideshare availability", "Know the local attractions: tourist sites, walking routes, natural landmarks, cultural points of interest", "Know practical information: nearest pharmacy, hospital, supermarket and ATM", "Know what is currently happening: local events, markets, festivals and seasonal closures", "Know what to avoid: areas that are not safe for tourists, roads that are difficult to navigate, businesses with inconsistent standards"]}, {"title": "Managing Requests You Cannot Fulfil", "type": "body", "body": "Not every guest request can be met. Rooms run out of certain types. Services have capacity limits. Some requests fall outside what the venue can legally or practically provide. The professional approach to a request you cannot fulfil is to be honest, brief and solution-focused.\n\nNever simply say no without offering an alternative or an explanation. 'I am afraid we do not have a connecting room available for your dates, however I can offer two adjacent rooms on the same floor' turns a disappointment into an acceptable alternative. The guest who hears 'no' and nothing else has been failed. The one who hears 'not that, but this' has been served."}, {"title": "Coordinating with Other Departments", "type": "highlight", "points": [{"text": "Most guest requests require action from a department other than the front office. The front office professional is the coordinator, not always the executor."}, {"text": "Communicate requests to the relevant department clearly, with the room number, the guest's name, the specific requirement and the timeframe."}, {"text": "Follow up with the department, not the guest, to confirm the request has been completed before telling the guest it is done."}, {"text": "Build relationships with housekeeping, food and beverage, maintenance and management. A front desk that is respected by other departments gets faster responses to guest requests."}, {"text": "Take ownership of the request even when someone else is fulfilling it. 'I will make sure that is taken care of' means you ensure it, not just pass it on."}]}, {"title": "Going Beyond the Request", "type": "body", "body": "The best front office professionals do not just fulfil the request in front of them. They notice what the guest might need next and act on it without being asked. They add a small, personal touch to the delivery of a standard service. They remember something from the check-in conversation and connect it to a later interaction.\n\nA guest who mentioned at check-in that they are celebrating their first anniversary receives a card with their champagne, not just the champagne. A guest who asked about jogging routes receives a printed map with the front desk's personal recommendation. These gestures are not elaborate. They cost almost nothing. And they create the defining memories of a stay."}], "questions": [{"q": "What should you always note when a guest makes a request requiring action?", "opts": ["The guest's room number only", "The request details, the guest's name and room number, and the committed timeframe", "The time of the request for your own records", "The request and the name of the colleague you are passing it to"], "a": 1}, {"q": "What is the professional response when a guest request cannot be fulfilled?", "opts": ["Apologise and explain that it is not possible", "Refer the guest to a manager who has more authority to assist", "Be honest about the limitation and offer a genuine alternative", "Tell the guest you will look into it and come back later without specifying when"], "a": 2}, {"q": "What is the front office professional's role when a request requires action from another department?", "opts": ["Pass the request to the relevant department and consider it complete", "Act as coordinator: communicate clearly, follow up with the department and take ownership of the outcome", "Inform the guest that the department will contact them directly", "Escalate to a supervisor who has authority over other departments"], "a": 1}, {"q": "Why is local knowledge considered a service tool for front office professionals?", "opts": ["It allows the front desk to earn commission from recommended businesses", "It fulfils a legal concierge requirement for star-graded hotels", "It enables the professional to genuinely enhance the guest's experience beyond the property", "It reduces the number of calls the front desk receives from guests during their stay"], "a": 2}, {"q": "What does 'going beyond the request' require?", "opts": ["A specific budget allocation for complimentary amenities and upgrades", "Paying attention during earlier interactions and connecting that knowledge to later service moments", "Management approval for any gesture that goes beyond the standard service", "Experience of at least two years in a front office role"], "a": 1}]}, {"id": 6, "title": "Telephone and Communication Skills", "subtitle": "Answering correctly, managing transfers and messages, email standards and digital communication", "duration": "20 min", "slides": [{"title": "The Phone Creates the First Impression", "type": "body", "body": "In most hospitality operations, the first contact a guest or potential guest has with a venue is by telephone. How that call is answered, in how many rings, with what greeting, by what tone and with what competence, forms an impression that is carried into every subsequent interaction.\n\nFront desk telephone management is a specific professional skill. It requires simultaneous management of the desk, the caller and sometimes a guest standing in front of you. The standard for all three must be maintained without any one being visibly neglected."}, {"title": "Answering the Front Desk Telephone", "type": "steps", "intro": "Every call answered by a front desk professional must follow this sequence:", "steps": [{"number": "1", "label": "Answer within three rings", "detail": "A ringing phone that takes too long to answer communicates disorganisation and low priority for the caller."}, {"number": "2", "label": "Deliver the approved greeting", "detail": "'Good morning, [Venue Name], this is [Name], how may I help you?' This confirms the venue, the professional and the offer of assistance."}, {"number": "3", "label": "Give your full attention", "detail": "Stop typing, stop other conversations and give the caller your complete focus."}, {"number": "4", "label": "Take notes", "detail": "Have a notepad and pen ready at the desk at all times. A professional who says 'just a moment while I find a pen' immediately signals unpreparedness."}, {"number": "5", "label": "Confirm and close", "detail": "Before ending any call, summarise what has been agreed and confirm any action you are committing to. Then close warmly."}]}, {"title": "Managing Transfers and Messages", "type": "list", "intro": "Transfers and messages are where most telephone communication failures occur:", "items": ["Before transferring, tell the caller who they are being transferred to and why. Never blind transfer.", "Give the caller the direct extension number in case they are cut off during transfer.", "If the person is unavailable, offer to take a message rather than simply saying they are not available.", "A complete message includes: caller's name, contact number, the nature of their message, the time and date of the call, and your name.", "Deliver messages to the recipient promptly, not at the end of your shift.", "If a message has not been collected within a reasonable time, follow up with the recipient."]}, {"title": "Managing Multiple Calls and Guest Interruptions", "type": "body", "body": "The front desk telephone rings while a guest is standing at the desk. This is one of the most common situations in front office operations and one of the most poorly managed. The professional standard is clear: acknowledge the person in front of you first.\n\nIf the phone rings while a guest is at the desk, make eye contact with the guest, apologise briefly and answer the call. Tell the caller you have a guest with you and ask whether you may put them on hold for a moment. Then return to the desk guest with full attention. If the call cannot wait, ask a colleague to manage the desk guest. Never leave either party feeling completely ignored."}, {"title": "Email and Written Communication Standards", "type": "list", "intro": "All written communication from the front desk represents the venue formally:", "items": ["Use the venue's approved email signature on every message", "Reply to guest emails within four hours during business hours. Every unanswered email is a potential complaint.", "Begin every email with a proper greeting and the guest's name", "End every email with a commitment: 'I will have that confirmed by 2pm today'", "Proofread every email before sending. A guest-facing email with a typo reflects on the venue's professional standard", "Forward any email you cannot respond to immediately with a holding acknowledgement: 'Thank you for your message. I am looking into this and will have a full response for you by [time].'"]}, {"title": "Digital Communication in Modern Front Office", "type": "highlight", "points": [{"text": "Many venues now receive enquiries and communicate with guests via WhatsApp, chat or social media. The same professional standards apply regardless of the platform."}, {"text": "Response times for digital messages should mirror email standards: within four hours during business hours."}, {"text": "Maintain a professional tone in all digital messages. Emojis, abbreviations and informal language are not appropriate in guest-facing digital communication."}, {"text": "Never share guest information through unsecured or unverified channels."}, {"text": "Digital communication creates a permanent record. Write everything as if it will be reviewed."}]}], "questions": [{"q": "What must a front desk telephone greeting include?", "opts": ["The venue's name only", "The venue's name, your name and an offer to help", "The current time and the venue's address", "The venue's name and your supervisor's name"], "a": 1}, {"q": "What should you give to the caller before transferring a call?", "opts": ["The venue's main number in case they need to call back", "The name and direct extension of the person they are being transferred to", "The name of the department head responsible for their enquiry", "Confirmation that someone will definitely answer the transferred call"], "a": 1}, {"q": "When a guest is standing at the desk and the phone rings, what is the correct action?", "opts": ["Let the phone ring and focus on the guest. Calls can be returned.", "Answer the phone and deal with the call, then return to the desk guest.", "Acknowledge the desk guest, answer the phone and ask to put the caller on brief hold.", "Ask the desk guest to wait while you answer and manage the call in full."], "a": 2}, {"q": "What does a complete phone message include?", "opts": ["The caller's name, their message and the time", "The caller's name, contact number, message content, time and date, and your name", "The caller's name and the message only, as this is all the recipient needs to act on it", "The caller's name, their company and the nature of their call"], "a": 1}, {"q": "Why does every guest-facing email require a specific commitment before closing?", "opts": ["It satisfies a legal requirement under South African consumer protection law", "It gives the guest a clear expectation and creates accountability for follow-through", "It prevents the guest from following up with another call or message", "It is required by the venue's quality management system"], "a": 1}]}, {"id": 7, "title": "Check-Out and Billing", "subtitle": "Preparing the guest bill, reviewing with the guest, processing payment, handling disputes and the farewell", "duration": "20 min", "slides": [{"title": "Check-Out Is the Last Impression", "type": "body", "body": "Research into guest experience consistently shows that the end of a stay has a disproportionate impact on overall satisfaction and the likelihood of return. A beautiful stay followed by a difficult, slow or disputed check-out creates a negative final impression that the guest carries away and describes when they tell others about the venue.\n\nCheck-out must therefore be managed with the same warmth and professionalism as check-in, with the additional requirement of billing accuracy that the check-in does not carry. An error in the bill, at the end of a guest's stay, is the worst possible time for a mistake."}, {"title": "Preparing and Reviewing the Guest Bill", "type": "steps", "intro": "The bill must be ready and accurate before the guest reaches the desk:", "steps": [{"number": "1", "label": "Prepare the bill in advance", "detail": "For a scheduled departure, the bill should be prepared and reviewed by a front desk professional before the guest arrives at the desk."}, {"number": "2", "label": "Review every line item", "detail": "Check each charge against what was consumed or booked. A charge for a dinner the guest did not have, or an upgrade they did not confirm, will create a dispute."}, {"number": "3", "label": "Identify unusual charges", "detail": "Flag anything that looks inconsistent before presenting to the guest. It is always better to investigate internally first."}, {"number": "4", "label": "Present the bill clearly", "detail": "Hand the guest a printed copy or clearly display the digital version. Give them time to read it before proceeding."}, {"number": "5", "label": "Walk through it with the guest", "detail": "Briefly describe what each section covers. This is not defensive. It is professional and reduces the likelihood of disputes after the fact."}]}, {"title": "Handling Billing Disputes", "type": "highlight", "points": [{"text": "Listen to the dispute without defending the charge. A guest who feels heard is far easier to manage than one who feels dismissed."}, {"text": "Investigate before commenting. 'Let me look into that right now' is always the right first response to a disputed charge."}, {"text": "When an error has been made, acknowledge it immediately and thank the guest for raising it. 'You are absolutely right, I can see that charge is incorrect. Let me have that removed immediately.'"}, {"text": "When the charge is correct, explain calmly with the evidence: 'I can see this charge relates to the minibar item recorded by housekeeping on Wednesday morning.'"}, {"text": "Escalate billing disputes above a certain value to a supervisor immediately. Do not authorise significant adjustments without approval."}, {"text": "Never argue about money with a guest at the front desk within earshot of other guests."}]}, {"title": "Processing Payment at Check-Out", "type": "body", "body": "Payment processing at check-out must be accurate, swift and performed in view of the guest at all times. Card transactions must be confirmed on the machine before the guest's card is returned. Cash payments must be counted back to the guest with the change confirmed verbally.\n\nWhere a company account or direct billing arrangement is in place, confirm the billing instructions before the guest's arrival, not at the desk during the check-out. Most billing arrangement complications at check-out are the result of instructions not confirmed in advance."}, {"title": "Express Check-Out and Digital Departure", "type": "list", "intro": "Many guests, particularly business travellers, prefer not to stop at the front desk on departure:", "items": ["Where the venue offers express check-out, ensure the guest was informed of this option at check-in", "An express check-out bill should be reviewed and queried via the guest's phone or email before processing if possible", "Where a guest departs without stopping, ensure the bill is sent electronically immediately after departure", "Do not simply leave an express check-out bill without follow-up. If the guest has not responded within a reasonable time, contact them", "For business guests with company accounts, ensure the bill is correctly directed and a receipt is provided to the guest personally as well"]}, {"title": "The Farewell", "type": "body", "body": "The final words and interaction with a departing guest are an investment in their return. A warm, genuine farewell, the guest's name used naturally, a sincere expression of pleasure at their visit, a specific invitation to return: these take fifteen seconds and create a lasting positive final impression.\n\n'Mr Nkosi, it has been a pleasure having you with us. I hope your journey goes smoothly. We look forward to welcoming you back.' This is not a script. It is a genuine human moment that closes the stay on exactly the right note."}], "questions": [{"q": "When should a guest's bill be prepared for a scheduled departure?", "opts": ["When the guest arrives at the desk to check out", "In advance, so a front desk professional can review it before the guest arrives", "After the guest has confirmed they are ready to settle", "The night before departure, and left under the door for the guest to review"], "a": 1}, {"q": "What is the correct first response when a guest disputes a charge?", "opts": ["Explain that all charges on the bill are correct and verified", "Offer to remove the charge immediately to avoid further conflict", "'Let me look into that right now' - investigate before commenting", "Ask the guest to provide evidence of their claim before taking action"], "a": 2}, {"q": "What should you do if an error is found in a guest's bill?", "opts": ["Correct it silently and hope the guest does not notice it was wrong", "Acknowledge it immediately, thank the guest and correct it at once", "Explain how the error occurred before making the correction", "Escalate to a supervisor before making any adjustment"], "a": 1}, {"q": "Why must card transactions be processed in full view of the guest?", "opts": ["South African financial regulations require visible processing for all card transactions", "Guests need to be present to enter their PIN and authorise the transaction", "Processing in view of the guest is a security and trust standard that protects both parties", "Card machines only function correctly when the guest can see the transaction amount"], "a": 2}, {"q": "What is the purpose of the farewell interaction at check-out?", "opts": ["To ask the guest for a review on TripAdvisor or Google", "To create a lasting positive final impression and invest in the guest's return", "To ensure the guest has not left any belongings in the room", "To hand the guest their receipt and conclude the financial transaction"], "a": 1}]}, {"id": 8, "title": "Handling Complaints at the Front Desk", "subtitle": "Why the front desk complaint is unique, listening, resolving, de-escalating and following up", "duration": "20 min", "slides": [{"title": "The Front Desk Complaint Is Different", "type": "body", "body": "Complaints that reach the front desk have often already passed through at least one other stage. A guest who complains at the front desk may have already mentioned the issue to a waiter or a housekeeper and not felt it was resolved. They may have sat with the frustration for hours before deciding to raise it formally. By the time they reach the desk, the emotional temperature is often higher than it would be for an in-the-moment complaint.\n\nThis means that the front desk professional's first task in any complaint is always emotional before it is administrative. The guest needs to feel heard and taken seriously before any solution can be offered. Jumping immediately to solutions while the guest still feels unheard is the most common failure in front desk complaint handling."}, {"title": "The Complaint Process at the Front Desk", "type": "steps", "intro": "Apply this sequence to every complaint received at the desk:", "steps": [{"number": "1", "label": "Move to a private location", "detail": "Where possible, move the conversation away from the desk and from other guests. A complaint managed publicly in the lobby amplifies the guest's distress and creates a poor impression for bystanders."}, {"number": "2", "label": "Listen completely", "detail": "Let the guest say everything they need to say without interruption, correction or defence. Make eye contact and demonstrate through your body language that you are fully present."}, {"number": "3", "label": "Acknowledge and apologise", "detail": "Before anything else: 'I am so sorry you have had this experience. That is not what we want for you at all.' Specific, sincere, first."}, {"number": "4", "label": "Take ownership", "detail": "Do not blame another department, a system or a policy. 'I will personally make sure this is resolved for you' is the right posture."}, {"number": "5", "label": "Act and communicate", "detail": "Tell the guest exactly what will happen and when. Then make it happen."}, {"number": "6", "label": "Follow up", "detail": "Return personally to confirm the resolution. This is what completes the recovery."}]}, {"title": "Language That Defuses and Language That Escalates", "type": "highlight", "points": [{"text": "DEFUSES: 'You are absolutely right to raise this. I completely understand your frustration.'"}, {"text": "ESCALATES: 'Our policy is clear on this matter' or 'There is nothing I can do about that.'"}, {"text": "DEFUSES: 'Let me take care of this personally right now.'"}, {"text": "ESCALATES: 'That is not my department's responsibility.'"}, {"text": "DEFUSES: 'I sincerely apologise. What would make this right for you?'"}, {"text": "ESCALATES: Interrupting the guest before they have finished describing the problem."}]}, {"title": "Escalation Procedures at the Front Desk", "type": "body", "body": "The front desk professional has significant authority to resolve most guest complaints. Minor billing errors, noise issues, room condition complaints and most service failures should be resolved at desk level without management involvement where possible.\n\nEscalate when the guest specifically requests to speak with a manager, when the resolution requires financial authority beyond your own, when there is a safety or security component to the complaint, or when the guest remains distressed after a genuine and thorough attempt at resolution. When escalating, brief the manager fully before they speak to the guest so the guest does not repeat themselves from the beginning."}, {"title": "Logging and Following Up Complaints", "type": "list", "intro": "Every significant complaint must be properly recorded:", "items": ["Note the date and time of the complaint", "Record the guest's name and room number", "Describe the nature of the complaint clearly and objectively", "Note what action was taken and by whom", "Record the outcome and whether the guest confirmed satisfaction", "Identify whether the complaint indicates a systemic issue that management needs to address", "Follow up with the guest before departure where possible, to confirm their overall experience improved"]}, {"title": "Preventing Repeat Complaints", "type": "body", "body": "Every complaint that reaches the front desk is information about something that is not working correctly in the operation. A front desk professional who handles a complaint well but does not escalate the underlying issue to management is only solving the immediate problem, not the structural one.\n\nA room that has generated three noise complaints has a noise problem that maintenance needs to investigate. A breakfast service that generates daily complaints about wait times has a capacity issue that management needs to address. The front desk professional who notices these patterns and raises them is adding genuine value to the venue beyond their immediate role."}], "questions": [{"q": "Why is a complaint that reaches the front desk often emotionally elevated?", "opts": ["Front desk guests are generally more demanding than other hospitality guests", "The guest may have already raised the issue elsewhere without resolution and has been sitting with the frustration", "The formal nature of the front desk environment makes guests more anxious and reactive", "Front desk complaints are usually more serious than complaints raised in other areas"], "a": 1}, {"q": "What is the first priority when a guest brings a complaint to the front desk?", "opts": ["Identifying which department is responsible for the issue", "Checking the guest's account to see if there are any previous complaints on record", "Making the guest feel emotionally heard and taken seriously before offering any solution", "Offering a solution immediately to demonstrate competence and efficiency"], "a": 2}, {"q": "What language should be avoided when responding to a complaint?", "opts": ["Any reference to company policy or departmental limitations", "Expressions of genuine empathy and personal ownership", "Offering specific action with a committed timeframe", "Following up after the resolution to confirm satisfaction"], "a": 0}, {"q": "When should a complaint be escalated to a front office manager?", "opts": ["Every complaint, to protect the front desk professional from liability", "When the guest requests a manager, when financial authority is needed, or when the guest remains distressed after a genuine resolution attempt", "Only when the complaint involves a billing dispute of more than R500", "Complaints should never be escalated as it communicates inability to handle the situation"], "a": 1}, {"q": "Why must significant complaints be logged formally?", "opts": ["To create a record that can be used against the guest in any future dispute", "South African consumer law requires formal logging of all hospitality complaints", "To identify patterns and systemic issues that management needs to address", "To protect the front desk professional if the guest leaves a negative review"], "a": 2}]}, {"id": 9, "title": "Security, Privacy and Emergency Procedures", "subtitle": "Guest identity and access, lost and found, privacy protection, emergency response and reporting", "duration": "20 min", "slides": [{"title": "The Front Office Is the Security Hub", "type": "body", "body": "In most hospitality operations, the front office is the primary security point for the property. It controls access to rooms, manages key issue and retrieval, verifies guest identity, receives reports of suspicious activity and coordinates emergency response. The front desk professional who understands and takes this responsibility seriously is essential to the safety of every guest in the venue.\n\nSecurity does not mean suspicion or coldness. A front office professional can maintain a warm, welcoming environment and still apply security procedures consistently. The two are not in conflict. In fact, guests feel safer in environments where they know the front desk takes security seriously."}, {"title": "Guest Identity and Access Control", "type": "list", "intro": "Room key and access security are the most frequent security responsibility of the front desk:", "items": ["Only issue room keys to registered guests who can verify their identity", "If a guest requests a replacement key claiming to have lost theirs, verify their identity against the reservation before issuing a new key", "Never give out a guest's room number verbally in a public area. Direct any caller enquiring about a guest's room to call the guest's room directly", "Do not confirm whether a guest is in residence to a caller unless you have the guest's explicit prior authorisation", "When a guest checks out, deactivate all keys associated with their room immediately", "If a key card is found, do not attempt to identify the room. Bring it to the desk and deactivate it"]}, {"title": "Lost and Found: The Correct Process", "type": "list", "intro": "Items found in rooms or around the property must be handled with specific care:", "items": ["Every found item must be logged with a description, the date and time found, the location and the name of the person who found it", "Valuable items, including cash, jewellery, electronics and documents, must be reported immediately to a supervisor and stored securely", "Items must never be taken by staff. This is a dismissal offence at most venues.", "When a guest enquires about a lost item, search the log before confirming whether it has been found", "Items that are not claimed within the venue's policy period must be dealt with according to that policy, which your supervisor will define"]}, {"title": "Privacy and Data Protection", "type": "highlight", "points": [{"text": "Guest information is private and may not be shared with anyone who cannot prove a legitimate reason for needing it, including family members."}, {"text": "Do not share guest room numbers, check-in or check-out dates, or travel details with third parties without the guest's explicit consent."}, {"text": "Printed reservation confirmations, registration cards and bills must be disposed of securely. Guest documents must not be left visible at the desk."}, {"text": "South Africa's Protection of Personal Information Act (POPIA) applies to the collection and handling of guest data. Know your venue's POPIA compliance requirements."}, {"text": "If you receive a request for guest information that feels unusual or pressured, do not comply. Report it to your supervisor immediately."}]}, {"title": "Emergency Response Procedures", "type": "steps", "intro": "Every front desk professional must know the venue's emergency procedures before going live on shift:", "steps": [{"number": "1", "label": "Know the emergency numbers", "detail": "The fire brigade, ambulance and police numbers for your area, and your venue's internal emergency extension."}, {"number": "2", "label": "Know the fire evacuation procedure", "detail": "The exit routes, your role during evacuation and the assembly point for the venue."}, {"number": "3", "label": "Know your guest list", "detail": "During an evacuation, you may need to account for guests. The guest list must be accessible offline in case of system failure."}, {"number": "4", "label": "Medical emergencies", "detail": "Know the location of the first aid kit and the AED if the venue has one. Know who is first-aid trained on your shift."}, {"number": "5", "label": "Bomb threat or security incident", "detail": "Know your venue's specific protocol. Generally: do not panic, do not use a radio near a suspected device, follow the procedure and notify the manager."}]}, {"title": "Reporting Suspicious Activity", "type": "body", "body": "A front desk professional who observes something that does not seem right has a professional and moral responsibility to report it. This includes unregistered individuals attempting to access guest areas, individuals who appear to be in distress, behaviour that suggests something may be wrong in a room, or any activity that raises concern.\n\nThe correct approach is to report concerns to your supervisor immediately. Do not attempt to investigate or intervene alone. The role of the front desk is to notice and report, not to independently manage security incidents."}], "questions": [{"q": "What must you do before issuing a replacement room key to a guest who says they have lost theirs?", "opts": ["Issue the key immediately to maintain efficient service and avoid inconveniencing the guest", "Ask the guest to sign a replacement key form and then issue the key", "Verify the guest's identity against the reservation before issuing any replacement key", "Contact the guest's travel agent to confirm the booking before issuing a key"], "a": 2}, {"q": "What should you do if someone calls asking for a guest's room number?", "opts": ["Provide the room number if the caller knows the guest's name and booking reference", "Never share room numbers verbally. Direct the caller to call the guest's room directly.", "Ask the caller for their reason for needing the information before deciding", "Provide the floor number but not the specific room number as a compromise"], "a": 1}, {"q": "What must happen to every item found within the property?", "opts": ["It should be left in reception for the guest to collect", "Valuable items should be placed in the hotel safe until claimed", "It must be logged with a description, date, location and finder's name", "It should be reported to management and then stored in any available secure location"], "a": 2}, {"q": "What does South Africa's POPIA legislation govern in a hospitality context?", "opts": ["The minimum check-in and check-out times required at star-graded hotels", "The collection and handling of guest personal data", "The financial audit requirements for hotel billing systems", "The required qualifications for front office professionals"], "a": 1}, {"q": "What is the correct response if you observe something suspicious at the property?", "opts": ["Investigate the situation yourself to gather information before reporting", "Continue normal duties and only report if the situation becomes more serious", "Report the concern to your supervisor immediately. Do not intervene alone.", "Inform the guest whose room is nearby and ask them to keep watch"], "a": 2}]}, {"id": 10, "title": "Teamwork and Shift Handover", "subtitle": "Shift briefings, interdepartmental communication, a complete handover and being relied upon", "duration": "20 min", "slides": [{"title": "Hospitality Runs on Handovers", "type": "body", "body": "The front office operates twenty-four hours a day, seven days a week. The professional who keeps it running smoothly is often not the one who started the shift but the one who handed over completely, accurately and professionally to the person who continues it.\n\nA handover is not a brief conversation on the way out of the door. It is a structured transfer of all relevant information, outstanding tasks, guest requirements and operational updates from one shift to the next. A poor handover creates gaps that become complaints. A thorough one is one of the most professional acts in front office operations."}, {"title": "A Complete and Accurate Handover", "type": "steps", "intro": "Every shift handover must cover these elements:", "steps": [{"number": "1", "label": "Arrivals and departures", "detail": "What arrivals are expected in the next shift? Any special requirements? Any early or late arrivals flagged? Any guests who have not yet departed?"}, {"number": "2", "label": "Outstanding guest requests", "detail": "Every request that was noted but not yet fulfilled must be communicated, along with who is expecting it and by when."}, {"number": "3", "label": "Complaints and issues", "detail": "Any complaint that was raised during the shift, its current status and whether it is fully resolved or ongoing."}, {"number": "4", "label": "Operational updates", "detail": "Any system issues, maintenance matters, changes to room inventory or communications from management that affect the next shift."}, {"number": "5", "label": "VIP and special guest notes", "detail": "Any guests requiring specific attention: returning guests, VIPs, accessibility needs or celebration arrangements."}]}, {"title": "Communication Within the Front Desk Team", "type": "list", "intro": "Strong internal communication keeps the operation consistent and the guest experience seamless:", "items": ["Use the shared handover log consistently. Every significant event, decision or outstanding matter should be recorded.", "Brief colleagues immediately when a situation changes during the shift. Do not wait for the next handover.", "Resolve colleague miscommunications privately, not in front of guests.", "Cover for colleagues during breaks and peak moments. The desk should never be visibly understaffed.", "Share positive information too: a returning guest who loves a particular room, a regular who prefers a specific welcome arrangement.", "A team that communicates well internally presents a seamless, confident front to every guest."]}, {"title": "Interdepartmental Coordination", "type": "body", "body": "The front desk communicates with every department in the venue. Housekeeping, food and beverage, maintenance, security, management and the spa or activities team all receive and act on information from the front desk. The quality of these relationships directly determines the speed and effectiveness with which guest needs are met.\n\nA front desk that is collaborative and clear in its communication with other departments gets faster responses to guest requests, earlier warnings of operational issues and better overall service delivery. A front desk that is seen as demanding, unclear or unreliable in its communication creates friction that the guest eventually experiences."}, {"title": "The Pre-Shift Briefing", "type": "highlight", "points": [{"text": "Attend every pre-shift briefing fully prepared: uniform complete, aware of the day's arrivals and departures, and ready to ask and answer relevant questions."}, {"text": "The briefing covers: the occupancy status, the day's significant arrivals and departures, any VIPs or special arrangements, any operational issues to be aware of and any management priorities for the shift."}, {"text": "Information received in a briefing must be actively retained and applied. A briefing you attended but did not engage with is the same as a briefing you missed."}, {"text": "If something in the briefing is unclear, ask during the briefing, not mid-shift in front of a guest."}]}, {"title": "Being the Team Member Others Rely On", "type": "body", "body": "In every front desk team, there are people others rely on when it matters: those who cover breaks without being asked, who pick up the phone before it goes to voicemail, who give thorough handovers without prompting, who communicate clearly and who stay calm when the lobby is at full capacity with a complaint and three check-ins arriving simultaneously.\n\nThis reputation is built through consistent, professional behaviour across every shift, not through a single impressive performance. It is the most valuable professional asset in any front office career, and it opens every door to advancement, responsibility and opportunity."}], "questions": [{"q": "What must every shift handover include?", "opts": ["Only the names of arriving guests for the next shift", "Arrivals, departures, outstanding requests, complaints, operational updates and VIP notes", "The billing totals for the completed shift and the projected revenue for the next", "A summary of any complaints that were received and their current status only"], "a": 1}, {"q": "Why does interdepartmental communication quality affect the guest experience?", "opts": ["Guests interact with multiple departments and need consistent information from all of them", "The speed and effectiveness with which guest needs are met depends on how well the front desk communicates with other departments", "Interdepartmental communication affects the venue's star grading more than any other single factor", "Guests can observe interdepartmental communication and judge the venue's organisational quality"], "a": 1}, {"q": "What should you do if something in the pre-shift briefing is unclear?", "opts": ["Work it out during the shift using the PMS and your own judgement", "Ask a colleague quietly during the shift rather than interrupting the briefing", "Ask during the briefing before going live on shift", "Note the uncertainty and escalate to management if it becomes an issue"], "a": 2}, {"q": "What does being a reliable team member in a front office team require?", "opts": ["Delivering one impressive performance during a particularly busy shift", "Consistent professional behaviour across every shift: covering breaks, communicating clearly and staying calm under pressure", "Being available for additional shifts and overtime when the venue requires it", "Having more technical PMS knowledge than your colleagues"], "a": 1}, {"q": "How should colleague miscommunications within the front desk team be resolved?", "opts": ["In the handover log so there is a formal record of the disagreement", "By asking the duty manager to mediate between the parties involved", "Privately between the colleagues concerned, not in front of guests", "In the post-shift debrief with the full team present for transparency"], "a": 2}]}, {"id": 11, "title": "Delivering a Memorable Front Office Experience", "subtitle": "What memorable looks like, the personal touch, anticipating needs and building your reputation", "duration": "25 min", "slides": [{"title": "What a Memorable Front Office Experience Looks Like", "type": "body", "body": "A guest rarely describes a hotel stay as memorable because the check-in was technically correct and the billing had no errors. They describe it as memorable because of the person who greeted them by name when they arrived for the third time. Because someone noticed they had been travelling for twelve hours and offered them a cold towel and a glass of water without being asked. Because when something went wrong, it was fixed before they had to say anything a second time.\n\nMemorable front office experiences are built from genuine human connection overlaid on professional competence. The competence is the foundation. The connection is what the guest carries away."}, {"title": "The Personal Touch at the Front Desk", "type": "list", "intro": "Small, personalised gestures that create disproportionate positive impact:", "items": ["Using the guest's name naturally, correctly and without over-using it", "Acknowledging a detail from a previous stay or from the current booking without being intrusive", "Noticing what a guest needs before they ask: a weary guest who looks like they need directions clearly given, not just a room key", "Celebrating a special occasion in a way that is warm and discreet, not performative", "Following up on something mentioned during check-in: a guest who said they were looking for a good Italian restaurant receives a note with a recommendation", "A genuine, warm farewell that uses the guest's name and expresses actual pleasure at their visit"]}, {"title": "Anticipating Needs at the Front Desk", "type": "body", "body": "The highest-performing front desk professionals anticipate rather than react. They look at the day's arrival list and identify which guests might need extra attention. They notice a guest studying a map near the elevator and offer directions before being asked. They see a guest with young children at check-in and proactively offer to have a cot arranged and a child-friendly dinner option sent up.\n\nAnticipation is not guessing. It is the application of professional knowledge and attentive observation to each guest and each situation. It is the most obvious marker of a front desk professional who has truly mastered their role."}, {"title": "Consistency as the Standard", "type": "highlight", "points": [{"text": "The personal touch delivered occasionally is a pleasant surprise. Delivered consistently, it is a brand standard that guests expect and return for."}, {"text": "Consistency is not uniformity. It is the delivery of the same level of genuine care and attention to every guest in every interaction, regardless of when it falls in the shift."}, {"text": "A guest who received exceptional service on their last visit and competent but cold service on this one has not experienced consistency. They have experienced unpredictability."}, {"text": "The professional who is warm, attentive and composed regardless of how busy, tired or pressured the shift is has achieved the true front desk standard."}]}, {"title": "Building Your Professional Reputation", "type": "body", "body": "In hospitality, your professional reputation travels with you. Managers talk to each other. Venues are small communities. A front desk professional known for genuine warmth, consistent performance, thorough handovers and composure under pressure is someone every property wants and many will actively recruit.\n\nYour reputation is built one shift at a time. The guest you received warmly at two in the morning after a delayed flight. The complaint you handled calmly and personally while three check-ins were waiting. The handover you gave that meant your colleague started their shift informed and ready. These are the moments that build what no certificate alone can give you: a professional reputation that opens doors."}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Front Office and Reception Operations.\n\nYou now have the knowledge, skills and professional understanding to run a front desk to a high standard in any hospitality environment, in hotels, lodges, conference venues and beyond, in South Africa and internationally.\n\nThe final assessment covers all eleven modules. You need 60 percent to pass and receive your Certificate of Completion.\n\nEvery guest who approaches your desk is an opportunity. Go and make every one of them feel welcomed, served and genuinely valued."}], "questions": [{"q": "What creates a memorable front office experience for a guest?", "opts": ["Technical accuracy in all billing and reservation processes", "A combination of professional competence and genuine human connection", "The quality and variety of facilities available at the property", "The star grading of the venue and the standard of the physical environment"], "a": 1}, {"q": "What is the most obvious marker of a front desk professional who has truly mastered their role?", "opts": ["Speed of check-in processing compared to industry benchmarks", "The ability to manage multiple systems and communication channels simultaneously", "Anticipating what each guest needs before being asked", "The absence of any billing errors across a full month of shifts"], "a": 2}, {"q": "What distinguishes consistency from uniformity in front desk service?", "opts": ["Consistency means using the same script for every interaction; uniformity means adapting to the individual guest", "Consistency is the delivery of the same level of genuine care to every guest; uniformity means identical behaviour", "Consistency and uniformity mean exactly the same thing in a professional front office context", "Uniformity is the higher standard and includes consistency as a subset of the overall approach"], "a": 1}, {"q": "What does a professional reputation in front office operations require?", "opts": ["A formal hospitality qualification and at least three years of experience", "Consistent performance across every shift: warmth, accuracy, composure and thorough handovers", "Working at a high-profile venue that is recognised by industry peers", "A senior manager's recommendation and a formal reference from a previous employer"], "a": 1}, {"q": "Why does the farewell interaction matter at the end of a guest's stay?", "opts": ["It is the moment when the guest is most likely to request a loyalty card or programme", "It creates the last impression the guest carries away and influences their decision to return", "It is when the most significant upselling opportunities arise", "South African hospitality regulations require a formal farewell interaction for star grading"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What makes the front office different from most other hospitality roles?", "opts": ["It is the highest-paid role", "A broader skill set combining communication, organisation and problem-solving simultaneously", "It only interacts with guests at arrival and departure", "It requires formal hospitality management qualifications"], "a": 1}, {"q": "What is the correct approach when the telephone rings while a guest is at the desk?", "opts": ["Ignore the phone and focus on the desk guest", "Answer the phone first and ask the desk guest to wait", "Acknowledge the desk guest, answer and ask the caller to hold briefly, then return to the desk guest", "Ask a colleague to handle the desk guest while you take the call"], "a": 2}, {"q": "When should a room's availability be confirmed during the reservation process?", "opts": ["After collecting all the guest's personal details", "Before confirming availability to the guest", "After the guest has provided their credit card details", "When sending the written confirmation"], "a": 1}, {"q": "What must a complete shift handover include?", "opts": ["Only arriving guest names", "Arrivals, departures, outstanding requests, complaints, operational updates and VIP notes", "Billing totals and projected revenue", "Complaint status only"], "a": 1}, {"q": "What must you verify before issuing a replacement room key?", "opts": ["Issue immediately to maintain efficient service", "Ask the guest to sign a form", "Verify the guest's identity against the reservation", "Contact the guest's travel agent"], "a": 2}, {"q": "What does anticipating a guest's needs require?", "opts": ["Exceptional memory", "A comprehensive PMS", "Professional knowledge and attentive observation applied to each situation", "Five years of front office experience"], "a": 2}, {"q": "What is the correct first response to a disputed billing charge?", "opts": ["Explain that all charges are correct", "Remove the charge to avoid conflict", "'Let me look into that right now' before commenting", "Escalate to management immediately"], "a": 2}, {"q": "What must be logged for every found item at the property?", "opts": ["Description only", "Description, date, location and finder's name", "Estimated value and storage location", "Finder's name and supervisor's name"], "a": 1}, {"q": "When must a complaint at the front desk be escalated to a manager?", "opts": ["Every complaint", "Only physical aggression", "When the guest requests a manager or the resolution requires financial authority beyond yours", "Only billing disputes above R500"], "a": 2}, {"q": "What does POPIA govern in a hospitality context?", "opts": ["Check-in and check-out times", "The collection and handling of guest personal data", "Financial audit requirements", "Required front office qualifications"], "a": 1}, {"q": "What should you never do with a guest's room number?", "opts": ["Use it to pre-key the room before arrival", "Share it verbally in a public area or with any caller", "Enter it into the PMS on check-in", "Print it on the welcome key wallet"], "a": 1}, {"q": "Why does interdepartmental communication quality affect the guest experience?", "opts": ["It affects the venue's star grading", "The speed of guest need fulfilment depends on how well the front desk communicates with other departments", "Guests can observe it directly", "It determines which rooms are allocated"], "a": 1}, {"q": "What creates a professional reputation in front office?", "opts": ["Working at high-profile venues", "Consistent performance: warmth, accuracy, composure and thorough handovers across every shift", "Formal qualifications", "A senior manager's written recommendation"], "a": 1}, {"q": "When should a billing dispute above a certain value be escalated?", "opts": ["Never, as the front desk professional should resolve all disputes", "Immediately, before the guest has finished explaining the dispute", "When the financial authority required exceeds the front desk professional's authorised level", "Only after three failed attempts at resolution"], "a": 2}, {"q": "What does the farewell interaction at check-out achieve?", "opts": ["An opportunity to request a TripAdvisor review", "A lasting positive final impression that invests in the guest's return", "Ensuring the guest has not left any belongings", "Concluding the financial transaction"], "a": 1}, {"q": "What is the purpose of a complete handover log?", "opts": ["Recording billing discrepancies for audit purposes", "Ensuring all significant events are transferred so the next shift can operate without gaps", "Providing management with shift performance data", "Creating a record in case of dispute with a guest"], "a": 1}, {"q": "What must you do before confirming availability to a caller?", "opts": ["Ask for their credit card to hold the reservation", "Check the system to verify actual availability", "Confirm the rate before checking availability", "Ask a senior colleague to verify"], "a": 1}, {"q": "How should a guest with a mobility requirement be handled at check-in?", "opts": ["Process as standard and allow them to request assistance if needed", "Proactively confirm the lift location, accessible route and who to contact for assistance", "Assign a dedicated colleague to escort them throughout the stay", "Provide a written brochure on accessibility features"], "a": 1}, {"q": "What is the most common cause of check-out billing disputes?", "opts": ["Guests who attempt to avoid paying for items they have consumed", "Charges for items or services the guest did not confirm or consume", "System errors in the PMS that generate incorrect totals", "Staff who add unauthorised charges to guest accounts"], "a": 1}, {"q": "What is the farewell standard for a departing guest?", "opts": ["A formal printed receipt and confirmation that the key has been deactivated", "A warm, genuine farewell using the guest's name and a sincere expression of pleasure at their visit", "A request for the guest to complete a satisfaction survey", "A confirmation of their next reservation if one has been made"], "a": 1}];
const RESOURCES = [{"id": "resource-pack", "title": "Front Office Practical Resource Pack", "desc": "Desk procedures, checklists and communication frameworks"}];

// ---- THE GRAND - document generation engine ----

function certHTML(name, date, achievement, modules) {
  const yr = new Date().getFullYear();
  const certNo = `SE-W101-${yr}-${String(Math.floor(Math.random()*9000)+1000)}`;
  const corner = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M4 4 L4 26 M4 4 L26 4" stroke="#C9A84C" stroke-width="2"/><path d="M4 4 L11 11" stroke="#C9A84C" stroke-width="1" opacity="0.5"/><circle cx="4" cy="4" r="3" fill="#C9A84C"/></svg>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate of Completion - ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,700&family=Montserrat:wght@300;400;500;600;700;800&family=Cinzel:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 297mm;margin:0;}
html,body{background:#FAF7F2;font-family:'Montserrat',sans-serif;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0A0A0A;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px;}
.savebar p{font-size:11px;color:#FAF7F2;letter-spacing:0.5px;line-height:1.5;margin:0;}
.savebar button{background:#C9A84C;color:#0A0A0A;border:none;padding:10px 22px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;cursor:pointer;white-space:nowrap;flex-shrink:0;}
.page{width:210mm;height:297mm;background:#FAF7F2;position:relative;margin:56px auto 0;}
.b-outer{position:absolute;inset:9mm;border:2px solid #C9A84C;z-index:5;}
.b-inner{position:absolute;inset:12.5mm;border:1px solid #A07830;opacity:0.4;z-index:5;}
.c-orn{position:absolute;z-index:6;line-height:0;}
.c-orn.tl{top:5mm;left:5mm;}
.c-orn.tr{top:5mm;right:5mm;transform:scaleX(-1);}
.c-orn.bl{bottom:5mm;left:5mm;transform:scaleY(-1);}
.c-orn.br{bottom:5mm;right:5mm;transform:scale(-1);}
.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;pointer-events:none;}
.wm span{font-family:'Cinzel',serif;font-size:140pt;font-weight:900;color:#C9A84C;opacity:0.032;letter-spacing:20px;line-height:1;user-select:none;}
.body{position:absolute;inset:16mm;z-index:3;display:grid;grid-template-rows:auto 1fr auto;text-align:center;align-items:center;gap:0;}
.zone-top{display:flex;flex-direction:column;align-items:center;gap:1.2mm;padding-bottom:4.5mm;border-bottom:1px solid rgba(201,168,76,0.3);}
.mono{font-family:'Cinzel',serif;font-size:24pt;font-weight:900;color:#C9A84C;letter-spacing:6px;line-height:1;}
.acad-name{font-family:'Montserrat',sans-serif;font-size:7.5pt;font-weight:700;letter-spacing:5px;color:#0A0A0A;text-transform:uppercase;}
.acad-sub{font-family:'Montserrat',sans-serif;font-size:6pt;letter-spacing:5px;color:#C9A84C;text-transform:uppercase;}
.rule{width:55mm;height:1px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:1mm auto;}
.cert-label{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:7px;color:#888;text-transform:uppercase;}
.cert-course{font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:700;color:#0A0A0A;letter-spacing:3px;text-transform:uppercase;}
.zone-mid{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5mm;padding:3mm 0;}
.awarded{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:5px;color:#aaa;text-transform:uppercase;}
.student-name{font-family:'Cormorant Garamond',serif;font-size:40pt;font-weight:400;font-style:italic;color:#0A0A0A;line-height:1.1;letter-spacing:1px;}
.name-rule{width:140mm;height:1px;background:linear-gradient(90deg,transparent,#C9A84C 20%,#C9A84C 80%,transparent);}
.achievement{font-family:'Montserrat',sans-serif;font-size:7pt;color:#777;line-height:2;max-width:170mm;letter-spacing:0.3px;}
.zone-bot{display:flex;justify-content:space-between;align-items:flex-end;padding-top:4mm;border-top:1px solid rgba(201,168,76,0.3);}
.sig{display:flex;flex-direction:column;align-items:center;gap:1.5mm;min-width:55mm;}
.sig-val{font-family:'Cormorant Garamond',serif;font-size:10pt;color:#0A0A0A;}
.sig-line{width:52mm;height:1px;background:#ccc;}
.sig-label{font-family:'Montserrat',sans-serif;font-size:5.5pt;letter-spacing:3px;color:#bbb;text-transform:uppercase;}
.reg{font-family:'Montserrat',sans-serif;font-size:5pt;letter-spacing:1.5px;color:#bbb;text-transform:uppercase;text-align:center;line-height:2;}
.reg .gld{color:#C9A84C;}
@media print{.savebar{display:none;}.page{margin:0;}}
</style>
</head>
<body>
<div class="savebar"><button onclick="try{window.close();}catch(e){history.back();}" style="background:transparent;border:1px solid #444;color:#888;padding:7px 12px;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;cursor:pointer;">&#8592; Back to course</button><p>Destination: <strong>Save as PDF</strong> </p><button onclick="window.print()">Save as PDF</button></div>
<div class="page">
  <div class="b-outer"></div>
  <div class="b-inner"></div>
  <div class="c-orn tl">${corner}</div>
  <div class="c-orn tr">${corner}</div>
  <div class="c-orn bl">${corner}</div>
  <div class="c-orn br">${corner}</div>
  <div class="wm"><span>SE</span></div>
  <div class="body">
    <div class="zone-top">
      <div class="mono">SE</div>
      <div class="acad-name">Sinotheni Events Academy</div>
      <div class="acad-sub">The Foundations Series</div>
      <div class="rule"></div>
      <div class="cert-label">Certificate of Completion</div>
      <div class="cert-course">${COURSE_TITLE}</div>
    </div>
    <div class="zone-mid">
      <div class="awarded">This certificate is proudly awarded to</div>
      <div class="student-name">${name}</div>
      <div class="name-rule"></div>
      <div class="achievement">${achievement}</div>
    </div>
    <div class="zone-bot">
      <div class="sig">
        <div class="sig-val">${date}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Date of Completion</div>
      </div>
      <div class="reg">
        <span class="gld">Sinotheni Events Training Academy</span><br>
        Reg No: K2021422957 &bull; academy@sinothenievents.co.za<br>
        Certificate No: ${certNo}
      </div>
      <div class="sig">
        <div class="sig-val">Sinotheni Events Academy</div>
        <div class="sig-line"></div>
        <div class="sig-label">Authorised By</div>
      </div>
    </div>
  </div>
</div>
<script>(function(){
  function sc(){var p=document.querySelector('.page');if(!p)return;var mP=96/25.4,nW=297*mP,nH=210*mP;var av=document.documentElement.clientWidth-40;var s=Math.min(1,av/nW);p.style.transform='scale('+s+')';p.style.transformOrigin='top center';document.body.style.minHeight=(nH*s+80)+'px';}
  window.addEventListener('load',sc);window.addEventListener('resize',sc);
  window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},800);});
})();</script>
</body>
</html>`;
}

function transcriptHTML(name, score, total, date, remarks, modules) {
  const pct = Math.round((score/total)*100);
  const result = pct >= 90 ? 'Distinction' : pct >= 75 ? 'Merit' : 'Competent';
  const yr = new Date().getFullYear();
  const certNo = `SE-W101-${yr}-001`;
  const corner = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M3 3 L3 18 M3 3 L18 3" stroke="#C9A84C" stroke-width="1.5"/><circle cx="3" cy="3" r="2" fill="#C9A84C"/></svg>`;
  const half = Math.ceil(modules.length / 2);
  const col1 = modules.slice(0, half);
  const col2 = modules.slice(half);
  const maxRows = Math.max(col1.length, col2.length);
  let modRows = '';
  for (let i = 0; i < maxRows; i++) {
    const m1 = col1[i] ? `<span style="display:inline-block;width:5px;height:5px;background:#C9A84C;transform:rotate(45deg);margin-right:2mm;vertical-align:middle;"></span>${col1[i]}<span style="float:right;color:#A07830;font-weight:700;">&#10003;</span>` : '';
    const m2 = col2[i] ? `<span style="display:inline-block;width:5px;height:5px;background:#C9A84C;transform:rotate(45deg);margin-right:2mm;vertical-align:middle;"></span>${col2[i]}<span style="float:right;color:#A07830;font-weight:700;">&#10003;</span>` : '';
    const bg1 = i % 2 === 0 ? '#FAF7F2' : '#F0EDE8';
    const bg2 = i % 2 === 0 ? '#F0EDE8' : '#FAF7F2';
    const last = i === maxRows - 1;
    modRows += `<tr>
      <td style="font-family:'Montserrat',sans-serif;font-size:7pt;color:#333;padding:1.5mm 2mm;border:1px solid #DDD6CC;background:${bg1};">${m1}</td>
      <td style="font-family:'Montserrat',sans-serif;font-size:7pt;color:#333;padding:1.5mm 2mm;border:1px solid #DDD6CC;background:${bg2};">${m2}</td>
    </tr>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Academic Transcript - ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&family=Cinzel:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 297mm;margin:0;}
html,body{background:#FAF7F2;font-family:'Montserrat',sans-serif;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0A0A0A;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px;}
.savebar p{font-size:11px;color:#FAF7F2;letter-spacing:0.5px;margin:0;}
.savebar button{background:#C9A84C;color:#0A0A0A;border:none;padding:10px 22px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;cursor:pointer;flex-shrink:0;}
.page{width:210mm;height:297mm;background:#FAF7F2;position:relative;margin:56px auto 0;}
.b-outer{position:absolute;inset:5mm;border:1.5px solid #C9A84C;z-index:5;}
.b-inner{position:absolute;inset:7.5mm;border:0.5px solid #A07830;opacity:0.3;z-index:5;}
.c-orn{position:absolute;z-index:6;line-height:0;}
.c-orn.tl{top:3mm;left:3mm;}
.c-orn.tr{top:3mm;right:3mm;transform:scaleX(-1);}
.c-orn.bl{bottom:3mm;left:3mm;transform:scaleY(-1);}
.c-orn.br{bottom:3mm;right:3mm;transform:scale(-1);}
.wm{position:absolute;bottom:6mm;right:5mm;font-family:'Cinzel',serif;font-size:72pt;font-weight:900;color:#C9A84C;opacity:0.025;letter-spacing:4px;line-height:1;pointer-events:none;z-index:1;}
.inner{position:absolute;inset:9mm;display:flex;flex-direction:column;z-index:3;}
.hdr{display:flex;justify-content:space-between;align-items:center;padding-bottom:2.5mm;border-bottom:1px solid #DDD6CC;margin-bottom:0;flex-shrink:0;}
.hdr-l{display:flex;align-items:center;gap:3mm;}
.mono{font-family:'Cinzel',serif;font-size:14pt;font-weight:900;color:#C9A84C;letter-spacing:2px;line-height:1;}
.bn{font-family:'Cormorant Garamond',serif;font-size:9.5pt;font-weight:700;color:#0A0A0A;letter-spacing:2px;text-transform:uppercase;display:block;}
.bs{font-family:'Montserrat',sans-serif;font-size:4.5pt;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;display:block;margin-top:1px;}
.hdr-r{text-align:right;}
.doc-off{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:3px;color:#aaa;text-transform:uppercase;display:block;margin-bottom:1.5px;}
.doc-type{font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:600;color:#0A0A0A;letter-spacing:1px;display:block;}
.gstrip{height:2px;background:linear-gradient(90deg,transparent,#A07830,#C9A84C,#E0C97A,#C9A84C,#A07830,transparent);flex-shrink:0;margin:2mm 0;}
.stu-band{display:grid;grid-template-columns:1fr auto;gap:3mm;margin-bottom:2.5mm;flex-shrink:0;align-items:stretch;}
.stu-fields{display:grid;grid-template-columns:1fr 1fr;gap:1.5mm 4mm;}
.flbl{font-family:'Montserrat',sans-serif;font-size:4.5pt;letter-spacing:2.5px;color:#A07830;text-transform:uppercase;display:block;margin-bottom:0.5mm;}
.fval{font-family:'Cormorant Garamond',serif;font-size:9.5pt;font-weight:600;color:#0A0A0A;display:block;border-bottom:1px solid #DDD6CC;padding-bottom:1mm;}
.badge{background:#0A0A0A;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5mm 4.5mm;min-width:20mm;flex-shrink:0;}
.bval{font-family:'Cinzel',serif;font-size:8pt;font-weight:700;color:#C9A84C;display:block;text-align:center;line-height:1.2;margin-bottom:1.5mm;}
.blbl{font-family:'Montserrat',sans-serif;font-size:3.5pt;letter-spacing:2px;color:#555;text-transform:uppercase;text-align:center;}
.stitle{display:flex;align-items:center;gap:2mm;margin-bottom:1.5mm;flex-shrink:0;}
.slbl{font-family:'Montserrat',sans-serif;font-size:4.5pt;font-weight:700;letter-spacing:3.5px;color:#C9A84C;text-transform:uppercase;white-space:nowrap;}
.srule{flex:1;height:1px;background:#DDD6CC;}
.mod-table{width:100%;border-collapse:collapse;margin-bottom:2mm;flex-shrink:0;}
.sum-band{background:#0A0A0A;padding:2mm 3mm;margin-bottom:2mm;flex-shrink:0;}
.sum-head{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin-bottom:1.5mm;display:flex;align-items:center;gap:2mm;}
.sum-head::after{content:'';flex:1;height:1px;background:#1a1a1a;}
.sum-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#1a1a1a;}
.scell{background:#111;padding:1.5mm 2.5mm;}
.scell.hi{background:#C9A84C;}
.sclbl{font-family:'Montserrat',sans-serif;font-size:3.5pt;letter-spacing:2px;color:#555;text-transform:uppercase;display:block;margin-bottom:1.5px;}
.scell.hi .sclbl{color:rgba(0,0,0,0.4);}
.scval{font-family:'Cormorant Garamond',serif;font-size:8.5pt;font-weight:700;color:#fff;display:block;line-height:1.2;}
.scell.hi .scval{color:#0A0A0A;}
.rem{border-left:2px solid #C9A84C;padding:2mm 3mm;background:#F0EDE8;margin-bottom:2mm;flex-shrink:0;}
.rlbl{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:3px;color:#A07830;text-transform:uppercase;display:block;margin-bottom:1.5mm;}
.rtxt{font-family:'Montserrat',sans-serif;font-size:7pt;color:#555;line-height:1.85;}
.ftr{margin-top:auto;border-top:1px solid #DDD6CC;padding-top:1.5mm;display:flex;justify-content:space-between;align-items:flex-end;flex-shrink:0;}
.fsv{font-family:'Cormorant Garamond',serif;font-size:8pt;color:#0A0A0A;display:block;margin-bottom:1.5px;}
.fsl{width:40mm;height:1px;background:#ccc;margin-bottom:1.5px;}
.fll{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2px;color:#bbb;text-transform:uppercase;display:block;}
.freg{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:1.5px;color:#bbb;text-transform:uppercase;text-align:center;line-height:1.9;}
.freg .gld{color:#C9A84C;}
.fdv{font-family:'Cormorant Garamond',serif;font-size:8pt;color:#0A0A0A;display:block;text-align:right;margin-bottom:1.5px;}
.fdl{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2px;color:#bbb;text-transform:uppercase;display:block;text-align:right;}
@media print{.savebar{display:none;}.page{margin:0;}}
</style>
</head>
<body>
<div class="savebar"><button onclick="try{window.close();}catch(e){history.back();}" style="background:transparent;border:1px solid #444;color:#888;padding:7px 12px;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;cursor:pointer;">&#8592; Back to course</button><p>Destination: <strong>Save as PDF</strong></p><button onclick="window.print()">Save as PDF</button></div>
<div class="page">
  <div class="b-outer"></div>
  <div class="b-inner"></div>
  <div class="c-orn tl">${corner}</div>
  <div class="c-orn tr">${corner}</div>
  <div class="c-orn bl">${corner}</div>
  <div class="c-orn br">${corner}</div>
  <div class="wm">SE</div>
  <div class="inner">
    <div class="hdr">
      <div class="hdr-l">
        <div class="mono">SE</div>
        <div><span class="bn">Sinotheni Events</span><span class="bs">Training Academy</span></div>
      </div>
      <div class="hdr-r">
        <span class="doc-off">Official Academy Document</span>
        <span class="doc-type">Academic Transcript</span>
      </div>
    </div>
    <div class="gstrip"></div>
    <div class="stu-band">
      <div class="stu-fields">
        <div><span class="flbl">Student Name</span><span class="fval">${name}</span></div>
        <div><span class="flbl">Course / Programme</span><span class="fval">${COURSE_TITLE}</span></div>
        <div><span class="flbl">Completion Date</span><span class="fval">${date}</span></div>
        <div><span class="flbl">Certificate Reference</span><span class="fval">${certNo}</span></div>
      </div>
      <div class="badge"><span class="bval">${result}</span><span class="blbl">Overall Result</span></div>
    </div>
    <div class="stitle"><span class="slbl">Modules Completed</span><div class="srule"></div></div>
    <table class="mod-table"><tbody>${modRows}</tbody></table>
    <div class="stitle"><span class="slbl">Programme Summary</span><div class="srule"></div></div>
    <div class="sum-band">
      <div class="sum-head">${COURSE_TITLE} &bull; ${COURSE_TYPE} &bull; Sinotheni Events Training Academy</div>
      <div class="sum-grid">
        <div class="scell"><span class="sclbl">Student Name</span><span class="scval">${name}</span></div>
        <div class="scell"><span class="sclbl">Course Name</span><span class="scval">${COURSE_TITLE}</span></div>
        <div class="scell"><span class="sclbl">Completion Date</span><span class="scval">${date}</span></div>
        <div class="scell"><span class="sclbl">Modules Completed</span><span class="scval">${modules.length} of ${modules.length}</span></div>
        <div class="scell hi"><span class="sclbl">Overall Result</span><span class="scval">${result}</span></div>
      </div>
    </div>
    <div class="stitle"><span class="slbl">Examiner Remarks</span><div class="srule"></div></div>
    <div class="rem"><span class="rlbl">Academic Evaluation</span><div class="rtxt">${remarks}</div></div>
    <div class="ftr">
      <div><span class="fsv">Sinotheni Events Academy</span><div class="fsl"></div><span class="fll">Authorised By</span></div>
      <div class="freg"><span class="gld">Sinotheni Events Training Academy</span><br>Reg No: K2021422957 &bull; academy@sinothenievents.co.za</div>
      <div><span class="fdv">${date}</span><span class="fdl">Date Issued</span></div>
    </div>
  </div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},700);});</script>
</body>
</html>`;
}

function notesHTML(chapter) {
  const corner = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M3 3 L3 16 M3 3 L16 3" stroke="#C9A84C" stroke-width="1.5"/><circle cx="3" cy="3" r="1.8" fill="#C9A84C"/></svg>`;
  const renderSlide = (slide) => {
    const h = `<div style="font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:700;color:#0A0A0A;border-left:3px solid #C9A84C;padding-left:3mm;margin:4mm 0 2mm;">${slide.title}</div>`;
    if (slide.type === 'body' || slide.type === 'intro') return h + `<div style="font-family:'Montserrat',sans-serif;font-size:8.5pt;line-height:1.85;color:#333;white-space:pre-line;">${slide.body}</div>`;
    if (slide.type === 'list') return h + (slide.intro ? `<div style="font-size:7.5pt;color:#777;margin-bottom:1.5mm;font-style:italic;">${slide.intro}</div>` : '') + slide.items.map(t => `<div style="display:flex;align-items:flex-start;gap:2mm;font-size:8.5pt;color:#333;line-height:1.7;padding:0.5mm 0;border-bottom:1px solid rgba(220,210,200,0.4);"><span style="display:inline-block;width:5px;height:5px;background:#C9A84C;transform:rotate(45deg);flex-shrink:0;margin-top:2.5mm;"></span>${t}</div>`).join('');
    if (slide.type === 'highlight') return h + slide.points.map(p => `<div style="display:flex;align-items:flex-start;gap:2mm;padding:2mm 3mm;background:#fff;border-left:2.5px solid #C9A84C;margin-bottom:1.5mm;font-size:8.5pt;color:#333;line-height:1.7;"><span style="display:inline-block;width:5px;height:5px;background:#C9A84C;border-radius:50%;flex-shrink:0;margin-top:2.5mm;"></span>${p.text}</div>`).join('');
    if (slide.type === 'steps') return h + (slide.intro ? `<div style="font-size:7.5pt;color:#777;margin-bottom:2mm;font-style:italic;">${slide.intro}</div>` : '') + slide.steps.map(s => `<div style="display:flex;gap:3mm;align-items:flex-start;padding:2mm 3mm;background:#F0EDE8;border-left:2.5px solid #DDD6CC;margin-bottom:1.5mm;"><div style="width:18px;height:18px;background:#C9A84C;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:12pt;font-weight:700;color:#0A0A0A;flex-shrink:0;">${s.number}</div><div><div style="font-size:8.5pt;font-weight:700;color:#0A0A0A;margin-bottom:1mm;">${s.label}</div><div style="font-size:8pt;color:#666;line-height:1.65;">${s.detail}</div></div></div>`).join('');
    if (slide.type === 'two-col') return h + `<div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;"><div style="padding:2mm;background:#f0faf5;border:1px solid #c3e8d1;"><div style="font-size:7pt;font-weight:700;color:#2d7a45;margin-bottom:1.5mm;">${slide.left.heading}</div>${slide.left.items.map(t => `<div style="font-size:7.5pt;color:#333;line-height:1.6;padding:0.5mm 0 0.5mm 2mm;">+ ${t}</div>`).join('')}</div><div style="padding:2mm;background:#fff5f5;border:1px solid #f5c6c6;"><div style="font-size:7pt;font-weight:700;color:#c0392b;margin-bottom:1.5mm;">${slide.right.heading}</div>${slide.right.items.map(t => `<div style="font-size:7.5pt;color:#333;line-height:1.6;padding:0.5mm 0 0.5mm 2mm;">&#x2717; ${t}</div>`).join('')}</div></div>`;
    return h;
  };
  const slides = chapter.slides.map(renderSlide).join('<div style="height:3mm;border-bottom:1px dashed #DDD6CC;margin:2mm 0;"></div>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${chapter.title} - Module Notes</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 297mm;margin:0;}
html,body{background:#FAF7F2;font-family:'Montserrat',sans-serif;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0A0A0A;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px;}
.savebar p{font-size:11px;color:#FAF7F2;letter-spacing:0.5px;margin:0;}
.savebar button{background:#C9A84C;color:#0A0A0A;border:none;padding:10px 22px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;cursor:pointer;}
.page{width:210mm;min-height:297mm;background:#FAF7F2;margin:56px auto 0;}
.phdr{background:#0A0A0A;padding:4.5mm 6mm;display:flex;justify-content:space-between;align-items:center;position:relative;}
.phdr-l{display:flex;align-items:center;gap:3mm;}
.pmono{font-family:'Cinzel',serif;font-size:13pt;font-weight:900;color:#C9A84C;letter-spacing:2px;line-height:1;}
.pbn{font-family:'Cormorant Garamond',serif;font-size:8.5pt;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;display:block;}
.pbs{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;display:block;margin-top:1px;}
.phdr-r{text-align:right;}
.pdlbl{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2.5px;color:#444;text-transform:uppercase;display:block;}
.pdname{font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2px;color:#C9A84C;text-transform:uppercase;display:block;margin-top:1px;}
.gstrip{height:2px;background:linear-gradient(90deg,transparent,#A07830,#C9A84C,#E0C97A,#C9A84C,#A07830,transparent);}
.tag-row{padding:3mm 6mm 1mm;display:flex;align-items:center;gap:3mm;}
.pill{background:#C9A84C;color:#0A0A0A;font-size:5pt;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:1.5mm 3mm;}
.tagmod{font-size:5.5pt;letter-spacing:2px;color:#A07830;text-transform:uppercase;}
.ptitle{font-family:'Cormorant Garamond',serif;font-size:17pt;font-weight:700;color:#0A0A0A;padding:0 6mm 1mm;line-height:1.2;}
.psub{font-size:6pt;color:#999;letter-spacing:0.5px;padding:0 6mm 3mm;border-bottom:1px solid #DDD6CC;}
.content{padding:4mm 6mm 6mm;}
.pftr{padding:2.5mm 6mm;border-top:1px solid #DDD6CC;display:flex;justify-content:space-between;align-items:center;}
.ftext{font-size:4pt;letter-spacing:1.5px;color:#ccc;text-transform:uppercase;}
.ftext .gld{color:#C9A84C;}
@media print{.savebar{display:none;}.page{margin:0;}}
</style>
</head>
<body>
<div class="savebar"><button onclick="try{window.close();}catch(e){history.back();}" style="background:transparent;border:1px solid #444;color:#888;padding:7px 12px;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;cursor:pointer;">&#8592; Back to course</button><p>Destination: <strong>Save as PDF</strong></p><button onclick="window.print()">Save as PDF</button></div>
<div class="page">
  <div class="phdr">
    <div class="phdr-l">
      <div class="pmono">SE</div>
      <div><span class="pbn">Sinotheni Events</span><span class="pbs">Training Academy</span></div>
    </div>
    <div class="phdr-r">
      <span class="pdlbl">${COURSE_TITLE}</span>
      <span class="pdname">Module Notes</span>
    </div>
  </div>
  <div class="gstrip"></div>
  <div class="tag-row">
    <span class="pill">Module ${String(chapter.id).padStart(2,'0')}</span>
    <span class="tagmod">${COURSE_TITLE} &bull; ${COURSE_TYPE}</span>
  </div>
  <div class="ptitle">${chapter.title}</div>
  <div class="psub">${chapter.subtitle || ''}</div>
  <div class="content">${slides}</div>
  <div class="pftr">
    <span class="ftext"><span class="gld">Sinotheni Events</span> Training Academy</span>
    <span class="ftext">Module ${String(chapter.id).padStart(2,'0')} of ${MODULE_NAMES.length}</span>
  </div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},700);});</script>
</body>
</html>`;
}

function resourcePackHTML() {
  const ph = (sec, title, sub) => `<div style="background:#0A0A0A;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;align-items:center;gap:3mm;"><div style="font-family:'Cinzel',serif;font-size:12pt;font-weight:900;color:#C9A84C;letter-spacing:2px;line-height:1;">SE</div><div><span style="font-family:'Cormorant Garamond',serif;font-size:8pt;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;display:block;">Sinotheni Events</span><span style="font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;display:block;">Training Academy</span></div></div><div style="text-align:right;"><span style="font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2.5px;color:#444;text-transform:uppercase;display:block;">Waiters 101</span><span style="font-family:'Montserrat',sans-serif;font-size:4pt;letter-spacing:2px;color:#C9A84C;text-transform:uppercase;display:block;">Practical Resource Pack</span></div></div><div style="height:2px;background:linear-gradient(90deg,transparent,#A07830,#C9A84C,#E0C97A,#C9A84C,#A07830,transparent);"></div><div style="padding:2.5mm 6mm 1mm;display:flex;align-items:center;gap:3mm;"><span style="background:#C9A84C;color:#0A0A0A;font-size:5pt;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:1.5mm 3mm;">Section ${sec}</span></div><div style="font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:700;color:#0A0A0A;padding:0 6mm 1mm;line-height:1.2;">${title}</div><div style="font-size:6pt;color:#999;letter-spacing:0.5px;padding:0 6mm 3mm;border-bottom:1px solid #DDD6CC;">${sub}</div>`;
  const pf = (sec) => `<div style="padding:2mm 6mm;border-top:1px solid #DDD6CC;display:flex;justify-content:space-between;"><span style="font-size:4pt;letter-spacing:1.5px;color:#ccc;text-transform:uppercase;"><span style="color:#C9A84C;">Sinotheni Events</span> Training Academy</span><span style="font-size:4pt;letter-spacing:1.5px;color:#ccc;text-transform:uppercase;">Waiters 101 &bull; ${sec}</span></div>`;
  const ci = (t) => `<div style="display:flex;align-items:flex-start;gap:2mm;padding:1mm 0;border-bottom:1px solid rgba(220,210,200,0.5);"><div style="width:9px;height:9px;border:1.5px solid #C9A84C;flex-shrink:0;margin-top:1mm;"></div><div style="font-family:'Montserrat',sans-serif;font-size:7.5pt;color:#333;line-height:1.5;">${t}</div></div>`;
  const sh = (t) => `<div style="font-family:'Montserrat',sans-serif;font-size:5pt;font-weight:700;letter-spacing:3px;color:#C9A84C;text-transform:uppercase;margin:2.5mm 0 1.5mm;display:flex;align-items:center;gap:2mm;">${t}<span style="flex:1;height:1px;background:#DDD6CC;display:inline-block;"></span></div>`;
  const sc = (q, a) => `<div style="background:#F0EDE8;border-left:2px solid #C9A84C;padding:2mm 2.5mm;margin-bottom:1.5mm;"><div style="font-family:'Cormorant Garamond',serif;font-size:9pt;font-weight:600;color:#0A0A0A;margin-bottom:1mm;font-style:italic;">"${q}"</div><div style="font-size:7pt;color:#555;line-height:1.6;">${a}</div></div>`;
  const card = (l, t, b) => `<div style="border:1px solid #DDD6CC;padding:2mm;background:#FAF7F2;"><div style="width:16px;height:16px;background:#C9A84C;display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:10pt;font-weight:700;color:#0A0A0A;margin-bottom:1.5mm;">${l}</div><div style="font-size:5.5pt;font-weight:700;color:#0A0A0A;letter-spacing:0.5px;margin-bottom:1mm;text-transform:uppercase;">${t}</div><div style="font-size:6.5pt;color:#666;line-height:1.6;">${b}</div></div>`;
  const ss = (n, t, b) => `<div style="display:flex;gap:2mm;align-items:flex-start;padding:1.5mm;border-bottom:1px solid rgba(220,210,200,0.5);"><div style="width:14px;height:14px;background:#C9A84C;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:10pt;font-weight:700;color:#0A0A0A;flex-shrink:0;">${n}</div><div><strong style="font-size:7.5pt;color:#0A0A0A;">${t}</strong> <span style="font-size:7pt;color:#555;line-height:1.5;">${b}</span></div></div>`;
  const ali = (name, desc) => `<div style="display:flex;align-items:flex-start;gap:2mm;padding:1mm 0;border-bottom:1px solid rgba(220,210,200,0.5);"><div style="width:5px;height:5px;background:#C9A84C;transform:rotate(45deg);flex-shrink:0;margin-top:2mm;"></div><div style="font-size:7.5pt;color:#333;line-height:1.5;"><strong>${name}</strong> ${desc}</div></div>`;
  const rc = (title, body) => `<div style="border:1px solid #DDD6CC;padding:2mm;background:#FAF7F2;"><div style="font-size:6pt;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:1px;margin-bottom:1.5mm;">${title}</div><div style="font-size:6.5pt;color:#555;line-height:1.6;">${body}</div></div>`;
  const gr = (t) => `<div style="background:#0A0A0A;padding:2mm 3mm;margin:2mm 0;display:flex;align-items:center;gap:2mm;"><div style="width:6px;height:6px;background:#C9A84C;border-radius:50%;flex-shrink:0;"></div><p style="font-size:7pt;color:#FAF7F2;line-height:1.6;margin:0;">${t}</p></div>`;
  const np = '';
  const wp = (content, sec, title, sub) => `<div style="width:210mm;min-height:297mm;background:#FAF7F2;display:flex;flex-direction:column;">${ph(sec,title,sub)}<div style="flex:1;padding:3mm 6mm 2mm;">${content}</div>${pf(sec)}</div>${np}`;
  const secA = wp(
    sh('Appearance') + ci('Uniform clean, ironed and in good condition') + ci('Shirt fully tucked in') + ci('Shoes clean, polished and non-slip') + ci('Hair clean, tidy and secured') + ci('Nails short, clean, no nail polish') + ci('Apron tied correctly and clean') + ci('Name badge straight and visible if issued') +
    sh('Station and Equipment') + ci('Tables set correctly per cover requirements') + ci('Water jugs filled and chilled') + ci('Order pad and pen ready before briefing') + ci('Briefing attended and notes taken') + ci('Section confirmed with supervisor') + ci('Service station clean and stocked') +
    sh('Menu Knowledge') + ci('Menu reviewed and understood') + ci('Specials and unavailable items noted') + ci('Dietary requirements for today confirmed with kitchen') + ci('Able to describe each dish in one or two clear sentences') +
    sh('End-of-Shift Checklist') + ci('Tables cleared, reset or stripped per instructions') + ci('Station left clean and stocked for next service') + ci('Any incidents or complaints reported to supervisor') + ci('Signed off by supervisor before leaving'),
    'A', 'Pre-Shift Checklist', 'Complete before every shift. Sign off each item before entering the floor.');
  const secB = wp(
    sh('Order of Service') +
    ss('1','Acknowledge guests within 30 seconds','of being seated, even if only with eye contact and a nod.') +
    ss('2','Greet and present menus.','Greet warmly. Pour water without being asked.') +
    ss('3','Take orders.','Pen and pad ready. Listen carefully. Repeat the full order back before leaving the table.') +
    ss('4','Serve food from the left.','Ladies first, then gentlemen, host last. Announce each dish briefly.') +
    ss('5','Check back after two bites.','Ask if everything is to their satisfaction while there is still time to correct it.') +
    ss('6','Refill water proactively.','Do not wait for the guest to ask or for the glass to run empty.') +
    ss('7','Clear from the right','when every guest at the table has finished. Never clear while someone is still eating.') +
    ss('8','Crumb the table','after clearing a course, before the next course arrives.') +
    ss('9','Reset covers','for the next course as needed.') +
    ss('10','Present the bill','when the guest signals. Never rush it.') +
    sh('Key Rules') + ci('Serve from the left, clear from the right') + ci('Move in one direction around the table') + ci('Never reach across a guest') + ci('All plates at a table arrive at the same time') + ci('Pour from the right without touching the rim'),
    'B', 'Service Sequence Quick Reference', 'The correct sequence for formal table service. Apply consistently at every table, every shift.');
  const secC = wp(
    sh('What Guest Behaviour Tells You') +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:2mm;">` +
    rc('Looking around the room','The guest is looking for you. Approach immediately and acknowledge them.') +
    rc('Leaning in, talking quietly','The table is in deep conversation. Do not interrupt. Attend to needs silently.') +
    rc('Plates pushed to the side','Guest has finished. Confirm all guests are done before clearing.') +
    rc('Checking the time or looking restless','Guest may want the bill or is waiting on something. Check in quietly.') +
    rc('Menu still open after 5 minutes','Guest may need guidance. Offer to help or recommend a dish.') +
    rc('Glass at three-quarter mark','A refill will be needed soon. Top up water proactively.') +
    '</div>' +
    sh('When to Approach and When to Step Back') +
    ci('Approach: when a guest looks up or scans the room') + ci('Approach: within 30 seconds of seating') + ci('Approach: at natural pauses between courses') + ci('Step back: during deep conversation at the table') + ci('Step back: when guests are celebrating privately') + ci('Step back: immediately after placing dishes') +
    gr('The goal is to be present when the guest needs you and invisible when they do not. <strong style="color:#C9A84C;">Anticipation is learned by watching.</strong>'),
    'C', 'Reading the Table: Guest Psychology', 'Understanding what guests need before they ask. The highest skill in professional service.');
  const secD = wp(
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:2mm;">` +
    card('L','Listen','Let them finish completely. No interrupting. Face them, make eye contact, nod. They must feel heard first.') +
    card('A','Acknowledge','"I completely understand." Show you have heard them and that their experience matters.') +
    card('A','Apologise','"I am very sorry." Sincerely, before any explanation. No but. No because. Just the apology.') +
    card('R','Resolve','Tell them exactly what you will do. Do it immediately. Return personally to confirm it is closed.') +
    '</div>' +
    sh('The F: Follow Up') + sc('After resolving a complaint','Check back discreetly. "I hope everything is better now." Do not draw attention to what went wrong. Just close the loop.') +
    sh('Common Situations') +
    sc('Wrong dish','Apologise, remove it immediately, confirm the correct order with the kitchen, return as quickly as possible.') +
    sc('Cold food','Apologise and take it to be replaced. Do not reheat it in view of the guest.') +
    sc('Long wait','Acknowledge the delay before the guest raises it. Give an honest timeframe and check in regularly.') +
    sc('Rude or inattentive service','Apologise sincerely and take full ownership. Never blame a colleague in front of a guest.') +
    gr('<strong style="color:#C9A84C;">Never argue with a guest, even when you believe they are wrong.</strong> Your goal is to restore their experience, not to win the point.'),
    'D', 'Complaint Handling Framework', 'The L.A.A.R.F method. Apply to every complaint, every time, regardless of who was at fault.');
  const secE = wp(
    sh('Common Dietary Requirements') +
    ali('Vegetarian','No meat, poultry or seafood. Dairy and eggs usually acceptable.') +
    ali('Vegan','No animal products at all. Confirm every component with the kitchen.') +
    ali('Gluten-free','No wheat, rye, barley or oats. Cross-contamination is a serious risk.') +
    ali('Halaal','No pork, no alcohol in preparation. Confirm kitchen compliance first.') +
    ali('Kosher','Strict dietary laws. Confirm with the caterer before advising the guest.') +
    ali('Nut allergy','Potentially life-threatening. Confirm with the kitchen every time, no exceptions.') +
    ali('Dairy-free','No milk, butter, cream or cheese in any form.') +
    ali('Diabetic','Low sugar, low refined carbohydrates. Confirm with the kitchen.') +
    sh('When a Guest Has a Dietary Requirement') +
    ss('1','Take the full order first.','Record the requirement clearly on your order pad.') +
    ss('2','Confirm with the kitchen.','Go directly and ask. Get a clear yes or no. Do not guess.') +
    ss('3','Return to the guest with a clear answer.','Confirm what is available, repeat the modified order back.') +
    ss('4','Mark the requirement on the docket.','A spoken note that does not reach the kitchen has not been communicated.') +
    sh('Never Do This') + ci('Never tell a guest a dish is safe without confirming with the kitchen') + ci('Never guess based on how a dish looks or what you think it contains') + ci('Never treat a dietary requirement as a preference or inconvenience') + ci('Never forget to mark the requirement on the docket'),
    'E', 'Menu and Allergen Awareness Guide', 'Quick reference for common dietary requirements. Always confirm with the kitchen. Never guess.');
  const secF = wp(
    sh('How to Use This Section') +
    `<div style="font-size:7.5pt;color:#555;line-height:1.7;margin-bottom:2mm;">Read each scenario then say out loud or write down exactly how you would handle it on a real shift. The goal is speed, accuracy and confident handling of modifications.</div>` +
    sh('Scenario 1: Standard Table Order') + sc('Table of 4: two beef burgers (one well-done), one chicken salad, one vegetarian pasta. Two sparkling waters, two still.','Enter each item separately. Note the modification: one burger well-done. Enter drinks as a separate round. Check: is the pasta dairy-free if needed?') +
    sh('Scenario 2: Dietary Modification') + sc('Guest orders grilled chicken but is gluten-free. The sauce contains flour.','Take the order. Go to the kitchen before finalising. Confirm a gluten-free sauce alternative. Return to guest and confirm. Note the change clearly on the docket.') +
    sh('Scenario 3: Split Bill') + sc('Table of 3 wants to pay separately. Guest A: R185 main + R45 drink. Guest B: two mains at R165 each. Guest C: R95 starter + R175 main.','Split by guest in the POS. A = R230, B = R330, C = R270. Confirm each total with the guest before processing.') +
    sh('Scenario 4: Void and Re-enter') + sc('You entered a medium steak but the guest ordered medium-rare. The kitchen has not started it.','Void the incorrect item and re-enter with the correct specification. Inform the kitchen of the change. Confirm with the guest.') +
    gr('On any POS system: <strong style="color:#C9A84C;">accuracy before speed.</strong> A wrong order sent to the kitchen costs more time than taking 10 extra seconds to enter it correctly.'),
    'F', 'POS Practice Scenarios', 'Common order entry situations. Practice these to become fast and accurate on any POS system.');
  const trackerRows = ['Uniform and grooming standard','Punctuality and reliability','Pre-shift checklist completed','Menu knowledge and description','Dietary requirement handling','Table greeting within 30 seconds','Order taking accuracy','Order repeated back before leaving','Plate carrying technique','Serving from the correct side','Clearing timing and technique','Proactive water service','Reading the table and anticipating needs','Complaint handling using L.A.A.R.F','Team communication and support','POS system accuracy','Composure under pressure'].map(s => `<tr><td style="font-size:6.5pt;font-weight:600;color:#0A0A0A;padding:1.5mm 2mm;border:1px solid #DDD6CC;background:#F0EDE8;">${s}</td><td style="border:1px solid #DDD6CC;padding:1.5mm;min-width:15mm;"></td><td style="border:1px solid #DDD6CC;padding:1.5mm;min-width:15mm;"></td><td style="border:1px solid #DDD6CC;padding:1.5mm;min-width:15mm;"></td><td style="border:1px solid #DDD6CC;padding:1.5mm;min-width:15mm;"></td></tr>`).join('');
  const secG = wp(
    `<div style="font-size:7pt;color:#555;line-height:1.7;margin-bottom:2.5mm;">Rate yourself honestly at the end of each week: 1 = needs practice, 2 = developing, 3 = confident. Sign off with your supervisor each week.</div>` +
    `<table style="width:100%;border-collapse:collapse;">` +
    `<thead><tr><th style="background:#0A0A0A;color:#C9A84C;font-size:5pt;letter-spacing:2px;text-transform:uppercase;padding:1.5mm 2mm;text-align:left;width:45%;">Skill</th><th style="background:#0A0A0A;color:#C9A84C;font-size:5pt;letter-spacing:2px;text-transform:uppercase;padding:1.5mm;text-align:center;">Week 1</th><th style="background:#0A0A0A;color:#C9A84C;font-size:5pt;letter-spacing:2px;text-transform:uppercase;padding:1.5mm;text-align:center;">Week 2</th><th style="background:#0A0A0A;color:#C9A84C;font-size:5pt;letter-spacing:2px;text-transform:uppercase;padding:1.5mm;text-align:center;">Week 3</th><th style="background:#0A0A0A;color:#C9A84C;font-size:5pt;letter-spacing:2px;text-transform:uppercase;padding:1.5mm;text-align:center;">Week 4</th></tr></thead>` +
    `<tbody>${trackerRows}</tbody></table>` +
    `<div style="margin-top:2mm;font-size:6pt;color:#aaa;">Rating: 1 = needs practice &bull; 2 = developing &bull; 3 = confident</div>`,
    'G', '30-Day Skills Development Tracker', 'Track your progress across your first 30 days in a professional hospitality setting.');
  const coverHtml = `<div style="background:#0A0A0A;width:210mm;height:297mm;page-break-after:always;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:16mm 12mm;text-align:center;position:relative;">
<div style="position:absolute;inset:5mm;border:1px solid rgba(201,168,76,0.2);"></div>
<div>
  <div style="font-family:'Cinzel',serif;font-size:26pt;font-weight:900;color:#C9A84C;letter-spacing:6px;line-height:1;">SE</div>
  <div style="font-family:'Montserrat',sans-serif;font-size:7pt;font-weight:700;letter-spacing:6px;color:#fff;text-transform:uppercase;margin-top:2mm;">Sinotheni Events</div>
  <div style="font-family:'Montserrat',sans-serif;font-size:5.5pt;letter-spacing:5px;color:#C9A84C;text-transform:uppercase;margin-top:1mm;">Training Academy</div>
</div>
<div>
  <div style="width:55%;height:1px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:0 auto 5mm;"></div>
  <div style="font-size:5.5pt;letter-spacing:4px;color:#444;text-transform:uppercase;margin-bottom:3mm;">Waiters 101 &bull; Short Course</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:28pt;font-weight:300;color:#fff;line-height:1.1;">Practical</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:28pt;font-weight:700;color:#C9A84C;line-height:1.1;">Resource Pack</div>
  <div style="font-size:5pt;letter-spacing:3px;color:#333;text-transform:uppercase;margin-top:2mm;">Workplace Tools &bull; Checklists &bull; Reference Guides</div>
  <div style="width:55%;height:1px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);margin:5mm auto 0;"></div>
</div>
<div>
  <div style="font-size:5pt;letter-spacing:4px;color:#C9A84C;text-transform:uppercase;margin-bottom:3mm;">Contents</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">A &bull; Pre-Shift and Station Checklists</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">B &bull; Service Sequence Quick Reference</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">C &bull; Reading the Table: Guest Psychology</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">D &bull; Complaint Handling Framework</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">E &bull; Menu and Allergen Awareness Guide</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">F &bull; POS Practice Scenarios</div>
  <div style="font-size:5.5pt;color:#3a3a3a;line-height:2.1;">G &bull; 30-Day Skills Development Tracker</div>
</div>
</div>${np}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Waiters 101 Practical Resource Pack</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&family=Cinzel:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:210mm 297mm;margin:0;}
html,body{background:#FAF7F2;font-family:'Montserrat',sans-serif;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0A0A0A;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;z-index:999;gap:12px;}
.savebar p{font-size:11px;color:#FAF7F2;letter-spacing:0.5px;margin:0;}
.savebar button{background:#C9A84C;color:#0A0A0A;border:none;padding:10px 22px;font-family:'Montserrat',sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;cursor:pointer;}
@media print{.savebar{display:none;} body{margin:0;}}
</style>
</head>
<body>
<div class="savebar"><button onclick="try{window.close();}catch(e){history.back();}" style="background:transparent;border:1px solid #444;color:#888;padding:7px 12px;font-family:'Montserrat',sans-serif;font-size:9px;font-weight:600;letter-spacing:1.5px;cursor:pointer;">&#8592; Back to course</button><p>Destination: <strong>Save as PDF</strong> | Multiple pages</p><button onclick="window.print()">Save as PDF</button></div>
${coverHtml}${secA}${secB}${secC}${secD}${secE}${secF}${secG}
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},700);});</script>
</body>
</html>`;
}

function resourceHTML(res) { return resourcePackHTML(); }

function printDoc(html) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups for this site, then tap the button again."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function downloadNotes(chapter) { printDoc(notesHTML(chapter)); }
function downloadResource(res) { printDoc(resourceHTML(res)); }

function Slide({ slide }) {
  const h = { fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:BK, marginBottom:16, borderLeft:`4px solid ${G}`, paddingLeft:14 };
  const item = (txt,i,good=true) => (
    <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
      <span style={{ color:good?"#2d7a45":"#c0392b", flexShrink:0, marginTop:2, fontWeight:700 }}>{good?"+":"✗"}</span>
      <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12.5, color:"#444", lineHeight:1.75 }}>{txt}</span>
    </div>
  );
  return (
    <div>
      {slide.type !== "intro" && <div style={h}>{slide.title}</div>}
      {(slide.type === "body" || slide.type === "intro") && (<div>{slide.type === "intro" && <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:700, color:BK, marginBottom:16 }}>{slide.title}</div>}<div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, color:"#444", lineHeight:1.95, whiteSpace:"pre-line" }}>{slide.body}</div></div>)}
      {slide.type === "list" && (<div>{slide.intro && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, color:"#666", marginBottom:14, lineHeight:1.7 }}>{slide.intro}</div>}{slide.items.map((t,i) => item(t,i))}</div>)}
      {slide.type === "highlight" && (<div>{slide.points.map((p,i) => (<div key={i} style={{ background:CR, border:"1px solid #e8e0d0", borderTop:`3px solid ${G}`, borderRadius:6, padding:"12px 16px", marginBottom:10, display:"flex", gap:12, alignItems:"flex-start" }}><span style={{ width:7, height:7, borderRadius:"50%", background:G, flexShrink:0, marginTop:6, display:"inline-block" }}></span><span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12.5, color:"#333", lineHeight:1.7 }}>{p.text}</span></div>))}</div>)}
      {slide.type === "two-col" && (<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>{[slide.left,slide.right].map((col,ci) => (<div key={ci} style={{ background:ci===0?"#f0faf5":"#fff5f5", border:`1px solid ${ci===0?"#c3e8d1":"#f5c6c6"}`, borderRadius:7, padding:"16px" }}><div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, fontWeight:700, color:ci===0?"#2d7a45":"#c0392b", marginBottom:12, letterSpacing:0.5 }}>{col.heading}</div>{col.items.map((t,i) => item(t,i,ci===0))}</div>))}</div>)}
      {slide.type === "steps" && (<div>{slide.intro && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, color:"#666", marginBottom:18, lineHeight:1.7 }}>{slide.intro}</div>}<div style={{ display:"flex", flexDirection:"column", gap:12 }}>{slide.steps.map((s,i) => (<div key={i} style={{ display:"flex", gap:16, background:CR, borderRadius:8, padding:"14px 16px", border:"1px solid #e8e0d0", alignItems:"flex-start" }}><div style={{ width:42, height:42, borderRadius:"50%", background:G, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:BK, flexShrink:0 }}>{s.number}</div><div><div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:13, fontWeight:600, color:BK, marginBottom:4 }}>{s.label}</div><div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:12, color:"#666", lineHeight:1.7 }}>{s.detail}</div></div></div>))}</div></div>)}
    </div>
  );
}

export default function App() {
  const [_unlocked, _setUnlocked] = useState(() => {
    try { const s = sessionStorage.getItem(sessionKey(COURSE_ID)); if (s) return JSON.parse(s); } catch {}
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
  const [showGuide, setShowGuide] = useState(()=>{try{return !localStorage.getItem('se_guide_seen_w101');}catch{return true;}});
  function dismissGuide(){try{localStorage.setItem('se_guide_seen_w101','1');}catch{}setShowGuide(false);}

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      if (saved.profile) setProfile(saved.profile);
      if (saved.chapterProgress) setChapterProgress(saved.chapterProgress);
      if (saved.chapterTestProgress) setChapterTestProgress(saved.chapterTestProgress);
      if (saved.finalPassed) setFinalPassed(saved.finalPassed);
      if (saved.finalScore !== undefined) setFinalScore(saved.finalScore);
      if (saved.profile?.firstName) setScreen("dashboard");
    }
  }, []);

  if (!_unlocked) {
    return <LockScreen courseId={COURSE_ID} courseTitle={COURSE_TITLE} courseType={COURSE_TYPE} coursePrice={COURSE_PRICE} onUnlock={data => {
      _setUnlocked(data);
      if (data.name) {
        const parts = data.name.trim().split(" ");
        const fn = parts[0] || data.name;
        const ln = parts.slice(1).join(" ") || "";
        setProfile(p => ({...p, firstName:fn, lastName:ln}));
      }
      const saved = loadState();
      setScreen(saved?.profile?.firstName ? "dashboard" : "profile");
    }} />;
  }

  function persist(u){ saveState({profile,chapterProgress,chapterTestProgress,finalPassed,finalScore,...u}); }
  function isUnlocked(ci){ return ci===0 || chapterTestProgress[CHAPTERS[ci-1].id]?.passed===true; }
  function allDone(){ return CHAPTERS.every(ch => chapterTestProgress[ch.id]?.passed); }

  function openChapter(ch){ setActiveChapter(ch); setSlideIdx(0); setScreen("chapter"); }
  function nextSlide(){
    if (slideIdx < activeChapter.slides.length-1) { setSlideIdx(slideIdx+1); }
    else { const cp={...chapterProgress,[activeChapter.id]:{completed:true}}; setChapterProgress(cp); persist({chapterProgress:cp}); startQuiz("chapter",activeChapter); }
  }
  function startQuiz(mode,chapter=null){
    setQuizMode(mode); setQuizChapter(chapter);
    setQuizQs(mode==="chapter"?chapter.questions:FINAL_EXAM);
    setQIdx(0); setQAnswers([]); setQSelected(null);
    setScreen(mode==="chapter"?"chapterTest":"finalExam");
  }
  function submitAnswer(){
    if (qSelected===null) return;
    const ans=[...qAnswers,qSelected];
    if (qIdx+1 < quizQs.length) { setQAnswers(ans); setQIdx(qIdx+1); setQSelected(null); }
    else {
      const score=ans.filter((a,i)=>a===quizQs[i].a).length;
      const pct=Math.round((score/quizQs.length)*100);
      const passed=pct>=60;
      if (quizMode==="chapter") {
        const ctp={...chapterTestProgress,[quizChapter.id]:{passed,score,total:quizQs.length,pct}};
        setChapterTestProgress(ctp); persist({chapterTestProgress:ctp}); setScreen("chapterTestResult");
        if (_unlocked?.code && passed) saveProgress(_unlocked.code, COURSE_ID, `${profile.firstName} ${profile.lastName}`.trim(), {type:"module",moduleId:quizChapter.id,pct,modulesPassed:Object.keys(ctp).filter(k=>ctp[k].passed).length});
      } else {
        const fs={score,total:quizQs.length,pct,passed};
        setFinalScore(fs); setFinalPassed(passed);
        if (passed) updateAcademyStatus({completed:true,completedAt:new Date().toISOString(),score:pct});
        persist({finalPassed:passed,finalScore:fs}); setScreen("examResult");
      }
    }
  }
  function generateDocs(){
    const date=new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"});
    const pct=finalScore.pct;
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the professional conduct and operational standards expected of a front office professional at hotels, lodges and accommodation properties.`;
    const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of front office and reception operations expected across the hospitality industry in South Africa and internationally.`;
    setDocs({remarks,achievement,date}); setScreen("docs");
    if (_unlocked?.code) saveProgress(_unlocked.code, COURSE_ID, `${profile.firstName} ${profile.lastName}`.trim(), {type:"completion",pct,email:profile.email||"",completedAt:new Date().toISOString()});
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

  const Header=()=>(<div style={S.hdr}><div style={{display:"flex",alignItems:"center",gap:14}}><div onClick={()=>screen!=="welcome"&&screen!=="profile"&&setScreen("dashboard")} style={{cursor:"pointer"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:"#fff",letterSpacing:3}}>SINOTHENI EVENTS</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3,marginTop:1}}>TRAINING ACADEMY · SHORT COURSE</div></div><button onClick={()=>{try{window.parent.postMessage("goToAcademy","*")}catch(e){}window.history.back()}} style={{background:"transparent",border:"1px solid #333",color:"#888",padding:"5px 11px",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,cursor:"pointer",borderRadius:2}}>ALL COURSES</button></div>{profile.firstName&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#aaa"}}>Welcome, {profile.firstName}</div>}</div>);

  if(screen==="welcome") return(
    <div style={S.wrap}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <Header/>
      <div style={{background:BK,padding:"52px 22px 0"}}>
        <div style={{maxWidth:840,margin:"0 auto"}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{background:G,color:BK,fontFamily:"'Montserrat',sans-serif",fontSize:8,fontWeight:800,letterSpacing:2,padding:"3px 10px"}}>SHORT COURSE</span>
            <span style={{background:"#1a1a1a",color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,padding:"3px 10px",border:"1px solid #333"}}>{CHAPTERS.length} MODULES</span>
            <span style={{background:"#1a1a1a",color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,padding:"3px 10px",border:"1px solid #333"}}>FULLY ONLINE</span>
          </div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:50,fontWeight:700,color:"#fff",lineHeight:1.0,marginBottom:4}}>{COURSE_TITLE}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Check-in, reservations, guest services and front desk management</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>The complete professional standard for front office and reception operations across the accommodation industry. Eleven modules covering check-in, reservations, guest requests, communications, check-out, security and the skills to run a professional front desk.</div>
          <div style={{display:"flex",gap:14,marginBottom:40,flexWrap:"wrap",alignItems:"flex-start"}}>
            <div style={{background:"#111",border:`2px solid ${G}`,padding:"18px 22px",minWidth:170}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:G,letterSpacing:3,marginBottom:5}}>COURSE FEE</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,color:"#fff",lineHeight:1}}>R {COURSE_PRICE}</div>
              <div style={{borderTop:"1px solid #222",marginTop:12,paddingTop:12}}>{["Once-off payment","Certificate included","Lifetime access","Fully online"].map((f,i)=>(<div key={i} style={{display:"flex",gap:7,marginBottom:5,alignItems:"center"}}><div style={{width:4,height:4,borderRadius:"50%",background:G}}/><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa"}}>{f}</div></div>))}</div>
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginBottom:12}}>{[[`${CHAPTERS.length}`,"Modules"],[`${FINAL_EXAM.length}Q`,"Final Exam"],["60%","Pass Mark"],["3-4hr","Study Time"]].map(([val,label])=>(<div key={label} style={{background:"#111",padding:"12px 16px"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:G}}>{val}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"#777",letterSpacing:2,marginTop:2}}>{label.toUpperCase()}</div></div>))}</div>
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
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"32px 20px"}}><div style={S.card}><span style={S.tag}>{`ENROLMENT · ${COURSE_TITLE.toUpperCase()}`}</span><div style={S.title}>Your Details</div><div style={S.sub}>Your name will appear on your certificate exactly as entered here.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>FIRST NAME *</label><input style={S.inp} value={profile.firstName||""} onChange={e=>setProfile({...profile,firstName:e.target.value})} placeholder="e.g. Thandi"/></div><div><label style={S.lbl}>LAST NAME *</label><input style={S.inp} value={profile.lastName||""} onChange={e=>setProfile({...profile,lastName:e.target.value})} placeholder="e.g. Dlamini"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>EMAIL ADDRESS *</label><input style={S.inp} type="email" value={profile.email||""} onChange={e=>setProfile({...profile,email:e.target.value})} placeholder="your@email.com"/></div><div style={{marginBottom:20}}><label style={S.lbl}>HIGHEST QUALIFICATION *</label><select style={{...S.inp,appearance:"none"}} value={profile.qualification||""} onChange={e=>setProfile({...profile,qualification:e.target.value})}><option value="">Select qualification</option>{qualifications.map(q=><option key={q} value={q}>{q}</option>)}</select></div>
    {basicReady&&wantsDB===undefined&&(<div style={{background:CR,border:`1px solid ${G}`,borderRadius:7,padding:"17px 19px",marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:5}}>JOB OPPORTUNITIES</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700,color:BK,marginBottom:7}}>Would you like to join our staffing database?</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#666",lineHeight:1.7,marginBottom:15}}>Sinotheni Events contacts qualified professionals for hospitality staffing opportunities.</div><div style={{display:"flex",gap:11}}><button onClick={()=>setProfile({...profile,wantsDB:true})} style={{...S.btn(true),flex:1,fontSize:11}}>YES, ADD ME</button><button onClick={()=>setProfile({...profile,wantsDB:false})} style={{...S.btn(false),flex:1,fontSize:11}}>NO THANKS</button></div></div>)}
    {wantsDB===true&&(<div style={{borderTop:"1px solid #e8e0d0",paddingTop:18,marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:12}}>STAFFING DATABASE DETAILS</div><div style={{marginBottom:13}}><label style={S.lbl}>PHONE NUMBER *</label><input style={S.inp} value={profile.phone||""} onChange={e=>setProfile({...profile,phone:e.target.value})} placeholder="e.g. 0821234567"/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>PROVINCE *</label><select style={{...S.inp,appearance:"none"}} value={profile.province||""} onChange={e=>setProfile({...profile,province:e.target.value})}><option value="">Select province</option>{provinces.map(p=><option key={p} value={p}>{p}</option>)}</select></div><div><label style={S.lbl}>CITY / TOWN *</label><input style={S.inp} value={profile.city||""} onChange={e=>setProfile({...profile,city:e.target.value})} placeholder="e.g. Secunda"/></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13,marginBottom:13}}><div><label style={S.lbl}>DATE OF BIRTH *</label><input style={S.inp} type="date" value={profile.dob||""} onChange={e=>setProfile({...profile,dob:e.target.value})}/></div><div><label style={S.lbl}>AGE *</label><input style={S.inp} type="number" min="16" max="70" value={profile.age||""} onChange={e=>setProfile({...profile,age:e.target.value})} placeholder="e.g. 24"/></div></div><div style={{marginBottom:13}}><label style={S.lbl}>AVAILABILITY *</label><select style={{...S.inp,appearance:"none"}} value={profile.availability||""} onChange={e=>setProfile({...profile,availability:e.target.value})}><option value="">Select availability</option><option value="Weekends only">Weekends only</option><option value="Weekdays only">Weekdays only</option><option value="Weekdays and weekends">Weekdays and weekends</option><option value="Flexible">Flexible, any day</option></select></div></div>)}
    {wantsDB===false&&(<div style={{background:"#f5f5f5",borderRadius:5,padding:"9px 13px",marginBottom:15,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888"}}>Not joining the job database</div><button onClick={()=>setProfile({...profile,wantsDB:undefined})} style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:G,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button></div>)}
    {wantsDB!==undefined&&(<div><div style={{background:CR,border:"1px solid #e8e0d0",borderRadius:5,padding:"13px 16px",marginBottom:18}}><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:G,marginBottom:4}}>COURSE FEE</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,color:BK}}>R {COURSE_PRICE}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888"}}>Once-off · Lifetime access · Certificate included</div></div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa",textAlign:"right"}}>PayFast integration<br/>coming soon</div></div></div><button onClick={()=>{if(canSubmit){persist({profile});updateAcademyStatus({enrolled:true,name:profile.firstName+" "+profile.lastName,startedAt:new Date().toISOString()});if(profile.wantsDB)saveStaffingApplication(profile,COURSE_ID,COURSE_TITLE);setScreen("dashboard")}}} disabled={!canSubmit} style={{...S.btn(true,true),opacity:canSubmit?1:0.4}}>BEGIN MY COURSE</button></div>)}
    </div></div></div>);
  }

  if(screen==="dashboard"){
    const total=Object.values(chapterTestProgress).filter(c=>c.passed).length;
    const pct=Math.round((total/CHAPTERS.length)*100);
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/>
    <div style={{padding:"24px 20px",maxWidth:760,margin:"0 auto"}}>
      <div style={{background:BK,padding:"20px 24px",marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div><span style={S.tag}>{COURSE_TITLE}</span><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:700,color:"#fff",marginBottom:2}}>Welcome back, {profile.firstName}</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666"}}>{total} of {CHAPTERS.length} modules complete · {pct}% progress</div></div>
        <div style={{textAlign:"right"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:38,fontWeight:700,color:G,lineHeight:1}}>{pct}%</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"#555",letterSpacing:2}}>COMPLETE</div></div>
      </div>
      <div style={{height:4,background:"#e0d8cc",borderRadius:2,marginBottom:20}}><div style={{height:"100%",width:`${pct}%`,background:G,borderRadius:2,transition:"width 0.5s"}}/></div>
      {showGuide&&(<div style={{background:BK,border:`1px solid ${G}`,padding:"18px 22px",marginBottom:18,position:"relative"}}>
      <div onClick={dismissGuide} style={{position:"absolute",top:14,right:16,cursor:"pointer",color:"#333",fontSize:18,lineHeight:1}}>&#x2715;</div>
      <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:8}}>WELCOME TO YOUR COURSE</div>
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#fff",marginBottom:14}}>How Your Course Works</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[["1","Work through all 11 modules in order. Each module has 6 slides and a 5-question assessment."],["2","Score 3 out of 5 to pass each module and unlock the next. Retry as many times as you need."],["3","Once all modules are passed, the Final Assessment unlocks: 20 questions, 60% to pass."],["4","Pass the Final Assessment to generate your Certificate of Completion and Academic Transcript."],["5","Download your Practical Resource Pack from the Resources section below at any time."],["6","Need help? Email academy@sinothenievents.co.za and we will respond within 24 hours."]].map(([n,t])=>(
          <div key={n} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <div style={{width:20,height:20,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cormorant Garamond',serif",fontSize:13,fontWeight:700,color:BK,flexShrink:0}}>{n}</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",lineHeight:1.7}}>{t}</div>
          </div>
        ))}
      </div>
      <button onClick={dismissGuide} style={{background:G,color:BK,border:"none",padding:"9px 20px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:800,letterSpacing:2,cursor:"pointer"}}>GOT IT, START LEARNING</button>
    </div>)}
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
          <div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:allDone()?G:"#bbb",marginBottom:3}}>{`FINAL ASSESSMENT · ${FINAL_EXAM.length} QUESTIONS`}</div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:allDone()?"#fff":"#bbb"}}>Final Assessment</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:allDone()?"#aaa":"#ccc",marginTop:2}}>{`${FINAL_EXAM.length} questions across all ${CHAPTERS.length} modules · 60% to pass`}</div>{finalPassed&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#2d7a45",marginTop:3}}>Passed · {finalScore?.pct}%</div>}</div>
          {allDone()&&(<button onClick={()=>finalPassed?generateDocs():startQuiz("final")} style={{...S.btn(true),fontSize:10,padding:"9px 16px"}}>{finalPassed?"GET CERTIFICATE":"START FINAL EXAM"}</button>)}
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
      {ctp?.passed?(<button onClick={()=>setScreen("dashboard")} style={S.btn(true,true)}>{quizChapter.id<CHAPTERS.length?`CONTINUE TO MODULE ${String(quizChapter.id+1).padStart(2,"0")}`:"GO TO FINAL EXAM"}</button>):(<div><div style={{background:"#fde8e8",border:"1px solid #c0392b",borderRadius:7,padding:"11px 14px",marginBottom:11,fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#c0392b",lineHeight:1.7}}>You scored {ctp?.pct}%. You need 60% (3 out of 5) to unlock the next module.</div><div style={{display:"flex",gap:11}}><button onClick={()=>openChapter(quizChapter)} style={{...S.btn(false),flex:1}}>REVIEW MODULE</button><button onClick={()=>startQuiz("chapter",quizChapter)} style={{...S.btn(true),flex:1}}>RETRY TEST</button></div></div>)}
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
    const fullName=`${profile.firstName} ${profile.lastName}`.trim();
    const fs=finalScore||{score:0,total:FINAL_EXAM.length,pct:finalPassed?100:0};
    const dd=docs||(function(){
      const date=new Date().toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"});
      const pct=fs.pct;
      const remarks=`${fullName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the professional conduct and operational standards expected of a front office professional at hotels, lodges and accommodation properties.`;
      const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of front office and reception operations expected across the hospitality industry in South Africa and internationally.`;
      return {remarks,achievement,date};
    })();
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{fullName} · {COURSE_TITLE}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(fullName,fs.score,fs.total,dd.date,dd.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(fullName,dd.date,dd.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the new tab opens, the print dialog appears. Choose <strong>Save as PDF</strong> as the destination, then Save. If the dialog does not open, tap the gold <strong>Save as PDF</strong> button at the top of the page.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
