import { useState, useEffect } from "react";

// CHANGE THIS to your own password
const ADMIN_PW = "sinotheni2025";

const CODES_KEY = "se_codes_v1";
const SESSIONS_KEY = "se_sessions_v1";
const BANKING_KEY = "se_banking_v1";
const SUPA_KEY = "se_supabase_v1";

const G = "#C9A84C", BK = "#0D0D0D", CR = "#FAF7F2";
const COURSE_CODES = {
"waiters101": [
"MGRB-G824",
"9UQZ-QVY6",
"2THF-FTBR",
"BW9J-F6ZA",
"QETC-L26X",
"3R5W-CPKB",
"M9J5-WSVH",
"WHJA-YAST",
"YNWL-W97D",
"DJ2N-FJX7",
"4XQ9-BPDV",
"SHJC-K4KS",
"276R-XU3W",
"FSTY-4DZU",
"RMB6-ML8U",
"DV7E-V6VQ",
"T9HU-PZCG",
"LARQ-6ZUE",
"ZEHV-ZKFR",
"52RZ-3W9J",
"6YY6-6469",
"386S-DFHG",
"FKES-TPAJ",
"QQ95-LZV7",
"8CFG-BS9X",
"Y4QV-S5R8",
"W2PK-2EZ3",
"LVEL-LD89",
"TAZ6-6DJB",
"KAZR-P4J3",
"89TV-PAEH",
"ZGYW-UDWR",
"SLQR-ZKP4",
"9KEJ-7G5B",
"NMRB-HKP7",
"XV4Q-V839",
"CTK9-VQPC",
"AEWK-976X",
"FPN6-96LD",
"VQE6-SM84",
"P4S9-KZ6N",
"VPZP-G2BV",
"TNWJ-GVMY",
"2TCJ-RX5M",
"UZSC-VB5G",
"53HK-JBQC",
"6NXM-WUKJ",
"68T7-NXMB",
"RSGQ-YPFP",
"AF2X-VPR7"
],
"housekeepers101": [
"YAMN-VVPP",
"HT8C-Y876",
"G6GK-98AT",
"276E-GZYY",
"E7GZ-AQ33",
"MBBV-79HH",
"5UN6-ALG4",
"XYTR-HRKZ",
"GASB-GULW",
"UYH8-TGTD",
"6N4N-DQ5S",
"SCNM-HSCF",
"84XW-9D4N",
"A3VA-AQTR",
"XLSY-SEFB",
"ETUZ-KFJL",
"AUD2-9WRJ",
"33DQ-LJKT",
"S5RU-SJAU",
"CR8X-T5TS",
"JWAJ-CF4K",
"H9MM-HH4R",
"65NP-PHY7",
"RQE5-VFT9",
"AJZN-YKYX",
"KUUJ-P5NG",
"QU6H-296R",
"7BTU-EE5S",
"FK2H-QTDG",
"3CA5-9YRQ",
"7XWB-2HF5",
"N6JH-QSQF",
"EN7R-SEHG",
"QCEF-S6C8",
"M3GY-UD33",
"H78X-B967",
"TU99-BBWA",
"TSVM-DSMD",
"MFFG-N7C8",
"FXMX-CCGV",
"KKPY-YHVM",
"L7GR-KAUJ",
"KSNC-JV85",
"SXWS-CX7S",
"D36D-VMRC",
"ERGX-EAMX",
"C9YQ-RWKR",
"CHXE-WNML",
"BG5T-34BQ",
"4TWZ-CF5A"
],
"bar101": [
"TBU6-CSTA",
"P44H-M8HD",
"B7QF-KK5N",
"H4KE-5A2P",
"9E7H-XPVT",
"NY2L-KNNJ",
"AQUD-2BN2",
"EN98-F6BD",
"JF2M-QJAM",
"LS7U-ZWD9",
"GQ8H-QD67",
"FHRH-CWRW",
"RTMY-FFK7",
"PGD5-W889",
"8V78-MJRC",
"7FMZ-GEXV",
"GGEF-HZFD",
"DWHE-ZAMD",
"ND77-FX93",
"5YZQ-WBA3",
"KFVC-588H",
"HT37-2XYZ",
"PBQN-P5VK",
"P46R-3VKS",
"QQ4V-AAX2",
"JDJY-LPTB",
"59R4-FVDV",
"5BAJ-2VXN",
"Q3QY-PUR5",
"QYCE-682W",
"HECE-9963",
"WPPK-493R",
"QYP2-H5WS",
"QPBA-U2TG",
"DPSQ-6LLT",
"J7RS-KELH",
"F36J-WMBC",
"ED44-49PF",
"6LDP-AKW3",
"N5N9-5PRP",
"9UL3-XDPZ",
"5TH2-YBWK",
"VJLD-EM23",
"5RE4-T3LH",
"C6SZ-E32Y",
"QTJD-2CLP",
"JVZ6-NZ7V",
"X7KS-H8FL",
"6NGC-ZGLS",
"4NQU-D8UR"
],
"barista101": [
"YZVE-TK6S",
"MBB9-3YVJ",
"3ELP-MB3F",
"Q6R5-UAPK",
"AML7-J9F6",
"SF23-N9CA",
"JN75-NAMC",
"ES2C-2VQS",
"QDSG-U8XP",
"QUUB-SHJC",
"GVPP-X5RX",
"ZZ8S-QBKQ",
"994N-23LW",
"KNGZ-2PLB",
"9Z6J-UDEK",
"HVDF-BA2S",
"GYPT-AQAX",
"8T7Y-HQ59",
"266L-DS34",
"KQP8-XJMR",
"UDFP-FRGM",
"2HQH-MBBW",
"GJGP-MYDK",
"H3GZ-ASQ6",
"EFE9-G5FW",
"YC8R-ZQRB",
"QHNA-JMYS",
"444K-5MVL",
"CUQU-URSR",
"TF2H-2STP",
"7RZ8-4ZQ4",
"9R2X-9LGM",
"QKB3-NM43",
"M8BZ-YA32",
"3ZDA-7Z7C",
"JL3C-ZVUH",
"AQ6M-Y7W7",
"K5K5-6Q4L",
"JKFV-BX5J",
"WVM6-S7XS",
"TZGK-28E2",
"L8WL-B2PH",
"MWSF-N8E3",
"UGFS-2RGC",
"GH7G-DTES",
"CZSY-BM48",
"JFGV-Y3ZN",
"TLR8-7NAK",
"8J8L-E3UG",
"4H3Y-4HJL"
],
"receptionist101": [
"SWVD-YMNU",
"ZSAA-L45K",
"9KLH-2VCT",
"HY6P-9QXR",
"LLHU-HGHU",
"ZJTY-R9XV",
"D6FL-EKNJ",
"4HFD-Y7RH",
"C2ZA-PBJL",
"VLRF-UQQ3",
"9JJ8-SATQ",
"CN9B-F9G8",
"QKH7-MCPY",
"VFX3-CZGS",
"RVML-V7X6",
"KX8G-THXQ",
"P8TF-LKMH",
"AHXC-VRY2",
"2QN3-9B25",
"6CMV-GEQM",
"L8G6-DA3P",
"8G5F-H54R",
"Z64S-DCKQ",
"VBKH-55ZZ",
"UWR6-36GH",
"JARW-E2FJ",
"HMPJ-NH73",
"X779-5FE5",
"XX5D-X6LQ",
"CKF2-KEPG",
"66FF-EFRJ",
"L9LF-MBYW",
"9QHQ-8G9Y",
"4WPZ-H452",
"QHJB-AAPW",
"37AA-U8ZE",
"PP3Y-Y7GN",
"5Q3U-HZSQ",
"RQ7X-JZSK",
"7VK3-4KY6",
"E4HE-BQ58",
"LST2-7YRV",
"64X9-27TC",
"YNCV-NFNE",
"7XYL-UKZW",
"7ANS-RQYV",
"SJGW-G8R9",
"NV27-4V43",
"K9AB-96NZ",
"AXYF-X4ZW"
],
"cse101": [
"QCUQ-QW7Y",
"H2SF-JHXM",
"BJ5K-WF9Z",
"NGXR-T24J",
"6QHD-4FBU",
"S5G9-PYXV",
"QZDN-CQWG",
"JYDA-9JRU",
"LSNS-875H",
"Y76D-GS8Z",
"FDM6-LQV3",
"Y6SF-7G7C",
"FFHZ-JWPF",
"P6ZK-FCCL",
"HWN8-4NVT",
"HXXW-ZN7A",
"HY8E-YH9Y",
"8JSZ-9VN2",
"MFTC-HQK8",
"SWBK-GAVD",
"RDT7-G7X6",
"ECU5-364X",
"W2V6-CNHA",
"W9YQ-WAXW",
"D66Y-CZBJ",
"BM2E-MD5H",
"LQEU-9JAH",
"NERM-BM4S",
"UTCN-7R8K",
"XASP-GAND",
"F9DH-R4G6",
"36LV-GXTE",
"U436-8AVB",
"YXCT-4VZS",
"HAJB-FE9E",
"6T62-M4XB",
"F85M-5T9N",
"KSWQ-KY7C",
"WYDC-EJ5G",
"4WBN-6MWP",
"6T6F-MT9K",
"FQ3U-66DR",
"FEJK-RS84",
"MW8P-WVVR",
"CKWB-WJJK",
"HHSB-9F7M",
"QXYE-FPZA",
"F7JR-HRE2",
"QDV3-KR6Q",
"U9TV-BTS7"
],
"pcg101": [
"BEXC-X9TW",
"3P79-ET8B",
"9BYN-4J7Y",
"MCTM-3PZE",
"6744-3SBN",
"5QW7-QW2G",
"ZJDG-JVL4",
"GZB2-VTBR",
"Q2GE-3JP9",
"ZNT4-7WZP",
"DD78-XJA4",
"4WB2-U6WR",
"N3N4-SEJY",
"RJPT-CQF4",
"X946-6KQ8",
"DUA3-PC7P",
"SC9K-9SUW",
"F9Q6-4M84",
"NVJC-LPMY",
"5RK8-K7HC",
"6ANA-QWBR",
"5VZB-VP7U",
"5555-EC5G",
"6GHA-6CP8",
"8CFP-B5H3",
"YXG3-EKPS",
"7DEZ-N6Z2",
"VWDE-KNC4",
"Z2ZU-XJJL",
"5F38-RECS",
"FLFP-XGD8",
"D365-M879",
"XN6B-GCW4",
"HXPU-4QBL",
"YSGW-LECB",
"D3A9-4XGP",
"655U-QGDV",
"TW2G-TM83",
"55G4-WDX3",
"R2WS-UWG7",
"KGRB-9J3N",
"HVTP-V3TY",
"STT6-J86R",
"GH6P-4H82",
"HTU5-AQMA",
"3Q45-GRQE",
"VTMZ-ZJS8",
"L2ZP-M4KV",
"J2UH-SCKU",
"BCBN-THT9"
],
"foh101": [
"7KYN-B3GR",
"HV9G-YG46",
"N6F5-GM53",
"K5XA-Y8DV",
"ZKFU-YWKY",
"XFE6-DYQQ",
"5BZY-DV8P",
"S657-PWVM",
"H8CL-AWWB",
"2QPH-FCLC",
"GEAT-PKW6",
"ET3H-U5WJ",
"MJX2-K58R",
"CZ7W-6P28",
"A4GM-VHGS",
"GP4U-MQ5F",
"49XM-UEXS",
"UK46-BQLT",
"VT4V-QHR9",
"EWKH-QRC2",
"Q7HJ-HXJB",
"8LXQ-D2G8",
"BYWP-EWFX",
"6Z7E-4CEE",
"HNEN-FSW6",
"VKLH-5ZK7",
"F7MG-F96M",
"NJED-SBGP",
"Q87X-JX8N",
"WYZ3-J3WN",
"PL7B-HK3V",
"DWFM-4K5P",
"4D8Z-V4UZ",
"LUPF-XK9G",
"JBAD-B2ER",
"NF8Z-L5WL",
"67CT-YVEW",
"GK9Z-HAZE",
"72NQ-4U9E",
"6RGM-BCK8",
"S7S4-LU48",
"43P2-8SWW",
"8MHU-Z6EA",
"WPFJ-FFJN",
"PPML-NXRR",
"FTKS-V8WT",
"EF97-GN4B",
"2MQQ-PFAV",
"MT7H-EE8U",
"RBUV-8ZY9"
],
"erp101": [
"KU89-8AK2",
"ZVKB-DS36",
"UTBF-N8Z9",
"EBQ8-4LBK",
"JLLN-BWVM",
"LH2E-RD35",
"ECDP-RVJ3",
"CCJD-YNJA",
"QFAZ-GPH7",
"U5L9-UU6H",
"GFXT-KBXQ",
"PLCY-Q74R",
"LD9G-JEHJ",
"BQ4W-BXA8",
"X5MK-JRR2",
"FQ3U-QCK2",
"LAQR-U8MK",
"HQW2-QUAT",
"GMJT-3V7L",
"BG8J-32A7",
"SSL9-ZHJN",
"AEH2-63ZX",
"G7N3-3774",
"74TJ-BGBK",
"4HSP-Q6KX",
"AMJH-A8NT",
"93KY-M9HP",
"FHFG-QMWJ",
"FGNS-MGPR",
"68J6-3QU9",
"QT74-DV4U",
"UC32-8YY4",
"AAT4-65WD",
"3J75-85MU",
"S8RM-W2CV",
"TNMB-ZRK5",
"VL84-WMJ6",
"E95X-KARM",
"FENF-8SVK",
"7Q8E-HHBY",
"5Y3T-ZTDV",
"BEB5-GLHC",
"ET9C-8SWH",
"2TJ4-CC42",
"63F5-TDCE",
"KR3E-T8SQ",
"DQTL-B77A",
"N2KJ-A8KJ",
"HB7H-3EHD",
"5NDW-BC5A"
],
"pst101": [
"XD87-HXDR",
"7GPK-SVXC",
"9G7B-BQNJ",
"5QJF-YDCB",
"Q6F4-M2VV",
"A64L-9KRF",
"GTYA-PQTZ",
"8HDB-EHTF",
"3SMF-U5ZX",
"CS92-HBX5",
"QRGW-VY4B",
"5LS7-W82W",
"NRW4-Y2X3",
"GZCC-9R33",
"24EX-D94Z",
"MQGG-Q9JE",
"9KD2-957D",
"W8JR-86DE",
"L9WF-3GVE",
"TCEG-3R4N",
"XE7L-F3FG",
"9XVR-3UBM",
"J4D6-JQPK",
"EWN2-LABD",
"WVGU-9ZVV",
"8Y88-66WF",
"J943-RHDA",
"PK73-ZQNF",
"JUH3-9EA7",
"HCG6-D58L",
"WUTU-CRS8",
"SBUM-URX4",
"QZBR-EHS2",
"NK4V-KCCM",
"RXB6-SFJ4",
"LRQV-C3Y7",
"MVY5-3MV7",
"TPDZ-KVP7",
"5K23-ASJ3",
"EGYX-BHT7",
"4VA6-UHYS",
"5QSQ-6KT7",
"MDY2-RA42",
"RTDF-KCU2",
"7WQQ-5HMF",
"ZVGF-YEZ3",
"D6W5-H8BL",
"UFLA-89VR",
"J2VY-W96G",
"YMB8-6LT4"
],
"ahm101": [
"JMZ7-YNP4",
"D2W5-V856",
"4BJL-XEGQ",
"UXQD-77YW",
"BLV8-MDZM",
"VLH4-VXXU",
"8DKZ-SNCG",
"NW6M-DA7W",
"AFUG-QXK9",
"FLZ4-M9AJ",
"GPCT-MBDA",
"RPUX-AXYZ",
"7PWB-FVXH",
"GB2S-33RZ",
"U8BE-ZBC3",
"R5BT-GQBJ",
"KC3X-NNXS",
"2MAK-MDCC",
"JXJB-CHS2",
"7G4A-MXJJ",
"MSP5-KLYJ",
"BXN6-ZPBD",
"CF3P-K64D",
"34KY-4ZAZ",
"TWHS-CM3Z",
"VF3C-NM3J",
"YB9Y-HJWW",
"JT3Y-NJQU",
"BFJS-KAHJ",
"4EBX-253Z",
"M37H-REYY",
"ZQGV-D6MQ",
"DXXX-LMK6",
"RQYT-EEEE",
"WW3M-HVEF",
"52R9-WELN",
"Y52D-3L9T",
"TZQY-XNAK",
"QCBZ-HRLX",
"VH2P-FHAK",
"5GLE-YEXL",
"S8PD-JV4Y",
"KZM3-KP7W",
"UTW4-RR5D",
"PXD4-WRMN",
"CMVH-KUJY",
"MBXS-WZWB",
"SC9R-Z2AN",
"QATG-ADNF",
"TYUF-9DQR"
],
"wep101": [
"CFQ5-DV2Z",
"FLFV-9J3Q",
"A35J-679G",
"8H2C-55JK",
"AAG3-F7EE",
"D3LC-L3WZ",
"KG4P-889R",
"HH55-7TFD",
"NYNP-WKRU",
"Z2TU-6LH3",
"AFNR-F99B",
"SKHG-EMKN",
"WEGS-CMCT",
"Y7S6-G72N",
"ERRA-CRTZ",
"4Y7N-KAE6",
"B2N9-L7A9",
"BDYM-SQ6U",
"JTB5-DTFK",
"WY7B-LF6A",
"TAT4-Z5AR",
"X9CZ-HVQ7",
"J53K-2MUB",
"YB7Y-U3QQ",
"NBFL-EPCE",
"V9WQ-D9JD",
"RMPQ-BU57",
"TCET-FTKL",
"HLFD-P8KM",
"TYMT-LZUQ",
"F5XD-QEY9",
"QMVC-XQBU",
"63N9-TWLC",
"E7F2-CAUH",
"EXKX-3VH8",
"5J3K-SK75",
"KBBH-FM3X",
"JL4Q-8DLE",
"CB8Y-R6EC",
"ECAJ-5MV3",
"3KAT-XET4",
"4U4E-YSDB",
"LJHX-RYN8",
"PUH9-PTLH",
"U2BV-QL3A",
"2KEW-9B6X",
"9REG-FHFS",
"ESMW-PTQZ",
"MPFP-UKVL",
"986V-GPZH"
],
"wec101": [
"ELTJ-4MBX",
"E5AC-K2FC",
"C5VR-FNT3",
"LABV-ECZK",
"ABXM-HUGY",
"D3YE-KAVB",
"SC6A-E9DA",
"EPCT-QX95",
"LW9N-NL53",
"NYBK-4LCA",
"BGBQ-GFQB",
"3QBL-QVLF",
"JS4N-Q52F",
"J6ZY-69GV",
"3KYY-XQAS",
"X3DW-CPAX",
"48PJ-YYPF",
"D8JD-4VEB",
"B46J-AJB9",
"HLGT-9B9J",
"QRS7-JRLS",
"BGYV-U4ZV",
"99X9-SFHK",
"47YB-NRN2",
"4TBJ-KAYN",
"T5TB-PE2F",
"RFF4-LKDV",
"CN6Q-3SG5",
"VSXH-9KE3",
"NCEV-LP3U",
"GENN-TTS9",
"3JQC-9PVX",
"6R57-AANC",
"XCHT-K7UN",
"QP48-YB6F",
"PBVP-2557",
"HLPF-HKF4",
"C3CY-PXCL",
"K53S-PFA7",
"DD5K-TMNF",
"DWX3-M7F8",
"DWLL-VGTY",
"BDXM-9DZB",
"W9EF-LKAG",
"ANST-BTQQ",
"MAML-RP27",
"DNN4-VC5Z",
"3U9M-VY23",
"ACHR-GUUN",
"MU3P-VWLL"
]
};
const BASE = typeof window !== "undefined" ? window.location.origin : "https://sinotheni-academy-dv2f.vercel.app";


