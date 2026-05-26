"use strict";

/**
 * أداة تتبع إحداثيات العناصر على الشاشة
 * مطوّرة لمجتمع OpenAutoJS
 * المطوّر: https://github.com/v22YO
 *
 * المميزات:
 * - قص ذكي للشاشة
 * - واجهة عائمة قابلة للسحب
 * - نسخ الإحداثيات بنقرة واحدة
 * - إيقاف تلقائي وتنظيف الذاكرة
 */

if (!requestScreenCapture()) {
    toast("تم رفض صلاحية التقاط الشاشة");
    exit();
}

const config = {
    threshold: 0.8,
    interval: 1000
};

let template = null;
let lastPos = null;
let isScanning = false;

// 1. بناء الواجهة العائمة الرئيسية
let window = floaty.window(
    <frame bg="#D9000000" cornerRadius="8dp" padding="10dp">
        <vertical>
            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="dragHandle" text="✥ اسحب من هنا" textColor="#AAAAAA" textSize="12sp" textStyle="bold" layout_weight="1" />
                <button id="closeBtn" text="❌" textColor="#FF3333" textSize="14sp" bg="#00000000" padding="4 4" style="Widget.AppCompat.Button.Borderless" w="35dp" h="35dp" />
            </horizontal>

            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="coords" text="لم يتم تحديد هدف" textColor="#FFFFFF" textSize="16sp" textStyle="bold" layout_weight="1" />
                <button id="copyBtn" text="📋 نسخ" textColor="#FFFFFF" textSize="12sp" bg="#444444" padding="4 8" style="Widget.AppCompat.Button.Borderless" />
            </horizontal>

            <button id="cropBtn" text="📸 تحديد هدف جديد من الشاشة" textColor="#FFFFFF" bg="#007ACC" textStyle="bold" style="Widget.AppCompat.Button" />
        </vertical>
    </frame>
);

window.setPosition(50, 150);

// 2. تحريك النافذة الرئيسية
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

// 3. زر الإغلاق
window.closeBtn.click(() => {
    toast("🛑 تم إيقاف السكريبت وتنظيف الذاكرة");
    exit();
});

// 4. نسخ الإحداثيات
window.copyBtn.click(() => {
    if (lastPos) {
        setClip(lastPos);
        toast("✅ تم نسخ: " + lastPos);
    } else {
        toast("❌ لا توجد إحداثيات حالياً");
    }
});

// 5. أداة القص الذكية
window.cropBtn.click(() => {
    isScanning = false;

    // إخفاء النافذة مؤقتاً لكي لا تظهر في اللقطة
    window.setPosition(-2000, -2000);

    // ✅ setTimeout بدلاً من sleep() لتجنب تجميد UI thread
    setTimeout(() => {
        let fullScreenImg = captureScreen();
        if (!fullScreenImg) {
            toast("❌ فشل التقاط الشاشة");
            window.setPosition(50, 150);
            return;
        }

        toast("اسحب بإصبعك لتحديد الهدف 🎯");

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
                        template = images.clip(fullScreenImg, x, y, w, h);

                        ui.run(() => {
                            window.coords.setText("جاري الفحص...");
                            window.coords.setTextColor(colors.parseColor("#FFFF00"));
                            window.setPosition(50, 150);
                        });
                        isScanning = true;
                    } else {
                        toast("❌ تحديد صغير جداً، ألغيت العملية");
                        window.setPosition(50, 150);
                    }
                    return true;
            }
            return true;
        });

    }, 400); // انتظار 400ms للتأكد من اختفاء النافذة قبل اللقطة
});

// 6. حلقة الفحص في الخلفية
setInterval(() => {
    if (!isScanning || !template) return;

    let screen = captureScreen();
    if (!screen) return;

    let p = images.findImage(screen, template, { threshold: config.threshold });

    if (p) {
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
                window.coords.setText("مفقود ❓");
                window.coords.setTextColor(colors.parseColor("#FF0000"));
            });
        }
    }
}, config.interval);

// 7. تنظيف الذاكرة عند الخروج
events.on("exit", () => {
    if (template) template.recycle();
    if (window) window.close();
    log("Resources released.");
});
