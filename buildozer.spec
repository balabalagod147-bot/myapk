[app]
# (应用基本信息)
title = 刘的小软件（Android版）
package.name = liu_password
package.domain = com.liu.apk
source.dir = .
source.include_exts = py, kv, png, jpg, jpeg, txt, xlsx
version = 1.0.0

# (应用依赖)
requirements = python3,kivy,plyer,openpyxl

# (屏幕方向和全屏设置)
orientation = portrait
fullscreen = 0

# (图标)
icon.filename = icon.png

# (Android 权限)
android.permissions = WRITE_EXTERNAL_STORAGE, READ_EXTERNAL_STORAGE

# (SDK 和 NDK 版本)
android.minapi = 24
android.sdk = 33
android.ndk = 25b

[buildozer]
# (日志级别，2为最详细)
log_level = 2
warn_on_root = 1