async function createStudentAccount(email, code, name, courseId) {
  try {
    const cfg = JSON.parse(localStorage.getItem("se_supabase_v1") || "null");
    if (!cfg?.enabled || !cfg?.url || !cfg?.key) return false;
    const r = await fetch(`${cfg.url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: cfg.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: code, data: { name, course_id: courseId, code } })
    });
    return r.ok || r.status === 422; // 422 = already exists, still ok
  } catch { return false; }
}


async function saveCodeToSupabase(entry) {
  try {
    const res = await fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/access_codes", {
      method: "POST",
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        code: entry.code,
        course_id: entry.courseId,
        student_name: entry.studentName,
        email: entry.email,
        phone: entry.phone || "",
        status: "assigned",
        created_at: new Date().toISOString()
      })
    });
    if(res.ok) console.log("Saved to Supabase:", entry.code);
    else console.log("Supabase save failed:", res.status);
  } catch(e) { console.log("Save error:", e); }
}

const COURSES = [
  { id:"waiters101",       title:"Waiters 101",                              type:"Short Course",    path:"/waiters101",        price:350,  corp:315  },
  { id:"housekeepers101",  title:"Housekeepers 101",                        type:"Short Course",    path:"/housekeepers101",   price:350,  corp:315  },
  { id:"bar101",           title:"Bar Service 101",                          type:"Short Course",    path:"/barservice101",     price:750,  corp:675  },
  { id:"barista101",       title:"Barista 101",                              type:"Short Course",    path:"/barista101",        price:750,  corp:675  },
  { id:"receptionist101",  title:"Hospitality Receptionist 101",             type:"Short Course",    path:"/receptionist101",   price:750,  corp:675  },
  { id:"cse101",           title:"Customer Service Excellence",              type:"Short Course",    path:"/cse101",            price:900,  corp:810  },
  { id:"pcg101",           title:"Professional Conduct and Grooming",        type:"Short Course",    path:"/pcg101",            price:900,  corp:810  },
  { id:"foh101",           title:"Front of House Mastery",                   type:"Skills Programme",path:"/foh-mastery",       price:2850, corp:2565 },
  { id:"erp101",           title:"Event Readiness Programme",                type:"Skills Programme",path:"/event-readiness",   price:2850, corp:2565 },
  { id:"pst101",           title:"Practical Service Training",               type:"Skills Programme",path:"/practical-service",  price:2850, corp:2565 },
  { id:"ahm101",           title:"Accommodation and Housekeeping Management",type:"Skills Programme",path:"/accommodation",     price:2850, corp:2565 },
  { id:"wep101",           title:"Wedding and Event Planning",               type:"Skills Programme",path:"/wedding-planning",  price:2850, corp:2565 },
  { id:"wec101",           title:"Wedding and Event Coordination",           type:"Skills Programme",path:"/wedding-coordination",price:2850,corp:2565},
];

const DEFAULT_BANKING = {
  bank:"",
  accountName:"Sinotheni In Trading (Pty) Ltd",
  accountNo:"",
  branchCode:"",
  accountType:"Cheque Account",
  ref:"Student Full Name and Course Name"
};

function ls(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v!=null?v:d;}catch{return d;}}
function lss(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
const loadCodes=()=>ls(CODES_KEY,[]);
const saveCodes=c=>lss(CODES_KEY,c);
const loadSessions=()=>ls(SESSIONS_KEY,[]);
const saveSessions=s=>lss(SESSIONS_KEY,s);
const loadBanking=()=>ls(BANKING_KEY,DEFAULT_BANKING);
const saveBanking=b=>lss(BANKING_KEY,b);
const loadSupa=()=>ls(SUPA_KEY,{url:"",key:"",enabled:false});
const getHardcodedSupa = () => ({enabled:true,url:"https://xshxikdmulrfyclbhlvu.supabase.co",key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4"});
const saveSupa=s=>lss(SUPA_KEY,s);


const _SECRET = "sne2025xk";
const _CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function _hash(s) { let h = 5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return h; }
function _computeChecksum(r,c) { let h=_hash(c+_SECRET+r),o=""; for(let i=0;i<4;i++){o+=_CHARS[h%_CHARS.length];h=Math.floor(h/_CHARS.length);} return o; }
function genCode(courseId){
  const r=()=>_CHARS[Math.floor(Math.random()*_CHARS.length)];
  const rp=r()+r()+r()+r();
  return rp+"-"+_computeChecksum(rp,courseId);
}

function genSessToken(courseId){
  const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const r=()=>c[Math.floor(Math.random()*c.length)];
  return `GRP-${courseId}-${r()}${r()}${r()}${r()}`;
}

function fmtDate(iso){
  if(!iso)return"";
  try{return new Date(iso).toLocaleDateString("en-ZA",{year:"numeric",month:"short",day:"numeric"});}
  catch{return iso.slice(0,10);}
}

const STATUS_COLOR={pending:"#d4860a",active:"#2d7a45",completed:"#1a6b8a",revoked:"#c0392b",group:"#6b3fa0"};
function StatusBadge({status}){
  const col=STATUS_COLOR[status]||"#888";
  return <span style={{padding:"2px 9px",background:`${col}18`,color:col,fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,fontWeight:700,borderRadius:20,border:`1px solid ${col}30`}}>{status.toUpperCase()}</span>;
}

const Inp=({label,value,onChange,type="text",placeholder=""})=>(
  <div style={{marginBottom:14}}>
    <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>{label}</label>
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",background:"#fff",boxSizing:"border-box"}}/>
  </div>
);

const Sel=({label,value,onChange,options})=>(
  <div style={{marginBottom:14}}>
    <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",background:"#fff",boxSizing:"border-box"}}>
      <option value="">Select a course</option>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ENROLMENTS TAB
function EnrolTab({codes,setCodes,banking}){
  const[search,setSearch]=useState("");
  const[filter,setFilter]=useState("all");

  const filtered=codes.filter(c=>{
    const matchStatus=filter==="all"||c.status===filter;
    const q=search.toLowerCase();
    const matchSearch=!q||c.studentName?.toLowerCase().includes(q)||c.email?.toLowerCase().includes(q)||c.code?.toLowerCase().includes(q)||c.courseName?.toLowerCase().includes(q);
    return matchStatus&&matchSearch;
  });

  function openEmail(entry){
    const course=COURSES.find(c=>c.id===entry.courseId)||{path:""};
    const url=`${BASE}${course.path}`;
    const bk=banking||DEFAULT_BANKING;
    const bankLine=bk.accountNo?`\nBANKING DETAILS:\nBank: ${bk.bank}\nAccount Name: ${bk.accountName}\nAccount Number: ${bk.accountNo}\nBranch Code: ${bk.branchCode}\nAccount Type: ${bk.accountType}\nReference: ${bk.ref}`:"";
    const subj=encodeURIComponent(`Your Access Code: ${entry.courseName}`);
    const body=encodeURIComponent(`Hi ${entry.studentName},

Thank you for enrolling with the Sinotheni Events Training Academy.

YOUR ACCESS CODE: ${entry.code}

HOW TO START YOUR COURSE:
1. Visit: ${url}
2. Enter your access code when prompted
3. Type your full name exactly as you want it on your certificate
4. Begin studying at your own pace

Your code is unique to you. Please do not share it with others.

If you have any questions, reply to this email or contact us on 083 249-5709.

We respond within 48 hours.

Warm regards,
Luyanda Khumalo
Sinotheni Events Training Academy${bankLine}
sinothenievents.co.za`);
    window.open(`mailto:${entry.email}?subject=${subj}&body=${body}`);
  }

  function revoke(code){
    if(!window.confirm(`Revoke code ${code}? This cannot be undone.`))return;
    const updated=codes.map(c=>c.code===code?{...c,status:"revoked"}:c);
    saveCodes(updated);setCodes(updated);
  }

  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email or code..."
          style={{flex:1,minWidth:200,padding:"9px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none"}}/>
        {["all","pending","active","completed","revoked"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:filter===f?700:400,letterSpacing:1.5,cursor:"pointer",border:`1px solid ${filter===f?G:"#ddd"}`,background:filter===f?G:"#fff",color:filter===f?BK:"#555",borderRadius:2}}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:12}}>No enrolments found.</div>}

      {filtered.map((entry,i)=>(
        <div key={i} style={{background:"#fff",border:"1px solid #e8e0d0",borderLeft:`3px solid ${STATUS_COLOR[entry.status]||"#ddd"}`,borderRadius:4,padding:"14px 18px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div style={{flex:1,minWidth:180}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:BK,marginBottom:2}}>{entry.studentName}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:6}}>{entry.email}{entry.phone?` · ${entry.phone}`:""}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:G,fontWeight:600,marginBottom:4}}>{entry.courseName}</div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <code style={{fontFamily:"monospace",fontSize:13,letterSpacing:2,color:BK,background:"#f5f5f5",padding:"3px 8px",borderRadius:3}}>{entry.code}</code>
                <StatusBadge status={entry.status}/>
                {entry.enrolType==="corporate"&&<span style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,color:"#6b3fa0",letterSpacing:1,fontWeight:600}}>CORPORATE</span>}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#aaa",marginBottom:8}}>{fmtDate(entry.createdAt)}</div>
              {entry.status==="completed"&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#2d7a45",marginBottom:8}}>Score: {entry.finalPct}%</div>}
              <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                {entry.status!=="revoked"&&(
                  <button onClick={()=>openEmail(entry)} style={{padding:"5px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,cursor:"pointer",border:`1px solid ${G}`,background:G,color:BK,borderRadius:2}}>EMAIL</button>
                )}
                {entry.status!=="revoked"&&entry.status!=="completed"&&(
                  <button onClick={()=>revoke(entry.code)} style={{padding:"5px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,cursor:"pointer",border:"1px solid #e0d8cc",background:"#fff",color:"#c0392b",borderRadius:2}}>REVOKE</button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// NEW ENROLMENT TAB
function NewTab({codes,setCodes,banking}){
  const[mode,setMode]=useState("individual");
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[phone,setPhone]=useState("");
  const[courseId,setCourseId]=useState("");
  const[delegates,setDelegates]=useState("10");
  const[generated,setGenerated]=useState(null);
  const[batchCodes,setBatchCodes]=useState([]);
  const[err,setErr]=useState("");

  const course=COURSES.find(c=>c.id===courseId)||null;
  const courseOptions=COURSES.map(c=>({value:c.id,label:`${c.title} (${c.type})`}));

  function generate(){
    setErr("");
    if(!courseId){setErr("Please select a course.");return;}
    if(mode==="individual"){
      if(!name||!email){setErr("Name and email are required.");return;}
      const code=genCode(courseId);
      const entry={code,courseId,courseName:course.title,coursePath:course.path,coursePrice:course.price,studentName:name,email,phone,enrolType:"individual",status:"pending",createdAt:new Date().toISOString()};
      const updated=[entry,...codes];saveCodes(updated);setCodes(updated);
      setGenerated(entry);
      createStudentAccount(email, code, name, courseId);
      saveCodeToSupabase(entry);
    } else {
      const n=parseInt(delegates)||10;
      if(n<1){setErr("Enter a valid number of delegates.");return;}
      const entries=Array.from({length:n},(_,i)=>({
        code:genCode(),courseId,courseName:course.title,coursePath:course.path,coursePrice:course.corp,
        studentName:`Delegate ${i+1}`,email:"",phone:"",enrolType:"corporate",status:"pending",createdAt:new Date().toISOString()
      }));
      const updated=[...entries,...codes];saveCodes(updated);setCodes(updated);
      setBatchCodes(entries);
    }
  }

  function buildEmailText(){
    if(!generated)return "";
    const courseUrl=`${BASE}${generated.coursePath}`;
    return `TO: ${generated.email}
SUBJECT: Your Course Access, ${generated.courseName} — Sinotheni Events Training Academy

Hi ${generated.studentName},

Thank you for enrolling with Sinotheni Events Training Academy. We are excited to have you.

Your enrolment for ${generated.courseName} is confirmed.

YOUR ACCESS DETAILS:
Course: ${generated.courseName}
Your Access Code: ${generated.code}

Please keep this email safe. Your access code is your key to the course.

HOW TO ACCESS YOUR COURSE, STEP BY STEP:

Step 1: Open your browser and go to:
${courseUrl}

Step 2: You will see the course page. Click the button that says:
"I HAVE MY ACCESS CODE - START COURSE"

Step 3: Type your access code exactly as it appears above:
${generated.code}
(Copy and paste it to avoid errors. The code is case-sensitive and includes the dash.)

Step 4: Enter your full name and surname exactly as you want them to appear on your certificate.

Step 5: Click "BEGIN MY COURSE" and you are in.

IMPORTANT INFORMATION:
Your progress is saved automatically as you complete each module.
If you need to return to the course later, go back to the same link (Step 1) and enter your code again. You will continue from where you left off.
Your certificate downloads automatically once you pass the final assessment.
We respond to all queries within 48 hours.

PAYMENT DETAILS (if not yet paid):
Bank: FNB
Account Name: Sinotheni In Trading (Pty) Ltd
Account Number: 63017397843
Branch Code: 250655
Reference: Your Full Name and Course Name

If you have any difficulty accessing your course, email us at:
academy@sinothenievents.co.za or call 083 249-5709

Warm regards,
Luyanda Khumalo
Sinotheni Events Training Academy
sinothenievents.co.za`;
  }

  function reset(){setGenerated(null);setBatchCodes([]);setName("");setEmail("");setPhone("");setCourseId("");setErr("");}

  function downloadBatch(){
    const lines=["SINOTHENI EVENTS TRAINING ACADEMY","Corporate Group Access Codes","","Course: "+(course?.title||""),`Date: ${fmtDate(new Date().toISOString())}`,`Per-head rate: R${course?.corp||0} per delegate`,"","-".repeat(50),""];
    batchCodes.forEach((e,i)=>{lines.push(`Delegate ${i+1}: ${e.code}`);});
    lines.push("","Share one code per delegate. Each code is single-use.","sinothenievents.co.za");
    const blob=new Blob([lines.join("\n")],{type:"text/plain"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Codes-${course?.id||"course"}-${Date.now()}.txt`;a.click();
  }

  if(generated){
    return(
      <div style={{maxWidth:500}}>
        <div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:4,padding:"18px 20px",marginBottom:16}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#2d7a45",marginBottom:4}}>CODE GENERATED</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:BK,marginBottom:8}}>{generated.studentName}</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",marginBottom:12}}>{generated.courseName}</div>
          <div style={{background:BK,padding:"14px 18px",textAlign:"center",marginBottom:16}}>
            <code style={{fontFamily:"monospace",fontSize:26,letterSpacing:5,color:G}}>{generated.code}</code>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#555",marginBottom:6}}>EMAIL TO STUDENT, copy and paste into Gmail or Outlook</div>
            <textarea readOnly value={buildEmailText()} style={{width:"100%",height:200,padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:10,border:"1px solid #e0d8cc",borderRadius:2,resize:"none",lineHeight:1.7,boxSizing:"border-box",background:"#fafaf8",color:"#333"}}/>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>{navigator.clipboard.writeText(buildEmailText()).then(()=>alert("Email copied to clipboard. Open Gmail or Outlook and paste it in.")).catch(()=>alert("Could not copy automatically. Please select the text above and copy manually."));}} style={{flex:1,padding:"10px",background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>COPY EMAIL</button>
              <button onClick={reset} style={{flex:1,padding:"10px",background:"#fff",color:BK,border:"1px solid #e0d8cc",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:600,cursor:"pointer",borderRadius:2}}>NEW ENROLMENT</button>
            </div>
          </div>
        </div>
        <div style={{background:CR,borderLeft:`3px solid ${G}`,padding:"10px 14px",borderRadius:2,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#555",lineHeight:1.7}}>
          Course link: <a href={`${BASE}${generated.coursePath}`} target="_blank" rel="noopener noreferrer" style={{color:G}}>{BASE}{generated.coursePath}</a>
        </div>
      </div>
    );
  }

  if(batchCodes.length>0){
    return(
      <div style={{maxWidth:540}}>
        <div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:4,padding:"16px 20px",marginBottom:16}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#2d7a45",marginBottom:4}}>{batchCodes.length} CODES GENERATED</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:BK,marginBottom:4}}>{course?.title}</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",marginBottom:12}}>R{course?.corp} per delegate (corporate rate)</div>
          <div style={{background:CR,border:"1px solid #e8e0d0",borderRadius:2,padding:"12px 16px",marginBottom:14,maxHeight:200,overflowY:"auto"}}>
            {batchCodes.map((e,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f0e8d8",fontFamily:"monospace",fontSize:12,letterSpacing:1}}>
                <span style={{color:"#888",fontSize:10}}>Delegate {i+1}</span>
                <span style={{color:BK,fontWeight:600}}>{e.code}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={downloadBatch} style={{flex:1,padding:"11px",background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>DOWNLOAD CODES</button>
            <button onClick={reset} style={{flex:1,padding:"11px",background:"#fff",color:BK,border:"1px solid #e0d8cc",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:600,cursor:"pointer",borderRadius:2}}>START OVER</button>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{maxWidth:480}}>
      <div style={{display:"inline-flex",gap:0,marginBottom:20,border:"1px solid #e0d8cc",borderRadius:2,overflow:"hidden"}}>
        {[["individual","Individual"],["corporate","Corporate Group"]].map(([v,l])=>(
          <button key={v} onClick={()=>setMode(v)} style={{padding:"9px 20px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,cursor:"pointer",border:"none",background:mode===v?G:"#fff",color:mode===v?BK:"#888"}}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {mode==="individual"&&(
        <>
          <Inp label="STUDENT FULL NAME" value={name} onChange={setName} placeholder="First and last name"/>
          <Inp label="EMAIL ADDRESS" value={email} onChange={setEmail} type="email" placeholder="student@email.com"/>
          <Inp label="PHONE NUMBER" value={phone} onChange={setPhone} placeholder="Optional"/>
        </>
      )}

      {mode==="corporate"&&(
        <div style={{background:CR,border:"1px solid #e8e0d0",borderRadius:4,padding:"14px 16px",marginBottom:14}}>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",lineHeight:1.7}}>
            Corporate training uses a discounted per-head rate. One code is generated per delegate. Enter the number of delegates and download the code list to send to the company.
          </div>
        </div>
      )}

      <Sel label="COURSE" value={courseId} onChange={setCourseId} options={courseOptions}/>

      {course&&mode==="individual"&&(
        <div style={{background:CR,border:"1px solid #e8e0d0",borderLeft:`3px solid ${G}`,borderRadius:2,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555"}}>{course.type}</span>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK}}>R{course.price.toLocaleString()}</span>
        </div>
      )}

      {course&&mode==="corporate"&&(
        <>
          <Inp label="NUMBER OF DELEGATES" value={delegates} onChange={setDelegates} type="number" placeholder="10"/>
          <div style={{background:BK,borderRadius:4,padding:"14px 18px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#aaa"}}>PER DELEGATE (CORPORATE RATE)</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:G}}>R{course.corp.toLocaleString()}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#aaa"}}>TOTAL ({delegates||0} DELEGATES)</span>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:"#fff"}}>R{((parseInt(delegates)||0)*course.corp).toLocaleString()}</span>
            </div>
          </div>
        </>
      )}

      {err&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#c0392b",marginBottom:12,padding:"8px 12px",background:"#fde8e8",borderRadius:2}}>{err}</div>}

      <button onClick={generate} style={{width:"100%",padding:13,background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>
        {mode==="individual"?"GENERATE CODE":"GENERATE CODES FOR ALL DELEGATES"}
      </button>
    </div>
  );
}

// GROUP SESSIONS TAB
function SessionsTab({sessions,setSessions}){
  const[courseId,setCourseId]=useState("");
  const[sessName,setSessName]=useState("");
  const[sessDate,setSessDate]=useState("");
  const[generated,setGenerated]=useState(null);
  const[err,setErr]=useState("");
  const courseOptions=COURSES.map(c=>({value:c.id,label:`${c.title} (${c.type})`}));

  function createSession(){
    setErr("");
    const course=COURSES.find(c=>c.id===courseId);
    if(!course){setErr("Please select a course.");return;}
    if(!sessName){setErr("Please enter a session name.");return;}
    const token=genSessToken(courseId);
    const url=`${BASE}${course.path}?session=${token}&mode=group`;
    const sess={id:token,courseId,courseName:course.title,name:sessName,date:sessDate||new Date().toISOString().slice(0,10),url,token,createdAt:new Date().toISOString()};
    const updated=[sess,...sessions];saveSessions(updated);setSessions(updated);
    setGenerated(sess);
  }

  function reset(){setGenerated(null);setCourseId("");setSessName("");setSessDate("");setErr("");}

  const qrUrl=generated?`https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data=${encodeURIComponent(generated.url)}`:null;

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,flexWrap:"wrap"}}>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:BK,marginBottom:4}}>Create Group Session</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:20,lineHeight:1.7}}>A group session lets a class scan one QR code, enter their name, and go directly to the final assessment without needing individual codes or mini-tests.</div>

        <Sel label="COURSE" value={courseId} onChange={setCourseId} options={courseOptions}/>
        <Inp label="SESSION NAME" value={sessName} onChange={setSessName} placeholder="e.g. Sasol Group June 2026"/>
        <Inp label="DATE" value={sessDate} onChange={setSessDate} type="date"/>

        {err&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#c0392b",marginBottom:12,padding:"8px 12px",background:"#fde8e8",borderRadius:2}}>{err}</div>}

        <button onClick={createSession} style={{width:"100%",padding:12,background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>CREATE SESSION AND GET QR CODE</button>
      </div>

      <div>
        {generated&&(
          <div style={{background:"#fff",border:"1px solid #e8e0d0",borderTop:`3px solid ${G}`,borderRadius:4,padding:"20px"}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:G,marginBottom:4}}>SESSION CREATED</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:BK,marginBottom:2}}>{generated.name}</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:16}}>{generated.courseName} · {generated.date}</div>
            {qrUrl&&<div style={{textAlign:"center",marginBottom:14}}><img src={qrUrl} alt="QR Code" style={{width:180,height:180,border:"6px solid #fff",boxShadow:"0 2px 12px rgba(0,0,0,0.1)"}}/></div>}
            <div style={{background:"#f5f5f5",borderRadius:2,padding:"8px 10px",fontFamily:"monospace",fontSize:10,wordBreak:"break-all",color:"#555",marginBottom:12}}>{generated.url}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{navigator.clipboard?.writeText(generated.url);}} style={{flex:1,padding:"9px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:700,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>COPY LINK</button>
              <button onClick={reset} style={{flex:1,padding:"9px",background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:700,letterSpacing:1.5,cursor:"pointer",borderRadius:2}}>NEW SESSION</button>
            </div>
          </div>
        )}
        {!generated&&sessions.length>0&&(
          <div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",marginBottom:12}}>RECENT SESSIONS</div>
            {sessions.slice(0,5).map((s,i)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e8e0d0",borderRadius:4,padding:"12px 16px",marginBottom:8}}>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:600,color:BK,marginBottom:2}}>{s.name}</div>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:6}}>{s.courseName} · {s.date}</div>
                <button onClick={()=>setGenerated(s)} style={{padding:"5px 12px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,cursor:"pointer",borderRadius:2}}>VIEW QR</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// PRICING TAB
function PricingTab(){
  const short=COURSES.filter(c=>c.type==="Short Course");
  const skills=COURSES.filter(c=>c.type==="Skills Programme");
  const Row=({c})=>(
    <tr>
      <td style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,color:BK,padding:"10px 12px",borderBottom:"1px solid #f0e8d8"}}>{c.title}</td>
      <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:BK,padding:"10px 12px",borderBottom:"1px solid #f0e8d8",textAlign:"right"}}>R{c.price.toLocaleString()}</td>
      <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:G,padding:"10px 12px",borderBottom:"1px solid #f0e8d8",textAlign:"right"}}>R{c.corp.toLocaleString()}</td>
    </tr>
  );
  const THead=()=>(
    <thead><tr style={{background:BK}}>
      <th style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,color:G,padding:"10px 12px",textAlign:"left",fontWeight:600}}>COURSE</th>
      <th style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,color:"#aaa",padding:"10px 12px",textAlign:"right",fontWeight:600}}>INDIVIDUAL</th>
      <th style={{fontFamily:"'Montserrat',sans-serif",fontSize:8,letterSpacing:2,color:G,padding:"10px 12px",textAlign:"right",fontWeight:600}}>CORPORATE PER HEAD</th>
    </tr></thead>
  );
  return(
    <div>
      <div style={{background:CR,border:"1px solid #e8e0d0",borderLeft:`3px solid ${G}`,borderRadius:2,padding:"10px 14px",marginBottom:20,fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555",lineHeight:1.7}}>
        Corporate training is priced per delegate at a 10% group discount. Minimum 10, maximum 25 delegates per booking. Client provides venue. All certificates are digital.
      </div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:10}}>SHORT COURSES</div>
        <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",border:"1px solid #e8e0d0",borderRadius:4,overflow:"hidden"}}><THead/><tbody>{short.map((c,i)=><Row key={i} c={c}/>)}</tbody></table>
      </div>
      <div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:3,color:G,marginBottom:10}}>SKILLS PROGRAMMES</div>
        <table style={{width:"100%",borderCollapse:"collapse",background:"#fff",border:"1px solid #e8e0d0",borderRadius:4,overflow:"hidden"}}><THead/><tbody>{skills.map((c,i)=><Row key={i} c={c}/>)}</tbody></table>
      </div>
    </div>
  );
}

// SETTINGS TAB
function SettingsTab({banking,setBanking,supa,setSupa}){
  const[bk,setBk]=useState(banking||DEFAULT_BANKING);
  const[sp,setSp]=useState(supa||{url:"",key:"",enabled:false});
  const[bkSaved,setBkSaved]=useState(false);
  const[spSaved,setSpSaved]=useState(false);
  const[spTest,setSpTest]=useState("");

  function saveBk(){saveBanking(bk);setBanking(bk);setBkSaved(true);setTimeout(()=>setBkSaved(false),2000);}
  function saveSp(){saveSupa(sp);setSupa(sp);setSpSaved(true);setTimeout(()=>setSpSaved(false),2000);}

  async function testSupa(){
    if(!sp.url||!sp.key){setSpTest("Enter URL and API key first.");return;}
    setSpTest("Testing...");
    try{
      const r=await fetch("https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/student_progress?limit=1",{headers:{apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4"}});
      if(r.ok){setSpTest("Connected. Supabase is working.");}
      else{setSpTest(`Error: ${r.status} - Check your URL and key.`);}
    }catch(e){setSpTest("Could not connect. Check the URL.");}
  }

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,flexWrap:"wrap"}}>
      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:BK,marginBottom:4}}>Banking Details</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:18,lineHeight:1.7}}>These details appear in student emails and on the course access request form. Update them here and they will apply immediately.</div>
        {[
          ["BANK NAME","bank","e.g. FNB"],
          ["ACCOUNT NAME","accountName",""],
          ["ACCOUNT NUMBER","accountNo",""],
          ["BRANCH CODE","branchCode","e.g. 250655"],
          ["ACCOUNT TYPE","accountType","Cheque or Savings"],
          ["PAYMENT REFERENCE","ref","e.g. Full Name and Course Name"],
        ].map(([l,k,p])=>(
          <div key={k} style={{marginBottom:12}}>
            <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>{l}</label>
            <input value={bk[k]||""} onChange={e=>setBk({...bk,[k]:e.target.value})} placeholder={p}
              style={{width:"100%",padding:"9px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        <button onClick={saveBk} style={{width:"100%",padding:11,background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>
          {bkSaved?"SAVED!":"SAVE BANKING DETAILS"}
        </button>
      </div>

      <div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,color:BK,marginBottom:4}}>Code Pool Status</div>
        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginBottom:16,lineHeight:1.7}}>Each course has 50 pre-generated access codes. When you assign a code to a student it is marked as used. Contact Sinotheni support when a course has fewer than 10 remaining.</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {(()=>{
            const used = new Set(JSON.parse(localStorage.getItem("se_used_codes_v1")||"[]"));
            return Object.entries(COURSE_CODES).map(([id,codes])=>{{
              const remaining = codes.filter(c=>!used.has(c)).length;
              const pct = Math.round((remaining/codes.length)*100);
              return(
                <div key={{id}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"#fafaf8",border:"1px solid #e8e0d0",borderRadius:2}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:BK}}>{({"waiters101":"Waiters 101","housekeepers101":"Housekeepers 101","bar101":"Bar Service 101","barista101":"Barista 101","receptionist101":"Hospitality Receptionist 101","cse101":"Customer Service Excellence","pcg101":"Professional Conduct and Grooming","foh101":"Front of House Mastery","erp101":"Event Readiness Programme","pst101":"Practical Service Training","ahm101":"Accommodation and Housekeeping Management","wep101":"Wedding and Event Planning","wec101":"Wedding and Event Coordination"})[id]||id}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:80,height:4,background:"#e8e0d0",borderRadius:2}}>
                      <div style={{width:`${pct}%`,height:"100%",background:remaining>10?"#C9A84C":"#e44",borderRadius:2}}/>
                    </div>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:remaining>10?"#888":"#e44",minWidth:40,textAlign:"right"}}>{remaining} left</div>
                  </div>
                </div>
              );
            }});
          })()}
        </div>
      </div>
    </div>
  );
}

