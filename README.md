# 🎯 Image-to-UI Coordinate Tracker
> AutoJS floating tool that finds any UI element on screen and returns its live coordinates.

![AutoJS](https://img.shields.io/badge/AutoJS-Pro-blue?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Android-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## ✨ Features

- 📸 **Smart Screen Cropping** — Draw a box around any element to set it as a tracking target
- 🎯 **Live Coordinate Tracking** — Continuously scans the screen and reports center X,Y
- 📋 **One-Tap Copy** — Copy coordinates to clipboard instantly
- 🪟 **Draggable Floating UI** — Move the overlay anywhere on screen
- 🧹 **Auto Memory Cleanup** — Recycles bitmaps on exit to prevent memory leaks
- 🌐 **Bilingual** — English (`Coordinates_v2_EN.js`) and Arabic (`Coordinates_v2_AR.js`) versions

---

## 📋 Requirements

- Android device
- [AutoJS Pro](https://pro.autojs.org/) or [AutoX.js](https://github.com/kkevsekk1/AutoX)
- Screen capture permission granted

---

## 🚀 Installation

### Option 1 — Direct import into AutoJS
1. Download the `.js` file
2. Open AutoJS → tap **+** → **Import**
3. Select the file and run it

### Option 2 — Via Termux / ADB
```bash
adb push Coordinates_v2_EN.js /sdcard/脚本/
```

---

## 🖥️ Usage

1. **Run the script** — a floating window appears
2. **Tap 📸 Select Target** — screen dims, draw a box around your target element
3. **Watch coordinates update** — center X,Y shown in real time
4. **Tap 📋 Copy** — coordinates copied to clipboard
5. **Tap ❌** — stops the script and frees memory

---

## 📁 File Structure

```
├── Coordinates_v2_EN.js   # English version
├── Coordinates_v2_AR.js   # Arabic version (النسخة العربية)
└── README.md
```

---

## ⚙️ Configuration

Inside the script, adjust these values:

```javascript
const config = {
    threshold: 0.8,   // Match sensitivity (0.0 – 1.0)
    interval: 1000    // Scan frequency in ms
};
```

| Parameter   | Default | Description |
|-------------|---------|-------------|
| `threshold` | `0.8`   | Higher = stricter image match |
| `interval`  | `1000`  | Milliseconds between each scan |

---

## 🔧 Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| `不能在ui线程执行阻塞操作` | Replaced `sleep()` with `setTimeout()` in UI thread |
| Black canvas overlay | Used `PorterDuff.Mode.CLEAR` instead of semi-transparent fill |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Credits

Developed for the **OpenAutoJS Community**  
Author: [@v22YO](https://github.com/v22YO)
