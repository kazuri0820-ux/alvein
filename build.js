#!/usr/bin/env node
/*
 * ソース(src/)からindex.htmlを生成するビルドスクリプト。
 * npm依存なし、Node標準ライブラリのみで完結する。
 * 使い方: node build.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");

// CSS/JSの結合順序は暗黙のソートに頼らず、ここで明示的に列挙する。
const JS_FILES = [
  "js/00-core.js",
  "js/01-events-early.js",
  "js/02-events-late.js",
  "js/03-missions.js",
  "js/04-jobchange-awaken.js",
  "js/05-facility-panels.js",
  "js/06-dungeon-hall-boot.js",
];

const template = fs.readFileSync(path.join(SRC, "index.template.html"), "utf8");

const css = fs.readFileSync(path.join(SRC, "style.css"), "utf8");

const js = JS_FILES.map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join("");

const GENERATED_NOTICE =
  "<!-- このファイルは src/ から `node build.js` で生成されます。直接編集しないでください。 -->\n";

let out = template.replace("<!--@@STYLE@@-->", "<style>\n" + css + "</style>");
out = out.replace("<!--@@SCRIPT@@-->", "<script>\n" + js + "</script>");
out = GENERATED_NOTICE + out;

fs.writeFileSync(path.join(ROOT, "index.html"), out);
console.log("index.html generated from src/");