const GROUP_KEY = "se_group_trainings_v1";
const loadGroups = () => { try { const v = JSON.parse(localStorage.getItem(GROUP_KEY)); return v || []; } catch { return []; } };
const saveGroups = g => { try { localStorage.setItem(GROUP_KEY, JSON.stringify(g)); } catch {} };

const COURSE_MODULES = {
  "waiters101":    ["The Role of a Waiter","Professional Appearance","Professional Behaviour","Understanding the Menu","Service Basics: Serving and Clearing","Guest Interaction","Handling Complaints","Teamwork","Common Mistakes to Avoid","Qualities of a Great Waiter","Delivering Excellent Service"],
  "housekeepers101":["Introduction to Professional Housekeeping","Professional Appearance and Conduct","Room Entry Protocol and Guest Privacy","Bed Making and Linen Standards","Bathroom Cleaning and Presentation","Dusting, Vacuuming and Surface Care","Cleaning Chemicals and Equipment Safety","Replenishing Amenities and Room Checks","Health, Hygiene and Workplace Safety","Career Development in Housekeeping"],
  "bar101":        ["Introduction to Professional Bar Service","Bar Setup and Station Management","Glassware, Equipment and Hygiene","Beverages: Beer, Wine and Spirits","Cocktails, Mixers and Non-Alcoholic Drinks","Pour Standards and Measures","Guest Service and Order Management","Responsible Service of Alcohol","Handling Difficult Situations at the Bar","Career Development in Bar Service"],
  "barista101":    ["Introduction to Barista Skills and Coffee Culture","Coffee Beans: Origin, Roast and Flavour","Espresso: Extraction, Pressure and Technique","Milk Steaming and Texturing","Classic Coffee Drinks: Recipes and Standards","Manual Brew Methods","Bar Setup, Equipment and Hygiene","Guest Service, Order Taking and Upselling","Quality Control and Self-Assessment","Career Development in Specialty Coffee"],
  "receptionist101":["Introduction to the Hospitality Receptionist Role","Professional Appearance and Workplace Conduct","Telephone Etiquette and Communication Skills","Guest Reception, Check-In and Check-Out","Reservations, Bookings and Systems Management","Handling Guest Requests, Complaints and Special Needs","Security, Safety and Emergency Procedures","Administrative Duties and Record Keeping","Upselling, Revenue Awareness and Guest Experience","Career Development in Hospitality Reception"],
  "cse101":        ["The Customer Service Mindset","First Impressions and Professional Communication","Understanding Guest Expectations","Active Listening and Empathy","Handling Difficult Guests","Complaint Resolution: The LEAP Framework","Telephone and Digital Communication Standards","Working as a Service Team","Brand Representation and Service Culture","Building a Career in Service Excellence"],
  "pcg101":        ["Why Professional Presentation Matters","Personal Hygiene and Grooming Standards","Hair, Nails and Personal Care","Uniform and Dress Standards","Body Language and Professional Posture","Workplace Communication and Etiquette","Digital Conduct and Social Media Standards","Conduct in Guest-Facing Environments","Maintaining Standards Under Pressure","Building a Professional Reputation"],
  "foh101":        ["Introduction to Front of House Excellence","Professional Appearance and FOH Standards","Guest Reception and First Impressions","Guest Flow, Seating and Crowd Management","VIP and VVIP Handling and Escort Protocol","Five-Star Hospitality and Luxury Service Standards","Event Formality, Protocol and Diplomatic Etiquette","Conflict Resolution: The CALM Framework","Communication and Team Coordination","Event Safety and Emergency Awareness","FOH Leadership and Career Development"],
  "erp101":        ["Introduction to Professional Event Work","Reading an Event Brief and Understanding the Client","Venue Setup and Physical Preparation","Event Logistics and Supplier Coordination","Guest Registration and Arrival Management","Crowd Flow and Access Control","Working with AV, Staging and Technical Teams","Food and Beverage at Events","Emergency and Contingency Protocols","Event Breakdown and Post-Event Administration","Professionalism, Conduct and Career Development"],
  "pst101":        ["Table Setting Masterclass","Linen, Glassware and Cutlery Standards","Plated Service Technique","Silver Service","Drinks Service: Wine, Water and Beverages","Buffet Setup and Management","Service Flow for Large Groups and Banquets","Clearing and Resetting Between Courses","Dietary and Allergen Management in Service","Service Under Pressure: Staying Professional","Full Service Simulation"],
  "ahm101":        ["The Accommodation Sector","The Accommodation Manager's Role","Housekeeping Operations: Standards and Systems","Room Types, Configuration and Inspection Standards","Managing and Leading a Housekeeping Team","Scheduling, Shift Management and Workload Distribution","Linen, Laundry and Stock Management","Cleaning Chemicals, Equipment and Safety","Room Inspection: The Manager's Checklist","Guest Requests, Complaints and Special Requirements","Maintenance Reporting and Facilities Coordination","Turnover Management","Health, Hygiene and Safety Standards","Quality Control, Audits and Continuous Improvement","Leadership, Team Culture and Career Development"],
  "wep101":        ["Introduction to Wedding and Event Planning","Types of Clients: Understanding Who You Are Planning For","Client Relationship Management and Communication","The Initial Consultation: Discovery, Vision and Brief","Budgeting, Pricing and Financial Management","Concept Development and Event Design","Venue Selection and Site Visits","Supplier and Vendor Management","Terms, Conditions and Contracts","Planning Tools: Timelines, Run of Show and Checklists","Legal, Permits and Compliance","Wedding-Specific Planning: Traditions, Protocols and Culture","Corporate and Government Event Planning","Risk Management and Contingency Planning","Building Your Planning Business and Brand"],
  "wec101":        ["The Coordinator's Role: Planning vs Coordination","Understanding the Brief and the Client's Vision","Reviewing the Run of Show and Event Documents","The Day Before: Final Checks and Venue Walkthrough","Team Briefing and Role Assignments","Setup Day: Overseeing the Physical Preparation","Guest Management and Arrival Coordination","Managing Suppliers and Vendors on the Day","Running the Programme: Cues, Timing and Transitions","VIP and Principal Management on the Day","Problem Solving and Managing the Unexpected","Communication and Command During the Event","Closing the Event: Guest Departure and Venue Handover","The Day After: Breakdown, Returns and Post-Event Admin","Debrief, Reporting and Building Client Relationships"],
  "waiters101_extra": []
};

