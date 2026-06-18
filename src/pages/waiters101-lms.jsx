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
const STORE_KEY = "se_waiters101_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "waiters101";
const COURSE_TITLE = "Waiters 101";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

const MODULE_NAMES = ["The Role of a Waiter", "Professional Appearance", "Professional Behaviour", "Understanding the Menu", "Service Basics: Serving and Clearing", "Guest Interaction", "Handling Complaints", "Teamwork", "Common Mistakes to Avoid", "Qualities of a Great Waiter", "Delivering Excellent Service"];
const CHAPTERS = [{"id": 1, "title": "The Role of a Waiter", "subtitle": "What waiters do, why they matter, and the standard expected across hospitality", "duration": "20 min", "slides": [{"title": "Welcome to Waiters 101", "type": "intro", "body": "A waiter is far more than someone who carries plates. In any quality hospitality environment, whether a restaurant, a hotel dining room or a formal event, the waiter is the face of the operation. You are the person every guest speaks to, and the one who shapes whether they feel welcomed, valued and well looked after.\n\nThis course teaches the professional standard expected of waiters across the South African and international hospitality industry. Eleven modules, practical content, and the real standard that employers, venues and guests expect. Complete it and you will be ready to serve with confidence in any professional setting."}, {"title": "What a Waiter Really Is", "type": "body", "body": "Guests rarely remember the exact dish they ate months later. What they remember is how they were treated. The warmth of the greeting. Whether their glass was refilled before they had to ask. How calmly a problem was handled.\n\nThat is the waiter's real job. You are not only delivering food and drink. You are delivering an experience, and you are the single most visible part of it. A skilled waiter can lift an average meal into a good memory. A careless one can ruin an excellent meal. The role carries more influence over the guest's experience than almost any other on the floor."}, {"title": "The Core Responsibilities", "type": "list", "intro": "A waiter's responsibilities in any professional setting:", "items": ["Prepare and maintain their section before service begins", "Welcome guests and look after their table throughout the meal or event", "Take orders accurately and communicate them clearly to the kitchen or bar", "Serve food and beverages to the correct guest at the correct time", "Clear courses, reset covers and keep the table presentation clean", "Handle guest requests, questions and complaints with professionalism", "Support the wider team and contribute to smooth, calm service"]}, {"title": "Why Service Matters", "type": "body", "body": "In hospitality, service is the product as much as the food is. A restaurant with excellent food and poor service loses guests. A venue with good food and outstanding service keeps them coming back and earns the recommendations that fill tables.\n\nThis is true everywhere a waiter works. At a wedding, the guests judge the whole event partly by how they were served. In a hotel restaurant, the quality of service shapes whether a guest returns or reviews the hotel well. In a busy restaurant, attentive service is what turns a first-time visitor into a regular. The standard you hold directly affects the success of the business you work for."}, {"title": "The Professional Standard", "type": "highlight", "points": [{"text": "Arrive on time, prepared and presentable. A waiter who arrives late or unready creates a problem before service has even begun."}, {"text": "Know the setting: the layout, the menu, the service sequence, your section, and who you report to. Briefings and prep are where you gather the information you need to do the job well."}, {"text": "Be visible and attentive without hovering. Guests should feel looked after without feeling watched. Read your tables and be where you are needed."}, {"text": "Carry yourself professionally at all times. Your posture, expression and manner communicate your attitude before you say a single word."}]}, {"title": "Where Waiters Work: Events, Restaurants and Hotels", "type": "body", "body": "The standards in this course apply wherever you serve, though each setting has its own rhythm.\n\nAt events, such as weddings, functions and corporate occasions, service is often plated and coordinated, timing is tight, and you work as part of a large team delivering many covers at once. In restaurants, you build a relationship with your tables across a longer service, manage several tables at different stages, and the pace shifts through the shift. In hotels, you may serve breakfast, fine dining and room service, often to international guests with high expectations and a wide range of needs.\n\nA waiter who understands the core standard can adapt to any of these. The skill is the same. The setting simply changes how you apply it."}], "questions": [{"q": "What do guests most often remember about their experience?", "opts": ["The exact dishes and portion sizes", "How they were treated by the staff", "The price of the meal", "The decor of the room"], "a": 1}, {"q": "When does a waiter's professional responsibility begin?", "opts": ["When the first guests are seated", "When orders are taken", "Before service, by arriving on time, prepared and presentable", "When the manager gives the signal to start"], "a": 2}, {"q": "Which of these is a core responsibility of a waiter?", "opts": ["Managing the kitchen's plating and output", "Handling guest requests and complaints with professionalism", "Setting the menu prices", "Managing supplier deliveries"], "a": 1}, {"q": "What does \"be visible and attentive without hovering\" mean?", "opts": ["Stand at the guest's table throughout the meal", "Check every table every two minutes regardless of need", "Be present and available while reading tables and approaching when needed", "Stay at the service station until a guest calls you"], "a": 2}, {"q": "Why does the same core standard apply across events, restaurants and hotels?", "opts": ["Because all three pay waiters the same way", "Because the skill is the same and only the setting changes how it is applied", "Because guests behave identically in every setting", "Because the menus are always the same"], "a": 1}]}, {"id": 2, "title": "Professional Appearance", "subtitle": "Dress code, grooming, uniform standards, hygiene and personal presentation", "duration": "20 min", "slides": [{"title": "Your Appearance Is Your First Statement", "type": "body", "body": "Before you greet a guest, before you take an order, before you say a single word, your appearance has already told them something about the standard of service they are about to receive.\n\nA clean, well-pressed, correctly worn uniform says this person is professional, this place is well run, and this guest matters. A wrinkled shirt, a stained apron or a half-worn uniform says the opposite. Your appearance on shift is not a personal matter. It is a professional standard and a basic condition of the job."}, {"title": "Uniform Standards", "type": "list", "intro": "Follow these on every shift without exception:", "items": ["Uniform clean, ironed and in good condition, with no stains, tears or missing buttons", "Shirt fully tucked in throughout service", "Black, closed-toe, non-slip shoes, polished and in good repair", "Apron tied correctly and clean at the start of every shift", "Name badge, if issued, worn straight and at chest height", "No loose or excessive jewellery during food service", "Hair secured and off the face in any food and beverage environment"]}, {"title": "Grooming and Hygiene", "type": "list", "intro": "Personal hygiene is non-negotiable in hospitality:", "items": ["Shower before every shift. Body odour in a guest environment is unacceptable.", "Use deodorant. Keep any fragrance subtle, never overpowering.", "Wash your hands correctly before service and after every point of contamination", "Keep hair clean, tidy and secured if it is longer than collar length", "Keep breath fresh, since you speak with guests at close range", "For those who wear makeup, keep it natural and professional"]}, {"title": "Hands and Nails in Food Service", "type": "body", "body": "Your hands are the part of you closest to the food and the guest, so they receive the most scrutiny.\n\nKeep nails short and clean. Nail polish is not worn in food service environments, because chips can fall into food and the polish hides dirt beneath the nail. Wash hands thoroughly and often, especially after clearing plates, handling money, touching your face or hair, or returning from a break. Cuts should be covered with a clean dressing. Clean, well-kept hands are one of the clearest signals of a hygienic, professional operation."}, {"title": "Before Every Shift", "type": "highlight", "points": [{"text": "Do a full uniform and grooming check before you leave home or the changing room. It is too late to fix your appearance once you are in front of guests."}, {"text": "Carry a lint roller if your uniform attracts lint or hair. Looking neat is the result of preparation, not luck."}, {"text": "Replace any worn or damaged uniform item before your next shift rather than waiting to be told. A professional takes responsibility for their own presentation."}, {"text": "Maintain your standard to the end of the shift, not only when service begins."}]}, {"title": "Appearance Across Different Settings", "type": "body", "body": "The exact uniform changes with the setting, but the principle does not. A fine-dining restaurant may require formal black and white. A hotel may have its own branded uniform. An event company may supply a specific outfit for the function. A casual restaurant may be more relaxed in style but still expects clean and tidy.\n\nWhatever the dress code, your job is to meet it fully and wear it well. When you are unsure of the standard for a venue or event, ask before the shift, not on arrival. Turning up in the wrong attire, or in a poorly kept version of the right one, marks you as unprepared before you have served a single guest."}], "questions": [{"q": "What does a correctly worn uniform communicate before a waiter speaks?", "opts": ["The waiter's years of experience", "That the place is well run and the guest matters", "The price level of the menu", "The waiter's personal style"], "a": 1}, {"q": "What is the correct footwear standard during service?", "opts": ["Any clean dark shoe the waiter finds comfortable", "Sneakers that allow quick movement", "Black, closed-toe, non-slip shoes, polished and in good repair", "Formal dress shoes regardless of the floor surface"], "a": 2}, {"q": "Why is nail polish not worn in food service?", "opts": ["It looks unprofessional in photographs", "Chips can fall into food and it hides dirt beneath the nail", "It takes too long to apply before a shift", "Guests find bright colours distracting"], "a": 1}, {"q": "When should a waiter check their full appearance?", "opts": ["Once service has started", "Before leaving home or the changing room", "Only when a manager asks", "Halfway through the shift"], "a": 1}, {"q": "What should a waiter do if unsure of a venue's dress code?", "opts": ["Wear their usual uniform and adjust later", "Ask before the shift, not on arrival", "Wear formal black and white to be safe", "Copy whatever the other staff wear on the day"], "a": 1}]}, {"id": 3, "title": "Professional Behaviour", "subtitle": "Punctuality, attitude, conduct, device etiquette and working under pressure", "duration": "20 min", "slides": [{"title": "Behaviour Defines Your Reputation", "type": "body", "body": "Your appearance gets you through the door. Your behaviour determines whether you are invited back.\n\nHow you behave on a shift, your attitude, your timekeeping, how you treat colleagues and guests, and how you handle pressure, builds or damages your professional reputation. In hospitality, word travels fast between venues, managers and agencies. A waiter known for professionalism, reliability and a positive attitude is the one who keeps getting work and gets the better shifts. One known for lateness, attitude or poor conduct does not."}, {"title": "Conduct Standards on Shift", "type": "list", "intro": "These standards apply on every shift, in every setting:", "items": ["Arrive at least 15 minutes before the briefing or shift start, not exactly on time", "Greet your supervisor and team on arrival. A professional acknowledges the people they work with.", "Do not eat, drink or chew gum in guest areas. Staff meals happen before service or in the staff area.", "Do not sit in areas meant for guests. You are working.", "Keep personal conversations out of guest earshot", "Speak respectfully to every team member, including those in junior roles", "If you make a mistake, acknowledge it and put it right. Do not hide it."]}, {"title": "Phone and Device Etiquette", "type": "list", "intro": "Your phone does not belong in your hand during service:", "items": ["Phone on silent and out of sight during service, in a pocket, locker or bag", "No texting, scrolling or calls in guest areas while on shift", "If you are expecting an urgent personal call, tell your supervisor before the shift begins", "Do not photograph guests, food or the venue without permission", "Posting about a private function or a guest on social media is a serious breach of trust and, in many venues, grounds for dismissal", "A guest who sees a waiter on their phone reads it as a sign they are not the priority, so even a quick glance at a screen undoes the impression of attentive service"]}, {"title": "Punctuality and Reliability", "type": "body", "body": "Reliability is one of the most valued qualities in any waiter, and one of the simplest to control.\n\nArriving on time, every time, tells your employer they can build their service around you. Being reachable, responding to shift offers promptly, and turning up when you have committed are what separate a waiter who gets called first from one who gets called last. If you genuinely cannot make a shift, communicate as early as possible so the team can cover. A late cancellation or a no-show puts the whole service under strain and is remembered long after."}, {"title": "Working Under Pressure", "type": "highlight", "points": [{"text": "Pressure is part of the job. A full section, a demanding guest, a delayed course and a short team all at once is normal. How you respond in those moments defines your professional standard."}, {"text": "Stay calm and prioritise. Identify the most urgent need and deal with it first. A waiter who visibly panics signals to guests that the service is out of control."}, {"text": "Ask for help. Recognising that you need support is professional. Struggling in silence and falling behind is not."}, {"text": "Your attitude is contagious. Negativity during a hard service spreads to colleagues and can be felt by guests. A composed, steady manner lifts the whole team."}]}, {"title": "Attitude and Professionalism", "type": "body", "body": "The best waiters treat every shift with the same standard, whether they are serving two guests or two hundred. They do not let a quiet night make them careless or a chaotic one make them rude.\n\nAttitude is a choice you make at the start of every shift. You will have difficult days, demanding guests and long hours. The professional standard is to leave that at the door and give every guest the same attentive, courteous service. That consistency, more than any single skill, is what builds a career in hospitality."}], "questions": [{"q": "How early should a waiter arrive relative to the briefing or shift start?", "opts": ["Exactly on time", "5 minutes before", "At least 15 minutes before", "Whenever is convenient"], "a": 2}, {"q": "What is the correct approach when you make a mistake during service?", "opts": ["Hide it if you can to avoid attention", "Blame the kitchen or a colleague", "Acknowledge it and put it right", "Wait until after the shift to mention it"], "a": 2}, {"q": "What is the correct standard for phones during service?", "opts": ["May be used during quiet moments", "On silent and out of sight in guest areas at all times", "Kept in hand for work messages only", "Used freely when no manager is nearby"], "a": 1}, {"q": "Why does reliability matter so much in hospitality?", "opts": ["It is the only skill that matters", "It tells an employer they can build their service around you, so you get called first", "It allows you to arrive late occasionally", "It replaces the need for good service skills"], "a": 1}, {"q": "What does working under pressure professionally require?", "opts": ["Working faster regardless of accuracy", "Telling guests the service will be slow", "Staying calm, prioritising the most urgent need, and asking for help when needed", "Handling everything alone without support"], "a": 2}]}, {"id": 4, "title": "Understanding the Menu", "subtitle": "Reading menus, allergens, dietary requirements and communicating with the kitchen", "duration": "25 min", "slides": [{"title": "Know What You Are Serving", "type": "body", "body": "A waiter who cannot describe what is on the menu is not ready for professional service. Menu knowledge is one of the most visible marks of a good waiter, and one of the most common weaknesses in untrained staff.\n\nYou do not need to know the recipe. You need to know the dish: what is in it, what the main ingredients are, what dietary needs it does and does not suit, and what a guest who has not seen it would want to know before choosing. Study the menu before every shift, ask questions during prep, and know what you are serving before you serve it."}, {"title": "Reading and Describing a Menu", "type": "body", "body": "A guest will often ask what a dish is like, or which of two options you would recommend. Being able to answer well is part of good service.\n\nLearn to describe a dish in one or two clear sentences: the main component, how it is prepared, and what comes with it. For example, a grilled line fish served with lemon butter and seasonal vegetables. Know the dishes that are popular, the ones the kitchen is proud of, and any that take longer to prepare so you can guide guests who are in a hurry. A waiter who can describe the menu with confidence puts the guest at ease and sells the kitchen's work."}, {"title": "Allergens and Dietary Requirements", "type": "list", "intro": "Every waiter must understand the most common dietary needs:", "items": ["Vegetarian: no meat, poultry or seafood. Dairy and eggs are usually fine.", "Vegan: no animal products at all. Confirm with the kitchen.", "Gluten-free: no wheat, rye, barley or oats. Cross-contamination is a real risk.", "Halaal: no pork and no alcohol in preparation. Confirm the kitchen's compliance.", "Kosher: strict dietary laws. Confirm with the caterer before advising the guest.", "Nut allergy: potentially life-threatening. Any nut content must be confirmed exactly.", "Dairy-free: no milk, butter, cream or cheese in any form."]}, {"title": "Communicating with the Kitchen", "type": "steps", "intro": "When a guest has a dietary requirement, follow this sequence:", "steps": [{"number": "1", "label": "Take the full order first", "detail": "Record the requirement clearly on your pad. Do not try to judge the menu yourself. You are not the chef."}, {"number": "2", "label": "Confirm with the kitchen", "detail": "Ask directly, for example, can this be made without the ingredient, or which dishes are safe for this requirement. Get a clear yes or no."}, {"number": "3", "label": "Return to the guest with a clear answer", "detail": "Confirm what is available and repeat the order back, including the change. Note the change clearly on the docket."}]}, {"title": "What You Must Never Do", "type": "highlight", "points": [{"text": "Never tell a guest a dish is allergy-safe without confirming with the kitchen. A wrong answer can cause a serious medical emergency."}, {"text": "Never guess based on how a dish looks. Hidden ingredients, such as nuts in a sauce or dairy in a marinade, are common."}, {"text": "Never treat a dietary requirement as a fussy preference. Treat every one as if it is medically necessary."}, {"text": "Never forget to mark a dietary change on the docket. A spoken note that does not reach the kitchen has not been communicated."}]}, {"title": "Menu Knowledge in Practice", "type": "body", "body": "Good menu knowledge shows in small moments throughout a service. A guest asks if a dish is spicy and you answer without hesitation. Someone with a gluten allergy asks what is safe and you guide them calmly. A guest cannot decide and you make a confident recommendation they enjoy.\n\nEach of these builds trust and makes the guest feel looked after. None of it is possible without doing the work before service. Treat the few minutes spent learning the menu as part of the job, because it is one of the clearest things that separates a trained waiter from an untrained one."}], "questions": [{"q": "What should a waiter do when unsure whether a dish contains a specific allergen?", "opts": ["Tell the guest it is probably safe", "Suggest a simpler dish to avoid risk", "Confirm with the kitchen before advising the guest", "Ask a more senior waiter to guess"], "a": 2}, {"q": "What does \"vegan\" mean?", "opts": ["No red meat, but poultry and seafood are fine", "No meat or poultry, but dairy and eggs are fine", "No animal products of any kind", "No meat, but honey and dairy are fine"], "a": 2}, {"q": "Why must a dietary change be written on the docket?", "opts": ["So the manager can count special requests later", "Because a spoken note that does not reach the kitchen has not been communicated", "So the guest can be charged correctly", "So the client can track requirements at the event"], "a": 1}, {"q": "How should every dietary requirement be treated?", "opts": ["As a preference that may not be important", "As medically necessary, whatever the waiter believes", "As important only if the guest names a medical condition", "As important only for guests who look unwell"], "a": 1}, {"q": "What is a good way to describe a dish to a guest?", "opts": ["Read the full recipe from memory", "Give the main component, how it is prepared, and what comes with it", "Tell them it is the chef's favourite and leave it there", "Say it is hard to describe and suggest they try it"], "a": 1}]}, {"id": 5, "title": "Service Basics: Serving and Clearing", "subtitle": "Carrying technique, order of service, beverage service and clearing tables", "duration": "25 min", "slides": [{"title": "How You Serve Is as Important as What You Serve", "type": "body", "body": "The food may be excellent. But if it arrives from the wrong side, set down carelessly, with no word to the guest and fingerprints on the rim, the impression is poor.\n\nServing and clearing correctly is a skill that has to be practised and applied the same way every time. Every plate placed, every glass refilled, every course cleared follows a standard. The guest should not be able to tell the difference between the third table you served and the thirtieth."}, {"title": "The Order of Service", "type": "list", "intro": "Apply this sequence consistently at every table:", "items": ["Serve from the left and clear from the right, the standard convention in formal service", "Serve ladies first, then gentlemen, with the host or most senior guest served last", "Move around the table in one direction for both serving and clearing", "Never reach across a guest. Move to the correct side instead.", "Announce each dish briefly as you place it", "Aim for all plates at a table to arrive together. Coordinate with your team where needed.", "Clear only when every guest at the table has finished, never while someone is still eating"]}, {"title": "Carrying Plates Correctly", "type": "steps", "intro": "Plates are carried and placed using a professional technique:", "steps": [{"number": "1", "label": "Hold from below", "detail": "Support the plate with your palm and fingers. Never grip the rim. Your thumb must not touch the eating surface."}, {"number": "2", "label": "Carry two before three", "detail": "Learn to carry two plates safely in one hand before attempting more. A plate dropped from overloading reflects on your preparation."}, {"number": "3", "label": "Place and announce", "detail": "Set down from the correct side, make brief eye contact, name the dish, step back and move on. Do not linger."}]}, {"title": "Pouring and Beverage Service", "type": "body", "body": "Beverage service follows the same care as food. Pour from the guest's right where possible, and never let your hand or the bottle touch the rim of the glass. Pour water and soft drinks steadily without overfilling, and pour wine to the correct level rather than to the top of the glass.\n\nKeep an eye on glasses throughout the meal and refill water before it runs dry. For bottled drinks, present and open at the table where the setting calls for it. Calm, clean pouring is a small skill that guests notice, and spills or fumbling are equally noticed."}, {"title": "Clearing the Table", "type": "highlight", "points": [{"text": "Wait until every guest at the table has finished before clearing any plate. One guest still eating while plates are cleared around them is uncomfortable for the whole table."}, {"text": "Clear with care. Remove plates quietly, stack them away from the guest's view, and never scrape or pile noisily."}, {"text": "After a course, crumb the table with a crumber or clean folded cloth before the next course."}, {"text": "Clear an empty glass, refill or leave one still in use, and never remove a glass a guest is still drinking from."}]}, {"title": "Resetting for the Next Course", "type": "body", "body": "Between courses, the table should be reset so the next course arrives to a clean, correct setting. Remove used items, clear crumbs, and lay or adjust cutlery for what comes next. Straighten anything that has been moved, and top up water.\n\nA well-reset table tells the guest the meal is being looked after with care, and it keeps the pace of service smooth. Rushing the reset, or skipping it, leaves the table cluttered and the next course feeling careless. The small moments between courses are part of the service, not a gap in it."}], "questions": [{"q": "From which side is food served and cleared in formal service?", "opts": ["Served and cleared from the right", "Served from the left, cleared from the right", "Served from the right, cleared from the left", "Either side, whichever is quicker"], "a": 1}, {"q": "When should a course be cleared from a table?", "opts": ["When the fastest guest has finished", "At fixed time intervals", "When every guest at the table has finished", "As soon as a guest pushes their plate aside"], "a": 2}, {"q": "What is the correct way to hold a plate when serving?", "opts": ["Grip the rim firmly between thumb and finger", "Hold from below with the palm and fingers, thumb off the surface", "Use both hands for every plate", "Wrap a cloth around the base and grip the top"], "a": 1}, {"q": "What should a waiter do between courses?", "opts": ["Serve the next course immediately to keep pace", "Wait in the kitchen until the next course is ready", "Reset the table, clear crumbs and adjust cutlery for the next course", "Ask the guest if they are ready for the next course"], "a": 2}, {"q": "What is the correct approach to pouring?", "opts": ["Fill every glass to the top to save trips", "Pour steadily without overfilling and without touching the rim", "Let guests pour their own drinks", "Pour only when a guest asks"], "a": 1}]}, {"id": 6, "title": "Guest Interaction", "subtitle": "Greeting guests, taking orders, handling requests and upselling", "duration": "25 min", "slides": [{"title": "Every Interaction Shapes the Experience", "type": "body", "body": "A guest's experience is not one thing. It is a series of moments. The greeting when they sit down. The way their order is taken. Whether their water is refilled before they ask. How a request is handled. Whether the waiter knows the menu.\n\nEvery one of these moments is an interaction, and every interaction either adds to the experience or takes away from it. A professional waiter treats each one with genuine attention and a service mindset, because the guest's overall impression is built from all of them together."}, {"title": "Greeting and Seating Guests", "type": "list", "intro": "The first interaction sets the tone for everything that follows:", "items": ["Acknowledge every guest within about 30 seconds of them being seated, even if it is only eye contact and a nod to show you have seen them", "Greet warmly and clearly, introducing yourself by name where the setting suits it", "Present menus promptly and offer water without being asked", "Allow guests a moment to settle before pressing for orders. Read the energy of the table.", "If the table was not ready when they arrived, apologise briefly and fix it. Do not explain the reasons."]}, {"title": "Taking Orders", "type": "steps", "intro": "Take every order using a consistent process:", "steps": [{"number": "1", "label": "Be ready and attentive", "detail": "Have your pad open, pen ready and your full attention on the guest. Do not arrive and then fumble for a pen."}, {"number": "2", "label": "Listen and note carefully", "detail": "Capture each guest's choice and any changes accurately. Note who ordered what so you can serve without asking later."}, {"number": "3", "label": "Repeat the order back", "detail": "Before leaving, repeat the full order to confirm it, including any changes. This is not optional. It prevents errors."}]}, {"title": "Handling Requests", "type": "body", "body": "A guest request is actioned at once, not when it happens to be convenient. \"I will be right back with that\" must mean right back, not five minutes later after three other tasks.\n\nIf a request will take time, say so honestly and give a realistic idea of how long. If you cannot fulfil it yourself, find the person who can rather than leaving the guest waiting. Small requests handled quickly and well are one of the clearest signs of attentive service, and forgotten requests are one of the most common complaints in hospitality."}, {"title": "Upselling Without Pressure", "type": "highlight", "points": [{"text": "Upselling is a service, not a sales tactic. Describing a dish well, recommending a drink to go with it, or suggesting a dessert adds to the guest's enjoyment."}, {"text": "One confident recommendation beats a list of options. \"The malva pudding tonight is excellent\" works better than \"would you like to see the dessert menu.\""}, {"text": "Read the table. A guest who knows what they want needs no guidance. One who is undecided welcomes a confident suggestion."}, {"text": "Never pressure. If a guest declines, move on warmly. Upselling that makes a guest uncomfortable does the opposite of its purpose."}]}, {"title": "Reading the Table", "type": "body", "body": "The best waiters watch their tables and respond to what they see, without being asked. A guest looking around the room is usually looking for you. A table leaning in and talking quietly does not want to be interrupted. A guest who has finished and is checking the time may want the bill.\n\nThis is the skill of reading the table, and it is learned by paying attention. The aim is to be present at the moments the guest needs you and out of the way at the moments they do not. A waiter who reads the table well makes service feel effortless to the guest, which is exactly the impression you are working to create."}], "questions": [{"q": "Within how long should a newly seated guest be acknowledged?", "opts": ["About 30 seconds, even if only with eye contact", "Two minutes, to let them settle", "Only once they signal they are ready", "Five minutes, so they are not rushed"], "a": 0}, {"q": "Why should a waiter repeat the order back before leaving the table?", "opts": ["To show off their menu knowledge", "To give the guest a chance to order more", "To confirm accuracy and prevent errors", "To let the kitchen start early"], "a": 2}, {"q": "What is the professional approach to upselling?", "opts": ["Suggest every add-on to raise the bill", "Make one confident, genuine recommendation and accept the guest's decision", "Only upsell guests who seem to be celebrating", "Upsell only at dessert"], "a": 1}, {"q": "How should a guest request be handled while you are busy?", "opts": ["Finish everything else first, then deal with it", "Acknowledge it at once and action it as soon as you can, not when convenient", "Pass it to whichever colleague is free", "Ask the guest to wait while you finish"], "a": 1}, {"q": "What does \"reading the table\" mean?", "opts": ["Memorising the full order without writing it down", "Watching the table and responding to what guests need without being asked", "Checking the table every five minutes on a fixed schedule", "Reading the menu aloud to undecided guests"], "a": 1}]}, {"id": 7, "title": "Handling Complaints", "subtitle": "Listening, de-escalating, resolving and knowing when to escalate", "duration": "20 min", "slides": [{"title": "A Complaint Is a Second Chance", "type": "body", "body": "When a guest complains, they are telling you something went wrong and giving you a chance to fix it. The alternative, a guest who says nothing and leaves unhappy, is worse, because they tell others and do not come back.\n\nA complaint handled with genuine care, speed and professionalism often leaves the guest more satisfied than if nothing had gone wrong at all. This is well established in hospitality. How you handle a complaint is one of the most powerful moments in the whole service, for better or for worse."}, {"title": "The Complaint Resolution Process", "type": "steps", "intro": "Apply this to every complaint, large or small:", "steps": [{"number": "1", "label": "Listen completely", "detail": "Let the guest finish. Do not interrupt, explain or defend while they speak. Face them, make eye contact and show you are taking it seriously. They need to feel heard first."}, {"number": "2", "label": "Acknowledge and apologise", "detail": "A sincere apology before any explanation. A guest who receives a genuine apology first is ready to accept a solution."}, {"number": "3", "label": "Act and follow up", "detail": "Tell the guest what you will do and by when, then do it. Return personally to confirm it is resolved. Do not delegate and disappear."}]}, {"title": "Common Complaint Scenarios", "type": "list", "intro": "Know how to respond to frequent situations:", "items": ["Wrong dish: apologise, remove it, confirm the correct order with the kitchen, and return it as quickly as possible", "Cold food: apologise and take it to be replaced. Do not reheat it in front of the guest.", "Long wait: acknowledge the delay before the guest raises it, apologise, and give an honest timeframe", "Missing item: apologise, go at once, and return with it", "Rude or inattentive service: apologise sincerely and take ownership. Do not blame a colleague."]}, {"title": "Language That Calms and Language That Inflames", "type": "body", "body": "The words you choose during a complaint either settle the guest or make things worse.\n\nCalming language takes ownership and focuses on the fix: \"I am very sorry, let me sort that out for you right away.\" Inflaming language argues or shifts blame: starting a reply with \"but\" or \"actually,\" telling the guest they are mistaken, or blaming the kitchen. Even when you believe the guest is wrong, your goal is to restore their experience, not to win the point. A calm, owning tone defuses almost any complaint. A defensive one escalates it."}, {"title": "When to Escalate", "type": "highlight", "points": [{"text": "Minor issues, such as a cold dish or a missing item, are resolved by the waiter directly. Not everything needs a manager."}, {"text": "Escalate when the guest is still upset after your attempt to resolve it, when there is a billing dispute, when there is a health or safety concern, or when the guest asks for the manager."}, {"text": "When you escalate, brief the supervisor before they reach the table so the guest does not have to explain everything again."}, {"text": "Never argue with a guest, even when you are sure they are wrong. The aim is to restore the experience."}]}, {"title": "After the Complaint", "type": "body", "body": "Resolving the complaint is not quite the end. Once the issue is fixed, check back discreetly to confirm the guest is now happy, without drawing fresh attention to what went wrong. A simple \"I hope everything is better now\" is enough.\n\nWhere appropriate, let your supervisor know what happened, so the team can prevent it next time and is not caught off guard if the guest mentions it again. A complaint handled well and closed properly can turn an unhappy guest into a loyal one, which is the whole reason the process matters."}], "questions": [{"q": "What does handling a complaint well often achieve?", "opts": ["The guest becomes a permanent critic regardless", "The guest often leaves more satisfied than if nothing had gone wrong", "The guest always expects money back", "The guest never returns even when it is resolved"], "a": 1}, {"q": "What is the first step in the complaint process?", "opts": ["Apologise before the guest finishes speaking", "Listen completely without interrupting or defending", "Fix the issue before saying anything", "Call the manager at once"], "a": 1}, {"q": "When should a complaint be escalated to a supervisor?", "opts": ["Every complaint, to protect the waiter", "When the guest is still upset after your attempt, or asks for the manager", "Only for billing disputes", "Only when the waiter is unsure who caused it"], "a": 1}, {"q": "Which is calming language during a complaint?", "opts": ["\"But that is not what usually happens\"", "\"Actually, the kitchen is very busy tonight\"", "\"I am very sorry, let me sort that out for you right away\"", "\"I think you may be mistaken about that\""], "a": 2}, {"q": "What should a waiter do after a complaint is resolved?", "opts": ["Avoid the table for the rest of the meal", "Check back discreetly to confirm the guest is now happy", "Remind the guest of what went wrong", "Add a discount without being asked"], "a": 1}]}, {"id": 8, "title": "Teamwork", "subtitle": "Working with the team, back of house coordination and pre-shift briefings", "duration": "20 min", "slides": [{"title": "Hospitality Runs on Teams", "type": "body", "body": "No waiter runs a successful service alone. The quality of a meal or an event depends on how well everyone, front of house, kitchen and management, plays their part and supports the people around them.\n\nA waiter who looks after only their own tables while colleagues struggle is not a professional. A waiter who communicates clearly, helps where needed and treats every team member with respect builds the trust that makes the whole operation work. In hospitality, the team is what the guest ultimately experiences."}, {"title": "Supporting Your Team During Service", "type": "list", "intro": "On every shift, these team behaviours are expected:", "items": ["If you pass a table that needs water and a colleague is busy, fill it. It takes seconds.", "If a colleague drops something or falls behind, help them. Your table can wait a moment.", "Ask for help clearly when you need it. \"I need a hand on tables four and five\" is professional.", "Share the side work fairly. Clearing, resetting and cleaning at the end is everyone's job.", "Do not complain about colleagues where guests can hear. Sort disagreements privately, after service.", "Recognise a colleague who has done well. It builds a stronger team."]}, {"title": "The Pre-Shift Briefing", "type": "steps", "intro": "Most professional services begin with a briefing. Attend it fully:", "steps": [{"number": "1", "label": "Arrive ready", "detail": "Know your section, have your pad and pen, and be in full uniform before the briefing starts. It is not the time to get ready."}, {"number": "2", "label": "Listen and take notes", "detail": "The briefing covers the menu, the service plan, your role, the guests or client, and any special needs. Write it down rather than relying on memory."}, {"number": "3", "label": "Ask before service", "detail": "If anything is unclear, ask during the briefing, not during service in front of guests."}]}, {"title": "Back of House and Front of House", "type": "body", "body": "The kitchen and the floor depend on each other completely. A waiter who ignores the kitchen, or who creates friction with kitchen staff, makes both jobs harder and the guest's experience worse.\n\nTreat kitchen staff with respect. They prepare the food you depend on. Pass information clearly and early, especially when a course is delayed or a dietary change is needed, and always put dietary changes on the docket rather than relying on a spoken word in a busy kitchen. A good working relationship between front and back of house is one of the quiet foundations of smooth service."}, {"title": "Communication on a Busy Floor", "type": "body", "body": "When service gets busy, clear communication is what keeps it from falling apart. Tell the floor when a course is running late so the whole team knows, not just you. Flag a table that needs attention if you cannot get to it. Confirm who is covering what when someone steps away.\n\nShort, clear, calm communication is the goal. Shouting, vague comments or silence all cause problems. A team that talks to each other well moves through a rush smoothly, while a team that does not gets overwhelmed by the same volume."}, {"title": "Being the Team Member Others Rely On", "type": "body", "body": "Every team has members others are glad to work with, and members they are wary of. The difference is rarely talent. It is reliability, attitude and willingness to help.\n\nBe the waiter who turns up ready, carries their share, helps without being asked and stays calm when it is busy. That reputation travels, and it is what gets you recommended, rebooked and trusted with more responsibility. Being good to work with is as valuable to your career as being good at the work itself."}], "questions": [{"q": "What should you do when you pass a colleague's table that needs water and they are busy?", "opts": ["Leave it, as it is their section", "Mention it to them when they are free", "Fill it yourself. It takes seconds.", "Tell the manager to reassign the table"], "a": 2}, {"q": "What should a waiter do if unclear about a briefing instruction?", "opts": ["Work it out during service from watching others", "Ask quietly during service when the manager is away", "Ask during the briefing, before service begins", "Rely on previous experience instead"], "a": 2}, {"q": "Why should a dietary change go on the docket rather than be spoken only?", "opts": ["It protects the waiter in a dispute", "Spoken notes fail regularly in a busy kitchen, so the docket makes sure it reaches the chef", "Kitchens may not act on spoken instructions by law", "Written dockets are legally required for all events"], "a": 1}, {"q": "What is the goal of communication on a busy floor?", "opts": ["Loud updates so everyone hears", "Short, clear, calm information shared with the team", "Keeping problems to yourself to avoid panic", "Communicating only with the manager"], "a": 1}, {"q": "What most makes a waiter someone others rely on?", "opts": ["Being the most naturally talented", "Reliability, attitude and willingness to help", "Working only their own section perfectly", "Avoiding the busy stations"], "a": 1}]}, {"id": 9, "title": "Common Mistakes to Avoid", "subtitle": "Errors in service, body language, communication and appearance", "duration": "20 min", "slides": [{"title": "Mistakes That Cost You Work", "type": "body", "body": "Your reputation is built or damaged one shift at a time. The managers and agencies who book staff remember who performed well and who did not. The mistakes in this module are the ones that get a waiter dropped from a roster, not because anyone is harsh, but because they directly hurt the guest's experience and the business.\n\nKnowing what not to do is as important as knowing what to do. Study this module as carefully as any other, because avoiding these errors is often what keeps a waiter in steady work."}, {"title": "Service and Conduct Errors", "type": "two-col", "left": {"heading": "WHAT PROFESSIONALS DO", "items": ["Carry plates from below, never touching the food surface", "Move in one direction and serve from the correct side consistently", "Clear only when every guest has finished", "Stay composed when things go wrong", "Acknowledge guests within about 30 seconds of seating", "Keep the uniform correct for the full shift"]}, "right": {"heading": "WHAT COSTS YOU WORK", "items": ["Gripping plate rims or touching food", "Reaching across guests because the correct side is less convenient", "Clearing one guest's plate while others still eat", "Becoming visibly flustered when it gets busy", "Leaving guests unacknowledged while busy elsewhere", "Untucking a shirt or removing an apron before service ends"]}}, {"title": "Body Language Errors", "type": "list", "intro": "These non-verbal mistakes damage the impression even when nothing is said:", "items": ["Rolling eyes, sighing or showing frustration where guests can see", "Crossing arms or standing with hands in pockets in guest areas", "Yawning openly on the floor, however long the shift has been", "Leaning on walls or furniture during quiet moments", "Looking at the clock or the door repeatedly", "A blank or unfriendly expression when approaching a table"]}, {"title": "Communication Errors", "type": "list", "intro": "These verbal habits work against good service:", "items": ["Speaking loudly with colleagues about personal matters near guests", "Using slang or overly casual language with guests", "Answering a complaint with \"but\" or \"actually,\" which begins an argument", "Saying \"I do not know\" and leaving it there, instead of finding out", "Interrupting a guest who is still speaking or ordering", "Making promises about timing you cannot keep"]}, {"title": "Appearance Mistakes", "type": "list", "intro": "", "items": ["Arriving with an unpressed or stained uniform, which should be sorted before you leave home, not at the venue", "Loose or unsecured hair during food service, which is both a hygiene and a presentation failure", "Removing parts of the uniform in guest areas before the shift is fully over", "Strong perfume or cologne that competes with food aromas", "Chipped nail polish or untidy hands close to the food and the guest"]}, {"title": "How Professionals Recover from a Mistake", "type": "body", "body": "Everyone makes mistakes on the floor. What separates a professional is how they recover. The professional response is simple: own it, fix it, and move on without dwelling on it.\n\nIf you bring the wrong dish, apologise, correct it quickly, and carry on with the same composure. Do not let one error rattle you into a string of them, and do not hide it and hope no one notices. Guests forgive a mistake handled gracefully far more easily than one that is denied or compounded. Recovering well can even leave a better impression than if nothing had gone wrong."}], "questions": [{"q": "Why does reaching across a guest reflect poorly on a waiter?", "opts": ["It is slower than moving around", "It shows the waiter values convenience over the guest's comfort", "It breaks a health regulation", "It disturbs the place setting"], "a": 1}, {"q": "What does answering a complaint with \"but\" or \"actually\" signal?", "opts": ["Helpful context for the guest", "That the waiter is about to argue rather than resolve it", "Confidence and experience", "Partial acceptance of responsibility"], "a": 1}, {"q": "Which of these is a body language error in guest areas?", "opts": ["Standing upright and attentive", "Crossing arms or putting hands in pockets", "Making eye contact when approaching", "Smiling at a guest"], "a": 1}, {"q": "When may a waiter remove part of the uniform, such as the apron, in guest areas?", "opts": ["Once all courses are served", "When a supervisor allows it in a quiet moment", "Only after the shift is fully over and they are dismissed", "Whenever they feel too warm"], "a": 2}, {"q": "What is the professional way to recover from a mistake on the floor?", "opts": ["Hide it and hope no one notices", "Own it, fix it quickly, and carry on with composure", "Blame whoever was nearest", "Apologise repeatedly for the rest of the meal"], "a": 1}]}, {"id": 10, "title": "Qualities of a Great Waiter", "subtitle": "Attitude, attention to detail, memory, speed and professionalism", "duration": "20 min", "slides": [{"title": "What Separates Good from Exceptional", "type": "body", "body": "Technical skills can be taught. The qualities in this module, attention, memory, composure, warmth and professionalism, are what decide whether a waiter is merely competent or genuinely excellent.\n\nHospitality settings, from busy restaurants to formal functions and quality hotels, set a high standard and guests have real expectations. The waiters who meet and exceed those expectations are the ones who build lasting careers. This module is about becoming that kind of professional, not just an adequate one."}, {"title": "Attention to Detail", "type": "body", "body": "Attention to detail is noticing what others miss and acting on it. The empty glass before the guest reaches for it. The dropped napkin. The guest at the end of the table who has been waiting to order. The crumb on the cloth before the next course.\n\nNone of these are dramatic, but together they are the difference between service that feels cared for and service that feels careless. A waiter with strong attention to detail seems to anticipate the table, when in truth they are simply watching closely and acting on what they see. It is a habit anyone can build by paying attention."}, {"title": "Memory and Recall", "type": "body", "body": "A good memory makes a waiter look effortless and makes the guest feel known. Remembering who ordered which dish so you can serve without asking. Recalling the guest with the allergy. Holding the small preference mentioned at the start of the meal.\n\nYou do not need a perfect memory, you need a reliable system: write orders down clearly, note who sits where, and check your pad rather than guess. Where you can remember without notes, it adds a personal touch that guests notice and appreciate. Either way, the goal is the same: serve the right thing to the right guest, every time, without asking them to repeat themselves."}, {"title": "Speed, Composure and Warmth", "type": "highlight", "points": [{"text": "Speed without rushing: move efficiently and keep service flowing, without creating an atmosphere of panic or chaos."}, {"text": "Composure: stay calm and steady whether you are serving two guests or two hundred. Composure reassures guests and steadies the team."}, {"text": "Warmth: make guests feel genuinely welcomed. Not a performed smile, but real care. Warmth is what guests remember most."}, {"text": "These three together define how a great waiter feels to be served by: quick, calm and genuinely kind."}]}, {"title": "The Professional Mindset", "type": "body", "body": "A great waiter does not wait to be told what to do. They look at the room, see what is needed, and do it. Being proactive is a basic professional standard, not something extra.\n\nConsistency matters more than the occasional brilliant night. A waiter who is excellent sometimes and careless other times is not yet a professional. The standard is the standard, every shift. And the best waiters take pride in the craft itself, in a glass poured well and a plate placed correctly, because they treat the guest's table as the most important thing in the room, which to that guest, it is."}, {"title": "Building Your Reputation", "type": "body", "body": "In hospitality, your name is your business. Managers, supervisors and clients remember who performed well. A waiter known for reliability, professionalism and a consistently high standard is the one called first for the best work.\n\nEvery shift adds to that reputation or chips away at it. Your performance tonight is your portfolio for the next opportunity. Treat each shift as if someone is deciding whether to recommend you, because often, someone is. A strong reputation, built one good shift at a time, is the most valuable thing a waiter owns."}], "questions": [{"q": "What does \"consistency matters more than occasional brilliance\" mean?", "opts": ["One excellent night outweighs steady performance", "Performing to the standard every shift beats being excellent sometimes and careless other times", "Speed matters more than quality", "Appearance matters more than service"], "a": 1}, {"q": "What does being proactive mean in service?", "opts": ["Doing tasks after being told twice", "Seeing what is needed and acting before being told", "Volunteering for jobs outside the role", "Reporting complaints before guests raise them"], "a": 1}, {"q": "Which quality lets a waiter serve the right dish to the right guest without asking?", "opts": ["Speed", "Warmth", "Memory and recall, supported by clear notes", "Composure"], "a": 2}, {"q": "What is attention to detail?", "opts": ["Memorising the entire menu", "Noticing small things others miss and acting on them", "Working as fast as possible", "Following a fixed checklist for every table"], "a": 1}, {"q": "How is a strong professional reputation built?", "opts": ["Through networking at industry events", "By performing to a consistent standard, one shift at a time", "By working only at high-profile venues", "Through formal qualifications alone"], "a": 1}]}, {"id": 11, "title": "Delivering Excellent Service", "subtitle": "Going beyond the basics and creating memorable guest experiences", "duration": "25 min", "slides": [{"title": "What Excellent Actually Looks Like", "type": "body", "body": "Every waiter learns the basics: serve from the left, clear from the right, repeat the order back. Excellence is built on top of those basics. It is the layer that turns competent service into a memorable experience.\n\nExcellence looks like this: the water is refilled before the guest notices it is empty. The guest celebrating a birthday is acknowledged warmly. The delayed course is mentioned before the guest has to ask. The problem is solved before it becomes a complaint. None of these happen by accident. They are the result of genuine attention and care."}, {"title": "The Details That Create Memorable Experiences", "type": "list", "intro": "Excellent service lives in details guests feel even when they do not consciously notice them:", "items": ["Refilling water before the guest has to ask or sit with an empty glass", "Placing the correct dish in front of each guest without asking who ordered what", "Noticing and quietly acknowledging a special occasion", "Keeping the table free of clutter, with menus cleared after ordering", "Checking back shortly after the food arrives, while anything can still be fixed", "Making every guest at the table feel equally looked after, not just the most vocal one"]}, {"title": "Anticipating Needs", "type": "body", "body": "The highest skill in service is anticipation, seeing what a guest will need before they realise it themselves. A guest who has just finished a course needs their glass checked. A guest who has waited longer than expected needs acknowledgement before they ask.\n\nAnticipation is learned by watching. A guest glancing around the room is usually looking for you. A glass at the three-quarter mark will need refilling soon. You cannot predict everything, but a waiter who anticipates more than the guest expects creates an impression of exceptional service with small, well-timed actions."}, {"title": "Service Recovery as Excellence", "type": "body", "body": "Excellence is not only about a flawless meal. Some of the strongest impressions come from how a problem is handled. A guest whose complaint is met with a genuine apology and a quick, caring fix often leaves more loyal than one who had no problem at all.\n\nThis is service recovery, and it is part of excellent service, not separate from it. The lesson is that you do not need everything to go perfectly to deliver an excellent experience. You need to notice when something goes wrong and put it right with genuine care. Done well, recovery becomes one of the most memorable parts of the visit."}, {"title": "Consistency Across Every Guest", "type": "body", "body": "Excellent service is given to every guest, not only the ones who look important or spend the most. The quiet couple in the corner deserve the same attention as the large, lively table. The guest who orders the cheapest item deserves the same warmth as the one who orders the most.\n\nThis consistency is a mark of a true professional. Guests notice when service is uneven, and they remember being treated as an afterthought. They also remember being treated with genuine care when they did not expect it. Give every guest your full standard, and you build the kind of reputation that fills tables."}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Waiters 101.\n\nYou now have the professional knowledge to serve guests to the standard expected across the hospitality industry, in restaurants, hotels and at events, in South Africa and internationally.\n\nThe final assessment covers all eleven modules. You need 60 percent to pass and receive your Certificate of Completion.\n\nThis is where the knowledge begins. The floor is where it becomes skill. Go and serve with excellence."}], "questions": [{"q": "What distinguishes excellent service from merely competent service?", "opts": ["The speed of taking and serving orders", "The presentation of the food", "Anticipating what guests need before they ask", "The waiter's level of experience"], "a": 2}, {"q": "Why should a waiter avoid asking \"who ordered the chicken\" when serving?", "opts": ["It interrupts the conversation", "It shows the waiter did not note or remember who ordered what", "It is considered rude in all settings", "It slows down a large section"], "a": 1}, {"q": "What does proactive water service mean?", "opts": ["Filling glasses once and refilling only when empty", "Refilling before the guest notices the glass is empty or has to ask", "Asking every ten minutes about water", "Leaving a jug for guests to manage"], "a": 1}, {"q": "How does service recovery relate to excellent service?", "opts": ["It is separate from excellence", "It is part of excellence, since handling a problem with care can leave a guest more loyal", "It only matters when guests complain loudly", "It applies only to large events"], "a": 1}, {"q": "What does consistency across every guest mean?", "opts": ["Giving extra attention to guests who spend more", "Giving every guest the same full standard, whoever they are", "Treating quiet guests as lower priority", "Focusing on the most vocal table"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What do guests most often remember about their experience?", "opts": ["The exact dishes and portion sizes", "How they were treated by the staff", "The price of the meal", "The decor"], "a": 1}, {"q": "When does a waiter's professional responsibility begin?", "opts": ["When guests are seated", "When orders are taken", "Before service, by arriving on time and prepared", "When the manager signals to start"], "a": 2}, {"q": "What does a correctly worn uniform communicate before a waiter speaks?", "opts": ["Years of experience", "That the place is well run and the guest matters", "The price of the menu", "Personal style"], "a": 1}, {"q": "Why is nail polish not worn in food service?", "opts": ["It looks unprofessional in photos", "Chips can fall into food and it hides dirt beneath the nail", "It takes too long to apply", "Guests find it distracting"], "a": 1}, {"q": "How early should a waiter arrive relative to the briefing or shift start?", "opts": ["Exactly on time", "5 minutes before", "At least 15 minutes before", "Whenever convenient"], "a": 2}, {"q": "What is the correct phone standard during service?", "opts": ["Use it during quiet moments", "On silent and out of sight in guest areas at all times", "In hand for work messages only", "Use freely when no manager is near"], "a": 1}, {"q": "What should a waiter do when unsure whether a dish contains an allergen?", "opts": ["Say it is probably safe", "Suggest a simpler dish", "Confirm with the kitchen before advising the guest", "Ask another waiter to guess"], "a": 2}, {"q": "What does \"vegan\" mean?", "opts": ["No red meat only", "No meat or poultry, but dairy and eggs are fine", "No animal products of any kind", "No meat, but honey and dairy are fine"], "a": 2}, {"q": "From which side is food served and cleared in formal service?", "opts": ["Served and cleared from the right", "Served from the left, cleared from the right", "Served from the right, cleared from the left", "Either side, whichever is quicker"], "a": 1}, {"q": "When should a course be cleared from a table?", "opts": ["When the fastest guest finishes", "At fixed intervals", "When every guest at the table has finished", "When plates are pushed aside"], "a": 2}, {"q": "What is the correct way to hold a plate when serving?", "opts": ["Grip the rim firmly", "Hold from below with the palm and fingers, thumb off the surface", "Use both hands for every plate", "Wrap a cloth around the base"], "a": 1}, {"q": "Within how long should a newly seated guest be acknowledged?", "opts": ["About 30 seconds, even with just eye contact", "Two minutes", "Only when they signal", "Five minutes"], "a": 0}, {"q": "Why should a waiter repeat the order back before leaving the table?", "opts": ["To show menu knowledge", "To prompt more ordering", "To confirm accuracy and prevent errors", "To let the kitchen start early"], "a": 2}, {"q": "What is the professional approach to upselling?", "opts": ["Suggest every add-on", "One confident, genuine recommendation, and accept the decision", "Only upsell celebrating guests", "Upsell only at dessert"], "a": 1}, {"q": "What is the first step when a guest complains?", "opts": ["Apologise before they finish", "Listen completely without interrupting or defending", "Fix it before speaking", "Call the manager at once"], "a": 1}, {"q": "Which is calming language during a complaint?", "opts": ["\"But that is unusual\"", "\"Actually, we are very busy\"", "\"I am very sorry, let me sort that out right away\"", "\"I think you are mistaken\""], "a": 2}, {"q": "Why should a dietary change be written on the docket?", "opts": ["To count requests later", "Because a spoken note that does not reach the kitchen has not been communicated", "To charge the guest correctly", "Because it is legally required"], "a": 1}, {"q": "What should you do when you pass a colleague's table that needs water and they are busy?", "opts": ["Leave it, as it is their section", "Mention it to them later", "Fill it yourself, it takes seconds", "Tell the manager to reassign it"], "a": 2}, {"q": "When may a waiter remove the apron in guest areas?", "opts": ["Once all courses are served", "When a supervisor allows it briefly", "Only after the shift is fully over and they are dismissed", "Whenever they feel too warm"], "a": 2}, {"q": "What distinguishes excellent service from competent service?", "opts": ["The speed of service", "The presentation of the food", "Anticipating what guests need before they ask", "The waiter's experience level"], "a": 2}];
const RESOURCES = [{"title": "Waiters 101 Quick Reference", "desc": "The key professional standards on one page", "content": "WAITERS 101 QUICK REFERENCE\nProfessional standards for restaurants, hotels and events\n\nTHE PROFESSIONAL STANDARD\nArrive on time, prepared and presentable. Know the setting, the menu and your section. Be visible and attentive without hovering. Carry yourself professionally at all times.\n\nORDER OF SERVICE\nServe from the left, clear from the right. Ladies first, then gentlemen, host last. Move in one direction. Never reach across a guest. Clear only when everyone at the table has finished.\n\nCARRYING PLATES\nHold from below with the palm and fingers. Thumb off the eating surface. Learn two plates before three. Place from the correct side, announce the dish, step back.\n\nDIETARY REQUIREMENTS\nVegetarian: no meat, poultry or seafood. Vegan: no animal products. Gluten-free: no wheat, rye, barley or oats. Halaal: no pork or alcohol in preparation. Nut allergy: life-threatening, confirm exactly. Never confirm a dish is safe without checking the kitchen. Always mark changes on the docket.\n\nHANDLING COMPLAINTS\n1. Listen completely without interrupting. 2. Apologise sincerely before explaining. 3. Act, fix it, and follow up personally. Never argue. Escalate if the guest stays upset, for billing or safety issues, or if they ask for the manager.\n\nDELIVERING EXCELLENCE\nAnticipate needs before the guest asks. Refill water before it runs dry. Serve the right dish to the right guest without asking. Give every guest the same full standard. Recover from problems with genuine care."}];

// ---- Shared print + document engine ----
function docShell(label, title, subtitle, inner) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#FAF7F2;font-family:'Montserrat',sans-serif;color:#0D0D0D;padding:14mm 16mm;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0D0D0D;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:999;}
.savebar span{font-family:'Montserrat',sans-serif;font-size:11px;color:#FAF7F2;letter-spacing:1px;}
.savebar button{background:#C9A84C;color:#0D0D0D;border:none;padding:9px 18px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:800;letter-spacing:1.5px;border-radius:3px;cursor:pointer;}
.page{margin-top:52px;}
.hdr{display:flex;align-items:center;justify-content:space-between;padding-bottom:4mm;border-bottom:2px solid #C9A84C;margin-bottom:6mm;}
.logo-area{display:flex;align-items:center;gap:4mm;}
.logo{width:40px;height:40px;object-fit:contain;}
.brand-name{font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:700;color:#0D0D0D;}
.brand-sub{font-family:'Montserrat',sans-serif;font-size:6pt;color:#C9A84C;letter-spacing:3px;}
.doc-label{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:3px;color:#888;}
.course-tag{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:3px;color:#C9A84C;margin-bottom:2mm;}
.title{font-family:'Cormorant Garamond',serif;font-size:22pt;font-weight:700;color:#0D0D0D;margin-bottom:1mm;}
.subtitle{font-family:'Montserrat',sans-serif;font-size:8pt;color:#888;margin-bottom:5mm;}
.footer{margin-top:8mm;padding-top:4mm;border-top:1px solid #e8e0d0;display:flex;justify-content:space-between;}
.footer-brand{font-family:'Montserrat',sans-serif;font-size:6.5pt;color:#aaa;letter-spacing:1px;}
@media print{.savebar{display:none;}.page{margin-top:0;}body{padding:10mm 12mm;}}
</style></head><body>
<div class="savebar"><span>Tap Save as PDF, then choose "Save as PDF" as the destination.</span><button onclick="window.print()">Save as PDF</button></div>
<div class="page">
<div class="hdr"><div class="logo-area"><img class="logo" src="${window.location.origin}/logo.png" onerror="this.style.display='none'"/><div><div class="brand-name">Sinotheni Events</div><div class="brand-sub">TRAINING ACADEMY</div></div></div><div class="doc-label">${label}</div></div>
<div class="course-tag">${COURSE_TITLE} &middot; ${COURSE_TYPE}</div>
<div class="title">${title}</div>
${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
${inner}
<div class="footer"><div class="footer-brand">SINOTHENI EVENTS TRAINING ACADEMY &middot; Reg No: K2021422957</div><div class="footer-brand">academy@sinothenievents.co.za</div></div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},700);});</script>
</body></html>`;
}

function slideToHtml(slide) {
  const h = `<div style="font-family:'Cormorant Garamond',serif;font-size:14pt;font-weight:700;color:#0D0D0D;border-left:3px solid #C9A84C;padding-left:8px;margin:6mm 0 3mm;">${slide.title}</div>`;
  if (slide.type === "body" || slide.type === "intro") {
    return h + `<div style="font-size:9.5pt;line-height:1.8;color:#333;white-space:pre-line;">${slide.body}</div>`;
  }
  if (slide.type === "list") {
    const intro = slide.intro ? `<div style="font-size:9pt;color:#888;margin-bottom:2mm;">${slide.intro}</div>` : "";
    const items = slide.items.map(t => `<div style="font-size:9.5pt;line-height:1.7;color:#333;margin-bottom:1.5mm;padding-left:5mm;position:relative;"><span style="position:absolute;left:0;color:#C9A84C;">&bull;</span>${t}</div>`).join("");
    return h + intro + items;
  }
  if (slide.type === "highlight") {
    const items = slide.points.map(p => `<div style="font-size:9.5pt;line-height:1.7;color:#333;margin-bottom:2mm;padding:3mm 4mm;background:#fff;border-left:3px solid #C9A84C;">${p.text}</div>`).join("");
    return h + items;
  }
  if (slide.type === "steps") {
    const intro = slide.intro ? `<div style="font-size:9pt;color:#888;margin-bottom:2mm;">${slide.intro}</div>` : "";
    const items = slide.steps.map(s => `<div style="font-size:9.5pt;line-height:1.7;color:#333;margin-bottom:2mm;"><strong style="color:#0D0D0D;">${s.number}. ${s.label}.</strong> ${s.detail}</div>`).join("");
    return h + intro + items;
  }
  if (slide.type === "two-col") {
    const col = (c) => `<div style="margin-bottom:3mm;"><div style="font-size:8.5pt;font-weight:700;color:#0D0D0D;margin-bottom:1.5mm;letter-spacing:0.5px;">${c.heading}</div>${c.items.map(t => `<div style="font-size:9pt;line-height:1.6;color:#333;margin-bottom:1mm;padding-left:4mm;position:relative;"><span style="position:absolute;left:0;color:#C9A84C;">&bull;</span>${t}</div>`).join("")}</div>`;
    return h + col(slide.left) + col(slide.right);
  }
  return h;
}

function notesHTML(chapter) {
  const inner = chapter.slides.map(slideToHtml).join("");
  return docShell("COURSE NOTES", chapter.title, `Module ${String(chapter.id).padStart(2,"0")} &middot; ${chapter.subtitle || ""}`, inner);
}

function resourceHTML(res) {
  const body = `<div style="font-size:9.5pt;line-height:1.9;color:#333;white-space:pre-line;">${res.content}</div>`;
  return docShell("COURSE RESOURCE", res.title, res.desc, body);
}

function certHTML(name, date, achievement, modules) {
  const modList = modules.map(m => `<span style="display:inline-block;font-size:7pt;color:#666;margin:0 4px;">&bull; ${m}</span>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificate - ${name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=Cinzel:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4 landscape;margin:0;}
body{font-family:'Montserrat',sans-serif;background:#FAF7F2;}
.savebar{position:fixed;top:0;left:0;right:0;background:#0D0D0D;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:999;}
.savebar span{font-size:11px;color:#FAF7F2;letter-spacing:1px;}
.savebar button{background:#C9A84C;color:#0D0D0D;border:none;padding:9px 18px;font-size:11px;font-weight:800;letter-spacing:1.5px;border-radius:3px;cursor:pointer;}
.cert{width:297mm;height:210mm;margin:52px auto 0;background:#FAF7F2;position:relative;padding:16mm 20mm;}
.frame{position:absolute;inset:8mm;border:2px solid #C9A84C;}
.frame2{position:absolute;inset:9.5mm;border:1px solid #C9A84C;opacity:0.5;}
.inner{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;}
.mono{font-family:'Cinzel',serif;font-size:30pt;font-weight:700;color:#C9A84C;letter-spacing:4px;}
.brand{font-family:'Montserrat',sans-serif;font-size:8pt;letter-spacing:5px;color:#0D0D0D;margin-top:1mm;}
.subbrand{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:4px;color:#C9A84C;margin-bottom:8mm;}
.label{font-family:'Montserrat',sans-serif;font-size:9pt;letter-spacing:6px;color:#888;margin-bottom:4mm;}
.headline{font-family:'Cormorant Garamond',serif;font-size:30pt;font-weight:700;color:#0D0D0D;margin-bottom:6mm;}
.awarded{font-family:'Montserrat',sans-serif;font-size:8pt;letter-spacing:3px;color:#888;margin-bottom:3mm;}
.name{font-family:'Cormorant Garamond',serif;font-size:34pt;font-weight:700;font-style:italic;color:#0D0D0D;border-bottom:1px solid #C9A84C;padding-bottom:3mm;margin-bottom:5mm;}
.body{font-family:'Montserrat',sans-serif;font-size:9pt;line-height:1.8;color:#444;max-width:200mm;margin-bottom:7mm;}
.course{font-family:'Cormorant Garamond',serif;font-size:15pt;font-weight:700;color:#C9A84C;margin-bottom:6mm;}
.sigrow{display:flex;justify-content:space-between;width:200mm;margin-top:4mm;}
.sig{text-align:center;flex:1;}
.sigline{border-top:1px solid #888;width:55mm;margin:0 auto 1.5mm;}
.sigl{font-family:'Montserrat',sans-serif;font-size:7pt;letter-spacing:2px;color:#888;}
.sigv{font-family:'Cormorant Garamond',serif;font-size:11pt;color:#0D0D0D;margin-bottom:1mm;}
.reg{font-family:'Montserrat',sans-serif;font-size:6.5pt;letter-spacing:1px;color:#aaa;margin-top:6mm;}
@media print{.savebar{display:none;}.cert{margin-top:0;}}
</style></head><body>
<div class="savebar"><span>Tap Save as PDF, then choose "Save as PDF" as the destination and Landscape layout.</span><button onclick="window.print()">Save as PDF</button></div>
<div class="cert">
<div class="frame"></div><div class="frame2"></div>
<div class="inner">
<div class="mono">SE</div>
<div class="brand">SINOTHENI EVENTS</div>
<div class="subbrand">TRAINING ACADEMY</div>
<div class="label">CERTIFICATE OF COMPLETION</div>
<div class="headline">${COURSE_TITLE}</div>
<div class="awarded">THIS CERTIFICATE IS PROUDLY AWARDED TO</div>
<div class="name">${name}</div>
<div class="body">${achievement}</div>
<div class="sigrow">
<div class="sig"><div class="sigv">${date}</div><div class="sigline"></div><div class="sigl">DATE OF COMPLETION</div></div>
<div class="sig"><div class="sigv">Sinotheni Events Academy</div><div class="sigline"></div><div class="sigl">AUTHORISED BY</div></div>
</div>
<div class="reg">SINOTHENI EVENTS TRAINING ACADEMY &middot; Reg No: K2021422957 &middot; academy@sinothenievents.co.za</div>
</div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},700);});</script>
</body></html>`;
}

function transcriptHTML(name, score, total, date, remarks, modules) {
  const pct = Math.round((score/total)*100);
  const rows = modules.map((m,i) => `<tr><td style="padding:2.5mm 3mm;border-bottom:1px solid #eee;font-size:9pt;color:#333;">Module ${String(i+1).padStart(2,"0")}</td><td style="padding:2.5mm 3mm;border-bottom:1px solid #eee;font-size:9pt;color:#333;">${m}</td><td style="padding:2.5mm 3mm;border-bottom:1px solid #eee;font-size:9pt;color:#2d7a45;text-align:right;">Completed</td></tr>`).join("");
  const inner = `
<div style="display:flex;gap:6mm;margin-bottom:6mm;">
<div style="flex:1;background:#fff;border:1px solid #e8e0d0;border-top:3px solid #C9A84C;padding:4mm;"><div style="font-size:7pt;letter-spacing:2px;color:#888;margin-bottom:1.5mm;">STUDENT</div><div style="font-family:'Cormorant Garamond',serif;font-size:13pt;font-weight:700;color:#0D0D0D;">${name}</div></div>
<div style="width:34mm;background:#fff;border:1px solid #e8e0d0;border-top:3px solid #C9A84C;padding:4mm;text-align:center;"><div style="font-size:7pt;letter-spacing:2px;color:#888;margin-bottom:1mm;">FINAL SCORE</div><div style="font-family:'Cormorant Garamond',serif;font-size:20pt;font-weight:700;color:#C9A84C;">${pct}%</div><div style="font-size:7pt;color:#888;">${score} / ${total}</div></div>
</div>
<div style="font-size:8pt;letter-spacing:3px;color:#C9A84C;margin-bottom:2mm;">MODULES COMPLETED</div>
<table style="width:100%;border-collapse:collapse;margin-bottom:5mm;">${rows}</table>
<div style="font-size:8pt;letter-spacing:3px;color:#C9A84C;margin-bottom:2mm;">EXAMINER REMARKS</div>
<div style="font-size:9pt;line-height:1.8;color:#333;background:#fff;border:1px solid #e8e0d0;padding:4mm;">${remarks}</div>`;
  return docShell("ACADEMIC TRANSCRIPT", "Academic Transcript", `Issued ${date}`, inner);
}

function printDoc(html) {
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups for this site, then tap the button again to save your PDF."); return; }
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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the conduct expected of a hospitality professional across restaurants, hotels and events.`;
    const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of waiting and guest service expected across the hospitality industry in South Africa and internationally.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Professional Waiting and Guest Service Standards</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>The complete professional standard for waiters across restaurants, hotels and events. Eleven modules covering guest service, table technique, menu knowledge, complaint handling and the conduct expected of a hospitality professional in South Africa and internationally.</div>
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
    return(<div style={S.wrap}><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet"/><Header/><div style={{padding:"26px 20px"}}><div style={S.card}>
      <div style={{textAlign:"center",marginBottom:26}}><span style={S.tag}>COURSE COMPLETE</span><div style={S.title}>Your Documents Are Ready</div><div style={S.sub}>{profile.firstName} {profile.lastName} · {COURSE_TITLE}</div></div>
      {docs&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        <div style={{border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center"}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Academic Transcript</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>All modules listed with your score and remarks</div><button onClick={()=>printDoc(transcriptHTML(`${profile.firstName} ${profile.lastName}`,finalScore.score,finalScore.total,docs.date,docs.remarks,MODULE_NAMES))} style={{...S.btn(false),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
        <div style={{border:`2px solid ${G}`,borderTop:`4px solid ${G}`,borderRadius:7,padding:"20px 15px",textAlign:"center",background:CR}}><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,marginBottom:6}}>Certificate of Completion</div><div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:13,lineHeight:1.6}}>Official A4 landscape certificate, print-ready</div><button onClick={()=>printDoc(certHTML(`${profile.firstName} ${profile.lastName}`,docs.date,docs.achievement,MODULE_NAMES))} style={{...S.btn(true),fontSize:10,padding:"8px 13px"}}>DOWNLOAD</button></div>
      </div>)}
      <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"11px 14px",borderRadius:4,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:1.7}}>To save as PDF: when the new tab opens, the print dialog appears. Choose <strong>Save as PDF</strong> as the destination, then Save. If the dialog does not open, tap the gold <strong>Save as PDF</strong> button at the top of the page.</div>
    </div></div></div>);
  }

  return <div style={S.wrap}><Header/><div style={{padding:40,textAlign:"center",color:"#888"}}>Loading...</div></div>;
}
