import string
import secrets
import datetime
import os

from kivy.app import App
from kivy.lang import Builder
from kivy.uix.boxlayout import BoxLayout
from kivy.properties import NumericProperty, BooleanProperty, StringProperty, ListProperty
from kivy.metrics import dp
from kivy.clock import Clock

# 可用：在安卓/桌面都能用
try:
    from plyer import clipboard
    PLYER_CLIPBOARD = True
except Exception:
    PLYER_CLIPBOARD = False
    clipboard = None

# 可选：保存Excel
try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except Exception:
    OPENPYXL_AVAILABLE = False
    openpyxl = None


SIMILAR_CHARS = "I1LoO0"


def calc_strength(password: str) -> int:
    """与原逻辑等价的强度评分（0-100）。"""
    strength = 0
    length = len(password)
    if length >= 8: strength += 20
    if length >= 12: strength += 20
    if length >= 16: strength += 10
    if any(c.islower() for c in password): strength += 10
    if any(c.isupper() for c in password): strength += 10
    if any(c.isdigit() for c in password): strength += 15
    if not password.isalnum(): strength += 15
    return min(strength, 100)


def pick_color_by_strength(score: int):
    """返回强度条颜色，RGB 0-1。红/黄/绿。"""
    if score < 40:
        return (0.84, 0.19, 0.19)  # #d63031
    elif score < 75:
        return (0.99, 0.80, 0.43)  # #fdcb6e
    else:
        return (0.0, 0.72, 0.58)   # #00b894


