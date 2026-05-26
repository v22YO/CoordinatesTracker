"use strict";

/**
 * Open Source Image-to-UI Coordinate Tracker
 * Developed for the OpenAuto.js Community
 * Author: https://github.com/v22YO
 * * Features: 
 * - Smart Screen Cropping
 * - Floating UI with Drag & Drop
 * - One-Tap Clipboard Copy
 * - Auto Exit & Memory Cleanup
 */

if (!requestScreenCapture()) {
    toast("Screen capture permission denied");
    exit();
}

const config = {
    threshold: 0.8,
    interval: 1000 
};

let template = null;
let lastPos = null;
let isScanning = false;

// 1. Build the main floating interface
let window = floaty.window(
    <frame bg="#D9000000" cornerRadius="8dp" padding="10dp">
        <vertical>
            {/* Top bar containing drag handle and close button */}
            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="dragHandle" text="✥ Drag Here" textColor="#AAAAAA" textSize="12sp" textStyle="bold" layout_weight="1" />
                <button id="closeBtn" text="❌" textColor="#FF3333" textSize="14sp" bg="#00000000" padding="4 4" style="Widget.AppCompat.Button.Borderless" w="35dp" h="35dp" />
            </horizontal>
            
            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="coords" text="No target selected" textColor="#FFFFFF" textSize="16sp" textStyle="bold" layout_weight="1" />
                <button id="copyBtn" text="📋 Copy" textColor="#FFFFFF" textSize="12sp" bg="#444444" padding="4 8" style="Widget.AppCompat.Button.Borderless" />
            </horizontal>
            
            <button id="cropBtn" text="📸 Select Target from Screen" textColor="#FFFFFF" bg="#007ACC" textStyle="bold" style="Widget.AppCompat.Button" />
        </vertical>
    </frame>
);

window.setPosition(50, 150);

// 2. Implement Drag & Drop for the main window
let vx, vy, dx, dy;
window.dragHandle.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            vx = event.getRawX(); vy = event.getRawY();
            dx = window.getX(); dy = window.getY();
            return true;
        case event.ACTION_MOVE:
            window.setPosition(dx + (event.getRawX() - vx), dy + (event.getRawY() - vy));
            return true;
    }
    return true;
});

// 3. Close button logic to terminate the script
window.closeBtn.click(() => {
    toast("🛑 Script stopped & memory cleared.");
    exit();
});

// 4. Copy coordinates to clipboard
window.copyBtn.click(() => {
    if (lastPos) {
        setClip(lastPos);
        toast("✅ Coordinates copied: " + lastPos);
    } else {
        toast("❌ No coordinates to copy.");
    }
});

// 5. Smart Cropping Tool (Screenshot & Selection)
window.cropBtn.click(() => {
    isScanning = false; 
    
    // Hide the main window temporarily to prevent it from appearing in the screenshot
    window.setPosition(-2000, -2000); 
    
    // Start a background thread to prevent UI freezing
    threads.start(() => {
        sleep(400); 
        
        let fullScreenImg = captureScreen();
        if (!fullScreenImg) {
            toast("❌ Screen capture failed.");
            ui.run(() => window.setPosition(50, 150));
            return;
        }
        
        toast("Drag your finger to select the target 🎯");
        
        let selectWin = floaty.rawWindow(
            <frame bg="#40000000" layout_width="match_parent" layout_height="match_parent">
                <canvas id="canvas" layout_width="match_parent" layout_height="match_parent" />
            </frame>
        );
        selectWin.setTouchable(true);
        
        let startX = 0, startY = 0, endX = 0, endY = 0;
        let isDrawing = false;
        let paint = new Paint();
        paint.setColor(colors.parseColor("#00FF00")); 
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(8);
        
        selectWin.canvas.on("draw", function(canvas) {
            // Clear the canvas on every frame to avoid black screen issue
            canvas.drawColor(0, android.graphics.PorterDuff.Mode.CLEAR); 
            if (isDrawing) {
                canvas.drawRect(startX, startY, endX, endY, paint);
            }
        });
        
        selectWin.canvas.setOnTouchListener(function(view, event) {
            switch (event.getAction()) {
                case event.ACTION_DOWN:
                    startX = event.getX();
                    startY = event.getY();
                    isDrawing = true;
                    return true;
                case event.ACTION_MOVE:
                    endX = event.getX();
                    endY = event.getY();
                    return true;
                case event.ACTION_UP:
                    isDrawing = false;
                    endX = event.getX();
                    endY = event.getY();
                    
                    let w = Math.abs(endX - startX);
                    let h = Math.abs(endY - startY);
                    let x = Math.min(startX, endX);
                    let y = Math.min(startY, endY);
                    
                    selectWin.close(); 
                    
                    if (w > 10 && h > 10) {
                        if (template) template.recycle();
                        
                        // Crop the selected region
                        template = images.clip(fullScreenImg, x, y, w, h);
                        
                        ui.run(() => {
                            window.coords.setText("Scanning...");
                            window.coords.setTextColor(colors.parseColor("#FFFF00"));
                            window.setPosition(50, 150); 
                        });
                        
                        isScanning = true; 
                    } else {
                        toast("❌ Selection too small, canceled.");
                        ui.run(() => window.setPosition(50, 150));
                    }
                    return true;
            }
            return true;
        });
    });
});

// 6. Background scanning loop
setInterval(() => {
    if (!isScanning || !template) return;

    let screen = captureScreen();
    if (!screen) return;

    let p = images.findImage(screen, template, { threshold: config.threshold });

    if (p) {
        // Calculate the center coordinates of the found image
        let curPos = Math.round(p.x + template.width / 2) + "," + Math.round(p.y + template.height / 2);

        if (lastPos !== curPos) {
            lastPos = curPos;
            
            ui.run(() => {
                window.coords.setText(curPos);
                window.coords.setTextColor(colors.parseColor("#00FF00"));
            });
        }
    } else {
        if (lastPos !== null) {
            lastPos = null;
            ui.run(() => {
                window.coords.setText("Missing ❓");
                window.coords.setTextColor(colors.parseColor("#FF0000"));
            });
        }
    }
}, config.interval);

// 7. Memory cleanup on exit
events.on("exit", () => {
    if (template) template.recycle();
    if (window) window.close();
    log("Resources released.");
});
