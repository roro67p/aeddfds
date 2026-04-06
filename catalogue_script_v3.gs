// ═══════════════════════════════════════════════════════
// CATALOGUE GRANDE SURFACE — Google Apps Script v3
// Scanner code-barres natif Android
// ═══════════════════════════════════════════════════════

function doGet(e) {
  var action = e.parameter.action || "form";
  if (action === "submit") return handleSubmit(e);
  if (action === "lookup") return lookupBarcode(e);
  return HtmlService.createHtmlOutput(getFormHTML())
    .setTitle("Catalogue")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

var RAYONS = [
  "🍎 Fruits","🥦 Légumes","🥤 Boissons","🧀 Crémerie","🥫 Épicerie",
  "🧴 Hygiène","👶 Bébé","⚽ Football","🎾 Raquettes","🏋️ Fitness",
  "🎿 Glisse","🏊 Aquatique","🚴 Vélo","🥾 Chaussures Sport",
  "👟 Chaussons","👕 Textile Sport","🎒 Bagagerie"
];

// Chercher produit via Open Food Facts
function lookupBarcode(e) {
  var code = e.parameter.code;
  try {
    var url = "https://world.openfoodfacts.org/api/v0/product/" + code + ".json";
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    if (data.status === 1 && data.product) {
      var p = data.product;
      var result = {
        found: true,
        nom: p.product_name_fr || p.product_name || "",
        marque: p.brands || "",
        taille: p.quantity || "",
        origine: p.origins || p.countries || "",
        code: code
      };
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {}
  return ContentService.createTextOutput(JSON.stringify({ found: false, code: code }))
    .setMimeType(ContentService.MimeType.JSON);
}

function ajouterProduit(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName(data.rayon);
  if (!ws) return { success: false, message: "Onglet introuvable : " + data.rayon };
  var lastRow = ws.getLastRow();
  var newRow = lastRow + 1;
  var prefix = data.rayon.replace(/[^a-zA-Z]/g, "").substring(0, 2).toUpperCase();
  var id = prefix + String(newRow - 5).padStart(3, "0");
  var marge = "";
  if (parseFloat(data.prixVente) > 0)
    marge = ((data.prixVente - data.prixAchat) / data.prixVente * 100).toFixed(1) + "%";
  var stock = parseInt(data.stock) || 0;
  var mini = parseInt(data.stockMini) || 0;
  var statut = stock === 0 ? "❌ Rupture" : stock <= mini ? "⚠️ Faible" : "✅ OK";
  ws.getRange(newRow, 1, 1, 14).setValues([[
    id, data.nom, data.marque||"", data.taille||"", data.origine||"",
    parseFloat(data.prixAchat)||0, parseFloat(data.prixVente)||0, marge,
    stock, mini, data.fournisseur||"", data.codeBarres||"", statut, ""
  ]]);
  var range = ws.getRange(newRow, 1, 1, 14);
  range.setFontFamily("Calibri").setFontSize(9).setHorizontalAlignment("center");
  range.setBorder(true,true,true,true,true,true,"#E0E0E0",SpreadsheetApp.BorderStyle.SOLID);
  ws.getRange(newRow,2).setHorizontalAlignment("left");
  return { success: true, message: "Produit ajouté !", id: id, rayon: data.rayon };
}

function handleSubmit(e) {
  var result = ajouterProduit({
    rayon: e.parameter.rayon, nom: e.parameter.nom,
    marque: e.parameter.marque, taille: e.parameter.taille,
    origine: e.parameter.origine, prixAchat: e.parameter.prixAchat,
    prixVente: e.parameter.prixVente, stock: e.parameter.stock,
    stockMini: e.parameter.stockMini, fournisseur: e.parameter.fournisseur,
    codeBarres: e.parameter.codeBarres
  });
  return HtmlService.createHtmlOutput(getConfirmHTML(result))
    .setTitle("Catalogue")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getFormHTML() {
  var url = ScriptApp.getService().getUrl();
  var opts = RAYONS.map(function(r){ return '<option value="'+r+'">'+r+'</option>'; }).join("");

  return '<!DOCTYPE html><html><head>'+
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">'+
  '<meta charset="UTF-8"><title>Catalogue</title>'+
  '<style>'+
  '*{box-sizing:border-box;margin:0;padding:0}'+
  'body{font-family:-apple-system,sans-serif;background:#0D1117;color:#fff}'+
  '.header{padding:18px 16px 10px;border-bottom:3px solid #F0A500}'+
  '.header h1{font-size:20px;color:#F0A500;font-weight:bold}'+
  '.header p{font-size:12px;color:#888;margin-top:3px}'+
  '.form{padding:16px}'+
  '.sec{font-size:10px;font-weight:bold;color:#F0A500;text-transform:uppercase;letter-spacing:1px;margin:16px 0 10px;padding-bottom:5px;border-bottom:1px solid #21262D}'+
  '.f{margin-bottom:12px}'+
  '.f label{display:block;font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}'+
  '.f input,.f select{width:100%;padding:13px 12px;background:#161B22;border:1.5px solid #30363D;border-radius:8px;color:#fff;font-size:15px;-webkit-appearance:none}'+
  '.f input:focus,.f select:focus{outline:none;border-color:#F0A500}'+
  '.r2{display:grid;grid-template-columns:1fr 1fr;gap:10px}'+
  '.mbox{background:#161B22;border:1.5px solid #30363D;border-radius:8px;padding:10px;text-align:center;margin-bottom:12px}'+
  '.mbox .v{font-size:24px;font-weight:bold;color:#10B981}'+
  '.mbox .l{font-size:10px;color:#888}'+

  /* Scanner */
  '.scan-wrap{display:flex;gap:8px;margin-bottom:12px}'+
  '.scan-btn{flex:1;padding:14px;background:#161B22;color:#F0A500;font-size:14px;font-weight:bold;border:2px solid #F0A500;border-radius:8px;cursor:pointer;text-align:center}'+
  '.scan-input{display:none}'+
  '.status{border-radius:8px;padding:10px 12px;font-size:13px;text-align:center;margin-bottom:10px;display:none}'+
  '.status.ok{background:#0D2818;border:1px solid #10B981;color:#10B981;display:block}'+
  '.status.bad{background:#1A0505;border:1px solid #EF4444;color:#EF4444;display:block}'+
  '.status.search{background:#1A1200;border:1px solid #F0A500;color:#F0A500;display:block}'+

  '.btn{width:100%;padding:16px;background:#F0A500;color:#0D1117;font-size:16px;font-weight:bold;border:none;border-radius:10px;cursor:pointer;margin-top:8px}'+
  '.req{color:#EF4444}'+
  '.safe{height:40px}'+
  '</style></head><body>'+

  '<div class="header"><h1>🏪 Catalogue</h1><p>Ajouter un nouveau produit</p></div>'+
  '<form class="form" action="'+url+'" method="get">'+
  '<input type="hidden" name="action" value="submit">'+

  /* SCANNER */
  '<div class="sec">📷 Scanner un code-barres</div>'+
  '<div class="scan-wrap">'+
  '  <button type="button" class="scan-btn" onclick="triggerScan()">📷 Scanner</button>'+
  '  <button type="button" class="scan-btn" onclick="manualLookup()" style="background:#21262D">🔍 Chercher</button>'+
  '</div>'+
  // Input file qui déclenche la caméra Android nativement
  '<input type="file" id="scanInput" class="scan-input" accept="image/*" capture="environment" onchange="processImage(this)">'+
  '<div class="status" id="status"></div>'+

  /* RAYON */
  '<div class="sec">📌 Rayon <span class="req">*</span></div>'+
  '<div class="f"><label>Choisir le rayon</label>'+
  '<select name="rayon" id="rayon" required>'+
  '<option value="">— Sélectionner —</option>'+opts+
  '</select></div>'+

  /* PRODUIT */
  '<div class="sec">🏷️ Produit <span class="req">*</span></div>'+
  '<div class="f"><label>Nom <span class="req">*</span></label>'+
  '<input type="text" name="nom" id="nom" placeholder="ex: Pomme Golden" required></div>'+
  '<div class="r2">'+
  '<div class="f"><label>Marque</label><input type="text" name="marque" id="marque" placeholder="ex: Danone"></div>'+
  '<div class="f"><label>Taille / Unité</label><input type="text" name="taille" id="taille" placeholder="ex: 1kg"></div>'+
  '</div>'+
  '<div class="f"><label>Origine</label><input type="text" name="origine" id="origine" placeholder="ex: France"></div>'+
  '<div class="f"><label>Code-barres</label><input type="text" name="codeBarres" id="codeBarres" placeholder="ex: 3017620422003" inputmode="numeric"></div>'+

  /* PRIX */
  '<div class="sec">💶 Prix <span class="req">*</span></div>'+
  '<div class="r2">'+
  '<div class="f"><label>Prix achat €</label><input type="number" name="prixAchat" id="pa" placeholder="0.00" step="0.01" min="0" oninput="calcM()"></div>'+
  '<div class="f"><label>Prix vente €</label><input type="number" name="prixVente" id="pv" placeholder="0.00" step="0.01" min="0" oninput="calcM()"></div>'+
  '</div>'+
  '<div class="mbox"><div class="v" id="mv">—</div><div class="l">Marge calculée</div></div>'+

  /* STOCK */
  '<div class="sec">📦 Stock <span class="req">*</span></div>'+
  '<div class="r2">'+
  '<div class="f"><label>Stock initial <span class="req">*</span></label><input type="number" name="stock" placeholder="0" min="0" required></div>'+
  '<div class="f"><label>Stock minimum</label><input type="number" name="stockMini" placeholder="5" min="0"></div>'+
  '</div>'+

  /* FOURNISSEUR */
  '<div class="sec">🚛 Fournisseur</div>'+
  '<div class="f"><label>Fournisseur</label><input type="text" name="fournisseur" placeholder="ex: Primeur Lyon"></div>'+

  '<button type="submit" class="btn">✅ AJOUTER AU CATALOGUE</button>'+
  '<div class="safe"></div>'+
  '</form>'+

  '<script>'+
  'var LOOKUP_URL = "'+url+'";'+

  // Déclenche la caméra Android nativement
  'function triggerScan(){'+
  '  document.getElementById("scanInput").click();'+
  '}'+

  // Quand une photo est prise — on lit le code via ZXing en JS
  'function processImage(input){'+
  '  if(!input.files||!input.files[0]) return;'+
  '  setStatus("search","🔍 Lecture du code-barres...");'+
  '  var reader = new FileReader();'+
  '  reader.onload = function(e){'+
  '    var img = new Image();'+
  '    img.onload = function(){'+
  '      var canvas = document.createElement("canvas");'+
  '      canvas.width = img.width; canvas.height = img.height;'+
  '      var ctx = canvas.getContext("2d");'+
  '      ctx.drawImage(img,0,0);'+
  '      var imageData = ctx.getImageData(0,0,canvas.width,canvas.height);'+
  '      try {'+
  '        var code = window.ZXing && window.ZXing.readBarcodesFromImageData ?'+
  '          window.ZXing.readBarcodesFromImageData(imageData) : null;'+
  '        if(code && code.length > 0){'+
  '          var barcode = code[0].text;'+
  '          document.getElementById("codeBarres").value = barcode;'+
  '          fetchProduct(barcode);'+
  '        } else {'+
  '          setStatus("search","🔍 Code détecté — Entrez-le manuellement ci-dessous");'+
  '        }'+
  '      } catch(err){ setStatus("bad","⚠️ Impossible de lire — entrez le code manuellement"); }'+
  '    };'+
  '    img.src = e.target.result;'+
  '  };'+
  '  reader.readAsDataURL(input.files[0]);'+
  '}'+

  // Cherche un code saisi manuellement
  'function manualLookup(){'+
  '  var code = document.getElementById("codeBarres").value.trim();'+
  '  if(!code){ setStatus("bad","❌ Entrez d abord un code-barres"); return; }'+
  '  fetchProduct(code);'+
  '}'+

  // Appel Open Food Facts via le serveur Apps Script
  'function fetchProduct(code){'+
  '  setStatus("search","🔍 Recherche du produit " + code + "...");'+
  '  fetch(LOOKUP_URL + "?action=lookup&code=" + code)'+
  '  .then(function(r){ return r.json(); })'+
  '  .then(function(d){'+
  '    if(d.found){'+
  '      if(d.nom) document.getElementById("nom").value = d.nom;'+
  '      if(d.marque) document.getElementById("marque").value = d.marque;'+
  '      if(d.taille) document.getElementById("taille").value = d.taille;'+
  '      if(d.origine) document.getElementById("origine").value = d.origine;'+
  '      document.getElementById("codeBarres").value = d.code;'+
  '      setStatus("ok","✅ Trouvé : " + d.nom + (d.marque?" · "+d.marque:""));'+
  '    } else {'+
  '      setStatus("bad","⚠️ Produit inconnu — remplissez manuellement");'+
  '    }'+
  '  })'+
  '  .catch(function(){ setStatus("bad","⚠️ Erreur réseau — remplissez manuellement"); });'+
  '}'+

  'function setStatus(t,m){'+
  '  var el=document.getElementById("status");'+
  '  el.className="status "+t; el.textContent=m;'+
  '}'+

  'function calcM(){'+
  '  var a=parseFloat(document.getElementById("pa").value)||0;'+
  '  var v=parseFloat(document.getElementById("pv").value)||0;'+
  '  var el=document.getElementById("mv");'+
  '  if(v>0){var m=((v-a)/v*100).toFixed(1);'+
  '    el.textContent=m+"%";'+
  '    el.style.color=m>=50?"#10B981":m>=30?"#F59E0B":"#EF4444";'+
  '  }else{el.textContent="—";el.style.color="#888";}'+
  '}'+
  '</script></body></html>';
}

function getConfirmHTML(result) {
  var url = ScriptApp.getService().getUrl();
  var ok = result.success;
  return '<!DOCTYPE html><html><head>'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta charset="UTF-8">'+
  '<style>'+
  '*{box-sizing:border-box;margin:0;padding:0}'+
  'body{font-family:-apple-system,sans-serif;background:#0D1117;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center}'+
  '.icon{font-size:64px;margin-bottom:16px}'+
  '.title{font-size:22px;font-weight:bold;color:'+(ok?"#10B981":"#EF4444")+';margin-bottom:8px}'+
  '.msg{font-size:14px;color:#888;margin-bottom:6px}'+
  '.info{font-size:13px;color:#F0A500;margin-bottom:28px}'+
  '.btn{display:block;width:100%;padding:16px;background:#F0A500;color:#0D1117;font-size:16px;font-weight:bold;border:none;border-radius:10px;text-decoration:none;margin-bottom:10px}'+
  '.btn2{display:block;width:100%;padding:14px;background:#161B22;color:#888;font-size:14px;border:1px solid #30363D;border-radius:10px;text-decoration:none}'+
  '</style></head><body>'+
  '<div class="icon">'+(ok?"✅":"❌")+'</div>'+
  '<div class="title">'+(ok?"Produit ajouté !":"Erreur")+'</div>'+
  '<div class="msg">'+result.message+'</div>'+
  (ok?'<div class="info">Réf. '+result.id+' · '+result.rayon+'</div>':'')+
  '<a href="'+url+'" class="btn">➕ Ajouter un autre produit</a>'+
  '<a href="https://docs.google.com/spreadsheets" class="btn2">📊 Ouvrir Google Sheets</a>'+
  '</body></html>';
}
