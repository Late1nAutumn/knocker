// Knocker - 托盘定时提醒小程序
// 编译：运行 build.bat（使用系统自带 .NET Framework 4.x 的 csc，语法限制为 C# 5）

using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Knocker
{
    enum AlarmState { Stopped, Counting, Ringing, Snoozing }

    // ---------------- 配置 ----------------
    class Settings
    {
        public int IntervalMinutes = 60;
        public int SnoozeMinutes = 5;
        public string AudioPath = "";
        public string Message = "该休息一下了！";

        static string FilePath
        {
            get { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "knocker.ini"); }
        }

        public static Settings Load()
        {
            var s = new Settings();
            if (!File.Exists(FilePath)) return s;
            try
            {
                foreach (var line in File.ReadAllLines(FilePath, Encoding.UTF8))
                {
                    int eq = line.IndexOf('=');
                    if (eq <= 0) continue;
                    string key = line.Substring(0, eq).Trim();
                    string val = line.Substring(eq + 1);
                    int n;
                    switch (key)
                    {
                        case "IntervalMinutes": if (int.TryParse(val, out n) && n > 0) s.IntervalMinutes = n; break;
                        case "SnoozeMinutes": if (int.TryParse(val, out n) && n > 0) s.SnoozeMinutes = n; break;
                        case "AudioPath": s.AudioPath = val; break;
                        case "Message": s.Message = Unescape(val); break;
                    }
                }
            }
            catch { }
            return s;
        }

        public void Save()
        {
            var lines = new List<string>();
            lines.Add("IntervalMinutes=" + IntervalMinutes);
            lines.Add("SnoozeMinutes=" + SnoozeMinutes);
            lines.Add("AudioPath=" + AudioPath);
            lines.Add("Message=" + Escape(Message));
            File.WriteAllLines(FilePath, lines.ToArray(), Encoding.UTF8);
        }

        static string Escape(string s)
        {
            return s.Replace("\\", "\\\\").Replace("\r", "").Replace("\n", "\\n");
        }

        static string Unescape(string s)
        {
            var sb = new StringBuilder();
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] == '\\' && i + 1 < s.Length)
                {
                    char c = s[++i];
                    sb.Append(c == 'n' ? "\r\n" : c.ToString());
                }
                else sb.Append(s[i]);
            }
            return sb.ToString();
        }
    }

    // ---------------- 音频（WPF MediaPlayer，必须在 UI 线程上调用） ----------------
    static class Audio
    {
        static System.Windows.Media.MediaPlayer player;
        static int session;

        // 打开失败是异步通知的，onFailed 在 UI 线程上回调
        public static bool PlayLoop(string path, Action onFailed)
        {
            Stop();
            if (string.IsNullOrEmpty(path) || !File.Exists(path)) return false;
            if (player == null)
            {
                player = new System.Windows.Media.MediaPlayer();
                player.MediaEnded += delegate
                {
                    player.Position = TimeSpan.Zero;
                    player.Play();
                };
            }
            int current = ++session;
            EventHandler<System.Windows.Media.ExceptionEventArgs> failed = null;
            failed = delegate
            {
                player.MediaFailed -= failed;
                if (current != session) return;
                Stop();
                if (onFailed != null) onFailed();
            };
            player.MediaFailed += failed;
            player.Open(new Uri(Path.GetFullPath(path)));
            player.Play();
            return true;
        }

        public static void Stop()
        {
            session++;
            if (player == null) return;
            player.Stop();
            player.Close();
        }
    }

    // ---------------- 图标：优先读取 exe 同目录的 icon.png ----------------
    static class AppIcons
    {
        public static Icon Window { get; private set; }
        public static Icon Tray { get; private set; }

        public static void Load()
        {
            string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "icon.png");
            if (File.Exists(path))
            {
                try
                {
                    using (var ms = new MemoryStream(File.ReadAllBytes(path)))
                    using (var src = Image.FromStream(ms))
                    {
                        Window = FromImage(src, 32);
                        Tray = FromImage(src, SystemInformation.SmallIconSize.Width);
                        return;
                    }
                }
                catch { }
            }
            Icon fallback = null;
            try { fallback = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch { }
            Window = Tray = fallback ?? SystemIcons.Information;
        }

        static Icon FromImage(Image src, int size)
        {
            using (var bmp = new Bitmap(size, size, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
            {
                using (var g = Graphics.FromImage(bmp))
                {
                    g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                    g.DrawImage(src, 0, 0, size, size);
                }
                return Icon.FromHandle(bmp.GetHicon());
            }
        }
    }

    // ---------------- 提醒弹窗（右下角） ----------------
    class AlarmPopup : Form
    {
        public event EventHandler Confirmed;
        public event EventHandler Snoozed;

        readonly Label timeLabel;
        readonly System.Windows.Forms.Timer clock;

        public AlarmPopup(string message, int snoozeMinutes)
        {
            Text = "提醒";
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            ControlBox = false;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            AutoScaleMode = AutoScaleMode.Dpi;
            Font = new Font("Microsoft YaHei UI", 9f);
            ClientSize = new Size(320, 200);
            BackColor = Color.White;

            timeLabel = new Label
            {
                Font = new Font("Microsoft YaHei UI", 20f, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(10, 10),
                Size = new Size(300, 44)
            };
            var msgLabel = new Label
            {
                Text = message,
                Font = new Font("Microsoft YaHei UI", 11f),
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(10, 58),
                Size = new Size(300, 90)
            };
            var btnConfirm = new Button
            {
                Text = "确认",
                Location = new Point(40, 158),
                Size = new Size(110, 32)
            };
            var btnSnooze = new Button
            {
                Text = "稍后提醒（" + snoozeMinutes + " 分钟）",
                Location = new Point(170, 158),
                Size = new Size(110, 32)
            };
            btnConfirm.Click += delegate { Raise(Confirmed); };
            btnSnooze.Click += delegate { Raise(Snoozed); };
            Controls.AddRange(new Control[] { timeLabel, msgLabel, btnConfirm, btnSnooze });
            AcceptButton = btnConfirm;

            clock = new System.Windows.Forms.Timer { Interval = 500 };
            clock.Tick += delegate { UpdateTime(); };
            UpdateTime();
            clock.Start();
        }

        void UpdateTime()
        {
            timeLabel.Text = DateTime.Now.ToString("HH:mm:ss");
        }

        void Raise(EventHandler h)
        {
            if (h != null) h(this, EventArgs.Empty);
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            Rectangle wa = Screen.PrimaryScreen.WorkingArea;
            Location = new Point(wa.Right - Width - 12, wa.Bottom - Height - 12);
        }

        protected override bool ShowWithoutActivation { get { return false; } }

        protected override void Dispose(bool disposing)
        {
            if (disposing) clock.Dispose();
            base.Dispose(disposing);
        }
    }

    // ---------------- 主界面 + 托盘 ----------------
    class MainForm : Form
    {
        readonly Settings settings;
        readonly NotifyIcon tray;
        readonly System.Windows.Forms.Timer ticker;

        readonly Label statusLabel;
        readonly NumericUpDown numInterval;
        readonly NumericUpDown numSnooze;
        readonly TextBox txtAudio;
        readonly TextBox txtMessage;
        readonly Button btnPreview;
        readonly Button btnToggle;
        readonly ToolTip toolTip;
        readonly ToolStripMenuItem menuToggle;

        AlarmState state;
        DateTime deadline;
        AlarmPopup popup;
        bool previewing;
        bool exiting;

        public MainForm()
        {
            settings = Settings.Load();

            Text = "Knocker 定时提醒";
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Dpi;
            Font = new Font("Microsoft YaHei UI", 9f);
            ClientSize = new Size(440, 380);
            Icon = AppIcons.Window;

            statusLabel = new Label
            {
                Font = new Font("Microsoft YaHei UI", 14f, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Location = new Point(12, 12),
                Size = new Size(362, 40),
                BorderStyle = BorderStyle.FixedSingle
            };
            btnToggle = new Button
            {
                Font = new Font("Segoe UI Symbol", 14f),
                Location = new Point(380, 12),
                Size = new Size(48, 40)
            };
            toolTip = new ToolTip();

            numInterval = MakeNumber(settings.IntervalMinutes, 100, 66);
            numSnooze = MakeNumber(settings.SnoozeMinutes, 100, 100);

            txtAudio = new TextBox { Text = settings.AudioPath, Location = new Point(100, 134), Size = new Size(200, 24) };
            var btnBrowse = new Button { Text = "浏览…", Location = new Point(306, 132), Size = new Size(58, 28) };
            btnPreview = new Button { Text = "试听", Location = new Point(370, 132), Size = new Size(58, 28) };

            txtMessage = new TextBox
            {
                Text = settings.Message,
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                Location = new Point(100, 170),
                Size = new Size(328, 100)
            };

            var btnSave = new Button { Text = "保存设置", Location = new Point(100, 285), Size = new Size(100, 32) };
            var btnRestart = new Button { Text = "重新开始计时", Location = new Point(210, 285), Size = new Size(110, 32) };
            var tip = new Label
            {
                Text = "关闭窗口会缩到托盘，在托盘右键菜单里退出程序。\n修改的提醒间隔从下一次开始计时起生效。",
                ForeColor = Color.Gray,
                Location = new Point(12, 328),
                Size = new Size(416, 40)
            };

            Controls.AddRange(new Control[]
            {
                statusLabel, btnToggle,
                MakeLabel("提醒间隔", 68), numInterval, MakeLabel("分钟", 68, 210),
                MakeLabel("稍后提醒", 102), numSnooze, MakeLabel("分钟", 102, 210),
                MakeLabel("提醒音频", 137), txtAudio, btnBrowse, btnPreview,
                MakeLabel("提示文字", 172), txtMessage,
                btnSave, btnRestart, tip
            });

            btnBrowse.Click += delegate { BrowseAudio(); };
            btnPreview.Click += delegate { TogglePreview(); };
            btnSave.Click += delegate { SaveSettings(); };
            btnRestart.Click += delegate { Restart(); };
            btnToggle.Click += delegate { ToggleRunning(); };

            // 托盘
            var menu = new ContextMenuStrip();
            menuToggle = new ToolStripMenuItem("停止", null, delegate { ToggleRunning(); });
            menu.Items.Add(menuToggle);
            menu.Items.Add("重新开始计时", null, delegate { Restart(); });
            menu.Items.Add("打开主界面", null, delegate { ShowMain(); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("退出", null, delegate { ExitApp(); });
            tray = new NotifyIcon
            {
                Icon = AppIcons.Tray,
                ContextMenuStrip = menu,
                Visible = true,
                Text = "Knocker"
            };
            tray.DoubleClick += delegate { ShowMain(); };

            ticker = new System.Windows.Forms.Timer { Interval = 1000 };
            ticker.Tick += delegate { OnTick(); };

            StartCounting();
            ticker.Start();
        }

        Label MakeLabel(string text, int y, int x = 12)
        {
            return new Label { Text = text, Location = new Point(x, y + 3), AutoSize = true };
        }

        NumericUpDown MakeNumber(int value, int x, int y)
        {
            return new NumericUpDown
            {
                Minimum = 1,
                Maximum = 1440,
                Value = Math.Max(1, Math.Min(1440, value)),
                Location = new Point(x, y),
                Size = new Size(100, 24)
            };
        }

        // ---------- 计时逻辑 ----------
        void StartCounting()
        {
            state = AlarmState.Counting;
            deadline = DateTime.Now.AddMinutes(settings.IntervalMinutes);
            UpdateStatus();
        }

        void StopRunning()
        {
            Audio.Stop();
            ClosePopup();
            state = AlarmState.Stopped;
            UpdateStatus();
        }

        void ToggleRunning()
        {
            if (state == AlarmState.Stopped) StartCounting();
            else StopRunning();
        }

        void OnTick()
        {
            if ((state == AlarmState.Counting || state == AlarmState.Snoozing) && DateTime.Now >= deadline)
                Ring();
            UpdateStatus();
        }

        void Ring()
        {
            state = AlarmState.Ringing;
            StopPreview();
            Audio.PlayLoop(settings.AudioPath, null);

            ClosePopup();
            popup = new AlarmPopup(settings.Message, settings.SnoozeMinutes);
            popup.Confirmed += delegate
            {
                Audio.Stop();
                ClosePopup();
                StartCounting();
            };
            popup.Snoozed += delegate
            {
                Audio.Stop();
                ClosePopup();
                state = AlarmState.Snoozing;
                deadline = DateTime.Now.AddMinutes(settings.SnoozeMinutes);
                UpdateStatus();
            };
            popup.Show();
            popup.Activate();
        }

        void Restart()
        {
            Audio.Stop();
            ClosePopup();
            StartCounting();
        }

        void ClosePopup()
        {
            if (popup == null) return;
            popup.Close();
            popup.Dispose();
            popup = null;
        }

        void UpdateStatus()
        {
            string text;
            if (state == AlarmState.Stopped)
            {
                text = "已停止";
            }
            else if (state == AlarmState.Ringing)
            {
                text = "正在提醒，等待确认";
            }
            else
            {
                TimeSpan left = deadline - DateTime.Now;
                if (left < TimeSpan.Zero) left = TimeSpan.Zero;
                string span = string.Format("{0:D2}:{1:D2}:{2:D2}", (int)left.TotalHours, left.Minutes, left.Seconds);
                text = (state == AlarmState.Snoozing ? "稍后提醒还有 " : "距下次提醒 ") + span;
            }
            statusLabel.Text = text;
            tray.Text = "Knocker - " + text;

            bool stopped = state == AlarmState.Stopped;
            btnToggle.Text = stopped ? "▶" : "■";
            toolTip.SetToolTip(btnToggle, stopped ? "开始" : "停止");
            menuToggle.Text = stopped ? "开始" : "停止";
        }

        // ---------- 设置 ----------
        void BrowseAudio()
        {
            using (var dlg = new OpenFileDialog())
            {
                dlg.Title = "选择提醒音频";
                dlg.Filter = "音频文件|*.mp3;*.wav;*.wma;*.m4a|所有文件|*.*";
                if (File.Exists(txtAudio.Text)) dlg.FileName = txtAudio.Text;
                if (dlg.ShowDialog(this) == DialogResult.OK) txtAudio.Text = dlg.FileName;
            }
        }

        void TogglePreview()
        {
            if (previewing) { StopPreview(); return; }
            if (state == AlarmState.Ringing) return;
            if (!Audio.PlayLoop(txtAudio.Text, OnPreviewFailed))
            {
                OnPreviewFailed();
                return;
            }
            previewing = true;
            btnPreview.Text = "停止";
        }

        void OnPreviewFailed()
        {
            previewing = false;
            btnPreview.Text = "试听";
            MessageBox.Show(this, "无法播放该音频文件。", "试听", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        void StopPreview()
        {
            if (!previewing) return;
            Audio.Stop();
            previewing = false;
            btnPreview.Text = "试听";
        }

        void SaveSettings()
        {
            settings.IntervalMinutes = (int)numInterval.Value;
            settings.SnoozeMinutes = (int)numSnooze.Value;
            settings.AudioPath = txtAudio.Text.Trim();
            settings.Message = txtMessage.Text;
            try
            {
                settings.Save();
                MessageBox.Show(this, "设置已保存。", "保存设置", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(this, "保存失败：" + ex.Message, "保存设置", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        // ---------- 窗口 / 托盘 ----------
        void ShowMain()
        {
            Show();
            WindowState = FormWindowState.Normal;
            Activate();
        }

        void ExitApp()
        {
            exiting = true;
            Close();
        }

        protected override void OnResize(EventArgs e)
        {
            base.OnResize(e);
            if (WindowState == FormWindowState.Minimized) Hide();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (!exiting && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                StopPreview();
                Hide();
                return;
            }
            base.OnFormClosing(e);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            ticker.Stop();
            Audio.Stop();
            ClosePopup();
            tray.Visible = false;
            tray.Dispose();
            base.OnFormClosed(e);
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            bool created;
            using (var mutex = new Mutex(true, "Knocker_SingleInstance_Mutex", out created))
            {
                if (!created)
                {
                    MessageBox.Show("Knocker 已在运行，请在托盘中查看。", "Knocker", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                AppIcons.Load();
                Application.Run(new MainForm());
            }
        }
    }
}
