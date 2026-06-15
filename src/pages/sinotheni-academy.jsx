import { useState } from "react";
const G="#C9A84C",BK="#0D0D0D",CR="#FAF7F2";

const SHORT_COURSES=[
  {id:"waiters101",title:"Waiters 101",price:350,duration:"3 hrs",path:"/waiters101",summary:"Professional table service, food and beverage techniques, complaints handling and delivering excellent guest experiences."},
  {id:"housekeepers101",title:"Housekeepers 101",price:350,duration:"4-5 hrs",path:"/housekeepers101",summary:"Bed making, cleaning standards, guest room preparation and professional housekeeping procedures."},
  {id:"bar101",title:"Bar Service 101",price:750,duration:"5-6 hrs",path:"/barservice101",summary:"Professional bar setup, pouring techniques, glassware, guest service and responsible alcohol service."},
  {id:"barista101",title:"Barista 101",price:750,duration:"5-6 hrs",path:"/barista101",summary:"Espresso technique, milk steaming, coffee drinks, bar hygiene and professional guest interaction."},
  {id:"receptionist101",title:"Hospitality Receptionist 101",price:750,duration:"5-6 hrs",path:"/receptionist101",summary:"Front desk operations, check-in and out procedures, telephone etiquette and guest first impressions."},
  {id:"cse101",title:"Customer Service Excellence",price:900,duration:"3-4 hrs",path:"/cse101",summary:"Service mindset, handling difficult guests, complaint resolution and building lasting guest loyalty."},
  {id:"pcg101",title:"Professional Conduct and Grooming",price:900,duration:"3-4 hrs",path:"/pcg101",summary:"Workplace professionalism, personal presentation standards, communication and workplace ethics."},
];

const SKILLS_PROGRAMMES=[
  {id:"foh101",title:"Front of House Mastery",price:1250,duration:"15-20 hrs",path:"/foh-mastery",summary:"Advanced FOH training covering guest reception, VIP handling, crowd management, conflict resolution and FOH leadership."},
  {id:"erp101",title:"Event Readiness Programme",price:1250,duration:"15-20 hrs",path:"/event-readiness",summary:"Complete preparation for the full lifecycle of a live event, from briefing and setup through logistics, crowd management and post-event administration."},
  {id:"pst101",title:"Practical Service Training",price:1250,duration:"15-20 hrs",path:"/practical-service",summary:"Intensive service training covering table setting, plated and silver service, buffet management, beverages and a full service simulation."},
  {id:"ahm101",title:"Accommodation and Housekeeping Management",price:1500,duration:"15-20 hrs",path:"/accommodation",summary:"Full operational management of accommodation housekeeping including standards, team management, inspection, quality control and leadership."},
  {id:"wep101",title:"Wedding and Event Planning",price:1750,duration:"15-20 hrs",path:"/wedding-planning",summary:"Complete event planning from client consultation and concept through budgeting, supplier management, contracts and business development."},
  {id:"wec101",title:"Wedding and Event Coordination",price:1750,duration:"15-20 hrs",path:"/wedding-coordination",summary:"Day-of execution excellence covering running the programme, managing suppliers, VIP coordination, problem solving and professional close."},
];

const STATS=[
  {value:"300+",label:"Events Delivered"},
  {value:"13",label:"Professional Courses"},
  {value:"100%",label:"Online Access"},
  {value:"SA",label:"Nationwide"},
];

const WHY=[
  {icon:"◈",title:"Real Industry Experience",body:"Our courses are built on 300 live events across South Africa, from corporate functions and government events to weddings and gala dinners. Every module reflects what the industry actually requires."},
  {icon:"◈",title:"South African Context",body:"Designed specifically for the South African hospitality and events industry. Our standards, protocols and client expectations reflect the local market, not a generic international template."},
  {icon:"◈",title:"Certified and Recognised",body:"Every completed course issues a Certificate of Completion from Sinotheni Events Training Academy. Our staffing register draws directly from our pool of certified graduates."},
  {icon:"◈",title:"Practical From Day One",body:"No filler content. Every module covers what you need to perform professionally from your first shift. Short courses take 3 to 6 hours. Skills programmes go deep over 15 to 20 hours of structured learning."},
];

const HOW_IT_WORKS=[
  {step:"01",title:"Browse and Choose",body:"Explore our 13 courses. Each course page shows you the full module list, what you will learn, the price and how long it takes to complete."},
  {step:"02",title:"Email Your Interest",body:"Click Enrol Now on any course. Your email app opens with a pre-written message to academy@sinothenievents.co.za. Just fill in your name and send."},
  {step:"03",title:"Make Payment",body:"We will reply with our banking details. Make your payment and reply with your proof of payment attached. We respond to all enrolment requests within 48 hours."},
  {step:"04",title:"Receive Your Access Code",body:"Once payment is confirmed we email you a unique access code within 48 hours. Enter it at the course page and begin studying immediately on any device."},
];

