🚨 Overview
Web3Shield is a lightweight, mobile‑built Web3 security extension designed to protect crypto users from the most common blockchain threats — including fake sites, dusting attacks, and wallet‑poisoning scams.  
Built entirely from a phone using Termux, Web3Shield proves that powerful security tools can come from anywhere.

---

🔒 Features
- Fake‑Site Detection — Flags suspicious or malicious Web3 domains in real time.  
- Dusting Attack Alerts — Detects tiny incoming transactions used for tracking or phishing.  
- Wallet‑Poisoning Protection — Warns users about look‑alike addresses and scam tokens.  
- Real‑Time Monitoring — Background script watches every visited URL for threats.  
- Lightweight Popup UI — Simple interface showing extension status.  
- Mobile‑First Development — Entirely built and packaged on Android using Termux.

---

🛡️ Why Web3Shield Exists
Crypto users lose millions every year to:
- phishing sites  
- malicious tokens  
- dusting attacks  
- poisoned addresses  
- fake dApps  

Web3Shield aims to become a Web3 antivirus — a simple, accessible tool that protects everyday users before they get scammed.

---

📦 Installation (Developer Mode)
1. Install Firefox Nightly on Android.  
2. Go to Settings → About Firefox Nightly.  
3. Tap the logo 5 times to unlock “Install Add‑on From File.”  
4. Build the .xpi package:  
   `
   zip -r web3shield.xpi *
   `  
5. Install the .xpi through Firefox’s extension menu.

---

🧩 File Structure
`
web3shield/
│── manifest.json
│── background.js
│── popup.html
`

---

🧠 How It Works
- The background script monitors all visited URLs.  
- The popup provides a simple UI.  
- The extension uses webRequest and <all_urls> permissions to detect threats.  
- Future versions will include contract analysis, token scanning, and on‑chain risk scoring.

---

🗺️ Roadmap
- Advanced Dusting Detection  
- Fake‑Site Warning Banner  
- Address Poisoning Scanner  
- Full Dashboard UI  
- Chrome/Brave/Edge Support  
- Pro Tier With Deep Analysis  

---

🤝 Support the Project
Web3Shield is built from nothing but determination and a phone.  
If you want to support development, visibility, or funding opportunities, reach out or share the project.

---

📣 Credits
Created by Collin, building Web3 security tools from the ground up.

---


# Web3shield
