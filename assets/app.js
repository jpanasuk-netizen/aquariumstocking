/* AquariumStocking calculators — vanilla JS, no dependencies.
   Standards:
   - Bioload points: small(<=2")=1, medium(2-5")=3, large(5-10")=8, XL(10+")=14.
     Capacity ~= 1 point per gallon for normal setups, 0.6 pt/gal for heavy/messy setups.
   - Heater: 3 W/gal lifts ~9F above room; 5 W/gal lifts ~15-20F. Linear interpolation,
     rounded up to a standard wattage; big tanks (>=40 gal) get a two-heater note.
   - Filter: turnover 4x (light) / 5x (normal) / 7x (heavy) per hour, +20% real-world derating.
   - Water changes: change% x (start - tap) = post-change nitrate; solve for the change that
     lands the weekly rise at the ceiling plateau. Pure functions below, DOM wiring separate. */
"use strict";

/* ================= pure calculation functions ================= */

function bioloadPoints(small, med, large, huge, style) {
  var pts = (small||0)*1 + (med||0)*3 + (large||0)*8 + (huge||0)*14;
  var capacity = style === "heavy" ? 0.6 : 1.0; // pts per gallon
  return { points: pts, capacityPerGallon: capacity };
}

function calcStockingPoints(gallons, small, med, large, huge, style) {
  var b = bioloadPoints(small, med, large, huge, style);
  var capacity = Math.round((gallons||0) * b.capacityPerGallon);
  var pct = capacity ? Math.round(b.points / capacity * 100) : 0;
  var status = pct === 0 ? "empty" : pct <= 80 ? "comfortable" : pct <= 100 ? "at capacity" : "overstocked";
  var advice =
    status === "overstocked" ? "Remove fish, upgrade tank size, or double filtration + water changes. Overstock is the #1 killer." :
    status === "at capacity" ? "You're at the line — no new fish. Watch nitrates weekly and keep changes on schedule." :
    status === "comfortable" ? "Good headroom. Add slowly (a few fish at a time) and re-check after each addition." :
    "Add fish gradually once the tank is cycled.";
  return { points: b.points, capacity: capacity, pct: pct, status: status, advice: advice };
}

function calcHeaterWatts(gallons, roomF, targetF) {
  var dT = Math.max(0, (targetF||0) - (roomF||0));
  var wpg = dT <= 5 ? 2.5 : dT <= 9 ? 3 : dT <= 15 ? 4 : 5;
  var raw = (gallons||0) * wpg;
  var std = [25,50,75,100,150,200,250,300,400,500];
  var watts = 0;
  for (var i=0;i<std.length;i++){ if(std[i] >= raw){ watts = std[i]; break; } }
  if(!watts) watts = 500;
  var twoUnits = (gallons||0) >= 40;
  return { dT: dT, wpg: wpg, raw: Math.round(raw), watts: watts, twoHeaters: twoUnits ? [Math.max(100, Math.ceil(watts/2/25)*25), Math.max(100, Math.ceil(watts/2/25)*25)] : null };
}

function calcFilterGPH(gallons, level) {
  var turns = level === "light" ? 4 : level === "heavy" ? 7 : 5;
  var ideal = (gallons||0) * turns;
  var gph = Math.ceil(ideal * 1.2 / 5) * 5; // +20% derating, rounded to 5
  return { turns: turns, ideal: Math.round(ideal), gph: gph };
}

function waterChangeMath(nitrateRisePerWeek, ceiling, tap) {
  var rise = Math.max(1, nitrateRisePerWeek||0);
  var ceil = Math.max(10, ceiling||40);
  var t = Math.max(0, tap||0);
  // After change c (fraction), post-change nitrate = (1-c)*plateau + c*tap.
  // Steady-state plateau P satisfies: (1-c)*P + c*t + rise = P  =>  c = rise / (P - t)
  // Solve c so that plateau = ceiling:
  var c = rise / (ceil - t);
  if (c >= 0.95) return { weeklyPct: null, plateau: null, note: "Tap water nitrate too close to your ceiling — dilute tap or grow heavy plants; water changes alone can't fix this." };
  var pct = Math.ceil(c * 20) * 5; // round UP to 5% steps
  if (pct < 15) pct = 15;          // never go below 15% — minerals and trace depletion
  var plateau = Math.round(t + rise / (pct/100));
  return { weeklyPct: pct, plateau: plateau, note: null };
}

