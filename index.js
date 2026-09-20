/**
 * Audio Synthesis Engine: Real mechanical relay clicks using Web Audio API
 */
class HardwareAudio {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playClick(type = 'normal') {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            if (type === 'heavy') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'switch') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.02);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
                osc.start(now);
                osc.stop(now + 0.02);
            } else {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
                osc.start(now);
                osc.stop(now + 0.015);
            }
        } catch (e) { }
    }
}

const audio = new HardwareAudio();

// Toast Notifications
function showHardwareToast(title, msg, type = 'accent') {
    audio.playClick('switch');
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'hardware-toast hud-bracket';

    const iconClass = type === 'danger' ? 'fa-triangle-exclamation' : 'fa-info-circle';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon ${type}"></i>
        <div class="toast-body">
            <span class="toast-title">${title}</span>
            <span class="toast-desc">${msg}</span>
        </div>
        <button type="button" class="toast-close">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 200);
    });

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.isConnected) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 200);
        }
    }, 4000);
}

// Logowanie zdarzeń telemetrii
function logEvent(msg, type = 'info', customTag = null) {
    const feed = document.getElementById('eventTerminalLog');
    if (!feed) return;

    let cursor = feed.querySelector('.terminal-live-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'terminal-live-cursor';
        cursor.innerHTML = `<span class="cursor-block"></span><span>NASŁUCH MAGISTRALI...</span>`;
        feed.appendChild(cursor);
    }

    let tag = customTag;
    let cleanMsg = msg;

    if (!tag) {
        if (msg.includes(':')) {
            const parts = msg.split(':');
            const candidate = parts[0].trim();
            if (candidate.length <= 10) {
                tag = candidate.toUpperCase();
                cleanMsg = parts.slice(1).join(':').trim();
            }
        }
    }

    if (!tag) {
        tag = type === 'startup' ? 'SYS' :
            type === 'error' ? 'ERR' :
                type === 'warn' ? 'WARN' : 'BUS';
    }

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const row = document.createElement('div');
    row.className = `log-entry ${type}`;
    row.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-tag">${tag}</span>
        <span class="log-sep">❯</span>
        <span class="log-msg">${cleanMsg}</span>
    `;

    if (cursor && cursor.parentNode === feed) {
        feed.insertBefore(row, cursor);
    } else {
        feed.appendChild(row);
        feed.appendChild(cursor);
    }

    const entries = feed.querySelectorAll('.log-entry');
    if (entries.length > 80) {
        entries[0].remove();
    }

    feed.scrollTop = feed.scrollHeight;
}

// Generowanie widoku HTML aplikacji
const createMainContainer = () => {
    return `
    <div class="main-grid-container">
        <div id="visual-feed" class="panel hud-bracket">
            <div class="input-panel">
                <div class="panel-header">
                    <span>INPUT :: STRUMIEŃ MEDIÓW MAGISTRALI</span>
                    <span class="tactile-badge active"><span class="led-indicator active"></span> LIVE BUS</span>
                </div>
                <div class="input-row">
                    <input id="urlInput" type="text" class="tactile-input" placeholder="WKLEJ URL (MP4, HLS, YOUTUBE)..." onfocus="this.select()">
                    <div class="btn-bg">
                        <button id="loadBtn" class="btn btn-accent"><i class="fas fa-play"></i> ŁADUJ</button>
                    </div>
                    <div class="btn-bg">
                        <label class="btn file-input-btn">
                            <i class="fas fa-file-video"></i> PLIK
                            <input id="fileInput" type="file" accept="video/*,.m3u8">
                        </label>
                    </div>
                </div>
            </div>
            ${createPlayerSection()}
        </div>
        ${createSidePanels()}
        ${createBottomPanels()}
    </div>
    <div class="hardware-toast-container" id="toastContainer"></div>
    ${createModals()}`;
};

const createPlayerSection = () => {
    return `
    <div class="player-wrapper">
        <div class="player" id="playerContainer">
            <div class="stage" id="dropZone">
                <video id="video" playsinline crossorigin="anonymous"></video>
                <div class="spinner" id="spinner"></div>
            </div>
            ${createControls()}
        </div>
    </div>`;
};

const createControls = () => {
    return `
    <div class="ctrls hud-bracket" id="ctrls">
        <div class="progress">
            <input id="seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Pasek postępu" />
            <div class="time">
                <span id="cur">00:00</span>
                <span id="buffer-info">BUFFER: 0%</span>
                <span id="dur">00:00</span>
            </div>
        </div>
        <div class="grid">
            <div class="left">
                <div class="btn-bg"><button id="play" class="btn btn-icon"><i class="fas fa-play"></i></button></div>
                <div class="btn-bg"><button id="stop" class="btn btn-icon"><i class="fas fa-stop"></i></button></div>
                <div class="btn-bg"><button id="mute" class="btn btn-icon"><i class="fas fa-volume-up"></i></button></div>
                
                <div class="slider-chassis vol-slider-wrap">
                    <div class="slider-track-wrap">
                        <div class="slider-groove"></div>
                        <input id="vol" type="range" min="0" max="1" step="0.01" value="0.5" class="tactile-range-input" />
                    </div>
                </div>
                <div class="stepper-display vol-percent-display" id="vol-percent">50%</div>
            </div>
            
            <div class="right">
                <div class="custom-select drop-up" id="rate-select">
                    <select name="playbackRate" class="hidden">
                        <option value="0.5">0.5×</option>
                        <option value="0.75">0.75×</option>
                        <option value="1" selected>1×</option>
                        <option value="1.25">1.25×</option>
                        <option value="1.5">1.5×</option>
                        <option value="2">2×</option>
                    </select>
                    <div class="select-chassis">
                        <button type="button" class="select-trigger" aria-haspopup="listbox" aria-expanded="false">
                            <span class="trigger-content">
                                <i class="fas fa-gauge-high"></i>
                                <span class="trigger-text">1×</span>
                            </span>
                            <i class="fas fa-chevron-down chevron-icon"></i>
                        </button>
                    </div>
                    <div class="select-options" role="listbox">
                        <div class="option" data-value="0.5"><i class="fas fa-forward"></i>0.5×</div>
                        <div class="option" data-value="0.75"><i class="fas fa-forward"></i>0.75×</div>
                        <div class="option selected" data-value="1"><i class="fas fa-gauge-high"></i>1×</div>
                        <div class="option" data-value="1.25"><i class="fas fa-forward"></i>1.25×</div>
                        <div class="option" data-value="1.5"><i class="fas fa-forward"></i>1.5×</div>
                        <div class="option" data-value="2"><i class="fas fa-forward-fast"></i>2×</div>
                    </div>
                </div>

                <div class="btn-bg"><button id="pip" class="btn btn-icon" title="PiP"><i class="fas fa-clone"></i></button></div>
                <div class="btn-bg"><button id="fs" class="btn btn-icon" title="Pełny Ekran"><i class="fas fa-expand"></i></button></div>
            </div>
        </div>
    </div>`;
};

const createSidePanels = () => {
    return `
    <div id="playlist-panel" class="panel hud-bracket">
        <div class="panel-header">
            <span>PLAYLISTA MAGISTRALI</span>
            <span class="tactile-badge active" id="playlistCountBadge">0 WPISÓW</span>
        </div>
        <div class="panel-content playlist-content">
            <div class="playlist-controls">
                <div class="btn-bg"><button id="add-to-playlist" class="btn w-full"><i class="fas fa-plus"></i> DODAJ</button></div>
                <div class="btn-bg"><button id="clear-playlist" class="btn btn-danger w-full"><i class="fas fa-trash"></i> CZYŚĆ</button></div>
                <div class="btn-bg"><button id="convert-playlist" class="btn btn-success w-full"><i class="fas fa-shield-alt"></i> NOCOOKIE</button></div>
            </div>
            <div class="playlist-items" id="playlist-items">
                <p class="playlist-empty">Brak pozycji na liście</p>
            </div>
            <div class="playlist-navigation">
                <div class="btn-bg"><button id="prev-track" class="btn btn-icon"><i class="fas fa-step-backward"></i></button></div>
                <div class="btn-bg"><button id="next-track" class="btn btn-icon"><i class="fas fa-step-forward"></i></button></div>
                
                <label class="hardware-toggle ml-auto" id="autoplayToggleWrap">
                    <span class="toggle-chassis">
                        <span class="toggle-switch-track">
                            <span class="toggle-switch-thumb"></span>
                        </span>
                    </span>
                    <input id="autoplay-next" type="checkbox" class="hidden" />
                    <span class="autoplay-label">AUTOPLAY</span>
                </label>
            </div>
        </div>
    </div>`;
};

const createBottomPanels = () => {
    return `
    <div id="bottom-panels-container">
        <div id="system-log" class="panel hud-bracket panel-terminal">
            <div class="panel-header">
                <span>SYSTEM LOG [HEX BUS FEED]</span>
                <div class="btn-bg">
                    <button id="clearLogBtn" class="btn btn-xs">
                        WYCZYŚĆ
                    </button>
                </div>
            </div>
            <div class="panel-content">
                <div class="terminal-feed" id="eventTerminalLog">
                    <div class="log-entry startup">
                        <span class="log-time">[00:00:00.000]</span>
                        <span class="log-tag">SYS</span>
                        <span class="log-sep">❯</span>
                        <span class="log-msg">Tactile Hardware Media Deck ONLINE. Awaiting bus stream.</span>
                    </div>
                </div>
            </div>
        </div>

        <div id="aux-panel" class="panel hud-bracket">
            <div class="panel-header">KONSOLA I KLAWISZE STERUJĄCE</div>
            <div class="panel-content aux-content">
                <div class="aux-row">
                    <div class="btn-bg"><button id="shortcuts-btn" class="btn"><i class="fas fa-keyboard"></i> SKRÓTY KLAWISZY</button></div>
                    <div class="aux-display">
                        <span class="aux-label">LISTA SKRÓTÓW</span>
                        <span class="tactile-badge active"><span class="led-indicator active"></span> POMOC</span>
                    </div>
                </div>
                <div class="aux-row">
                    <div class="btn-bg"><button id="theme-toggle" class="btn"><i class="fas fa-circle-half-stroke"></i> PRZEŁĄCZ MOTYW</button></div>
                    <div class="aux-display">
                        <span class="aux-label">PROFIL WIZUALNY</span>
                        <span class="tactile-badge active"><span class="led-indicator active"></span> DARK / LIGHT</span>
                    </div>
                </div>
                <div class="aux-row">
                    <div class="btn-bg"><button id="sfx-master-toggle" class="btn btn-accent"><i class="fas fa-volume-high"></i> SFX PRZEKAŹNIKA: ON</button></div>
                    <div class="aux-display">
                        <span class="aux-label">AKUSTYKA SPRZĘTOWA</span>
                        <span class="tactile-badge active"><span class="led-indicator active"></span> RELAY</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

const createModals = () => {
    return `
    <div id="shortcuts-modal" class="modal-overlay" onclick="if(event.target === this) closeModal('shortcuts-modal')">
        <div class="modal hud-bracket">
            <div class="panel-header modal-header">
                <span><i class="fas fa-keyboard"></i> SKRÓTY KLAWIATURY STERUJĄCEJ</span>
                <div class="btn-bg">
                    <button class="btn btn-xs btn-icon" onclick="closeModal('shortcuts-modal')" aria-label="Zamknij"><i class="fas fa-xmark"></i></button>
                </div>
            </div>
            <div class="modal-body">
                <div class="shortcuts-list">
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">SPACJA</span>
                        <span class="shortcut-desc">Odtwarzaj / Pauza</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">S</span>
                        <span class="shortcut-desc">Zatrzymaj odtwarzanie</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">M</span>
                        <span class="shortcut-desc">Wycisz / Wyłącz wyciszenie</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">F</span>
                        <span class="shortcut-desc">Pełny ekran</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">T</span>
                        <span class="shortcut-desc">Przełącznik motywu (Dark / Light)</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">P</span>
                        <span class="shortcut-desc">Dodaj do playlisty</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">N / B</span>
                        <span class="shortcut-desc">Następny / Poprzedni utwór</span>
                    </div>
                    <div class="shortcut-item">
                        <span class="btn shortcut-key-badge">← / →</span>
                        <span class="shortcut-desc">Przewiń strumień +/- 5 sekund</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
};

// Custom Select Engine
function initCustomSelects(root = document) {
    root.querySelectorAll('.custom-select').forEach(select => {
        if (select.dataset.initialized) return;
        select.dataset.initialized = 'true';

        const trigger = select.querySelector('.select-trigger');
        const optionsContainer = select.querySelector('.select-options');
        const options = select.querySelectorAll('.option');
        const hiddenInput = select.querySelector('select');
        const triggerText = select.querySelector('.trigger-text');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.playClick('switch');
            const isOpen = select.classList.toggle('open');
            trigger.classList.toggle('active', isOpen);
            optionsContainer.classList.toggle('show', isOpen);
            trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                audio.playClick('heavy');
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                triggerText.textContent = opt.textContent.trim();
                if (hiddenInput) {
                    hiddenInput.value = opt.dataset.value;
                    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                select.classList.remove('open');
                trigger.classList.remove('active');
                optionsContainer.classList.remove('show');
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.open').forEach(s => {
            s.classList.remove('open');
            s.querySelector('.select-trigger').classList.remove('active');
            s.querySelector('.select-options').classList.remove('show');
        });
    });
}

// Media Engine
let hls = null;
let playlist = [];
let currentTrackIndex = -1;

function initializePlayer() {
    const video = document.getElementById('video');
    const playerContainer = document.getElementById('playerContainer');
    const dropZone = document.getElementById('dropZone');
    const urlInput = document.getElementById('urlInput');
    const loadBtn = document.getElementById('loadBtn');
    const fileInput = document.getElementById('fileInput');
    const playBtn = document.getElementById('play');
    const stopBtn = document.getElementById('stop');
    const muteBtn = document.getElementById('mute');
    const vol = document.getElementById('vol');
    const volPercent = document.getElementById('vol-percent');
    const seek = document.getElementById('seek');
    const cur = document.getElementById('cur');
    const dur = document.getElementById('dur');
    const bufferInfo = document.getElementById('buffer-info');
    const spinner = document.getElementById('spinner');

    video.volume = 0.5;
    initCustomSelects(playerContainer);

    const rateSelect = document.querySelector('#rate-select select');
    if (rateSelect) {
        rateSelect.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            video.playbackRate = val;
            logEvent(`SPEED: Mnożnik odtwarzania ${val}×`, 'info');
            showHardwareToast('PRĘDKOŚĆ ODTWARZANIA', `Ustawiono ${val}×`);
        });
    }

    function detachHls() {
        if (hls) {
            hls.destroy();
            hls = null;
        }
    }

    function restoreVideoPlayer() {
        const existingIframe = dropZone.querySelector('.youtube-iframe');
        if (existingIframe) existingIframe.remove();
        video.classList.remove('hidden');
    }

    function loadVideo(source) {
        if (!source) return;
        audio.playClick('heavy');

        if (typeof source === 'string' && (extractYouTubeVideoId(source) || isYouTubePlaylist(source))) {
            const isPlaylist = isYouTubePlaylist(source);

            if (isPlaylist) {
                const playlistId = extractYouTubePlaylistId(source);
                const videoId = extractYouTubeVideoId(source);
                loadYouTubePlaylist(playlistId, videoId);
                logEvent(`YOUTUBE: Załadowano playlistę ${playlistId}`, 'success');
                showHardwareToast('YOUTUBE PLAYLIST', `Załadowano listę: ${playlistId}`);
            } else {
                const videoId = extractYouTubeVideoId(source);
                loadYouTubeVideo(videoId);
                logEvent(`YOUTUBE: Załadowano wideo ${videoId}`, 'success');
                showHardwareToast('YOUTUBE WIDEO', `Załadowano: ${videoId}`);
            }
            spinner.classList.remove('active');
            localStorage.setItem('player_last_url', source);
            return;
        }

        restoreVideoPlayer();
        detachHls();
        spinner.classList.add('active');

        const src = (source instanceof File) ? URL.createObjectURL(source) : source;
        const isHls = (source instanceof File) ? /\.m3u8$/i.test(source.name) : /\.m3u8(\?\vert{}$)/i.test(src);
        const name = (source instanceof File) ? source.name : source;

        try {
            if (isHls) {
                if (window.Hls && Hls.isSupported()) {
                    hls = new Hls({ enableWorker: true });
                    hls.loadSource(src);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            logEvent(`BŁĄD HLS: ${data.details}`, 'error');
                            showHardwareToast('BŁĄD HLS', data.details, 'danger');
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = src;
                } else {
                    throw new Error('Przeglądarka nie wspiera HLS');
                }
            } else {
                video.src = src;
            }

            video.play().catch(() => { });
            logEvent(`MEDIA: Załadowano źródło [${name}]`, 'success');
            showHardwareToast('ŁADOWANIE ŹRÓDŁA', `Pomyślnie zainicjowano strumień.`);
            if (typeof source === 'string') localStorage.setItem('player_last_url', source);
        } catch (err) {
            spinner.classList.remove('active');
            logEvent(`BŁĄD ODTWARZACZA: ${err.message}`, 'error');
            showHardwareToast('BŁĄD STRUMIENIA', err.message, 'danger');
        }
    }

    loadBtn.addEventListener('click', () => loadVideo(urlInput.value.trim()));
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadBtn.click(); });
    fileInput.addEventListener('change', (e) => loadVideo(e.target.files[0]));

    playBtn.addEventListener('click', () => {
        audio.playClick('switch');
        if (video.paused) {
            video.play();
            logEvent('ODTWARZACZ: Wznowiono odtwarzanie', 'info');
        } else {
            video.pause();
            logEvent('ODTWARZACZ: Wstrzymano odtwarzanie', 'info');
        }
    });

    stopBtn.addEventListener('click', () => {
        audio.playClick('heavy');
        video.pause();
        video.currentTime = 0;
        logEvent('ODTWARZACZ: Zatrzymano strumień (STOP)', 'info');
    });

    muteBtn.addEventListener('click', () => {
        audio.playClick('switch');
        video.muted = !video.muted;
    });

    video.addEventListener('volumechange', () => {
        const val = video.muted ? 0 : Math.round(video.volume * 100);
        vol.value = video.muted ? 0 : video.volume;
        volPercent.textContent = `${val}%`;
    });

    vol.addEventListener('input', (e) => {
        video.volume = parseFloat(e.target.value);
        video.muted = video.volume === 0;
    });

    video.addEventListener('timeupdate', () => {
        const value = video.duration ? (video.currentTime / video.duration) : 0;
        seek.value = Math.round(value * 1000);
        seek.style.setProperty('--seek', `${(value * 100).toFixed(2)}%`);

        let maxBufferedEnd = 0;
        if (video.buffered.length) {
            for (let i = 0; i < video.buffered.length; i++) {
                if (video.buffered.end(i) > maxBufferedEnd) maxBufferedEnd = video.buffered.end(i);
            }
        }
        const bPct = video.duration ? Math.round((maxBufferedEnd / video.duration) * 100) : 0;
        seek.style.setProperty('--buffer', `${bPct}%`);
        bufferInfo.textContent = `BUFFER: ${bPct}%`;

        const fmt = (s) => {
            if (!isFinite(s)) return '00:00';
            const m = Math.floor(s / 60);
            const ss = Math.floor(s % 60);
            return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
        };

        cur.textContent = fmt(video.currentTime);
        dur.textContent = fmt(video.duration);
    });

    seek.addEventListener('input', () => {
        if (isFinite(video.duration)) {
            video.currentTime = (Number(seek.value) / 1000) * video.duration;
        }
    });

    video.addEventListener('playing', () => { spinner.classList.remove('active'); });
    video.addEventListener('waiting', () => { spinner.classList.add('active'); });

    video.addEventListener('ended', () => {
        const autoplay = document.getElementById('autoplay-next');
        if (autoplay && autoplay.checked && playlist.length > 0) {
            logEvent('AUTOPLAY: Uruchamianie następnej pozycji playlisty...', 'info');
            setTimeout(playNextTrack, 800);
        }
    });

    // Hebelek Autoplay
    const autoplayToggle = document.getElementById('autoplayToggleWrap');
    const autoplayInput = document.getElementById('autoplay-next');
    autoplayToggle.addEventListener('click', () => {
        autoplayInput.checked = !autoplayInput.checked;
        autoplayToggle.classList.toggle('checked', autoplayInput.checked);
        audio.playClick('switch');
        logEvent(`PRZEŁĄCZNIK: Autoplay &rarr; ${autoplayInput.checked ? 'WŁĄCZONY' : 'WYŁĄCZONY'}`, 'info');
    });

    // Pełny Ekran i PiP
    document.getElementById('fs').addEventListener('click', () => {
        audio.playClick('heavy');
        if (!document.fullscreenElement) { playerContainer.requestFullscreen(); }
        else { document.exitFullscreen(); }
    });

    document.getElementById('pip').addEventListener('click', async () => {
        audio.playClick('heavy');
        try {
            if (document.pictureInPictureElement) { await document.exitPictureInPicture(); }
            else if (document.pictureInPictureEnabled) { await video.requestPictureInPicture(); }
        } catch (e) {
            showHardwareToast('BŁĄD PiP', 'Funkcja niedostępna', 'danger');
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    }));
    ['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
    }));
    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files?.[0];
        if (file) {
            loadVideo(file);
        }
    });

    // YouTube Embed Functions
    function loadYouTubeVideo(videoId) {
        restoreVideoPlayer();
        video.classList.add('hidden');
        const iframe = document.createElement('iframe');
        iframe.className = 'youtube-iframe';
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&controls=1&cc_load_policy=1`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        dropZone.appendChild(iframe);
    }

    function loadYouTubePlaylist(playlistId, startVideoId) {
        restoreVideoPlayer();
        video.classList.add('hidden');
        let embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0&controls=1&cc_load_policy=1`;
        if (startVideoId) {
            embedUrl = `https://www.youtube-nocookie.com/embed/${startVideoId}?list=${playlistId}&autoplay=1&rel=0&controls=1&cc_load_policy=1`;
        }
        const iframe = document.createElement('iframe');
        iframe.className = 'youtube-iframe';
        iframe.src = embedUrl;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        dropZone.appendChild(iframe);
    }

    const last = localStorage.getItem('player_last_url');
    if (last) urlInput.value = last;

    window._loadMedia = loadVideo;
}

