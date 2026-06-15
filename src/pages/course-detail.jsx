import { useState, useEffect } from "react";
const G="#C9A84C",BK="#0D0D0D",CR="#FAF7F2";

const COURSES={
  waiters101:{title:"Waiters 101",type:"SHORT COURSE",price:350,duration:"3 hrs",path:"/waiters101",
    about:"A complete professional foundation for anyone working as a waiter at events, venues or in hospitality. This course covers everything from appearance and conduct to service technique, guest interaction, complaints handling and delivering an excellent guest experience.",
    modules:["The Role of a Waiter","Professional Appearance","Professional Behaviour","Understanding the Menu","Service Basics: Serving and Clearing","Guest Interaction","Handling Complaints","Teamwork","Common Mistakes to Avoid","Qualities of a Great Waiter","Delivering Excellent Service"]},
  housekeepers101:{title:"Housekeepers 101",type:"SHORT COURSE",price:350,duration:"4-5 hrs",path:"/housekeepers101",
    about:"Essential professional housekeeping skills for anyone working in accommodation, hotels or guest facilities. Covers cleaning procedures, linen standards, guest privacy, bathroom hygiene and workplace safety.",
    modules:["Introduction to Professional Housekeeping","Professional Appearance and Conduct","Room Entry Protocol and Guest Privacy","Bed Making and Linen Standards","Bathroom Cleaning and Presentation","Dusting, Vacuuming and Surface Care","Cleaning Chemicals and Equipment Safety","Replenishing Amenities and Room Checks","Health, Hygiene and Workplace Safety","Career Development in Housekeeping"]},
  bar101:{title:"Bar Service 101",type:"SHORT COURSE",price:750,duration:"5-6 hrs",path:"/barservice101",
    about:"Professional bar service skills covering everything from bar setup and stock management to pouring techniques, guest service and responsible alcohol service. Designed for anyone working behind a bar at events or in hospitality venues.",
    modules:["Introduction to Professional Bar Service","Bar Setup and Station Management","Glassware, Equipment and Hygiene","Beverages: Beer, Wine and Spirits","Cocktails, Mixers and Non-Alcoholic Drinks","Pour Standards and Measures","Guest Service and Order Management","Responsible Service of Alcohol","Handling Difficult Situations at the Bar","Career Development in Bar Service"]},
  barista101:{title:"Barista 101",type:"SHORT COURSE",price:750,duration:"5-6 hrs",path:"/barista101",
    about:"A comprehensive introduction to specialty coffee and professional barista skills. From espresso extraction and milk steaming to bar hygiene, guest service and quality control.",
    modules:["Introduction to Barista Skills and Coffee Culture","Coffee Beans: Origin, Roast and Flavour","Espresso: Extraction, Pressure and Technique","Milk Steaming and Texturing","Classic Coffee Drinks: Recipes and Standards","Manual Brew Methods","Bar Setup, Equipment and Hygiene","Guest Service, Order Taking and Upselling","Quality Control and Self-Assessment","Career Development in Specialty Coffee"]},
  receptionist101:{title:"Hospitality Receptionist 101",type:"SHORT COURSE",price:750,duration:"5-6 hrs",path:"/receptionist101",
    about:"Everything needed to work professionally at a hospitality reception desk. Covers telephone etiquette, guest check-in and check-out, reservations, handling complaints and building positive first impressions.",
    modules:["Introduction to the Hospitality Receptionist Role","Professional Appearance and Workplace Conduct","Telephone Etiquette and Communication Skills","Guest Reception, Check-In and Check-Out","Reservations, Bookings and Systems Management","Handling Guest Requests, Complaints and Special Needs","Security, Safety and Emergency Procedures","Administrative Duties and Record Keeping","Upselling, Revenue Awareness and Guest Experience","Career Development in Hospitality Reception"]},
  cse101:{title:"Customer Service Excellence",type:"SHORT COURSE",price:900,duration:"3-4 hrs",path:"/cse101",
    about:"A focused programme on the mindset, skills and behaviours that define excellent customer service. Covers active listening, handling difficult guests, complaint resolution and building guest loyalty.",
    modules:["The Customer Service Mindset","First Impressions and Professional Communication","Understanding Guest Expectations","Active Listening and Empathy","Handling Difficult Guests","Complaint Resolution: The LEAP Framework","Telephone and Digital Communication Standards","Working as a Service Team","Brand Representation and Service Culture","Building a Career in Service Excellence"]},
  pcg101:{title:"Professional Conduct and Grooming",type:"SHORT COURSE",price:900,duration:"3-4 hrs",path:"/pcg101",
    about:"Personal presentation, workplace conduct and professional grooming standards for anyone in a guest-facing role. Covers hygiene, uniform standards, body language, communication etiquette and building a professional reputation.",
    modules:["Why Professional Presentation Matters","Personal Hygiene and Grooming Standards","Hair, Nails and Personal Care","Uniform and Dress Standards","Body Language and Professional Posture","Workplace Communication and Etiquette","Digital Conduct and Social Media Standards","Conduct in Guest-Facing Environments","Maintaining Standards Under Pressure","Building a Professional Reputation"]},
  foh101:{title:"Front of House Mastery",type:"SKILLS PROGRAMME",price:1250,duration:"15-20 hrs",path:"/foh-mastery",
    about:"Advanced front-of-house training for professionals working at corporate events, government functions, high-end hospitality venues and formal occasions. Covers the full spectrum of FOH operations from guest reception and VIP management through to conflict resolution and team leadership.",
    modules:["Introduction to Front of House Excellence","Professional Appearance and FOH Standards","Guest Reception and First Impressions","Guest Flow, Seating and Crowd Management","VIP and VVIP Handling and Escort Protocol","Five-Star Hospitality and Luxury Service Standards","Event Formality, Protocol and Diplomatic Etiquette","Conflict Resolution: The CALM Framework","Communication and Team Coordination","Event Safety and Emergency Awareness","FOH Leadership and Career Development"]},
  erp101:{title:"Event Readiness Programme",type:"SKILLS PROGRAMME",price:1250,duration:"15-20 hrs",path:"/event-readiness",
    about:"Complete preparation for working across the full lifecycle of a professional live event. From reading the brief and setting up the venue through registration, crowd management, food and beverage coordination, emergency response and post-event administration.",
    modules:["Introduction to Professional Event Work","Reading an Event Brief and Understanding the Client","Venue Setup and Physical Preparation","Event Logistics and Supplier Coordination","Guest Registration and Arrival Management","Crowd Flow and Access Control","Working with AV, Staging and Technical Teams","Food and Beverage at Events","Emergency and Contingency Protocols","Event Breakdown and Post-Event Administration","Professionalism, Conduct and Career Development"]},
  pst101:{title:"Practical Service Training",type:"SKILLS PROGRAMME",price:1250,duration:"15-20 hrs",path:"/practical-service",
    about:"Intensive practical service training covering the full range of professional food and beverage service techniques. From formal table setting and plated service through to silver service, buffet management, dietary requirements and a complete service simulation.",
    modules:["Table Setting Masterclass","Linen, Glassware and Cutlery Standards","Plated Service Technique","Silver Service","Drinks Service: Wine, Water and Beverages","Buffet Setup and Management","Service Flow for Large Groups and Banquets","Clearing and Resetting Between Courses","Dietary and Allergen Management in Service","Service Under Pressure: Staying Professional","Full Service Simulation"]},
  ahm101:{title:"Accommodation and Housekeeping Management",type:"SKILLS PROGRAMME",price:1500,duration:"15-20 hrs",path:"/accommodation",
    about:"A comprehensive skills programme for professionals managing accommodation housekeeping operations. Covers standards, team leadership, scheduling, stock management, quality control and guest-facing responsibilities at a management level.",
    modules:["The Accommodation Sector","The Accommodation Manager's Role","Housekeeping Operations: Standards and Systems","Room Types, Configuration and Inspection Standards","Managing and Leading a Housekeeping Team","Scheduling, Shift Management and Workload Distribution","Linen, Laundry and Stock Management","Cleaning Chemicals, Equipment and Safety","Room Inspection: The Manager's Checklist","Guest Requests, Complaints and Special Requirements","Maintenance Reporting and Facilities Coordination","Turnover Management","Health, Hygiene and Safety Standards","Quality Control, Audits and Continuous Improvement","Leadership, Team Culture and Career Development"]},
  wep101:{title:"Wedding and Event Planning",type:"SKILLS PROGRAMME",price:1750,duration:"15-20 hrs",path:"/wedding-planning",
    about:"The complete planning programme for professionals building a career in wedding and event planning. Covers client management, concept development, budgeting, supplier relationships, contracts, risk management and business development.",
    modules:["Introduction to Wedding and Event Planning","Types of Clients: Understanding Who You Are Planning For","Client Relationship Management and Communication","The Initial Consultation: Discovery, Vision and Brief","Budgeting, Pricing and Financial Management","Concept Development and Event Design","Venue Selection and Site Visits","Supplier and Vendor Management","Terms, Conditions and Contracts","Planning Tools: Timelines, Run of Show and Checklists","Legal, Permits and Compliance","Wedding-Specific Planning: Traditions, Protocols and Culture","Corporate and Government Event Planning","Risk Management and Contingency Planning","Building Your Planning Business and Brand"]},
  wec101:{title:"Wedding and Event Coordination",type:"SKILLS PROGRAMME",price:1750,duration:"15-20 hrs",path:"/wedding-coordination",
    about:"The complete day-of coordination programme for professionals executing weddings and events. Covers reading the brief, briefing the team, managing suppliers on the day, running the programme, handling the unexpected and closing the event professionally.",
    modules:["The Coordinator's Role: Planning vs Coordination","Understanding the Brief and the Client's Vision","Reviewing the Run of Show and Event Documents","The Day Before: Final Checks and Venue Walkthrough","Team Briefing and Role Assignments","Setup Day: Overseeing the Physical Preparation","Guest Management and Arrival Coordination","Managing Suppliers and Vendors on the Day","Running the Programme: Cues, Timing and Transitions","VIP and Principal Management on the Day","Problem Solving and Managing the Unexpected","Communication and Command During the Event","Closing the Event: Guest Departure and Venue Handover","The Day After: Breakdown, Returns and Post-Event Admin","Debrief, Reporting and Building Client Relationships"]},
};