function genGroupCertHTML(delegate, training, course) {
  const date = new Date(training.date).toLocaleDateString("en-ZA", {year:"numeric",month:"long",day:"numeric"});
  const modules = (COURSE_MODULES[course.id]||[]).map((m,i)=>`<span style="font-family:Montserrat,sans-serif;font-size:5.5px;color:#555;background:#fff;border:0.5px solid #e8e0d0;padding:1px 5px;border-radius:2px;">${String(i+1).padStart(2,"0")} ${m}</span>`).join(" ");
  return `<!DOCTYPE html><html><head><style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700;800&display=swap');@page{size:A4 landscape;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}body{width:297mm;height:210mm;background:#FAF7F2;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style></head><body><div style="width:297mm;height:210mm;background:#FAF7F2;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12mm 22mm;"><div style="position:absolute;top:7mm;left:7mm;right:7mm;bottom:7mm;border:2px solid #C9A84C;pointer-events:none;"></div><div style="position:absolute;top:10mm;left:10mm;right:10mm;bottom:10mm;border:0.5px solid rgba(201,168,76,0.25);pointer-events:none;"></div><div style="position:absolute;top:7mm;left:7mm;width:4mm;height:4mm;background:#C9A84C;"></div><div style="position:absolute;top:7mm;right:7mm;width:4mm;height:4mm;background:#C9A84C;"></div><div style="position:absolute;bottom:7mm;left:7mm;width:4mm;height:4mm;background:#C9A84C;"></div><div style="position:absolute;bottom:7mm;right:7mm;width:4mm;height:4mm;background:#C9A84C;"></div><div style="text-align:center;width:100%;position:relative;z-index:2;"><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:5px;color:#C9A84C;margin-bottom:4px;">SINOTHENI EVENTS TRAINING ACADEMY</div><div style="width:32px;height:0.5px;background:#C9A84C;margin:0 auto 7px;"></div><div style="font-family:'Cormorant Garamond',serif;font-size:34px;font-weight:700;color:#0D0D0D;letter-spacing:7px;line-height:1;margin-bottom:2px;">CERTIFICATE</div><div style="font-family:'Cormorant Garamond',serif;font-size:10px;color:#C9A84C;letter-spacing:6px;margin-bottom:2px;">OF COMPLETION</div><div style="font-family:Montserrat,sans-serif;font-size:6px;letter-spacing:3px;color:#aaa;margin-bottom:7px;">GROUP TRAINING PROGRAMME</div><div style="width:32px;height:0.5px;background:rgba(201,168,76,0.25);margin:0 auto 7px;"></div><div style="font-family:Montserrat,sans-serif;font-size:6px;letter-spacing:4px;color:#888;margin-bottom:5px;">THIS IS TO CERTIFY THAT</div><div style="font-family:'Cormorant Garamond',serif;font-size:27px;font-weight:600;color:#C9A84C;border-bottom:0.5px solid rgba(201,168,76,0.35);padding-bottom:3px;display:inline-block;min-width:160px;margin-bottom:5px;line-height:1.2;">${delegate.name}</div><div style="font-family:Montserrat,sans-serif;font-size:6px;letter-spacing:4px;color:#888;margin-bottom:3px;">HAS SUCCESSFULLY COMPLETED</div><div style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;color:#0D0D0D;margin-bottom:2px;">${course.title}</div><div style="font-family:Montserrat,sans-serif;font-size:6px;color:#888;margin-bottom:2px;">as part of the ${training.company} corporate training programme</div><div style="font-family:Montserrat,sans-serif;font-size:6px;color:#aaa;margin-bottom:7px;">Training Date: ${date}</div><div style="background:rgba(201,168,76,0.05);border:0.5px solid rgba(201,168,76,0.18);padding:5px 10px;margin:0 auto 7px;display:inline-block;max-width:240mm;"><div style="font-family:Montserrat,sans-serif;font-size:5.5px;letter-spacing:3px;color:#C9A84C;margin-bottom:3px;text-align:center;">MODULES COMPLETED</div><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:1px 3px;line-height:2;">${modules}</div></div><div style="display:flex;justify-content:center;gap:42mm;"><div style="text-align:center;width:38mm;border-top:0.5px solid rgba(201,168,76,0.45);padding-top:4px;"><div style="font-family:'Cormorant Garamond',serif;font-size:12px;color:#0D0D0D;font-style:italic;">L. Khumalo</div><div style="font-family:Montserrat,sans-serif;font-size:5.5px;letter-spacing:1.5px;color:#888;margin-top:1px;">FOUNDER &amp; DIRECTOR</div></div><div style="text-align:center;width:38mm;border-top:0.5px solid rgba(201,168,76,0.45);padding-top:4px;"><div style="font-family:'Cormorant Garamond',serif;font-size:12px;color:#0D0D0D;">${date}</div><div style="font-family:Montserrat,sans-serif;font-size:5.5px;letter-spacing:1.5px;color:#888;margin-top:1px;">DATE OF TRAINING</div></div></div></div><div style="position:absolute;bottom:4.5mm;left:0;right:0;text-align:center;font-family:Montserrat,sans-serif;font-size:5.5px;letter-spacing:2px;color:#bbb;">sinothenievents.co.za &nbsp;·&nbsp; academy@sinothenievents.co.za &nbsp;·&nbsp; 083 249-5709</div></div></body></html>`;
}

