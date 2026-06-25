/* xlsxwrite — escrita CIRÚRGICA de células num .xlsx, preservando pivôs/gráficos/DRE.
 * Abre o .xlsx como zip (JSZip), edita só o XML da aba alvo e remonta — as demais
 * partes (pivotCache/pivotTable/chart/drawing) ficam intactas byte a byte.
 * Funciona no navegador (window.JSZip) e no Node (require('jszip')).
 *
 * applyEdits(arrayBuffer, sheetName, edits, dateColLetter) -> Promise<Uint8Array>
 *   edits: [{ ref:"P1448", type:"inlineStr"|"number", value }]
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("jszip"));
  else root.XlsxWrite = factory(root.JSZip);
})(typeof self !== "undefined" ? self : this, function (JSZip) {
  "use strict";

  function colNum(L) { var n = 0; for (var i = 0; i < L.length; i++) n = n * 26 + (L.charCodeAt(i) - 64); return n; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function cellXml(ref, type, value, dateStyle) {
    if (type === "inlineStr")
      return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(value) + "</t></is></c>";
    return '<c r="' + ref + '"' + (dateStyle ? ' s="' + dateStyle + '"' : "") + "><v>" + value + "</v></c>";
  }

  // insere/substitui uma célula <c r="REF"> dentro do XML da planilha, em ordem de coluna
  function setCell(xml, ref, type, value, dateStyle) {
    var rowN = ref.match(/\d+/)[0], col = ref.match(/[A-Z]+/)[0], ci = colNum(col);
    var rowRe = new RegExp('(<row r="' + rowN + '"[^>]*>)([\\s\\S]*?)(</row>)');
    var mm = xml.match(rowRe);
    if (!mm) throw new Error("Linha não encontrada na planilha: " + rowN);
    var body = mm[2];
    var nova = cellXml(ref, type, value, dateStyle);
    var cellRe = new RegExp('<c r="' + ref + '"[\\s\\S]*?(?:/>|</c>)');
    if (cellRe.test(body)) {
      body = body.replace(cellRe, nova);
    } else {
      var cells = body.match(/<c r="[A-Z]+\d+"[\s\S]*?(?:\/>|<\/c>)/g) || [];
      var insertPos = -1, acc = 0;
      for (var i = 0; i < cells.length; i++) {
        var cl = cells[i].match(/r="([A-Z]+)\d+"/)[1];
        if (colNum(cl) > ci) { insertPos = body.indexOf(cells[i], acc); break; }
        acc = body.indexOf(cells[i], acc) + cells[i].length;
      }
      body = insertPos >= 0 ? body.slice(0, insertPos) + nova + body.slice(insertPos) : body + nova;
    }
    return xml.replace(rowRe, mm[1] + body + mm[3]);
  }

  function locateSheetPath(wbXml, relsXml, sheetName) {
    var sheets = wbXml.match(/<sheet[^>]*\/>|<sheet[^>]*>/g) || [];
    var rid = null;
    for (var i = 0; i < sheets.length; i++) {
      var nm = sheets[i].match(/name="([^"]+)"/);
      var id = sheets[i].match(/r:id="([^"]+)"/);
      if (nm && id && nm[1] === sheetName) { rid = id[1]; break; }
    }
    if (!rid) throw new Error('Aba não encontrada: "' + sheetName + '"');
    var rels = relsXml.match(/<Relationship[^>]*>/g) || [];
    for (var j = 0; j < rels.length; j++) {
      var rI = rels[j].match(/Id="([^"]+)"/), tg = rels[j].match(/Target="([^"]+)"/);
      if (rI && rI[1] === rid && tg) return tg[1].indexOf("xl/") === 0 ? tg[1] : "xl/" + tg[1];
    }
    throw new Error("Relationship da aba não encontrada");
  }

  function applyEdits(arrayBuffer, sheetName, edits, dateColLetter) {
    return JSZip.loadAsync(arrayBuffer).then(function (zip) {
      return Promise.all([
        zip.file("xl/workbook.xml").async("string"),
        zip.file("xl/_rels/workbook.xml.rels").async("string"),
      ]).then(function (a) {
        var path = locateSheetPath(a[0], a[1], sheetName);
        return zip.file(path).async("string").then(function (xml) {
          // detecta o estilo de data de uma célula já preenchida na coluna de data
          var dateStyle = null;
          if (dateColLetter) {
            var m = xml.match(new RegExp('<c r="' + dateColLetter + '\\d+" s="(\\d+)"[^>]*><v>\\d'));
            if (m) dateStyle = m[1];
          }
          edits.forEach(function (e) {
            xml = setCell(xml, e.ref, e.type, e.value, e.type === "number" ? dateStyle : null);
          });
          zip.file(path, xml);
          return zip.generateAsync({ type: typeof window === "undefined" ? "nodebuffer" : "uint8array" });
        });
      });
    });
  }

  return { applyEdits: applyEdits, locateSheetPath: locateSheetPath };
});
