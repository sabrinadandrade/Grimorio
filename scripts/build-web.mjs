// Copia os arquivos do site para www/ (usado pelo app Android via Capacitor).
// Copies the site files into www/ (used by the Android app via Capacitor).
import { cpSync, rmSync, mkdirSync } from "node:fs";
rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const p of ["index.html", "manifest.webmanifest", "css", "js", "assets"]) cpSync(p, "www/" + p, { recursive: true });
console.log("www/ pronto ✨");