function genGroupResourcesHTML(training, course) {
  const date = new Date(training.date).toLocaleDateString("en-ZA",{year:"numeric",month:"long",day:"numeric"});
  const mods = (COURSE_MODULES[course.id]||[]).map((m,i)=>`<tr style="border-bottom:1px solid #f0e8d8;"><td style="font-family:Montserrat,sans-serif;font-size:9px;color:#aaa;padding:6px 10px;width:28px;">${String(i+1).padStart(2,"0")}</td><td style="font-family:Montserrat,sans-serif;font-size:10px;color:#0D0D0D;padding:6px 10px;">${m}</td><td style="padding:6px 10px;text-align:center;"><span style="font-family:Montserrat,sans-serif;font-size:8px;color:#2d7a45;background:#e8f5ee;padding:2px 7px;border-radius:10px;">COMPLETED</span></td></tr>`).join("");
  return `<!DOCTYPE html><html><head><style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');@page{size:A4 portrait;margin:0;}*{margin:0;padding:0;box-sizing:border-box;}body{width:210mm;min-height:297mm;background:#FAF7F2;-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style></head><body><div style="width:210mm;min-height:297mm;background:#FAF7F2;padding:12mm;"><div style="background:#0D0D0D;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;"><div><div style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:#fff;letter-spacing:3px;">SINOTHENI EVENTS</div><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:4px;color:#C9A84C;margin-top:2px;">TRAINING ACADEMY</div></div><div style="text-align:right;"><div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;color:#fff;">TRAINING RECORD</div><div style="font-family:Montserrat,sans-serif;font-size:7px;color:#888;margin-top:2px;">${date}</div></div></div><div style="height:3px;background:linear-gradient(90deg,#C9A84C,rgba(201,168,76,0.15));margin-bottom:14px;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;"><div style="background:#fff;border:1px solid #e8e0d0;border-top:3px solid #C9A84C;padding:10px 14px;"><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:3px;color:#C9A84C;margin-bottom:4px;">COMPANY</div><div style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#0D0D0D;">${training.company}</div></div><div style="background:#fff;border:1px solid #e8e0d0;border-top:3px solid #C9A84C;padding:10px 14px;"><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:3px;color:#C9A84C;margin-bottom:4px;">PROGRAMME</div><div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:#0D0D0D;">${course.title}</div></div></div><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:3px;color:#C9A84C;margin-bottom:8px;">MODULES COMPLETED</div><table style="width:100%;background:#fff;border:1px solid #e8e0d0;border-radius:2px;margin-bottom:14px;"><thead><tr style="background:#0D0D0D;"><th style="font-family:Montserrat,sans-serif;font-size:7px;letter-spacing:2px;color:#C9A84C;padding:8px 10px;text-align:left;width:28px;">#</th><th style="font-family:Montserrat,sans-serif;font-size:7px;letter-spacing:2px;color:#C9A84C;padding:8px 10px;text-align:left;">MODULE TITLE</th><th style="font-family:Montserrat,sans-serif;font-size:7px;letter-spacing:2px;color:#C9A84C;padding:8px 10px;text-align:center;">STATUS</th></tr></thead><tbody>${mods}</tbody></table><div style="background:#fff;border:1px solid #e8e0d0;border-top:3px solid #C9A84C;padding:12px 14px;margin-bottom:14px;"><div style="font-family:Montserrat,sans-serif;font-size:6.5px;letter-spacing:3px;color:#C9A84C;margin-bottom:8px;">CONTACT US</div><div style="font-family:Montserrat,sans-serif;font-size:9px;color:#555;line-height:2;">For additional training, individual enrolment or course queries:<br/>academy@sinothenievents.co.za &nbsp;·&nbsp; 083 249-5709 &nbsp;·&nbsp; sinothenievents.co.za<br/>Secunda, Mpumalanga &nbsp;·&nbsp; Operating across South Africa</div></div><div style="border-top:2px solid #C9A84C;padding-top:8px;display:flex;justify-content:space-between;"><div style="font-family:Montserrat,sans-serif;font-size:6.5px;color:#888;">Official training record, Sinotheni Events Training Academy</div><div style="font-family:Montserrat,sans-serif;font-size:6.5px;color:#888;">083 249-5709</div></div></div></body></html>`;
}

