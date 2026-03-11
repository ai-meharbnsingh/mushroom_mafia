#pragma once

// Portal HTML page stored in PROGMEM to save RAM.
// Separated into its own header to avoid PlatformIO prototype generator
// issues with raw string literals in .ino files.

const char PORTAL_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mushroom Sensor WiFi Setup</title>
<style>
body{font-family:sans-serif;margin:20px;background:#1a1a2e;color:#e0e0e0;}
h2{color:#4ecca3;text-align:center;margin-bottom:4px;}
p.sub{text-align:center;color:#888;margin-top:0;font-size:13px;}
.card{background:#16213e;border-radius:8px;padding:12px 15px;margin:6px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;}
.card:hover{background:#0f3460;}
.ssid{font-size:15px;}
.lock{font-size:12px;color:#e94560;margin-right:4px;}
.signal{color:#4ecca3;font-size:13px;}
input{width:100%;padding:10px;margin:8px 0;border-radius:4px;border:1px solid #333;background:#0f3460;color:white;box-sizing:border-box;font-size:15px;}
button{width:100%;padding:12px;background:#e94560;color:white;border:none;border-radius:4px;font-size:16px;cursor:pointer;margin-top:6px;}
button:disabled{background:#555;}
#scanBtn{background:#4ecca3;color:#1a1a2e;margin-bottom:10px;}
#status{text-align:center;margin:10px 0;font-size:14px;min-height:20px;}
#nets{max-height:300px;overflow-y:auto;}
</style>
</head>
<body>
<h2>Mushroom Sensor</h2>
<p class="sub">WiFi Setup</p>
<button id="scanBtn" onclick="scan()">Scan Networks</button>
<div id="nets"></div>
<div id="form" style="display:none">
<input id="ssid" placeholder="SSID" readonly>
<input id="pass" type="password" placeholder="Password">
<button id="connBtn" onclick="connect()">Connect</button>
</div>
<div id="status"></div>
<script>
function scan(){
 document.getElementById('scanBtn').disabled=true;
 document.getElementById('scanBtn').textContent='Scanning...';
 document.getElementById('status').textContent='Searching for networks...';
 fetch('/scan').then(r=>r.json()).then(d=>{
  if(d.scanning){setTimeout(pollScan,2000);return;}
  showResults(d);
 }).catch(function(e){
  document.getElementById('status').textContent='Scan failed: '+e.message+'. Tap to retry.';
  document.getElementById('scanBtn').disabled=false;
  document.getElementById('scanBtn').textContent='Scan Networks';
 });
}
function pollScan(){
 fetch('/scan').then(r=>r.json()).then(d=>{
  if(d.scanning){setTimeout(pollScan,1500);return;}
  showResults(d);
 }).catch(function(){setTimeout(pollScan,2000);});
}
function showResults(d){
 var h='';
 d.forEach(function(n){
  var bars=n.rssi>-50?'****':n.rssi>-65?'***':n.rssi>-75?'**':'*';
  var lk=n.secure?'<span class="lock">&#128274;</span>':'';
  h+='<div class="card" onclick="pick(\''+n.ssid.replace(/'/g,"\\'")+'\')"><span class="ssid">'+lk+n.ssid+'</span><span class="signal">'+bars+' '+n.rssi+'dBm</span></div>';
 });
 document.getElementById('nets').innerHTML=h||'<p>No networks found. Tap Scan again.</p>';
 document.getElementById('status').textContent=d.length+' network(s) found';
 document.getElementById('scanBtn').disabled=false;
 document.getElementById('scanBtn').textContent='Scan Networks';
}
function pick(s){
 document.getElementById('ssid').value=s;
 document.getElementById('form').style.display='block';
 document.getElementById('pass').focus();
}
function connect(){
 var s=document.getElementById('ssid').value;
 var p=document.getElementById('pass').value;
 if(!s){document.getElementById('status').textContent='Select a network first';return;}
 document.getElementById('connBtn').disabled=true;
 document.getElementById('connBtn').textContent='Connecting...';
 document.getElementById('status').textContent='Saving credentials and rebooting...';
 fetch('/connect',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'ssid='+encodeURIComponent(s)+'&password='+encodeURIComponent(p)}).then(r=>r.text()).then(function(){
  document.getElementById('status').textContent='Credentials saved! Device is rebooting...';
 }).catch(function(){
  document.getElementById('status').textContent='Saved! Device is rebooting...';
 });
}
scan();
</script>
</body>
</html>
)rawliteral";