// Obsługa Playlisty
function updatePlaylistUI() {
    const container = document.getElementById('playlist-items');
    const countBadge = document.getElementById('playlistCountBadge');
    if (!container) return;

    countBadge.textContent = `${playlist.length} WPISÓW`;

    if (playlist.length === 0) {
        container.innerHTML = '<p class="playlist-empty">Brak pozycji na liście</p>';
        return;
    }

    container.innerHTML = playlist.map((item, index) => `
        <div class="playlist-item ${index === currentTrackIndex ? 'current' : ''}" onclick="playTrack(${index})">
            <div class="playlist-meta">
                <div class="playlist-item-title">
                    <i class="fa-solid ${item.isPlaylist ? 'fa-list' : 'fa-film'} text-highlight playlist-icon"></i>
                    ${item.title}
                </div>
                <div class="playlist-item-url">${item.url}</div>
            </div>
            <div class="btn-bg">
                <button class="btn btn-icon btn-sm" onclick="event.stopPropagation(); removeTrack(${item.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addToPlaylist(url) {
    if (!url) return;
    const cleanUrl = url.replace(/youtube\.com/g, 'youtube-nocookie.com').trim();
    const item = {
        id: Date.now() + Math.random(),
        url: cleanUrl,
        title: extractTitle(cleanUrl),
        isPlaylist: isYouTubePlaylist(cleanUrl)
    };
    playlist.push(item);
    localStorage.setItem('video_playlist', JSON.stringify(playlist));
    updatePlaylistUI();
    audio.playClick('heavy');
    logEvent(`PLAYLISTA: Dodano wpis [${item.title}]`, 'success');
    showHardwareToast('DODANO DO PLAYLISTY', item.title);
}

function removeTrack(id) {
    audio.playClick('switch');
    playlist = playlist.filter(item => item.id !== id);
    localStorage.setItem('video_playlist', JSON.stringify(playlist));
    updatePlaylistUI();
}

function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentTrackIndex = index;
    const item = playlist[index];
    window._loadMedia(item.url);
    document.getElementById('urlInput').value = item.url;
    updatePlaylistUI();
}

function playNextTrack() {
    if (!playlist.length) return;
    let next = currentTrackIndex + 1;
    if (next >= playlist.length) next = 0;
    playTrack(next);
}

function playPreviousTrack() {
    if (!playlist.length) return;
    let prev = currentTrackIndex - 1;
    if (prev < 0) prev = playlist.length - 1;
    playTrack(prev);
}

function extractYouTubeVideoId(url) {
    const match = url.match(/(?:watch\?v=|youtu\.be\/|embed\/)([^&\n?#]+)/);
    return match ? match[1] : null;
}

function extractYouTubePlaylistId(url) {
    const match = url.match(/[?&]list=([^&\n?#]+)/);
    return match ? match[1] : null;
}

function isYouTubePlaylist(url) {
    return !!extractYouTubePlaylistId(url);
}

function extractTitle(url) {
    const pId = extractYouTubePlaylistId(url);
    const vId = extractYouTubeVideoId(url);
    if (pId) return `YT Playlist [${pId.slice(0, 10)}...]`;
    if (vId) return `YT Track [${vId}]`;
    return url.split('/').pop().split('?')[0] || 'Media Stream';
}

// Inicjalizacja Aplikacji i Zdarzeń UI
function initializeUI() {
    const themeBtn = document.getElementById('theme-toggle');
    themeBtn.addEventListener('click', () => {
        audio.playClick('switch');
        const curr = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = curr === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.setAttribute('theme', next);
        logEvent(`MOTYW: Przełączono na profil ${next.toUpperCase()}`, 'info');
        showHardwareToast('ZMIANA MOTYWU', `Aktywny profil: ${next.toUpperCase()}`);
    });

    const sfxBtn = document.getElementById('sfx-master-toggle');
    sfxBtn.addEventListener('click', () => {
        audio.enabled = !audio.enabled;
        sfxBtn.innerHTML = `<i class="fas fa-volume-high"></i> SFX PRZEKAŹNIKA: ${audio.enabled ? 'ON' : 'OFF'}`;
        sfxBtn.classList.toggle('btn-accent', audio.enabled);
        if (audio.enabled) audio.playClick('heavy');
        logEvent(`SFX PRZEKAŹNIKÓW: ${audio.enabled ? 'AKTYWNE' : 'WYŁĄCZONE'}`, 'info');
    });

    document.getElementById('clearLogBtn').addEventListener('click', () => {
        audio.playClick('heavy');
        const feed = document.getElementById('eventTerminalLog');
        if (feed) {
            feed.innerHTML = '';
            logEvent('Pamięć bufora wyczyszczona. Magistrala zresetowana.', 'startup', 'SYS');
        }
    });

    document.getElementById('shortcuts-btn').addEventListener('click', () => {
        audio.playClick('switch');
        document.getElementById('shortcuts-modal').classList.add('show');
    });

    document.getElementById('add-to-playlist').addEventListener('click', () => {
        const val = document.getElementById('urlInput').value.trim();
        if (val) addToPlaylist(val);
    });

    document.getElementById('clear-playlist').addEventListener('click', () => {
        audio.playClick('heavy');
        playlist = [];
        localStorage.removeItem('video_playlist');
        updatePlaylistUI();
        logEvent('PLAYLISTA: Wyczyszczono wszystkie wpisy', 'error');
    });

    document.getElementById('convert-playlist').addEventListener('click', () => {
        audio.playClick('heavy');
        playlist.forEach(item => item.url = item.url.replace(/youtube\.com/g, 'youtube-nocookie.com'));
        localStorage.setItem('video_playlist', JSON.stringify(playlist));
        updatePlaylistUI();
        logEvent('BEZPIECZEŃSTWO: Skonwertowano wpisy do trybu youtube-nocookie', 'success');
        showHardwareToast('TRYB NOCOOKIE', 'Wszystkie adresy YouTube zabezpieczone.');
    });

    document.getElementById('prev-track').addEventListener('click', () => {
        audio.playClick('switch');
        playPreviousTrack();
    });

    document.getElementById('next-track').addEventListener('click', () => {
        audio.playClick('switch');
        playNextTrack();
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.show');
            if (openModal) {
                closeModal(openModal.id);
                return;
            }
        }
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                document.getElementById('play').click();
                break;
            case 'KeyS':
                e.preventDefault();
                document.getElementById('stop').click();
                break;
            case 'KeyM':
                document.getElementById('mute').click();
                break;
            case 'KeyF':
                e.preventDefault();
                document.getElementById('fs').click();
                break;
            case 'KeyT':
                e.preventDefault();
                themeBtn.click();
                break;
            case 'KeyP':
                e.preventDefault();
                document.getElementById('add-to-playlist').click();
                break;
            case 'KeyN':
                e.preventDefault();
                playNextTrack();
                break;
            case 'KeyB':
                e.preventDefault();
                playPreviousTrack();
                break;
            case 'ArrowRight':
                const vidR = document.getElementById('video');
                vidR.currentTime = Math.min(vidR.currentTime + 5, vidR.duration || 0);
                break;
            case 'ArrowLeft':
                const vidL = document.getElementById('video');
                vidL.currentTime = Math.max(vidL.currentTime - 5, 0);
                break;
        }
    });

    try {
        const stored = localStorage.getItem('video_playlist');
        if (stored) playlist = JSON.parse(stored);
    } catch (e) {
        playlist = [];
    }
    updatePlaylistUI();
}

function closeModal(id) {
    audio.playClick('switch');
    document.getElementById(id).classList.remove('show');
}

// Inicjalizacja przy starcie
document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = createMainContainer();
    initializePlayer();
    initializeUI();
    logEvent('Tactile Hardware Command Center & Telemetry Stream ONLINE.', 'startup');
});