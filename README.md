# Retro Hry

Štyri vreckové hry ako z 90. rokov a jedna farebná bitka v jednej mobilnej apke:

| Hra | Na čom beží | O čo ide |
| --- | --- | --- |
| **Kocky** | kocková konzola „RETRO 9999 in 1“ | padajúce kocky na matici 10×20, plné riadky miznú; hra B = autíčko z kociek |
| **Formulky** | červeno-čierna LCD vreckovka „GAME“ | cesta do diaľky, hory na obzore, formuly sa blížia v troch pruhoch |
| **Formulky**

- GAME spustí hru, SET mimo hry prepína GAME 1 / GAME 2 (dvojka je rýchlejšia a hustejšia), počas hry SET = pauza.
- Trojuholníky ◄ ► (alebo ťuknutie na ľavú/pravú polovicu displeja) menia pruh. Tri autá, každých 100 bodov jedno pribudne.
- Keď sa nehrá, displej ukazuje hodiny a autíčko jazdí samo.

**Líška a vajíčka** | LCD hra s hodinami | líška chytá do košíka vajíčka zo štyroch žľabov |
| **Chobotnica** | LCD hra s hodinami (zelený rám) | potápač nosí perly z truhlice na loďku a uhýba chápadlám |
| **Loptička** | kocková konzola (hra C) | pálka, loptička z jednej kocky a tehličky |
| **Ľadové bubliny** | farebná hra na celú obrazovku | strieľanie bublín, tri rovnaké prasknú, strop sa spúšťa |
| **Armáda** | farebná hra na celú obrazovku | modrá armáda beží po moste cez brány (+, −, ×, ÷), strieľa do sudov a bije sa s červenými hordami |

Všetko je nakreslené ako starý LCD displej (aj so „zhasnutými“ segmentmi), zvuky sú
pípanie z piezo bzučiaka cez Web Audio, rekordy sa ukladajú v telefóne. Grafika, postavičky,
melódie aj pravidlá sú vlastné, hry sú *v štýle* starých vreckoviek, nie ich kópie.

## Ovládanie

**Kocková konzola** (Kocky, Formulky)

- Na úvodnej obrazovke: ◄ ► prepína hru A/B, ▲ mení SPEED, ▼ mení LEVEL, ROTATE alebo START spustí hru.
- Kocky: ◄ ► posun, ▼ podržaním rýchly pád, ▲ alebo ROTATE otočenie. LEVEL pridá na začiatku riadky „smetí“.
- Hra B (autá z kociek): ◄ ► pruh, podržaný ROTATE/▲ = plyn, ▼ = brzda. Zostávajúce autá sú v okienku NEXT.
- START/PAUSE = pauza (na displeji sa ukáže šálka kávy), RESET = späť na výber, SOUND = zvuk, ON/OFF = menu.
- Ťuknutím na nápis RETRO zmeníš farbu plastu.

**Formulky**

- GAME spustí hru, SET mimo hry prepína GAME 1 / GAME 2 (dvojka je rýchlejšia a hustejšia), počas hry SET = pauza.
- Trojuholníky ◄ ► (alebo ťuknutie na ľavú/pravú polovicu displeja) menia pruh. Tri autá, každých 100 bodov jedno pribudne.
- Keď sa nehrá, displej ukazuje hodiny a autíčko jazdí samo.

**Líška a vajíčka**

- Štyri veľké tlačidlá (alebo ťuknutie do rohu displeja) presunú košík.
- HRA A je pomalšia, HRA B rýchlejšia. Tri rozbité vajíčka = koniec. Každých 100 bodov sa chyby zmažú.
- Keď sa nehrá, displej ukazuje hodiny.

**Chobotnica**

- ◄ = k truhlici, pri truhlici každé stlačenie zoberie perlu (+1). ► = späť k loďke; po návrate sa perly započítajú ešte raz.
- Plne natiahnuté chápadlo potápača chytí. Piate chápadlo siaha až k truhlici, takže tam sa nedá stáť donekonečna.
- Náhradníci sedia v loďke, každých 200 bodov jeden pribudne.
- HRA A / HRA B (rýchlejšia). Keď sa nehrá, ukazuje hodiny.

