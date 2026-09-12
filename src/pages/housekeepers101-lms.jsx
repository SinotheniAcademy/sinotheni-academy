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
const STORE_KEY = "se_housekeeping_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "housekeeping";
const COURSE_TITLE = "Accommodation \u0026 Housekeeping Services";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

const MODULE_NAMES = ["Introduction to Housekeeping", "Professional Standards and Conduct", "Room Cleaning Procedures", "Bed Making and Linen Standards", "Bathroom Cleaning and Sanitisation", "Chemical Handling and Equipment", "Laundry and Linen Management", "Servicing Different Room Types", "Guest Privacy, Security and Lost Property", "Health, Safety and Injury Prevention", "Delivering a Five-Star Housekeeping Standard"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Housekeeping", "subtitle": "The housekeeping department's role, responsibilities, standards and where these skills apply", "duration": "20 min", "slides": [{"title": "Welcome to Accommodation and Housekeeping Services", "type": "intro", "body": "The housekeeping department is one of the most operationally significant in any accommodation setting. The cleanliness, presentation and preparation of every guest room is the foundation of the guest's physical experience of a property. A beautifully designed room with an unmade bed, a dusty surface or a poorly cleaned bathroom fails the guest completely.\n\nThis course teaches the professional standards, practical techniques and workplace discipline needed to deliver accommodation service to a consistently high standard. Eleven modules, covering every aspect of housekeeping operations from the opening check to the five-star finish."}, {"title": "The Housekeeping Department's Role", "type": "body", "body": "Housekeeping is responsible for maintaining the cleanliness, order, presentation and condition of every guest room and public area within the property. In a hotel or lodge, this means servicing rooms during occupied stays, preparing rooms for new arrivals, managing linen inventory, coordinating maintenance issues and maintaining the standard of public spaces.\n\nIn most accommodation operations, housekeeping is the largest department by headcount and the one with the highest direct impact on the guest's experience. A guest may never meet the chef, the manager or the reservations team. They will always experience the housekeeping team's work."}, {"title": "Types of Accommodation Settings", "type": "list", "intro": "Housekeeping professionals work across a range of accommodation environments:", "items": ["Hotels: from budget to luxury, each with its own standard and service frequency", "Game and safari lodges: typically high-touch, highly personalised service in a remote setting", "Guesthouses and bed and breakfasts: smaller operations with a more informal but still professional standard", "Serviced apartments: long-stay accommodation requiring a different frequency and approach to standard hotel service", "Conference and events properties: large room volumes, fast turnovers, tight schedules", "Resorts: complex facilities with multiple room categories, suites and villas requiring different service approaches"]}, {"title": "Core Responsibilities of a Housekeeping Professional", "type": "list", "intro": "These responsibilities apply across all accommodation settings:", "items": ["Service guest rooms during occupied stays: make beds, replenish amenities, clean bathroom and general areas", "Prepare departure rooms for the next arrival: deep clean, full linen change, amenity replenishment", "Report any maintenance issues or damage observed in rooms to the appropriate department", "Handle and account for all linen, towels and guest amenities accurately", "Respect the privacy, security and personal property of every guest at all times", "Work to the venue's specific room standard and finishing checklist", "Maintain the cleanliness and presentation of public areas within your assigned responsibilities"]}, {"title": "Why Housekeeping Standards Matter", "type": "body", "body": "A hotel room is a guest's temporary home. The standard of that environment affects their sleep, their comfort, their mood and their overall assessment of the property. Research consistently shows that cleanliness is the single most cited factor in guest satisfaction scores at accommodation properties. It outranks food quality, room size, price and even location in most survey data.\n\nA housekeeping professional who takes genuine pride in the quality of their work and who understands that each room they prepare has a real person about to arrive is the foundation on which every accommodation business rests."}, {"title": "Where These Skills Apply", "type": "body", "body": "The skills developed in this course apply directly in hotels, lodges, guesthouses, resorts, serviced apartments and any accommodation setting in South Africa and internationally. The specific standards and protocols vary by property, but the core competencies, the cleaning technique, the linen standards, the chemical knowledge and the professionalism, travel with you regardless of where you work.\n\nSouth Africa's tourism industry is one of the country's most significant economic contributors. Housekeeping professionals who are trained, consistent and professional are in demand at every level of the accommodation market."}], "questions": [{"q": "Which factor do guests most frequently cite in accommodation satisfaction surveys?", "opts": ["Room size and bed comfort", "Food quality at the hotel restaurant", "Cleanliness of the room and bathroom", "Speed of check-in and check-out"], "a": 2}, {"q": "What is the primary role of the housekeeping department?", "opts": ["Managing the food and beverage facilities at the property", "Maintaining the cleanliness, order, presentation and condition of guest rooms and public areas", "Training all new staff in the property's service standards", "Managing guest check-in and check-out processes"], "a": 1}, {"q": "Which core responsibility applies to every housekeeping professional in every setting?", "opts": ["Managing the budget for linen replacement and amenity purchases", "Training junior staff in room cleaning techniques", "Respecting the privacy, security and personal property of every guest", "Coordinating with the front office on room allocation and pricing"], "a": 2}, {"q": "What does a departure room require that a stay-over service does not?", "opts": ["Only a quick check for damage before the next guest's arrival", "A deep clean, full linen change and full amenity replenishment", "A management inspection before it can be released as clean", "Guest permission to access the room for the cleaning process"], "a": 1}, {"q": "Why is the housekeeping team's work central to the guest's experience?", "opts": ["Housekeeping professionals manage the largest budget of any department in the property", "Most guests interact more with housekeeping staff than any other department", "Every guest experiences the housekeeping team's work whether or not they ever meet them", "The housekeeping department sets the room rate that determines the guest's overall value assessment"], "a": 2}]}, {"id": 2, "title": "Professional Standards and Conduct", "subtitle": "Appearance, behaviour in guest areas, discretion, communication and punctuality", "duration": "20 min", "slides": [{"title": "The Housekeeping Professional's Presence", "type": "body", "body": "Housekeeping professionals work in the most private spaces of a guest's temporary home. The guest's bedroom, their bathroom, their personal belongings, their medications, their valuables: all are encountered during the course of regular room service. This access requires a level of professionalism and discretion that exceeds almost any other hospitality role.\n\nA housekeeping professional who is neat, quiet, efficient and completely trustworthy is invisible to the guest in the best possible way. The guest returns to a perfectly prepared room and feels that magic occurred in their absence. That magic is the work of a skilled, professional housekeeper."}, {"title": "Appearance Standards in a Housekeeping Role", "type": "list", "intro": "The standard for appearance in housekeeping is consistent with all guest-facing hospitality roles:", "items": ["Uniform clean, pressed and in full condition at the start of every shift", "Hair secured and away from the face, particularly when working near linen and open surfaces", "Closed-toe shoes only. Open-toe shoes are a safety hazard in a housekeeping environment.", "No rings or bracelets that could snag linen or scratch surfaces during cleaning", "Minimal jewellery consistent with the venue's specific standard", "Name badge worn correctly where issued", "No strong fragrances. Guest rooms must smell of cleanliness, not of the person who cleaned them."]}, {"title": "Behaviour in Guest Areas and Occupied Rooms", "type": "highlight", "points": [{"text": "Always knock and announce yourself clearly before entering any room: 'Housekeeping' twice, with a pause between. Wait for a response."}, {"text": "If a guest is present when you enter, greet them warmly and ask whether they would like the room serviced now or at a later time. Their preference takes absolute priority."}, {"text": "Do not touch, move or rearrange any guest personal belonging except where necessary to clean. Always return items to the position you found them."}, {"text": "Never sit on guest furniture, use the guest's bathroom facilities or consume anything from the minibar, refrigerator or amenity supplies."}, {"text": "Work quietly. Do not run trolleys noisily down corridors, do not leave doors open unnecessarily and keep personal noise to a minimum in guest areas."}]}, {"title": "Discretion and Privacy", "type": "body", "body": "What you observe in a guest's room during service is confidential in every respect. What a guest keeps in their room, how they live, what medications they take, who they travel with or how their belongings are arranged is information that must never be shared with colleagues, other guests or anyone outside the immediate need-to-know professional context.\n\nThis standard applies even when what you observe seems unusual or interesting. A professional housekeeper enters a room, performs their work to the highest standard and leaves. What they saw in that room stays there."}, {"title": "Professional Communication in Housekeeping", "type": "list", "intro": "Communication standards that apply specifically to the housekeeping role:", "items": ["Report maintenance issues, damage or health and safety concerns to your supervisor immediately, not at the end of the shift", "Communicate with colleagues quietly in guest corridors. Conversations at normal indoor volume are too loud in accommodation areas", "Report any guest request made directly to you to the relevant department immediately and follow up to confirm it was actioned", "If a guest complains about room condition directly to you, apologise, tell them you will address it immediately and inform your supervisor", "Never discuss guests, other staff or internal operations in guest areas"]}, {"title": "Punctuality and Reliability", "type": "body", "body": "Housekeeping operates to a precise schedule. A room that is not ready when a guest arrives is one of the most common and most damaging accommodation failures. The departure room cleaned late delays the entire room ready time. The stay-over skipped because a team member was late means a guest returns to an unserviced room.\n\nA housekeeping professional who arrives on time, works at the correct pace and completes their room allocation to the required standard within their scheduled time is one of the most valuable people in any accommodation operation. Reliability in this role is not secondary to skill. It is equal to it."}], "questions": [{"q": "What should you always do before entering a guest room?", "opts": ["Check whether the Do Not Disturb sign is displayed", "Knock and announce 'Housekeeping' twice with a pause, and wait for a response", "Call the front desk to confirm the guest has left the room", "Check your room assignment sheet to confirm the room is on your list"], "a": 1}, {"q": "What is the correct approach if a guest is present when you enter their room?", "opts": ["Complete the service as quickly as possible to minimise the interruption", "Apologise and return later without asking the guest for their preference", "Greet warmly and ask whether they would like the room serviced now or later. Their preference takes priority.", "Service only the bathroom and make the bed, leaving other tasks for later"], "a": 2}, {"q": "What must a housekeeping professional do if they observe something unusual in a guest's room?", "opts": ["Take note and share the information with a trusted colleague", "Report any health, safety or maintenance concern to a supervisor. Everything else remains confidential.", "Leave a note for the guest explaining what was observed", "Record the observation in the daily housekeeping log for management review"], "a": 1}, {"q": "Why should a maintenance issue be reported immediately rather than at the end of the shift?", "opts": ["End-of-shift reports are not reviewed until the following morning", "A delayed report means the issue may affect the guest's stay or a new arrival's experience", "Maintenance reporting at end of shift is a compliance violation", "Supervisors only accept maintenance reports during the first hour of a shift"], "a": 1}, {"q": "Why is reliability as important as skill in a housekeeping role?", "opts": ["Reliable housekeepers are promoted more quickly in most accommodation settings", "A room not ready when a guest arrives is one of the most common and damaging accommodation failures", "South African labour law requires specific reliability standards for housekeeping roles", "Reliability is tracked by the PMS system and affects the department's budget allocation"], "a": 1}]}, {"id": 3, "title": "Room Cleaning Procedures", "subtitle": "Preparing your trolley, the correct cleaning sequence, guest areas and the final check", "duration": "25 min", "slides": [{"title": "The Systematic Approach", "type": "body", "body": "Room cleaning in a professional accommodation setting is not the same as cleaning a home. It is a precise, systematic process executed to a consistent standard within a defined time allocation. The sequence matters because it prevents re-contaminating cleaned areas and because it ensures nothing is missed regardless of the pressure of the schedule.\n\nEvery property has a specific room standard and a finishing checklist. This module teaches the universal principles behind that standard. Always follow your venue's specific sequence and checklist, which will be built on these same foundations."}, {"title": "Preparing Your Trolley Before the Shift", "type": "steps", "intro": "A well-prepared trolley is the foundation of efficient room service:", "steps": [{"number": "1", "label": "Stock linen correctly", "detail": "Load the trolley with the correct quantities of sheets, pillowcases, duvet covers and towels for your room allocation. Check that all linen is clean and folded correctly."}, {"number": "2", "label": "Load amenities", "detail": "Load the correct quantities of soap, shampoo, conditioner, body lotion, toilet rolls and any other amenity specified by your venue's standard."}, {"number": "3", "label": "Check your cleaning supplies", "detail": "Confirm that all required cleaning chemicals are loaded in the correct labelled containers. Never transfer chemicals into unlabelled bottles."}, {"number": "4", "label": "Prepare your equipment", "detail": "Check that vacuum cleaner, mop, bucket, cloths and all tools are in working condition. Report any faulty equipment before the shift begins."}, {"number": "5", "label": "Check your room list", "detail": "Review your room allocation for the shift. Note any special requirements, VIP rooms or specific instructions."}]}, {"title": "The Correct Room Cleaning Sequence", "type": "steps", "intro": "Follow this sequence in every room to prevent cross-contamination and ensure nothing is missed:", "steps": [{"number": "1", "label": "Enter, ventilate, assess", "detail": "Knock and announce. Open the curtains and windows or adjust aircon to ventilate the room. Do a quick visual assessment for any damage, maintenance issues or unusual items to be reported."}, {"number": "2", "label": "Strip and remove linen first", "detail": "Remove all used linen from the bed before anything else. Bag used linen separately from clean. Never shake used linen in the room."}, {"number": "3", "label": "Clear the room", "detail": "Remove room service items, rubbish and any items requiring disposal. Empty all bins and ashtrays where applicable."}, {"number": "4", "label": "Clean bathroom", "detail": "Complete the full bathroom cleaning sequence before returning to the bedroom. This prevents carrying bathroom contamination into the bedroom area."}, {"number": "5", "label": "Clean bedroom top to bottom", "detail": "Dust from the highest point in the room downward. Clean all surfaces, furniture and fixtures. Vacuum last."}, {"number": "6", "label": "Make the bed", "detail": "Make the bed to the venue's standard with clean linen."}, {"number": "7", "label": "Replenish all amenities", "detail": "Replace toiletries, towels, bottled water and any other items specified by your venue's standard."}, {"number": "8", "label": "Final check", "detail": "Walk the full room using your checklist. Check every surface, every light switch, every corner. This is your quality control step."}]}, {"title": "Cleaning Guest Areas Thoroughly", "type": "list", "intro": "Specific areas that require consistent attention:", "items": ["Surfaces: dust every surface including shelves, the desk, the minibar top, behind the television and picture frames", "Glass and mirrors: clean every mirror and glass surface in the room to a streak-free finish", "Floors: vacuum carpet in overlapping parallel lines, or damp mop hard floors from the back of the room toward the door", "Windows and curtains: wipe window sills, straighten curtains and ensure blinds are aligned", "Light switches and door handles: high-touch surfaces that must be sanitised, not just wiped", "Remote controls and phones: sanitise all high-touch technology items", "Behind and under furniture: do not clean only the visible areas. Check behind headboards and under accessible furniture on a rotating basis"]}, {"title": "The Final Check", "type": "body", "body": "The final check is the step that separates a professional clean from an inadequate one. Before leaving the room, stand at the door and look at the room from the guest's perspective. Does it look perfect? Is the bed symmetrical? Are the curtains aligned? Are all surfaces clear and clean? Is the bathroom door open or closed according to the venue's standard?\n\nA final check that catches a missed wastebasket or a crooked pillow before the guest sees it is a quality control step that costs thirty seconds and protects the entire room's standard. It is not optional."}, {"title": "Efficiency and Time Management", "type": "highlight", "points": [{"text": "Know your room allocation time: the average time allocated per room at your venue. Work within it, not around it."}, {"text": "A systematic approach is always faster than an unsystematic one. The sequence exists to save time as much as to ensure quality."}, {"text": "If you fall behind schedule, notify your supervisor rather than rushing and compromising the standard. A rushed room clean often means a room that needs to be re-done."}, {"text": "Do not allow social conversations or phone use to consume room cleaning time. Focus during service and connect with colleagues during breaks."}]}], "questions": [{"q": "Why does the room cleaning sequence start with stripping and removing linen?", "opts": ["Linen removal requires the most physical effort and should come first when energy is highest", "Removing linen before other tasks prevents used linen from being shaken and contaminating cleaned areas", "The laundry collection schedule requires linen to be bagged early in the morning shift", "Linen removal is the only task that requires two people and must be scheduled at the start"], "a": 1}, {"q": "In what direction should you vacuum carpet in a room?", "opts": ["In circular patterns from the centre of the room outward", "In overlapping parallel lines toward the door", "Starting at the door and working toward the furthest point", "In any direction, as long as the full carpet area is covered"], "a": 1}, {"q": "What surfaces must be sanitised rather than simply wiped in a guest room?", "opts": ["Wooden furniture and fabric headboards", "High-touch surfaces including light switches, door handles, remote controls and phones", "Only the bathroom surfaces that come into contact with running water", "The minibar door handle and the room key card slot"], "a": 1}, {"q": "What should you do if you fall behind your room allocation schedule?", "opts": ["Rush through the remaining rooms to complete the allocation on time", "Notify your supervisor rather than compromising the cleaning standard", "Skip the final check to recover time", "Complete the remaining rooms at a reduced standard and flag them for re-check"], "a": 1}, {"q": "What is the purpose of the final check before leaving the room?", "opts": ["To ensure all amenities have been correctly charged to the guest's account", "To confirm that no personal belongings have been accidentally left by the housekeeper", "To stand at the door and view the room from the guest's perspective, catching anything missed", "To complete the room inspection report that management reviews daily"], "a": 2}]}, {"id": 4, "title": "Bed Making and Linen Standards", "subtitle": "Linen inspection, the correct bed making sequence, pillow placement, turn-down and the presentation standard", "duration": "20 min", "slides": [{"title": "Why Bed Quality Matters", "type": "body", "body": "The bed is the most important element of any guest room. It is the reason the guest is there. A perfectly made bed communicates care, professionalism and a genuine commitment to the guest's comfort. A poorly made bed with misaligned seams, lumpy placement or creased linen communicates the opposite, regardless of how clean everything else is.\n\nIn higher-end accommodation, bed making is treated as a skill requiring training and practice, not simply a task that anyone can do. This module teaches the correct technique that every accommodation professional must master."}, {"title": "Linen Inspection Before Making the Bed", "type": "steps", "intro": "Never put unsatisfactory linen on a guest bed:", "steps": [{"number": "1", "label": "Check every piece for stains", "detail": "Hold the sheet or duvet cover up to the light. Any stain, regardless of how faint, means the linen is returned to laundry and replaced."}, {"number": "2", "label": "Check for damage", "detail": "Holes, tears, worn fabric and pilling are all reasons to reject linen. A guest should never encounter damaged linen on their bed."}, {"number": "3", "label": "Check for correct size", "detail": "Confirm that the linen matches the bed size before beginning to make it. An undersized fitted sheet cannot be made to look professional."}, {"number": "4", "label": "Check that linen is dry", "detail": "Damp linen must never be used. Check particularly in humid conditions or during periods when laundry is operating under pressure."}]}, {"title": "The Correct Bed Making Sequence", "type": "steps", "intro": "Follow this sequence for a professionally made bed:", "steps": [{"number": "1", "label": "Position the mattress protector", "detail": "Confirm the mattress protector is clean and correctly positioned before adding any linen."}, {"number": "2", "label": "Fit the bottom sheet", "detail": "Apply the fitted sheet with all four corners secure and the fabric taut across the entire surface. No wrinkles or loose fabric."}, {"number": "3", "label": "Apply the top sheet or duvet", "detail": "Centre the top sheet or duvet cover on the bed with even overhang on both sides and at the foot. Check the alignment before proceeding."}, {"number": "4", "label": "Fold and tuck", "detail": "Fold the top sheet down over the duvet at the head of the bed in a clean straight line at the venue's specified measurement."}, {"number": "5", "label": "Position pillows", "detail": "Arrange pillows according to your venue's specific standard. Typically: sleeping pillows behind, decorative pillows in front, all symmetrically placed."}, {"number": "6", "label": "Smooth and inspect", "detail": "Smooth the entire bed surface with your palms. Step back and check that the bed is symmetrical, the overhang is even and the presentation is correct."}]}, {"title": "The Presentation Standard", "type": "highlight", "points": [{"text": "A bed that looks professional from three metres away may reveal imperfections on closer inspection. The standard applies at both distances."}, {"text": "The fold at the head of the bed must be straight, even and at the correct depth specified by your venue. This is one of the most immediately visible quality indicators."}, {"text": "Pillow placement must be symmetrical. An off-centre pillow on an otherwise perfectly made bed is the detail a guest notices first."}, {"text": "The duvet or bedspread must hang evenly on both sides and at the foot. Measure if you are unsure. Do not guess."}, {"text": "Any decorative cushions or throws must be positioned according to your venue's standard, not according to your own preference."}]}, {"title": "Turn-Down Service", "type": "body", "body": "Turn-down service is a level of bed making delivered in the early evening to a guest's room while they are typically at dinner. It prepares the room and specifically the bed for sleep. Turn-down typically involves folding back the duvet on one or both sides, placing a welcome amenity such as a chocolate or a note on the pillow, closing the curtains, adjusting the lighting and replacing any used towels.\n\nTurn-down is not a full room service. It is a specific sequence that should be executed quietly and completed without disrupting the room's existing arrangement. The guest should return to a room that feels prepared for sleep, not re-cleaned."}, {"title": "Linen Standards and Replacement", "type": "list", "intro": "Linen management directly affects both guest experience and operational cost:", "items": ["Replace all linen on every departure room. A stay-over service generally replaces only what the guest has indicated should be changed.", "Some properties have moved to an opt-in linen change policy for environmental reasons. Know your venue's policy.", "Used linen must be counted when removed and when delivered to laundry. Accurate linen counts protect against theft and loss.", "Linen left in a guest room longer than the replacement cycle becomes a hygiene issue. Know your venue's maximum linen retention standard.", "Report any significant linen shortage to your supervisor immediately. Running out of linen mid-shift is an operational emergency."]}], "questions": [{"q": "What should you do with a sheet that has a faint stain when held up to the light?", "opts": ["Use it if the stain is very faint and unlikely to be noticed by the guest", "Return it to laundry and replace it with a clean piece", "Place it on the bed and make the bed so the stain is on the less visible side", "Report it to your supervisor and wait for their instruction before proceeding"], "a": 1}, {"q": "What is the most immediately visible indicator of bed making quality?", "opts": ["The depth and straightness of the fold at the head of the bed", "The evenness of the duvet overhang at the sides", "The number of pillows and their arrangement", "The tightness of the fitted sheet corners"], "a": 0}, {"q": "What is the primary purpose of turn-down service?", "opts": ["A full room re-clean for guests returning from a full day of activities", "A brief inspection of the room to check for any maintenance issues", "Preparing the room and specifically the bed for sleep", "Delivering the guest's evening newspaper and room service order"], "a": 2}, {"q": "Why must linen be counted when removed and when delivered to laundry?", "opts": ["To ensure the correct billing is applied to the guest's account", "To protect against theft, loss and to maintain accurate linen inventory records", "South African hospitality regulations require a daily linen count", "To ensure the laundry department processes the correct quantity in each cycle"], "a": 1}, {"q": "What is the correct approach to pillow placement on a made bed?", "opts": ["Position them according to what looks aesthetically pleasing at the time of making", "Arrange them according to the venue's specific standard with all placement symmetrical", "Place all pillows in the centre of the bed behind the folded top sheet", "Ask a supervisor to check pillow placement on each room until confident"], "a": 1}]}, {"id": 5, "title": "Bathroom Cleaning and Sanitisation", "subtitle": "The bathroom sequence, toilet standards, replenishing amenities and the presentation checklist", "duration": "25 min", "slides": [{"title": "The Bathroom Is the Test of Your Standards", "type": "body", "body": "A guest's assessment of a property's cleanliness is most acutely formed in the bathroom. Hair, soap residue, water marks, an unclean toilet or a poorly presented vanity: these are the details that determine whether a guest feels the property is genuinely clean or simply presented that way.\n\nA professionally cleaned bathroom should be odourless, visually flawless and fully replenished. Soap dispensers should be full. Towels should be folded and presented correctly. The toilet should look as though it has never been used. These are not luxury standards. They are the basic expectations at every professional accommodation level."}, {"title": "The Bathroom Cleaning Sequence", "type": "steps", "intro": "Always clean the bathroom before the bedroom to prevent cross-contamination:", "steps": [{"number": "1", "label": "Apply cleaning products first", "detail": "Apply toilet cleaner inside the bowl and bathroom surface cleaner to the basin, bath or shower before beginning to wipe. Allowing products to work while you proceed improves effectiveness."}, {"number": "2", "label": "Clean mirrors and glass", "detail": "Clean all mirrors and glass shower screens to a streak-free finish. Use a dry cloth to buff after cleaning."}, {"number": "3", "label": "Clean the basin and taps", "detail": "Scrub the basin bowl, clean the taps to a shine and wipe the surround. Check around the tap fittings and the base of taps where lime scale accumulates."}, {"number": "4", "label": "Clean the bath or shower", "detail": "Scrub all surfaces, clean the showerhead, remove any hair from the drain and clean the drain cover. In showers, check the shower curtain for mildew."}, {"number": "5", "label": "Clean the toilet", "detail": "Clean under the rim of the bowl with the toilet brush. Wipe the entire exterior of the toilet: the tank, the lid outside and inside, the seat both sides, and the base. This order prevents cross-contamination."}, {"number": "6", "label": "Mop the floor", "detail": "Mop from the back of the bathroom toward the door. Change the mop water if it becomes visibly dirty."}, {"number": "7", "label": "Replenish and present", "detail": "Replenish all amenities according to the venue's standard. Present towels and toilet roll according to the specified format."}]}, {"title": "Toilet Cleaning Standards", "type": "highlight", "points": [{"text": "The toilet requires the highest concentration of sanitation effort in any room. A guest who encounters a poorly cleaned toilet will assess the entire property as unclean."}, {"text": "Use a colour-coded cloth system where one colour is used only for toilets. Never use a toilet cloth on any other surface. Never use a general cloth on a toilet."}, {"text": "Clean every accessible surface of the toilet in the correct sequence to prevent spreading contamination."}, {"text": "After cleaning, apply a toilet deodoriser if specified by the venue standard. Do not mask an odour without also cleaning the source of it."}]}, {"title": "Replenishing Amenities in the Bathroom", "type": "list", "intro": "Amenity replenishment must follow the venue's specific standard precisely:", "items": ["Never top up a partially used amenity bottle. Replace it with a full one where the venue's standard requires replacement.", "Amenities must be placed in the correct location and facing the correct direction according to the venue's brand standard", "Toilet rolls must be replaced according to the venue's standard: full rolls on the holder, spare rolls in the specified location", "Folded towels must be placed in the correct position, folded to the correct standard and facing the correct direction", "Check the amenities under the basin or in the bathroom cabinet. These are the items guests actually use and they must be fully stocked"]}, {"title": "The Bathroom Presentation Checklist", "type": "body", "body": "Before leaving the bathroom, confirm each of these items is completed:\n\nMirror: clean, streak-free, no water marks\nBasin: clean bowl, clean and shining taps, dry surround\nShower or bath: all surfaces clean, no hair in drain, showerhead clean\nToilet: bowl clean under rim, all surfaces wiped, no residue\nFloor: mopped, dry, no hair or debris visible\nAmenities: fully stocked, correctly positioned and presented\nTowels: clean, correctly folded and positioned\nGeneral: no odour, good ventilation, no cleaning products visible to the guest"}, {"title": "Common Bathroom Cleaning Failures", "type": "list", "intro": "The most frequently missed items in bathroom cleaning:", "items": ["Under the rim of the toilet bowl: this requires a toilet brush each time and is the most commonly skipped step", "The base and foot of the toilet: often overlooked but the most visibly dirty area from the guest's perspective", "Around and behind the taps: lime scale accumulates here and requires targeted attention", "The shower drain and drain cover: hair accumulation is visible and unhygienic", "The mirror at close range: smudges and water spots that are invisible from a distance become visible when the guest uses the mirror", "The bathroom door and door handle on both sides: high-touch surfaces that require sanitising with every service"]}], "questions": [{"q": "Why should the bathroom always be cleaned before the bedroom?", "opts": ["Bathroom cleaning products require longer dwell time before wiping", "Cleaning the bathroom first prevents carrying bathroom contamination into the bedroom area", "Bathroom cleaning takes longer and should be completed while energy levels are highest", "The guest expects the bathroom to be completed first according to hotel standards"], "a": 1}, {"q": "What is the correct approach to cleaning the toilet exterior?", "opts": ["Wipe from the seat down to the base using a single continuous motion", "Clean the tank, lid outside and inside, seat both sides, and the base in sequence to prevent cross-contamination", "Spray disinfectant over all surfaces and wipe in any order", "Clean only the seat and the bowl, as these are the surfaces the guest touches"], "a": 1}, {"q": "What should you do with a partially used amenity bottle in a guest bathroom?", "opts": ["Top it up from a bulk supply to avoid waste", "Replace it with a full one where the venue's standard requires replacement", "Leave it if it is more than half full and replace it on the next service", "Use your judgement based on how much has been used"], "a": 1}, {"q": "What does a colour-coded cloth system for bathroom cleaning prevent?", "opts": ["Using the wrong cleaning chemical on different surfaces", "Cross-contamination between toilet surfaces and other bathroom areas", "Cleaning products being used past their expiry date", "Cloths being removed from rooms by guests"], "a": 1}, {"q": "Which bathroom item is most frequently missed during room cleaning?", "opts": ["The shower floor surface", "The interior of the basin bowl", "Under the rim of the toilet bowl", "The bathroom mirror"], "a": 2}]}, {"id": 6, "title": "Chemical Handling and Equipment", "subtitle": "Chemical safety, reading labels, dilution, PPE, storage and equipment care", "duration": "20 min", "slides": [{"title": "Why Chemical Safety Matters", "type": "body", "body": "The cleaning chemicals used in a professional housekeeping operation are highly effective and potentially hazardous. Incorrect use can cause chemical burns, respiratory problems, surface damage and, most critically, harm to the guest if residue is left on surfaces. The professional housekeeping standard is zero tolerance for incorrect chemical use.\n\nSouth Africa's Occupational Health and Safety Act places specific requirements on employers and employees regarding safe chemical use. As a housekeeping professional, you are required to know what you are using, how to use it safely and what to do if something goes wrong."}, {"title": "Types of Cleaning Chemicals in a Housekeeping Operation", "type": "list", "intro": "Know the purpose and limitation of each type of chemical you use:", "items": ["Bathroom disinfectant: kills bacteria and viruses on bathroom surfaces. Not a cleaning product. Surfaces must be cleaned before disinfecting.", "Toilet cleaner: acid-based to remove lime scale and biological matter from toilet bowls. Never use on other surfaces.", "General purpose cleaner: for walls, furniture, hard surfaces. Read the dilution ratio carefully.", "Glass cleaner: for mirrors, glass and chrome surfaces. Leaves a streak-free finish.", "Floor cleaner: appropriate to the floor type. Tile, hardwood and carpet each require different products.", "Descaler: removes lime scale from taps, shower heads and bathroom fixtures. Strong acid. Requires PPE.", "Disinfectant spray: for high-touch surfaces. Follow required contact time before wiping."]}, {"title": "Reading Labels and Diluting Correctly", "type": "steps", "intro": "Every cleaning product must be used as specified on its label:", "steps": [{"number": "1", "label": "Read the label before first use", "detail": "Know the product's purpose, the correct dilution ratio, the surfaces it can and cannot be used on, and the first aid instructions."}, {"number": "2", "label": "Dilute correctly", "detail": "Over-concentrated solutions do not clean better. They can damage surfaces, leave residue that harms guests and waste product. Under-diluted solutions do not clean at all."}, {"number": "3", "label": "Use the correct dispensing method", "detail": "Many venues use a dilution station that automatically mixes the correct concentration. Do not add extra product beyond the specified amount."}, {"number": "4", "label": "Label all containers", "detail": "Every bottle of cleaning solution must be labelled with its contents. A labelling failure can lead to a guest being harmed by an incorrect surface treatment."}, {"number": "5", "label": "Store after every shift", "detail": "All chemicals must be stored in the designated chemical store at the end of every shift. Never leave cleaning solutions unattended in occupied or vacated rooms."}]}, {"title": "Personal Protective Equipment", "type": "highlight", "points": [{"text": "Rubber gloves are required for all bathroom cleaning and all work with concentrated cleaning products. They protect against chemical burns and biological contamination."}, {"text": "Eye protection must be available and used when using spray chemicals that can reach the eyes."}, {"text": "Closed-toe shoes are required at all times in a housekeeping environment. Chemical spills, wet floors and heavy equipment all create foot hazard."}, {"text": "A dust mask is required when working in environments with significant dust, particularly in rooms undergoing renovation or deep cleaning."}, {"text": "Never begin a task that requires PPE without the correct protection in place. The risk is yours."}]}, {"title": "Equipment Care and Maintenance", "type": "body", "body": "The equipment you use every day must be maintained in clean, working condition. A vacuum cleaner with a full bag redistributes dust rather than removing it. A mop that is not rinsed after use harbours bacteria that is then spread to clean floors. A trolley that is not restocked between shifts means the next shift starts behind.\n\nAt the end of every shift, clean and store all equipment correctly. Report any equipment fault to your supervisor before it becomes an issue during service. The maintenance of your equipment is as much a part of your professional responsibility as the rooms you clean."}, {"title": "Chemical Spillage and Emergency Procedures", "type": "list", "intro": "Know what to do before a spillage happens:", "items": ["If a chemical splashes on skin or eyes, rinse with large amounts of clean cold water immediately and continue for at least fifteen minutes", "Do not attempt to neutralise a chemical burn with another product unless specifically instructed on the label", "Report every chemical spillage or exposure to a supervisor immediately, even if no injury has occurred", "Clean up chemical spillages on floors immediately using the appropriate method specified for that chemical", "Know the location of the nearest first aid kit, eye wash station and the emergency number for your venue"]}], "questions": [{"q": "What is the purpose of disinfectant as distinct from a cleaner?", "opts": ["Disinfectant cleans and removes visible dirt more effectively than standard cleaners", "Disinfectant kills bacteria and viruses on already-cleaned surfaces", "Disinfectant is used for deep cleaning of bathroom floors and shower bases", "Disinfectant removes lime scale from tap and shower fittings"], "a": 1}, {"q": "What is the danger of using an over-concentrated cleaning solution?", "opts": ["Over-concentrated solutions evaporate faster and must be applied more frequently", "They can damage surfaces, leave harmful residue and waste product", "They are less effective at cleaning because the active ingredients become unstable", "They change colour and are difficult to rinse from surfaces"], "a": 1}, {"q": "What must be done with every unlabelled container of cleaning solution?", "opts": ["Label it correctly before use or discard it", "Use it cautiously for general cleaning where the exact product is less critical", "Return it to the chemical store for identification by a supervisor", "Do not use it until a colleague identifies the original product"], "a": 0}, {"q": "What is the first aid response if a chemical splashes into the eyes?", "opts": ["Apply a neutralising eye drop immediately", "Rinse with large amounts of clean cold water immediately and continue for at least fifteen minutes", "Cover the eye and report to a supervisor before seeking medical attention", "Wait for symptoms to develop before seeking medical treatment"], "a": 1}, {"q": "Why must a mop be rinsed thoroughly after each use?", "opts": ["An unrinsed mop is harder to store correctly in the chemical cupboard", "A mop that is not rinsed harbours bacteria that is then spread to clean floors", "The South African OHS Act requires all cleaning equipment to be rinsed after use", "An unrinsed mop degrades faster and requires more frequent replacement"], "a": 1}]}, {"id": 7, "title": "Laundry and Linen Management", "subtitle": "The linen cycle, sorting, identifying damage, the laundry process, folding and guest laundry", "duration": "20 min", "slides": [{"title": "The Linen Cycle", "type": "body", "body": "Linen is one of the most significant operational and financial resources in any accommodation operation. A full hotel linen inventory represents a major capital investment. A linen management system that is inaccurate, wasteful or careless creates cost and operational pressure that affects every department.\n\nUnderstanding the linen cycle, from issue to use to collection to laundry to storage to reissue, is a professional responsibility for every housekeeping team member. Linen that is unaccounted for, incorrectly sorted or poorly stored degrades faster, is replaced more often and costs the operation more."}, {"title": "Sorting and Counting Linen", "type": "steps", "intro": "Accurate sorting and counting begins the moment linen is removed from rooms:", "steps": [{"number": "1", "label": "Sort immediately", "detail": "Separate sheets from pillowcases, bath towels from hand towels and face cloths, and soiled from badly stained linen which may require special treatment."}, {"number": "2", "label": "Count every item", "detail": "Count each category of linen as it is sorted. Record the count on the linen sheet for that room or trolley run."}, {"number": "3", "label": "Bag correctly", "detail": "Place sorted linen in the correct laundry bags. Ensure heavy items are not placed on top of delicate items within the bag."}, {"number": "4", "label": "Transport safely", "detail": "Do not overfill laundry trolleys or bags. An overfull trolley causes injury and linen damage."}, {"number": "5", "label": "Deliver to the designated point", "detail": "Deliver laundry to the laundry room or collection point specified by the property."}]}, {"title": "Identifying Damaged Linen", "type": "list", "intro": "Damaged linen must never be returned to service:", "items": ["Stains that have not responded to standard washing must be escalated to the laundry supervisor", "Tears, holes and fraying edges indicate linen that has reached the end of its service life", "Yellowing or greying from age or incorrect washing treatment marks linen for retirement", "Pilling on sheets or towels is a sign of wear that is immediately noticeable to guests", "Linen with a persistent odour after washing must be quarantined and investigated before reuse", "Report all significant linen damage to the laundry or housekeeping supervisor with a description of the item and the issue"]}, {"title": "The Laundry Process", "type": "body", "body": "Most larger accommodation operations have an in-house laundry. Understanding the basic laundry process allows a housekeeping professional to support the function and to understand what can and cannot be cleaned effectively.\n\nCommercial laundry operates at higher temperatures than domestic washing. Hotel towels and sheets are processed at temperatures that kill pathogens effectively. Guest clothing, however, often cannot withstand the same temperature, which is why guest laundry is handled separately and with specific care. The care label on any garment must be followed without exception."}, {"title": "Folding and Storing Clean Linen", "type": "highlight", "points": [{"text": "Clean linen must be stored on clean, dry shelves with adequate air circulation. Damp storage causes mildew."}, {"text": "Linen must be folded to the standard specified by the property. Consistent folding makes trolley loading efficient and ensures correct quantities are taken to rooms."}, {"text": "Rotate stock. Older linen must be issued before newer stock to ensure even wear across the inventory."}, {"text": "Never place clean linen directly on the floor, even temporarily. This immediately renders it soiled."}, {"text": "Store linen away from cleaning chemicals. Fabric absorbs odours and can be contaminated by chemical proximity."}]}, {"title": "Guest Laundry Services", "type": "list", "intro": "Guest laundry requires specific care standards beyond regular room linen processing:", "items": ["Collect guest laundry from the room in the designated bag provided to the guest", "Count and list every item before sending to laundry. A discrepancy discovered after processing is extremely difficult to resolve", "Check every care label and follow the instructions. A guest's garment damaged by incorrect washing is a significant claim", "Return guest laundry within the promised timeframe. A delay requires immediate communication to the guest", "Deliver pressed items on hangers where specified, folded items in the correct packaging", "Never allow guest laundry to be mixed with room linen at any point in the process"]}], "questions": [{"q": "What must be done with linen that has a persistent odour after standard washing?", "opts": ["Return it to service and replace it if the guest complains", "Quarantine it and report to the laundry or housekeeping supervisor for investigation", "Treat it with a deodoriser before returning it to service", "Wash it again at a higher temperature before reuse"], "a": 1}, {"q": "How must clean linen be stored to prevent deterioration?", "opts": ["In sealed plastic bags to protect from dust", "On clean, dry shelves with adequate air circulation, rotated so older stock is used first", "In the laundry room at room temperature in any available space", "Stacked on the housekeeping trolley at the end of the shift for next-day use"], "a": 1}, {"q": "Why must guest clothing laundry be handled separately from room linen?", "opts": ["Guest laundry is billed separately and requires different documentation", "Guest garments often cannot withstand commercial laundry temperatures and require care-label adherence", "Room linen and guest clothing have different regulatory cleaning requirements", "Guest laundry must be processed in a dedicated machine not used for room linen"], "a": 1}, {"q": "What is the correct approach when a guest laundry item is returned with damage?", "opts": ["Apologise and offer to rewash the item in case the damage is removable", "Document the item, report to the supervisor immediately, the property is liable and the guest must be informed", "Inform the guest that the damage was pre-existing and could not be avoided", "Return the item without comment and address it only if the guest raises the issue"], "a": 1}, {"q": "Why must clean linen never be placed on the floor, even temporarily?", "opts": ["Floor placement violates South African food and accommodation hygiene regulations", "It immediately renders the linen soiled and requires it to be returned to laundry", "Floor placement during busy periods creates a trip hazard", "It is an aesthetic standard only and does not affect the hygiene status of the linen"], "a": 1}]}, {"id": 8, "title": "Servicing Different Room Types", "subtitle": "Standard vs departure service, suite and VIP rooms, Do Not Disturb, special occasions", "duration": "20 min", "slides": [{"title": "Not All Rooms Are Serviced the Same Way", "type": "body", "body": "A professional housekeeping team services multiple types of rooms in a single shift: stay-over rooms where the guest is currently in residence, departure rooms being prepared for a new arrival, suite or VIP rooms requiring a higher standard of presentation, and rooms with specific arrangements for special occasions.\n\nUnderstanding the difference between these service types, and knowing which rooms on your allocation fall into which category, is essential information that must be confirmed before the shift begins and updated throughout the day as circumstances change."}, {"title": "Stay-Over Service: What It Includes", "type": "list", "intro": "A stay-over room is serviced for a guest who is currently in residence:", "items": ["Make the bed with the existing linen unless the guest has indicated linen change is required", "Clean the bathroom to the full standard, replenishing amenities and towels", "Remove room service items and empty waste bins", "Dust all surfaces and straighten the room without disturbing the guest's personal arrangements", "Vacuum or mop the floor", "Leave the room in a neat, clean and welcoming condition without reorganising the guest's personal space"]}, {"title": "Departure Room Service", "type": "steps", "intro": "A departure room requires a more thorough service than a stay-over:", "steps": [{"number": "1", "label": "Confirm departure", "detail": "Confirm with the front desk that the guest has checked out before beginning a departure service. Never enter a room assumed to be vacant without confirmation."}, {"number": "2", "label": "Full strip", "detail": "Remove all used linen, all used towels and all consumable amenities from the room and bathroom."}, {"number": "3", "label": "Thorough inspection", "detail": "Check every area of the room for damage, maintenance issues, lost property or items left by the departing guest. Report all findings before proceeding."}, {"number": "4", "label": "Full clean", "detail": "Clean the room to the complete departure standard: all surfaces, bathroom full sequence, windows, floors."}, {"number": "5", "label": "Full replenishment", "detail": "Replace all linen, all towels, all amenities and all consumables to the full arrival standard."}, {"number": "6", "label": "Inspect and sign off", "detail": "Complete the room inspection checklist and sign off the room as ready. Inform the front desk."}]}, {"title": "Suite and VIP Room Standards", "type": "highlight", "points": [{"text": "Suites and VIP rooms typically require a higher standard of presentation, additional amenities and, in some cases, a management inspection before they are released as ready."}, {"text": "Know which rooms on your allocation are suites or VIP arrivals before beginning the shift. These require more time and must be scheduled accordingly."}, {"text": "Welcome amenities for VIP rooms must be confirmed with the front office and placed correctly before the room is released."}, {"text": "The finishing standard in a suite includes items not standard in a regular room: fan folding of facial tissue, presentation of a clothes brush, arrangement of robes, and other venue-specific touches."}, {"text": "Any deviation from the VIP room standard must be reported to a supervisor before the room is released."}]}, {"title": "Do Not Disturb: The Correct Procedure", "type": "list", "intro": "A Do Not Disturb sign or function must be absolutely respected:", "items": ["Never enter a room displaying a Do Not Disturb sign without an explicit management instruction to do so", "If a room has been on Do Not Disturb for an unusually long period, report it to your supervisor. This may indicate a welfare concern.", "You may slip a card under the door of a DND room advising the guest to contact the front desk if they wish their room to be serviced", "Never remove a DND sign. The guest controls when the sign is placed and removed.", "If a guest answers when you knock on a DND room, apologise for the disturbance and move on"]}, {"title": "Special Occasion Room Setup", "type": "body", "body": "Some guests have arranged a special occasion setup in their room for an anniversary, birthday or celebration. The details of these arrangements are confirmed with the front office and a senior housekeeper or supervisor coordinates the delivery and placement.\n\nIf you are asked to participate in a room setup, follow the agreed arrangement precisely. Do not improvise with quantities, positions or additional items not specified. Confirm completion with the front desk or supervisor and ensure the room is released and locked securely after setup, with the key controlled according to the venue's security protocol."}], "questions": [{"q": "What must be confirmed before beginning service on a departure room?", "opts": ["That the room's housekeeping inspection checklist is available", "That the guest has checked out with the front desk", "That all required linen is available on the trolley before entering", "That a supervisor is available to inspect the room on completion"], "a": 1}, {"q": "What should you do if a guest room has been on Do Not Disturb for an unusually long period?", "opts": ["Knock loudly to check whether the guest requires assistance", "Remove the sign as the room clearly needs service", "Report it to your supervisor as it may indicate a welfare concern", "Contact the guest's room by phone to confirm they are well"], "a": 2}, {"q": "What is the primary difference between stay-over and departure room service?", "opts": ["Stay-over rooms take longer to service than departure rooms", "Departure rooms require a full strip, thorough inspection, full clean and full replenishment", "Stay-over service does not include bathroom cleaning", "Departure rooms require a management inspection that stay-over rooms do not"], "a": 1}, {"q": "Why do VIP and suite rooms require additional time to be scheduled before the shift?", "opts": ["They require a management pre-inspection before housekeeping can begin", "They have a higher standard requiring more time, additional amenities and possibly a management inspection before release", "VIP guests must approve the housekeeper before the room can be serviced", "They require two housekeepers and must be allocated accordingly"], "a": 1}, {"q": "What should be slipped under the door of a room on long-term Do Not Disturb?", "opts": ["A note apologising for the disturbance and offering housekeeping at a later time", "A card advising the guest to contact the front desk if they wish their room serviced", "A minibar charge summary requiring the guest's attention", "A note from the supervisor requesting the guest to update their DND status"], "a": 1}]}, {"id": 9, "title": "Guest Privacy, Security and Lost Property", "subtitle": "Discretion standards, room access, lost property procedures, valuables and reporting suspicious items", "duration": "20 min", "slides": [{"title": "Discretion Is Non-Negotiable", "type": "body", "body": "A housekeeping professional has access to every guest room and therefore to every guest's most private space. This access is granted on the basis of trust, and that trust must be honoured absolutely. What a housekeeper observes, finds or encounters in any guest room is confidential professional information.\n\nSharing information about a guest's room, their belongings, their habits or their arrangements with colleagues, family, other guests or anyone outside the professional need-to-know context is a serious breach of professional ethics and, in many cases, a breach of South Africa's Protection of Personal Information Act. It is also a dismissal offence at most properties."}, {"title": "Guest Privacy Standards in Housekeeping", "type": "list", "intro": "These privacy standards apply in every room at every service:", "items": ["Do not read or examine personal documents, correspondence or electronic devices visible in a guest room", "Do not open closed suitcases, bags or personal storage even to assist with cleaning around them", "Do not examine medications, personal items or valuables beyond what is necessary to clean the space around them", "Do not share any information about a guest's room contents or arrangements with other guests or colleagues outside your immediate team", "Do not discuss the length of a guest's stay, their destination or their travel arrangements with anyone", "If a colleague requests information about a guest's room that seems unusual, do not share it and report the request to your supervisor"]}, {"title": "Room Access and Security Procedures", "type": "steps", "intro": "Access to guest rooms must be controlled at all times:", "steps": [{"number": "1", "label": "Always knock and announce", "detail": "Never open a guest room door without knocking and announcing 'Housekeeping' twice, regardless of your confidence that the room is vacant."}, {"number": "2", "label": "Control your master key", "detail": "A housekeeping master key must never be left unattended on a trolley, in a corridor or in an unsecured location. It must be on your person or handed to a supervisor."}, {"number": "3", "label": "Secure the room during service", "detail": "When servicing a room, the door should be positioned according to the venue's specific procedure. The room must not be left fully open and unattended."}, {"number": "4", "label": "Lock on exit", "detail": "Every room must be locked and checked as locked before you move to the next. Never assume a door is locked without physically confirming it."}, {"number": "5", "label": "Report access control failures", "detail": "If you discover a room that was improperly left open, locked, or with a key in the lock, report it to your supervisor immediately."}]}, {"title": "Lost and Found: The Correct Process", "type": "list", "intro": "Items found in rooms require a specific, consistent process:", "items": ["Every item found must be logged immediately with a description of the item, the room number, the date and time found, and your name", "Valuable items including cash, jewellery, passports, electronic devices and credit cards must be reported to a supervisor immediately and stored in a secure location", "Do not remove any found item from the property for any reason. This applies equally to items that appear to have been deliberately abandoned.", "Do not keep any found item, even temporarily. An item that is 'held' by a staff member until they can report it creates accountability issues.", "When a guest enquires about a lost item, check the lost property log before confirming or denying that the item has been found", "Process unclaimed items according to the property's specific policy, which the supervisor will define"]}, {"title": "Handling Valuables Found in Rooms", "type": "highlight", "points": [{"text": "Cash found loose in a room must be reported to a supervisor immediately, counted and logged in the supervisor's presence."}, {"text": "Jewellery, watches and similar items must be individually described, logged and stored securely. Photographs are helpful for accurate description."}, {"text": "Passports and identity documents found in rooms must be logged and stored securely. They may require reporting to management given their legal significance."}, {"text": "Electronic devices must be powered down if possible before storage. Note the make, model and any visible identification."}, {"text": "Never attempt to access, use or charge a guest's personal electronic device found in a room."}]}, {"title": "Reporting Suspicious Items or Situations", "type": "body", "body": "A housekeeping professional who encounters something genuinely unusual in a room has a professional and personal responsibility to report it immediately. This includes items that appear to be evidence of illegal activity, items that raise a safety concern, signs of significant distress or damage that extends beyond normal wear, or anything that makes you genuinely concerned for a guest's welfare.\n\nDo not enter, touch or disturb anything. Do not attempt to investigate. Leave the room, secure it, and report to your supervisor immediately. The decision about what to do next rests with management and, if necessary, law enforcement."}], "questions": [{"q": "What is the correct treatment of information observed about a guest's room contents?", "opts": ["Share only with your direct supervisor if you feel it is relevant", "Treat as confidential professional information that is not shared with anyone outside the immediate need-to-know context", "Share with the front desk as they may need to update the guest's profile", "Record in the daily housekeeping log for management review"], "a": 1}, {"q": "What must you do with a housekeeping master key that you are not actively using?", "opts": ["Leave it on the trolley in the corridor for efficient access", "Keep it on your person or hand it to a supervisor. It must never be left unattended.", "Return it to the housekeeping office between each room", "Lock it in the trolley compartment between rooms"], "a": 1}, {"q": "What information must be logged when a found item is reported?", "opts": ["The item description and your name only", "Description, room number, date and time found, and your name", "The room number and a photograph of the item", "The item description and the estimated value"], "a": 1}, {"q": "What should you do immediately if you find cash loose in a guest room?", "opts": ["Take a photograph and leave it in place until the guest returns", "Report it to a supervisor immediately and count it in the supervisor's presence", "Place it in the room safe on the guest's behalf", "Leave it exactly as found and note the observation in your report"], "a": 1}, {"q": "What is the correct action if you find something in a room that raises a genuine concern?", "opts": ["Investigate further before reporting to avoid causing unnecessary alarm", "Remove the item for safekeeping and report it at the end of the shift", "Leave the room, secure it and report to your supervisor immediately", "Inform a colleague and return together to assess the situation"], "a": 2}]}, {"id": 10, "title": "Health, Safety and Injury Prevention", "subtitle": "Housekeeping hazards, manual handling, sharps and biohazards, fire safety and reporting", "duration": "20 min", "slides": [{"title": "A Safe Housekeeper Is a Professional Housekeeper", "type": "body", "body": "Housekeeping is one of the highest-risk occupations in the hospitality industry in terms of musculoskeletal injury, chemical exposure, slip and trip incidents and exposure to biological hazards. South Africa's Occupational Health and Safety Act places a duty on both the employer and the employee to maintain a safe working environment.\n\nUnderstanding the risks specific to housekeeping work and the practices that mitigate them is not optional professional knowledge. It is a fundamental requirement of the role that protects your long-term health and the continuity of your career."}, {"title": "Common Hazards in Housekeeping Work", "type": "list", "intro": "Know the risks before you encounter them:", "items": ["Slip and trip hazards: wet floors during cleaning, trolley cables, door thresholds and uneven surfaces", "Chemical exposure: skin and eye contact with cleaning products during mixing, application or cleaning up", "Manual handling injuries: back, shoulder and wrist injuries from lifting heavy linen, pushing trolleys and repetitive movements", "Sharps injuries: needles, broken glass or razors found in rooms or in used linen", "Biological hazards: contact with blood, bodily fluids or other biological matter", "Heat-related illness: working in poorly ventilated rooms or in hot weather without adequate hydration", "Noise exposure: from vacuum cleaners and floor cleaning equipment over extended periods"]}, {"title": "Safe Manual Handling Techniques", "type": "steps", "intro": "Back injuries are the most common and most debilitating injury in housekeeping. Prevent them:", "steps": [{"number": "1", "label": "Plan the lift", "detail": "Before lifting any load, assess its weight, your grip and the path you will take. A moment of planning prevents an injury."}, {"number": "2", "label": "Position correctly", "detail": "Stand close to the load with your feet shoulder-width apart. Bend your knees, not your back. Keep your back straight and your core engaged."}, {"number": "3", "label": "Lift smoothly", "detail": "Lift by straightening your legs, not by pulling with your back. Keep the load close to your body."}, {"number": "4", "label": "Push, don't pull", "detail": "When moving a laden trolley, push it rather than pulling it. Pushing uses larger muscle groups and reduces back strain."}, {"number": "5", "label": "Ask for help", "detail": "Loads that are too heavy, too awkward or too large for one person must be managed with a colleague. Struggling alone with an oversized load is not professional. It is unsafe."}]}, {"title": "Sharps and Biohazard Procedures", "type": "highlight", "points": [{"text": "Never put your hand into a waste bin or bag without looking first. Needles, broken glass and razor blades are the most common room sharps."}, {"text": "If you find a needle, do not attempt to cap it or place it with your hands. Use tongs or a dedicated sharps container. Report to your supervisor immediately."}, {"text": "Blood or bodily fluid on surfaces must be treated as a biohazard. Do not touch. Report immediately. Use the property's biohazard kit and PPE."}, {"text": "Any sharps injury, however minor, must be reported immediately and the wound washed with soap and water. Seek medical attention promptly."}, {"text": "Do not re-enter a room where a biohazard incident has occurred until it has been professionally decontaminated."}]}, {"title": "Fire Safety in Housekeeping", "type": "body", "body": "Housekeeping professionals have specific fire safety responsibilities because they are the people most frequently present in guest room areas. Know the fire exit routes on every floor you work. Know the location of the nearest fire extinguisher and the fire alarm point. Know what to do if you discover a fire.\n\nIf you discover smoke or fire in a guest room: do not open the door further if smoke is visible. Alert the alarm. Use the stairs, not the elevator. Report to your supervisor at the assembly point with information about the location. In a real fire, your job is not to fight it. Your job is to alert everyone and evacuate safely."}, {"title": "Reporting Hazards and Incidents", "type": "list", "intro": "Report immediately. Never at the end of the shift for safety matters:", "items": ["A spill on a corridor floor must be cleaned up immediately and a wet floor sign placed while cleaning", "A broken or faulty piece of equipment must be reported and removed from service before the next user encounters it", "A maintenance hazard in a guest room, such as a loose bath fitting, a defective electrical outlet or a cracked tile, must be reported to maintenance with a room number and description", "Any injury sustained during the shift, however minor, must be reported to a supervisor before the end of that shift", "A near-miss, where injury almost occurred, must also be reported. Near-misses are the warning system that prevents future injuries."]}], "questions": [{"q": "What is the most common and debilitating category of injury in housekeeping?", "opts": ["Chemical burns from incorrect cleaning product use", "Slip and trip incidents in wet bathroom areas", "Back and musculoskeletal injuries from incorrect manual handling", "Sharps injuries from needles and broken glass found in rooms"], "a": 2}, {"q": "What is the correct technique for lifting a heavy bag of linen?", "opts": ["Bend at the waist and use back strength to lift quickly", "Stand close to the load, bend the knees, keep back straight and lift by straightening the legs", "Use a wide, overhand grip and lift from the top of the bag", "Ask a supervisor to approve the lift before beginning"], "a": 1}, {"q": "What must you do if you find a needle in a guest room?", "opts": ["Place it in the nearest waste bin carefully to avoid others being injured", "Use tongs or a dedicated sharps container and report to your supervisor immediately", "Cap it manually and place it in a sealed bag before reporting", "Leave it and place an out of order sign on the room until maintenance arrives"], "a": 1}, {"q": "What is the correct response when you discover smoke in a guest room corridor?", "opts": ["Check the room nearest the smoke to identify the source", "Activate the fire alarm, alert guests in the vicinity and evacuate using the stairs", "Contact your supervisor by phone and wait for instructions", "Use the fire extinguisher to address the source before it develops further"], "a": 1}, {"q": "When must a workplace injury be reported to a supervisor?", "opts": ["At the end of the shift during the standard debrief", "Only if the injury requires medical treatment", "Before the end of the shift in which it occurred, regardless of severity", "Within 24 hours of the incident occurring"], "a": 2}]}, {"id": 11, "title": "Delivering a Five-Star Housekeeping Standard", "subtitle": "What five-star looks like, attention to detail, anticipating preferences, consistency and your professional reputation", "duration": "25 min", "slides": [{"title": "What Five-Star Housekeeping Looks Like", "type": "body", "body": "A five-star housekeeping standard is not only about cleanliness, though cleanliness is the foundation. It is about the details that tell a guest they are genuinely valued. The alignment of the amenities on the bathroom shelf. The crease-free precision of the bed fold. The closed wardrobe door. The personalised placement of the guest's belongings before turn-down. The welcome card positioned correctly on the pillow.\n\nNone of these are complicated. All of them require attention, intention and the discipline to apply the same standard to every room regardless of your schedule pressure, the length of the shift or the room's position on the allocation list."}, {"title": "Attention to Detail in Practice", "type": "list", "intro": "The details that distinguish a professionally finished room from an adequately cleaned one:", "items": ["All amenities aligned with labels facing forward and quantities meeting the arrival standard", "All towels folded to the venue's specific standard and positioned precisely", "Toilet roll folded to the venue's specified finish, point or fan fold", "All surfaces wiped to a dust-free and streak-free finish, not just the obviously visible ones", "All furniture straightened and aligned as per the room's standard layout", "Curtains or blinds aligned symmetrically and drawn to the venue's standard position", "Guest belongings replaced in approximately the position they were found, not reorganised", "All lighting functioning and set to the correct setting for arrival or turn-down"]}, {"title": "Anticipating Guest Preferences", "type": "body", "body": "The highest standard in housekeeping anticipates the individual guest's preferences rather than applying only the uniform property standard. A guest who has placed their reading glasses on the bedside table on their side of the bed receives a clean surface with their glasses placed carefully back in the same position. A guest who has arranged their toiletries in a specific configuration receives them rearranged to match, not a standard vanity layout.\n\nThese observations are made during the stay-over service, noted carefully, and applied consistently. They require no extra time. They require attention and professional care for the individual behind the belongings."}, {"title": "Consistency as the Highest Standard", "type": "highlight", "points": [{"text": "A room that is perfectly presented on arrival and adequately cleaned on stay-over has not delivered the five-star standard. Consistency is the standard applied equally to every service."}, {"text": "Consistency across team members means the guest cannot tell which housekeeper serviced their room. Every member of the team delivers the same standard."}, {"text": "Consistency across room types means suites and standard rooms are finished to their respective standards with equal care, not greater care for the premium product and less for the standard."}, {"text": "Professional pride is what drives consistency. The standard exists because the guest deserves it, not because a supervisor is conducting an inspection."}]}, {"title": "Building Your Professional Reputation in Housekeeping", "type": "body", "body": "A housekeeping professional's reputation is built on the invisible quality of their work. Guests rarely see you working. They see the result of your work when they return to their room. They feel the quality of the linen when they get into bed. They notice the spotless bathroom. They experience the care in the arrangement of their belongings.\n\nA housekeeper known for consistently delivering rooms to the highest standard, for accurate maintenance reporting, for thorough lost property procedures and for absolute discretion is one of the most valuable people in any accommodation operation. This reputation is what secures the best shifts, the senior opportunities and the professional trajectory that a merely adequate operator cannot achieve."}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Accommodation and Housekeeping Services.\n\nYou now have the professional knowledge, practical skills and workplace understanding to deliver housekeeping to a consistently high standard in any accommodation setting, from guesthouses and boutique hotels to lodges, resorts and five-star properties in South Africa and internationally.\n\nThe final assessment covers all eleven modules. You need 60 percent to pass and receive your Certificate of Completion.\n\nEvery room you prepare from this point is a person's temporary home. Go and make it worthy of them."}], "questions": [{"q": "What is the foundation of a five-star housekeeping standard?", "opts": ["Premium amenities and luxury linen", "Cleanliness, with attention to detail applied to every aspect of the finished room", "The speed at which rooms are serviced during high-occupancy periods", "Regular inspection by management of every completed room"], "a": 1}, {"q": "What distinguishes a professional from an adequate housekeeping standard?", "opts": ["The number of rooms completed within the allocated shift time", "The quality of the chemicals and equipment used during cleaning", "The consistent application of attention to detail in every room on every service", "The rating of the property at which the housekeeper works"], "a": 2}, {"q": "What does anticipating a guest's preferences during a stay-over service require?", "opts": ["A PMS system that records the guest's previous stay preferences", "Attention to how the guest has arranged their belongings and replacing them in approximately the same position", "A briefing from the front office on each guest's profile before the shift", "Permission from the guest to rearrange their personal items during service"], "a": 1}, {"q": "What does professional pride as a driver of consistency mean in practice?", "opts": ["Maintaining standards because you want recognition and promotion", "Maintaining the standard because the guest deserves it, regardless of who is watching", "Maintaining standards on inspection days and during peak occupancy", "Maintaining standards only for VIP and long-stay guests whose loyalty is important to the venue"], "a": 1}, {"q": "How is a housekeeping professional's reputation primarily built?", "opts": ["Through formal qualifications and external certifications", "Through management recognition and promotion to senior roles", "Through the invisible but consistent quality of their work, experienced by guests in their room", "Through positive feedback on guest satisfaction surveys"], "a": 2}]}];
const FINAL_EXAM = [{"q": "Which factor do guests most frequently cite in accommodation satisfaction surveys?", "opts": ["Room size", "Food quality", "Cleanliness of the room and bathroom", "Speed of check-in"], "a": 2}, {"q": "What should you do before entering any guest room?", "opts": ["Call the front desk to confirm the guest has left", "Knock and announce 'Housekeeping' twice with a pause and wait for a response", "Check whether a DND sign is displayed", "Look through the peephole to confirm the room appears empty"], "a": 1}, {"q": "Why must the bathroom always be cleaned before the bedroom?", "opts": ["Bathroom products need longer dwell time", "Cleaning the bathroom first prevents cross-contamination of the bedroom area", "The bathroom takes longer and should be started first", "Bathroom amenities must be counted before bedroom amenities"], "a": 1}, {"q": "What is the correct response to a Do Not Disturb sign?", "opts": ["Knock loudly to check whether the guest requires assistance", "Remove it as it is a property resource", "Never enter the room. Slip a card offering service if appropriate and report if unusually long.", "Enter briefly to check the room condition from the doorway"], "a": 2}, {"q": "What must be done immediately when a needle is found in a room?", "opts": ["Place it in the nearest bin", "Use tongs or a sharps container and report to your supervisor immediately", "Cap it and place in a sealed bag", "Leave it and put an out of order sign on the room"], "a": 1}, {"q": "What is the correct technique for lifting heavy linen bags?", "opts": ["Bend at the waist and use back strength", "Stand close, bend knees, keep back straight and lift by straightening legs", "Use a wide overhand grip from the top", "Ask a supervisor to approve before lifting"], "a": 1}, {"q": "What must be done with every found item in a guest room?", "opts": ["Leave it in place", "Log it with description, room number, date, time and your name, and report valuable items to supervisor", "Place it in the room safe", "Hold it until the end of shift then report"], "a": 1}, {"q": "Why must a master key never be left on an unattended trolley?", "opts": ["Keys demagnetise when left in corridors", "An unattended master key is a serious security risk giving access to every guest room", "Trolleys can be moved by other staff", "Keys are counted at the end of every shift"], "a": 1}, {"q": "How should guest amenities be replenished on a stay-over service?", "opts": ["Replace all items with fresh stock regardless of usage", "Replace only items that have been used or opened, following the venue's specific standard", "Replace only toiletries and leave other items", "Ask the guest what they need before replenishing"], "a": 1}, {"q": "What is the correct bed making sequence for a departure room?", "opts": ["Make the bed before cleaning the bathroom", "Make the bed after the bathroom is complete and the room has been thoroughly cleaned", "Make the bed as the first task to allow time for the linen to settle", "Make the bed after vacuuming to remove any linen fibres from the floor"], "a": 1}, {"q": "What distinguishes a five-star housekeeping standard?", "opts": ["Premium amenities", "Consistent attention to detail applied to every room on every service", "Speed of completion", "Daily management inspection"], "a": 1}, {"q": "When must a workplace injury be reported?", "opts": ["At end of shift", "Within 24 hours", "Before the end of the shift in which it occurred", "Only if it requires medical treatment"], "a": 2}, {"q": "What is the correct way to manage a biohazard in a guest room?", "opts": ["Clean it immediately to protect the next guest", "Do not touch. Report immediately and use the property's biohazard kit and PPE.", "Ventilate the room and clean with strong disinfectant", "Place an out of order sign and continue with other rooms"], "a": 1}, {"q": "How must cleaning chemicals be stored at the end of a shift?", "opts": ["On the trolley for next-day efficiency", "In the designated chemical store away from all consumables", "In any available locked space", "Under the housekeeping desk"], "a": 1}, {"q": "What must be done if linen has a persistent odour after standard washing?", "opts": ["Return to service with a deodoriser", "Quarantine it and report to the supervisor for investigation", "Wash again at higher temperature", "Return it to the guest room on occupied stay-over service"], "a": 1}, {"q": "Why must clean linen never be placed on the floor?", "opts": ["It is an aesthetic standard only", "Floor placement immediately renders linen soiled and requires it to return to laundry", "It creates a trip hazard", "South African regulations prohibit it"], "a": 1}, {"q": "What should be done if a guest's room has been on DND for an unusually long period?", "opts": ["Knock loudly to check", "Enter briefly from the doorway", "Report to a supervisor as it may indicate a welfare concern", "Leave a notice that checkout is due"], "a": 2}, {"q": "What is the purpose of the final check before leaving a room?", "opts": ["To log amenities used for billing", "To view the room from the guest's perspective and catch anything missed", "To complete the management inspection checklist", "To ensure all cleaning products have been removed"], "a": 1}, {"q": "What does professional pride as the driver of consistency mean?", "opts": ["Maintaining standards to earn recognition", "Maintaining the standard because the guest deserves it, regardless of who is watching", "Maintaining standards on inspection days", "Maintaining standards only for VIP guests"], "a": 1}, {"q": "What is the most common injury in housekeeping and how is it prevented?", "opts": ["Chemical burns, prevented by wearing gloves", "Back injuries, prevented by correct manual handling technique", "Slip injuries, prevented by wearing non-slip shoes", "Sharps injuries, prevented by never reaching into bins"], "a": 1}];
const RESOURCES = [{"id": "resource-pack", "title": "Housekeeping Practical Resource Pack", "desc": "Room service checklists, safety procedures and standards reference"}];

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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the housekeeping standards, safety practices and professional conduct expected in hotels, lodges and accommodation properties.`;
    const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of accommodation and housekeeping services expected across the hospitality industry in South Africa and internationally.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Hotel-standard room preparation, cleanliness and attention to detail</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>The complete professional standard for accommodation and housekeeping services. Eleven modules covering room cleaning, bed making, bathroom sanitisation, chemical safety, linen management, guest privacy and the standards expected at every level of the accommodation industry.</div>
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
      const remarks=`${fullName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the housekeeping standards, safety practices and professional conduct expected in hotels, lodges and accommodation properties.`;
      const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of accommodation and housekeeping services expected across the hospitality industry in South Africa and internationally.`;
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
