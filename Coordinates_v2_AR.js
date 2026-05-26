"use strict";

/**
 * متتبع إحداثيات الصورة إلى واجهة المستخدم مفتوح المصدر
 * تم تطويره لمجتمع OpenAuto.js
 * المؤلف: https://github.com/v22YO
 * 
 * المميزات:
 * - اقتصاص ذكي للشاشة
 * - واجهة عائمة تدعم السحب والإفلات
 * - نسخ الإحداثيات بنقرة واحدة
 * - خروج تلقائي وتنظيف الذاكرة
 */

if (!requestScreenCapture()) {
    toast("تم رفض إذن التقاط الشاشة");
    exit();
}

const config = {
    threshold: 0.8,
    interval: 1000 
};

let template = null;
let lastPos = null;
let isScanning = false;

// 1. بناء واجهة العائمة الرئيسية
let window = floaty.window(
    <frame bg="#D9000000" cornerRadius="8dp" padding="10dp">
        <vertical>
            {/* شريط العلوي يحتوي على مقبض السحب وزر الإغلاق */}
            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="dragHandle" text="✥ اسحب من هنا" textColor="#AAAAAA" textSize="12sp" textStyle="bold" layout_weight="1" />
                <button id="closeBtn" text="❌" textColor="#FF3333" textSize="14sp" bg="#00000000" padding="4 4" style="Widget.AppCompat.Button.Borderless" w="35dp" h="35dp" />
            </horizontal>
            
            <horizontal gravity="center_vertical" marginBottom="5dp">
                <text id="coords" text="لم يتم اختيار هدف بعد" textColor="#FFFFFF" textSize="16sp" textStyle="bold" layout_weight="1" />
                <button id="copyBtn" text="📋 نسخ" textColor="#FFFFFF" textSize="12sp" bg="#444444" padding="4 8" style="Widget.AppCompat.Button.Borderless" />
            </horizontal>
            
            <button id="cropBtn" text="📸 اختر الهدف من الشاشة" textColor="#FFFFFF" bg="#007ACC" textStyle="bold" style="Widget.AppCompat.Button" />
        </vertical>
    </frame>
);

window.setPosition(50, 150);

// 2. تنفيذ خاصية السحب والإفلات للنافذة الرئيسية
let vx, vy, dx, dy;
window.dragHandle.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
        case event.ACTION_DOWN:
            vx = event.getRawX(); 
            vy = event.getRawY();
            dx = window.getX(); 
            dy = window.getY();
            return true;
        case event.ACTION_MOVE:
            window.setPosition(dx + (event.getRawX() - vx), dy + (event.getRawY() - vy));
            return true;
    }
    return true;
});

// 3. زر الإغلاق لإنهاء السكربت
window.closeBtn.click(() => {
    toast("🛑 تم إيقاف السكربت وتنظيف الذاكرة.");
    exit();
});

// 4. نسخ الإحداثيات إلى الحافظة
window.copyBtn.click(() => {
    if (lastPos) {
        setClip(lastPos);
        toast("✅ تم نسخ الإحداثيات: " + lastPos);
    } else {
        toast("❌ لا توجد إحداثيات لنسخها.");
    }
});

// 5. أداة الاقتصاص الذكية (التقاط الشاشة واختيار المنطقة)
window.cropBtn.click(() => {
    isScanning = false; 
    
    // إخفاء النافذة الرئيسية مؤقتاً لتجنب ظهورها في الصورة
    window.setPosition(-2000, -2000); 
    
    // تشغيل في خيط خلفي لتجنب تجميد واجهة المستخدم
    threads.start(() => {
        sleep(400); 
        
        let fullScreenImg = captureScreen();
        if (!fullScreenImg) {
            toast("❌ فشل في التقاط الشاشة.");
            ui.run(() => window.setPosition(50, 150));
            return;
        }
        
        toast("اسحب إصبعك لتحديد الهدف 🎯");
        
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
                        
                        // اقتصاص المنطقة المحددة
                        template = images.clip(fullScreenImg, x, y, w, h);
                        
                        ui.run(() => {
                            window.coords.setText("جاري المسح...");
                            window.coords.setTextColor(colors.parseColor("#FFFF00"));
                            window.setPosition(50, 150); 
                        });
                        
                        isScanning = true; 
                    } else {
                        toast("❌ التحديد صغير جداً، تم الإلغاء.");
                        ui.run(() => window.setPosition(50, 150));
                    }
                    return true;
            }
            return true;
        });
    });
});

// 6. حلقة المسح في الخلفية
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
    log("تم تحرير الموارد.");
});