export default function CourseDetail(){
  const[course,setCourse]=useState(null);
  const[showCode,setShowCode]=useState(false);
  const isMob=typeof window!=="undefined"&&window.innerWidth<600;

  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get("id");
    if(id&&COURSES[id])setCourse({id,...COURSES[id]});
    else window.location.href="/";
  },[]);

  if(!course)return null;

  const bk=()=>{try{return JSON.parse(localStorage.getItem("se_banking_v1")||"null");}catch{return null;}};
  const b=bk();
  const bankStr=b?`\n\nBANKING DETAILS:\nBank: ${b.bank}\nAccount Name: ${b.account}\nAccount Number: ${b.accountNo}\nReference: ${course.title}`:`\n\nPlease reply and we will send you our banking details.`;
  const subj=encodeURIComponent(`Enrolment: ${course.title}`);
  const body=encodeURIComponent(`Hi Sinotheni Events Team,\n\nI would like to enrol for:\n\nCourse: ${course.title}\nCourse Type: ${course.type}\nPrice: R${course.price.toLocaleString()}${bankStr}\n\nMy Details:\nFull Name:\nPhone:\nEmail: (this address)\n\nI will attach proof of payment once payment is made.\n\nKind regards,`);

  return(
    <div style={{minHeight:"100vh",background:CR}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:BK,padding:isMob?"12px 20px":"14px 40px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <a href="/" style={{textDecoration:"none"}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?15:18,fontWeight:700,color:"#fff",letterSpacing:2}}>SINOTHENI EVENTS</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3}}>TRAINING ACADEMY</div>
        </a>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <a href="/" style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#666",textDecoration:"none"}}>All Courses</a>
        </div>
      </div>

      {/* Hero */}
      <div style={{background:BK,padding:isMob?"40px 24px 50px":"60px 80px 70px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:10}}>{course.type}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?34:52,fontWeight:700,color:"#fff",lineHeight:1.1,marginBottom:16}}>{course.title}</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:20}}>
            {[["INVESTMENT",`R${course.price.toLocaleString()}`],["MODULES",`${course.modules.length}`],["STUDY TIME",course.duration],["PASS MARK","60%"],["CERTIFICATE","Included"]].map(([label,val])=>(
              <div key={label} style={{background:"#111",border:"1px solid #1a1a1a",padding:"8px 14px",borderRadius:2}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:3,color:"#555",marginBottom:3}}>{label}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:label==="INVESTMENT"?G:"#fff"}}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:isMob?11:12,color:"#888",lineHeight:1.9,maxWidth:620}}>{course.about}</div>
        </div>
      </div>

      <div style={{maxWidth:800,margin:"0 auto",padding:isMob?"32px 24px":"50px 80px"}}>

        {/* Module list */}
        <div style={{marginBottom:40}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:16}}>WHAT YOU WILL LEARN</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {course.modules.map((m,i)=>(
              <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",padding:"12px 16px",background:"#fff",border:"1px solid #e8e0d0",borderRadius:2}}>
                <div style={{minWidth:24,height:24,borderRadius:"50%",background:BK,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:G,fontWeight:700,flexShrink:0,marginTop:1}}>{i+1}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#555",lineHeight:1.6,paddingTop:3}}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{background:"#fff",border:"1px solid #e8e0d0",borderRadius:4,padding:"24px",marginBottom:32}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#aaa",marginBottom:16}}>HOW TO ENROL</div>
          {[
            ["01","Email Us","Click Enrol Now below. Your email app will open with a pre-written message. Fill in your name and send it to us."],
            ["02","Make Payment","We will confirm your enrolment and send banking details. Make your payment and send us proof of payment."],
            ["03","Receive Your Code","Once payment is confirmed we will email your unique access code within 48 hours."],
            ["04","Start Studying","Click the course link in your email, enter your access code when prompted, and begin studying immediately on any device."],
          ].map(([step,title,desc])=>(
            <div key={step} style={{display:"flex",gap:14,marginBottom:16,paddingBottom:16,borderBottom:"1px solid #f5f0e8"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:G,minWidth:32,lineHeight:1}}>{step}</div>
              <div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,color:BK,marginBottom:4}}>{title}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",lineHeight:1.8}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <a href={`mailto:academy@sinothenievents.co.za?subject=${subj}&body=${body}`}
            style={{display:"block",textAlign:"center",padding:15,background:G,color:BK,textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,borderRadius:2}}>
            ENROL NOW
          </a>
          {!showCode?(
            <button onClick={()=>setShowCode(true)}
              style={{width:"100%",padding:13,background:"transparent",border:`1px solid #e0d8cc`,color:"#888",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>
              I HAVE MY ACCESS CODE - START COURSE
            </button>
          ):(
            <a href={course.path}
              style={{display:"block",textAlign:"center",padding:13,background:BK,color:"#fff",textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,borderRadius:2}}>
              START MY COURSE
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