export default function Academy(){
  const [tab,setTab]=useState("short");
  const isMob=typeof window!=="undefined"&&window.innerWidth<600;

  function CourseCard({course,type}){
    return(
      <div style={{background:"#fff",border:"1px solid #e8e0d0",borderRadius:4,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{background:BK,padding:"14px 18px"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:3,color:G,marginBottom:4}}>{type}</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#fff",lineHeight:1.2}}>{course.title}</div>
        </div>
        <div style={{padding:"14px 18px",flex:1,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",lineHeight:1.7}}>{course.summary}</div>
          <div style={{display:"flex",gap:10,marginTop:"auto"}}>
            <div style={{background:CR,padding:"6px 12px",borderRadius:2}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:2,color:"#aaa"}}>INVESTMENT</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:G}}>R{course.price.toLocaleString()}</div>
            </div>
            <div style={{background:CR,padding:"6px 12px",borderRadius:2}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:2,color:"#aaa"}}>STUDY TIME</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,color:BK}}>{course.duration}</div>
            </div>
          </div>
          <a href={`/course-detail?id=${course.id}`} style={{display:"block",textAlign:"center",padding:"11px 0",background:BK,color:G,textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:800,letterSpacing:2,borderRadius:2}}>
            VIEW COURSE
          </a>
        </div>
      </div>
    );
  }

  return(
    <div style={{background:CR,minHeight:"100vh"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:BK,padding:isMob?"12px 20px":"14px 40px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:20}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?15:20,fontWeight:700,color:"#fff",letterSpacing:2}}>SINOTHENI EVENTS</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3}}>TRAINING ACADEMY</div>
        </div>
        <div style={{display:"flex",gap:isMob?10:14,alignItems:"center"}}>
          <a href="https://sinothenievents.co.za" target="_blank" rel="noopener noreferrer" style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#666",textDecoration:"none"}}>Main Site</a>
          <a href="/admin" style={{padding:"7px 14px",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,textDecoration:"none",borderRadius:2}}>Admin</a>
        </div>
      </div>

      {/* Hero */}
      <div style={{background:BK,padding:isMob?"60px 24px 70px":"90px 80px 100px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"radial-gradient(ellipse at center top, rgba(201,168,76,0.08) 0%, transparent 70%)",pointerEvents:"none"}}/>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:5,color:G,marginBottom:14}}>SINOTHENI EVENTS TRAINING ACADEMY</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?38:64,fontWeight:700,color:"#fff",lineHeight:1.05,marginBottom:20,maxWidth:800,margin:"0 auto 20px"}}>
          Where Hospitality<br/><em style={{color:G}}>Meets Excellence</em>
        </div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:isMob?11:13,color:"#888",maxWidth:560,margin:"0 auto 32px",lineHeight:1.9}}>
          Professional online training for South Africa's hospitality and events industry. Courses built on real event experience, practical, certified and industry-relevant.
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <a href="#courses" style={{padding:"13px 28px",background:G,color:BK,textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,borderRadius:2}}>EXPLORE COURSES</a>
          <a href="#about" style={{padding:"13px 28px",background:"transparent",color:"#fff",border:"1px solid #333",textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,borderRadius:2}}>ABOUT US</a>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{background:"#111",padding:"20px 40px",display:"flex",justifyContent:"center",gap:isMob?24:60,flexWrap:"wrap"}}>
        {STATS.map(s=>(
          <div key={s.label} style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?26:34,fontWeight:700,color:G,lineHeight:1}}>{s.value}</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:3,color:"#555",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* About Section */}
      <div id="about" style={{padding:isMob?"50px 24px":"80px 80px",background:CR}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:10}}>WHO WE ARE</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?32:46,fontWeight:700,color:BK,marginBottom:32,lineHeight:1.1}}>About Sinotheni Events<br/>and the Academy</div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:isMob?32:60}}>
            <div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:BK,marginBottom:12}}>Sinotheni Events</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:2}}>
                Sinotheni Events is a professional event management and staffing company based in Secunda, Mpumalanga, operating across South Africa. Founded in 2021, we have delivered over 300 events across intimate corporate functions, large-scale government events, weddings and gala dinners.
              </div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:2,marginTop:14}}>
                Our clients include blue-chip corporates, government departments and private clients who demand a consistent, professional standard of execution. We bring that same standard to everything we do, including how we train the next generation of hospitality professionals.
              </div>
              <div style={{marginTop:20,padding:"14px 18px",background:"#fff",borderLeft:`3px solid ${G}`,borderRadius:2}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:G,marginBottom:4}}>BASED IN</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK}}>Secunda, Mpumalanga</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginTop:2}}>Operating across South Africa</div>
              </div>
            </div>
            <div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:BK,marginBottom:12}}>The Training Academy</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:2}}>
                The Sinotheni Events Training Academy was created because we saw a consistent gap in the South African hospitality market: talented people without access to practical, industry-aligned training that prepares them for real events.
              </div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#666",lineHeight:2,marginTop:14}}>
                Our 13 courses span short skills boosters and comprehensive skills programmes, all fully online, self-paced and built on the same standards we apply when we deploy staff at live events. Every graduate who passes their assessment receives a certificate and is eligible for our staffing register.
              </div>
              <div style={{marginTop:20,padding:"14px 18px",background:"#fff",borderLeft:`3px solid ${G}`,borderRadius:2}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:G,marginBottom:4}}>CONTACT US</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:BK,fontWeight:600}}>academy@sinothenievents.co.za</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginTop:2}}>083 249-5709</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div style={{background:BK,padding:isMob?"50px 24px":"80px 80px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:10,textAlign:"center"}}>WHY SINOTHENI</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?28:40,fontWeight:700,color:"#fff",marginBottom:40,textAlign:"center"}}>Training Built on Real Experience</div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:20}}>
            {WHY.map(w=>(
              <div key={w.title} style={{background:"#111",border:"1px solid #1a1a1a",borderRadius:4,padding:"22px 24px"}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:G,marginBottom:8}}>{w.icon}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#fff",marginBottom:10}}>{w.title}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#777",lineHeight:1.9}}>{w.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Courses */}
      <div id="courses" style={{padding:isMob?"50px 24px":"80px 80px",background:CR}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:10}}>OUR PROGRAMMES</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?28:42,fontWeight:700,color:BK,marginBottom:8}}>Professional Courses</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#888",marginBottom:32,maxWidth:560,lineHeight:1.9}}>All courses are fully online and self-paced. Pass the final assessment to earn your certificate and join the Sinotheni staffing register.</div>

          <div style={{display:"flex",gap:0,marginBottom:32,borderBottom:`2px solid #e8e0d0`}}>
            {[["short","Short Courses"],["skills","Skills Programmes"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)}
                style={{padding:"12px 24px",background:"transparent",border:"none",borderBottom:tab===id?`2px solid ${G}`:"2px solid transparent",marginBottom:-2,fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:tab===id?700:400,color:tab===id?G:"#aaa",cursor:"pointer",letterSpacing:1}}>
                {label}
              </button>
            ))}
          </div>

          {tab==="short"&&(
            <>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:20,lineHeight:1.8}}>Focused professional skills. 3 to 6 hours of study. Ideal for anyone entering the industry or refreshing a specific skill.</div>
              <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr 1fr",gap:16}}>
                {SHORT_COURSES.map(c=><CourseCard key={c.id} course={c} type="SHORT COURSE"/>)}
              </div>
            </>
          )}

          {tab==="skills"&&(
            <>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:20,lineHeight:1.8}}>11 to 15 module deep-dive programmes for professionals looking to master an area and earn a full Skills Programme certificate.</div>
              <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr 1fr",gap:16}}>
                {SKILLS_PROGRAMMES.map(c=><CourseCard key={c.id} course={c} type="SKILLS PROGRAMME"/>)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div style={{background:BK,padding:isMob?"50px 24px":"80px 80px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:4,color:G,marginBottom:10,textAlign:"center"}}>THE PROCESS</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isMob?28:40,fontWeight:700,color:"#fff",marginBottom:12,textAlign:"center"}}>How It Works</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#555",textAlign:"center",marginBottom:40,maxWidth:500,margin:"0 auto 40px"}}>Getting started is simple. Here is what to expect from the moment you choose a course to the moment you start studying.</div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:20}}>
            {HOW_IT_WORKS.map(h=>(
              <div key={h.step} style={{background:"#111",border:"1px solid #1a1a1a",borderRadius:4,padding:"22px 24px",display:"flex",gap:18}}>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:32,fontWeight:700,color:G,lineHeight:1,minWidth:40}}>{h.step}</div>
                <div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#fff",marginBottom:8}}>{h.title}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#777",lineHeight:1.9}}>{h.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{textAlign:"center",marginTop:32}}>
            <a href="#courses" style={{display:"inline-block",padding:"13px 32px",background:G,color:BK,textDecoration:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,borderRadius:2}}>BROWSE COURSES</a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{background:"#111",padding:isMob?"40px 24px":"50px 80px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr 1fr",gap:32}}>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:"#fff",letterSpacing:2,marginBottom:4}}>SINOTHENI EVENTS</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3,marginBottom:14}}>TRAINING ACADEMY</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",lineHeight:1.9}}>Professional hospitality and events training for South Africa's growing industry.</div>
          </div>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:14}}>CONTACT</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#666",lineHeight:2.2}}>
              academy@sinothenievents.co.za<br/>
              083 249-5709<br/>
              Secunda, Mpumalanga<br/>
              South Africa
            </div>
          </div>
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:14}}>QUICK LINKS</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[["#about","About Us"],["#courses","All Courses"],["https://sinothenievents.co.za","Main Website"]].map(([href,label])=>(
                <a key={label} href={href} style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",textDecoration:"none"}}>{label}</a>
              ))}
            </div>
          </div>
        </div>
        <div style={{borderTop:"1px solid #1a1a1a",marginTop:40,paddingTop:20,textAlign:"center",fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#333"}}>
          {`© ${new Date().getFullYear()} Sinotheni Events Training Academy · Secunda, Mpumalanga · All rights reserved`}
        </div>
      </div>
    </div>
  );
}
