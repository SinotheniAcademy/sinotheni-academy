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
const STORE_KEY = "se_bar_ops_v1";
const ACADEMY_KEY = "se_academy_status_v1";
const COURSE_ID = "bar-operations";
const COURSE_TITLE = "Bar Operations \u0026 Beverage Service";
const COURSE_TYPE = "SHORT COURSE";
const COURSE_PRICE = 350;

function loadState() { try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function saveState(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {} }
function updateAcademyStatus(u) { try { const ex = JSON.parse(localStorage.getItem(ACADEMY_KEY)||"{}"); localStorage.setItem(ACADEMY_KEY, JSON.stringify({...ex,[COURSE_ID]:{...ex[COURSE_ID],...u}})); } catch {} }

const MODULE_NAMES = ["Introduction to Bar Service", "Bar Setup and Station Management", "Glassware: Types, Care and Service", "Beer, Cider and Non-Alcoholic Beverages", "Wine Service Fundamentals", "Spirits and Liqueurs", "Cocktails and Mixed Drinks", "Service Standards and Guest Interaction", "Responsible Service of Alcohol", "Cash Handling and Point of Sale", "Health, Safety and Hygiene at the Bar"];
const CHAPTERS = [{"id": 1, "title": "Introduction to Bar Service", "subtitle": "What bar professionals do, why they matter, and the standard expected across hospitality", "duration": "20 min", "slides": [{"title": "Welcome to Bar Service 101", "type": "intro", "body": "Bar Service 101 prepares you for professional bar work across South Africa's hospitality industry. Whether you work in a restaurant, hotel, events venue or nightclub, the standards you learn here apply everywhere a bar operates.\n\nThis course covers eleven modules: from bar setup and glassware through to cocktails, responsible service and cash handling. Complete it and you will have the knowledge and confidence to work professionally behind any bar."}, {"title": "What a Bar Professional Really Is", "type": "body", "body": "A skilled bar professional is not simply someone who pours drinks. They are a host, a product expert, a safety officer and an ambassador for the venue they represent. Every guest who approaches the bar forms an impression of the entire operation based on how the bartender looks, speaks and performs.\n\nThe standard South Africa's hospitality industry expects is high. Venues, event companies and hotels need bar staff who are consistent, knowledgeable and professional under pressure. This course teaches you to meet that standard."}, {"title": "Types of Bar Environments", "type": "list", "intro": "Bar professionals work across a wide range of settings:", "items": ["Hotel bars and lobby lounges: formal, guest-focused, international standards", "Restaurant bars: food and beverage pairing, table service integration", "Events and functions: high-volume, fast-paced, coordinated service", "Nightclubs and entertainment venues: energy management, crowd awareness", "Corporate events: professional, often formal, client-facing", "Private functions and weddings: bespoke service, personal attention", "Standalone bars and taverns: community-focused, regular guest relationships"]}, {"title": "Your Core Responsibilities at the Bar", "type": "list", "intro": "A bar professional's responsibilities in any professional setting:", "items": ["Set up and maintain the bar station before service begins", "Greet and acknowledge every guest who approaches the bar", "Take orders accurately and prepare drinks to the correct standard", "Serve beverages at the correct temperature in the correct glassware", "Monitor guest behaviour and serve alcohol responsibly", "Handle cash and card payments accurately and honestly", "Keep the bar clean, organised and fully stocked throughout service", "Support the team and contribute to smooth, professional service"]}, {"title": "Why Standards Matter", "type": "body", "body": "A guest at a bar is making a judgement about the entire venue within the first thirty seconds of being served. The quality of the drink, the cleanliness of the glass, the manner of the bartender and the speed of service all contribute to that judgement.\n\nIn South Africa's competitive hospitality market, venues live and die by reputation. A bar professional who consistently delivers quality service is an asset the venue depends on. One who is inconsistent, careless or unprofessional costs the venue guests, revenue and reputation."}, {"title": "Where Bar Professionals Work in South Africa", "type": "body", "body": "South Africa's hospitality industry is one of the country's most significant employers. Bar professionals are in demand at hotels, game lodges, restaurants, catering companies, events businesses and entertainment venues across every province.\n\nThe skills in this course are transferable between all of these settings. A bartender who understands glassware, responsible service, product knowledge and professional standards can work confidently anywhere. Each module builds on the last to give you a complete foundation for a career at the bar."}], "questions": [{"q": "What is the primary role of a bar professional beyond pouring drinks?", "opts": ["Managing stock and placing orders for the venue", "Acting as a host, product expert and ambassador for the venue", "Training junior staff and overseeing the full bar team", "Setting the pricing for beverages served at the bar"], "a": 1}, {"q": "Which of the following is a core responsibility of a bar professional?", "opts": ["Managing the kitchen and coordinating with chefs", "Setting the evening's entertainment programme", "Monitoring guest behaviour and serving alcohol responsibly", "Designing the bar menu and selecting stock suppliers"], "a": 2}, {"q": "Why does consistency matter in bar service?", "opts": ["It reduces the cost of ingredients and increases profit margins", "It ensures the venue passes health and safety inspections", "Venues depend on consistent service for their reputation and guest retention", "It makes the bartender eligible for promotion more quickly"], "a": 2}, {"q": "When does a bar professional's responsibility begin?", "opts": ["When the first guest orders a drink", "When the bar officially opens for service", "Before service, by setting up and maintaining the station correctly", "When the event manager gives the instruction to begin"], "a": 2}, {"q": "Which environments might a trained bar professional work in?", "opts": ["Only formal hotel bars and fine-dining restaurants", "Only nightclubs and entertainment venues", "Only events and functions, not regular venues", "Hotels, restaurants, events, nightclubs and private functions"], "a": 3}]}, {"id": 2, "title": "Bar Setup and Station Management", "subtitle": "Opening procedures, stock checks, equipment, cleanliness and closing the bar", "duration": "20 min", "slides": [{"title": "Setup Is the Foundation of Good Service", "type": "body", "body": "The quality of your service during a shift is determined before the first guest arrives. A bar that is properly set up, fully stocked and spotlessly clean allows you to focus entirely on the guest experience. A bar that is disorganised, understocked or dirty creates problems that compound throughout the service.\n\nProfessional bar management starts with the opening checklist and ends with the closing checklist. Everything in between is easier when these two routines are executed correctly every time."}, {"title": "Opening the Bar: Step by Step", "type": "steps", "intro": "Follow this sequence every time you open a bar station:", "steps": [{"number": "1", "label": "Check stock levels", "detail": "Count all bottles, mixes, garnishes and supplies against your par levels. Note any shortages before service begins."}, {"number": "2", "label": "Set up glassware", "detail": "Polish and position all required glassware. Check for chips and cracks. Remove any damaged glass immediately."}, {"number": "3", "label": "Prepare garnishes and mixes", "detail": "Cut, measure and refrigerate all garnishes. Prepare any fresh mixes or syrups. Date and label everything."}, {"number": "4", "label": "Check equipment", "detail": "Test your ice machine, blender, POS terminal and refrigeration. Report any faults to your supervisor before service."}, {"number": "5", "label": "Set your station", "detail": "Organise your tools, speed rail, pourers and waste bin for efficient movement. Everything you reach for should be where you expect it."}]}, {"title": "Stock and Inventory: What to Check", "type": "list", "intro": "A thorough stock check before every shift covers:", "items": ["Spirits: check each bottle, note levels, flag any below one-third full", "Beer and cider: count units in refrigeration and storage", "Wine: check bottles in wine rack and refrigeration", "Soft drinks and mixers: count units and check best-before dates", "Garnishes: lemons, limes, olives, cherries - check freshness", "Ice: confirm ice machine is producing and bin is clean", "Consumables: straws, cocktail sticks, napkins, menus", "Cleaning supplies: ensure cloths, sanitiser and detergent are stocked"]}, {"title": "Your Tools and Equipment", "type": "list", "intro": "A professional bar station is equipped with specific tools. Know each one:", "items": ["Speed rail: holds your most-used spirits within arm's reach", "Jigger: measures pours accurately. Use it every time.", "Cocktail shaker: Boston shaker or cobbler shaker for mixed drinks", "Bar spoon: for stirring and layering drinks", "Muddler: for crushing ingredients in the glass", "Strainer: Hawthorne or Julep strainer for poured cocktails", "Channel knife and peeler: for citrus garnishes", "Ice scoop: never use a glass to scoop ice"]}, {"title": "Cleanliness and Organisation During Service", "type": "highlight", "points": [{"text": "Wipe down the bar top after every round of service. A dirty bar surface is the first thing guests notice."}, {"text": "Keep your ice bin covered when not in use and never touch ice with bare hands."}, {"text": "Change your bar cloth regularly. A cloth used for more than 30 minutes in service becomes a contamination risk."}, {"text": "Organise empties immediately. Bottles and glasses left on the bar create clutter that slows service."}, {"text": "Your appearance reflects the bar. Keep your uniform clean and your station neat throughout the full shift."}]}, {"title": "Closing the Bar Correctly", "type": "steps", "intro": "Close the bar properly every time to protect stock, equipment and the next shift:", "steps": [{"number": "1", "label": "Empty and clean ice bin", "detail": "Ice left overnight becomes contaminated. Empty, rinse and dry the ice bin at the end of every shift."}, {"number": "2", "label": "Store all garnishes and perishables", "detail": "Label, cover and refrigerate every perishable item. Discard anything past its usable date."}, {"number": "3", "label": "Count and record stock", "detail": "Count remaining stock against your opening count. Report any significant discrepancies to your supervisor."}, {"number": "4", "label": "Clean all equipment", "detail": "Clean shakers, strainers, pourers and tools. Wash and store all glassware."}, {"number": "5", "label": "Secure the bar", "detail": "Lock spirits and cash. Cover the bar. Leave the station ready for the next shift or morning opener."}]}], "questions": [{"q": "Why is bar setup so important before service begins?", "opts": ["It impresses supervisors and demonstrates commitment", "It reduces the cost of consumables during service", "A properly set up bar allows the bartender to focus on the guest during service", "It is required by South African liquor legislation"], "a": 2}, {"q": "What should you do immediately when you identify a cracked or chipped glass?", "opts": ["Set it aside and use it for non-contact purposes", "Remove it immediately and dispose of it safely", "Inform a colleague and continue using it carefully", "Report it to the supervisor at the end of the shift"], "a": 1}, {"q": "Why should you never use a glass to scoop ice?", "opts": ["It is less efficient than using a proper scoop", "It can leave glass fragments in the ice bin, creating a safety hazard", "It damages the glass and increases replacement costs", "It is considered unprofessional by guests at the bar"], "a": 1}, {"q": "How should you store garnishes at the end of a shift?", "opts": ["Leave them on the bar covered with a cloth for the next shift", "Discard all garnishes regardless of condition to ensure freshness", "Label, cover and refrigerate perishables. Discard anything past its usable date.", "Store garnishes in the spirits cabinet to keep them cool"], "a": 2}, {"q": "What is the correct approach when a stock shortage is identified during the opening check?", "opts": ["Begin service and address the shortage when it becomes a problem", "Note the shortage and inform your supervisor before service begins", "Substitute an alternative product without telling guests", "Close the bar until the shortage has been resolved"], "a": 1}]}, {"id": 3, "title": "Glassware: Types, Care and Service", "subtitle": "Glass types, matching glass to drink, washing, polishing, storage and breakages", "duration": "20 min", "slides": [{"title": "Why Glassware Matters", "type": "body", "body": "The glass a drink is served in is not a minor detail. It affects the temperature of the drink, the presentation, the aroma and the guest's entire perception of what they are about to consume. A craft beer served in the wrong glass tastes different. A premium spirit served in a dirty glass immediately undermines the venue's credibility.\n\nProfessional bartenders treat glassware with the same care they give to the drink itself. Clean, correct, unchipped glassware is a non-negotiable standard in any quality hospitality environment."}, {"title": "The Main Glass Types and Their Uses", "type": "list", "intro": "Know each glass and what it is used for:", "items": ["Highball glass: tall glass for long drinks, spirit and mixer combinations", "Rocks or old-fashioned glass: short, wide glass for spirits on the rocks or neat", "Cocktail or martini glass: distinctive V-shape for served-up cocktails", "Wine glass: red wine glasses are wider and rounder; white wine glasses are narrower", "Champagne flute: tall, narrow glass to preserve bubbles in sparkling wine", "Pint glass: standard glass for draught beer in 440ml or 500ml sizes", "Shot glass: small glass for measuring and serving spirits neat", "Brandy snifter: wide bowl for warming and concentrating brandy aromas", "Hurricane glass: tall, curved glass for tropical and frozen cocktails"]}, {"title": "Matching the Glass to the Drink", "type": "highlight", "points": [{"text": "Never serve a cocktail in the wrong glass. The shape and size affect temperature, aroma and presentation equally."}, {"text": "Beer glasses matter: a lager in a frosted pint glass, a craft ale in a branded glass, a stout in its correct glass. Know your venue's standards."}, {"text": "Premium spirits deserve appropriate glassware. A whisky served in a dirty wine glass insults the product and the guest."}, {"text": "If you are unsure which glass to use, ask your supervisor before service, not mid-service in front of a guest."}]}, {"title": "Washing and Polishing Glassware", "type": "steps", "intro": "Clean glassware requires both machine washing and hand polishing:", "steps": [{"number": "1", "label": "Wash correctly", "detail": "Use the glasswasher at the correct temperature with the correct detergent dose. Overloading the machine leaves glasses dirty."}, {"number": "2", "label": "Allow to dry briefly", "detail": "Remove glasses promptly and allow them to cool slightly before polishing. Hot glasses crack when handled."}, {"number": "3", "label": "Polish with a clean cloth", "detail": "Hold the glass at the base and polish in circular motions using a lint-free cloth. Check the rim, the bowl and the base."}, {"number": "4", "label": "Check before use", "detail": "Hold each glass to the light before placing it on the bar. Look for cloudiness, lipstick marks, chips and cracks."}]}, {"title": "Storing Glassware Correctly", "type": "list", "intro": "How you store glasses is as important as how you wash them:", "items": ["Store glasses right-side up on a clean, dry shelf where possible. Upside-down storage traps odours.", "Never stack glasses inside each other. This causes chipping and breakage.", "Keep glasses away from strong-smelling products. Glass absorbs odours that transfer to drinks.", "Do not refrigerate glasses unless specifically required for certain beer styles. Cold glasses cause spirits to warm unevenly.", "Rotate stock: use older stock first, newer stock behind. This prevents dust accumulation on unused glasses."]}, {"title": "Handling Breakages Professionally", "type": "highlight", "points": [{"text": "When a glass breaks, stop immediately and secure the area. Broken glass requires your full attention before any other task."}, {"text": "Never pick up broken glass with bare hands. Use a brush, dustpan or tongs. Every piece must be accounted for."}, {"text": "If glass breaks near ice, the entire ice bin must be emptied, cleaned and refilled. A glass shard in a guest's drink is a medical emergency."}, {"text": "Log the breakage. Most venues require bartenders to record glass breakages. This is not punishment, it is stock management."}, {"text": "Replace the broken glass immediately so the station remains fully equipped."}]}], "questions": [{"q": "Which glass is used for a served-up cocktail such as a martini?", "opts": ["Highball glass", "Rocks glass", "Cocktail or martini glass", "Champagne flute"], "a": 2}, {"q": "What is the correct way to store glassware?", "opts": ["Stack glasses inside each other to save space", "Store right-side up on a clean dry shelf and never stack inside each other", "Refrigerate all glasses before service to keep drinks cold longer", "Store all glasses upside down to prevent dust accumulation"], "a": 1}, {"q": "What must you do if glass breaks near the ice bin?", "opts": ["Remove the visible pieces and continue using the ice", "Cover the ice bin immediately and use a different source", "Empty, clean and refill the entire ice bin", "Ask a colleague to check the ice before continuing"], "a": 2}, {"q": "Why does it matter which glass a drink is served in?", "opts": ["Guests notice the label on the glass and associate it with quality", "Different glasses are priced differently and affect profitability", "The shape and size affect temperature, aroma and presentation", "Venues are legally required to use specific glasses for each drink type"], "a": 2}, {"q": "When should you check a glass for chips, cracks or cloudiness?", "opts": ["Only during the opening check before service begins", "When a guest specifically complains about the glass", "Before placing each glass on the bar or in front of a guest", "At the end of each service when glasses are being washed"], "a": 2}]}, {"id": 4, "title": "Beer, Cider and Non-Alcoholic Beverages", "subtitle": "Beer types, draught service, bottled beer, cider and non-alcoholic alternatives", "duration": "20 min", "slides": [{"title": "Understanding Beer", "type": "body", "body": "Beer is the most commonly ordered beverage at South African bars, venues and events. A bartender who understands beer, who can describe the difference between a lager and an ale, who can pour a draught correctly and who knows the correct serving temperature and glass, is immediately more valuable than one who treats all beer as interchangeable.\n\nSouth Africa has a thriving craft beer culture alongside the dominant mainstream brands. Knowing your venue's beer list and being able to speak confidently about each option is a basic professional requirement."}, {"title": "Types of Beer Served at the Bar", "type": "list", "intro": "The major categories your guests will order:", "items": ["Lager: light, crisp and carbonated. The most popular style in South Africa. Served cold. Examples: Castle Lager, Heineken, Amstel.", "Pilsner: a type of lager, slightly more bitter and golden. Examples: Miller, Peroni.", "Ale: fuller flavoured, often served slightly warmer than lager. Includes pale ales and IPAs.", "Stout: dark, roasted flavour, creamy head. Example: Guinness. Served at slightly warmer temperature.", "Craft beer: independent brewery beers. Wide range of styles. Know your venue's specific craft offerings.", "Non-alcoholic beer: growing category. Treat with the same care as alcoholic beer in terms of service and temperature."]}, {"title": "Draught Beer Service: The Correct Method", "type": "steps", "intro": "Pouring a draught beer correctly requires technique and practice:", "steps": [{"number": "1", "label": "Prepare the glass", "detail": "Use a clean, cold glass appropriate for the beer style. Never use a glass with residue."}, {"number": "2", "label": "Position at 45 degrees", "detail": "Hold the glass at a 45-degree angle under the tap. Open the tap fully and allow beer to flow against the inside of the glass."}, {"number": "3", "label": "Straighten and build the head", "detail": "When the glass is about two-thirds full, straighten it to vertical. This builds the correct head."}, {"number": "4", "label": "Aim for the correct head", "detail": "A standard lager should have approximately 10-15mm of foam. Different styles have different standards. Know your venue's spec."}, {"number": "5", "label": "Present and serve", "detail": "Do not wipe the glass. Place it on a coaster or napkin in front of the guest."}]}, {"title": "Bottled and Canned Beer Service Standards", "type": "highlight", "points": [{"text": "Always check the bottle or can for damage, corrosion or an expired date before serving."}, {"text": "Open the bottle at the bar in front of the guest. Do not pre-open bottles."}, {"text": "Present the bottle with the label facing the guest so they can see what they are receiving."}, {"text": "Offer to pour into a glass. Some guests prefer the bottle. Follow the guest's preference."}, {"text": "Serve at the correct temperature. Lager should be between 4-8 degrees Celsius. Ales and stouts slightly warmer."}]}, {"title": "Cider and Non-Alcoholic Alternatives", "type": "list", "intro": "A professional bar serves all guests equally well, regardless of what they order:", "items": ["Cider: apple or pear based, served cold in appropriate glassware. Growing in popularity at South African venues.", "Non-alcoholic beer: serve with the same care as regular beer. Use clean glassware and correct temperature.", "Mocktails: know your venue's non-alcoholic cocktail menu. These guests deserve equal attention and quality.", "Soft drinks: serve in clean glassware with ice unless the guest declines. Never serve a warm soft drink.", "Sparkling water: serve in a clean glass, chilled, with a lemon or lime if the venue standard includes it.", "Energy drinks: note that mixing energy drinks with alcohol requires special awareness under responsible service guidelines."]}, {"title": "Temperature and Presentation", "type": "highlight", "points": [{"text": "Serving temperature is not optional. A warm beer is a complaint waiting to happen. Know your refrigeration schedule."}, {"text": "A foamy draught served in a half-empty glass communicates carelessness. A correctly poured beer communicates professionalism."}, {"text": "A coaster or napkin under every glass is the mark of a venue that cares about detail. This applies to all beverages, not just premium products."}, {"text": "If you are unsure of a guest's preference between bottle and glass, offer both options. Never assume."}]}], "questions": [{"q": "At what angle should you hold the glass when beginning a draught pour?", "opts": ["Vertical, with the tap directly over the centre of the glass", "45 degrees, allowing beer to flow against the inside of the glass", "Horizontal, to reduce foam formation", "Slightly tilted, with the tap touching the rim"], "a": 1}, {"q": "What is the correct serving temperature range for South African lager?", "opts": ["0-2 degrees Celsius", "4-8 degrees Celsius", "10-14 degrees Celsius", "Room temperature, between 18-22 degrees Celsius"], "a": 1}, {"q": "What should you do before serving a bottled beer to a guest?", "opts": ["Open it in advance so it is ready when the guest arrives", "Check the bottle for damage, corrosion or an expired date", "Always pour it into a glass regardless of the guest's preference", "Wipe the bottle clean and place it directly on the bar"], "a": 1}, {"q": "How should a bartender treat a guest who orders a non-alcoholic beverage?", "opts": ["Give priority to guests ordering alcohol as this generates more revenue", "Suggest the guest try an alcoholic version of their chosen drink", "Serve with the same care and attention as any other beverage", "Non-alcoholic beverages do not require glassware or presentation standards"], "a": 2}, {"q": "What is the correct head size for a standard South African lager served on draught?", "opts": ["No foam at all - the glass should be completely full", "The glass should be half foam and half beer", "Approximately 10-15mm of foam", "The foam should reach just below the rim"], "a": 2}]}, {"id": 5, "title": "Wine Service Fundamentals", "subtitle": "Red, white, rose and sparkling wine, opening, pouring, storage and describing wine to guests", "duration": "25 min", "slides": [{"title": "Wine at the Bar", "type": "body", "body": "Wine is one of the most nuanced beverage categories a bar professional will encounter. Understanding the basics, which styles exist, how to serve each correctly, the right temperature, the right glass and how to describe what the guest is drinking, is the difference between a bartender who can handle the full menu and one who is limited to beer and cocktails.\n\nYou do not need to be a sommelier. You need to know your venue's wine list, serve each wine correctly and communicate confidently with guests who have questions."}, {"title": "Red, White and Rose: The Key Differences", "type": "list", "intro": "The three main categories of still wine and how to handle each:", "items": ["Red wine: made from dark-skinned grapes, fermented with the skins. Served at room temperature, approximately 16-18 degrees Celsius. Common South African reds: Cabernet Sauvignon, Shiraz, Pinotage, Merlot.", "White wine: made from white or skinless grapes. Served chilled, approximately 8-12 degrees Celsius. Common South African whites: Sauvignon Blanc, Chenin Blanc, Chardonnay.", "Rose wine: made from brief contact with red grape skins, giving a pink colour. Served chilled, approximately 8-10 degrees Celsius.", "Each category needs different storage, service temperature and glassware. Never serve red wine over-warm or white wine warm."]}, {"title": "Sparkling Wine and Champagne", "type": "body", "body": "Sparkling wine is a significant category at events and celebrations. South Africa produces excellent sparkling wines under the Methode Cap Classique designation. Champagne is a sparkling wine from the Champagne region of France and is protected under European law.\n\nSparkling wine is served very cold, between 6 and 8 degrees Celsius. The flute glass preserves the bubbles. When opening a bottle of sparkling wine, always point it away from guests, remove the foil and cage, cover the cork with a cloth and turn the bottle slowly until the cork releases with minimal sound and no spray. A loud pop and spray is poor technique."}, {"title": "Opening and Pouring Wine at the Bar", "type": "steps", "intro": "Follow this sequence for professional wine service:", "steps": [{"number": "1", "label": "Present the bottle", "detail": "Show the guest the bottle with the label facing them. Confirm it is the correct wine before opening."}, {"number": "2", "label": "Cut the foil", "detail": "Cut cleanly below the second lip of the bottle. Wipe the top of the bottle with a clean cloth."}, {"number": "3", "label": "Insert and extract the cork", "detail": "Use a waiter's friend corkscrew. Insert the spiral centrally, lever the cork out smoothly. Do not allow the cork to pop."}, {"number": "4", "label": "Offer the guest to taste", "detail": "Pour a small measure for the guest who ordered. Wait for their approval before serving the rest of the table."}, {"number": "5", "label": "Pour to the correct level", "detail": "For red wine, fill the glass to one-third. For white wine, half to two-thirds. For sparkling, allow the foam to settle and top up."}]}, {"title": "Wine Storage and Service Temperature", "type": "highlight", "points": [{"text": "Red wine stored too cold loses flavour and aroma. White and sparkling stored too warm oxidise quickly and taste flat."}, {"text": "An open bottle of wine should be used within the same service. Reseal with a wine stopper if carried over. Never serve wine from a bottle opened the previous day without checking quality."}, {"text": "Sparkling wine loses its bubbles rapidly once open. Serve promptly after opening. A sparkling wine stopper slows the loss of carbonation."}, {"text": "Know where your venue stores wine and what the correct serving order is. First opened, first served applies to wine carried over between services."}]}, {"title": "Describing Wine to a Guest", "type": "body", "body": "A guest who asks for a wine recommendation expects a helpful, confident answer. You do not need to use technical language. You need to describe what the wine tastes and smells like in terms the guest can understand.\n\nFor red wine, think about whether it is light and fruity or full and rich. For white wine, is it dry and crisp or soft and round. For rose, is it dry or slightly sweet. Practice describing each wine on your venue's list in two or three sentences before service begins. If you have never tasted a wine, ask a senior colleague or your supervisor for guidance before you describe it to guests."}], "questions": [{"q": "At what temperature should South African white wine be served?", "opts": ["Room temperature, approximately 18 degrees Celsius", "Very cold, between 0-4 degrees Celsius", "Chilled, approximately 8-12 degrees Celsius", "Slightly cool, approximately 15 degrees Celsius"], "a": 2}, {"q": "What does 'Methode Cap Classique' refer to?", "opts": ["A South African red wine classification for premium wines", "A method of producing sparkling wine in South Africa", "A Champagne brand imported from France", "A dessert wine style produced in the Cape"], "a": 1}, {"q": "What should a bartender do after presenting a bottle of wine to the guest?", "opts": ["Open the bottle immediately and pour for all guests at the table", "Confirm it is the correct wine, then open and offer a taste to the guest who ordered", "Ask the guest to open the bottle themselves at the table", "Pour a full glass for all guests without offering a taste first"], "a": 1}, {"q": "What is the correct technique when opening a bottle of sparkling wine?", "opts": ["Remove the cage, grip the cork firmly and pull it out quickly", "Point the bottle towards guests so they can see the cork is being removed", "Cover the cork with a cloth, turn the bottle slowly until the cork releases with minimal sound", "Allow the cork to pop loudly to signal celebration to the room"], "a": 2}, {"q": "How much red wine should you pour into a wine glass?", "opts": ["Fill to the brim to give the guest the best value", "Fill to one-third of the glass", "Fill to exactly half the glass every time", "Pour until the guest signals you to stop"], "a": 1}]}, {"id": 6, "title": "Spirits and Liqueurs", "subtitle": "The major spirit categories, standard measures, liqueurs, responsible service and South African favourites", "duration": "25 min", "slides": [{"title": "The World of Spirits", "type": "body", "body": "Spirits form the backbone of the bar. A bartender who cannot name, describe and pour the major spirit categories accurately is not ready for professional bar work. Spirits are also the highest-value category on most beverage menus, which means errors, wastage or inconsistent pouring directly affect the venue's profitability.\n\nThis module covers the major categories, correct pouring measures, responsible service and the South African spirits landscape. Product knowledge beyond this module is developed through working with your venue's specific menu and through ongoing professional development."}, {"title": "The Major Spirit Categories", "type": "list", "intro": "The six main spirit categories a bar professional must know:", "items": ["Whisky/whiskey: grain-based spirit, aged in oak. Scotch (Scotland), Irish, Bourbon (USA), South African. Served neat, on ice or in cocktails.", "Brandy: distilled from wine. South Africa is the world's largest brandy-per-capita consumer. KWV, Klipdrift, Richelieu are dominant local brands.", "Vodka: neutral grain or potato spirit. Colourless, odourless. The most versatile mixing spirit. Served neat, chilled or in countless cocktails.", "Rum: distilled from sugarcane. Light rum for cocktails, dark rum for warming drinks. Caribbean origin but widely available.", "Gin: grain spirit infused with botanicals, primarily juniper. Craft gin is the fastest growing category in South Africa.", "Tequila and Mezcal: distilled from agave. Tequila is most common. Served neat with salt and lime, or in cocktails such as the Margarita."]}, {"title": "Measures and Pouring Standards", "type": "steps", "intro": "Accurate pouring protects the guest, the venue and your professional integrity:", "steps": [{"number": "1", "label": "Always use a jigger", "detail": "Every measure poured at a professional bar is measured with a jigger. Free-pouring is inaccurate and exposes the venue to liability."}, {"number": "2", "label": "Know your venue's measures", "detail": "South African standard is 25ml or 30ml for a single spirit. Some venues pour 40ml. Know your venue's specific standard before service."}, {"number": "3", "label": "Pour cleanly", "detail": "Tilt the bottle smoothly over the jigger. Do not rush. A spill or overpour must be recorded."}, {"number": "4", "label": "Record all pours accurately", "detail": "Every spirit served must be rung through the POS. Never pour without recording. This is a dismissal offence at most venues."}]}, {"title": "Liqueurs and Digestifs", "type": "list", "intro": "Liqueurs are a separate category with their own service standards:", "items": ["Liqueurs: sweetened spirits infused with fruit, cream, herbs or spices. Lower alcohol than base spirits. Examples: Amarula, Frangelico, Baileys.", "Cream liqueurs: contain dairy, require refrigeration after opening. Always check the bottle is within date.", "Schnapps: fruit-flavoured, often sweet, served as a shot or in cocktails. Popular at events and celebrations.", "Digestifs: spirits traditionally served after a meal to aid digestion. Brandy, Amaretto, Grappa. Usually served in smaller measures.", "Amarula: South Africa's iconic cream liqueur made from marula fruit. Every South African bar professional should know and be able to describe it."]}, {"title": "Responsible Spirits Service", "type": "highlight", "points": [{"text": "Spirits have significantly higher alcohol content than beer or wine. A guest who drinks spirits quickly reaches intoxication faster. Monitor accordingly."}, {"text": "Never pour a second round of spirits for a guest who is showing signs of intoxication, regardless of their protests."}, {"text": "Do not encourage guests to order more than they intended. The goal is hospitality, not maximum alcohol consumption."}, {"text": "A guest who becomes disruptive after spirits service is a liability for the venue and a safety risk. Know your escalation process."}]}, {"title": "South African Spirits and Local Knowledge", "type": "body", "body": "South Africa has a rich spirits culture that every local bar professional should know. Brandy is the defining spirit of South African bar culture, with a history stretching back to the seventeenth century and a current market that is among the most sophisticated in the world.\n\nBeyond brandy, South Africa's craft gin explosion has produced dozens of outstanding local gins, many infused with indigenous botanicals such as rooibos, fynbos and buchu. Being able to recommend and describe South African craft spirits to guests is a genuine point of difference for any bar professional working in this market."}], "questions": [{"q": "Which spirit is most closely associated with South African bar culture and consumption?", "opts": ["Whisky", "Vodka", "Brandy", "Rum"], "a": 2}, {"q": "Why must a bar professional always use a jigger rather than free-pouring?", "opts": ["Free-pouring is slower and reduces service efficiency", "Jiggers are required by South African liquor legislation", "Free-pouring is inaccurate and exposes the venue to liability", "Guests can see the measure being poured, which builds trust"], "a": 2}, {"q": "What must a bartender do immediately after pouring a spirit?", "opts": ["Cap the bottle and return it to the speed rail", "Offer the guest a garnish or mixer without being asked", "Ring the pour through the POS system", "Note the pour in the manual stock book"], "a": 2}, {"q": "What is unique about Amarula?", "opts": ["It is the most widely exported South African beer internationally", "It is South Africa's iconic cream liqueur made from marula fruit", "It is a craft gin produced in the Western Cape using fynbos botanicals", "It is the only locally produced brandy sold at a global standard"], "a": 1}, {"q": "Why do cream liqueurs such as Baileys require special handling?", "opts": ["They are more expensive and need to be locked away when not in service", "They contain dairy and require refrigeration after opening", "They cannot be mixed with other spirits or ingredients", "They require a special pourer that prevents air from entering the bottle"], "a": 1}]}, {"id": 7, "title": "Cocktails and Mixed Drinks", "subtitle": "Bar tools, cocktail categories, building and mixing techniques, garnishes and South African favourites", "duration": "25 min", "slides": [{"title": "What Makes a Great Cocktail", "type": "body", "body": "A cocktail is not simply a mixture of alcohol and mixer. A well-made cocktail balances flavour, texture, temperature and presentation in a way that elevates the drinking experience. Every element matters: the quality of the base spirit, the freshness of the juice, the accuracy of the measurements, the way it is built, the glassware it is served in and the garnish that finishes it.\n\nA bartender who can make a great cocktail consistently is one of the most valuable members of any bar team. Consistency is the key word. Every guest who orders the same cocktail should receive the same drink."}, {"title": "Bar Tools and Equipment for Cocktail Making", "type": "list", "intro": "These are the tools you need to make cocktails professionally:", "items": ["Boston shaker: two-piece shaker (tin and glass) used by professional bartenders for most shaken cocktails", "Cobbler shaker: three-piece shaker with built-in strainer. Easier for beginners but slower for experienced bartenders", "Hawthorne strainer: coiled strainer that fits over the tin to strain cocktails into the glass", "Fine strainer: catches small ice chips and fruit pulp for double-strained cocktails", "Muddler: wooden or plastic pestle used to crush ingredients such as mint, lime or sugar in the glass", "Bar spoon: long-handled spoon for stirring and layering. Holds approximately 5ml", "Jigger: measures all liquid ingredients. Never add spirits without measuring"]}, {"title": "Classic Cocktail Categories", "type": "list", "intro": "Understanding categories helps you build any cocktail confidently:", "items": ["Sours: spirit, citrus and sweetener. Examples: Whisky Sour, Margarita, Daiquiri. Shaken.", "Highballs: spirit and carbonated mixer, served long. Examples: Gin and Tonic, Rum and Cola, Vodka Soda.", "Old Fashioneds and Spirit-forward: spirit, bitters and sweetener. Stirred, not shaken. Examples: Old Fashioned, Manhattan.", "Champagne cocktails: sparkling wine base. Examples: Bellini, Mimosa, French 75.", "Cream cocktails: cream or cream liqueur component. Examples: White Russian, Grasshopper, Mudslide.", "Tropical and frozen: fruit juices, blended ice. Examples: Pina Colada, Frozen Margarita."]}, {"title": "Building, Mixing and Shaking", "type": "steps", "intro": "The correct technique for each cocktail method:", "steps": [{"number": "1", "label": "Building in the glass", "detail": "For highballs and simple mixed drinks: add ice, measure spirits, add mixer, stir briefly and garnish. Keep it simple and efficient."}, {"number": "2", "label": "Stirring", "detail": "For spirit-forward cocktails: combine ingredients over ice in a mixing glass. Stir for 30 seconds using a bar spoon. Strain into a chilled glass. Stirring dilutes gently and chills without adding air."}, {"number": "3", "label": "Shaking", "detail": "For sours and cocktails with juice: combine ingredients in a shaker, add ice, seal and shake vigorously for 10-15 seconds. The shaker should become very cold. Strain immediately."}, {"number": "4", "label": "Muddling", "detail": "Add ingredients to the glass first. Muddle firmly but not aggressively. Over-muddling mint releases bitterness."}]}, {"title": "Garnishes and Presentation", "type": "highlight", "points": [{"text": "A garnish should complement the drink, not just decorate it. A lime wedge on a Gin and Tonic provides additional flavour when squeezed. A mint sprig on a Mojito adds aroma."}, {"text": "Cut garnishes freshly for each service. Pre-cut garnishes that dry out or discolour communicate low standards."}, {"text": "The garnish is the last thing the guest sees before tasting the drink. A wilted garnish undermines an otherwise excellent cocktail."}, {"text": "Never touch a garnish with bare hands and then place it in the drink. Use tongs, a pick or gloves."}, {"text": "Less is more. A single well-executed garnish is always more professional than several average ones."}]}, {"title": "Popular South African Cocktails and Bar Knowledge", "type": "body", "body": "South Africa has its own cocktail culture. Knowing the drinks your guests are most likely to order is as important as knowing the technique to make them.\n\nThe Springbok Shot (Peppermint liqueur and Amarula) is a South African staple at celebrations. The Brandy and Cola is the most widely consumed spirit drink in the country. The Gin and Tonic has exploded with the craft gin movement. The Margarita remains a restaurant favourite. A Mojito, Pina Colada and Cosmopolitan will be requested at any events bar.\n\nKnow your venue's cocktail menu by heart before your first shift. If your venue has signature cocktails, practice making each one until it is fast, accurate and consistent."}], "questions": [{"q": "What is the key word for professional cocktail making?", "opts": ["Speed: every cocktail must be made as quickly as possible", "Creativity: each cocktail should be slightly different to show skill", "Consistency: every guest who orders the same cocktail receives the same drink", "Volume: cocktails should be generous to encourage repeat orders"], "a": 2}, {"q": "What technique is used for a spirit-forward cocktail such as a Manhattan?", "opts": ["Shaking vigorously with ice for 15 seconds", "Stirring over ice in a mixing glass for 30 seconds, then straining", "Building directly in the glass without ice", "Blending with crushed ice for a smooth texture"], "a": 1}, {"q": "Why should garnishes be cut freshly for each service?", "opts": ["Pre-cut garnishes are more expensive as they oxidise and cannot be stored", "Health regulations in South Africa require freshly prepared garnishes", "Pre-cut garnishes that dry out or discolour communicate low standards", "Fresh garnishes add significantly more flavour to the finished cocktail"], "a": 2}, {"q": "What does muddling do in a cocktail?", "opts": ["Chills the ingredients before shaking", "Aerates the mixture to create a frothy texture", "Crushes ingredients to release their flavour and juice", "Strains out unwanted solids from the finished drink"], "a": 2}, {"q": "What is the Springbok Shot made from?", "opts": ["Amaretto and cream", "Peppermint liqueur and Amarula", "Brandy and ginger beer", "Vodka and grenadine"], "a": 1}]}, {"id": 8, "title": "Service Standards and Guest Interaction", "subtitle": "Greeting guests, taking orders, upselling, handling difficult situations and reading the bar", "duration": "20 min", "slides": [{"title": "The Guest Experience at the Bar", "type": "body", "body": "The bar is one of the most guest-facing areas of any venue. Unlike a restaurant where a guest is seated and expects to be approached, bar guests often make an active effort to get the bartender's attention. How quickly you acknowledge them, how warmly you receive them and how professionally you serve them determines whether they feel welcomed or ignored.\n\nEvery guest interaction at the bar is an opportunity to create a positive experience, build loyalty and reflect well on the venue. A bartender who greets every guest within 30 seconds, who knows the menu, who makes accurate drinks quickly and who is genuinely warm is one of the most powerful assets any hospitality business has."}, {"title": "Greeting and Acknowledging Guests", "type": "list", "intro": "First impressions at the bar are formed in seconds:", "items": ["Acknowledge every guest within 30 seconds of them approaching the bar, even during a rush. Eye contact and a nod communicate that you have seen them.", "If you are busy, say so honestly: 'I will be right with you.' Then follow through immediately.", "Greet warmly and directly. Use the guest's name if you know it. At a formal bar, a greeting such as 'Good evening, welcome' is appropriate.", "Do not let guests queue in silence. Regular communication during a busy period, even briefly, prevents frustration.", "A guest who feels invisible at a bar does not return. A guest who feels seen, even when busy, generally does."]}, {"title": "Taking and Confirming Orders at the Bar", "type": "steps", "intro": "Order accuracy is as important at the bar as anywhere in the venue:", "steps": [{"number": "1", "label": "Give your full attention", "detail": "Stop what you are doing, face the guest and give them your complete attention while they order."}, {"number": "2", "label": "Repeat the order back", "detail": "Confirm every drink before preparing: 'That is a double Scotch on the rocks and a Sauvignon Blanc, correct?' This prevents waste and errors."}, {"number": "3", "label": "Note modifications", "detail": "A guest who wants their gin without tonic deserves exactly that. Note every modification and execute it precisely."}, {"number": "4", "label": "Sequence correctly", "detail": "When serving multiple drinks, complete the order in a logical sequence. Build soft drinks while spirits are poured. Prepare cocktails last."}]}, {"title": "Upselling at the Bar Without Pressure", "type": "highlight", "points": [{"text": "Upselling is service, not sales. When you recommend a premium spirit upgrade, you are helping the guest have a better experience."}, {"text": "Know which upgrades your venue wants you to promote. 'Would you like that with Hendricks or our house gin?' is a simple, respectful upsell."}, {"text": "Read the table. A guest ordering rounds quickly in a busy bar does not want a detailed recommendation. A guest sipping slowly and browsing the menu welcomes engagement."}, {"text": "Never push. If a guest declines an upgrade, accept it warmly and proceed with their original order. Pressure at the bar ruins the experience."}]}, {"title": "Handling Difficult Situations", "type": "highlight", "points": [{"text": "A guest who becomes rude or aggressive should be met with calm, professional firmness. Do not match their energy. Do not argue."}, {"text": "If a guest complains about a drink, listen, apologise and offer to remake it. Do not defend the original drink or question the guest's palate."}, {"text": "A wait time complaint is handled by acknowledging it, apologising and giving an honest update. Do not make promises you cannot keep."}, {"text": "If a situation escalates beyond your ability to manage, notify your supervisor immediately. Do not attempt to resolve security issues alone."}]}, {"title": "Reading the Bar", "type": "body", "body": "The best bartenders observe their environment constantly. They notice the guest whose glass is nearly empty, the couple who have been waiting patiently while louder guests were served first, the person standing slightly apart from the group who looks uncertain.\n\nReading the bar means being present, aware and proactive rather than reactive. It means pouring the next round before the guest has to ask, recognising a regular guest's usual order, noticing when a group is ready to leave and bringing the bill unprompted.\n\nThis awareness is a skill that develops with practice. It is also one of the qualities that separates an excellent bar professional from a merely adequate one."}], "questions": [{"q": "Within how many seconds should a guest approaching the bar be acknowledged?", "opts": ["60 seconds, to allow them to settle and review the menu", "30 seconds, even if only with eye contact and a nod", "As soon as they are ready to order, signalled by calling the bartender", "5 minutes is acceptable during a busy service"], "a": 1}, {"q": "Why should a bartender repeat the order back before preparing it?", "opts": ["To demonstrate their product knowledge to the guest", "To give the guest a final opportunity to change their mind", "To confirm accuracy and prevent waste and errors", "To allow time for the POS system to process the order first"], "a": 2}, {"q": "What is the correct response when a guest complains that their drink is wrong?", "opts": ["Politely explain why the drink was made correctly according to the recipe", "Ask the guest to prove it is wrong before offering to remake it", "Listen, apologise and offer to remake the drink", "Refer the guest to the manager immediately"], "a": 2}, {"q": "What does upselling at the bar mean in a professional context?", "opts": ["Encouraging guests to order as many drinks as possible to increase revenue", "Recommending a premium option that enhances the guest's experience", "Charging more than the menu price for premium service", "Offering free drinks to guests who order above a certain amount"], "a": 1}, {"q": "What does 'reading the bar' require of a bartender?", "opts": ["Memorising the full drink menu before each shift", "Constant observation of the environment to be proactive and aware", "Watching for guests who appear intoxicated", "Tracking the number of drinks each guest has consumed"], "a": 1}]}, {"id": 9, "title": "Responsible Service of Alcohol", "subtitle": "Signs of intoxication, refusing service professionally, South African liquor law, minors and managing incidents", "duration": "20 min", "slides": [{"title": "Why This Module Is Non-Negotiable", "type": "body", "body": "Responsible service of alcohol is not just a professional standard, it is a legal requirement in South Africa. The Liquor Act of 2003 and the National Liquor Act govern the sale and serving of alcohol. A bartender who knowingly serves alcohol to an intoxicated person or to a minor exposes both themselves and the venue to criminal liability, fines and the revocation of the venue's liquor licence.\n\nBeyond the legal consequences, a guest who is over-served and then causes an accident, an injury or a death is a human tragedy that professional service could have prevented. Responsible service of alcohol is the most serious responsibility a bar professional carries."}, {"title": "Recognising the Signs of Intoxication", "type": "list", "intro": "Intoxication develops in stages. Recognise these indicators:", "items": ["Slurred speech or difficulty forming words", "Loss of balance, stumbling or difficulty sitting upright", "Bloodshot or glazed eyes, difficulty focusing", "Slowed reactions, delayed responses to questions", "Mood changes: becoming louder, more aggressive, more emotional or unusually withdrawn", "Smell of alcohol on breath combined with any of the above", "Spilling drinks, difficulty handling glasses or money", "Making comments or requests that reflect poor judgement"]}, {"title": "Refusing Service Professionally", "type": "steps", "intro": "Refusing service requires care, clarity and calm:", "steps": [{"number": "1", "label": "Make a private decision first", "detail": "Do not debate the refusal at the bar. Decide, ideally with a supervisor, then act. A public argument is never the right outcome."}, {"number": "2", "label": "Speak calmly and respectfully", "detail": "Approach the guest directly but quietly. 'I am not able to serve you another drink at this time' is direct without being confrontational."}, {"number": "3", "label": "Do not negotiate or explain extensively", "detail": "Keep your reason brief. 'I have a duty of care to ensure your safety' is sufficient. Extended explanation invites argument."}, {"number": "4", "label": "Offer alternatives", "detail": "Offer water, a soft drink or food. These gestures maintain respect and may de-escalate the situation."}, {"number": "5", "label": "Notify your supervisor immediately", "detail": "A refused guest is a potential incident. Your supervisor must be informed so they can monitor the situation."}]}, {"title": "South African Liquor Legislation", "type": "highlight", "points": [{"text": "The National Liquor Act 59 of 2003 regulates the manufacture, distribution and retail of liquor nationally. Provincial legislation adds additional regulations."}, {"text": "The legal drinking age in South Africa is 18 years. Serving alcohol to anyone under 18 is a criminal offence."}, {"text": "Serving alcohol to a visibly intoxicated person is an offence under the Liquor Act and can result in prosecution of the bartender personally."}, {"text": "A venue's liquor licence is its operating permit. A serious violation can result in suspension or permanent revocation."}, {"text": "Do not assume these laws do not apply to private functions or events. The Act applies to any occasion where alcohol is sold or served commercially."}]}, {"title": "Age Verification and Serving Minors", "type": "list", "intro": "The responsibility to verify age rests with the bartender:", "items": ["If in doubt, ask for identification. A valid South African ID, driver's licence, passport or temporary ID certificate is acceptable.", "Do not be embarrassed to ask. A guest who is offended by being asked for ID is a rare exception. Most take it as a compliment.", "If a minor presents a fake ID, the legal responsibility may still rest with the bartender if due diligence was not applied.", "Never serve alcohol to an adult who you believe is intending to supply it to a minor.", "At events where minors are present as guests, know your venue's wristband or identification system and follow it strictly."]}, {"title": "Managing an Incident at the Bar", "type": "highlight", "points": [{"text": "If a guest becomes physically aggressive, your personal safety takes priority. Move away and call for assistance immediately."}, {"text": "Never attempt to physically restrain a guest unless you are trained to do so. This exposes you to personal injury and legal liability."}, {"text": "Document every significant incident: the time, what occurred, who was involved and what action was taken. This protects you and the venue."}, {"text": "An over-served guest who leaves the premises and then causes an accident may result in the bartender who served them facing liability."}, {"text": "After any incident, debrief with your supervisor. Every incident is a learning point for the whole team."}]}], "questions": [{"q": "What is the legal drinking age in South Africa?", "opts": ["16 years", "17 years", "18 years", "21 years"], "a": 2}, {"q": "Which act primarily governs the sale and serving of alcohol in South Africa?", "opts": ["The Consumer Protection Act of 2008", "The National Liquor Act 59 of 2003", "The Occupational Health and Safety Act", "The Hospitality and Tourism Regulations Act"], "a": 1}, {"q": "What should you do immediately after refusing a guest service?", "opts": ["Ask the guest to leave the premises immediately", "Explain at length why the guest cannot be served", "Notify your supervisor so they can monitor the situation", "Serve the guest a soft drink without explaining why"], "a": 2}, {"q": "What forms of identification are acceptable for age verification at a South African bar?", "opts": ["Only a South African ID document", "A loyalty card from any major retailer showing the guest's date of birth", "A South African ID, driver's licence, passport or temporary ID certificate", "A student card or work identification from an employer"], "a": 2}, {"q": "What is the correct response if a guest becomes physically aggressive at the bar?", "opts": ["Stand your ground and firmly ask the guest to calm down", "Ask other guests at the bar to help manage the situation", "Attempt to physically restrain the guest to prevent harm to others", "Move away and call for assistance immediately"], "a": 3}]}, {"id": 10, "title": "Cash Handling and Point of Sale", "subtitle": "Opening and closing the till, taking payment, avoiding errors, digital payments and bar security", "duration": "20 min", "slides": [{"title": "Accuracy at the Till Is Non-Negotiable", "type": "body", "body": "Cash handling errors, whether from carelessness or dishonesty, are one of the most serious issues in bar management. A shortfall in the till at the end of a shift has consequences for the bartender responsible, regardless of the reason. A bartender with a consistent record of accurate cash handling is trustworthy and promotable. One with a consistent record of discrepancies is a liability.\n\nThis module covers the correct process for every cash and card transaction. Follow it every time, without shortcuts. The process exists to protect both you and the venue."}, {"title": "Opening and Closing the Till", "type": "steps", "intro": "The till must be counted and recorded at the start and end of every shift:", "steps": [{"number": "1", "label": "Count the float at opening", "detail": "Count the opening float carefully and record it on the cash sheet. Confirm it matches the expected amount. Report any discrepancy before service begins."}, {"number": "2", "label": "Use the POS correctly throughout service", "detail": "Every drink must be rung through before it is served. No exceptions. Pre-ringing is also not acceptable."}, {"number": "3", "label": "Count takings at closing", "detail": "Count all cash at the end of the shift before removing it from the till. Count twice. Record the total."}, {"number": "4", "label": "Complete the cash-up sheet", "detail": "Fill in the cash-up sheet accurately: opening float, total takings, closing count, variance. Sign it."}, {"number": "5", "label": "Hand over to the manager", "detail": "Never leave cash unattended. Hand over directly to your manager or supervisor at the end of the shift."}]}, {"title": "Taking Payment Correctly", "type": "list", "intro": "The correct process for every cash transaction:", "items": ["State the amount clearly: 'That is R185, thank you.' Never guess or estimate.", "Count the cash the guest gives you out loud in front of them: 'You have given me R200.'", "Place the note on the till ledge, not inside the till, until the transaction is complete.", "Count the change back to the guest out loud: 'Your change is R15. Five, ten, fifteen.'", "Only then place the original note in the till.", "Give the guest a receipt when requested. At many venues this is a standard requirement.", "Never short-change a guest. Never over-change. Both must be reported."]}, {"title": "Common Errors and How to Avoid Them", "type": "highlight", "points": [{"text": "Giving incorrect change is the most common till error. Always count change twice before handing it over."}, {"text": "Mixing denominations in the wrong slot causes counting errors at closing. Keep each denomination in its correct place throughout service."}, {"text": "Accepting counterfeit notes is a risk at busy bars. Know the security features of South African currency. Use a counterfeit detection pen if your venue provides one."}, {"text": "A void transaction that is not approved by a supervisor is a red flag in any audit. Always get supervisor approval for voids and refunds."}]}, {"title": "Card and Digital Payments", "type": "list", "intro": "Card and digital payments are now standard at most South African bars:", "items": ["Never leave a card machine unattended with a guest's card. Process all card transactions in view of the guest.", "Confirm the amount on the machine matches the bill before asking the guest to tap, swipe or insert.", "Wait for approval confirmation before handing back the card and receipt.", "If a card transaction declines, handle it discreetly. Offer alternative payment methods without embarrassing the guest.", "Know your venue's policy on split bills and partial card payments. Complex splits should be authorised by a supervisor.", "Keep a record of card receipts for the shift. These reconcile against the POS report at closing."]}, {"title": "Security at the Bar", "type": "highlight", "points": [{"text": "Never leave the till open between transactions. An open till is an invitation for theft."}, {"text": "Do not count cash in view of guests. Cash counting should happen at the back of the till area, not on the bar top."}, {"text": "If you suspect a colleague is stealing from the till, do not confront them directly. Report to your supervisor immediately."}, {"text": "Your personal belongings should not be stored in or near the till area. Bags must be kept in the staff area."}, {"text": "If the till is short at the end of your shift, report it immediately. Attempting to cover a shortfall with your own money is not the solution and may create additional complications."}]}], "questions": [{"q": "Why should a banknote be placed on the till ledge before giving change?", "opts": ["To prevent the note from being contaminated with moisture from the till", "So the guest can see the denomination they gave and verify the change", "To ensure the correct denomination is recorded in the cash sheet", "South African banking regulations require this process"], "a": 1}, {"q": "What is the correct action if the till is short at the end of your shift?", "opts": ["Make up the shortfall from your own money before the manager counts", "Report the shortfall immediately to your supervisor", "Assume it will balance against another bartender's surplus", "Record the shortfall but do not mention it unless asked"], "a": 1}, {"q": "When must a bartender ring a drink through the POS?", "opts": ["At the end of the round when all drinks have been served", "Before the drink is served, every time, without exception", "When the guest requests a receipt at the end of service", "Only when a card payment is being processed"], "a": 1}, {"q": "What should you do if a card transaction declines?", "opts": ["Ask the guest loudly if they have another card available", "Try the transaction again immediately without informing the guest", "Handle it discreetly and offer alternative payment methods", "Refuse to serve the guest until a valid payment method is provided"], "a": 2}, {"q": "What is the risk of accepting a note without checking it for counterfeiting?", "opts": ["It may result in the venue receiving a penalty from SARS", "The bartender responsible for the shift is liable for counterfeit notes accepted", "Counterfeit notes disrupt the POS system during reconciliation", "South African law requires all notes to be checked before acceptance"], "a": 1}]}, {"id": 11, "title": "Health, Safety and Hygiene at the Bar", "subtitle": "Food safety, personal hygiene, chemical handling, fire safety, reporting hazards and readiness for the workplace", "duration": "20 min", "slides": [{"title": "A Safe Bar Is a Professional Bar", "type": "body", "body": "Health and safety at the bar is not a bureaucratic requirement. It is the foundation of a professional, sustainable working environment. A bar that handles chemicals incorrectly risks injury. A bar that ignores hygiene risks guest illness and potential prosecution. A bar that does not know its fire safety procedures risks lives.\n\nEvery member of the bar team has a responsibility to maintain safety standards and to report hazards. This is not the job of the manager alone. A bartender who notices a spill and walks past it owns part of the responsibility for whoever slips next."}, {"title": "Personal Hygiene Standards at the Bar", "type": "list", "intro": "Personal hygiene at the bar follows the same principles as any food service environment:", "items": ["Wash hands correctly before starting work, after breaks, after handling waste, after touching your face or hair and after any contamination.", "Keep nails short and clean. No nail polish in an environment where drinks are prepared.", "Secure hair at all times. Loose hair near open bottles or garnishes is a hygiene failure.", "Wear clean, pressed uniform every shift. A dirty uniform communicates general carelessness to guests.", "If you are unwell, particularly with a stomach illness or skin infection, do not report for bar work without informing your supervisor.", "Fragrance should be subtle at the bar. Heavy perfume or cologne interferes with wine and spirit aromas, which affects service quality."]}, {"title": "Chemical Handling and Storage at the Bar", "type": "steps", "intro": "Chemicals used for cleaning at the bar are hazardous if handled incorrectly:", "steps": [{"number": "1", "label": "Read the label", "detail": "Every cleaning product has instructions for safe use, correct dilution and appropriate protective equipment. Read it before use."}, {"number": "2", "label": "Store separately from consumables", "detail": "Cleaning chemicals must never be stored near glassware, garnishes, mixers or any food and beverage item."}, {"number": "3", "label": "Use correct dilution", "detail": "Over-concentrated cleaning solutions damage surfaces and leave residue. Under-concentrated solutions do not clean effectively."}, {"number": "4", "label": "Wear PPE when required", "detail": "Gloves are required for most cleaning chemicals. Follow the product label instructions without exception."}, {"number": "5", "label": "Report spills immediately", "detail": "A chemical spill on a bar surface or floor must be cleaned up immediately and reported. Never leave a chemical hazard unattended."}]}, {"title": "Fire Safety and Emergency Procedures", "type": "highlight", "points": [{"text": "Know the location of every fire extinguisher in your working area before your first shift. This is not optional."}, {"text": "Know the fire exits from your bar and from the venue. Know the assembly point. Review the evacuation procedure during your venue induction."}, {"text": "Never prop fire doors open, even briefly. Fire doors exist to contain fire and allow evacuation."}, {"text": "In the event of a fire, the priority is always guest and staff evacuation. Do not attempt to fight a fire unless you are trained and it is safe to do so."}, {"text": "Know the class of fire extinguisher in your bar. Class A (ordinary materials), Class B (flammable liquids) and CO2 extinguishers are most common in bar environments."}]}, {"title": "Reporting Hazards and Incidents", "type": "list", "intro": "Hazard reporting is a professional responsibility, not optional:", "items": ["A spill on the floor must be cleaned immediately and a wet floor sign placed while cleaning is in progress.", "Broken glass, damaged equipment or faulty refrigeration must be reported to a supervisor immediately, not at the end of the shift.", "A near-miss, such as a guest who almost slipped, must be reported and recorded even if no injury occurred.", "An injury to a staff member or guest must be recorded in the incident book. Most venues have a legal requirement to maintain this record.", "Reporting a hazard that causes someone else to be injured before you reported it is always better than not reporting at all."]}, {"title": "You Are Ready", "type": "intro", "body": "You have completed Bar Service 101.\n\nYou now have the professional knowledge to work behind any bar in South Africa's hospitality industry, at restaurants, hotels, events venues and functions, to the standard employers, guests and your own professional reputation require.\n\nThe final assessment covers all eleven modules. You need 60 percent to pass and receive your Certificate of Completion.\n\nThis is where the knowledge begins. The bar is where it becomes skill.\n\nServe with professionalism."}], "questions": [{"q": "When must a bartender wash their hands during a shift?", "opts": ["Only at the start of the shift and before breaks", "Before starting work, after breaks, after handling waste and after any contamination", "Once per hour regardless of activity", "Only when moving between the bar and a food preparation area"], "a": 1}, {"q": "Where must bar cleaning chemicals be stored?", "opts": ["Under the bar where they are accessible during service", "In the same refrigeration unit as garnishes for easy access", "Separately from all consumables: glassware, garnishes and beverages", "In a locked cabinet accessible only to the bar manager"], "a": 2}, {"q": "What should a bartender do first if they notice a spill on the bar floor?", "opts": ["Continue service and address the spill at the end of the round", "Ask a colleague to deal with it to avoid interrupting their own service", "Clean it immediately and place a wet floor sign while cleaning", "Report it to the supervisor and wait for instructions"], "a": 2}, {"q": "In the event of a fire, what is always the first priority?", "opts": ["Saving the venue's stock and equipment", "Calling the fire department before taking any other action", "Guest and staff evacuation", "Using the fire extinguisher to contain the fire immediately"], "a": 2}, {"q": "Why must a near-miss be reported even when no injury occurred?", "opts": ["It is required by the Occupational Health and Safety Act in all cases", "To identify and address the hazard before a similar incident causes injury", "To determine which staff member was responsible for the near-miss", "Near-misses only need to be reported when a guest is involved"], "a": 1}]}];
const FINAL_EXAM = [{"q": "What is the primary role of a bar professional beyond pouring drinks?", "opts": ["Managing stock and ordering supplies for the venue", "Acting as a host, product expert and ambassador for the venue", "Training junior staff and overseeing bar operations", "Setting the beverage pricing and menu strategy"], "a": 1}, {"q": "Why must you always use a jigger when pouring spirits?", "opts": ["It is a South African Liquor Act requirement", "Guests can see the measure being poured and trust the bartender", "Free-pouring is inaccurate and exposes the venue to liability", "It is faster than free-pouring during high-volume service"], "a": 2}, {"q": "What should you do immediately when you find a cracked glass during setup?", "opts": ["Set it aside for non-contact use", "Remove and dispose of it safely", "Report it at the end of the shift", "Polish it and continue using it carefully"], "a": 1}, {"q": "What is the correct serving temperature range for South African lager?", "opts": ["0-2 degrees Celsius", "4-8 degrees Celsius", "10-14 degrees Celsius", "Room temperature"], "a": 1}, {"q": "At what temperature should South African white wine be served?", "opts": ["Room temperature", "Very cold, 0-4 degrees Celsius", "Chilled, 8-12 degrees Celsius", "Slightly cool, 15 degrees Celsius"], "a": 2}, {"q": "What must happen immediately after glass breaks near the ice bin?", "opts": ["Remove visible pieces and continue using ice", "Cover the ice bin and use a different source", "Empty, clean and refill the entire ice bin", "Ask a colleague to check the ice before continuing"], "a": 2}, {"q": "Within how many seconds should a guest approaching the bar be acknowledged?", "opts": ["60 seconds", "30 seconds", "As soon as they are ready to order", "5 minutes in a busy service"], "a": 1}, {"q": "What is the legal drinking age in South Africa?", "opts": ["16 years", "17 years", "18 years", "21 years"], "a": 2}, {"q": "Which spirit is most closely associated with South African bar culture?", "opts": ["Whisky", "Vodka", "Brandy", "Rum"], "a": 2}, {"q": "What is the correct technique for a spirit-forward cocktail such as a Manhattan?", "opts": ["Shake vigorously with ice for 15 seconds", "Stir over ice in a mixing glass for 30 seconds, then strain", "Build directly in the glass without ice", "Blend with crushed ice for a smooth texture"], "a": 1}, {"q": "Why should a note be placed on the till ledge before giving change?", "opts": ["To prevent contamination of the note", "So the guest can see the denomination given and verify the change", "To ensure the correct denomination is recorded", "South African banking regulations require this"], "a": 1}, {"q": "What should you do if the till is short at the end of your shift?", "opts": ["Make up the shortfall from your own money", "Report the shortfall immediately to your supervisor", "Assume it will balance against another bartender's surplus", "Record it but do not mention it unless asked"], "a": 1}, {"q": "Which of the following is a sign of intoxication at the bar?", "opts": ["Ordering a round of drinks for a large group", "Asking for a recommendation from the drink menu", "Slurred speech combined with difficulty maintaining balance", "Requesting a second drink within 30 minutes of the first"], "a": 2}, {"q": "What is the correct approach when refusing service to an intoxicated guest?", "opts": ["Argue the point publicly at the bar", "Speak calmly and respectfully, offer alternatives, notify supervisor", "Ask other guests at the bar to confirm the guest is intoxicated", "Refuse service and ask the guest to leave immediately"], "a": 1}, {"q": "How much red wine should be poured into a wine glass?", "opts": ["Fill to the brim", "Fill to one-third", "Fill to exactly half", "Pour until the guest signals to stop"], "a": 1}, {"q": "When must a drink be rung through the POS?", "opts": ["At the end of the round when all drinks have been served", "Before the drink is served, every time, without exception", "When the guest requests a receipt", "Only when processing a card payment"], "a": 1}, {"q": "Where must bar cleaning chemicals be stored?", "opts": ["Under the bar where they are accessible during service", "In the same refrigeration unit as garnishes", "Separately from all consumables", "In a locked cabinet accessible only to the manager"], "a": 2}, {"q": "What does muddling in a cocktail achieve?", "opts": ["Chills the ingredients before shaking", "Aerates the mixture to create froth", "Crushes ingredients to release their flavour and juice", "Strains out unwanted solids from the finished drink"], "a": 2}, {"q": "What is the head size for a correctly poured South African lager on draught?", "opts": ["No foam at all", "Approximately 10-15mm of foam", "Half foam and half beer", "Foam reaching just below the rim"], "a": 1}, {"q": "What is the first priority in the event of a fire at the bar?", "opts": ["Saving the venue's stock and equipment", "Using the fire extinguisher to contain the fire", "Guest and staff evacuation", "Calling the fire department before any other action"], "a": 2}];
const RESOURCES = [{"id": "resource-pack", "title": "Bar Service 101 Practical Resource Pack", "desc": "Professional bar tools across 7 sections"}];

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
    const remarks=`${profile.firstName} ${profile.lastName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the responsible service standards and guest-facing professional conduct expected of a bar professional across restaurants, hotels and events.`;
    const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of bar service and beverage knowledge expected across the hospitality industry in South Africa and internationally.`;
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
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,color:G,marginBottom:14,fontStyle:"italic"}}>Professional Bar Service Standards</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,color:"#aaa",maxWidth:520,lineHeight:1.9,marginBottom:28}}>The complete professional standard for bar professionals across South Africa's hospitality industry. Eleven modules covering bar setup, glassware, beverages, cocktails, responsible service and the conduct expected of a professional bartender at restaurants, hotels and events.</div>
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
      const remarks=`${fullName} successfully completed ${COURSE_TITLE} with a final assessment score of ${pct}%. Throughout the programme they demonstrated a solid understanding of professional waiting standards, including guest service, table service technique, menu and allergen knowledge, complaint handling and the responsible service standards and guest-facing professional conduct expected of a bar professional across restaurants, hotels and events.`;
      const achievement=`has successfully completed the ${COURSE_TITLE} programme, demonstrating competence in the professional standards of bar service and beverage knowledge expected across the hospitality industry in South Africa and internationally.`;
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
