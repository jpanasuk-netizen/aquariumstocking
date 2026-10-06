(function(){
var specEl=document.getElementById("share-spec");
if(!specEl||!document.getElementById("akGallons"))return;
var M=JSON.parse(specEl.textContent);
function $(i){return document.getElementById(i)}
function v(i){return $(i).value}
function put(i,raw,isSel){
if(raw==null||raw==="")return false;var n=$(i);if(!n)return false;
if(isSel){for(var k=0;k<n.options.length;k++)if(n.options[k].value===raw){n.value=raw;return true}return false}
if(!/^\d+(\.\d+)?$/.test(raw))return false;var x=+raw;
if(n.min!==""&&x<+n.min)return false;if(n.max!==""&&x>+n.max)return false;n.value=raw;return true}
var orig={};
function query(kind){var p=new URLSearchParams();p.set("tab",kind);M[kind].keys.forEach(function(f){var x=v(f[1]);p.set(f[0],x===""&&!f[2]?"0":x)});history.replaceState(null,"",location.pathname+"?"+p)}
function line(kind){var s="",a=M[kind].line;for(var i=0;i<a.length;i++){var p=a[i];s+=p.charAt(0)==="@"?(v(p.slice(1))||"0"):p}return s}
function finish(kind){
var box=$(M[kind].box);if(!box||box.hidden)return;query(kind);box.setAttribute("data-share-kind",kind);
var row=document.createElement("p");row.className="share-actions";
row.innerHTML='<button type="button" class="copy-link">Copy link to this result</button> <button type="button" class="copy-text">Copy as text</button> <span class="small share-note" aria-live="polite"></span>';
box.appendChild(row)}
function run(kind){if(!(+v(M[kind].need)>0)){orig[kind]();return}orig[kind]();finish(kind)}
Object.keys(M).forEach(function(k){orig[k]=window[M[k].fn];window[M[k].fn]=function(){run(k)}});
function copy(text,note){
function ok(){note.textContent="Copied"}
function fb(){var t=document.createElement("textarea");t.value=text;t.style.cssText="position:fixed;left:-9999px";document.body.appendChild(t);t.focus();t.select();try{document.execCommand("copy");ok()}catch(e){note.textContent="Copy failed."}t.remove()}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(ok,fb);else fb()}
document.addEventListener("click",function(e){
var b=e.target.closest&&e.target.closest("button");if(!b)return;var box=b.closest(".ans");if(!box)return;var note=box.querySelector(".share-note");if(!note)return;
if(b.classList.contains("copy-link"))copy(location.href,note);
if(!b.classList.contains("copy-text"))return;var k=box.getAttribute("data-share-kind"),row=box.querySelector(".share-actions");row.remove();var result=box.innerText.trim();box.appendChild(row);
copy("Aquarium "+M[k].name+" estimate (Aquarium Stocking)\nInputs: "+line(k)+"\nResult: "+result+"\nPlanning estimate, not a measured result. "+location.href,note)});
var q=new URLSearchParams(location.search),tab=q.get("tab");if(!M[tab])return;
M[tab].keys.forEach(function(f){put(f[1],q.get(f[0]),f[2])});
if(!(+v(M[tab].need)>0))return;window[M[tab].fn]();
var btns=document.querySelectorAll("#calc button[role=tab]");
if(btns[M[tab].i])showTab(M[tab].panel,btns[M[tab].i]);
})();
