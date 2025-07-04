# OngBak-Bot WhatsApp

A simple WhatsApp bot focused on social media downloading.

## 📥 Downloader Features
- TikTok Video: `.tiktok <url>`
- YouTube Video: `.yt <url>`
- YouTube MP3: `.ytmp3 <url>`
- Facebook Video: `.fb <url>`
- Instagram Post/Reel: `.ig <url>`

## 🚀 Quick Start
1. **Install dependencies:**
   ```bash
   git clone <repo-url>
   cd bot-wa
   npm install
   npm install abot-scraper --legacy-peer-deps
   ```
2. **Run the bot:**
   ```bash
   node index.js
   ```
3. **Scan the WhatsApp QR code** on first run.

## 📝 Example Commands
```
.tiktok https://vt.tiktok.com/...
.yt https://youtu.be/...
.ytmp3 https://youtu.be/...
.fb https://www.facebook.com/...
.ig https://www.instagram.com/p/...
```

- Maximum file size for video/audio: 48MB (WhatsApp limit)
- For more features, type `.menu` in WhatsApp

---

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 