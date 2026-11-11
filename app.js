const DB_NAME="genesis_examiner_v3", DB_VERSION=1, STORE="records";
let db, papers=[], assessments=[], draftQuestions=[], currentPaperFile=null, answerFiles=[];
const $=id=>document.getElementById(id);
function toast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function dbGet(key){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function dbPut(key,value){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()}
function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function normalize(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean)}
function overlap(a,b){const A=new Set(normalize(a)),B=new Set(normalize(b));if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>{if(B.has(x))n++});return n/(new Set([...A,...B]).size)}
function switchTab(name){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===name));if(name==="reports")renderReports();if(name==="papers")renderPapers()}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
$("newPaperBtn").onclick=()=>{$("paperEditor").classList.remove("hidden");$("paperTitle").focus()};
$("cancelPaperBtn").onclick=()=>{$("paperEditor").classList.add("hidden");draftQuestions=[];renderDraft()};
$("paperFile").onchange=async e=>{currentPaperFile=e.target.files[0]||null;if(currentPaperFile)toast("Question paper file selected for local storage")};
$("addQuestionBtn").onclick=()=>{
 const number=$("qNumber").value.trim(),marks=Number($("qMarks").value),prompt=$("qPrompt").value.trim(),expected=$("qExpected").value.trim();
 if(!number||!prompt||!marks||marks<=0){toast("Enter question number, prompt and positive marks");return}
 const rubric=$("qRubric").value.split("\n").map(line=>{const i=line.lastIndexOf("|");if(i<0)return null;const description=line.slice(0,i).trim(),value=Number(line.slice(i+1).trim());return description&&value>0?{id:uid(),description,marks:value}:null}).filter(Boolean);
 if(rubric.length&&Math.abs(rubric.reduce((a,x)=>a+x.marks,0)-marks)>0.001){toast("Rubric marks should add up to the question maximum");return}
 draftQuestions.push({id:uid(),number,prompt,maximumMarks:marks,expectedAnswer:expected,rubric});
 $("qNumber").value=String(Number(number)+1||draftQuestions.length+1);$("qMarks").value="1";$("qPrompt").value="";$("qExpected").value="";$("qRubric").value="";renderDraft()
};
function renderDraft(){$("draftQuestions").innerHTML=draftQuestions.map((q,i)=>`<div class="question-entry"><strong>Q${escapeHTML(q.number)}</strong> · ${q.maximumMarks} marks<p>${escapeHTML(q.prompt)}</p><button class="ghost" data-remove="${i}">Remove</button></div>`).join("");$("draftQuestions").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{draftQuestions.splice(Number(b.dataset.remove),1);renderDraft()})}
$("savePaperBtn").onclick=async()=>{
 const title=$("paperTitle").value.trim();if(!title||!draftQuestions.length){toast("Enter paper title and add at least one question");return}
 const file=currentPaperFile?{name:currentPaperFile.name,type:currentPaperFile.type,blob:currentPaperFile}:null;
 const paper={id:uid(),title,grade:Number($("paperGrade").value),subject:$("paperSubject").value,questions:draftQuestions,sourceFile:file,created:new Date().toISOString()};
 papers.unshift(paper);await persist();draftQuestions=[];currentPaperFile=null;$("paperTitle").value="";$("paperFile").value="";$("paperEditor").classList.add("hidden");renderAll();toast("Question paper saved on this device")
};
function renderPapers(){
 $("paperList").classList.toggle("empty",papers.length===0);
 $("paperList").innerHTML=papers.length?papers.map(p=>`<div class="item"><div class="item-head"><div><b>${escapeHTML(p.title)}</b><br><small>Class ${p.grade} · ${escapeHTML(p.subject)} · ${p.questions.length} questions</small></div><b>${p.questions.reduce((a,q)=>a+q.maximumMarks,0)} marks</b></div><button class="ghost" data-delete-paper="${p.id}">Delete</button></div>`).join(""):"No question papers created.";
 $("paperList").querySelectorAll("[data-delete-paper]").forEach(b=>b.onclick=async()=>{papers=papers.filter(p=>p.id!==b.dataset.deletePaper);await persist();renderAll()});
 const sel=$("evalPaper");sel.innerHTML=papers.map(p=>`<option value="${p.id}">${escapeHTML(p.title)} · Class ${p.grade}</option>`).join("");
 renderAnswerInputs()
}
$("evalPaper").onchange=renderAnswerInputs;
function renderAnswerInputs(){const p=papers.find(x=>x.id===$("evalPaper").value);$("answerInputs").innerHTML=p?p.questions.map(q=>`<label class="question-entry">Q${escapeHTML(q.number)} · ${q.maximumMarks} marks<small>${escapeHTML(q.prompt)}</small><textarea rows="3" data-answer="${q.id}" placeholder="Type or correct the student's answer for this question"></textarea></label>`).join(""):"<div class='empty'>Create a question paper first.</div>"}
$("answerPhotos").onchange=e=>{answerFiles=[...answerFiles.filter(x=>x.type==="application/pdf"),...Array.from(e.target.files||[])];toast(`${e.target.files.length} photo(s) selected`)};
$("answerPDF").onchange=e=>{if(e.target.files[0]){answerFiles.push(e.target.files[0]);toast("PDF selected for local reference")}};
$("runEvaluationBtn").onclick=async()=>{
 const paper=papers.find(p=>p.id===$("evalPaper").value),name=$("studentName").value.trim(),roll=$("rollNumber").value.trim();
 if(!paper||!name){toast("Select a paper and enter student name");return}
 const answers={};document.querySelectorAll("[data-answer]").forEach(el=>answers[el.dataset.answer]=el.value.trim());
 if(!Object.values(answers).some(Boolean)){toast("Enter or transcribe at least one answer");return}
 const results=paper.questions.map(q=>scoreQuestion(q,answers[q.id]||"",paper.subject));
 const assessment={id:uid(),studentName:name,rollNumber:roll,grade:paper.grade,subject:paper.subject,paperTitle:paper.title,date:new Date().toISOString(),results,files:answerFiles.map(f=>({name:f.name,type:f.type,blob:f}))};
 assessments.unshift(assessment);await persist();answerFiles=[];$("answerPhotos").value="";$("answerPDF").value="";$("studentName").value="";$("rollNumber").value="";toast("Evaluation saved. Review every suggested mark.");switchTab("reports")
};
function scoreQuestion(q,answer,subject){
 let marks=0,matched=[],missing=[],confidence=.12,feedback="";
 if(!answer){feedback="No answer was transcribed. Inspect the original answer sheet.";missing.push("Check whether the student attempted this question.");}
 else if(q.rubric?.length){
   const total=q.rubric.reduce((a,r)=>a+r.marks,0);let earned=0;
   q.rubric.forEach(r=>{const words=normalize(r.description).filter(w=>w.length>2);const ans=new Set(normalize(answer));const hit=words.length&&words.filter(w=>ans.has(w)).length/words.length>=.65;if(hit){earned+=r.marks;matched.push(r.description)}else missing.push(r.description)});
   marks=Math.min(q.maximumMarks,earned*q.maximumMarks/total);confidence=.35+.5*matched.length/q.rubric.length;feedback="Criterion-wise rubric match. Verify that the student demonstrates the concept, not just the keywords.";
 }else if(q.expectedAnswer){
   const sim=overlap(answer,q.expectedAnswer);confidence=.25+sim*.55;
   if(sim>=.82){marks=q.maximumMarks;feedback="High keyword overlap with model answer. Confirm meaning and accuracy."}
   else if(sim>=.3){marks=Math.round(q.maximumMarks*sim*2)/2;feedback="Partial keyword overlap; marks are a provisional suggestion."}
   else{feedback="Low keyword overlap. Could be incorrect, expressed differently or missed by the teacher's transcription.";missing.push("Compare with the model answer and accept valid alternatives where appropriate.")}
 }else{feedback="No model answer or rubric exists. Teacher marking required.";missing.push("Add expected answer or criterion-based rubric.")}
 marks=Math.max(0,Math.min(q.maximumMarks,Math.round(marks*2)/2));
 if(subject==="Mathematics")missing.push("Inspect formula, method, each working step, units and final answer.");
 else missing.push("Inspect scientific meaning, diagrams, labels and accepted equivalent terminology.");
 return {questionID:q.id,number:q.number,marks,max:q.maximumMarks,answer,feedback,matched,missing,confidence,review:true};
}
function totals(a){return {marks:a.results.reduce((s,r)=>s+r.marks,0),max:a.results.reduce((s,r)=>s+r.max,0)}}
function renderReports(){
 const avg=assessments.length?assessments.reduce((s,a)=>s+totals(a).marks/Math.max(1,totals(a).max)*100,0)/assessments.length:0;
 const scores=assessments.map(a=>totals(a).marks/Math.max(1,totals(a).max)*100);
 $("analytics").innerHTML=[["Assessments",assessments.length],["Average",avg.toFixed(1)+"%"],["Highest",Math.max(0,...scores).toFixed(1)+"%"],["Lowest",scores.length?Math.min(...scores).toFixed(1)+"%":"0%"]].map(x=>`<article class="metric"><span>${x[0]}</span><b>${x[1]}</b></article>`).join("");
 const mistakes={};assessments.forEach(a=>a.results.forEach(r=>r.missing.forEach(m=>mistakes[m]=(mistakes[m]||0)+1)));
 const sorted=Object.entries(mistakes).sort((a,b)=>b[1]-a[1]);
 $("commonMistakes").innerHTML=sorted.length?sorted.map(([m,n])=>`<div class="item">${escapeHTML(m)} <b>· ${n}</b></div>`).join(""):"No data yet.";
 $("assessmentList").innerHTML=assessments.length?assessments.map(a=>{const t=totals(a);return `<article class="item"><div class="item-head"><div><b>${escapeHTML(a.studentName)}</b><br><small>Class ${a.grade} · ${escapeHTML(a.subject)} · Roll ${escapeHTML(a.rollNumber||"—")}</small></div><div class="score">${t.marks.toFixed(1)}/${t.max.toFixed(1)}</div></div><p>${(t.marks/Math.max(1,t.max)*100).toFixed(1)}% · ${escapeHTML(a.paperTitle)}</p><div class="actions"><button class="secondary" data-view="${a.id}">Review / edit marks</button><button class="ghost" data-pdf="${a.id}">Print report</button></div><div id="detail-${a.id}" class="hidden"></div></article>`}).join(""):"No reports yet.";
 $("assessmentList").querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>showAssessment(b.dataset.view));
 $("assessmentList").querySelectorAll("[data-pdf]").forEach(b=>b.onclick=()=>printAssessment(b.dataset.pdf));
}
function showAssessment(id){
 const a=assessments.find(x=>x.id===id),host=$("detail-"+id);if(!a)return;
 host.classList.toggle("hidden");if(host.classList.contains("hidden"))return;
 host.innerHTML=a.results.map((r,i)=>`<div class="question-entry"><div class="item-head"><b>Q${escapeHTML(r.number)}</b><span class="tag">Review required</span></div><p>${escapeHTML(r.feedback)}</p><label>Transcribed answer<textarea data-edit-answer="${i}" rows="3">${escapeHTML(r.answer)}</textarea></label><label>Awarded marks<input type="number" min="0" max="${r.max}" step=".5" value="${r.marks}" data-edit-mark="${i}"></label><small>Maximum ${r.max} · Heuristic confidence ${Math.round(r.confidence*100)}%</small><p>Improvement: ${escapeHTML(r.missing.join("; "))}</p></div>`).join("")+`<button class="primary full" data-save-edits="${id}">Save teacher corrections</button>`;
 host.querySelector("[data-save-edits]").onclick=async()=>{a.results.forEach((r,i)=>{const m=Number(host.querySelector(`[data-edit-mark="${i}"]`).value);r.marks=Math.max(0,Math.min(r.max,m||0));r.answer=host.querySelector(`[data-edit-answer="${i}"]`).value});await persist();renderReports();toast("Teacher corrections saved")};
}
function printAssessment(id){
 const a=assessments.find(x=>x.id===id);if(!a)return;const t=totals(a),w=window.open("","_blank");
 if(!w){toast("Allow pop-ups to print report");return}
 w.document.write(`<html><head><title>Genesis Academy Report</title><style>body{font:14px Arial;padding:30px;color:#172334}h1{color:#143f7a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:8px;text-align:left}.small{color:#555;font-size:12px}</style></head><body><h1>GENESIS ACADEMY</h1><h2>CBSE Answer Sheet Report</h2><p>${escapeHTML(a.studentName)} · Class ${a.grade} · ${escapeHTML(a.subject)} · Roll ${escapeHTML(a.rollNumber||"—")}</p><h2>Score: ${t.marks.toFixed(1)} / ${t.max.toFixed(1)} (${(t.marks/Math.max(1,t.max)*100).toFixed(1)}%)</h2><table><tr><th>Question</th><th>Marks</th><th>Feedback</th><th>Corrections</th></tr>${a.results.map(r=>`<tr><td>${escapeHTML(r.number)}</td><td>${r.marks}/${r.max}</td><td>${escapeHTML(r.feedback)}</td><td>${escapeHTML(r.missing.join("; "))}</td></tr>`).join("")}</table><p class="small">AI/rubric suggestions are provisional. Teacher must verify original answer sheets and CBSE marking scheme.</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()
}
async function persist(){await dbPut("papers",papers);await dbPut("assessments",assessments)}
function renderAll(){renderPapers();renderReports();$("paperCount").textContent=papers.length;$("assessmentCount").textContent=assessments.length;$("studentCount").textContent=new Set(assessments.map(a=>a.rollNumber||a.studentName)).size;const avg=assessments.length?assessments.reduce((s,a)=>{const t=totals(a);return s+t.marks/Math.max(1,t.max)*100},0)/assessments.length:0;$("averageScore").textContent=avg.toFixed(1)+"%";$("recentList").classList.toggle("empty",!assessments.length);$("recentList").innerHTML=assessments.slice(0,4).map(a=>{const t=totals(a);return `<div class="item"><b>${escapeHTML(a.studentName)}</b><small> · ${escapeHTML(a.paperTitle)}</small><span style="float:right;font-weight:800">${t.marks}/${t.max}</span></div>`}).join("")||"No evaluations yet. Create a question paper to begin."}
async function init(){db=await openDB();papers=await dbGet("papers")||[];assessments=await dbGet("assessments")||[];renderAll();if("serviceWorker"in navigator){try{await navigator.serviceWorker.register("./sw.js")}catch(e){console.warn("Service worker registration failed",e)}}updateNetwork();window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork)}
function updateNetwork(){$("networkState").textContent=navigator.onLine?"READY · LOCAL DATA":"OFFLINE"}
init().catch(e=>{console.error(e);toast("Could not open local database")});
