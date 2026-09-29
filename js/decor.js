/* ===========================================================
   DECORATIVE SOLAR ANIMATIONS (inverter readout, phone app numbers)
   To remove all decorative animations: delete the <link> to
   css/decor.css and the <script> for this file in index.html.
=========================================================== */
(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) document.querySelectorAll('svg.deco').forEach(s => s.pauseAnimations && s.pauseAnimations());
  const kw = document.getElementById('invKw');
  if(kw && !reduce) setInterval(() => { kw.textContent = (3.2 + Math.random()*0.45).toFixed(2) + ' kW'; }, 1400);
  const k = document.getElementById('phoneKwh'), r = document.getElementById('phoneRs'), c = document.getElementById('phoneCo2');
  if(k){
    let t0 = performance.now();
    (function loop(t){
      const p = reduce ? 1 : Math.min(1, ((t - t0) % 6000) / 3300);
      const kwh = 16.8 * p;
      k.textContent = kwh.toFixed(1); r.textContent = '₹' + Math.round(kwh * 7.5); c.textContent = Math.round(kwh * 0.82) + ' kg';
      if(!reduce) requestAnimationFrame(loop);
    })(t0);
  }
})();
