import { useState, useEffect } from "react";
const G = "#C9A84C", BK = "#0D0D0D";

function getSupaConfig(){try{return JSON.parse(localStorage.getItem("se_supabase_v1")||"null");}catch{return null;}}

export default function ResetPassword(){
  const[pw,setPw]=useState("");
  const[pw2,setPw2]=useState("");
  const[loading,setLoading]=useState(false);
  const[msg,setMsg]=useState("");
  const[err,setErr]=useState("");
  const[token,setToken]=useState("");

  useEffect(()=>{
    const hash=window.location.hash;
    const params=new URLSearchParams(hash.replace("#",""));
    const t=params.get("access_token");
    if(t){setToken(t);}else{setErr("Invalid or expired reset link. Please request a new one from the login page.");}
  },[]);

  async function handleReset(){
    if(!pw){setErr("Please enter a new password.");return;}
    if(pw.length<6){setErr("Password must be at least 6 characters.");return;}
    if(pw!==pw2){setErr("Passwords do not match.");return;}
    const cfg=getSupaConfig();
    if(!cfg?.url||!cfg?.key){setErr("System not configured. Please contact academy@sinothenievents.co.za.");return;}
    setLoading(true);setErr("");
    try{
      const r=await fetch(`${cfg.url}/auth/v1/user`,{
        method:"PUT",
        headers:{apikey:cfg.key,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({password:pw})
      });
      if(r.ok){setMsg("Password updated successfully. Redirecting to login...");setTimeout(()=>window.location.href="/login",2000);}
      else{setErr("Could not update password. This link may have expired — please request a new one.");}
    }catch{setErr("Something went wrong. Please try again.");}
    finally{setLoading(false);}
  }

  return(
    <div style={{minHeight:"100vh",background:BK,display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{padding:"14px 24px",borderBottom:"1px solid #1a1a1a"}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#fff",letterSpacing:2}}>SINOTHENI EVENTS</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3}}>TRAINING ACADEMY</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{width:"100%",maxWidth:360}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,color:"#fff"}}>Set New Password</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",marginTop:8}}>Enter and confirm your new password below.</div>
          </div>
          <div style={{background:"#111",padding:24,borderRadius:4}}>
            {err&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#e74c3c",marginBottom:14,lineHeight:1.6,padding:"8px 12px",background:"#200a0a",borderRadius:2}}>{err}</div>}
            {msg&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#2d7a45",marginBottom:14,padding:"8px 12px",background:"#0a2010",borderRadius:2}}>{msg}</div>}
            {token&&!msg&&(<>
              <div style={{marginBottom:12}}>
                <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#666",display:"block",marginBottom:4}}>NEW PASSWORD</label>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Minimum 6 characters"
                  style={{width:"100%",padding:"12px 14px",fontFamily:"'Montserrat',sans-serif",fontSize:13,border:"1px solid #222",background:"#1a1a1a",color:"#fff",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#666",display:"block",marginBottom:4}}>CONFIRM PASSWORD</label>
                <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleReset()} placeholder="Confirm new password"
                  style={{width:"100%",padding:"12px 14px",fontFamily:"'Montserrat',sans-serif",fontSize:13,border:"1px solid #222",background:"#1a1a1a",color:"#fff",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <button onClick={handleReset} disabled={loading}
                style={{width:"100%",background:loading?"#444":G,color:BK,border:"none",padding:13,fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>
                {loading?"UPDATING...":"SET NEW PASSWORD"}
              </button>
            </>)}
            {(!token||msg)&&(
              <a href="/login" style={{display:"block",textAlign:"center",padding:12,background:"transparent",color:"#666",border:"1px solid #333",fontFamily:"'Montserrat',sans-serif",fontSize:9,textDecoration:"none",borderRadius:2,marginTop:token?12:0}}>
                BACK TO LOGIN
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