**Loptička (hra C na kockovej konzole)**

- ◄ ► pálka, ROTATE/▲ vypustí loptičku. LEVEL vyberá tvar steny, po rozbití všetkých tehličiek príde ďalšia a rýchlejšia.

**Ľadové bubliny**

- Polož prst na plochu, nastav smer, pusti = výstrel (bublina sa odráža od stien).
- Tri a viac rovnakých farieb praskne, bubliny bez opory spadnú (dvojnásobné body za veľké pády).
- Po niekoľkých výstreloch sa strop spustí o rad. Keď bubliny prekročia červenú čiaru, zamrznú a je koniec.

**Armáda**

- Ťahaním prsta doľava/doprava vedieš armádu. Modré brány pridávajú (+, ×), červené uberajú (−, ÷).
- Pás +1 pridá vojaka za každú dlaždicu. Sud s číslom treba zostreliť šípmi (dá bonus), náraz do neho stojí toľko vojakov, koľko má na sebe.
- Červené hordy sa rozbehnú proti tebe; na konci úrovne čaká veľká horda a cieľ. Každá ďalšia úroveň je ťažšia.

Na počítači: šípky, medzerník (otočiť), Enter (štart/pauza), Esc (menu); v Líške Q/A/P/L.

## Ako dostať apku do mobilu

### Android – APK

Pri každom pushi GitHub Actions zostaví `RetroHry.apk` (workflow `.github/workflows/android.yml`).

- Na hlavnej vetve sa APK pridá do **Releases** – v telefóne otvor stránku repozitára → Releases → `RetroHry.apk`.
- Pri ostatných vetvách je APK v záložke **Actions** → beh → *Artifacts* → `RetroHry-apk` (ZIP).

Pri inštalácii treba povoliť „inštaláciu z neznámych zdrojov“ pre prehliadač. Novšia APK sa nainštaluje
cez staršiu a rekordy ostanú, lebo všetky zostavy podpisuje ten istý ladiaci kľúč
`android/app/retrohry-debug.keystore`. Tento kľúč je verejný a slúži len na domáce používanie;
na Google Play treba vytvoriť vlastný tajný kľúč a ten do repozitára nedávať.

### Web / iPhone – PWA

Priečinok `www/` je hotová webová apka (funguje aj offline). Stačí ju dať na ľubovoľný HTTPS hosting
(GitHub Pages, Cloudflare Pages, Netlify…), otvoriť v mobile a:

- Android/Chrome: v menu sa ukáže tlačidlo **Nainštalovať apku**,
- iPhone/Safari: **Zdieľať → Pridať na plochu**.

## Vývoj

```bash
npm start                 # http://localhost:8080 (obsah priečinka www/)
npm install
npx cap sync android      # skopíruje www/ do Android projektu
npx cap open android      # otvorí projekt v Android Studiu
```

Štruktúra:

```
www/
  index.html, css/style.css
  js/core.js           ukladanie, zvuk (bzučiak), vibrácie, tlačidlá
  js/lcd.js            LCD displej konzoly, 7-segmentové číslice
  js/game-blocks.js    Kocky
  js/game-racing.js    autá z kociek (hra B na konzole)
  js/brick-console.js  konzola: výber hry, SPEED/LEVEL, pauza, „opona“
  js/game-eggs.js      Líška a vajíčka (segmenty, hodiny, pravidlá)
  js/segscreen.js      spoločný LCD displej so segmentmi a hodinami
  js/game-racer.js     Formulky (cesta do diaľky)
  js/game-octopus.js   Chobotnica
  js/game-battle.js    Armáda (most, brány, hordy)
  js/game-ball.js      Loptička (hra C na konzole)
  js/game-bubbles.js   Ľadové bubliny
  js/app.js            menu, navigácia, hlavná slučka
  sw.js, manifest.webmanifest, icons/, fonts/
android/               Capacitor projekt (Android)
```

Písma Silkscreen a Rubik sú pod licenciou SIL Open Font License 1.1.
