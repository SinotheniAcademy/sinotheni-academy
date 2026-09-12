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
const STORE_KEY = "se_guest_rel_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "guest-relations";
const COURSE_TITLE = "Guest Relations \u0026 Customer Care";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

const MODULE_NAMES = ["Introduction to Guest Relations", "Communication Fundamentals", "Understanding Guest Behaviour and Psychology", "Handling Enquiries and Requests", "Managing Complaints and Service Recovery", "Telephone and Digital Communication", "Cultural Awareness and Inclusive Service", "Upselling and Revenue Awareness", "Working Under Pressure", "Building Guest Loyalty", "Delivering Exceptional Guest Experiences"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Guest Relations", "subtitle": "What guest relations means, why it matters, and the professional standard expected", "duration": "20 min", "slides": [{"title": "Welcome to Guest Relations and Customer Care", "type": "intro", "body": "Every hospitality business is built on one thing: how guests feel when they interact with its people. Guest relations is the discipline of creating positive, lasting impressions through every conversation, every transaction and every moment of contact between a hospitality professional and the people they serve.\n\nThis course teaches you the communication skills, emotional intelligence and professional standards that turn a competent hospitality worker into one guests remember, request and recommend. Eleven modules, practical from start to finish, applicable everywhere guests and professionals meet."}, {"title": "What Guest Relations Really Means", "type": "body", "body": "Guest relations is not a job title. It is a set of skills and a professional mindset that applies to anyone who interacts with guests, clients or customers in a hospitality setting. A waiter practises guest relations. So does a receptionist, a housekeeper, a bartender and a manager.\n\nAt its core, guest relations is about making people feel valued, heard and well looked after. It is the difference between a guest who leaves satisfied and one who leaves loyal. Satisfaction says the product was acceptable. Loyalty says the experience was worth returning for."}, {"title": "Types of Guest Interactions You Will Encounter", "type": "list", "intro": "Guest relations professionals manage a wide range of interactions:", "items": ["Face-to-face service: the most common form, requiring presence, warmth and professional body language", "Telephone enquiries: first impressions are formed in the first three seconds of a call", "Written communication: emails, messages and chat responses represent the venue in text", "Complaint handling: the moment that most determines whether a guest returns or not", "Requests and special arrangements: opportunities to exceed expectations", "Check-in and check-out: high-stakes moments at the start and end of every guest experience", "Upselling interactions: service-oriented recommendations that improve the guest's stay"]}, {"title": "Core Responsibilities of a Guest Relations Professional", "type": "list", "intro": "In any hospitality role, these responsibilities apply:", "items": ["Acknowledge every guest promptly and warmly, without exception", "Listen actively to understand what the guest actually needs, not just what they say", "Communicate clearly, professionally and with empathy at all times", "Resolve problems quickly and take personal ownership of the guest's experience", "Follow up on promises made to guests. A commitment not kept destroys trust.", "Represent the venue's standards in every interaction, public and private", "Support colleagues in delivering consistent service across the team"]}, {"title": "Why Excellence in Guest Relations Matters", "type": "body", "body": "A venue can have exceptional food, beautiful rooms and competitive pricing and still fail if the people working there do not connect genuinely with guests. People return to places where they feel welcomed. They recommend businesses where they felt genuinely cared for. They complain loudly online about businesses where they felt ignored, dismissed or poorly treated.\n\nThe hospitality industry in South Africa is competitive. Guest relations excellence is one of the few things that genuinely differentiates one venue from another when product and price are similar. It is also one of the most directly controllable factors in any hospitality operation."}, {"title": "Where Guest Relations Skills Apply", "type": "body", "body": "The skills in this course are not limited to any single hospitality role. They apply in restaurants, hotels, lodges, game reserves, event venues, spas, catering companies and any business where human connection is part of what is being offered.\n\nSouth Africa's tourism and hospitality industry serves guests from across the country and around the world. The ability to communicate professionally, manage expectations, resolve complaints and build genuine warmth into every interaction is a career skill that travels with you, regardless of where you work or what role you hold."}], "questions": [{"q": "What is guest relations at its most fundamental level?", "opts": ["A job title in the hotel industry for specialised staff", "Making people feel valued, heard and well looked after in every interaction", "The process of handling complaints and managing difficult guests", "A set of scripts and standard responses for common guest situations"], "a": 1}, {"q": "Which of the following best describes what loyalty means compared to satisfaction?", "opts": ["Loyalty means the guest gave a five-star review online", "Satisfaction means the product was acceptable; loyalty means the experience was worth returning for", "Loyalty is achieved when a guest stays more than three times at the same venue", "Satisfaction and loyalty mean exactly the same thing in hospitality contexts"], "a": 1}, {"q": "A guest relations professional's responsibilities apply to which hospitality roles?", "opts": ["Only staff who have 'guest relations' in their job title", "Managers and supervisors, but not front-line hospitality workers", "Any role that involves interaction with guests, including waiters, receptionists and bartenders", "Guest relations only applies in hotel and lodge environments"], "a": 2}, {"q": "Why does guest relations directly affect a venue's business performance?", "opts": ["Venues are legally required to provide training in guest relations", "People return to places where they feel welcomed and recommend businesses where they feel cared for", "Guest relations determines the pricing a venue can charge for its rooms or meals", "Regulatory bodies in South Africa score venues on guest relations during inspections"], "a": 1}, {"q": "In which settings do the skills in this course apply?", "opts": ["Only in five-star hotels and luxury lodges", "Only in food and beverage operations such as restaurants and bars", "Restaurants, hotels, events venues, spas and any business where human connection is part of the offering", "The course applies to the tourism sector only, not the broader hospitality industry"], "a": 2}]}, {"id": 2, "title": "Communication Fundamentals", "subtitle": "Verbal standards, active listening, non-verbal communication, tone and clarity", "duration": "20 min", "slides": [{"title": "The Power of Professional Communication", "type": "body", "body": "Every interaction with a guest is a communication event. The words you choose, the tone you use, the pace of your speech, your posture, your eye contact and even the expression on your face all send messages simultaneously. A guest is processing all of these signals at once, forming an impression of you and of the venue you represent.\n\nProfessional communication is not about using formal language or following a script. It is about being clear, warm, honest and consistent. A guest should never leave an interaction feeling confused, dismissed or uncertain about what happens next."}, {"title": "Verbal Communication Standards", "type": "list", "intro": "These standards apply to every spoken interaction with a guest:", "items": ["Speak clearly and at a moderate pace. Rushing your words communicates stress, not efficiency.", "Use professional language. Avoid slang, excessive filler words and overly casual phrasing with guests.", "Match your language to the guest. An international guest may need simpler phrasing. A regular may appreciate informality.", "Never speak negatively about a colleague, another department or the venue in front of a guest.", "Avoid vague answers. 'I will find out and come back to you within five minutes' is far better than 'I am not sure'.", "Acknowledge before you answer. 'That is a great question' or 'I understand' before your response shows you heard them."]}, {"title": "Non-Verbal Communication: What Your Body Says", "type": "highlight", "points": [{"text": "Eye contact communicates confidence and genuine interest. Too little reads as evasiveness. Too much as aggression. Aim for natural, warm, attentive eye contact."}, {"text": "Posture matters. Standing straight, facing the guest fully and keeping your arms open communicates engagement and professionalism. Crossed arms and turned shoulders say the opposite."}, {"text": "Your expression communicates before your words do. A genuine, warm expression when approaching a guest sets the tone for the entire interaction."}, {"text": "Physical distance: respect personal space. In South African hospitality, maintaining a professional but warm distance of approximately one metre is appropriate."}, {"text": "Never use your phone, look over a guest's shoulder or check the time while a guest is speaking to you. These are powerful non-verbal signals of disinterest."}]}, {"title": "Active Listening: The Core Skill", "type": "steps", "intro": "Active listening is a practised skill, not a passive one:", "steps": [{"number": "1", "label": "Give your full attention", "detail": "Put down what you are doing. Face the guest. Remove distractions. Active listening cannot happen simultaneously with another task."}, {"number": "2", "label": "Listen to understand, not to reply", "detail": "Most people listen while planning their response. Let the guest finish completely before forming yours."}, {"number": "3", "label": "Acknowledge what you have heard", "detail": "Repeat back the key points before responding: 'So you would like the late checkout confirmed for tomorrow, is that correct?' This catches misunderstandings before they become problems."}, {"number": "4", "label": "Ask clarifying questions", "detail": "If you are not certain what the guest needs, ask. 'Could you help me understand what you mean by earlier?' is always better than guessing wrong."}]}, {"title": "Tone and Warmth in Hospitality Communication", "type": "body", "body": "Tone is the emotional layer beneath your words. The same sentence can sound warm, cold, impatient or dismissive depending entirely on tone. In hospitality, warmth is professional currency. A guest who feels warmth from the people serving them forgives small mistakes more readily, stays longer and spends more willingly.\n\nWarmth does not mean being overly familiar or abandoning professionalism. It means communicating genuine care for the guest's experience. It is heard in the pace of your voice, the pleasure in your greeting and the patience in your responses when a guest is confused or frustrated."}, {"title": "Clarity: Making Your Communication Work", "type": "list", "intro": "Clear communication prevents misunderstandings and complaints before they happen:", "items": ["Confirm understanding before acting. 'Just to confirm, you would like the king room with a garden view?' prevents costly errors.", "Avoid jargon or internal terminology in guest-facing communication. Say 'the dining area' not 'the F&B floor'.", "When giving directions or instructions, be specific: 'Turn left at the main entrance, take the lift to the third floor, your room is directly opposite the lift.'", "When you cannot give a definitive answer, give a timeframe: 'I will have a confirmed answer for you within ten minutes.'", "Follow up when you say you will. A guest who was told 'I will come back to you' and then sees the person disappear is a complaint waiting to happen."]}], "questions": [{"q": "What does professional communication require beyond choosing the right words?", "opts": ["Using formal language and following a set script for common interactions", "Paying attention to tone, pace, posture, eye contact and expression simultaneously", "Speaking quickly to demonstrate efficiency and respect for the guest's time", "Avoiding all informal language regardless of the guest's communication style"], "a": 1}, {"q": "What is active listening?", "opts": ["Listening while planning your response so you can reply quickly", "Taking notes during every guest conversation", "Giving full attention, listening to understand, acknowledging and clarifying", "Repeating everything the guest says back to them verbatim"], "a": 2}, {"q": "What should you say instead of 'I am not sure' when you do not know the answer to a guest's question?", "opts": ["'That is not my area of responsibility, please ask someone else.'", "'I will find out and come back to you within a specific, realistic timeframe.'", "'I think the answer is probably yes, but do not hold me to that.'", "'Let me check the manual and get back to you at some point today.'"], "a": 1}, {"q": "What does crossed arms and turned shoulders communicate to a guest non-verbally?", "opts": ["Efficiency and focus on the current task", "Warmth and professional distance appropriate to the context", "Disengagement and a lack of openness to the guest", "Respect for the guest's personal space"], "a": 2}, {"q": "How does tone affect guest communication?", "opts": ["Tone only matters in written communication, not verbal", "Tone determines the emotional layer beneath words and can make the same sentence sound warm or dismissive", "Tone is less important than the accuracy of the information being communicated", "Guests rarely notice tone if the information they receive is correct"], "a": 1}]}, {"id": 3, "title": "Understanding Guest Behaviour and Psychology", "subtitle": "The guest's emotional journey, types of guests, managing expectations and adapting your approach", "duration": "20 min", "slides": [{"title": "Why Guests Behave the Way They Do", "type": "body", "body": "A guest who arrives at a hotel or restaurant is carrying a context you cannot see: the journey they just completed, the day they have had, the expectations they formed before they arrived, the last time they stayed or visited. A difficult guest is rarely difficult about what they appear to be difficult about. Understanding this is the foundation of effective guest relations.\n\nGuest psychology is not about being a therapist. It is about recognising that every guest arrives with emotional baggage, forming expectations constantly and measuring their experience against those expectations throughout their visit. Your job is to understand this process and manage it professionally."}, {"title": "The Guest's Emotional Journey Through a Visit", "type": "list", "intro": "A guest's emotional state moves through several stages:", "items": ["Anticipation: the guest has expectations formed before they arrive. These may be realistic or not. Your first contact begins to confirm or challenge these expectations.", "Arrival: the moment of first physical contact. This is when first impressions solidify. Warmth, speed and competence at this moment set the tone for everything that follows.", "Experience: the ongoing assessment throughout the visit. Each interaction either builds confidence or erodes it.", "The peak moment: every visit has a defining emotional peak, positive or negative. This is what the guest remembers most.", "Departure: the last interaction. Research consistently shows that the end of an experience has disproportionate weight on overall memory and satisfaction.", "Reflection: after the visit. The story the guest tells themselves and others about the experience."]}, {"title": "Types of Guests and How to Read Them", "type": "highlight", "points": [{"text": "The decided guest knows exactly what they want and values speed, accuracy and minimal friction. Over-explaining or upselling to this guest creates irritation."}, {"text": "The undecided guest needs guidance and welcomes confident recommendations. This is the right moment for a well-placed suggestion or gentle upsell."}, {"text": "The emotional guest is reacting to something, possibly unrelated to your venue, and needs acknowledgement before information. Listen first, solve second."}, {"text": "The experienced guest has high standards formed from previous excellent experiences and will notice inconsistencies others miss. Consistency is your best tool."}, {"text": "The first-time guest needs orientation and reassurance. Proactive information, warmth and patience are the appropriate responses."}]}, {"title": "Managing Expectations", "type": "body", "body": "Most guest disappointments are the result of expectation misalignment, not failure of product or service. When a guest expects something that is different from what the venue actually provides and nobody has managed that gap, a complaint is inevitable regardless of how good the actual experience is.\n\nManaging expectations means being honest and proactive about what the guest will and will not receive. 'The pool is undergoing maintenance this week' said at check-in is far better than the guest discovering it themselves. 'Our kitchen closes at ten pm on Sundays' said when the reservation is made prevents a frustrating discovery at nine-fifty."}, {"title": "Reading a Guest's Emotional State", "type": "body", "body": "The ability to read a guest's emotional state before they say a word is one of the most valuable skills in hospitality. It is developed through deliberate observation and practice.\n\nA guest who is tense, looking around without settling, checking their phone frequently or holding themselves rigidly is communicating stress. This guest needs calm, efficiency and a sense of control restored quickly. A relaxed, unhurried guest with open body language is in exploration mode and receptive to conversation, recommendation and a more leisurely service pace. Matching your approach to the guest's state, rather than applying the same style to everyone, is what separates a professional from a practised performer."}, {"title": "Adapting Your Approach to Each Guest", "type": "list", "intro": "Professional guest relations is not a single style applied uniformly:", "items": ["Speed: some guests want efficiency above all. Others want to feel unhurried. Read the cues and adapt.", "Detail: some guests want comprehensive information. Others want a direct answer and nothing more.", "Formality: match the guest's register. A formal guest receives formal service. An informal guest who gets rigid formality feels unwelcome.", "Initiative: some guests appreciate proactive offers. Others find them intrusive. Offer once, read the response, adjust.", "Language: if a guest's first language is not English, speak more slowly and clearly. Do not raise your volume.", "Age: older guests may appreciate more patient, detailed service. Younger guests may prefer efficiency and technology-enabled options."]}], "questions": [{"q": "What is the departure moment's significance in the guest's overall experience?", "opts": ["It is the least significant moment since the guest is already leaving", "Research shows the end of an experience has disproportionate weight on overall memory and satisfaction", "Departure is only significant if there was a complaint during the visit", "The departure moment matters only in hotel environments, not restaurants or events"], "a": 1}, {"q": "What is the most common cause of guest disappointment?", "opts": ["Failure of the core product such as the food or the room", "Staff rudeness and unprofessional behaviour", "Expectation misalignment, where the guest expected something different from what the venue actually provided", "Pricing that is higher than the guest anticipated"], "a": 2}, {"q": "How should you approach an undecided guest?", "opts": ["Give them time and space until they are ready to order without interrupting", "Offer guidance and make confident recommendations", "Present the full menu verbally to ensure they have considered every option", "Ask them to return when they have decided what they want"], "a": 1}, {"q": "What does 'reading a guest's emotional state' allow a hospitality professional to do?", "opts": ["Predict whether the guest will leave a positive or negative review", "Charge guests differently based on their perceived willingness to spend", "Adapt their approach to match the guest's current needs before being told", "Identify guests who are likely to cause problems and monitor them more closely"], "a": 2}, {"q": "What does adapting your communication approach to each guest demonstrate?", "opts": ["Inconsistency, which can undermine the venue's brand standards", "Professional judgement and genuine responsiveness to individual guest needs", "Favouritism, which is inappropriate in a professional hospitality context", "A lack of standardised training and clear service protocols"], "a": 1}]}, {"id": 4, "title": "Handling Enquiries and Requests", "subtitle": "Taking enquiries professionally, managing requests you cannot fulfil, following up and knowledge as service", "duration": "20 min", "slides": [{"title": "Every Enquiry Is an Opportunity", "type": "body", "body": "A guest who makes an enquiry is actively engaged with your venue. They are giving you the chance to be helpful, to demonstrate knowledge and to create a positive experience. An enquiry poorly handled is a missed opportunity that sometimes becomes a lost guest. An enquiry handled well is a relationship moment that builds confidence and trust.\n\nThe professional standard for handling enquiries is not perfection of information. It is warmth, accuracy where you know the answer, honest acknowledgement where you do not, and a clear commitment to follow through when more information is needed."}, {"title": "Taking Enquiries Professionally", "type": "steps", "intro": "The correct sequence for handling any guest enquiry:", "steps": [{"number": "1", "label": "Acknowledge the enquiry immediately", "detail": "Make eye contact, stop what you are doing, and give the guest your full attention. A guest who feels they are interrupting you will not enquire again."}, {"number": "2", "label": "Listen to the full enquiry", "detail": "Let the guest finish before beginning to answer. Interrupting with a premature answer, even a correct one, is poor practice."}, {"number": "3", "label": "Confirm your understanding", "detail": "Repeat back the key question or request: 'So you are asking about whether we can accommodate a gluten-free menu for the whole table?' Confirmation prevents wrong answers to the right question."}, {"number": "4", "label": "Provide the answer or a committed timeline", "detail": "Answer clearly and directly. If you do not know, say so and give a specific timeframe for when you will have the answer."}, {"number": "5", "label": "Follow up", "detail": "If you promised to return with information, return. A commitment not kept is the fastest way to lose a guest's trust."}]}, {"title": "Managing Requests You Cannot Fulfil", "type": "highlight", "points": [{"text": "Never simply say no without offering an alternative. 'I am afraid we cannot do X, however I can offer Y' is the professional standard."}, {"text": "Explain briefly why something is not possible. Guests accept limitations more readily when they understand the reason."}, {"text": "If you cannot help personally, connect the guest with someone who can. 'Let me take you to our manager who can assist with this' is better than 'I cannot help you'."}, {"text": "Do not make promises outside your authority. If you are not certain whether something can be done, say so before committing the venue to it."}, {"text": "When a request cannot be fulfilled at all, acknowledge the inconvenience sincerely and offer what is available as a genuine alternative, not as a consolation."}]}, {"title": "Following Up on Promises", "type": "body", "body": "Following up is where many hospitality professionals fail. They take the enquiry, provide a positive response, promise to return with details and then get absorbed in the next task. The guest waits. The promise is forgotten. The guest's impression of the entire venue shifts.\n\nThe discipline of following up requires two things: writing down every commitment you make during a service so you do not rely on memory, and treating follow-up as a priority, not an afterthought. A guest who was told 'I will come back to you in ten minutes' and receives that follow-up in eight minutes has a dramatically better experience than one who received a vague assurance that went nowhere."}, {"title": "Knowledge as a Service Tool", "type": "list", "intro": "What you know is as important as how you communicate it:", "items": ["Know your venue's core offerings inside out: menus, room types, facilities, opening hours, policies.", "Know your local area: nearby attractions, transport options, restaurants and services guests commonly need.", "Know your team's capabilities: which colleagues can help with which requests so you can direct guests correctly.", "Know your venue's limitations: what you cannot do is as important as what you can. Being honest prevents disappointment.", "Stay updated: menus change, facilities close temporarily, specials run out. Be aware of changes during each shift.", "When you don't know, say so clearly and immediately go find out. Guessing is always worse than admitting uncertainty."]}, {"title": "Common Enquiries and the Professional Response", "type": "list", "intro": "Being ready for the most common guest enquiries before they arise:", "items": ["'What time does the restaurant open?' Know exact times for all dining outlets and services.", "'Can you recommend something on the menu?' Have a genuine recommendation ready for each meal period.", "'Is there parking available?' Know the exact parking situation, including cost and proximity.", "'Can you accommodate a dietary requirement?' Know the process for kitchen confirmation, never guess.", "'What is the Wi-Fi password?' Know it. Have it ready. Consider writing it on a card.", "'What time is check-out?' Know the standard time and the procedure for requesting a late check-out."]}], "questions": [{"q": "What is the correct response when a guest asks for something you cannot provide?", "opts": ["Apologise and explain that it is not possible", "Redirect the guest to a competitor who can help them", "Say what you cannot do, then offer a genuine alternative", "Tell the guest you will look into it and come back later"], "a": 2}, {"q": "Why is following up on promises so important in guest relations?", "opts": ["It creates an opportunity to upsell additional services to the guest", "It is required by South African consumer protection legislation", "A commitment not kept is the fastest way to lose a guest's trust", "Following up increases the venue's score on online review platforms"], "a": 2}, {"q": "What should you do if a guest asks a question you do not know the answer to?", "opts": ["Provide your best guess to avoid appearing unknowledgeable", "Ask the guest to repeat the question to buy time", "Acknowledge you do not know, give a specific timeframe and go find out", "Refer the guest to the venue's website for full information"], "a": 2}, {"q": "What does confirming your understanding of a guest's enquiry before answering prevent?", "opts": ["It prevents the guest from changing their mind after you have answered", "It prevents you from providing wrong answers to the right question", "It prevents other guests from overhearing sensitive information", "It prevents the guest from making additional requests at the same time"], "a": 1}, {"q": "What type of knowledge is as important as knowing what your venue can offer?", "opts": ["Knowing the history and founding story of the venue", "Knowing what you cannot do so you can be honest about limitations", "Knowing the pricing strategy and revenue targets for the venue", "Knowing what competitors offer so you can position your venue favourably"], "a": 1}]}, {"id": 5, "title": "Managing Complaints and Service Recovery", "subtitle": "The complaint resolution process, language, escalation, recovery and after the complaint", "duration": "20 min", "slides": [{"title": "A Complaint Is Information", "type": "body", "body": "A guest who complains is more valuable than one who leaves silently unhappy. The silent guest tells you nothing while telling twelve other people about their experience. The complaining guest is giving you something rare: a chance to correct the situation, retain their loyalty and improve your service for the next guest.\n\nThe research on service recovery is clear: a complaint handled exceptionally well leaves the guest more satisfied than they would have been had nothing gone wrong at all. This is sometimes called the service recovery paradox. It happens because a well-handled complaint demonstrates genuine care in a way that smooth service sometimes does not."}, {"title": "The Complaint Resolution Process", "type": "steps", "intro": "Apply this sequence to every complaint, regardless of its size:", "steps": [{"number": "1", "label": "Listen completely", "detail": "Let the guest finish without interruption, defence or explanation. Face them, make eye contact and demonstrate through your body language that you are taking this seriously. They must feel heard before anything else."}, {"number": "2", "label": "Acknowledge and apologise", "detail": "A sincere, specific apology before any explanation. 'I am so sorry that happened. That is not the experience we want you to have here.' Not 'I am sorry you feel that way.'"}, {"number": "3", "label": "Take ownership", "detail": "Do not redirect blame to a colleague, a system or a policy. 'I will personally make sure this is resolved' takes the problem off the guest's hands."}, {"number": "4", "label": "Act and give a timeline", "detail": "Tell the guest exactly what will happen and when. 'I will have this corrected within ten minutes and I will come back to you personally to confirm it is done.'"}, {"number": "5", "label": "Follow up and close", "detail": "Return when you said you would, confirm the resolution and check that the guest is satisfied. This is the step most professionals skip and the one that completes the recovery."}]}, {"title": "Language That Helps and Language That Hurts", "type": "highlight", "points": [{"text": "NEVER begin a response to a complaint with 'but' or 'actually'. Both words immediately signal an argument, not a resolution."}, {"text": "NEVER say 'I understand how you feel' unless you genuinely do. Guests can hear the difference between authentic empathy and a scripted response."}, {"text": "SAY: 'I am very sorry, let me fix this right away.' SAY: 'That should not have happened. Let me take care of it.' These phrases take ownership without debate."}, {"text": "Avoid over-apologising. One sincere apology followed by action is more effective than repeated apologies without resolution."}, {"text": "Never minimise the complaint. 'It is just a small issue' to the venue is often a significant issue to the guest. Treat every complaint as legitimate."}]}, {"title": "When to Escalate a Complaint", "type": "body", "body": "Not every complaint needs to escalate to a manager, and escalating unnecessarily can feel to the guest like you are avoiding personal responsibility. Minor issues, such as a wrong order or a long wait, should generally be resolved at your level without management involvement.\n\nEscalate when the guest remains upset after your genuine attempt at resolution, when the issue involves billing or a significant financial implication, when there is a safety or health concern, or when the guest specifically requests to speak with a manager. When you do escalate, brief your supervisor fully before they reach the guest so the guest does not have to repeat themselves."}, {"title": "Common Complaint Scenarios and the Best Response", "type": "list", "intro": "Knowing how to handle frequent situations before they happen:", "items": ["Wrong order or wrong product: apologise, remove it immediately, confirm the correct order and return with it as quickly as possible. Do not argue.", "Long wait: acknowledge the wait before the guest has to raise it. Give an honest timeframe. Check in regularly. Do not disappear.", "Noise or disturbance complaint: apologise sincerely, investigate and act on what is within your power. If it is outside your control, say so honestly and offer alternatives.", "Billing dispute: listen without defending, check the bill carefully and acknowledge if an error was made. Never argue about money.", "Cleanliness complaint: apologise immediately and fix it at once. A dirty environment complaint requires visible, immediate action.", "Staff behaviour complaint: take this especially seriously. Apologise without defending the colleague and escalate to your supervisor."]}, {"title": "After the Complaint Is Resolved", "type": "body", "body": "A complaint is not fully resolved until you have confirmed that the guest is satisfied. A follow-up visit to the table, a brief check-in at the desk or a follow-up call on a significant issue all communicate that the venue genuinely cares about the resolution, not just the appearance of one.\n\nAfter the service, let your supervisor know what happened and what was done. Most venues require significant complaints to be logged. This is not a punishment or a blame exercise. It is how patterns are identified and systemic problems are fixed before they affect more guests."}], "questions": [{"q": "What is the service recovery paradox?", "opts": ["Guests who complain are always less likely to return than those who do not", "A complaint handled exceptionally well can leave the guest more satisfied than if nothing had gone wrong", "The more complaints a venue receives, the better its overall service becomes", "Service recovery requires more resources than preventing complaints in the first place"], "a": 1}, {"q": "What is wrong with the phrase 'I am sorry you feel that way' as a complaint response?", "opts": ["It is too formal for most hospitality environments", "It acknowledges the guest's emotion without taking any ownership of the problem", "It is too casual and does not sound professional enough", "It is acceptable but should always be followed by an offer of compensation"], "a": 1}, {"q": "When should a complaint be escalated to a supervisor?", "opts": ["Every complaint should be escalated to protect the staff member", "Only when the guest becomes physically aggressive", "When the guest remains upset after your genuine attempt, when billing is involved, or when the guest requests a manager", "Only for complaints about food quality, which require a chef's involvement"], "a": 2}, {"q": "What is the most important step in the complaint process that most professionals skip?", "opts": ["The initial apology before any explanation", "Noting the complaint in the venue's complaint register immediately", "Following up after the resolution to confirm the guest is satisfied", "Briefing the supervisor before they speak to the guest"], "a": 2}, {"q": "Why should you never begin a response to a complaint with 'but'?", "opts": ["It is grammatically incorrect in formal customer service communication", "The word 'but' signals an argument rather than a resolution to the guest", "It places responsibility on the guest rather than the venue", "It is too informal for the professional hospitality environment"], "a": 1}]}, {"id": 6, "title": "Telephone and Digital Communication", "subtitle": "Phone standards, answering correctly, messages, email etiquette and digital awareness", "duration": "20 min", "slides": [{"title": "The Phone Is Often a Guest's First Impression", "type": "body", "body": "Before a guest ever walks through the door, they may have called your venue. How that call is answered forms the first impression of the entire operation. A phone ringing more than three times before it is answered, a distracted or unprofessional greeting, or a call that is transferred incorrectly, all begin the guest relationship on the wrong note.\n\nProfessional telephone communication requires preparation, a clear and warm tone, and the discipline to treat every call as the important contact that it is, even during the busiest service periods."}, {"title": "Answering the Telephone Correctly", "type": "steps", "intro": "Follow this sequence for every incoming call:", "steps": [{"number": "1", "label": "Answer promptly", "detail": "Answer within three rings. A ringing phone that is ignored or answered late communicates disorganisation to the caller."}, {"number": "2", "label": "Greet professionally", "detail": "'Good morning, Sinotheni Events Academy, this is [name], how may I assist you?' This greeting tells the caller they have reached the right place and that there is a named person ready to help."}, {"number": "3", "label": "Listen fully", "detail": "Do not attempt to answer before the caller has finished. Take brief notes if the query is detailed."}, {"number": "4", "label": "Confirm and act", "detail": "Repeat back the key details. 'So you would like to make a reservation for six guests this Saturday evening. Let me check availability.'"}, {"number": "5", "label": "Close the call clearly", "detail": "Before ending, summarise what was agreed: 'I have noted your reservation for six guests at seven pm on Saturday. We look forward to seeing you. Have a wonderful day.'"}]}, {"title": "Managing Calls, Transfers and Messages", "type": "list", "intro": "The most common telephone management failures and how to avoid them:", "items": ["Never leave a caller on hold for more than 60 seconds without checking in. Silence longer than that reads as disconnection or disinterest.", "Before transferring, tell the caller who they are being transferred to and why. Blind transfers feel like being passed off.", "When taking a message, record: the caller's name, their contact number, the date and time of the call, the nature of their message, and your name.", "Read the message back to the caller before ending the call to confirm accuracy.", "Deliver the message to the relevant person promptly. A message that sits for three hours has not been managed professionally.", "If the person is unavailable, give the caller an honest indication of when they can expect a return call."]}, {"title": "Email and Written Communication Standards", "type": "list", "intro": "Written communication represents the venue permanently and can be shared widely:", "items": ["Begin every email with a professional greeting: 'Dear [Name],' or 'Good morning [Name],' not 'Hi' or nothing at all.", "Use your full name and venue contact details in your sign-off. Every email is an opportunity to reinforce professionalism.", "Respond to guest emails within four hours during business hours. A 24-hour response time is the absolute maximum before it communicates neglect.", "Proofread before sending. A typo in a guest-facing email is a minor reflection on the venue's standards.", "Avoid all capital letters in email. ALL CAPS reads as shouting in digital communication.", "When an email contains a request, confirm what will be done and when: 'I will have this confirmed for you by 3pm today.'"]}, {"title": "Digital and Social Media Awareness", "type": "highlight", "points": [{"text": "Anything you communicate digitally on behalf of the venue is permanent and potentially public. Treat every digital message with the same care as a face-to-face interaction."}, {"text": "Never post about a guest, a function, a private booking or internal matters on social media, even without names. The violation of discretion is the issue, not just identification."}, {"text": "Guest reviews on platforms such as Google, TripAdvisor and social media should be responded to professionally and promptly. A response to a negative review is often more powerful than the review itself."}, {"text": "Do not use your personal phone for venue communications unless the venue has issued specific guidelines for this."}]}, {"title": "Communication Failures and Their Cost", "type": "body", "body": "The most damaging communication failures in hospitality are not dramatic arguments. They are the unanswered email, the phone not picked up, the message not delivered, the follow-up that never came. Each of these is a small failure that creates a disproportionate impact on the guest's overall experience and their decision about whether to return.\n\nA reputation for prompt, clear and warm communication is one of the most differentiating qualities a hospitality venue or professional can have. In South Africa's hospitality market, where response times and communication quality vary enormously, being consistently responsive and professional is a genuine competitive advantage."}], "questions": [{"q": "What information must a professional telephone greeting include?", "opts": ["Your name only, to keep the greeting brief and efficient", "The name of the venue, your name and an offer to assist", "The venue's opening hours and reservation policy", "The venue's name and the name of your supervisor"], "a": 1}, {"q": "What is the maximum time a caller should be left on hold without a check-in?", "opts": ["30 seconds", "60 seconds", "2 minutes", "5 minutes"], "a": 1}, {"q": "What must a professional phone message always include?", "opts": ["The caller's name and message only", "The caller's name, contact number, date and time of call, nature of message and your name", "The caller's contact number and a description of their issue", "The caller's name, the time and your supervisor's name for accountability"], "a": 1}, {"q": "Why should email to guests be responded to within four hours during business hours?", "opts": ["South African consumer protection law requires this response time", "Faster responses increase the likelihood of an upsell", "Delays beyond this begin to communicate neglect and reduce guest confidence", "Four hours is the industry standard required for hotel star grading purposes"], "a": 2}, {"q": "What is the issue with posting about a private function on social media, even without guest names?", "opts": ["It is acceptable as long as no personal information is shared", "The violation of discretion is the issue regardless of whether individuals can be identified", "It is only a problem if the guest or client explicitly requested confidentiality", "Social media posts about functions are acceptable if they are positive and promotional"], "a": 1}]}, {"id": 7, "title": "Cultural Awareness and Inclusive Service", "subtitle": "South Africa's diversity, cultural basics, language sensitivity, accessibility and the universal standard", "duration": "20 min", "slides": [{"title": "South Africa's Diversity Is Your Professional Advantage", "type": "body", "body": "South Africa has eleven official languages, diverse religious traditions, multiple cultural practices around food, greetings, personal space and family, and a guest population drawn from across the country and the world. A hospitality professional who understands and respects this diversity is not only more effective at their job. They are more valuable to any employer.\n\nCultural awareness does not require expertise in every culture. It requires humility, curiosity, a willingness to ask respectful questions, and the discipline to avoid assumptions. The guest standing in front of you is an individual, not a representative of their background."}, {"title": "Cultural Awareness Basics for Hospitality", "type": "list", "intro": "Key areas where cultural differences most commonly affect hospitality interactions:", "items": ["Greetings: in some cultures a firm handshake is expected; in others physical contact with strangers is less common. Wait for the guest's cue rather than imposing your greeting style.", "Names: South African names span a wide range of origins and pronunciations. If you are unsure, ask respectfully: 'I want to make sure I pronounce your name correctly. Would you mind saying it for me?'", "Eye contact: while eye contact is a sign of confidence and respect in many Western contexts, it is less expected in some African and Asian cultures. Adapt rather than insist.", "Personal space: comfort with physical proximity varies significantly across cultures. Match the guest's preference, not your own.", "Time perception: some cultures have a more flexible relationship with time than others. Manage waiting gracefully and without visible impatience.", "Food and dietary practices: religious and cultural dietary requirements are not preferences. They are non-negotiable for many guests and must be handled with the same seriousness as medical allergies."]}, {"title": "Language Sensitivity in South Africa", "type": "body", "body": "Many guests you serve in South Africa will not have English as their first language. Some will be communicating in their second or third language. This requires patience, clarity and flexibility from the hospitality professional.\n\nWhen communicating with a guest who is finding the language difficult, speak more slowly and more clearly, not more loudly. Raising your voice to someone who does not speak English fluently does not help and communicates irritation. Use shorter sentences, confirm understanding frequently and, where possible, use visual aids such as menus, maps or written confirmation."}, {"title": "Inclusive Service for Guests with Disabilities", "type": "highlight", "points": [{"text": "Ask before assisting. 'Would you like me to help you with that?' is the correct approach. Assuming someone needs assistance without asking can feel patronising."}, {"text": "Speak directly to the guest, not to a companion or caregiver. A guest using a wheelchair is the guest. Their companion is not their spokesperson."}, {"text": "Know your venue's accessible facilities: ramps, lifts, accessible bathrooms, and where they are. This is basic information a guest with mobility needs may require immediately."}, {"text": "For guests with hearing impairment, face them when speaking, speak clearly and offer written communication as a supplement. Do not exaggerate your lip movements."}, {"text": "For guests with visual impairment, describe the environment verbally when guiding them and ask what assistance they need rather than assuming."}]}, {"title": "Religious and Dietary Cultural Awareness", "type": "list", "intro": "Religious and cultural dietary requirements are among the most common where mishandling causes serious distress:", "items": ["Halaal requirements: no pork or pork derivatives, no alcohol in food preparation. Know your kitchen's compliance. Do not guess.", "Kosher requirements: strict food separation and preparation laws. Genuine kosher certification is required. Know whether your venue is certified.", "Hindu and Jain practices: many practitioners are vegetarian or vegan, with specific restrictions on root vegetables for some. Ask and confirm.", "Christian fasting periods: some guests may be fasting during Lent or other periods. Offer plant-based options proactively.", "Ramadan: Muslim guests fasting during Ramadan may not eat during daylight hours but may require meal reservations for after sunset. Accommodate graciously.", "Always confirm dietary requirements with the kitchen. Never answer for the kitchen without checking."]}, {"title": "The Universal Standard", "type": "body", "body": "Behind all cultural diversity is one universal standard: every guest, regardless of where they come from, what language they speak, what religion they practise or what their physical capabilities are, deserves to feel welcomed, respected and well served.\n\nCultural awareness is not about memorising rules for every culture. It is about approaching each guest with genuine curiosity and respect, adapting rather than demanding, and holding the commitment to make every person's experience in your care a positive one. That is both the professional standard and the right thing to do."}], "questions": [{"q": "What is the most important principle in cultural awareness for hospitality professionals?", "opts": ["Memorising the rules and customs of every major culture represented in South Africa", "Treating every guest as an individual and adapting rather than assuming", "Ensuring guests from other cultures are directed to staff from similar backgrounds", "Applying the same standard of service regardless of the guest's background or culture"], "a": 1}, {"q": "What should you do if you are unsure how to pronounce a guest's name?", "opts": ["Avoid using their name entirely to prevent embarrassment", "Make your best attempt without asking, as asking may embarrass the guest", "Ask respectfully: 'I want to make sure I pronounce your name correctly. Would you mind saying it for me?'", "Ask a colleague who may be familiar with names from that cultural background"], "a": 2}, {"q": "What is the correct approach when a guest using a wheelchair arrives with a companion?", "opts": ["Direct communication and enquiries to the companion to facilitate the interaction", "Speak directly to the guest using the wheelchair. They are the guest.", "Assist immediately without asking, to save the guest having to request help", "Contact the venue manager to handle the situation according to accessibility policy"], "a": 1}, {"q": "Why must Halaal dietary requirements always be confirmed with the kitchen?", "opts": ["Halaal requirements are complex and only the chef can determine compliance accurately", "Answering for the kitchen without checking risks serving a guest something that violates a serious religious practice", "Halaal requirements differ between guests and only the individual knows their exact needs", "Kitchen confirmation is required by South African food safety regulations for all dietary requests"], "a": 1}, {"q": "What is the correct way to communicate with a guest who is not speaking English as their first language?", "opts": ["Speak louder and more slowly to help them understand", "Ask a colleague who speaks their language to handle the interaction", "Speak more slowly and clearly, use shorter sentences and confirm understanding frequently", "Communicate in English only and ask them to bring a translator if needed"], "a": 2}]}, {"id": 8, "title": "Upselling and Revenue Awareness", "subtitle": "Service-oriented recommendations, when to upsell, effective language and what not to do", "duration": "20 min", "slides": [{"title": "Upselling as Service", "type": "body", "body": "In professional hospitality, upselling is not selling. It is making a confident, relevant recommendation that improves the guest's experience. A guest celebrating an anniversary who is offered a room upgrade is being served better. A guest who is recommended a wine that pairs beautifully with their food is having a better meal. A guest at the bar who is told about a local craft spirit they may not have tried is having a richer experience.\n\nThe difference between upselling as service and upselling as pressure is the intent behind it. When the recommendation genuinely benefits the guest, it is service. When it exists purely to increase the bill, guests can feel it, and the effect is the opposite of what is intended."}, {"title": "The Difference Between Upselling and Pushing", "type": "list", "intro": "Understanding where the line sits protects both the guest experience and the venue's reputation:", "items": ["A genuine recommendation is offered once, confidently, with a clear reason why it benefits the guest.", "Pushing is repeating a declined offer, using guilt, urgency or false scarcity to pressure a decision.", "A guest who has declined an upgrade does not want it reconsidered. Move on warmly and serve the original choice excellently.", "Never suggest that a guest's original choice is inferior to the upsell. 'The standard room is fine, but...' is both condescending and counter-productive.", "Recommendations that genuinely cost significantly more than the original choice should be offered carefully and only when you are confident the guest is receptive.", "A guest who feels pushed will not enjoy their purchase, regardless of its quality. They will remember the pressure, not the recommendation."]}, {"title": "Knowing When to Upsell", "type": "highlight", "points": [{"text": "A relaxed, engaged guest who is enjoying the experience and taking their time is receptive to recommendations. A stressed, rushed or price-conscious guest is not."}, {"text": "Guests who ask for recommendations are actively inviting upselling. This is the clearest possible green light."}, {"text": "Celebration contexts, anniversaries, birthdays and special occasions, are natural moments for an upgrade or an enhancement offer."}, {"text": "First-time guests often welcome guidance on what is best. An experienced recommendation from a knowledgeable professional builds trust."}, {"text": "Never upsell during a complaint or a service recovery moment. This is the worst possible timing and communicates that revenue matters more than the guest's experience."}]}, {"title": "Effective Recommendation Language", "type": "steps", "intro": "The words you use in a recommendation determine how it is received:", "steps": [{"number": "1", "label": "Be specific", "detail": "'The Shiraz this evening is particularly good, it would pair beautifully with the lamb' is far more effective than 'Would you like to try the wine?'"}, {"number": "2", "label": "Give the guest a reason", "detail": "Connect the recommendation to their stated preference or situation: 'Since you mentioned you enjoy full-bodied reds, you might love the Pinotage.'"}, {"number": "3", "label": "Make it personal", "detail": "'Many of our guests who try the signature suite say it is one of the highlights of their stay' is more compelling than 'we also have a premium option.'"}, {"number": "4", "label": "Accept the decision graciously", "detail": "If the guest declines, thank them warmly and move on. 'Of course, the standard is excellent. Let me get that ready for you.'"}]}, {"title": "Reading the Guest Before You Recommend", "type": "body", "body": "The most skilled upsellers in hospitality rarely make recommendations that are declined because they have developed the ability to read whether a guest is receptive before they offer anything. They observe the guest's pace, their engagement with the menu, their conversation with companions and their body language.\n\nAn excited, engaged guest asks questions, lingers over the menu and engages with the server. A decided, price-aware guest orders quickly, avoids eye contact around the menu extras and uses decisive body language. These guests require completely different approaches. The first welcomes conversation and recommendation. The second wants efficiency and accuracy."}, {"title": "What Not to Do When Upselling", "type": "list", "intro": "Common upselling failures that damage the guest experience:", "items": ["Offering the most expensive option immediately without any indication of the guest's preferences or budget", "Upselling repeatedly after the first decline - once is professional, twice is pushy, three times is alienating", "Using false urgency: 'This is our last available upgrade' when it is not", "Making the guest feel that their original choice is inadequate or that they are making a mistake by not upgrading", "Upselling during a moment when the guest is clearly stressed, unhappy or in a hurry", "Offering an upsell you cannot confidently describe or recommend from genuine knowledge"]}], "questions": [{"q": "What distinguishes upselling as service from upselling as pressure?", "opts": ["The price difference between the original choice and the recommended upgrade", "Whether the recommendation genuinely benefits the guest or exists purely to increase the bill", "The seniority of the staff member making the recommendation", "Whether the recommendation is made verbally or through a printed menu"], "a": 1}, {"q": "When is the worst possible moment to offer a guest an upgrade or enhancement?", "opts": ["When the guest has just placed their order and has not yet been served", "When a guest is celebrating a birthday or anniversary", "During a complaint or a service recovery moment", "When the guest has not asked for a recommendation"], "a": 2}, {"q": "What makes a recommendation more effective than a generic offer?", "opts": ["Mentioning that other guests have purchased the same item", "Being specific about why the recommendation benefits this particular guest", "Offering it at a discounted price to incentivise the decision", "Repeating the offer until the guest considers it"], "a": 1}, {"q": "What is the correct response when a guest declines an upsell offer?", "opts": ["Ask once more, framing the offer slightly differently", "Express mild disappointment to signal the value the guest is missing", "Accept the decision graciously and move on warmly", "Note the refusal and avoid recommending to this guest in future"], "a": 2}, {"q": "Which type of guest is most receptive to a recommendation?", "opts": ["A guest who is rushed and has clearly decided what they want", "A guest who is stressed or dissatisfied with something at the venue", "A guest who asks for recommendations and is clearly engaged and relaxed", "A guest who is very price-conscious and focused on the lower-cost options"], "a": 2}]}, {"id": 9, "title": "Working Under Pressure", "subtitle": "Composure, prioritising, teamwork under pressure, recovering from mistakes and building resilience", "duration": "20 min", "slides": [{"title": "Pressure Is Inevitable in Hospitality", "type": "body", "body": "There is no hospitality professional who does not experience pressure. A fully booked service, a guest complaint at the worst possible moment, a colleague who called in sick, a system that stops working mid-service: these are not exceptional events. They are the regular texture of hospitality work. The question is never whether pressure will come. The question is how you will meet it.\n\nThe standard the industry expects is composure under pressure. Not the absence of stress, but the ability to manage it in a way that does not transfer to the guest and does not break down the team around you. Composure is a professional skill, and like all skills, it is developed with practice and intention."}, {"title": "The Composure Standard", "type": "highlight", "points": [{"text": "Composure begins before service. Arriving prepared, rested and ready reduces the severity of every pressure point during the shift."}, {"text": "Your emotional state is contagious. A panicked team member in a busy service spreads anxiety. A calm one anchors the team."}, {"text": "When you feel overwhelmed, the first task is to stop, breathe and prioritise. What is most urgent right now? Do that."}, {"text": "A guest who sees a hospitality professional visibly flustered or stressed immediately worries about their own experience. Composure protects the guest's confidence in the service."}, {"text": "Composure is not suppression. You can feel stressed. The professional standard is that the guest does not experience that stress."}]}, {"title": "Prioritising During a Rush", "type": "steps", "intro": "Effective prioritisation during a high-pressure service:", "steps": [{"number": "1", "label": "Identify your most urgent task", "detail": "What will cause the most damage if not addressed immediately? Start there."}, {"number": "2", "label": "Address guest needs before side work", "detail": "A guest waiting for their order takes priority over resetting a station or completing an administrative task."}, {"number": "3", "label": "Communicate with your team", "detail": "'I am overloaded on tables four and six, can anyone cover five for the next ten minutes?' is professional. Struggling in silence is not."}, {"number": "4", "label": "Do one thing fully", "detail": "Rushing between tasks without completing any of them is less efficient than completing each one to standard before moving to the next."}, {"number": "5", "label": "Know when to ask for help", "detail": "Recognising when you need support is a professional skill, not a failure. A team that communicates well moves through a rush far better than one where everyone is managing silently."}]}, {"title": "Teamwork Under Pressure", "type": "body", "body": "A hospitality team under pressure reveals its culture immediately. Teams that trust each other, communicate clearly and help without being asked absorb pressure and recover quickly. Teams that compete, blame or retreat into their own sections under pressure fall apart at exactly the moments when they most need to function.\n\nBeing the person your team can rely on under pressure means arriving prepared, communicating clearly, helping without being asked and staying calm when others are not. It is one of the most valued qualities in any hospitality professional and one of the clearest indicators of career potential."}, {"title": "Recovering from a Mistake Under Pressure", "type": "body", "body": "Under pressure, mistakes happen. The professional standard is not zero mistakes. It is a clear, fast and ungrudging recovery when they occur. A mistake acknowledged immediately and fixed with genuine care often leaves a better impression than service where nothing went wrong.\n\nOwn it. Fix it. Move on. Do not dwell on a single error while five more things require your attention. Do not let one mistake create a spiral of anxiety that produces four more. A professional recovery is clean: acknowledge, correct, thank the guest for their patience, and continue to the next task at full standard."}, {"title": "Building Your Pressure Tolerance Over Time", "type": "list", "intro": "Pressure tolerance is a capability that grows with experience and deliberate practice:", "items": ["Reflect after every challenging shift. What worked? What did not? What would you do differently?", "Develop pre-service rituals that settle your focus before a busy period begins.", "Build physical resilience: adequate sleep, proper nutrition during shifts and hydration all reduce your susceptibility to stress.", "Debrief with trusted colleagues after difficult services. Verbalising what happened reduces its emotional weight.", "Seek feedback from supervisors who have observed you under pressure. They see things you do not.", "Recognise and celebrate when you manage pressure well. Building awareness of your own competence under stress is motivating and accurate."]}], "questions": [{"q": "What does composure under pressure require of a hospitality professional?", "opts": ["Showing no signs of any stress or difficulty during service", "Managing stress in a way that does not transfer to the guest or break down the team", "Completing every task perfectly regardless of the volume of work", "Hiding pressure from supervisors to appear more capable than you are"], "a": 1}, {"q": "What is the first step when you feel overwhelmed during a busy service?", "opts": ["Tell the guest you are currently very busy and will attend to them shortly", "Continue working as fast as possible until the pressure reduces", "Stop, breathe and identify what is most urgent right now", "Ask the manager to reduce the number of tables you are responsible for"], "a": 2}, {"q": "Why does communicating with your team when you are overloaded matter?", "opts": ["It protects you from being blamed if something goes wrong during the rush", "A team that communicates manages pressure better than one where everyone struggles silently", "It creates a formal record of the workload conditions during the shift", "It allows the manager to reassign staff from other areas of the venue"], "a": 1}, {"q": "What is the professional approach to recovering from a mistake during service?", "opts": ["Acknowledge it to the supervisor but continue without telling the guest if possible", "Own it, fix it, thank the guest for their patience and move on without dwelling", "Apologise repeatedly until the guest signals that the apology has been accepted", "Avoid making the same mistake again and accept that the guest's experience is already compromised"], "a": 1}, {"q": "How does a calm team member affect a hospitality team under pressure?", "opts": ["They slow down the team by not matching the urgency of the moment", "They are less useful than highly energetic team members during a rush", "Their composure anchors the team and reduces the spread of anxiety", "They tend to complete fewer tasks than team members who are visibly stressed"], "a": 2}]}, {"id": 10, "title": "Building Guest Loyalty", "subtitle": "What loyalty is worth, the gestures that create it, remembering guests and the follow-up", "duration": "20 min", "slides": [{"title": "Loyalty Is Earned One Interaction at a Time", "type": "body", "body": "A loyal guest is not created by a loyalty programme or a discount card. Loyalty in hospitality is created by a consistent accumulation of experiences where the guest felt genuinely valued, where their needs were anticipated, where their preferences were remembered and where problems were handled with care rather than policy.\n\nThe mechanics of loyalty are simple: make a guest feel genuinely important and consistently well served over multiple visits and they will choose your venue over a competitor even when the competitor offers a marginally better price or product. Loyalty is the compound interest of good guest relations."}, {"title": "The Loyal Guest and What They Are Worth", "type": "body", "body": "The business case for guest loyalty is straightforward. Acquiring a new guest costs significantly more than retaining an existing one. A loyal guest spends more per visit, returns more frequently and recommends the venue to others. They are also more forgiving when something goes wrong, because they have a bank of positive experience to draw on.\n\nThis means that every interaction with a returning guest is worth more than the immediate transaction it represents. A returning guest who leaves feeling that their loyalty was recognised and valued will return again and bring someone with them. A returning guest who feels like a stranger after multiple visits begins looking for somewhere that notices them."}, {"title": "Small Gestures with Large Impact", "type": "list", "intro": "The acts that create loyalty are rarely dramatic. They are the accumulated effect of small, consistent gestures:", "items": ["Remembering a returning guest's name and using it naturally", "Noting a preference from a previous visit without being asked: 'I remember you preferred a window table'", "Acknowledging a special occasion: a birthday, anniversary or professional achievement", "Checking back after a dish or a room has been delivered to confirm it meets expectations", "Bringing a small extra without being asked when you sense the guest would appreciate it", "Writing a personal note of thanks for a significant booking or a repeat visit", "Following up after a complaint to confirm the guest's experience improved"]}, {"title": "Remembering Guests", "type": "body", "body": "The ability to remember a guest across visits is one of the most powerful tools in hospitality. It communicates recognition, respect and genuine investment in the guest as a person rather than a transaction.\n\nThis does not require an exceptional memory. It requires a system. Many venues maintain guest profiles that record preferences, dietary needs, previous stays and special occasions. Where these systems exist, use them. Where they do not, develop your own approach: a brief note in a personal log, a shared team note, or simply the discipline of paying attention during each visit and carrying forward what you learn."}, {"title": "The Follow-Up and Why It Matters", "type": "highlight", "points": [{"text": "A follow-up call or message after a significant stay or event tells the guest that the venue's interest in their experience extends beyond the bill."}, {"text": "After a complaint, a follow-up confirms that the resolution was genuine and not simply designed to end the interaction."}, {"text": "Following up after a special occasion such as a wedding or a corporate event creates the strongest possible impression for future bookings."}, {"text": "Follow-up should be brief, warm and genuine. It is not a sales call. It is a relationship moment."}, {"text": "Not every guest wants follow-up contact. Read the cues during the original interaction. A guest who was warm and engaged will generally welcome it."}]}, {"title": "From Satisfied to Loyal", "type": "body", "body": "Satisfaction is the baseline of professional service. Every guest should leave satisfied. But satisfaction does not guarantee return. A guest may have been perfectly satisfied with a meal, a room or an event and still try a different venue next time simply because they feel no particular reason to return.\n\nLoyalty is created when the guest feels known, valued and understood as an individual. It is the feeling that this particular venue, or this particular person, genuinely cares about their experience in a way that others do not. That feeling is created through the accumulation of small, consistent, personalised moments of recognition and care."}], "questions": [{"q": "What is the most accurate description of how guest loyalty is created?", "opts": ["Through loyalty points programmes that reward frequent visits financially", "Through a single exceptional experience that the guest will remember permanently", "Through a consistent accumulation of experiences where the guest felt genuinely valued", "Through pricing that is consistently lower than competitor venues in the area"], "a": 2}, {"q": "Why is a loyal guest more valuable than a satisfied first-time guest?", "opts": ["Loyal guests always spend more on premium products than new guests", "They return more frequently, spend more per visit and recommend the venue to others", "They require less service attention because they know what to expect", "Loyal guests are more likely to accept price increases without complaint"], "a": 1}, {"q": "What is the most important quality of a follow-up contact after a guest visit?", "opts": ["It should include a special offer to incentivise the next visit", "It should be brief, warm and genuine, not a sales call", "It should be made within 24 hours to demonstrate urgency", "It should summarise all the services the guest used during their visit"], "a": 1}, {"q": "What does remembering a guest's preference from a previous visit communicate?", "opts": ["That the venue's PMS system is comprehensive and well maintained", "That the guest's information has been stored and is being used for marketing", "Recognition, respect and genuine investment in the guest as an individual", "That the venue has a high returning guest rate and excellent staff retention"], "a": 2}, {"q": "What distinguishes a loyal guest from a satisfied guest?", "opts": ["A loyal guest leaves five-star reviews; a satisfied guest does not necessarily review", "A satisfied guest enjoyed their visit; a loyal guest feels known and valued as an individual", "A loyal guest spends significantly more per visit than a satisfied guest", "A satisfied guest requires a complaint to have been resolved during their visit"], "a": 1}]}, {"id": 11, "title": "Delivering Exceptional Guest Experiences", "subtitle": "What exceptional looks like, anticipating needs, consistency and signature moments", "duration": "25 min", "slides": [{"title": "What Exceptional Looks Like", "type": "body", "body": "Exceptional guest experiences are not created by expensive products or elaborate gestures. They are created by the relentless accumulation of small, well-executed details delivered by people who are genuinely present and genuinely invested in the guest's wellbeing.\n\nThe water is refilled before the guest looks at an empty glass. The guest's name is used naturally and correctly. The anniversary is quietly acknowledged. The complaint is handled with care that exceeds the guest's expectation. None of these are complicated. All of them require attention, intention and consistency. Together they create the feeling that a venue is extraordinary."}, {"title": "The Details That Create Memorable Experiences", "type": "list", "intro": "Exceptional service lives in details that guests feel even when they cannot consciously name them:", "items": ["Refilling a guest's water before they need to ask or notice it is low", "Using the guest's name correctly after hearing it once", "Anticipating a special occasion and acknowledging it with genuine warmth", "Noticing when a guest is looking for something before they call out", "Ensuring the quietest guest at the table receives equal attention to the most vocal", "Following through on every promise, however small, made during the interaction", "Checking back after a delivery not as a script but out of genuine interest in the guest's experience"]}, {"title": "Anticipating Needs: The Highest Skill", "type": "body", "body": "The highest form of guest relations is anticipation: knowing what a guest needs before they know they need it. This requires deep attention to the guest in front of you, knowledge of what is likely to be needed given the context, and the confidence to act on what you observe.\n\nA guest who has just finished their starter does not need to ask whether their main is coming. A guest who has been in the bar for two hours may appreciate being asked if they would like something to eat. A guest with young children at the table will likely need certain things without asking. Anticipation is not mind-reading. It is the application of attention and professional knowledge to every situation."}, {"title": "Consistency as the Foundation of Excellence", "type": "highlight", "points": [{"text": "Exceptional service is not exceptional if it only happens sometimes. Consistency is the bedrock."}, {"text": "A guest who received outstanding service on their last visit and mediocre service on this one is not experiencing excellence. They are experiencing unpredictability."}, {"text": "Consistency applies across interactions, team members and time of day. The standard does not change based on how busy it is or which manager is on duty."}, {"text": "Professional pride is the inner driver of consistency. The standard exists because the guest deserves it, not because someone is watching."}, {"text": "Consistency builds trust, and trust is the foundation of loyalty. A guest who knows they can rely on a venue returns without hesitation."}]}, {"title": "Signature Moments", "type": "body", "body": "The most memorable guest experiences usually contain at least one signature moment: something unexpected, personal and genuinely thoughtful that the guest did not anticipate and did not pay for. A handwritten note from the chef. A complimentary dessert on a birthday. A recommendation for a local experience that turns out to be the highlight of a trip.\n\nSignature moments cannot be scripted for every guest. They emerge from genuinely paying attention to who the guest is and what would delight them specifically. They are the expression of a hospitality professional who is truly present and truly invested in the person they are serving."}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Guest Relations and Customer Care.\n\nYou now have the communication skills, emotional intelligence and professional understanding to create exceptional guest experiences in any hospitality setting, at restaurants, hotels, events venues and beyond, in South Africa and internationally.\n\nThe final assessment covers all eleven modules. You need 60 percent to pass and receive your Certificate of Completion.\n\nEvery guest you serve from this point is an opportunity to practise what you have learned. Go and create experiences worth remembering."}], "questions": [{"q": "What creates exceptional guest experiences most reliably?", "opts": ["Expensive products and elaborate gestures that surprise and delight guests", "The consistent accumulation of small, well-executed details by genuinely present people", "Technology that tracks guest preferences and automates personalised service", "Formal scripts that ensure every guest interaction follows a proven template"], "a": 1}, {"q": "What is the highest skill in guest relations?", "opts": ["Resolving complaints in a way that turns unhappy guests into loyal ones", "Remembering every returning guest's name and previous preferences", "Anticipating what a guest needs before they know they need it", "Communicating warmly and professionally in all situations"], "a": 2}, {"q": "What does consistency mean in the context of exceptional service?", "opts": ["Delivering the same scripted interaction to every guest in exactly the same way", "Maintaining the same standard across interactions, team members and time of day", "Ensuring every team member uses the same words during guest interactions", "Consistency means the service standard only changes when a manager is present"], "a": 1}, {"q": "What is a signature moment in guest relations?", "opts": ["A formal part of the service sequence designed to make the guest feel welcome", "A scripted gesture that every guest receives as part of the standard package", "An unexpected, personal and genuinely thoughtful act that the guest did not anticipate", "A loyalty reward delivered to returning guests after a set number of visits"], "a": 2}, {"q": "What is the professional attitude that drives consistency?", "opts": ["The desire to avoid complaints from guests and negative feedback from managers", "Professional pride: the standard exists because the guest deserves it, not because someone is watching", "The expectation of recognition and reward from management for consistent performance", "The fear of consequences if the standard is not maintained during an inspection"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What is guest relations at its core?", "opts": ["A job title for specialised hotel staff", "Making people feel valued, heard and well served in every interaction", "The process of managing complaints", "A set of standard scripts for common guest situations"], "a": 1}, {"q": "What is the service recovery paradox?", "opts": ["Guests who complain are never truly satisfied", "An exceptionally handled complaint can leave a guest more satisfied than if nothing went wrong", "Recovery costs more than prevention", "Every complaint requires management involvement"], "a": 1}, {"q": "What is active listening?", "opts": ["Listening while planning your response", "Taking notes during every guest conversation", "Giving full attention, listening to understand, acknowledging and clarifying", "Repeating everything back verbatim"], "a": 2}, {"q": "What should you say when you do not know the answer to a guest's question?", "opts": ["Guess rather than appear uninformed", "Redirect to the manager immediately", "Acknowledge you do not know, give a timeframe and go find out", "Ask the guest to check the venue's website"], "a": 2}, {"q": "When should a complaint be escalated to a supervisor?", "opts": ["Every complaint", "Only physical aggression", "When the guest remains upset after your attempt, or billing is involved, or the guest requests a manager", "Only for food complaints"], "a": 2}, {"q": "What makes an upsell a service rather than a push?", "opts": ["The price of the upgrade", "Whether it genuinely benefits this specific guest", "Whether it is offered more than once", "The seniority of the person making the offer"], "a": 1}, {"q": "What is the maximum hold time before checking back with a caller?", "opts": ["30 seconds", "60 seconds", "2 minutes", "5 minutes"], "a": 1}, {"q": "What is the issue with posting about a private function on social media?", "opts": ["It is fine if no names are used", "The violation of discretion is the issue regardless of identification", "It is only a problem if the client complained", "Social media posts are acceptable if positive"], "a": 1}, {"q": "Which type of guest is LEAST receptive to a recommendation?", "opts": ["A guest who asks for help choosing", "A guest celebrating a birthday", "A guest who is stressed and in a hurry", "A first-time guest unfamiliar with the menu"], "a": 2}, {"q": "What does composure under pressure require?", "opts": ["Showing no signs of stress at all", "Managing stress so it does not transfer to the guest or team", "Completing every task perfectly regardless of volume", "Hiding difficulty from supervisors"], "a": 1}, {"q": "How is guest loyalty most accurately created?", "opts": ["Through loyalty points programmes", "Through a single exceptional experience", "Through consistent experiences where the guest feels genuinely valued", "Through pricing below competitors"], "a": 2}, {"q": "What does a follow-up contact after a guest visit communicate?", "opts": ["That the venue is offering a promotion", "That the venue's interest extends beyond the immediate transaction", "That the guest is being assessed for a loyalty tier", "That there is a problem to address"], "a": 1}, {"q": "What distinguishes a loyal guest from a satisfied guest?", "opts": ["Loyal guests leave five-star reviews", "A loyal guest feels known and valued as an individual", "A loyal guest spends significantly more", "A satisfied guest had a complaint resolved"], "a": 1}, {"q": "What is the correct response when a guest declines an upsell?", "opts": ["Offer once more with different framing", "Express mild disappointment", "Accept graciously and serve the original choice excellently", "Note refusal and avoid recommending again"], "a": 2}, {"q": "What should you never begin a complaint response with?", "opts": ["An apology", "The guest's name", "The word 'but' or 'actually'", "A question"], "a": 2}, {"q": "What does cultural awareness in hospitality require?", "opts": ["Expertise in every major culture", "Treating every guest as an individual with curiosity and respect", "Directing guests to staff from similar backgrounds", "Applying the same style to every guest"], "a": 1}, {"q": "What does anticipating a guest's needs require?", "opts": ["An exceptional memory", "A PMS system that tracks all preferences", "Deep attention and professional knowledge applied to each situation", "Experience of more than five years"], "a": 2}, {"q": "What is consistency in the context of exceptional service?", "opts": ["Using the same script for every interaction", "Maintaining the same standard across interactions, team members and time of day", "Consistency only applies when a manager is present", "Delivering the service standard only during peak periods"], "a": 1}, {"q": "What drives professional consistency in service?", "opts": ["Fear of consequences if standards are not maintained", "The expectation of recognition from management", "Professional pride: the standard exists because the guest deserves it", "The presence of management during service"], "a": 2}, {"q": "What creates a signature moment in hospitality?", "opts": ["A formal scripted gesture in the service sequence", "A loyalty reward after a set number of visits", "Paying genuine attention to the individual and acting on what you observe", "An expensive complimentary product offered to every guest"], "a": 2}];
const RESOURCES = [{"id": "resource-pack", "title": "Guest Relations Practical Resource Pack", "desc": "Communication tools and guest service frameworks across 7 sections"}];

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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the communication skills and guest-focused professional conduct expected across restaurants, hotels, events venues and all hospitality environments.`;
    const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of guest relations and customer care expected across the hospitality industry in South Africa and internationally.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Communication skills and guest psychology for South African hospitality</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>The complete professional standard for guest relations and customer care across the hospitality industry. Eleven modules covering communication, guest psychology, complaint handling, cultural awareness, upselling and the skills that turn first-time guests into loyal ones.</div>
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
      const remarks=`${fullName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the communication skills and guest-focused professional conduct expected across restaurants, hotels, events venues and all hospitality environments.`;
      const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of guest relations and customer care expected across the hospitality industry in South Africa and internationally.`;
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