/* ================= helpers ================= */
function el(id){ return document.getElementById(id); }
function fmt(n){ return Math.round(n).toLocaleString("en-US"); }
function showTab(id, btn){
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.tabs button').forEach(function(b){ b.setAttribute('aria-selected','false'); });
  el(id).classList.add('active');
  btn.setAttribute('aria-selected','true');
}
function readNum(id){ return parseFloat(el(id).value) || 0; }

/* ================= DOM wiring ================= */
function calcStocking(){
  var g = readNum("akGallons");
  if(!g){ alert("Enter your tank size in gallons."); return; }
  var style = el("akStyle").value;
  var r = calcStockingPoints(g, readNum("akSmall"), readNum("akMed"), readNum("akLarge"), readNum("akHuge"), style);
  var box = el("akStockResult"); box.hidden = false;
  if (window.updateMatchedCTA) window.updateMatchedCTA(parseFloat(el('akGallons').value)||20, 'stock');
  var color = r.status === "overstocked" ? "var(--warn)" : "var(--ok)";
  box.innerHTML =
    '<div class="big" style="color:'+color+'">'+fmt(r.points)+' <span class="unit">points of '+fmt(r.capacity)+' capacity — '+r.status+' ('+r.pct+'%)</span></div>'+
    '<p class="note">'+r.advice+'</p>'+
    '<p class="small">Points: small fish 1 · medium 3 · large 8 · XL 14 each. Capacity ≈ 1 pt/gal (normal) or 0.6 pt/gal (heavy/messy). Always stock to ADULT size and cycle the tank before adding.</p>';
}

function calcHeater(){
  var g = readNum("akHGallons");
  if(!g){ alert("Enter tank gallons."); return; }
  var r = calcHeaterWatts(g, readNum("akRoom"), readNum("akTarget"));
  var box = el("akHeatResult"); box.hidden = false;
  if (window.updateMatchedCTA) window.updateMatchedCTA(parseFloat(el('akHGallons').value)||20, 'heater');
  box.innerHTML =
    '<div class="big">'+r.watts+' <span class="unit">watts ('+r.dT+'°F rise, '+r.wpg+' W/gal)</span></div>'+
    '<div class="grid2">'+
      '<div class="stat"><b>'+r.raw+' W</b><span>Computed requirement</span></div>'+
      '<div class="stat"><b>'+(r.twoHeaters ? r.twoHeaters[0]+' W + '+r.twoHeaters[1]+' W' : 'One unit')+'</b><span>'+(r.twoHeaters ? 'Two heaters, opposite ends — no cold spot, no total failure' : 'Sized up to the next standard rating')+'</span></div>'+
    '</div>'+
    '<p class="note">A too-big heater on a thermostat is safe; a too-small one runs flat-out and dies cold. For big tanks, two units at opposite ends beat one big unit. Unplug during water changes — glass cracks on hot dry heaters.</p>';
}

function calcFilter(){
  var g = readNum("akFGallons");
  if(!g){ alert("Enter tank gallons."); return; }
  var r = calcFilterGPH(g, el("akFStock").value);
  var box = el("akFilterResult"); box.hidden = false;
  if (window.updateMatchedCTA) window.updateMatchedCTA(parseFloat(el('akFGallons').value)||20, 'filter');
  box.innerHTML =
    '<div class="big">'+r.gph+' <span class="unit">GPH ('+r.turns+'× turnover, derated for real media)</span></div>'+
    '<p class="note">Manufacturer GPH is measured empty — media, tubing, and pre-filters cut real flow 15–25%, hence the derating. A 29 gal normal community wants '+fmt(r.ideal)+' GPH ideal, ~'+r.gph+' GPH on the box. Sponge filters: count at half their rating.</p>';
}

function calcWaterChange(){
  var rise = readNum("akWNitrate");
  if(!rise){ alert("Enter your measured weekly nitrate rise (test day 1 and day 7)."); return; }
  var r = waterChangeMath(rise, readNum("akWTarget"), readNum("akWTap"));
  var box = el("akWaterResult"); box.hidden = false;
  if(r.weeklyPct === null){
    box.innerHTML = '<div class="big" style="color:var(--warn)">Water changes alone can\'t get you there</div><p class="note">'+r.note+'</p>';
    return;
  }
  box.innerHTML =
    '<div class="big">'+r.weeklyPct+'% <span class="unit">weekly change → plateau ~'+r.plateau+' ppm</span></div>'+
    '<p class="note">Measure, don\'t guess: test nitrate 7 days apart to get your true rise rate. Never change 100% — you crash the cycle. Big changes beat frequent small ones for nitrate control; keep temperature matched within a few degrees. If your tap nitrate is high, plants or RO blending are the fix, not bigger changes.</p>';
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", function(){});
