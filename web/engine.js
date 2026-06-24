/* Motor de conciliação CR × boletos — espelha financeiro/preenchimento.py.
 * Funciona no navegador (window.ConciliadorEngine) e no Node (module.exports).
 * Recebe linhas já lidas (objetos com as chaves dos cabeçalhos da planilha/relatório).
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory();
  else root.ConciliadorEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // --- helpers ---------------------------------------------------------------
  function normNF(v) {
    var s = String(v == null ? "" : v).trim();
    return s.endsWith(".0") ? s.slice(0, -2) : s;
  }

  // valor -> centavos (inteiro), evita erro de float. Aceita "1.234,56", "1234.56", número.
  function cents(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") return Math.round(v * 100);
    var s = String(v).replace(/R\$/g, "").replace(/\s/g, "");
    if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
    var n = Number(s);
    return isNaN(n) ? null : Math.round(n * 100);
  }

  // serial Excel / Date / "dd/mm/aaaa" / "aaaa-mm-dd" -> Date (UTC) ou null
  function toDate(v) {
    if (v == null || v === "") return null;
    if (v instanceof Date) return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
    if (typeof v === "number") return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    var s = String(v).trim();
    var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return null;
  }

  function fmtDate(d) {
    if (!d) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getUTCDate()) + "/" + p(d.getUTCMonth() + 1) + "/" + d.getUTCFullYear();
  }
  function fmtBRL(c) {
    if (c == null) return "—";
    return "R$ " + (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function dayDiff(a, b) { return Math.round((a - b) / 86400000); }

  // --- leitura das linhas ----------------------------------------------------
  // Normaliza chaves (cabeçalhos podem vir com espaços, ex.: " MÊS ").
  function pick(row) {
    var o = {};
    for (var k in row) if (Object.prototype.hasOwnProperty.call(row, k)) o[String(k).trim()] = row[k];
    return o;
  }

  function lerCR(rows) {
    return rows.map(function (raw) {
      var r = pick(raw);
      return {
        nf: normNF(r["NF"]),
        valor: cents(r["VALOR TOTAL"]),
        vencimento: toDate(r["VENCIMENTO"]),
        pago: String(r["PAGO?"] || "").trim().toUpperCase() === "S",
        dataReceb: toDate(r["DATA RECEBIMENTO"]),
        cliente: String(r["CLIENTE"] || "").trim(),
      };
    }).filter(function (t) { return t.valor != null && t.valor !== 0; });
  }

  function lerBoletos(rows) {
    return rows.map(function (raw) {
      var r = pick(raw);
      var vliq = cents(r["Valor Liquidação"]);
      var dliq = toDate(r["Data Situação"]);
      return {
        nf: normNF(r["Seu Número"]),
        nominal: cents(r["Valor"]),
        liquidado: vliq,
        dataLiq: dliq,
        situacao: String(r["Situação"] || "").trim(),
      };
    }).filter(function (b) { return b.dataLiq && b.liquidado != null && b.liquidado > 0; });
  }

  // --- distribuição de datas (FIFO por vencimento; valor casa 1:1) -----------
  function atribuirDatas(rows, bols) {
    var datas = new Array(rows.length);
    if (bols.length === 1) {
      for (var i = 0; i < rows.length; i++) datas[i] = bols[0].dataLiq;
      return datas;
    }
    var disp = bols.slice().sort(function (a, b) { return a.dataLiq - b.dataLiq; });
    var usados = {};
    var ordem = rows.map(function (_, i) { return i; })
      .sort(function (a, b) { return (rows[a].vencimento || 0) - (rows[b].vencimento || 0); });
    ordem.forEach(function (i) {
      var alvo = rows[i].valor, escolhido = -1, j;
      for (j = 0; j < disp.length; j++) if (!usados[j] && disp[j].nominal === alvo) { escolhido = j; break; }
      if (escolhido < 0) for (j = 0; j < disp.length; j++) if (!usados[j]) { escolhido = j; break; }
      if (escolhido >= 0) { usados[escolhido] = true; datas[i] = disp[escolhido].dataLiq; }
      else datas[i] = disp[disp.length - 1].dataLiq;
    });
    return datas;
  }

  // --- conciliação por NF (porta conciliar_por_nf) ---------------------------
  function reconcileCR(crRows, boletoRows) {
    var cr = lerCR(crRows), bol = lerBoletos(boletoRows);
    var bolPorNF = {}, crPorNF = {};
    bol.forEach(function (b) { (bolPorNF[b.nf] = bolPorNF[b.nf] || []).push(b); });
    cr.forEach(function (t) { (crPorNF[t.nf] = crPorNF[t.nf] || []).push(t); });

    var nfs = [], resumo = { conciliado: 0, divergente: 0, semBoleto: 0, aPreencher: [] };
    Object.keys(crPorNF).sort().forEach(function (nf) {
      var rows = crPorNF[nf], bols = bolPorNF[nf] || [];
      var somaCR = rows.reduce(function (s, t) { return s + t.valor; }, 0);
      var somaBol = bols.reduce(function (s, b) { return s + b.nominal; }, 0);
      var res = { nf: nf, somaCR: somaCR, somaBol: somaBol, status: "", linhas: [] };

      if (!bols.length) {
        res.status = "sem_boleto"; resumo.semBoleto++;
        rows.forEach(function (t) {
          res.linhas.push(linha(t, false, null, "sem_boleto"));
        });
        nfs.push(res); return;
      }
      var chaves = bols.map(function (b) { return b.nominal + "@" + (+b.dataLiq); });
      var ambiguo = bols.length > 1 && new Set(chaves).size < chaves.length && bols.length !== rows.length;

      if (somaCR === somaBol && !ambiguo) {
        res.status = "conciliado"; resumo.conciliado++;
        var datas = atribuirDatas(rows, bols);
        rows.forEach(function (t, i) {
          if (t.pago) res.linhas.push(linha(t, false, t.dataReceb, "ja_pago"));
          else { var l = linha(t, true, datas[i], "conciliado"); res.linhas.push(l); resumo.aPreencher.push(l); }
        });
      } else {
        res.status = "divergente"; resumo.divergente++;
        rows.forEach(function (t) {
          res.linhas.push(linha(t, false, null, ambiguo ? "ambiguo" : "divergente"));
        });
      }
      nfs.push(res);
    });
    return { nfs: nfs, resumo: resumo };

    function linha(t, preencher, data, status) {
      return { nf: t.nf, valor: t.valor, vencimento: t.vencimento, cliente: t.cliente,
               jaPago: t.pago, preencher: preencher, dataReceb: data, status: status };
    }
  }

  // --- CSV completo (PREENCHER + DECIDIR) ------------------------------------
  function csvCompleto(result) {
    var prioridade = { DECIDIR: 0, PREENCHER: 1, "": 2 };
    var regs = [];
    result.nfs.forEach(function (nf) {
      var dif = nf.somaCR - nf.somaBol;
      nf.linhas.forEach(function (l) {
        if (l.status === "ja_pago" || l.status === "sem_boleto") return;
        var acao = l.preencher ? "PREENCHER" : (l.status === "divergente" || l.status === "ambiguo" ? "DECIDIR" : "");
        regs.push([prioridade[acao] != null ? prioridade[acao] : 3, l.nf, [
          acao, l.status, l.nf, l.cliente, (l.valor / 100).toFixed(2), fmtDate(l.vencimento),
          l.preencher ? "S" : "", fmtDate(l.dataReceb),
          (nf.somaCR / 100).toFixed(2), (nf.somaBol / 100).toFixed(2), (dif / 100).toFixed(2),
        ]]);
      });
    });
    regs.sort(function (a, b) { return a[0] - b[0] || (a[1] < b[1] ? -1 : 1); });
    var head = ["AÇÃO", "STATUS", "NF", "CLIENTE", "VALOR NOMINAL", "VENCIMENTO", "PAGO?",
                "DATA RECEBIMENTO", "SOMA CR (NF)", "SOMA BOLETOS (NF)", "DIFERENÇA"];
    var linhas = [head].concat(regs.map(function (r) { return r[2]; }));
    return linhas.map(function (r) { return r.join(";"); }).join("\r\n");
  }

  return { reconcileCR: reconcileCR, csvCompleto: csvCompleto,
           normNF: normNF, cents: cents, toDate: toDate, fmtDate: fmtDate, fmtBRL: fmtBRL };
});