function GroupTab({groups, setGroups}) {
  const[view, setView] = useState("list");
  const[company, setCompany] = useState("");
  const[contact, setContact] = useState("");
  const[trainingDate, setTrainingDate] = useState("");
  const[courseId, setCourseId] = useState("");
  const[delegates, setDelegates] = useState([{name:"",email:""}]);
  const[saved, setSaved] = useState(false);
  const[err, setErr] = useState("");
  const[expanded, setExpanded] = useState(null);

  const course = COURSES.find(c=>c.id===courseId)||null;
  const courseOpts = COURSES.map(c=>({value:c.id,label:`${c.title} (${c.type})`}));

  function addDelegate(){setDelegates([...delegates,{name:"",email:""}]);}
  function removeDelegate(i){if(delegates.length===1)return;setDelegates(delegates.filter((_,idx)=>idx!==i));}
  function updateDelegate(i,field,val){const d=[...delegates];d[i]={...d[i],[field]:val};setDelegates(d);}

  function saveTraining(){
    setErr("");
    if(!company){setErr("Company name is required.");return;}
    if(!courseId){setErr("Please select a course.");return;}
    if(!trainingDate){setErr("Training date is required.");return;}
    const filledDelegates=delegates.filter(d=>d.name.trim()&&d.email.trim());
    if(filledDelegates.length===0){setErr("Add at least one delegate with name and email.");return;}
    const training={id:Date.now().toString(),company,contact,date:trainingDate,courseId,courseName:course.title,delegates:filledDelegates,createdAt:new Date().toISOString()};
    const updated=[training,...groups];
    saveGroups(updated);setGroups(updated);
    setCompany("");setContact("");setTrainingDate("");setCourseId("");setDelegates([{name:"",email:""}]);
    setSaved(true);setTimeout(()=>setSaved(false),2500);
    setView("list");
  }

  function openCert(delegate, training){
    const c=COURSES.find(x=>x.id===training.courseId);
    const html=genGroupCertHTML(delegate,training,c);
    const w=window.open("","_blank");
    w.document.write(html);w.document.close();
    setTimeout(()=>w.print(),600);
  }

  function openResources(training){
    const c=COURSES.find(x=>x.id===training.courseId);
    const html=genGroupResourcesHTML(training,c);
    const w=window.open("","_blank");
    w.document.write(html);w.document.close();
    setTimeout(()=>w.print(),600);
  }

  function sendDelegate(delegate,training){
    const c=COURSES.find(x=>x.id===training.courseId);
    const date=new Date(training.date).toLocaleDateString("en-ZA",{year:"numeric",month:"long",day:"numeric"});
    const subj=encodeURIComponent(`Your Certificate of Completion, ${c.title}`);
    const body=encodeURIComponent(`Hi ${delegate.name},\n\nThank you for attending the ${c.title} training session facilitated by Sinotheni Events Training Academy.\n\nYour certificate of completion is attached to this email.\n\nWe hope the training was valuable. If you have any questions or would like to explore individual online enrolment for further development, please don't hesitate to reach out.\n\nWarm regards,\nLuyanda Khumalo\nSinotheni Events Training Academy\nacademy@sinothenievents.co.za · 083 249-5709\nsinothenievents.co.za`);
    window.open(`mailto:${delegate.email}?subject=${subj}&body=${body}`);
  }

  function deleteTraining(id){
    if(!window.confirm("Delete this training record?"))return;
    const updated=groups.filter(g=>g.id!==id);
    saveGroups(updated);setGroups(updated);
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:BK,marginBottom:4}}>Group Training</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",lineHeight:1.7}}>Register delegates, generate certificates and send them after the session.</div>
        </div>
        {view==="list"&&<button onClick={()=>setView("new")} style={{padding:"10px 20px",background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>+ NEW TRAINING</button>}
        {view==="new"&&<button onClick={()=>{setView("list");setErr("");}} style={{padding:"10px 20px",background:"#fff",color:BK,border:"1px solid #e0d8cc",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,cursor:"pointer",borderRadius:2}}>CANCEL</button>}
      </div>

      {saved&&<div style={{background:"#e8f5ee",border:"1px solid #2d7a45",borderRadius:4,padding:"10px 14px",marginBottom:16,fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#2d7a45"}}>Training saved. Select a delegate to open their certificate.</div>}

      {view==="new"&&(
        <div style={{maxWidth:560}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>COMPANY NAME *</label>
              <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Sasol Limited" style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>CONTACT PERSON</label>
              <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Training coordinator name" style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",boxSizing:"border-box"}}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div>
              <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>TRAINING DATE *</label>
              <input type="date" value={trainingDate} onChange={e=>setTrainingDate(e.target.value)} style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <label style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",display:"block",marginBottom:4}}>COURSE *</label>
              <select value={courseId} onChange={e=>setCourseId(e.target.value)} style={{width:"100%",padding:"10px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:11,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",boxSizing:"border-box"}}>
                <option value="">Select a course</option>
                {COURSES.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#888",marginBottom:10}}>DELEGATES *</div>
          {delegates.map((d,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginBottom:8,alignItems:"center"}}>
              <input value={d.name} onChange={e=>updateDelegate(i,"name",e.target.value)} placeholder={`Delegate ${i+1} full name`} style={{padding:"9px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none"}}/>
              <input type="email" value={d.email} onChange={e=>updateDelegate(i,"email",e.target.value)} placeholder="Email address" style={{padding:"9px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:12,border:"1px solid #e0d8cc",borderRadius:2,outline:"none"}}/>
              <button onClick={()=>removeDelegate(i)} style={{padding:"9px 12px",background:"#fff",border:"1px solid #e0d8cc",color:"#c0392b",fontFamily:"'Montserrat',sans-serif",fontSize:11,cursor:"pointer",borderRadius:2}}>×</button>
            </div>
          ))}
          <button onClick={addDelegate} style={{padding:"7px 14px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,cursor:"pointer",borderRadius:2,marginBottom:16}}>+ ADD DELEGATE</button>

          {err&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#c0392b",padding:"8px 12px",background:"#fde8e8",borderRadius:2,marginBottom:12}}>{err}</div>}
          <button onClick={saveTraining} style={{width:"100%",padding:12,background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>SAVE TRAINING REGISTRATION</button>
        </div>
      )}

      {view==="list"&&(
        <div>
          {groups.length===0&&<div style={{textAlign:"center",padding:40,color:"#aaa",fontFamily:"'Montserrat',sans-serif",fontSize:12}}>No group trainings registered yet.</div>}
          {groups.map(g=>(
            <div key={g.id} style={{background:"#fff",border:"1px solid #e8e0d0",borderLeft:`3px solid ${G}`,borderRadius:4,marginBottom:10}}>
              <div style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,cursor:"pointer"}} onClick={()=>setExpanded(expanded===g.id?null:g.id)}>
                <div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:BK}}>{g.company}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:G,fontWeight:600,marginTop:2}}>{g.courseName}</div>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#aaa",marginTop:2}}>{new Date(g.date).toLocaleDateString("en-ZA",{year:"numeric",month:"long",day:"numeric"})} · {g.delegates.length} delegate{g.delegates.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={e=>{e.stopPropagation();openResources(g);}} style={{padding:"6px 12px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,cursor:"pointer",borderRadius:2}}>RESOURCES</button>
                  <button onClick={e=>{e.stopPropagation();deleteTraining(g.id);}} style={{padding:"6px 10px",background:"#fff",border:"1px solid #e0d8cc",color:"#c0392b",fontFamily:"'Montserrat',sans-serif",fontSize:9,cursor:"pointer",borderRadius:2}}>DELETE</button>
                  <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa"}}>{expanded===g.id?"▲":"▼"}</span>
                </div>
              </div>

              {expanded===g.id&&(
                <div style={{borderTop:"1px solid #f0e8d8",padding:"14px 18px"}}>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,letterSpacing:2,color:"#aaa",marginBottom:10}}>DELEGATES, click CERTIFICATE to open and print, then SEND to email</div>
                  {g.delegates.map((d,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f0e8",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:600,color:BK}}>{d.name}</div>
                        <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888"}}>{d.email}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>openCert(d,g)} style={{padding:"6px 12px",background:G,color:BK,border:"none",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:700,letterSpacing:1,cursor:"pointer",borderRadius:2}}>CERTIFICATE</button>
                        <button onClick={()=>sendDelegate(d,g)} style={{padding:"6px 12px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,cursor:"pointer",borderRadius:2}}>SEND</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsTab() {
  const [students, setStudents] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    const cfg = JSON.parse(localStorage.getItem("se_supabase_v1") || "null");
    if (!cfg?.enabled || !cfg?.url || !cfg?.key) {
      // Supabase optional for group training
      return;
    }
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${cfg.url}/rest/v1/access_codes?select=*&order=created_at.desc`, {
          headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
        }),
        fetch(`${cfg.url}/rest/v1/student_completions?select=*`, {
          headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` }
        })
      ]);
      const codes = await r1.json();
      const comps = await r2.json();
      if (Array.isArray(codes)) setStudents(codes);
      if (Array.isArray(comps)) setCompletions(comps);
    } catch { setErr("Could not load students. Check your connection."); }
    finally { setLoading(false); }
  }

  function getCompletion(email, courseId) {
    return completions.find(c => c.email === email && c.course_id === courseId) || null;
  }

  function openDoc(html) {
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow popups."); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 1200);
  }

  const filtered = students.filter(s => {
    const matchSearch = !search ||
      s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.courseName?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const statusColour = { pending: "#888", active: "#2d7a45", completed: G, revoked: "#c0392b" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700, color:BK, marginBottom:4 }}>Students</div>
          <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#888" }}>All enrolled students · {students.length} total · {completions.length} completed</div>
        </div>
        <button onClick={loadStudents} style={{ padding:"8px 16px", background:"#fff", border:`1px solid ${G}`, color:G, fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, cursor:"pointer", borderRadius:2 }}>
          REFRESH
        </button>
      </div>

      {err && <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#c0392b", padding:"10px 14px", background:"#fde8e8", borderRadius:4, marginBottom:16 }}>{err}</div>}

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or course..."
          style={{ flex:1, minWidth:200, padding:"8px 12px", fontFamily:"'Montserrat',sans-serif", fontSize:11, border:"1px solid #e0d8cc", borderRadius:2, outline:"none" }}/>
        {["all","pending","active","completed","revoked"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:"7px 14px", background:filter===f?BK:"#fff", color:filter===f?"#fff":"#888", border:`1px solid ${filter===f?BK:"#e0d8cc"}`, fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:600, cursor:"pointer", borderRadius:2, textTransform:"uppercase", letterSpacing:1 }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:"center", padding:40, fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#aaa" }}>Loading students...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:40, fontFamily:"'Montserrat',sans-serif", fontSize:11, color:"#aaa" }}>
          {students.length === 0 ? "No students yet. Generate access codes to enrol students." : "No students match your search."}
        </div>
      )}

      {filtered.map((s, i) => {
        const comp = getCompletion(s.email, s.courseId);
        return (
          <div key={i} style={{ background:"#fff", border:"1px solid #e8e0d0", borderLeft:`3px solid ${statusColour[s.status] || "#e0d8cc"}`, borderRadius:2, marginBottom:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:BK }}>{s.studentName || ", "}</div>
              <div style={{ fontFamily:"'Montserrat',sans-serif", fontSize:10, color:"#888", marginTop:2 }}>{s.email} · {s.courseName}</div>
              <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, letterSpacing:2, color:statusColour[s.status] || "#aaa", textTransform:"uppercase" }}>{s.status}</span>
                {comp && <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"#aaa" }}>Score: {comp.final_pct}% · {new Date(comp.completed_at).toLocaleDateString("en-ZA")}</span>}
                <span style={{ fontFamily:"'Montserrat',sans-serif", fontSize:8, color:"#ccc" }}>{new Date(s.createdAt).toLocaleDateString("en-ZA")}</span>
              </div>
            </div>
            {comp && (
              <div style={{ display:"flex", gap:8 }}>
                {comp.certificate_html && (
                  <button onClick={() => openDoc(comp.certificate_html)}
                    style={{ padding:"6px 12px", background:G, color:BK, border:"none", fontFamily:"'Montserrat',sans-serif", fontSize:9, fontWeight:700, letterSpacing:1, cursor:"pointer", borderRadius:2 }}>
                    CERTIFICATE
                  </button>
                )}
                {comp.transcript_html && (
                  <button onClick={() => openDoc(comp.transcript_html)}
                    style={{ padding:"6px 12px", background:"#fff", color:BK, border:"1px solid #e0d8cc", fontFamily:"'Montserrat',sans-serif", fontSize:9, cursor:"pointer", borderRadius:2 }}>
                    TRANSCRIPT
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StaffingTab(){
  const[apps,setApps]=useState([]);
  const[loading,setLoading]=useState(false);
  const[filter,setFilter]=useState("all");
  const[search,setSearch]=useState("");

  const CATEGORIES={
    waiters:["waiters101"],"bar":["bar101"],"barista":["barista101"],
    housekeepers:["housekeepers101"],receptionist:["receptionist101"],
    cse:["cse101"],pcg:["pcg101"],foh:["foh101"],events:["erp101","wec101","wep101"],
    accommodation:["ahm101"],service:["pst101"]
  };

  const CAT_LABELS={
    all:"All",waiters:"Waiters",bar:"Bar Service",barista:"Barista",
    housekeepers:"Housekeeping",receptionist:"Receptionist",cse:"Customer Service",
    pcg:"Conduct and Grooming",foh:"Front of House",events:"Events",
    accommodation:"Accommodation",service:"Service Training"
  };

  useEffect(()=>{ loadApps(); },[]);

  async function loadApps(){
    setLoading(true);
    try{
      const r=await fetch(`https://xshxikdmulrfyclbhlvu.supabase.co/rest/v1/staffing_applications?select=*&order=submitted_at.desc`,{
        headers:{apikey:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4",Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHhpa2RtdWxyZnljbGJobHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NTQxNTUsImV4cCI6MjA5NTAzMDE1NX0.j2M3r0RCAl5OiotY8mIC5Goz2E6_iO6GVktx5INApZ4"}
      });
      const data=await r.json();
      if(Array.isArray(data))setApps(data);
    }catch(e){console.log(e);}
    finally{setLoading(false);}
  }

  const filtered=apps.filter(a=>{
    const matchCat=filter==="all"||(CATEGORIES[filter]||[]).includes(a.course_id);
    const matchSearch=!search||[a.first_name,a.last_name,a.email,a.city].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()));
    return matchCat&&matchSearch;
  });

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:BK,marginBottom:4}}>Staffing Register</div>
          <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888"}}>{apps.length} registered · {filtered.length} showing</div>
        </div>
        <button onClick={loadApps} style={{padding:"8px 16px",background:"#fff",border:`1px solid ${G}`,color:G,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,cursor:"pointer",borderRadius:2}}>REFRESH</button>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email or city..."
        style={{width:"100%",padding:"9px 12px",fontFamily:"'Montserrat',sans-serif",fontSize:11,border:"1px solid #e0d8cc",borderRadius:2,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>

      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
        {Object.entries(CAT_LABELS).map(([id,label])=>(
          <button key={id} onClick={()=>setFilter(id)}
            style={{padding:"6px 12px",background:filter===id?BK:"#fff",color:filter===id?"#fff":"#888",border:`1px solid ${filter===id?BK:"#e0d8cc"}`,fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,cursor:"pointer",borderRadius:2,letterSpacing:0.5}}>
            {label}
          </button>
        ))}
      </div>

      {loading&&<div style={{textAlign:"center",padding:40,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#aaa"}}>Loading...</div>}

      {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:40,fontFamily:"'Montserrat',sans-serif",fontSize:11,color:"#aaa"}}>No applicants yet.</div>}

      {filtered.map((a,i)=>(
        <div key={i} style={{background:"#fff",border:"1px solid #e8e0d0",borderLeft:`3px solid ${G}`,borderRadius:2,marginBottom:8,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:700,color:BK}}>{a.first_name} {a.last_name}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#888",marginTop:2}}>{a.email} · {a.phone}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:G,marginTop:2,fontWeight:600}}>{a.course_title}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#555"}}>{a.city}{a.province?`, ${a.province}`:""}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa",marginTop:2}}>{a.qualification}</div>
              <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#aaa",marginTop:2}}>{a.availability}</div>
              {a.dob&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#ccc",marginTop:2}}>DOB: {a.dob}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// MAIN EXPORT
export default function AdminApp(){
  const[auth,setAuth]=useState(false);
  const[pw,setPw]=useState("");
  const[pwErr,setPwErr]=useState("");
  const[tab,setTab]=useState("enrolments");
  const[codes,setCodes]=useState([]);
  const[sessions,setSessions]=useState([]);
  const[banking,setBanking]=useState(DEFAULT_BANKING);
  const[supa,setSupa]=useState({url:"",key:"",enabled:false});
  const[groups,setGroups]=useState([]);

  useEffect(()=>{
    setCodes(loadCodes());
    setSessions(loadSessions());
    setBanking(loadBanking());
    setSupa(loadSupa());
    setGroups(loadGroups());
  },[]);

  function login(e){
    if(e?.key&&e.key!=="Enter")return;
    if(pw===ADMIN_PW){setAuth(true);setPwErr("");}
    else{setPwErr("Incorrect password. Please try again.");}
  }

  if(!auth){
    return(
      <div style={{minHeight:"100vh",background:BK,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet"/>
        <div style={{width:"100%",maxWidth:360}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:"#fff",letterSpacing:2,marginBottom:4}}>SINOTHENI EVENTS</div>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:4,marginBottom:20}}>TRAINING ACADEMY</div>
            <div style={{width:32,height:1,background:G,margin:"0 auto 16px",opacity:0.4}}/>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#444",letterSpacing:3}}>ADMIN PANEL</div>
          </div>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={login} placeholder="Enter admin password"
            style={{width:"100%",padding:"13px 14px",fontFamily:"'Montserrat',sans-serif",fontSize:13,border:"1px solid #222",borderRadius:2,background:"#1a1a1a",color:"#fff",outline:"none",marginBottom:pwErr?8:14,boxSizing:"border-box"}}/>
          {pwErr&&<div style={{fontFamily:"'Montserrat',sans-serif",fontSize:10,color:"#e74c3c",marginBottom:12}}>{pwErr}</div>}
          <button onClick={login} style={{width:"100%",background:G,color:BK,border:"none",padding:14,fontFamily:"'Montserrat',sans-serif",fontSize:10,fontWeight:800,letterSpacing:2,cursor:"pointer",borderRadius:2}}>SIGN IN</button>
          <div style={{textAlign:"center",marginTop:20}}><a href="/" style={{fontFamily:"'Montserrat',sans-serif",fontSize:9,color:"#333",textDecoration:"none"}}>Back to academy</a></div>
        </div>
      </div>
    );
  }

  const tabs=[{id:"enrolments",label:"Enrolments"},{id:"new",label:"New Enrolment"},{id:"students",label:"Students"},{id:"staffing",label:"Staffing Register"},{id:"group",label:"Group Training"},{id:"sessions",label:"Sessions"},{id:"pricing",label:"Pricing"},{id:"settings",label:"Settings"}];

  return(
    <div style={{minHeight:"100vh",background:CR}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{background:BK,padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:700,color:"#fff",letterSpacing:2}}>SINOTHENI EVENTS</span>
          <span style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,color:G,letterSpacing:3}}>ADMIN</span>
        </div>
        <button onClick={()=>setAuth(false)} style={{padding:"5px 14px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,cursor:"pointer",border:"1px solid #333",background:"transparent",color:"#aaa",borderRadius:2}}>SIGN OUT</button>
      </div>

      <div style={{background:"#fff",borderBottom:"1px solid #e8e0d0",padding:"8px 20px",display:"flex",gap:20,overflowX:"auto"}}>
        {[["TOTAL",codes.length,"#888"],["ACTIVE",codes.filter(c=>c.status==="active").length,"#2d7a45"],["COMPLETED",codes.filter(c=>c.status==="completed").length,"#1a6b8a"],["PENDING",codes.filter(c=>c.status==="pending").length,"#d4860a"]].map(([k,v,col])=>(
          <div key={k} style={{flexShrink:0}}>
            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:7,letterSpacing:2,color:"#aaa"}}>{k}</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,color:col,lineHeight:1.1}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderBottom:"1px solid #e8e0d0",display:"flex",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"11px 16px",fontFamily:"'Montserrat',sans-serif",fontSize:9,fontWeight:tab===t.id?700:400,letterSpacing:1.5,color:tab===t.id?G:BK,background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?G:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{padding:"20px",maxWidth:900,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        {tab==="enrolments"&&<EnrolTab codes={codes} setCodes={setCodes} banking={banking}/>}
        {tab==="new"&&<NewTab codes={codes} setCodes={setCodes} banking={banking}/>}
        {tab==="students"&&<StudentsTab/>}
        {tab==="staffing"&&<StaffingTab/>}
        {tab==="group"&&<GroupTab groups={groups} setGroups={setGroups}/>}
        {tab==="sessions"&&<SessionsTab sessions={sessions} setSessions={setSessions}/>}
        {tab==="pricing"&&<PricingTab/>}
        {tab==="settings"&&<SettingsTab banking={banking} setBanking={setBanking} supa={supa} setSupa={setSupa}/>}
      </div>
    </div>
  );
}