class PasswordRoot(BoxLayout):
    # 绑定到UI的状态
    length_value = NumericProperty(12)
    use_lower = BooleanProperty(True)
    use_upper = BooleanProperty(True)
    use_digits = BooleanProperty(True)
    use_symbols = BooleanProperty(True)
    exclude_similar = BooleanProperty(True)
    custom_chars = StringProperty("")  # 可选自定义字符

    single_result = StringProperty("点击生成按钮生成密码")
    strength_score = NumericProperty(0)
    strength_color = ListProperty([0.84, 0.19, 0.19, 1])  # RGBA
    batch_text = StringProperty("")
    batch_count_text = StringProperty("5")

    def on_kv_post(self, base_widget):
        # 初始化颜色条宽度
        Clock.schedule_once(self._init_strength_bar, 0)

    def _init_strength_bar(self, _dt):
        self.update_strength_bar("")

    def _build_char_pool(self):
        pool = ""
        if self.use_lower: pool += string.ascii_lowercase
        if self.use_upper: pool += string.ascii_uppercase
        if self.use_digits: pool += string.digits
        if self.use_symbols: pool += "!@#$%^&*"
        if self.custom_chars:
            pool += self.custom_chars

        if self.exclude_similar:
            pool = "".join([c for c in pool if c not in SIMILAR_CHARS])

        return pool

    def _generate_one(self):
        pool = self._build_char_pool()
        if not pool:
            return None, "错误：请至少选择一个字符集（或添加自定义字符）！"
        if len(pool) == 0:
            return None, "错误：排除相似字符后，字符池为空！"

        length = int(self.length_value)
        pw = ''.join(secrets.choice(pool) for _ in range(length))
        return pw, "成功"

    def generate_single(self):
        pw, msg = self._generate_one()
        if not pw:
            self.single_result = msg
            self.update_strength_bar("")
            return
        self.single_result = pw
        self.update_strength_bar(pw)

    def update_strength_bar(self, password: str):
        score = calc_strength(password)
        self.strength_score = score
        r, g, b = pick_color_by_strength(score)
        self.strength_color = [r, g, b, 1]

        # 更新可视长度
        bar = self.ids.strength_fill
        full = self.ids.strength_bg.width
        # 根据分数比例设置填充条宽度
        target_w = max(0, min(full, full * (score / 100.0)))
        bar.width = target_w

        # 文本标签
        label = self.ids.strength_label
        if score == 0:
            label.text = "强度：0"
        elif score < 40:
            label.text = f"强度：弱（{score}）"
        elif score < 75:
            label.text = f"强度：中（{score}）"
        else:
            label.text = f"强度：强（{score}）"

    def copy_single(self):
        pw = self.single_result or ""
        if pw.startswith("点击") or pw.startswith("错误") or len(pw.strip()) == 0:
            self._toast("无可复制的密码")
            return
        if PLYER_CLIPBOARD:
            clipboard.copy(pw)
            self._toast("已复制到剪贴板")
        else:
            self._toast("复制失败：无剪贴板模块")

    def generate_batch(self):
        text = self.batch_count_text.strip()
        try:
            count = int(text)
        except ValueError:
            self.batch_text = "请输入有效的数字。"
            return

        if count <= 0 or count > 100:
            self.batch_text = "请输入 1 到 100 之间的数字。"
            return

        lines = []
        for i in range(count):
            pw, msg = self._generate_one()
            if not pw:
                self.batch_text = msg
                return
            lines.append(f"{i+1}. {pw}")
        self.batch_text = "\n".join(lines)

    def copy_batch(self):
        content = self.batch_text.strip()
        if not content:
            self._toast("没有可复制的批量结果")
            return
        if PLYER_CLIPBOARD:
            clipboard.copy(content)
            self._toast("批量结果已复制")
        else:
            self._toast("复制失败：无剪贴板模块")

    def _default_filename(self, suffix: str):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"passwords_{ts}.{suffix}"

    def _user_save_path(self, fname: str):
        """
        将文件保存到应用数据目录（安卓/桌面都可用）。
        你也可以改用 Android 共享存储（需要 androidstorage4kivy 或 SAF），
        这里选择最稳妥的 app 私有目录。
        """
        app_dir = App.get_running_app().user_data_dir
        os.makedirs(app_dir, exist_ok=True)
        return os.path.join(app_dir, fname)

    def save_txt(self):
        content = self.batch_text.strip()
        if not content:
            self._toast("没有可保存的密码，请先批量生成")
            return
        fname = self._default_filename("txt")
        path = self._user_save_path(fname)
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            self._toast(f"已保存：{path}")
        except Exception as e:
            self._toast(f"保存失败：{e}")

    def save_excel(self):
        if not OPENPYXL_AVAILABLE:
            self._toast("缺少 openpyxl，无法保存为 Excel（pip 安装后重打包）")
            return
        content = self.batch_text.strip()
        if not content:
            self._toast("没有可保存的密码，请先批量生成")
            return
        fname = self._default_filename("xlsx")
        path = self._user_save_path(fname)
        try:
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Passwords"
            ws.append(["序号", "密码"])
            lines = content.splitlines()
            for line in lines:
                if ". " in line:
                    idx, pw = line.split(". ", 1)
                    ws.append([idx, pw])
            wb.save(path)
            self._toast(f"已保存：{path}")
        except Exception as e:
            self._toast(f"保存失败：{e}")

    def _toast(self, msg: str):
        # 简单弹条，可替换成 android toast
        try:
            from kivy.uix.label import Label
            from kivy.core.window import Window
            from kivy.animation import Animation
            label = Label(text=msg, size_hint=(None, None),
                          color=(1,1,1,1), padding=(dp(12), dp(8)))
            label.texture_update()
            label.size = (label.texture_size[0] + dp(24), label.texture_size[1] + dp(16))
            label.canvas.before.clear()
            with label.canvas.before:
                from kivy.graphics import Color, RoundedRectangle
                Color(0,0,0,0.7)
                label._bg = RoundedRectangle(radius=[dp(10)], size=label.size, pos=(Window.width/2 - label.width/2, dp(80)))
            def _update_bg(*_):
                label._bg.pos = (Window.width/2 - label.width/2, dp(80))
                label._bg.size = label.size
            label.bind(size=_update_bg)
            App.get_running_app().root.add_widget(label)
            anim = Animation(opacity=1, d=0.1) + Animation(opacity=1, d=1.2) + Animation(opacity=0, d=0.4)
            def _remove(*args):
                if label.parent:
                    App.get_running_app().root.remove_widget(label)
            anim.bind(on_complete=_remove)
            anim.start(label)
        except Exception:
            # 兜底到控制台
            print(msg)


class PasswordApp(App):
    title = "刘的小软件（Android版）"

    def build(self):
        return PasswordRoot()


if __name__ == "__main__":
    PasswordApp().run()
