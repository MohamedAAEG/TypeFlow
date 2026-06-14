// TypeFlow V2.0 - Onboarding-driven typing & English learning platform

document.addEventListener("DOMContentLoaded", () => {

  // ============================ STATE ============================
  const STORAGE = {
    theme:      "typeflow_theme",
    sound:      "typeflow_sound_type",
    soundOn:    "typeflow_sound_enabled",
    users:      "typeflow_users",
    current:    "typeflow_current_user",
    history:    "typeflow_history",
    profile:    "typeflow_profile",       // { goal, level, reason, size }
    progress:   "typeflow_progress",      // { "english:jobs:B1:medium": [done indexes] }
    customCtnt: "typeflow_custom_content",// admin: [{ track, reason?, level?, size, content, id }]
    userCtnt:   "typeflow_user_content",  // per-user library: { username: { folders, items } }
    overlay:    "typeflow_default_overlay", // per-user additions to default workspaces
                                             // { username: { "reason:level:size": [text, ...] } }
    adminEdits: "typeflow_admin_edits",   // admin overrides for default content (CRUD)
                                             // { reasons: [...], content: { "reason:level:size": [texts] } }
    grammarLevels: "typeflow_grammar_levels" // grammar quests: { questId: { completed, bestScore, lastLevel } }
  };

  // ============================ SUPABASE (shared user store) ============================
  // Users live in a shared Postgres DB so the admin sees everyone across devices.
  // The publishable key is meant to be public; data is protected by RLS + SECURITY DEFINER RPCs.
  const SUPA_URL = "https://waqujaacvcodnpxsuooz.supabase.co";
  const SUPA_KEY = "sb_publishable_WNJOZDD41n0B2A7-e8J4Lg_BLnSo2nw";
  // Only use the network store over http(s); fall back to localStorage on file:// (insecure context).
  const SUPA_ON = location.protocol === "http:" || location.protocol === "https:";

  async function supaRpc(fn, args) {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(args || {})
    });
    if (!res.ok) throw new Error(`rpc ${fn} -> HTTP ${res.status}`);
    return await res.json();
  }

  // Admin password is kept for the tab session so the admin panel can authorize list/delete calls.
  function setAdminCreds(username, password) {
    try { sessionStorage.setItem("typeflow_admin_key", JSON.stringify({ username, password })); } catch {}
  }
  function getAdminCreds() {
    try { return JSON.parse(sessionStorage.getItem("typeflow_admin_key") || "null"); } catch { return null; }
  }

  let currentTheme = localStorage.getItem(STORAGE.theme) || "dark";
  let soundType    = localStorage.getItem(STORAGE.sound) || "blue";
  let isSoundEnabled = localStorage.getItem(STORAGE.soundOn) !== "false";
  let isFocusMode  = false;

  let usersDB = JSON.parse(localStorage.getItem(STORAGE.users) || "[]");
  if (!usersDB.some(u => u.username.toLowerCase() === "admin")) {
    // Seeded as legacy plain-text; upgraded to a salted hash on first login.
    usersDB.push({ username: "admin", email: "admin@typeflow.com", password: "admin123" });
    localStorage.setItem(STORAGE.users, JSON.stringify(usersDB));
  }
  let currentUser = JSON.parse(localStorage.getItem(STORAGE.current) || "null");

  let historyData = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
  let profile     = JSON.parse(localStorage.getItem(STORAGE.profile) || "null");
  let progress    = JSON.parse(localStorage.getItem(STORAGE.progress) || "{}");
  let customCtnt  = JSON.parse(localStorage.getItem(STORAGE.customCtnt) || "[]");
  let userCtntDB  = JSON.parse(localStorage.getItem(STORAGE.userCtnt) || "{}");
  let overlayDB   = JSON.parse(localStorage.getItem(STORAGE.overlay) || "{}");
  let adminEditsDB= JSON.parse(localStorage.getItem(STORAGE.adminEdits) || '{"reasons":null,"content":{},"deleted":{}}');
  let grammarProgress = JSON.parse(localStorage.getItem(STORAGE.grammarLevels) || "{}");
  // adminEditsDB structure:
  //   reasons:  null (use default REASONS array) | [ {id, name_ar, name_en, icon}, ... ]
  //   content:  { "reasonId:level:size": [texts] }  — replaces default content for that key
  //   deleted:  { "reasonId:level:size": true }     — marks that default is deleted entirely

  // ─── Profile schema augmentation (keep old fields, add new ones for v2.4) ───
  let profileDirty = false;
  if (profile) {
    if (!profile.workspace) {
      if (profile.goal === "typing") {
        profile.workspace = { type: "typing", lang: profile.lang || "en" };
      } else if (profile.folderId && profile.folderId !== "all") {
        profile.workspace = { type: "user", folderId: profile.folderId };
      } else {
        profile.workspace = { type: "default", reason: profile.reason || "jobs", level: profile.level || "A1" };
      }
      profileDirty = true;
    }
    if (!Array.isArray(profile.sizes) || profile.sizes.length === 0) {
      profile.sizes = profile.size ? [profile.size] : ["medium"];
      profileDirty = true;
    }
    // Keep legacy single 'size' in sync as the FIRST selected size (used by older render code)
    if (!profile.size && profile.sizes && profile.sizes.length) {
      profile.size = profile.sizes[0];
      profileDirty = true;
    }
    if (profileDirty) localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
  }

  // Keep legacy fields synced with workspace (called whenever workspace changes)
  function syncProfileLegacy() {
    if (!profile || !profile.workspace) return;
    const ws = profile.workspace;
    if (ws.type === "default") {
      profile.goal = "english";
      profile.reason = ws.reason;
      profile.level = ws.level;
      profile.folderId = "all";
    } else if (ws.type === "user") {
      profile.goal = "english";  // legacy hint
      profile.folderId = ws.folderId;
    } else if (ws.type === "typing") {
      profile.goal = "typing";
      profile.lang = ws.lang || "en";
    }
    if (profile.sizes && profile.sizes.length > 0) profile.size = profile.sizes[0];
  }

  const DEFAULT_FOLDER = { id: "default", name: "الرئيسي", icon: "📁", locked: true };

  // ============================ WORKSPACE HELPERS ============================
  // A workspace is either a default (reason+level) or a user folder or typing.
  // Format: { type: "default"|"user"|"typing", reason?, level?, folderId?, lang? }

  function workspaceKey(ws) {
    if (!ws) return "";
    if (ws.type === "default") return `default:${ws.reason}:${ws.level}`;
    if (ws.type === "user")    return `user:${ws.folderId}`;
    if (ws.type === "typing")  return `typing:${ws.lang || "en"}`;
    if (ws.type === "learning") return "learning";
    return "";
  }

  function workspaceLabel(ws) {
    if (!ws) return "—";
    if (ws.type === "default") {
      const r = getReasons().find(x => x.id === ws.reason);
      const l = CEFR_LEVELS.find(x => x.id === ws.level);
      return `${r?.icon || "📁"} ${r?.name_ar || ws.reason} · ${l?.id || ws.level}`;
    }
    if (ws.type === "user") {
      const f = getUserFolders().find(x => x.id === ws.folderId);
      return f ? `${f.icon} ${f.name}` : "📁 مجلد";
    }
    if (ws.type === "typing") {
      return `⌨️ تعلم الكتابة (${(ws.lang || "en").toUpperCase()})`;
    }
    if (ws.type === "learning") return "📚 قائمة التعلم";
    return "—";
  }

  // ============================ ADMIN EDITS (REASONS + CONTENT) ============================
  function saveAdminEdits() { localStorage.setItem(STORAGE.adminEdits, JSON.stringify(adminEditsDB)); }

  function getReasons() {
    return Array.isArray(adminEditsDB.reasons) && adminEditsDB.reasons.length > 0
      ? adminEditsDB.reasons
      : REASONS;
  }

  // Returns the effective default content for (reason, level, size):
  //   admin override > deleted (empty) > built-in default
  function getDefaultContent(reason, level, size) {
    const key = `${reason}:${level}:${size}`;
    if (adminEditsDB.deleted && adminEditsDB.deleted[key]) return [];
    if (adminEditsDB.content && Array.isArray(adminEditsDB.content[key])) {
      return adminEditsDB.content[key];
    }
    return getContent(reason, level, size);
  }

  // ============================ DEFAULT-WORKSPACE OVERLAY (per user) ============================
  function getOverlayBucket() {
    const key = (currentUser ? currentUser.username : "guest").toLowerCase();
    if (!overlayDB[key]) overlayDB[key] = {};
    return overlayDB[key];
  }
  function saveOverlay() { localStorage.setItem(STORAGE.overlay, JSON.stringify(overlayDB)); }

  // Get user overlay additions for (reason, level, size) — array of { id, content, addedAt, source }
  function getOverlayItems(reason, level, size) {
    const bucket = getOverlayBucket();
    const k = `${reason}:${level}:${size}`;
    return Array.isArray(bucket[k]) ? bucket[k] : [];
  }
  function addOverlayItem(reason, level, size, item) {
    const bucket = getOverlayBucket();
    const k = `${reason}:${level}:${size}`;
    if (!Array.isArray(bucket[k])) bucket[k] = [];
    bucket[k].push(item);
    saveOverlay();
  }
  function setOverlayItems(reason, level, size, items) {
    const bucket = getOverlayBucket();
    const k = `${reason}:${level}:${size}`;
    bucket[k] = items;
    saveOverlay();
  }
  // Reset all overlay additions for an entire (reason × level) workspace across all sizes
  function resetOverlayWorkspace(reason, level) {
    const bucket = getOverlayBucket();
    SIZE_OPTIONS.forEach(s => { delete bucket[`${reason}:${level}:${s.id}`]; });
    saveOverlay();
  }

  // ============================ USER CONTENT (v2.3: folders) ============================
  // Migrate any legacy structure (plain array) → { folders, items }
  function migrateUserBucket(bucket) {
    if (Array.isArray(bucket)) {
      return {
        folders: [{ ...DEFAULT_FOLDER, createdAt: Date.now() }],
        items: bucket.map(i => ({ ...i, folderId: i.folderId || "default" }))
      };
    }
    if (!bucket || typeof bucket !== "object") {
      return { folders: [{ ...DEFAULT_FOLDER, createdAt: Date.now() }], items: [] };
    }
    if (!Array.isArray(bucket.folders) || bucket.folders.length === 0) {
      bucket.folders = [{ ...DEFAULT_FOLDER, createdAt: Date.now() }];
    }
    if (!bucket.folders.some(f => f.id === "default")) {
      bucket.folders.unshift({ ...DEFAULT_FOLDER, createdAt: Date.now() });
    }
    if (!Array.isArray(bucket.items)) bucket.items = [];
    // Ensure every item has a folderId
    bucket.items = bucket.items.map(i => ({ ...i, folderId: i.folderId || "default" }));
    return bucket;
  }

  // One-shot migration of the whole DB
  Object.keys(userCtntDB).forEach(k => { userCtntDB[k] = migrateUserBucket(userCtntDB[k]); });
  localStorage.setItem(STORAGE.userCtnt, JSON.stringify(userCtntDB));

  function getUsernameKey() {
    return currentUser ? currentUser.username.toLowerCase() : "guest";
  }
  function getUserBucket() {
    const key = getUsernameKey();
    if (!userCtntDB[key]) userCtntDB[key] = migrateUserBucket(null);
    return userCtntDB[key];
  }
  function saveUserBucket() {
    localStorage.setItem(STORAGE.userCtnt, JSON.stringify(userCtntDB));
  }
  function getUserFolders() { return getUserBucket().folders; }
  function getUserContent(folderId) {
    const items = getUserBucket().items;
    if (!folderId || folderId === "all") return items;
    return items.filter(i => (i.folderId || "default") === folderId);
  }
  function setUserContent(items) {
    getUserBucket().items = items;
    saveUserBucket();
  }
  function addUserFolder(name, icon) {
    const f = {
      id: "f_" + Date.now() + "_" + Math.floor(Math.random() * 9999),
      name: (name || "").trim() || "بدون اسم",
      icon: (icon || "📁").slice(0, 2),
      createdAt: Date.now()
    };
    getUserBucket().folders.push(f);
    saveUserBucket();
    return f;
  }
  function renameUserFolder(id, name, icon) {
    const folders = getUserBucket().folders;
    const f = folders.find(x => x.id === id);
    if (!f || f.locked) return;
    if (name && name.trim()) f.name = name.trim();
    if (icon) f.icon = icon.slice(0, 2);
    saveUserBucket();
  }
  function deleteUserFolder(id) {
    const bucket = getUserBucket();
    const f = bucket.folders.find(x => x.id === id);
    if (!f || f.locked) return;
    // Move items to default folder rather than orphan them
    bucket.items = bucket.items.map(i =>
      i.folderId === id ? { ...i, folderId: "default" } : i
    );
    bucket.folders = bucket.folders.filter(x => x.id !== id);
    saveUserBucket();
  }
  function folderName(id) {
    const f = getUserFolders().find(x => x.id === (id || "default"));
    return f ? `${f.icon} ${f.name}` : "📁 الرئيسي";
  }

  // ============================ SIZE CLASSIFIER ============================
  // Auto-classifies any text into one of: words, chunks, small, medium, large
  function classifySize(text) {
    const t = (text || "").trim();
    if (!t) return "small";
    const charCount = t.length;
    const wordCount = t.split(/\s+/).filter(Boolean).length;
    const hasSentenceEnd = /[.!?؟]/.test(t);
    const sentences = t.split(/[.!?؟]+/).filter(s => s.trim().length > 0);

    // Comma-separated list with many short items → words list
    if (wordCount >= 5 && t.includes(",") && !hasSentenceEnd) return "words";
    // Single token
    if (wordCount === 1) return "words";
    // Short phrase, no sentence ending → chunk
    if (wordCount <= 6 && charCount < 60 && !hasSentenceEnd) return "chunks";
    // 1-2 sentences and short
    if (charCount < 100 && sentences.length <= 2) return "small";
    // 3-4 sentences or medium length
    if (charCount < 250 && sentences.length <= 4) return "medium";
    // Otherwise long
    return "large";
  }

  function sizeLabel(sizeId) {
    const s = SIZE_OPTIONS.find(x => x.id === sizeId);
    return s ? `${s.icon} ${s.name_ar}` : sizeId;
  }

  // Typing engine state
  let currentParagraphs = [];
  let currentIndex = 0;
  let currentText = "";
  let typedText = "";
  let isStarted = false;
  // Live-assist state (declared early — initApp() runs before the live-assist block)
  let currentWordSpans = [];
  let activeWordIdx = -1;
  let liveAssistOn = false;
  let ttsVoices = [];
  let currentAssistWord = "";
  // Local words database (words-db.js in the project folder): curated
  // per-word translations + optional audio file paths. Anything missing falls
  // back to the free contextual translation / browser voice.
  const audioPreloaded = new Set(); // audio paths already preloaded this session
  let isCompleted = false;
  let startTime = null;
  let timerInterval = null;
  let timeElapsed = 0;
  let totalInput = 0;
  let correctChars = 0;
  let errorCharsMap = {};
  let errorWordsMap = {};
  let currentRepetition = 1;   // 1-indexed within profile.repetitions

  // v2.6 — idle pause state
  let lastTypeAt = 0;
  let idleCheckInterval = null;
  let idleIsPaused = false;
  let idleBadgeEl = null;
  let manuallyPaused = false;

  // ============================ DOM ============================
  const $ = (id) => document.getElementById(id);

  // Header
  const themeBtn = $("theme-toggle");
  const focusBtn = $("focus-toggle");
  const soundSel = $("sound-select");
  const restartOnboardingBtn = $("restart-onboarding-btn");

  // Onboarding
  const onboardingSec = $("onboarding-section");
  const steps = {
    goal:   $("step-goal"),
    level:  $("step-level"),
    reason: $("step-reason"),
    size:   $("step-size")
  };
  const dots = document.querySelectorAll(".onboarding-progress .dot");
  const levelsGrid  = $("levels-grid");
  const reasonsGrid = $("reasons-grid");
  const sizesGrid   = $("sizes-grid");
  const sizeBackBtn = $("size-back-btn");

  // Landing (v2.5)
  const landingSec  = $("landing-section");
  const landingStartBtn = $("landing-start-btn");
  const landingLoginBtn = $("landing-login-btn");
  const zenExitBtn  = $("zen-exit-btn");

  // Practice
  const practiceSec = $("practice-section");
  const contextInfo = $("context-info");
  const paraCounter = $("paragraph-counter");
  const workbench   = $("typing-workbench");
  const textBox     = $("typing-text-container");
  const typingInput = $("typing-input");
  const wpmVal = $("wpm-val");
  const accVal = $("accuracy-val");
  const timeVal = $("time-val");
  const progressBar = $("progress-bar");
  const resetBtn = $("reset-btn");
  const skipBtn = $("skip-btn");

  // Summary
  const summary = $("summary-panel");
  const sumWpm  = $("summary-wpm");
  const sumAcc  = $("summary-accuracy");
  const sumTime = $("summary-time");
  const sumAvg  = $("summary-avg-wpm");
  const sumErrChars = $("summary-error-list");
  const sumErrWords = $("summary-error-words");
  const restartBtn = $("restart-btn");
  const nextBtn = $("next-btn");

  // History
  const historySec = $("history-section");
  const historyBody = $("history-body");

  // Auth
  const authBtn = $("auth-btn");
  const authBtnText = $("auth-btn-text");
  const authModal = $("auth-modal");
  const tabLoginBtn = $("tab-login-btn");
  const tabSignupBtn = $("tab-signup-btn");
  const loginForm = $("login-form");
  const signupForm = $("signup-form");
  const loginErr = $("login-error");
  const signupErr = $("signup-error");
  const closeAuthBtn = $("close-auth-btn");

  // Admin
  const adminProfile = $("admin-profile");
  const adminLink = $("admin-link");
  const adminSec = $("admin-section");
  const adminBackBtn = $("admin-back-btn");
  const adminTabContent = $("admin-tab-content");
  const adminTabUsers = $("admin-tab-users");
  const adminTabGrammar = $("admin-tab-grammar");
  const adminPanelContent = $("admin-panel-content-mgr");
  const adminPanelUsers = $("admin-panel-users");
  const adminPanelGrammar = $("admin-panel-grammar");
  const addContentForm = $("add-content-form");
  const adminTrack = $("admin-track");
  const adminReason = $("admin-reason");
  const adminLevel = $("admin-level");
  const adminSize = $("admin-size");
  const adminContent = $("admin-content");
  const adminContentBody = $("admin-content-body");
  const adminUsersBody = $("admin-users-body");

  // Grammar Quests
  const grammarSec     = $("grammar-section");
  const grammarLink    = $("grammar-link");
  const grammarBackBtn = $("grammar-back-btn");

  // Profile DOM
  const profileBtn  = $("profile-btn");
  const profileSec  = $("profile-section");
  const profileBackBtn = $("profile-back-btn");
  const profUsername = $("profile-username");
  const profEmail    = $("profile-email");
  const changePassBtn  = $("change-password-btn");
  const changePassForm = $("change-password-form");
  const cancelPassBtn  = $("cancel-password-btn");
  const curPassInput   = $("current-password");
  const newPassInput   = $("new-password");
  const confPassInput  = $("confirm-password");
  const changePassErr  = $("change-password-error");
  const changePassOk   = $("change-password-success");

  const prefGoalEl    = $("pref-goal");
  const prefLevelEl   = $("pref-level");
  const prefReasonEl  = $("pref-reason");
  const prefLevelRow  = $("pref-level-row");
  const prefReasonRow = $("pref-reason-row");
  const prefSizeSel   = $("pref-size"); // removed in v2.6 — null-safe references below
  const editGoalBtn   = $("edit-goal-btn");
  const editLevelBtn  = $("edit-level-btn");
  const editReasonBtn = $("edit-reason-btn");

  // Practice bar controls (v2.4 — settings panel)
  const toggleSettingsBtn = $("toggle-settings-btn");
  const settingsPanel     = $("settings-panel");
  const sizeCheckboxes    = $("size-checkboxes");
  const repetitionSel     = $("repetition-select");
  const repCounter        = $("rep-counter");
  const resetDefaultsGroup= $("reset-defaults-group");
  const resetDefaultsBtn  = $("reset-defaults-btn");
  const quickAddInput     = $("quick-add-input");
  const quickAddBtn       = $("quick-add-btn");
  const quickClassifyBadge= $("quick-classify-badge");

  // Legacy null-safe refs (elements removed in v2.4 but referenced in older code)
  const sourceToggle  = null;
  const sourceBtns    = [];
  const sizeSelect    = null;
  const folderSelect  = null;

  // Text library inner sub-tabs (v2.7)
  const textsSubtabs = document.querySelectorAll(".texts-subtab");
  const panelDefault = $("panel-default-content");
  const panelMine    = $("panel-my-content");

  // Default-content browser
  const dfTrackSel  = $("default-track-filter");
  const dfReasonSel = $("default-reason-filter");
  const dfLevelSel  = $("default-level-filter");
  const dfSizeSel   = $("default-size-filter");
  const dfMeta      = $("default-content-meta");
  const dfList      = $("default-content-list");

  const addUserContentForm = $("add-user-content-form");
  const userContentInput   = $("user-content-input");
  const classifyBadge      = $("classify-badge");
  const classifyStats      = $("classify-stats");

  const uploadZone        = $("upload-zone");
  const excelFileInput    = $("excel-file-input");
  const uploadResult      = $("upload-result");
  const downloadTemplateBtn = $("download-template-btn");

  const userContentBody  = $("user-content-body");
  const userContentCount = $("user-content-count");
  const filterUserContent = $("filter-user-content");
  const guestNotice = $("guest-notice");
  const guestLoginBtn = $("guest-login-btn");

  // Folders + delete-all
  const foldersList     = $("folders-list");
  const foldersCount    = $("folders-count");
  const addFolderForm   = $("add-folder-form");
  const newFolderName   = $("new-folder-name");
  const newFolderIcon   = $("new-folder-icon");
  const addFolderTarget = $("add-folder-target");
  const uploadFolderTarget = $("upload-folder-target");
  const filterFolder    = $("filter-folder");

  const deleteAllBtn       = $("delete-all-btn");
  const deleteAllPanel     = $("delete-all-panel");
  const deleteAllCount     = $("delete-all-count");
  const deleteAllPassword  = $("delete-all-password");
  const deleteAllError     = $("delete-all-error");
  const confirmDeleteAllBtn = $("confirm-delete-all");
  const cancelDeleteAllBtn  = $("cancel-delete-all");

  // ============================ INIT ============================
  try {
    initApp();
  } catch (err) {
    console.error("TypeFlow init failed:", err);
    document.body.innerHTML = `
      <div style="padding:2rem; font-family: sans-serif; max-width: 800px; margin: 2rem auto; background:#fee; color:#c00; border:2px solid #c00; border-radius:8px;">
        <h2>⚠️ TypeFlow init error</h2>
        <p>JavaScript فشل في التهيئة. تفاصيل الخطأ:</p>
        <pre style="background:#fff; padding:1rem; overflow:auto; font-size:0.85rem; direction:ltr; text-align:left;">${(err && (err.stack || err.message)) || String(err)}</pre>
        <button onclick="localStorage.clear(); location.reload();" style="background:#c00; color:#fff; padding:0.6rem 1rem; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
          مسح البيانات وإعادة المحاولة
        </button>
      </div>
    `;
  }

  function initApp() {
    applyTheme(currentTheme);
    applyAppearance();
    soundSel.value = (!isSoundEnabled) ? "none" : soundType;
    typingAudio.soundType = soundType;
    typingAudio.enabled = soundSel.value !== "none";

    renderOnboardingGrids();
    bindEvents();
    bindTextSelectionMenu();  // v2.5
    updateAuthUI();

    // Speech synthesis voices load asynchronously
    loadTtsVoices();
    if (window.speechSynthesis) speechSynthesis.onvoiceschanged = loadTtsVoices;

    // Route v2.5:
    //   - no currentUser  → show landing
    //   - currentUser, no profile → show onboarding
    //   - currentUser + profile  → enter practice (zen mode)
    if (!currentUser) {
      showLanding();
    } else if (profile) {
      enterPracticeMode();
    } else {
      showOnboarding("goal");
    }
  }

  // ============================ TEXT SELECTION MENU (v2.5) ============================
  let selectionMenuEl = null;
  let pausedBadgeEl = null;
  let timerPausedForSelection = false;
  let pausedRemainingMs = 0;
  let selectionPausedStartTime = null;

  function bindTextSelectionMenu() {
    // Listen for mouseup inside the text box → show menu if selection exists
    textBox.addEventListener("mouseup", handleTextSelection);
    // Also: any click outside the menu closes it and resumes
    document.addEventListener("mousedown", (e) => {
      if (selectionMenuEl && !selectionMenuEl.contains(e.target)) {
        // If user clicked back inside textBox to make a new selection, defer to mouseup
        if (!textBox.contains(e.target)) {
          closeSelectionMenu();
        }
      }
    });
    // Esc to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && selectionMenuEl) closeSelectionMenu();
    });
  }

  function handleTextSelection() {
    // Small delay so the selection actually settles
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) { closeSelectionMenu(); return; }
      const text = sel.toString().trim();
      if (!text) { closeSelectionMenu(); return; }

      // Make sure the selection is INSIDE our text box
      const range = sel.getRangeAt(0);
      if (!textBox.contains(range.commonAncestorContainer)) {
        closeSelectionMenu();
        return;
      }

      pauseTimerForSelection();
      showSelectionMenu(text, range);
    }, 10);
  }

  function pauseTimerForSelection() {
    if (timerPausedForSelection) return;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    selectionPausedStartTime = Date.now();
    timerPausedForSelection = true;
    showPausedBadge();
  }

  function resumeTimerAfterSelection() {
    if (!timerPausedForSelection) return;
    // Shift startTime forward by the paused duration so elapsed time isn't counted
    if (startTime && selectionPausedStartTime) {
      const pausedDuration = Date.now() - selectionPausedStartTime;
      startTime += pausedDuration;
    }
    if (isStarted && !isCompleted) {
      timerInterval = setInterval(updateTimer, 500);
    }
    timerPausedForSelection = false;
    selectionPausedStartTime = null;
    hidePausedBadge();
  }

  function showPausedBadge() {
    if (pausedBadgeEl) return;
    pausedBadgeEl = document.createElement("div");
    pausedBadgeEl.className = "selection-paused-badge";
    pausedBadgeEl.innerHTML = "⏸️ العداد متوقف — اختر من القائمة أو اضغط في مكان آخر";
    document.body.appendChild(pausedBadgeEl);
  }

  function hidePausedBadge() {
    if (pausedBadgeEl) {
      pausedBadgeEl.remove();
      pausedBadgeEl = null;
    }
  }

  function showSelectionMenu(text, range) {
    closeSelectionMenu();

    const rect = range.getBoundingClientRect();
    selectionMenuEl = document.createElement("div");
    selectionMenuEl.className = "text-selection-menu";

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const size = classifySize(text);

    selectionMenuEl.innerHTML = `
      <div class="selection-menu-info">
        ${text.length} حرف · ${wordCount} كلمة · ${sizeLabel(size)}
      </div>
      <button class="selection-menu-item" data-action="copy">
        📋 نسخ النص
      </button>
      <button class="selection-menu-item" data-action="translate">
        🌐 ترجمة
      </button>
      ${currentUser ? `
        <button class="selection-menu-item" data-action="add-learning">
          📚 أضف لقائمة التعلم
        </button>
        <button class="selection-menu-item" data-action="add-quick">
          ✍️ أضف لمساحة العمل الحالية
        </button>
        <div class="selection-menu-divider"></div>
        <div class="selection-menu-info">أو أضف لمجلد:</div>
        <div class="selection-menu-folder-list" id="selection-menu-folders"></div>
      ` : `
        <div class="selection-menu-divider"></div>
        <div class="selection-menu-info">سجل دخول لحفظ النصوص في مكتبتك</div>
      `}
    `;

    // Populate folders list
    if (currentUser) {
      const flist = selectionMenuEl.querySelector("#selection-menu-folders");
      getUserFolders().forEach(f => {
        const btn = document.createElement("button");
        btn.className = "selection-menu-item";
        btn.dataset.action = "add-folder";
        btn.dataset.folderId = f.id;
        btn.innerHTML = `<span style="font-size:1.1rem;">${f.icon}</span> ${escapeHtml(f.name)}`;
        flist.appendChild(btn);
      });
    }

    // Wire actions
    selectionMenuEl.querySelectorAll("[data-action]").forEach(btn => {
      btn.addEventListener("click", () => handleSelectionAction(btn.dataset.action, text, btn.dataset.folderId));
    });

    document.body.appendChild(selectionMenuEl);

    // Position the menu near the selection (above by default, below if no room)
    const menuRect = selectionMenuEl.getBoundingClientRect();
    let left = rect.left + (rect.width - menuRect.width) / 2;
    let top  = rect.top - menuRect.height - 8;
    if (top < 8) top = rect.bottom + 8;
    left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
    selectionMenuEl.style.left = left + "px";
    selectionMenuEl.style.top  = top + "px";
  }

  function closeSelectionMenu() {
    if (selectionMenuEl) {
      selectionMenuEl.remove();
      selectionMenuEl = null;
    }
    if (timerPausedForSelection) resumeTimerAfterSelection();
    // Clear browser selection so it doesn't linger
    if (window.getSelection) window.getSelection().removeAllRanges();
  }

  function handleSelectionAction(action, text, folderId) {
    if (action === "copy") {
      try {
        navigator.clipboard.writeText(text);
      } catch (e) {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (_) {}
        ta.remove();
      }
      flashMenuFeedback("✓ تم النسخ");
      setTimeout(closeSelectionMenu, 600);
      return;
    }
    if (action === "add-quick") {
      // Add to current workspace
      const size = classifySize(text);
      const ws = profile.workspace;
      const item = {
        id: Date.now() + Math.floor(Math.random() * 999),
        content: text, size,
        addedAt: new Date().toISOString(),
        source: "selection"
      };
      if (ws.type === "default") {
        addOverlayItem(ws.reason, ws.level, size, item);
      } else if (ws.type === "user") {
        item.folderId = ws.folderId;
        const items = getUserContent(); items.push(item); setUserContent(items);
      }
      flashMenuFeedback("✓ تمت الإضافة");
      setTimeout(closeSelectionMenu, 600);
      return;
    }
    if (action === "add-folder") {
      const size = classifySize(text);
      const item = {
        id: Date.now() + Math.floor(Math.random() * 999),
        content: text, size,
        folderId: folderId,
        addedAt: new Date().toISOString(),
        source: "selection"
      };
      const items = getUserContent();
      items.push(item);
      setUserContent(items);
      flashMenuFeedback("✓ أُضيف للمجلد");
      setTimeout(closeSelectionMenu, 600);
      return;
    }
    if (action === "translate") {
      translateSelectedText(text);
      return;
    }
    if (action === "add-learning") {
      addToLearningList(text);
      return;
    }
  }

  function getLearningList() {
    try { return JSON.parse(localStorage.getItem("typeflow_learning_list") || "[]"); } catch { return []; }
  }
  function setLearningList(list) {
    localStorage.setItem("typeflow_learning_list", JSON.stringify(list));
  }

  function addToLearningList(text, translation) {
    const list = getLearningList();
    const duplicate = list.find(e => e.text === text);
    if (duplicate) {
      flashMenuFeedback("موجود بالفعل في قائمة التعلم");
      setTimeout(closeSelectionMenu, 900);
      return;
    }
    list.push({
      id: Date.now() + Math.floor(Math.random() * 999),
      text,
      translation: translation || null,
      addedAt: new Date().toISOString(),
      user: currentUser ? currentUser.username : null
    });
    setLearningList(list);
    flashMenuFeedback("✓ أُضيف لقائمة التعلم");
    setTimeout(closeSelectionMenu, 700);
  }

  // Arabic text → translate to English, otherwise English → Arabic.
  function detectLangPair(text) {
    return /[؀-ۿ]/.test(text) ? "ar|en" : "en|ar";
  }

  function getTranslationCache() {
    try { return JSON.parse(localStorage.getItem("typeflow_translation_cache") || "{}"); } catch { return {}; }
  }
  function setTranslationCache(cache) {
    // Cap the cache so it can't grow without bound (drop oldest keys).
    const keys = Object.keys(cache);
    if (keys.length > 500) keys.slice(0, keys.length - 500).forEach(k => delete cache[k]);
    localStorage.setItem("typeflow_translation_cache", JSON.stringify(cache));
  }

  // Shared translation helper (MyMemory). Auto-detects direction and caches results.
  function fetchTranslation(text, pair) {
    const p = pair || detectLangPair(text);
    // Single English words: the curated local DB (words-db.js) wins.
    const t = (text || "").trim();
    if (p.indexOf("en|") === 0 && t && !/\s/.test(t)) {
      const local = dbTranslation(t, p.split("|")[1]);
      if (local) return Promise.resolve(local);
    }
    const cacheKey = `${p}::${text}`;
    const cache = getTranslationCache();
    if (cache[cacheKey]) return Promise.resolve(cache[cacheKey]);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${p}`;
    return fetch(url)
      .then(r => r.json())
      .then(d => {
        const tr = (d && d.responseData && d.responseData.translatedText) || null;
        if (tr) { cache[cacheKey] = tr; setTranslationCache(cache); }
        return tr;
      });
  }

  function translateSelectedText(text) {
    if (!selectionMenuEl) return;
    // Show loading state inside the translate button
    const btn = selectionMenuEl.querySelector('[data-action="translate"]');
    if (btn) { btn.textContent = "⏳ جارٍ الترجمة…"; btn.disabled = true; }

    fetchTranslation(text)
      .then(translation => {
        if (!selectionMenuEl) return; // menu was closed
        if (translation) {
          showTranslationInMenu(text, translation);
        } else {
          flashMenuFeedback("تعذّرت الترجمة، حاول مرة أخرى");
          setTimeout(closeSelectionMenu, 1200);
        }
      })
      .catch(() => {
        if (!selectionMenuEl) return;
        flashMenuFeedback("لا يوجد اتصال بالإنترنت");
        setTimeout(closeSelectionMenu, 1200);
      });
  }

  function showTranslationInMenu(original, translation) {
    if (!selectionMenuEl) return;
    const dir = /[؀-ۿ]/.test(translation) ? "rtl" : "ltr";
    selectionMenuEl.innerHTML = `
      <div class="selection-menu-translation-box">
        <div class="selection-menu-translation-label">الترجمة</div>
        <div class="selection-menu-translation-text" dir="${dir}">${escapeHtml(translation)}</div>
      </div>
      ${currentUser ? `
        <button class="selection-menu-item" id="smenu-save-learning" style="margin-top:0.4rem;">
          📚 حفظ في قائمة التعلم
        </button>
      ` : ""}
      <button class="selection-menu-item" style="color:var(--text-muted);margin-top:0.2rem;" id="smenu-close-tr">
        ✕ إغلاق
      </button>
    `;
    const saveBtn = selectionMenuEl.querySelector("#smenu-save-learning");
    if (saveBtn) saveBtn.addEventListener("click", () => addToLearningList(original, translation));
    const closeBtn = selectionMenuEl.querySelector("#smenu-close-tr");
    if (closeBtn) closeBtn.addEventListener("click", closeSelectionMenu);
  }

  // ============================ LEARNING LIST TAB ============================
  // Only the current user's saved items (items carry the username that saved them).
  function getMyLearningList() {
    const uname = currentUser ? currentUser.username : null;
    return getLearningList().filter(i => (i.user || null) === uname);
  }

  function renderLearningTab() {
    const container = $("learning-list");
    const countEl = $("learning-count");
    if (!container) return;
    const items = getMyLearningList().slice().reverse(); // newest first
    if (countEl) countEl.textContent = String(items.length);
    if (items.length === 0) {
      container.innerHTML = `<p class="learning-empty">لا توجد كلمات محفوظة بعد. حدّد أي نص أثناء التدريب واختر "📚 أضف لقائمة التعلم".</p>`;
      return;
    }
    container.innerHTML = items.map(it => {
      let date = "";
      try { date = new Date(it.addedAt).toLocaleDateString("ar-EG"); } catch (e) {}
      const trDir = it.translation && /[؀-ۿ]/.test(it.translation) ? "rtl" : "ltr";
      const tr = it.translation
        ? `<div class="learning-tr" dir="${trDir}">${escapeHtml(it.translation)}</div>`
        : `<button class="btn-secondary btn-sm" data-learn-translate="${it.id}">🌐 ترجمة</button>`;
      return `
        <div class="learning-item">
          <div class="learning-item-body">
            <div class="learning-text" dir="ltr">${escapeHtml(it.text)}</div>
            ${tr}
            <div class="learning-date">${date}</div>
          </div>
          <button class="learning-del" title="حذف" data-learn-del="${it.id}">
            <svg class="icon"><use href="#i-trash"/></svg>
          </button>
        </div>`;
    }).join("");
  }

  function removeLearningItem(id) {
    setLearningList(getLearningList().filter(i => String(i.id) !== String(id)));
    renderLearningTab();
  }

  function clearLearningList() {
    if (getMyLearningList().length === 0) return;
    if (!confirm("سيتم حذف كل الكلمات المحفوظة في قائمة التعلم. هل تريد المتابعة؟")) return;
    const uname = currentUser ? currentUser.username : null;
    setLearningList(getLearningList().filter(i => (i.user || null) !== uname));
    renderLearningTab();
    showToast("تم مسح قائمة التعلم", "info");
  }

  function translateOneLearning(id) {
    const list = getLearningList();
    const item = list.find(i => String(i.id) === String(id));
    if (!item) return;
    const btn = document.querySelector(`[data-learn-translate="${id}"]`);
    if (btn) { btn.textContent = "⏳ جارٍ الترجمة…"; btn.disabled = true; }
    fetchTranslation(item.text)
      .then(tr => {
        if (tr) { item.translation = tr; setLearningList(list); }
        renderLearningTab();
      })
      .catch(() => { if (btn) { btn.textContent = "🌐 ترجمة"; btn.disabled = false; } });
  }

  async function translateMissingLearning() {
    const uname = currentUser ? currentUser.username : null;
    const list = getLearningList();
    const missing = list.filter(i => (i.user || null) === uname && !i.translation);
    if (missing.length === 0) { showToast("كل العناصر مترجمة بالفعل", "info"); return; }
    const btn = $("learning-translate-missing");
    if (btn) { btn.disabled = true; btn.textContent = "⏳ جارٍ الترجمة…"; }
    let done = 0;
    for (const it of missing) {
      try {
        const tr = await fetchTranslation(it.text);
        if (tr) { it.translation = tr; setLearningList(list); done++; }
      } catch (e) { /* keep going */ }
    }
    if (btn) { btn.disabled = false; btn.textContent = "🌐 ترجمة الناقص"; }
    renderLearningTab();
    showToast(done > 0 ? `تمت ترجمة ${done} عنصر` : "تعذّرت الترجمة، تحقق من الاتصال", done > 0 ? "success" : "error");
  }

  function practiceLearningList() {
    if (getMyLearningList().length === 0) { showToast("قائمة التعلم فارغة", "info"); return; }
    profile.workspace = { type: "learning" };
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    showToast("بدأ التدريب على قائمة التعلم 📚", "success");
    closeProfile(); // re-enters practice mode with the new workspace
  }

  function flashMenuFeedback(msg) {
    if (!selectionMenuEl) return;
    selectionMenuEl.innerHTML = `
      <div style="padding: 1rem 1.5rem; text-align: center; font-weight: 600; color: var(--success-color);">
        ${msg}
      </div>
    `;
  }

  // Lightweight non-blocking notification (bottom-center, auto-dismiss).
  function showToast(msg, type) {
    let cont = document.getElementById("toast-container");
    if (!cont) {
      cont = document.createElement("div");
      cont.id = "toast-container";
      document.body.appendChild(cont);
    }
    const t = document.createElement("div");
    t.className = "toast toast-" + (type || "success");
    t.textContent = msg;
    cont.appendChild(t);
    setTimeout(() => {
      t.classList.add("toast-hide");
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  // ============================ DATA BACKUP (export / import) ============================
  function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("typeflow_")) data[k] = localStorage.getItem(k);
    }
    const payload = { app: "typeflow", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typeflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("تم تصدير بياناتك", "success");
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); } catch (e) { showToast("تعذّر قراءة الملف", "error"); return; }
      const data = parsed && parsed.data;
      if (!data || typeof data !== "object") { showToast("ملف غير صالح", "error"); return; }
      if (!confirm("سيتم استبدال بياناتك الحالية بالبيانات المستوردة. هل تريد المتابعة؟")) return;
      Object.keys(data).forEach(k => { if (k.startsWith("typeflow_")) localStorage.setItem(k, data[k]); });
      showToast("تم الاستيراد — جارٍ إعادة التحميل…", "success");
      setTimeout(() => window.location.reload(), 1200);
    };
    reader.readAsText(file);
  }

  // ============================ ROUTING ============================
  function hideAllSections() {
    if (landingSec)   landingSec.style.display   = "none";
    onboardingSec.style.display = "none";
    practiceSec.style.display   = "none";
    profileSec.style.display    = "none";
    adminSec.style.display      = "none";
    if (grammarSec) grammarSec.style.display = "none";
    historySec.style.display    = "none";
    document.body.classList.remove("zen-mode");
    isFocusMode = false;
    focusBtn.classList.remove("active");
  }

  function showLanding() {
    hideAllSections();
    if (landingSec) landingSec.style.display = "flex";
    restartOnboardingBtn.style.display = "none";
  }

  // ============================ GRAMMAR QUESTS ============================
  // Sequential 3-level journey per tense: Concept (1) → Typing (2) → Quiz (3).
  // Quests are admin-authored and stored in Supabase (public read); the static
  // grammar-data.js is only an offline fallback. Progress: STORAGE.grammarLevels.
  let gqQuests = [];         // loaded quests {id,title,icon,concept[],sentences[],questions[],settings}
  let gqQuest = null;        // active quest object
  let gqAudio = null;        // current sentence-audio player
  let gqStep = 1;            // current level (1..3)
  let gqTypeIdx = 0;         // current practice-sentence index
  let gqQuizIdx = 0;         // current quiz-question index
  let gqScore = 0;           // correct answers this quiz run
  let gqAnswered = false;    // current question already evaluated?
  let gqSelectedChoice = -1; // selected MCQ index

  function saveGrammarProgress() {
    localStorage.setItem(STORAGE.grammarLevels, JSON.stringify(grammarProgress));
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  // Convert a static grammar-data.js quest (old shape) to the dynamic shape (offline fallback).
  function staticToQuest(s) {
    const c = s.concept || {};
    const blocks = [];
    if (c.tagline) blocks.push({ type: "text", text: c.tagline, size: "lg", bold: true });
    (c.formula || []).forEach(f => blocks.push({ type: "text", text: `${f.label}:  ${f.pattern}  —  ${f.example}` }));
    if ((c.rules || []).length) { blocks.push({ type: "divider" }); blocks.push({ type: "text", text: c.rules.map(r => "• " + r).join("\n") }); }
    if ((c.signals || []).length) blocks.push({ type: "text", text: "كلمات إشارية: " + c.signals.join(" · "), size: "sm", color: "#4d5bd6", bold: true });
    if (c.tip) blocks.push({ type: "text", text: "💡 " + c.tip, size: "sm", bold: true });
    return { id: s.id, title: s.name_ar || s.name_en || "قاعدة", icon: s.icon || "📘",
             concept: blocks, sentences: s.practice || [], questions: s.quiz || [], settings: {} };
  }

  async function loadGrammarQuests() {
    if (SUPA_ON) {
      try {
        const r = await supaRpc("gq_list_quests", {});
        if (Array.isArray(r)) { gqQuests = r; return; }
      } catch (err) { console.warn("Supabase grammar load failed; using offline fallback.", err); }
    }
    const staticArr = (typeof GRAMMAR_QUESTS !== "undefined" && Array.isArray(GRAMMAR_QUESTS)) ? GRAMMAR_QUESTS : [];
    gqQuests = staticArr.map(staticToQuest);
  }

  async function openGrammarSection() {
    if (isFocusMode) toggleFocus();
    hideAllSections();
    grammarSec.style.display = "flex";
    restartOnboardingBtn.style.display = "none";
    $("gq-journey").style.display = "none";
    $("gq-list-screen").style.display = "flex";
    $("gq-quests-grid").innerHTML = `<p class="focus-instruction">جارٍ التحميل…</p>`;
    await loadGrammarQuests();
    showQuestList();
  }

  function showQuestList() {
    $("gq-journey").style.display = "none";
    $("gq-list-screen").style.display = "flex";
    const grid = $("gq-quests-grid");
    grid.innerHTML = "";
    if (!gqQuests.length) {
      grid.innerHTML = `<p class="focus-instruction">لا توجد قواعد بعد.</p>`;
      return;
    }
    gqQuests.forEach(q => {
      const done = grammarProgress[q.id] && grammarProgress[q.id].completed;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "track-card gq-quest-card";
      card.dataset.quest = q.id;
      card.innerHTML = `
        <div class="track-header">
          <span class="track-icon">${escapeHtml(q.icon || "📘")}</span>
          ${done ? `<span class="badge en gq-quest-status">✓ مكتمل</span>` : ""}
        </div>
        <span class="track-title">${escapeHtml(q.title || "")}</span>
        <p class="track-desc">${(q.sentences ? q.sentences.length : 0)} جملة · ${(q.questions ? q.questions.length : 0)} سؤال</p>`;
      card.addEventListener("click", () => startQuest(q.id));
      grid.appendChild(card);
    });
  }

  function startQuest(id) {
    gqQuest = gqQuests.find(q => String(q.id) === String(id));
    if (!gqQuest) return;
    gqTypeIdx = 0; gqQuizIdx = 0; gqScore = 0;
    $("gq-list-screen").style.display = "none";
    $("gq-journey").style.display = "flex";
    renderConcept();
    setQuestStep(1);
  }

  // Switch level: toggle screens + stepper, then run the level's loader.
  function setQuestStep(step) {
    gqStep = step;
    const levels = { 1: "gq-level-1", 2: "gq-level-2", 3: "gq-level-3" };
    Object.values(levels).forEach(idv => { const el = $(idv); if (el) el.style.display = "none"; });
    $("gq-complete").style.display = "none";
    if (levels[step]) $(levels[step]).style.display = "flex";
    document.querySelectorAll("#gq-progress .gq-step").forEach(li => {
      const n = parseInt(li.dataset.step, 10);
      li.classList.toggle("is-active", n === step);
      li.classList.toggle("is-done", n < step);
    });
    $("gq-progress-fill").style.width = `${(step / 3) * 100}%`;
    $("gq-progress-text").textContent = `المستوى ${step} من 3`;
    if (step === 2) loadTypingSentence();
    if (step === 3) loadQuizQuestion();
  }

  // ---- Level 1: Concept (renders the dynamic block array) ----
  const GQ_SIZE = { sm: "var(--fs-sm)", normal: "var(--fs-base)", lg: "var(--fs-lg)", xl: "var(--fs-2xl)" };
  function gqColor(c) { return (typeof c === "string" && /^#[0-9a-fA-F]{3,8}$/.test(c)) ? c : ""; }

  function renderConceptBlock(b) {
    if (!b || !b.type) return "";
    if (b.type === "text") {
      const color = gqColor(b.color);
      const align = ["start", "center", "end", "right", "left"].includes(b.align) ? b.align : "start";
      const style = `font-size:${GQ_SIZE[b.size] || GQ_SIZE.normal};`
        + (b.bold ? "font-weight:700;" : "")
        + (color ? `color:${color};` : "")
        + `text-align:${align};`;
      return `<p class="gq-block-text" dir="auto" style="${style}">${escapeHtml(b.text || "")}</p>`;
    }
    if (b.type === "image") {
      const w = /^[0-9]{1,3}%$|^[0-9]{1,4}px$/.test(b.width || "") ? b.width : "100%";
      return `<figure class="gq-block-image"><img src="${encodeURI(b.url || "")}" alt="${escapeHtml(b.alt || "")}" style="max-width:${w}"></figure>`;
    }
    if (b.type === "divider") return `<hr class="gq-block-divider">`;
    if (b.type === "shape") {
      const color = gqColor(b.color) || "var(--accent-soft)";
      const shape = ["box", "line", "circle"].includes(b.shape) ? b.shape : "box";
      return `<div class="gq-block-shape gq-shape-${shape}" style="background:${color}"></div>`;
    }
    return "";
  }

  function renderConcept() {
    $("gq-concept-icon").textContent = gqQuest.icon || "📘";
    $("gq-concept-title").textContent = gqQuest.title || "";
    $("gq-concept-blocks").innerHTML = (gqQuest.concept || []).map(renderConceptBlock).join("");
  }

  // ---- Level 2: Typing (self-contained engine; mirrors the main one's char classes) ----
  function loadTypingSentence() {
    const list = gqQuest.sentences || [];
    if (gqTypeIdx >= list.length) { setQuestStep(3); return; }
    const item = list[gqTypeIdx];
    $("gq-typing-counter").textContent = `جملة ${gqTypeIdx + 1} / ${list.length}`;
    const afterMode = gqQuest.settings && gqQuest.settings.rationaleTiming === "after";
    const rEl = $("gq-typing-rationale");
    rEl.textContent = item.rationale || "";
    rEl.style.display = (item.rationale && !afterMode) ? "block" : "none";
    const audioBtn = $("gq-sentence-audio");
    if (item.audioUrl) {
      audioBtn.style.display = "inline-flex";
      audioBtn.onclick = () => gqPlaySentenceAudio(item.audioUrl);
      if (gqQuest.settings && gqQuest.settings.autoSpeak) gqPlaySentenceAudio(item.audioUrl);
    } else {
      audioBtn.style.display = "none";
      audioBtn.onclick = null;
    }
    const box = $("gq-typing-text");
    box.innerHTML = "";
    [...item.text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "char untyped" + (i === 0 ? " active blink" : "");
      span.textContent = ch;
      box.appendChild(span);
    });
    const input = $("gq-typing-input");
    input.value = "";
    input.disabled = false;
    $("gq-typing-progress-bar").style.width = "0%";
    input.focus();
  }

  function handleGqTyping() {
    if (!gqQuest || gqStep !== 2) return;
    const list = gqQuest.sentences || [];
    const target = list[gqTypeIdx].text;
    const typed = $("gq-typing-input").value;
    const spans = $("gq-typing-text").querySelectorAll(".char");
    spans.forEach((span, idx) => {
      span.classList.remove("active", "blink");
      if (idx < typed.length) {
        span.className = "char " + (typed[idx] === target[idx] ? "correct" : "incorrect");
      } else {
        span.className = "char untyped";
      }
      if (idx === typed.length) span.classList.add("active", "blink");
    });
    $("gq-typing-progress-bar").style.width = `${Math.min((typed.length / target.length) * 100, 100)}%`;
    // advance only on an exact, fully-correct match
    if (typed === target) {
      $("gq-typing-input").disabled = true;
      const item = list[gqTypeIdx];
      const afterMode = gqQuest.settings && gqQuest.settings.rationaleTiming === "after";
      let delay = 450;
      if (afterMode && item.rationale) {
        const rEl = $("gq-typing-rationale");
        rEl.textContent = item.rationale; rEl.style.display = "block";
        delay = 1500;
      }
      gqTypeIdx++;
      setTimeout(() => (gqTypeIdx >= list.length ? setQuestStep(3) : loadTypingSentence()), delay);
    }
  }

  // ---- Level 3: Quiz (Boss Fight) ----
  function loadQuizQuestion() {
    const quiz = gqQuest.questions || [];
    gqAnswered = false; gqSelectedChoice = -1;
    const fb = $("gq-feedback");
    fb.style.display = "none";
    fb.classList.remove("is-correct", "is-wrong");
    $("gq-quiz-submit-row").style.display = "flex";
    if (gqQuizIdx >= quiz.length) { finishQuest(); return; }
    const q = quiz[gqQuizIdx];
    $("gq-quiz-counter").textContent = `سؤال ${gqQuizIdx + 1} / ${quiz.length}`;
    $("gq-quiz-prompt").textContent = q.prompt || "";
    const box = $("gq-quiz-choices");
    box.innerHTML = "";
    if (q.type === "mcq") {
      (q.choices || []).forEach((choice, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "gq-choice";
        btn.dir = "ltr";
        btn.textContent = choice;
        btn.addEventListener("click", () => {
          if (gqAnswered) return;
          gqSelectedChoice = i;
          box.querySelectorAll(".gq-choice").forEach(c => c.classList.remove("is-selected"));
          btn.classList.add("is-selected");
        });
        box.appendChild(btn);
      });
    } else {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.id = "gq-fill-input";
      inp.className = "gq-fill-input";
      inp.dir = "ltr";
      inp.autocomplete = "off";
      inp.spellcheck = false;
      inp.placeholder = "اكتب الإجابة هنا…";
      inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); evaluateAnswer(); } });
      box.appendChild(inp);
      setTimeout(() => inp.focus(), 50);
    }
  }

  function normalizeAns(s) {
    return (s || "").toLowerCase().trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  }

  function evaluateAnswer() {
    if (!gqQuest || gqStep !== 3 || gqAnswered) return;
    const q = (gqQuest.questions || [])[gqQuizIdx];
    let correct = false;
    if (q.type === "mcq") {
      if (gqSelectedChoice < 0) { showToast("اختر إجابة أولاً", "info"); return; }
      correct = gqSelectedChoice === q.answer;
      $("gq-quiz-choices").querySelectorAll(".gq-choice").forEach((c, i) => {
        c.disabled = true;
        c.classList.remove("is-selected");
        if (i === q.answer) c.classList.add("is-correct");
        else if (i === gqSelectedChoice) c.classList.add("is-wrong");
      });
    } else {
      const inp = $("gq-fill-input");
      const val = normalizeAns(inp && inp.value);
      if (!val) { showToast("اكتب إجابتك أولاً", "info"); return; }
      correct = (q.answer || []).map(normalizeAns).includes(val);
      if (inp) { inp.disabled = true; inp.classList.add(correct ? "is-correct" : "is-wrong"); }
    }
    gqAnswered = true;
    if (correct) gqScore++;
    showFeedback(correct, q);
  }

  function showFeedback(correct, q) {
    const fb = $("gq-feedback");
    fb.style.display = "flex";
    fb.classList.toggle("is-correct", correct);
    fb.classList.toggle("is-wrong", !correct);
    $("gq-feedback-icon").textContent = correct ? "✅" : "⚠️";
    $("gq-feedback-title").textContent = correct ? "إجابة صحيحة!" : "إجابة غير صحيحة";
    $("gq-feedback-text").textContent = correct ? (q.correctFeedback || "") : (q.wrongFeedback || "");
    $("gq-quiz-submit-row").style.display = "none";
    $("gq-next-q").style.display       = correct ? "inline-flex" : "none";
    $("gq-retry-q").style.display      = correct ? "none" : "inline-flex";
    $("gq-review-concept").style.display = correct ? "none" : "inline-flex";
  }

  function nextQuizQuestion() { gqQuizIdx++; loadQuizQuestion(); }
  function retryQuizQuestion() { loadQuizQuestion(); }  // reloads the same question, fresh

  function finishQuest() {
    const total = (gqQuest.questions || []).length;
    const prev = grammarProgress[gqQuest.id] || {};
    grammarProgress[gqQuest.id] = {
      completed: true,
      bestScore: Math.max(prev.bestScore || 0, gqScore),
      lastLevel: 3,
      total
    };
    saveGrammarProgress();
    document.querySelectorAll("#gq-progress .gq-step").forEach(li => {
      li.classList.remove("is-active"); li.classList.add("is-done");
    });
    $("gq-progress-fill").style.width = "100%";
    $("gq-progress-text").textContent = "اكتمل التحدّي ✓";
    ["gq-level-1", "gq-level-2", "gq-level-3"].forEach(idv => { $(idv).style.display = "none"; });
    $("gq-complete-sub").textContent = `نتيجتك: ${gqScore} / ${total} — أتقنت قاعدة «${gqQuest.title}»`;
    $("gq-complete").style.display = "flex";
  }

  // ============================ GRAMMAR QUESTS — ADMIN AUTHORING ============================
  let gqaDraft = null;      // quest being edited
  let gqaEditingId = null;  // id when editing existing (null = new)

  function gqaCreds() { return getAdminCreds(); }

  async function renderGqAdminList() {
    $("gqa-editor").style.display = "none";
    $("gqa-list-view").style.display = "block";
    const list = $("gqa-list");
    list.innerHTML = `<p class="focus-instruction">جارٍ التحميل…</p>`;
    await loadGrammarQuests();
    if (!gqQuests.length) { list.innerHTML = `<p class="focus-instruction">لا توجد قواعد. اضغط «قاعدة جديدة».</p>`; return; }
    list.innerHTML = "";
    gqQuests.forEach((q, i) => {
      const row = document.createElement("div");
      row.className = "gqa-row";
      row.innerHTML = `
        <span class="gqa-row-icon">${escapeHtml(q.icon || "📘")}</span>
        <span class="gqa-row-title">${escapeHtml(q.title || "")}</span>
        <span class="gqa-row-meta">${(q.sentences || []).length} جملة · ${(q.questions || []).length} سؤال</span>
        <span class="gqa-row-actions">
          <button class="btn-secondary btn-sm" data-up ${i === 0 ? "disabled" : ""} title="أعلى">↑</button>
          <button class="btn-secondary btn-sm" data-down ${i === gqQuests.length - 1 ? "disabled" : ""} title="أسفل">↓</button>
          <button class="btn-secondary btn-sm" data-edit>تعديل</button>
          <button class="btn-delete" data-del>حذف</button>
        </span>`;
      row.querySelector("[data-edit]").addEventListener("click", () => gqaEdit(q.id));
      row.querySelector("[data-del]").addEventListener("click", () => gqaDelete(q.id, q.title));
      row.querySelector("[data-up]").addEventListener("click", () => gqaMove(i, -1));
      row.querySelector("[data-down]").addEventListener("click", () => gqaMove(i, 1));
      list.appendChild(row);
    });
  }

  function gqaBlankDraft() {
    return { id: null, title: "", icon: "📘", settings: { rationaleTiming: "during", autoSpeak: false },
             concept: [], sentences: [], questions: [] };
  }

  function gqaNew() {
    if (!gqaCreds()) { showToast("أعد تسجيل الدخول كأدمن أولاً", "error"); return; }
    gqaEditingId = null;
    gqaDraft = gqaBlankDraft();
    showGqEditor();
  }

  function gqaEdit(id) {
    const q = gqQuests.find(x => String(x.id) === String(id));
    if (!q) return;
    gqaEditingId = q.id;
    gqaDraft = JSON.parse(JSON.stringify({
      id: q.id, title: q.title || "", icon: q.icon || "📘",
      settings: Object.assign({ rationaleTiming: "during", autoSpeak: false }, q.settings || {}),
      concept: q.concept || [], sentences: q.sentences || [], questions: q.questions || []
    }));
    showGqEditor();
  }

  function showGqEditor() {
    $("gqa-list-view").style.display = "none";
    $("gqa-editor").style.display = "block";
    renderGqEditor();
  }

  async function gqaDelete(id, title) {
    if (!gqaCreds()) { showToast("أعد تسجيل الدخول كأدمن أولاً", "error"); return; }
    if (!confirm(`حذف القاعدة «${title}»؟`)) return;
    try {
      const c = gqaCreds();
      await supaRpc("gq_delete_quest", { p_admin_user: c.username, p_admin_pass: c.password, p_id: id });
      showToast("تم الحذف", "success");
      renderGqAdminList();
    } catch (e) { showToast("تعذّر الحذف", "error"); }
  }

  async function gqaMove(index, dir) {
    const j = index + dir;
    if (j < 0 || j >= gqQuests.length) return;
    if (!gqaCreds()) { showToast("أعد تسجيل الدخول كأدمن أولاً", "error"); return; }
    const ids = gqQuests.map(q => q.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      const c = gqaCreds();
      await supaRpc("gq_reorder", { p_admin_user: c.username, p_admin_pass: c.password, p_ids: ids });
      renderGqAdminList();
    } catch (e) { showToast("تعذّر الترتيب", "error"); }
  }

  async function gqaSave() {
    if (!gqaCreds()) { showToast("أعد تسجيل الدخول كأدمن أولاً", "error"); return; }
    if (!gqaDraft.title.trim()) { showToast("اكتب عنوان القاعدة", "error"); return; }
    const payload = Object.assign({}, gqaDraft);
    if (gqaEditingId) payload.id = gqaEditingId; else delete payload.id;
    try {
      const c = gqaCreds();
      const r = await supaRpc("gq_upsert_quest", { p_admin_user: c.username, p_admin_pass: c.password, p_quest: payload });
      if (r && r.error) { showToast("غير مصرّح — تحقّق من دخول الأدمن", "error"); return; }
      showToast("تم حفظ القاعدة", "success");
      renderGqAdminList();
    } catch (e) { showToast("تعذّر الحفظ", "error"); }
  }

  function renderGqEditor() {
    const d = gqaDraft;
    const ed = $("gqa-editor");
    ed.innerHTML = `
      <div class="gqa-toolbar">
        <h3 style="font-size:1.1rem;">${gqaEditingId ? "تعديل قاعدة" : "قاعدة جديدة"}</h3>
        <div style="display:flex; gap:.5rem;">
          <button type="button" class="btn-secondary btn-sm" id="gqa-cancel">إلغاء</button>
          <button type="button" class="btn-primary btn-sm" id="gqa-save">💾 حفظ القاعدة</button>
        </div>
      </div>
      <div class="gqa-field-row">
        <label class="gqa-icon-field">الأيقونة<input id="gqa-icon" class="input-minimal" maxlength="2" value="${escapeHtml(d.icon)}"></label>
        <label style="flex:1;">عنوان القاعدة<input id="gqa-title" class="input-minimal" value="${escapeHtml(d.title)}" placeholder="مثال: المضارع البسيط"></label>
      </div>
      <div class="gqa-field-row">
        <label>توقيت ظهور شرح الجملة
          <select id="gqa-timing" class="select-minimal">
            <option value="during">أثناء الكتابة</option>
            <option value="after">بعد الانتهاء من الكتابة</option>
          </select>
        </label>
        <label class="gqa-check" style="flex-direction:row; align-items:center; gap:.4rem; align-self:flex-end;">
          <input type="checkbox" id="gqa-autospeak"> تشغيل الصوت تلقائياً قبل الكتابة
        </label>
      </div>
      <div class="gqa-section">
        <div class="gqa-section-head"><span class="section-title">📖 الشرح (بلوكات)</span></div>
        <div id="gqa-blocks"></div>
        <div class="gqa-add-row">
          <button type="button" class="btn-secondary btn-sm" data-add-block="text">+ نص</button>
          <button type="button" class="btn-secondary btn-sm" data-add-block="image">+ صورة</button>
          <button type="button" class="btn-secondary btn-sm" data-add-block="divider">+ فاصل</button>
          <button type="button" class="btn-secondary btn-sm" data-add-block="shape">+ شكل</button>
        </div>
      </div>
      <div class="gqa-section">
        <div class="gqa-section-head"><span class="section-title">⌨️ جمل التدريب</span></div>
        <div id="gqa-sentences"></div>
        <div class="gqa-add-row">
          <button type="button" class="btn-secondary btn-sm" id="gqa-add-sentence">+ جملة</button>
          <button type="button" class="btn-secondary btn-sm" id="gqa-import-sentences"><svg class="icon icon-sm"><use href="#i-upload"/></svg> استيراد Excel</button>
          <button type="button" class="btn-secondary btn-sm" id="gqa-template-sentences"><svg class="icon icon-sm"><use href="#i-download"/></svg> قالب</button>
        </div>
      </div>
      <div class="gqa-section">
        <div class="gqa-section-head"><span class="section-title">⚔️ الأسئلة</span></div>
        <div id="gqa-questions"></div>
        <div class="gqa-add-row">
          <button type="button" class="btn-secondary btn-sm" id="gqa-add-question">+ سؤال</button>
          <button type="button" class="btn-secondary btn-sm" id="gqa-import-questions"><svg class="icon icon-sm"><use href="#i-upload"/></svg> استيراد Excel</button>
          <button type="button" class="btn-secondary btn-sm" id="gqa-template-questions"><svg class="icon icon-sm"><use href="#i-download"/></svg> قالب</button>
        </div>
      </div>`;
    $("gqa-title").addEventListener("input", e => d.title = e.target.value);
    $("gqa-icon").addEventListener("input", e => d.icon = e.target.value);
    const timing = $("gqa-timing"); timing.value = d.settings.rationaleTiming || "during";
    timing.addEventListener("change", e => d.settings.rationaleTiming = e.target.value);
    const autospeak = $("gqa-autospeak"); autospeak.checked = !!d.settings.autoSpeak;
    autospeak.addEventListener("change", e => d.settings.autoSpeak = e.target.checked);
    ed.querySelectorAll("[data-add-block]").forEach(b => b.addEventListener("click", () => addBlock(b.dataset.addBlock)));
    $("gqa-add-sentence").addEventListener("click", () => { d.sentences.push({ text: "", rationale: "" }); renderGqLists(); });
    $("gqa-add-question").addEventListener("click", () => { d.questions.push({ type: "mcq", prompt: "", choices: ["", ""], answer: 0, correctFeedback: "", wrongFeedback: "" }); renderGqLists(); });
    $("gqa-import-sentences").addEventListener("click", () => pickExcel(importSentences));
    $("gqa-template-sentences").addEventListener("click", () => downloadGqTemplate("sentences"));
    $("gqa-import-questions").addEventListener("click", () => pickExcel(importQuestions));
    $("gqa-template-questions").addEventListener("click", () => downloadGqTemplate("questions"));
    $("gqa-cancel").addEventListener("click", () => renderGqAdminList());
    $("gqa-save").addEventListener("click", gqaSave);
    renderGqLists();
  }

  const GQA_BLOCK_LABEL = { text: "نص", image: "صورة", divider: "فاصل", shape: "شكل" };
  function addBlock(type) {
    const tpl = {
      text: { type: "text", text: "", size: "normal", bold: false, color: "", align: "start" },
      image: { type: "image", url: "", alt: "", width: "100%" },
      divider: { type: "divider" },
      shape: { type: "shape", shape: "box", color: "" }
    }[type];
    if (tpl) { gqaDraft.concept.push(tpl); renderGqLists(); }
  }
  function gqaSwap(arr, i, j) { [arr[i], arr[j]] = [arr[j], arr[i]]; }

  // ---- Excel import / templates (SheetJS) ----
  function pickExcel(cb) {
    if (typeof XLSX === "undefined") { showToast("مكتبة Excel غير محمّلة", "error"); return; }
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".xlsx,.xls,.csv";
    inp.addEventListener("change", () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = e => {
        try {
          const wb = XLSX.read(e.target.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          cb(XLSX.utils.sheet_to_json(ws, { defval: "" }));
        } catch (err) { console.warn(err); showToast("تعذّر قراءة الملف", "error"); }
      };
      rd.readAsArrayBuffer(f);
    });
    inp.click();
  }

  function gqRowGet(row, aliases) {
    const keys = Object.keys(row);
    for (const a of aliases) {
      const k = keys.find(k => k.trim().toLowerCase() === a.toLowerCase());
      if (k !== undefined) return String(row[k]).trim();
    }
    return "";
  }

  function importSentences(rows) {
    let n = 0;
    rows.forEach(r => {
      const text = gqRowGet(r, ["sentence", "الجملة", "text", "نص"]);
      const rationale = gqRowGet(r, ["rationale", "التعليل", "الشرح", "why"]);
      if (text) { gqaDraft.sentences.push({ text, rationale }); n++; }
    });
    renderGqLists();
    showToast(n ? `أُضيفت ${n} جملة` : "لم يُعثر على جمل صالحة", n ? "success" : "info");
  }

  function importQuestions(rows) {
    let n = 0;
    rows.forEach(r => {
      const prompt = gqRowGet(r, ["prompt", "السؤال", "question"]);
      if (!prompt) return;
      const type = (gqRowGet(r, ["type", "النوع"]) || "mcq").toLowerCase().startsWith("f") ? "fill" : "mcq";
      const correctFeedback = gqRowGet(r, ["correctfeedback", "صح", "الصحيحة", "feedback_correct"]);
      const wrongFeedback = gqRowGet(r, ["wrongfeedback", "خطأ", "الخاطئة", "feedback_wrong"]);
      const answerRaw = gqRowGet(r, ["answer", "الإجابة", "الاجابة"]);
      if (type === "mcq") {
        const choices = gqRowGet(r, ["choices", "الخيارات", "options"]).split("|").map(x => x.trim()).filter(Boolean);
        if (choices.length < 2) return;
        let answer = 0;
        if (/^\d+$/.test(answerRaw)) answer = Math.max(0, Math.min(choices.length - 1, parseInt(answerRaw, 10) - 1)); // 1-based in sheet
        else { const idx = choices.findIndex(c => c.toLowerCase() === answerRaw.toLowerCase()); answer = idx >= 0 ? idx : 0; }
        gqaDraft.questions.push({ type: "mcq", prompt, choices, answer, correctFeedback, wrongFeedback });
        n++;
      } else {
        const answer = answerRaw.split("|").map(x => x.trim()).filter(Boolean);
        gqaDraft.questions.push({ type: "fill", prompt, answer, correctFeedback, wrongFeedback });
        n++;
      }
    });
    renderGqLists();
    showToast(n ? `أُضيف ${n} سؤال` : "لم يُعثر على أسئلة صالحة", n ? "success" : "info");
  }

  function downloadGqTemplate(kind) {
    if (typeof XLSX === "undefined") { showToast("مكتبة Excel غير محمّلة", "error"); return; }
    let aoa;
    if (kind === "sentences") {
      aoa = [["sentence", "rationale"],
             ["She works hard every day.", "الفاعل she فنضيف s للفعل → works."],
             ["They do not play tennis.", "النفي مع they = do not + فعل مجرّد."]];
    } else {
      aoa = [["type", "prompt", "choices", "answer", "correctFeedback", "wrongFeedback"],
             ["mcq", "She ____ to work.", "go|goes|going|went", "goes", "أحسنت! مع she نضيف s.", "تذكّر: مع he/she/it نضيف s."],
             ["fill", "They ____ (not/play) tennis.", "", "do not play|don't play", "ممتاز!", "النفي = do not + فعل مجرّد."]];
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, kind === "sentences" ? "typeflow_sentences_template.xlsx" : "typeflow_questions_template.xlsx");
  }

  // ---- Media upload (images / audio) via the admin-gated Edge Function ----
  function pickFile(accept, cb) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.addEventListener("change", () => { const f = inp.files && inp.files[0]; if (f) cb(f); });
    inp.click();
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1]);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  async function gqUploadMedia(file, kind) {
    const c = getAdminCreds();
    if (!c) throw new Error("no_admin");
    if (file.size > 6 * 1024 * 1024) throw new Error("too_large");
    const dataBase64 = await fileToBase64(file);
    const res = await fetch(`${SUPA_URL}/functions/v1/gq-media-upload`, {
      method: "POST",
      headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ admin_user: c.username, admin_pass: c.password, kind, filename: file.name, contentType: file.type, dataBase64 })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) throw new Error(j.error || ("http " + res.status));
    return j.url;
  }

  function gqPlaySentenceAudio(url) {
    try { if (gqAudio) gqAudio.pause(); gqAudio = new Audio(url); gqAudio.play().catch(() => {}); } catch {}
  }

  function renderGqLists() {
    const d = gqaDraft;

    // ---- concept blocks ----
    const bc = $("gqa-blocks"); bc.innerHTML = "";
    d.concept.forEach((b, i) => {
      const row = document.createElement("div"); row.className = "gqa-item";
      let inner = `<div class="gqa-item-head"><strong>${GQA_BLOCK_LABEL[b.type] || b.type}</strong>
        <span class="gqa-item-actions">
          <button class="btn-secondary btn-sm" data-up ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="btn-secondary btn-sm" data-down ${i === d.concept.length - 1 ? "disabled" : ""}>↓</button>
          <button class="btn-delete" data-del>حذف</button></span></div>`;
      if (b.type === "text") {
        inner += `<textarea class="input-minimal gqa-ta" data-f="text" rows="2" placeholder="النص">${escapeHtml(b.text || "")}</textarea>
          <div class="gqa-inline">
            <label>الحجم<select class="select-minimal" data-f="size">
              ${["sm", "normal", "lg", "xl"].map(s => `<option value="${s}" ${b.size === s ? "selected" : ""}>${({ sm: "صغير", normal: "عادي", lg: "كبير", xl: "كبير جداً" })[s]}</option>`).join("")}
            </select></label>
            <label>المحاذاة<select class="select-minimal" data-f="align">
              ${["start", "center", "end"].map(a => `<option value="${a}" ${(b.align || "start") === a ? "selected" : ""}>${({ start: "بداية", center: "وسط", end: "نهاية" })[a]}</option>`).join("")}
            </select></label>
            <label>اللون<input type="color" data-f="color" value="${/^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#000000"}"></label>
            <label class="gqa-check"><input type="checkbox" data-f="bold" ${b.bold ? "checked" : ""}> غامق</label>
            <button class="btn-secondary btn-sm" data-clearcolor>بلا لون</button>
          </div>`;
      } else if (b.type === "image") {
        inner += `<div class="gqa-inline">
            <input class="input-minimal" data-f="url" dir="ltr" placeholder="رابط الصورة أو ارفع ملفاً" value="${escapeHtml(b.url || "")}" style="flex:1;">
            <button class="btn-secondary btn-sm" data-upload-image><svg class="icon icon-sm"><use href="#i-upload"/></svg> رفع صورة</button>
          </div>
          ${b.url ? `<img class="gqa-img-preview" src="${encodeURI(b.url)}" alt="">` : ""}
          <div class="gqa-inline">
            <input class="input-minimal" data-f="alt" placeholder="وصف بديل" value="${escapeHtml(b.alt || "")}">
            <input class="input-minimal gqa-w" data-f="width" placeholder="العرض (60% أو 300px)" value="${escapeHtml(b.width || "100%")}">
          </div>`;
      } else if (b.type === "shape") {
        inner += `<div class="gqa-inline">
            <label>الشكل<select class="select-minimal" data-f="shape">
              ${["box", "line", "circle"].map(s => `<option value="${s}" ${b.shape === s ? "selected" : ""}>${({ box: "مستطيل", line: "خط", circle: "دائرة" })[s]}</option>`).join("")}
            </select></label>
            <label>اللون<input type="color" data-f="color" value="${/^#[0-9a-fA-F]{6}$/.test(b.color || "") ? b.color : "#4d5bd6"}"></label>
          </div>`;
      } else {
        inner += `<p class="focus-instruction">فاصل أفقي.</p>`;
      }
      row.innerHTML = inner;
      row.querySelectorAll("[data-f]").forEach(el => {
        const f = el.dataset.f;
        const evt = (el.type === "checkbox" || el.type === "color" || el.tagName === "SELECT") ? "change" : "input";
        el.addEventListener(evt, () => { b[f] = el.type === "checkbox" ? el.checked : el.value; });
      });
      const cc = row.querySelector("[data-clearcolor]"); if (cc) cc.addEventListener("click", () => { b.color = ""; showToast("أُزيل اللون (افتراضي)", "info"); });
      const ui = row.querySelector("[data-upload-image]");
      if (ui) ui.addEventListener("click", () => pickFile("image/*", async (f) => {
        ui.disabled = true; ui.textContent = "جارٍ الرفع…";
        try { b.url = await gqUploadMedia(f, "image"); showToast("تم رفع الصورة", "success"); renderGqLists(); }
        catch (e) { showToast(e.message === "too_large" ? "الملف كبير جداً (>6م.ب)" : "تعذّر الرفع", "error"); ui.disabled = false; }
      }));
      row.querySelector("[data-del]").addEventListener("click", () => { d.concept.splice(i, 1); renderGqLists(); });
      row.querySelector("[data-up]").addEventListener("click", () => { if (i > 0) { gqaSwap(d.concept, i, i - 1); renderGqLists(); } });
      row.querySelector("[data-down]").addEventListener("click", () => { if (i < d.concept.length - 1) { gqaSwap(d.concept, i, i + 1); renderGqLists(); } });
      bc.appendChild(row);
    });

    // ---- sentences ----
    const sc = $("gqa-sentences"); sc.innerHTML = "";
    d.sentences.forEach((s, i) => {
      const row = document.createElement("div"); row.className = "gqa-item";
      row.innerHTML = `<div class="gqa-item-head"><strong>جملة ${i + 1}</strong>
        <span class="gqa-item-actions"><button class="btn-delete" data-del>حذف</button></span></div>
        <input class="input-minimal" dir="ltr" data-f="text" placeholder="الجملة بالإنجليزية" value="${escapeHtml(s.text || "")}">
        <input class="input-minimal" data-f="rationale" placeholder="تعليل الجملة (لماذا تُكتب هكذا)" value="${escapeHtml(s.rationale || "")}">
        <div class="gqa-inline gqa-audio-row">
          <button class="btn-secondary btn-sm" data-upload-audio>🎙️ رفع صوت</button>
          ${s.audioUrl ? `<button class="btn-secondary btn-sm" data-play-audio>🔊 معاينة</button><button class="btn-delete btn-sm" data-del-audio>حذف الصوت</button>` : `<span class="focus-instruction">اختياري: صوت يُنطق قبل الكتابة</span>`}
        </div>`;
      row.querySelectorAll("[data-f]").forEach(el => el.addEventListener("input", () => s[el.dataset.f] = el.value));
      const ua = row.querySelector("[data-upload-audio]");
      ua.addEventListener("click", () => pickFile("audio/*", async (f) => {
        ua.disabled = true; ua.textContent = "جارٍ الرفع…";
        try { s.audioUrl = await gqUploadMedia(f, "audio"); showToast("تم رفع الصوت", "success"); renderGqLists(); }
        catch (e) { showToast(e.message === "too_large" ? "الملف كبير جداً (>6م.ب)" : "تعذّر الرفع", "error"); ua.disabled = false; }
      }));
      const pa = row.querySelector("[data-play-audio]"); if (pa) pa.addEventListener("click", () => gqPlaySentenceAudio(s.audioUrl));
      const da = row.querySelector("[data-del-audio]"); if (da) da.addEventListener("click", () => { delete s.audioUrl; renderGqLists(); });
      row.querySelector("[data-del]").addEventListener("click", () => { d.sentences.splice(i, 1); renderGqLists(); });
      sc.appendChild(row);
    });

    // ---- questions ----
    const qc = $("gqa-questions"); qc.innerHTML = "";
    d.questions.forEach((q, i) => {
      const row = document.createElement("div"); row.className = "gqa-item";
      const isMcq = q.type === "mcq";
      let inner = `<div class="gqa-item-head"><strong>سؤال ${i + 1}</strong>
        <span class="gqa-item-actions">
          <label class="gqa-type-label">النوع
            <select class="select-minimal" data-f="type">
              <option value="mcq" ${isMcq ? "selected" : ""}>اختيار</option>
              <option value="fill" ${!isMcq ? "selected" : ""}>إكمال فراغ</option>
            </select></label>
          <button class="btn-delete" data-del>حذف</button></span></div>
        <input class="input-minimal" dir="ltr" data-f="prompt" placeholder="نص السؤال (استخدم ____ للفراغ)" value="${escapeHtml(q.prompt || "")}">`;
      if (isMcq) {
        const choices = (q.choices && q.choices.length) ? q.choices : ["", ""];
        inner += `<div class="gqa-choices">`;
        choices.forEach((ch, ci) => {
          inner += `<div class="gqa-choice-row">
            <input type="radio" name="gqa-ans-${i}" data-correct value="${ci}" ${q.answer === ci ? "checked" : ""} title="الإجابة الصحيحة">
            <input class="input-minimal" dir="ltr" data-choice="${ci}" placeholder="خيار ${ci + 1}" value="${escapeHtml(ch)}">
            <button class="btn-delete btn-sm" data-delchoice="${ci}">×</button>
          </div>`;
        });
        inner += `</div><button class="btn-secondary btn-sm" data-addchoice>+ خيار</button>`;
      } else {
        inner += `<input class="input-minimal" dir="ltr" data-f="answerfill" placeholder="الإجابات المقبولة (افصل بـ | )" value="${escapeHtml((q.answer || []).join(" | "))}">`;
      }
      inner += `<input class="input-minimal" data-f="correctFeedback" placeholder="يظهر عند الإجابة الصحيحة" value="${escapeHtml(q.correctFeedback || "")}">
        <input class="input-minimal" data-f="wrongFeedback" placeholder="يظهر عند الإجابة الخاطئة (ذكّر بالقاعدة)" value="${escapeHtml(q.wrongFeedback || "")}">`;
      row.innerHTML = inner;
      row.querySelector('[data-f="type"]').addEventListener("change", e => {
        q.type = e.target.value;
        if (q.type === "mcq" && !Array.isArray(q.choices)) { q.choices = ["", ""]; q.answer = 0; }
        if (q.type === "fill" && !Array.isArray(q.answer)) { q.answer = []; }
        renderGqLists();
      });
      ["prompt", "correctFeedback", "wrongFeedback"].forEach(f => {
        const el = row.querySelector(`[data-f="${f}"]`); if (el) el.addEventListener("input", () => q[f] = el.value);
      });
      if (isMcq) {
        row.querySelectorAll("[data-choice]").forEach(el => el.addEventListener("input", () => { q.choices[+el.dataset.choice] = el.value; }));
        row.querySelectorAll("[data-correct]").forEach(el => el.addEventListener("change", () => { q.answer = +el.value; }));
        row.querySelectorAll("[data-delchoice]").forEach(el => el.addEventListener("click", () => {
          if (q.choices.length <= 2) { showToast("سؤال الاختيار يحتاج خيارين على الأقل", "info"); return; }
          q.choices.splice(+el.dataset.delchoice, 1);
          if (q.answer >= q.choices.length) q.answer = 0;
          renderGqLists();
        }));
        row.querySelector("[data-addchoice]").addEventListener("click", () => { q.choices.push(""); renderGqLists(); });
      } else {
        const af = row.querySelector('[data-f="answerfill"]');
        af.addEventListener("input", () => { q.answer = af.value.split("|").map(x => x.trim()).filter(Boolean); });
      }
      row.querySelector("[data-del]").addEventListener("click", () => { d.questions.splice(i, 1); renderGqLists(); });
      qc.appendChild(row);
    });
  }

  // v2.7: sidebar tab → which inner panel(s) to display (clean 1:1 mapping)
  const PANEL_MAP = {
    account:     ["account"],
    preferences: ["preferences"],
    texts:       ["texts"],
    display:     ["display"],
    performance: ["performance"],
    learning:    ["learning"]
  };

  function switchProfilePanel(tab) {
    document.querySelectorAll(".profile-sidebar-tab").forEach(b =>
      b.classList.toggle("active", b.dataset.panel === tab)
    );
    const showSet = new Set(PANEL_MAP[tab] || [tab]);
    document.querySelectorAll(".profile-panel").forEach(p =>
      p.classList.toggle("active", showSet.has(p.dataset.panel))
    );

    // Lazy-render heavy panels
    if (tab === "performance") renderPerformanceTab();
    if (tab === "display") renderDisplayTab();
    if (tab === "learning") renderLearningTab();
  }

  // ============================ DISPLAY TAB ============================
  function renderDisplayTab() {
    if (!profile) return;
    const mode = profile.advanceMode || "enter";
    document.querySelectorAll('input[name="advance-mode"]').forEach(r => {
      r.checked = r.value === mode;
    });
    const idle = $("idle-pause-seconds");
    if (idle) idle.value = String(profile.idlePauseSec != null ? profile.idlePauseSec : 5);
    const dr = $("default-repetitions");
    if (dr) dr.value = String(profile.repetitions || 1);
    syncAppearanceControls();
    syncPracticeControls();
  }

  function bindDisplayTab() {
    document.querySelectorAll('input[name="advance-mode"]').forEach(r => {
      r.addEventListener("change", () => {
        profile.advanceMode = r.value;
        localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      });
    });
    const idle = $("idle-pause-seconds");
    if (idle) idle.addEventListener("change", () => {
      profile.idlePauseSec = Math.max(0, Math.min(60, parseInt(idle.value, 10) || 0));
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    });
    const dr = $("default-repetitions");
    if (dr) dr.addEventListener("change", () => {
      profile.repetitions = Math.max(1, Math.min(100, parseInt(dr.value, 10) || 1));
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      syncRepetitionUI();
    });
  }

  // ============================ PERFORMANCE TAB ============================
  // Daily streak (current + best) computed from attempt timestamps.
  function midnightOf(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function computeStreak(attempts) {
    const DAY = 86400000;
    const days = new Set(attempts.filter(a => a.ts).map(a => midnightOf(a.ts)));
    if (days.size === 0) return { current: 0, best: 0 };
    const sorted = [...days].sort((a, b) => a - b);
    let best = 1, run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] === DAY) { run++; best = Math.max(best, run); }
      else run = 1;
    }
    const today = midnightOf(Date.now());
    let cursor = days.has(today) ? today : (days.has(today - DAY) ? today - DAY : null);
    let current = 0;
    while (cursor !== null && days.has(cursor)) { current++; cursor -= DAY; }
    return { current, best: Math.max(best, current) };
  }

  // Simple two-line SVG chart (WPM + accuracy) over the recent attempts.
  function renderProgressChart(attempts) {
    const el = $("perf-chart");
    if (!el) return;
    const data = attempts.slice(0, 20).reverse(); // oldest → newest
    if (data.length < 2) {
      el.innerHTML = `<p class="focus-instruction">تحتاج محاولتين على الأقل لعرض الرسم البياني.</p>`;
      return;
    }
    const W = 600, H = 160, pad = 24;
    const wpms = data.map(d => d.wpm || 0);
    const accs = data.map(d => d.accuracy || 0);
    const maxW = Math.max(...wpms, 10);
    const x = i => pad + (i * (W - 2 * pad) / (data.length - 1));
    const yW = v => H - pad - (v / maxW) * (H - 2 * pad);
    const yA = v => H - pad - (v / 100) * (H - 2 * pad);
    const path = (arr, y) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="progress-chart" preserveAspectRatio="none" role="img" aria-label="تطور السرعة والدقة">
        <path d="${path(accs, yA)}" fill="none" stroke="var(--success-color)" stroke-width="2" opacity="0.55"/>
        <path d="${path(wpms, yW)}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      </svg>
      <div class="chart-legend">
        <span><i style="background:var(--accent)"></i> السرعة (WPM)</span>
        <span><i style="background:var(--success-color)"></i> الدقة (%)</span>
      </div>`;
  }

  function renderPerformanceTab() {
    const target = currentUser ? currentUser.username : "guest";
    const attempts = historyData.filter(h => (h.username || "guest") === target);

    // Overview stats
    const overview = $("perf-overview");
    if (overview) {
      if (attempts.length === 0) {
        overview.innerHTML = `<p class="focus-instruction" style="grid-column: 1/-1; text-align: center; padding: 2rem;">لا توجد بيانات أداء بعد — ابدأ التدريب لرؤية تحليلك.</p>`;
      } else {
        const avgWpm = Math.round(attempts.reduce((s, h) => s + (h.wpm || 0), 0) / attempts.length);
        const avgAcc = Math.round(attempts.reduce((s, h) => s + (h.accuracy || 0), 0) / attempts.length);
        const bestWpm = Math.max(...attempts.map(h => h.wpm || 0));
        const totalTime = attempts.reduce((s, h) => s + (h.time || 0), 0);
        const streak = computeStreak(attempts);
        overview.innerHTML = `
          <div class="perf-stat"><div class="perf-stat-val">${attempts.length}</div><div class="perf-stat-label">محاولة</div></div>
          <div class="perf-stat"><div class="perf-stat-val">${avgWpm}</div><div class="perf-stat-label">متوسط WPM</div></div>
          <div class="perf-stat"><div class="perf-stat-val">${avgAcc}%</div><div class="perf-stat-label">متوسط الدقة</div></div>
          <div class="perf-stat"><div class="perf-stat-val">${bestWpm}</div><div class="perf-stat-label">أعلى سرعة</div></div>
          <div class="perf-stat"><div class="perf-stat-val">${Math.floor(totalTime/60)}m</div><div class="perf-stat-label">وقت التدريب</div></div>
          <div class="perf-stat"><div class="perf-stat-val">🔥 ${streak.current}</div><div class="perf-stat-label">سلسلة أيام</div></div>
          <div class="perf-stat"><div class="perf-stat-val">${streak.best}</div><div class="perf-stat-label">أطول سلسلة</div></div>
        `;
      }
    }

    renderProgressChart(attempts);

    // Aggregate error chars + words across all attempts
    const charAgg = {};
    const wordAgg = {};
    attempts.forEach(a => {
      if (a.errorChars) Object.entries(a.errorChars).forEach(([c, n]) => { charAgg[c] = (charAgg[c]||0)+n; });
      if (a.errorWords) Object.entries(a.errorWords).forEach(([w, n]) => { wordAgg[w] = (wordAgg[w]||0)+n; });
    });

    const ec = $("perf-error-chars");
    if (ec) {
      const sorted = Object.entries(charAgg).sort((a,b) => b[1]-a[1]).slice(0, 20);
      if (sorted.length === 0) ec.innerHTML = `<li class="focus-instruction">لا أخطاء مسجلة بعد.</li>`;
      else ec.innerHTML = sorted.map(([c, n]) =>
        `<li class="error-tag">"${c === " " ? "Space" : escapeHtml(c)}" <span>x${n}</span></li>`
      ).join("");
    }

    const ew = $("perf-error-words");
    if (ew) {
      const sorted = Object.entries(wordAgg).sort((a,b) => b[1]-a[1]).slice(0, 30);
      if (sorted.length === 0) ew.innerHTML = `<li class="focus-instruction">لا كلمات خطأ مسجلة بعد.</li>`;
      else ew.innerHTML = sorted.map(([w, n]) =>
        `<li class="error-tag">${escapeHtml(w)} <span>x${n}</span></li>`
      ).join("");
    }

    // Full history table
    const tbody = $("perf-history-body");
    if (tbody) {
      tbody.innerHTML = "";
      if (attempts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); font-style: italic;">لا محاولات بعد.</td></tr>`;
      } else {
        attempts.forEach(it => {
          const ctx = it.context || {};
          const trackName = ctx.goal === "english"
            ? (getReasons().find(r => r.id === ctx.reason)?.name_ar || "إنجليزي")
            : (ctx.goal === "typing" ? "كتابة" : "—");
          const sz = SIZE_OPTIONS.find(s => s.id === ctx.size)?.name_ar || "—";
          const accClass = it.accuracy >= 95 ? "accuracy-high" : "";
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${it.date}</td>
            <td>${trackName}</td>
            <td>${ctx.level || "—"}</td>
            <td>${sz}</td>
            <td><strong>${it.wpm}</strong></td>
            <td class="${accClass}"><strong>${it.accuracy}%</strong></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  }

  function bindEvents() {
    themeBtn.addEventListener("click", toggleTheme);
    focusBtn.addEventListener("click", toggleFocus);
    soundSel.addEventListener("change", handleSoundChange);
    restartOnboardingBtn.addEventListener("click", restartOnboarding);

    // Onboarding step 1: goal
    document.querySelectorAll("[data-goal]").forEach(btn => {
      btn.addEventListener("click", () => handleGoalChoice(btn.dataset.goal));
    });

    // Back buttons
    document.querySelectorAll("[data-back-to]").forEach(btn => {
      btn.addEventListener("click", () => showOnboarding(btn.dataset.backTo));
    });
    sizeBackBtn.addEventListener("click", () => {
      // back depends on goal
      const tmp = JSON.parse(localStorage.getItem("typeflow_tmp_profile") || "{}");
      showOnboarding(tmp.goal === "english" ? "reason" : "goal");
    });

    // Practice
    workbench.addEventListener("click", () => {
      // Don't steal focus into the hidden input while the user is selecting
      // text — focusing the input clears the selection before the context
      // menu (translate / copy / add-to-learning) can read it.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) return;
      typingInput.focus();
    });
    typingInput.addEventListener("input", handleTypingInput);
    typingInput.addEventListener("keydown", handleKeyDown);
    resetBtn.addEventListener("click", resetParagraph);
    skipBtn.addEventListener("click", () => nextParagraph(true));
    restartBtn.addEventListener("click", resetParagraph);
    nextBtn.addEventListener("click", () => nextParagraph());

    // Collapsible settings panel
    toggleSettingsBtn.addEventListener("click", () => {
      const open = settingsPanel.style.display !== "none";
      settingsPanel.style.display = open ? "none" : "flex";
      toggleSettingsBtn.classList.toggle("active", !open);
      // Closing the panel → return focus to the typing area so the user can
      // resume typing immediately without an extra click.
      if (open && typeof typingInput !== "undefined" && practiceSec.style.display !== "none") {
        typingInput.focus();
      }
    });

    // Reset defaults (only meaningful in default workspaces)
    resetDefaultsBtn.addEventListener("click", handleResetWorkspaceDefaults);

    // Quick-add text inside current workspace
    quickAddInput.addEventListener("input", () => {
      const size = classifySize(quickAddInput.value);
      quickClassifyBadge.textContent = sizeLabel(size);
      quickClassifyBadge.className = `size-badge size-${size}`;
    });
    quickAddBtn.addEventListener("click", handleQuickAdd);

    // Repetition input (number 1-100, v2.6)
    repetitionSel.addEventListener("change", (e) => {
      const v = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
      e.target.value = v;
      profile.repetitions = v;
      currentRepetition = 1;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      loadCurrentParagraph();
    });

    // Content tabs in profile
    textsSubtabs.forEach(btn =>
      btn.addEventListener("click", () => switchTextsSubtab(btn.dataset.subtab))
    );

    // Folder management
    addFolderForm.addEventListener("submit", handleAddFolder);
    filterFolder.addEventListener("change", () => {
      renderUserContentList();
    });
    // folderSelect removed in v2.4 (workspace owns the folder, no separate dropdown)

    // Delete all (with password)
    deleteAllBtn.addEventListener("click", openDeleteAllPanel);
    cancelDeleteAllBtn.addEventListener("click", closeDeleteAllPanel);
    confirmDeleteAllBtn.addEventListener("click", confirmDeleteAll);

    // Default content browser filters
    dfTrackSel.addEventListener("change", () => {
      updateDefaultFiltersVisibility();
      renderDefaultContentList();
    });
    [dfReasonSel, dfLevelSel, dfSizeSel].forEach(sel =>
      sel.addEventListener("change", renderDefaultContentList)
    );

    // Auth
    authBtn.addEventListener("click", handleAuthBtnClick);
    closeAuthBtn.addEventListener("click", closeAuthModal);
    authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuthModal(); });
    tabLoginBtn.addEventListener("click", () => switchAuthTab("login"));
    tabSignupBtn.addEventListener("click", () => switchAuthTab("signup"));
    loginForm.addEventListener("submit", handleLogin);
    signupForm.addEventListener("submit", handleSignup);

    // Admin
    adminLink.addEventListener("click", openAdmin);
    adminBackBtn.addEventListener("click", closeAdmin);
    adminTabContent.addEventListener("click", () => switchAdminTab("content"));
    adminTabUsers.addEventListener("click", () => switchAdminTab("users"));
    adminTabGrammar.addEventListener("click", () => switchAdminTab("grammar"));
    $("gqa-new-btn").addEventListener("click", gqaNew);
    adminTrack.addEventListener("change", updateAdminFormVisibility);
    addContentForm.addEventListener("submit", handleAddContent);

    // Landing (v2.5)
    if (landingStartBtn) {
      landingStartBtn.addEventListener("click", () => {
        // Sign up flow
        resetAuthForms();
        switchAuthTab("signup");
        authModal.style.display = "flex";
      });
    }
    if (landingLoginBtn) {
      landingLoginBtn.addEventListener("click", () => {
        resetAuthForms();
        switchAuthTab("login");
        authModal.style.display = "flex";
      });
    }

    // Zen mode exit
    if (zenExitBtn) {
      zenExitBtn.addEventListener("click", () => {
        document.body.classList.remove("zen-mode");
        isFocusMode = false;
        focusBtn.classList.remove("active");
      });
    }

    // Sidebar tabs in profile (v2.5)
    document.querySelectorAll(".profile-sidebar-tab").forEach(btn => {
      btn.addEventListener("click", () => switchProfilePanel(btn.dataset.panel));
    });

    // Live assist (pronunciation + translation)
    $("word-assist-speak")?.addEventListener("click", () => {
      if (currentAssistWord) speakWord(currentAssistWord);
    });
    $("assist-accent")?.addEventListener("change", (e) => {
      if (!profile) return;
      profile.accent = e.target.value;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    });
    $("assist-lang")?.addEventListener("change", (e) => {
      if (!profile) return;
      profile.translateTo = e.target.value;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      initLiveAssist(); // re-translate in the new language
    });
    $("assist-speak")?.addEventListener("change", (e) => {
      if (!profile) return;
      profile.speakEnabled = e.target.checked;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      refreshAssistVisibility();
    });
    $("assist-rate")?.addEventListener("input", (e) => {
      if (!profile) return;
      const v = parseInt(e.target.value, 10) || 95;
      profile.speechRate = v / 100;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      const rv = $("assist-rate-val"); if (rv) rv.textContent = v + "%";
    });
    // Preview the new speed when the user releases the slider
    $("assist-rate")?.addEventListener("change", () => {
      if (currentAssistWord) speakWord(currentAssistWord);
    });
    $("assist-translations")?.addEventListener("change", (e) => {
      if (!profile) return;
      profile.showTranslations = e.target.checked;
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
      refreshAssistVisibility();
      if (e.target.checked) initLiveAssist();
    });

    // Data backup (export / import)
    $("export-data-btn")?.addEventListener("click", exportData);
    $("import-data-btn")?.addEventListener("click", () => $("import-data-file")?.click());
    $("import-data-file")?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
      e.target.value = "";
    });

    // Appearance controls
    $("appearance-accent")?.addEventListener("input", (e) => setAppearance({ accent: e.target.value }));
    $("appearance-bg")?.addEventListener("input", (e) => setAppearance({ bg: e.target.value }));
    $("appearance-font")?.addEventListener("change", (e) => setAppearance({ font: e.target.value || null }));
    $("appearance-size")?.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10) || 100;
      const sv = $("appearance-size-val"); if (sv) sv.textContent = v + "%";
      setAppearance({ size: v });
    });
    $("appearance-reset")?.addEventListener("click", () => {
      localStorage.removeItem("typeflow_appearance");
      applyAppearance();
      syncAppearanceControls();
      syncPracticeControls();
      showToast("تمت إعادة المظهر الافتراضي", "info");
    });

    // Practice-area appearance controls
    $("practice-presets")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-preset]");
      if (chip) applyPracticePreset(chip.dataset.preset);
    });
    $("practice-font")?.addEventListener("change", (e) => setPracticeAppearance({ font: e.target.value || null }));
    $("practice-size")?.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10) || 100;
      const sv = $("practice-size-val"); if (sv) sv.textContent = v + "%";
      setPracticeAppearance({ size: v });
    });
    $("practice-bg")?.addEventListener("input", (e) => setPracticeAppearance({ bg: e.target.value }));
    $("practice-typed")?.addEventListener("input", (e) => setPracticeAppearance({ typed: e.target.value }));
    $("practice-untyped")?.addEventListener("input", (e) => setPracticeAppearance({ untyped: e.target.value }));
    $("practice-active")?.addEventListener("input", (e) => setPracticeAppearance({ active: e.target.value }));
    $("practice-cursor")?.addEventListener("input", (e) => setPracticeAppearance({ cursor: e.target.value }));
    $("practice-tr-font")?.addEventListener("change", (e) => setPracticeAppearance({ trFont: e.target.value || null }));
    $("practice-tr-size")?.addEventListener("input", (e) => {
      const v = parseInt(e.target.value, 10) || 100;
      const tv = $("practice-tr-size-val"); if (tv) tv.textContent = v + "%";
      setPracticeAppearance({ trSize: v });
    });
    $("practice-appearance-reset")?.addEventListener("click", () => {
      applyPracticePreset("default");
      showToast("تمت إعادة مظهر التدريب الافتراضي", "info");
    });

    // Learning list tab actions
    $("learning-clear")?.addEventListener("click", clearLearningList);
    $("learning-translate-missing")?.addEventListener("click", translateMissingLearning);
    $("learning-practice")?.addEventListener("click", practiceLearningList);
    $("learning-list")?.addEventListener("click", (e) => {
      const del = e.target.closest("[data-learn-del]");
      if (del) { removeLearningItem(del.dataset.learnDel); return; }
      const tr = e.target.closest("[data-learn-translate]");
      if (tr) { translateOneLearning(tr.dataset.learnTranslate); return; }
    });

    // Profile
    profileBtn.addEventListener("click", openProfile);
    profileBackBtn.addEventListener("click", () => closeProfile());

    // Grammar Quests
    grammarLink.addEventListener("click", openGrammarSection);
    grammarBackBtn.addEventListener("click", () => { if (profile) enterPracticeMode(); else showLanding(); });
    $("gq-start-challenge").addEventListener("click", () => setQuestStep(2));
    $("gq-typing-input").addEventListener("input", handleGqTyping);
    $("gq-typing-workbench").addEventListener("click", () => $("gq-typing-input").focus());
    $("gq-quiz-submit").addEventListener("click", evaluateAnswer);
    $("gq-next-q").addEventListener("click", nextQuizQuestion);
    $("gq-retry-q").addEventListener("click", retryQuizQuestion);
    $("gq-review-concept").addEventListener("click", () => setQuestStep(1));
    $("gq-replay").addEventListener("click", () => { if (gqQuest) startQuest(gqQuest.id); });
    $("gq-back-to-list").addEventListener("click", showQuestList);
    changePassBtn.addEventListener("click", () => {
      changePassForm.style.display = "flex";
      changePassBtn.style.display = "none";
    });
    cancelPassBtn.addEventListener("click", () => {
      changePassForm.style.display = "none";
      changePassBtn.style.display = "inline-flex";
      changePassForm.reset();
      changePassErr.style.display = "none";
      changePassOk.style.display = "none";
    });
    changePassForm.addEventListener("submit", handleChangePassword);
    editGoalBtn.addEventListener("click", () => openInlineEditor("goal"));
    editLevelBtn.addEventListener("click", () => openInlineEditor("level"));
    editReasonBtn.addEventListener("click", () => openInlineEditor("reason"));
    if (prefSizeSel) {
      prefSizeSel.addEventListener("change", (e) => {
        profile.sizes = [e.target.value];
        profile.size  = e.target.value;
        localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
        renderDefaultContentList();
        renderUserContentList();
      });
    }

    // v2.6: Display tab bindings
    bindDisplayTab();

    // v2.6: prev/pause buttons
    const prevBtn  = $("prev-btn");
    const pauseBtn = $("pause-btn");
    if (prevBtn)  prevBtn.addEventListener("click", prevParagraph);
    if (pauseBtn) pauseBtn.addEventListener("click", togglePause);

    // v2.6: idle pause detector
    typingInput.addEventListener("input", () => { lastTypeAt = Date.now(); resumeIfIdlePaused(); });
    typingInput.addEventListener("keydown", () => { lastTypeAt = Date.now(); });

    // v2.6: Enter to advance after summary (only when advanceMode is 'enter')
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && summary.style.display !== "none" && (profile?.advanceMode || "enter") === "enter") {
        e.preventDefault();
        nextParagraph();
      }
    });

    // v2.6: Folder source picker in settings panel
    const folderSourceSelect = $("folder-source-select");
    if (folderSourceSelect) {
      folderSourceSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (val === "all") {
          if (profile.workspace && profile.workspace.type === "user") {
            // Was in a user folder, switch back to default
            profile.workspace = { type: "default", reason: profile.reason || "jobs", level: profile.level || "A1" };
          }
        } else {
          profile.workspace = { type: "user", folderId: val };
        }
        syncProfileLegacy();
        localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
        currentRepetition = 1;
        currentIndex = 0;
        loadParagraphPool();
        renderContextBar();
        loadCurrentParagraph();
      });
    }
    addUserContentForm.addEventListener("submit", handleAddUserContent);
    userContentInput.addEventListener("input", updateClassifyPreview);
    uploadZone.addEventListener("click", () => excelFileInput.click());
    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("drag-over");
    });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length) handleExcelFile(e.dataTransfer.files[0]);
    });
    excelFileInput.addEventListener("change", (e) => {
      if (e.target.files.length) handleExcelFile(e.target.files[0]);
    });
    downloadTemplateBtn.addEventListener("click", downloadExcelTemplate);
    filterUserContent.addEventListener("change", renderUserContentList);
    guestLoginBtn.addEventListener("click", () => {
      closeProfile();
      handleAuthBtnClick();
    });

    // ESC for focus mode
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isFocusMode) toggleFocus();
    });

    // Alt-based shortcuts (only while practicing; Alt combos don't type text)
    document.addEventListener("keydown", (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (practiceSec.style.display === "none") return;
      const actions = {
        KeyN: () => nextParagraph(),
        KeyP: () => prevParagraph(),
        KeyR: () => resetParagraph(),
        KeyS: () => $("toggle-settings-btn")?.click(),
        KeyF: () => toggleFocus()
      };
      if (actions[e.code]) { e.preventDefault(); actions[e.code](); }
    });
  }

  // ============================ THEME / SOUND ============================
  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      themeBtn.innerHTML = '<svg class="icon"><use href="#i-sun"/></svg>';
    } else {
      document.body.classList.remove("dark-mode");
      themeBtn.innerHTML = '<svg class="icon"><use href="#i-moon"/></svg>';
    }
    localStorage.setItem(STORAGE.theme, theme);
  }

  function toggleTheme() {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
  }

  // ============================ APPEARANCE (colors / font / size) ============================
  // Stored globally (like the theme) in typeflow_appearance:
  //   { accent, bg, font, size }  — every field optional; absent = default.
  // Custom vars are set inline on <body> so they win over body.dark-mode tokens.
  function getAppearance() {
    try { return JSON.parse(localStorage.getItem("typeflow_appearance") || "{}"); } catch { return {}; }
  }
  function setAppearance(patch) {
    const a = { ...getAppearance(), ...patch };
    Object.keys(a).forEach(k => { if (a[k] == null || a[k] === "") delete a[k]; });
    localStorage.setItem("typeflow_appearance", JSON.stringify(a));
    applyAppearance();
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  }
  function mixHex(hex, target, amt) { // amt 0..1 toward target color
    const a = hexToRgb(hex), b = hexToRgb(target);
    if (!a || !b) return hex;
    return rgbToHex(a[0] + (b[0] - a[0]) * amt, a[1] + (b[1] - a[1]) * amt, a[2] + (b[2] - a[2]) * amt);
  }
  function isLight(hex) {
    const c = hexToRgb(hex);
    if (!c) return false;
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 > 0.45;
  }

  function applyAppearance() {
    const a = getAppearance();
    const s = document.body.style;
    const clear = (...props) => props.forEach(p => s.removeProperty(p));

    // ---- Accent ----
    if (a.accent && hexToRgb(a.accent)) {
      const [r, g, b] = hexToRgb(a.accent);
      s.setProperty("--accent", a.accent);
      s.setProperty("--accent-strong", a.accent);
      s.setProperty("--accent-hover", mixHex(a.accent, "#000000", 0.15));
      s.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.12)`);
      s.setProperty("--accent-ring", `rgba(${r}, ${g}, ${b}, 0.35)`);
      s.setProperty("--on-accent", isLight(a.accent) ? "#14161a" : "#ffffff");
    } else {
      clear("--accent", "--accent-strong", "--accent-hover", "--accent-soft", "--accent-ring", "--on-accent");
    }

    // ---- Background (text colors derived from luminance so it stays readable) ----
    if (a.bg && hexToRgb(a.bg)) {
      const light = isLight(a.bg);
      const ink = light ? "#14161a" : "#eceef1";
      s.setProperty("--page-bg", a.bg);
      s.setProperty("--bg-color", mixHex(a.bg, "#ffffff", light ? 0.6 : 0.05));
      s.setProperty("--surface-2", mixHex(a.bg, light ? "#000000" : "#ffffff", 0.04));
      s.setProperty("--hover-bg",  mixHex(a.bg, light ? "#000000" : "#ffffff", 0.05));
      s.setProperty("--active-bg", mixHex(a.bg, light ? "#000000" : "#ffffff", 0.09));
      s.setProperty("--text-color", ink);
      s.setProperty("--text-muted", light ? "#5b6470" : "#9aa3af");
      s.setProperty("--text-dim",   light ? "#9aa3af" : "#5b6470");
      s.setProperty("--border-color",  mixHex(a.bg, ink, 0.12));
      s.setProperty("--border-strong", mixHex(a.bg, ink, 0.22));
    } else {
      clear("--page-bg", "--bg-color", "--surface-2", "--hover-bg", "--active-bg",
            "--text-color", "--text-muted", "--text-dim", "--border-color", "--border-strong");
    }

    // ---- Font family (whole UI) ----
    if (a.font) {
      s.setProperty("--font-sans", a.font);
      s.setProperty("--font-mono", a.font);
      s.setProperty("font-family", a.font);
    } else {
      clear("--font-sans", "--font-mono", "font-family");
    }

    // ---- Font size (rem base → scales the whole UI) ----
    document.documentElement.style.fontSize = (a.size && a.size !== 100) ? a.size + "%" : "";

    // ---- Practice-area specific overrides ----
    const p = a.practice || {};
    const setOrClear = (prop, val) => val ? s.setProperty(prop, val) : s.removeProperty(prop);
    setOrClear("--practice-font", p.font);
    setOrClear("--practice-scale", p.size && p.size !== 100 ? String(p.size / 100) : null);
    setOrClear("--practice-bg", p.bg && hexToRgb(p.bg) ? p.bg : null);
    setOrClear("--practice-typed", p.typed && hexToRgb(p.typed) ? p.typed : null);
    setOrClear("--practice-untyped", p.untyped && hexToRgb(p.untyped) ? p.untyped : null);
    setOrClear("--practice-active", p.active && hexToRgb(p.active) ? p.active : null);
    setOrClear("--practice-cursor", p.cursor && hexToRgb(p.cursor) ? p.cursor : null);
    setOrClear("--practice-tr-font", p.trFont);
    setOrClear("--practice-tr-scale", p.trSize && p.trSize !== 100 ? String(p.trSize / 100) : null);
  }

  function setPracticeAppearance(patch) {
    const a = getAppearance();
    const p = { ...(a.practice || {}), ...patch };
    Object.keys(p).forEach(k => { if (p[k] == null || p[k] === "") delete p[k]; });
    if (Object.keys(p).length) a.practice = p; else delete a.practice;
    localStorage.setItem("typeflow_appearance", JSON.stringify(a));
    applyAppearance();
  }

  // Ready-made practice themes (cohesive combos for bg/typed/untyped/cursor).
  const PRACTICE_PRESETS = {
    default: null, // clears the practice overrides
    paper:   { bg: "#f5efe0", typed: "#3d3526", untyped: "#b3a98e", active: "#1f1a10", cursor: "#8a6d3b" },
    matrix:  { bg: "#0a0f0a", typed: "#33ff66", untyped: "#1d5c2e", active: "#aaffcc", cursor: "#33ff66" },
    ocean:   { bg: "#0a1622", typed: "#9fd6ff", untyped: "#33536b", active: "#e0f2ff", cursor: "#38bdf8" },
    sunset:  { bg: "#1c1210", typed: "#ffc899", untyped: "#6b4a38", active: "#ffe7d1", cursor: "#fb923c" },
    violet:  { bg: "#15101f", typed: "#d6c6ff", untyped: "#4d3f6b", active: "#f1e9ff", cursor: "#a78bfa" }
  };

  function applyPracticePreset(name) {
    const a = getAppearance();
    const preset = PRACTICE_PRESETS[name];
    if (!preset) delete a.practice;
    else a.practice = { ...(a.practice || {}), ...preset };
    localStorage.setItem("typeflow_appearance", JSON.stringify(a));
    applyAppearance();
    syncPracticeControls();
  }

  function syncPracticeControls() {
    const p = getAppearance().practice || {};
    const dark = currentTheme === "dark";
    const set = (id, val) => { const el = $(id); if (el) el.value = val; };
    set("practice-font", p.font || "");
    set("practice-size", p.size || 100);
    const sv = $("practice-size-val"); if (sv) sv.textContent = (p.size || 100) + "%";
    set("practice-bg", p.bg || (dark ? "#15181d" : "#ffffff"));
    set("practice-typed", p.typed || (dark ? "#eceef1" : "#14161a"));
    set("practice-untyped", p.untyped || (dark ? "#5b6470" : "#9aa3af"));
    set("practice-active", p.active || (dark ? "#eceef1" : "#14161a"));
    set("practice-cursor", p.cursor || (dark ? "#8b97ff" : "#4d5bd6"));
    set("practice-tr-font", p.trFont || "");
    set("practice-tr-size", p.trSize || 100);
    const tv = $("practice-tr-size-val"); if (tv) tv.textContent = (p.trSize || 100) + "%";
  }

  function syncAppearanceControls() {
    const a = getAppearance();
    const acc = $("appearance-accent"); if (acc) acc.value = a.accent || "#4d5bd6";
    const bg  = $("appearance-bg");     if (bg)  bg.value  = a.bg || (currentTheme === "dark" ? "#0c0e11" : "#f6f7f9");
    const f   = $("appearance-font");   if (f)   f.value   = a.font || "";
    const sz  = $("appearance-size");   if (sz)  sz.value  = a.size || 100;
    const sv  = $("appearance-size-val"); if (sv) sv.textContent = (a.size || 100) + "%";
  }

  function toggleFocus() {
    // zen-mode is the real full-screen focus experience. Toggle it from the
    // actual current state so the header button and the floating exit button
    // stay in sync — and re-entry works after exiting.
    const inZen = document.body.classList.toggle("zen-mode");
    isFocusMode = inZen;
    focusBtn.classList.toggle("active", inZen);
  }

  function handleSoundChange(e) {
    const v = e.target.value;
    if (v === "none") {
      isSoundEnabled = false;
      typingAudio.enabled = false;
    } else {
      isSoundEnabled = true;
      typingAudio.enabled = true;
      soundType = v;
      typingAudio.soundType = v;
    }
    localStorage.setItem(STORAGE.sound, soundType);
    localStorage.setItem(STORAGE.soundOn, isSoundEnabled);
    typingAudio.playKeySound();
  }

  // ============================ ONBOARDING ============================
  function renderOnboardingGrids() {
    // Levels
    levelsGrid.innerHTML = "";
    CEFR_LEVELS.forEach(lvl => {
      const btn = document.createElement("button");
      btn.className = "option-card";
      btn.innerHTML = `
        <span class="option-title" style="font-family: var(--font-mono); font-size: 1.4rem;">${lvl.id}</span>
        <span class="option-desc">${lvl.name_ar} / ${lvl.name_en}</span>
        <span class="option-badge">${lvl.desc_ar}</span>
      `;
      btn.addEventListener("click", () => handleLevelChoice(lvl.id));
      levelsGrid.appendChild(btn);
    });

    // Reasons
    reasonsGrid.innerHTML = "";
    REASONS.forEach(r => {
      const btn = document.createElement("button");
      btn.className = "option-card";
      btn.innerHTML = `
        <span class="option-icon">${r.icon}</span>
        <span class="option-title">${r.name_ar}</span>
        <span class="option-desc">${r.name_en}</span>
      `;
      btn.addEventListener("click", () => handleReasonChoice(r.id));
      reasonsGrid.appendChild(btn);
    });

    // Sizes will be re-rendered based on goal (typing has different sizes)
  }

  function renderSizesGrid(goal) {
    sizesGrid.innerHTML = "";
    SIZE_OPTIONS.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "option-card";
      btn.innerHTML = `
        <span class="option-icon">${s.icon}</span>
        <span class="option-title">${s.name_ar}</span>
        <span class="option-desc">${s.desc_ar}</span>
        <span class="option-badge">${s.name_en}</span>
      `;
      btn.addEventListener("click", () => handleSizeChoice(s.id));
      sizesGrid.appendChild(btn);
    });
  }

  function showOnboarding(stepName) {
    hideAllSections();
    onboardingSec.style.display = "flex";
    restartOnboardingBtn.style.display = "none";

    Object.values(steps).forEach(el => el.classList.remove("active"));
    steps[stepName].classList.add("active");

    const order = ["goal", "level", "reason", "size"];
    const idx = order.indexOf(stepName);
    dots.forEach((dot, i) => {
      dot.classList.remove("active", "done");
      if (i < idx) dot.classList.add("done");
      else if (i === idx) dot.classList.add("active");
    });
  }

  function handleGoalChoice(goal) {
    const tmp = { goal };
    localStorage.setItem("typeflow_tmp_profile", JSON.stringify(tmp));
    if (goal === "english") {
      showOnboarding("level");
    } else {
      renderSizesGrid("typing");
      showOnboarding("size");
    }
  }

  function handleLevelChoice(levelId) {
    const tmp = JSON.parse(localStorage.getItem("typeflow_tmp_profile") || "{}");
    tmp.level = levelId;
    localStorage.setItem("typeflow_tmp_profile", JSON.stringify(tmp));
    showOnboarding("reason");
  }

  function handleReasonChoice(reasonId) {
    const tmp = JSON.parse(localStorage.getItem("typeflow_tmp_profile") || "{}");
    tmp.reason = reasonId;
    localStorage.setItem("typeflow_tmp_profile", JSON.stringify(tmp));
    renderSizesGrid("english");
    showOnboarding("size");
  }

  function handleSizeChoice(sizeId) {
    const tmp = JSON.parse(localStorage.getItem("typeflow_tmp_profile") || "{}");
    // Build new-schema profile
    profile = {
      sizes: [sizeId],
      size: sizeId, // legacy mirror
      repetitions: 1
    };
    if (tmp.goal === "english") {
      profile.workspace = { type: "default", reason: tmp.reason || "jobs", level: tmp.level || "A1" };
    } else if (tmp.goal === "typing") {
      profile.workspace = { type: "typing", lang: "en" };
    }
    syncProfileLegacy();
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    localStorage.removeItem("typeflow_tmp_profile");
    enterPracticeMode();
  }

  function restartOnboarding() {
    profile = null;
    localStorage.removeItem(STORAGE.profile);
    currentIndex = 0;
    showOnboarding("goal");
  }

  // ============================ PRACTICE ENTRY ============================
  function enterPracticeMode(forcedIndex) {
    hideAllSections();
    practiceSec.style.display = "flex";
    restartOnboardingBtn.style.display = "inline-flex";
    document.body.classList.add("zen-mode");  // v2.5 — full-screen focus
    isFocusMode = true;
    focusBtn.classList.add("active");

    // Defaults for new controls
    if (!profile.source) profile.source = "all";
    if (!profile.repetitions) profile.repetitions = 1;
    if (!profile.folderId) profile.folderId = "all";

    loadParagraphPool();
    renderContextBar();
    renderSizeCheckboxes();
    syncRepetitionUI();
    syncResetButtonVisibility();
    populateFolderSelectors();
    populatePracticeFolderSource();   // v2.6
    syncAssistControls();
    renderHistory();
    startIdleChecker();               // v2.6

    // Always start with settings panel closed
    settingsPanel.style.display = "none";
    toggleSettingsBtn.classList.remove("active");
    manuallyPaused = false;
    idleIsPaused = false;
    if (idleBadgeEl) { idleBadgeEl.remove(); idleBadgeEl = null; }
    const _pb = $("pause-btn");
    if (_pb) { _pb.innerHTML = '<svg class="icon"><use href="#i-pause"/></svg>'; _pb.classList.remove("active"); }

    currentRepetition = 1;
    currentIndex = (forcedIndex !== undefined && forcedIndex !== null)
      ? forcedIndex
      : getProgressIndex();
    loadCurrentParagraph();
  }

  function loadParagraphPool() {
    syncProfileLegacy();
    const ws = profile.workspace || { type: "default", reason: "jobs", level: "A1" };
    const sizes = (Array.isArray(profile.sizes) && profile.sizes.length > 0)
      ? profile.sizes
      : ["medium"];
    let pool = [];

    if (ws.type === "default") {
      // Default workspace: built-in content + admin overrides + user overlay additions
      sizes.forEach(size => {
        pool = pool.concat(getDefaultContent(ws.reason, ws.level, size));
        // Admin-added (legacy customCtnt path)
        const adminCustoms = customCtnt
          .filter(c => c.track === "english" && c.reason === ws.reason && c.level === ws.level && c.size === size)
          .map(c => c.content);
        pool = pool.concat(adminCustoms);
        // User overlay additions
        const overlay = getOverlayItems(ws.reason, ws.level, size).map(i => i.content);
        pool = pool.concat(overlay);
      });

    } else if (ws.type === "user") {
      // User folder workspace: only items inside this folder, matching selected sizes
      const items = getUserContent(ws.folderId)
        .filter(u => sizes.includes(u.size));
      pool = items.map(i => i.content);

    } else if (ws.type === "typing") {
      // Typing-only workspace
      const lang = ws.lang || "en";
      sizes.forEach(size => {
        const drillType = size === "chunks" ? "chunks" : size;
        const base = (TYPING_DRILLS[lang] && TYPING_DRILLS[lang][drillType]) || [];
        const adminCustoms = customCtnt
          .filter(c => c.track === `typing-${lang}` && c.size === size)
          .map(c => c.content);
        pool = pool.concat(base, adminCustoms);
      });

    } else if (ws.type === "learning") {
      // Practice on the saved learning-list words/phrases
      pool = getMyLearningList().map(i => i.text);
    }

    currentParagraphs = pool;
    if (currentParagraphs.length === 0) {
      if (ws.type === "user") {
        currentParagraphs = ["لم تضف نصوصاً بهذه الأحجام في هذا المجلد بعد. أضف نصاً أو غيّر الأحجام من إعدادات العرض."];
      } else {
        currentParagraphs = ["لا يوجد محتوى متاح بهذه الإعدادات. غيّر الأحجام أو اختر مساحة عمل أخرى."];
      }
    }
  }

  function renderContextBar() {
    contextInfo.innerHTML = "";
    const ws = profile.workspace || { type: "default" };
    if (ws.type === "default") {
      const r = getReasons().find(x => x.id === ws.reason);
      const lvl = CEFR_LEVELS.find(x => x.id === ws.level);
      contextInfo.innerHTML = `
        <span class="context-chip">🌍 إنجليزي</span>
        <span class="context-chip">${r?.icon || "📁"} ${r?.name_ar || ws.reason}</span>
        <span class="context-chip">${lvl?.id || ws.level} · ${lvl?.name_ar || ""}</span>
      `;
    } else if (ws.type === "user") {
      const f = getUserFolders().find(x => x.id === ws.folderId);
      contextInfo.innerHTML = `
        <span class="context-chip">📂 مجلدي</span>
        <span class="context-chip">${f?.icon || "📁"} ${f?.name || ws.folderId}</span>
      `;
    } else if (ws.type === "typing") {
      contextInfo.innerHTML = `<span class="context-chip">⌨️ تعلم الكتابة (${(ws.lang || "en").toUpperCase()})</span>`;
    } else if (ws.type === "learning") {
      contextInfo.innerHTML = `<span class="context-chip">📚 قائمة التعلم</span>`;
    }
  }

  // Renders size checkboxes inside the settings panel
  function renderSizeCheckboxes() {
    sizeCheckboxes.innerHTML = "";
    const selected = Array.isArray(profile.sizes) ? profile.sizes : ["medium"];
    SIZE_OPTIONS.forEach(s => {
      const isChecked = selected.includes(s.id);
      const lbl = document.createElement("label");
      lbl.className = "size-checkbox" + (isChecked ? " checked" : "");
      lbl.innerHTML = `
        <input type="checkbox" value="${s.id}" ${isChecked ? "checked" : ""}>
        <span class="check-mark">✓</span>
        <span>${s.icon} ${s.name_ar}</span>
      `;
      lbl.addEventListener("click", (e) => {
        e.preventDefault();
        toggleSize(s.id);
      });
      sizeCheckboxes.appendChild(lbl);
    });
  }

  function toggleSize(sizeId) {
    if (!Array.isArray(profile.sizes)) profile.sizes = [];
    const idx = profile.sizes.indexOf(sizeId);
    if (idx >= 0) {
      // Can't deselect last one
      if (profile.sizes.length === 1) return;
      profile.sizes.splice(idx, 1);
    } else {
      profile.sizes.push(sizeId);
    }
    // Keep legacy size in sync (first one)
    profile.size = profile.sizes[0];
    currentRepetition = 1;
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    renderSizeCheckboxes();
    loadParagraphPool();
    currentIndex = 0;
    loadCurrentParagraph();
  }

  function syncRepetitionUI() {
    repetitionSel.value = String(profile.repetitions || 1);
  }

  // v2.6: populate folder source dropdown in practice settings panel
  function populatePracticeFolderSource() {
    const sel = $("folder-source-select");
    const group = $("folder-source-group");
    if (!sel || !group) return;
    const folders = getUserFolders();
    const userItemCount = getUserContent().length;
    // Only show if user actually has folders with content
    if (userItemCount === 0) {
      group.style.display = "none";
      return;
    }
    group.style.display = "flex";
    sel.innerHTML = `<option value="all">📚 المسار الافتراضي</option>` + folders.map(f => {
      const n = getUserContent(f.id).length;
      return `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)} (${n})</option>`;
    }).join("");
    // Reflect current workspace
    if (profile.workspace && profile.workspace.type === "user") {
      sel.value = profile.workspace.folderId;
    } else {
      sel.value = "all";
    }
  }

  function syncResetButtonVisibility() {
    const ws = profile.workspace;
    if (!ws || ws.type !== "default") {
      resetDefaultsGroup.style.display = "none";
      return;
    }
    const sizes = SIZE_OPTIONS.map(s => s.id);
    const hasOverlay = sizes.some(s => getOverlayItems(ws.reason, ws.level, s).length > 0);
    resetDefaultsGroup.style.display = hasOverlay ? "flex" : "none";
  }

  // ============================ RESET DEFAULTS for current workspace ============================
  function handleResetWorkspaceDefaults() {
    const ws = profile.workspace;
    if (!ws || ws.type !== "default") return;
    const r = getReasons().find(x => x.id === ws.reason);
    if (!confirm(`سيتم حذف كل ما أضفته من نصوص لمسار "${r?.name_ar || ws.reason} · ${ws.level}" وإعادة النصوص الافتراضية فقط. هل تريد المتابعة؟`)) return;
    resetOverlayWorkspace(ws.reason, ws.level);
    syncResetButtonVisibility();
    loadParagraphPool();
    currentIndex = 0;
    loadCurrentParagraph();
    typingAudio.playKeySound(false);
  }

  // ============================ QUICK-ADD to current workspace ============================
  function handleQuickAdd() {
    const text = (quickAddInput.value || "").trim();
    if (!text) return;
    const size = classifySize(text);
    const ws = profile.workspace;
    const item = {
      id: Date.now() + Math.floor(Math.random() * 999),
      content: text,
      size,
      addedAt: new Date().toISOString(),
      source: "manual"
    };
    if (ws.type === "default") {
      addOverlayItem(ws.reason, ws.level, size, item);
    } else if (ws.type === "user") {
      // Add into the active folder
      item.folderId = ws.folderId;
      const items = getUserContent();
      items.push(item);
      setUserContent(items);
    } else {
      // Typing workspace: store in customCtnt for global pool
      customCtnt.push({
        id: item.id, track: `typing-${ws.lang || "en"}`,
        size, content: text
      });
      localStorage.setItem(STORAGE.customCtnt, JSON.stringify(customCtnt));
    }
    quickAddInput.value = "";
    quickClassifyBadge.textContent = "—";
    quickClassifyBadge.className = "size-badge";
    syncResetButtonVisibility();
    loadParagraphPool();
    typingAudio.playKeySound(false);
  }

  // ============================ PARAGRAPH ENGINE ============================
  function progressKey() {
    return profile.goal === "english"
      ? `english:${profile.reason}:${profile.level}:${profile.size}`
      : `typing:${profile.lang || "en"}:${profile.size}`;
  }

  function getProgressIndex() {
    const key = progressKey();
    const arr = progress[key] || [];
    // Return next unseen index, or wrap to 0 if all done
    for (let i = 0; i < currentParagraphs.length; i++) {
      if (!arr.includes(i)) return i;
    }
    return 0;
  }

  function markProgress(idx) {
    const key = progressKey();
    if (!progress[key]) progress[key] = [];
    if (!progress[key].includes(idx)) progress[key].push(idx);
    localStorage.setItem(STORAGE.progress, JSON.stringify(progress));
  }

  function loadCurrentParagraph() {
    // Defensive guards (v2.6)
    if (typeof currentIndex !== "number" || isNaN(currentIndex) || currentIndex < 0) currentIndex = 0;
    if (!Array.isArray(currentParagraphs) || currentParagraphs.length === 0) {
      currentParagraphs = ["لا يوجد محتوى متاح."];
    }
    if (currentIndex >= currentParagraphs.length) currentIndex = 0;
    currentText = currentParagraphs[currentIndex];
    if (typeof currentText !== "string") currentText = String(currentText || "");
    paraCounter.textContent = `${currentIndex + 1} / ${currentParagraphs.length}`;

    // Workspace paragraph progress bar
    const paraFill = $("para-progress-bar");
    const paraCont = $("para-progress-container");
    const totalParas = currentParagraphs.length;
    if (paraFill) paraFill.style.width = totalParas > 0 ? `${((currentIndex + 1) / totalParas) * 100}%` : "0%";
    if (paraCont) paraCont.title = `النص ${currentIndex + 1} من ${totalParas}`;

    // Repetition counter visible only when reps > 1
    const reps = parseInt(profile.repetitions, 10) || 1;
    if (reps > 1) {
      repCounter.style.display = "inline-flex";
      repCounter.textContent = `🔁 ${currentRepetition}/${reps}`;
    } else {
      repCounter.style.display = "none";
    }

    // Detect RTL
    const isArabic = /[؀-ۿ]/.test(currentText);
    textBox.classList.toggle("rtl", isArabic);
    textBox.dir = isArabic ? "rtl" : "ltr";

    resetEngineState();

    textBox.innerHTML = "";
    [...currentText].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "char untyped" + (i === 0 ? " active blink" : "");
      span.textContent = ch;
      textBox.appendChild(span);
    });

    summary.style.display = "none";
    workbench.style.display = "flex";
    typingInput.value = "";
    typingInput.focus();

    initLiveAssist();
  }

  function resetEngineState() {
    clearInterval(timerInterval);
    timerInterval = null;
    typedText = "";
    isStarted = false;
    isCompleted = false;
    startTime = null;
    timeElapsed = 0;
    totalInput = 0;
    correctChars = 0;
    errorCharsMap = {};
    errorWordsMap = {};

    wpmVal.textContent = "0";
    accVal.textContent = "100%";
    timeVal.textContent = "0s";
    progressBar.style.width = "0%";
  }

  function resetParagraph() {
    loadCurrentParagraph();
  }

  function nextParagraph(force) {
    const reps = parseInt(profile.repetitions, 10) || 1;
    if (!force && currentRepetition < reps) {
      currentRepetition++;
      loadCurrentParagraph();
    } else {
      currentRepetition = 1;
      currentIndex = (currentIndex + 1) % currentParagraphs.length;
      loadCurrentParagraph();
    }
  }

  function prevParagraph() {
    currentRepetition = 1;
    currentIndex = (currentIndex - 1 + currentParagraphs.length) % currentParagraphs.length;
    loadCurrentParagraph();
  }

  // ============================ PAUSE / IDLE ============================
  // Single source of truth for the pause button icon/state (manual OR idle).
  function setPauseButtonState(paused) {
    const pauseBtn = $("pause-btn");
    if (!pauseBtn) return;
    pauseBtn.innerHTML = `<svg class="icon"><use href="#i-${paused ? "play" : "pause"}"/></svg>`;
    pauseBtn.classList.toggle("active", paused);
  }

  function togglePause() {
    if (!isStarted || isCompleted) return;
    // If the counter is idle-paused, the button acts as a resume control.
    if (idleIsPaused) { resumeIfIdlePaused(); typingInput.focus(); return; }
    manuallyPaused = !manuallyPaused;
    if (manuallyPaused) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      pausedAtMs = Date.now();
    } else {
      if (startTime && pausedAtMs) startTime += Date.now() - pausedAtMs;
      pausedAtMs = 0;
      if (!timerInterval) timerInterval = setInterval(updateTimer, 500);
      typingInput.focus();
    }
    setPauseButtonState(manuallyPaused);
  }
  let pausedAtMs = 0;

  function resumeIfIdlePaused() {
    if (idleIsPaused) {
      // Shift startTime forward by paused duration
      if (startTime && idlePausedAtMs) {
        startTime += Date.now() - idlePausedAtMs;
      }
      idlePausedAtMs = 0;
      if (isStarted && !isCompleted && !timerInterval) {
        timerInterval = setInterval(updateTimer, 500);
      }
      idleIsPaused = false;
      if (idleBadgeEl) { idleBadgeEl.remove(); idleBadgeEl = null; }
      setPauseButtonState(false); // keep the pause button in sync
    }
  }
  let idlePausedAtMs = 0;

  function startIdleChecker() {
    if (idleCheckInterval) clearInterval(idleCheckInterval);
    idleCheckInterval = setInterval(() => {
      if (!isStarted || isCompleted || manuallyPaused || idleIsPaused) return;
      const limitSec = profile?.idlePauseSec != null ? profile.idlePauseSec : 5;
      if (limitSec <= 0) return;
      if (Date.now() - lastTypeAt > limitSec * 1000) {
        // Pause
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        idlePausedAtMs = Date.now();
        idleIsPaused = true;
        setPauseButtonState(true); // keep the pause button in sync with the counter
        if (!idleBadgeEl) {
          idleBadgeEl = document.createElement("div");
          idleBadgeEl.className = "idle-paused-badge";
          idleBadgeEl.textContent = "⏸ تم إيقاف العداد — استأنف بالكتابة";
          document.body.appendChild(idleBadgeEl);
        }
      }
    }, 1000);
  }

  function handleKeyDown(e) {
    if (isCompleted) { e.preventDefault(); return; }
    if (e.key === "Backspace" && typingInput.value.length > 0) {
      typingAudio.playKeySound();
    }
  }

  function handleTypingInput() {
    if (isCompleted) return;

    if (!isStarted && typingInput.value.length > 0) {
      isStarted = true;
      startTime = Date.now();
      timerInterval = setInterval(updateTimer, 500);
    }

    const newTyped = typingInput.value;
    const spans = textBox.querySelectorAll(".char");

    if (newTyped.length > typedText.length) {
      const i = newTyped.length - 1;
      const added = newTyped[i];
      const target = currentText[i];
      totalInput++;
      if (added === target) {
        typingAudio.playKeySound(false);
      } else {
        typingAudio.playKeySound(true);
        errorCharsMap[target] = (errorCharsMap[target] || 0) + 1;
        // Identify the word containing this mistake
        const word = extractWordAt(currentText, i);
        if (word) errorWordsMap[word] = (errorWordsMap[word] || 0) + 1;
      }
    }
    typedText = newTyped;
    updateLiveAssist();

    correctChars = 0;
    spans.forEach((span, idx) => {
      span.classList.remove("active", "blink");
      if (idx < newTyped.length) {
        if (newTyped[idx] === currentText[idx]) {
          span.className = "char correct";
          correctChars++;
        } else {
          span.className = "char incorrect";
        }
      } else {
        span.className = "char untyped";
      }
      if (idx === newTyped.length) span.classList.add("active", "blink");
    });

    const progressPct = Math.min((newTyped.length / currentText.length) * 100, 100);
    progressBar.style.width = `${progressPct}%`;
    computeMetrics();

    if (newTyped.length >= currentText.length) completeParagraph();
  }

  function extractWordAt(text, idx) {
    let start = idx, end = idx;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;
    return text.slice(start, end).trim();
  }

  // ============================ LIVE ASSIST: speak + translate ============================
  function loadTtsVoices() { if (window.speechSynthesis) ttsVoices = speechSynthesis.getVoices() || []; }
  function accentLang()      { return (profile && profile.accent === "gb") ? "en-GB" : "en-US"; }
  function translateTarget() { return (profile && profile.translateTo) || "ar"; }
  function speakOn()         { return !(profile && profile.speakEnabled === false); }
  function transOn()         { return !(profile && profile.showTranslations === false); }
  function trDir()           { return translateTarget() === "ar" ? "rtl" : "ltr"; }

  function pickVoice(lang) {
    if (!ttsVoices.length) loadTtsVoices();
    const low = lang.toLowerCase();
    return ttsVoices.find(v => (v.lang || "").toLowerCase() === low)
        || ttsVoices.find(v => (v.lang || "").toLowerCase().replace("_", "-") === low)
        || ttsVoices.find(v => (v.lang || "").toLowerCase().startsWith("en"))
        || null;
  }

  // Browser speech-synthesis fallback.
  function speakWordTTS(word) {
    if (!word || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = accentLang();
      const v = pickVoice(u.lang);
      if (v) u.voice = v;
      u.rate = (profile && profile.speechRate) || 0.95;
      speechSynthesis.speak(u);
    } catch (e) {}
  }

  // ---- Local words database (words-db.js) ----
  function dbTranslation(word, lang) {
    try {
      return (typeof WORDS_DB !== "undefined" && WORDS_DB.translations[lang] || {})[word.toLowerCase()] || null;
    } catch (e) { return null; }
  }
  function dbAudioPath(word) {
    try {
      return (typeof WORDS_DB !== "undefined" && WORDS_DB.audio || {})[word.toLowerCase()] || null;
    } catch (e) { return null; }
  }

  // Prefer a recorded audio file from the local DB; fall back to the browser voice.
  function speakWord(word) {
    if (!word) return;
    const path = dbAudioPath(word);
    if (path) {
      try { new Audio(path).play(); return; } catch (e) {}
    }
    speakWordTTS(word);
  }

  // On paragraph load: preload any DB audio files for this paragraph's words
  // so playback is instant when the word is reached.
  function prefetchParagraphAssist() {
    if (!liveAssistOn || !currentWordSpans.length) return;
    [...new Set(currentWordSpans.map(s => s.word.toLowerCase()))].forEach(w => {
      const p = dbAudioPath(w);
      if (p && !audioPreloaded.has(p)) {
        audioPreloaded.add(p);
        const a = new Audio();
        a.preload = "auto";
        a.src = p;
      }
    });
  }

  function computeWordSpans(text) {
    const spans = [];
    const re = /[\p{L}\p{M}'’\-]+/gu;
    let m;
    while ((m = re.exec(text)) !== null) spans.push({ word: m[0], start: m.index, end: m.index + m[0].length });
    return spans;
  }

  function activeWordIndexAt(spans, i) {
    for (let k = 0; k < spans.length; k++) if (spans[k].end >= i) return k;
    return spans.length ? spans.length - 1 : -1;
  }

  // A small context window: current word + one neighbour each side, within the
  // same sentence — so the translation reflects the word's actual meaning here.
  function wordWindow(spans, idx) {
    let lo = idx, hi = idx;
    if (idx - 1 >= 0 && !/[.!?]/.test(currentText.slice(spans[idx - 1].end, spans[idx].start))) lo = idx - 1;
    if (idx + 1 < spans.length && !/[.!?]/.test(currentText.slice(spans[idx].end, spans[idx + 1].start))) hi = idx + 1;
    return { start: spans[lo].start, end: spans[hi].end, wordStart: spans[idx].start, wordEnd: spans[idx].end };
  }

  function setWordAssist(spans, idx) {
    const wEl = $("word-assist-word");
    const tEl = $("word-assist-tr");
    if (!spans || idx < 0 || idx >= spans.length) {
      if (wEl) wEl.textContent = "—";
      if (tEl) tEl.textContent = "";
      currentAssistWord = "";
      return;
    }
    const win = wordWindow(spans, idx);
    const phrase = currentText.slice(win.start, win.end);
    const theWord = spans[idx].word;
    currentAssistWord = theWord;
    const lang = translateTarget();
    const dbTr = dbTranslation(theWord, lang);

    if (wEl) {
      if (dbTr) {
        // Curated per-word translation from the DB → show the single word.
        wEl.innerHTML = `<b>${escapeHtml(theWord)}</b>`;
      } else {
        const before = currentText.slice(win.start, win.wordStart);
        const word = currentText.slice(win.wordStart, win.wordEnd);
        const after = currentText.slice(win.wordEnd, win.end);
        wEl.innerHTML = `${escapeHtml(before)}<b>${escapeHtml(word)}</b>${escapeHtml(after)}`;
      }
    }
    if (!tEl) return;
    tEl.dir = trDir();
    if (!transOn()) { tEl.textContent = ""; return; }
    if (dbTr) { tEl.textContent = dbTr; return; }
    // Fallback: contextual phrase translation via the free service.
    tEl.textContent = "…";
    fetchTranslation(phrase, "en|" + lang)
      .then(tr => { if (currentAssistWord === theWord) tEl.textContent = tr || "—"; })
      .catch(() => { if (currentAssistWord === theWord) tEl.textContent = "—"; });
  }

  function updateSentenceAssist() {
    const el = $("sentence-assist");
    if (!el) return;
    el.dir = trDir();
    if (!transOn() || !currentText) { el.textContent = ""; return; }
    el.textContent = "…";
    const snapshot = currentText;
    fetchTranslation(currentText, "en|" + translateTarget())
      .then(tr => { if (currentText === snapshot) el.textContent = tr || ""; })
      .catch(() => { el.textContent = ""; });
  }

  function refreshAssistVisibility() {
    const wb = $("word-assist");
    const sb = $("sentence-assist-bar");
    if (wb) wb.style.display = (liveAssistOn && (speakOn() || transOn())) ? "flex" : "none";
    if (sb) sb.style.display = (liveAssistOn && transOn()) ? "block" : "none";
  }

  // Recompute assist for the freshly loaded paragraph (English text only).
  function initLiveAssist() {
    liveAssistOn = !!currentText && !/[؀-ۿ]/.test(currentText);
    currentWordSpans = liveAssistOn ? computeWordSpans(currentText) : [];
    activeWordIdx = -1;
    refreshAssistVisibility();
    if (liveAssistOn) {
      setWordAssist(currentWordSpans, 0);
      updateSentenceAssist();
      prefetchParagraphAssist(); // pull audio + curated translations from the DB
    }
  }

  // Track the active word while typing; speak it when it changes.
  function updateLiveAssist() {
    if (!liveAssistOn || !currentWordSpans.length) return;
    const wi = activeWordIndexAt(currentWordSpans, typedText.length);
    if (wi !== activeWordIdx && wi >= 0) {
      activeWordIdx = wi;
      setWordAssist(currentWordSpans, wi);
      if (speakOn()) speakWord(currentWordSpans[wi].word);
    }
  }

  // Reflect current profile values onto the settings-panel controls.
  function syncAssistControls() {
    const a = $("assist-accent");       if (a) a.value = (profile && profile.accent === "gb") ? "gb" : "us";
    const l = $("assist-lang");         if (l) l.value = translateTarget();
    const s = $("assist-speak");        if (s) s.checked = speakOn();
    const t = $("assist-translations"); if (t) t.checked = transOn();
    const ratePct = Math.round(((profile && profile.speechRate) || 0.95) * 100);
    const r = $("assist-rate");         if (r) r.value = ratePct;
    const rv = $("assist-rate-val");    if (rv) rv.textContent = ratePct + "%";
  }

  function updateTimer() {
    if (!startTime) return;
    timeElapsed = Math.floor((Date.now() - startTime) / 1000);
    timeVal.textContent = `${timeElapsed}s`;
    computeMetrics();
  }

  function computeMetrics() {
    const minutes = Math.max(timeElapsed, 1) / 60;
    const wpm = Math.round((correctChars / 5) / minutes);
    wpmVal.textContent = wpm;
    const acc = totalInput > 0 ? Math.round((correctChars / totalInput) * 100) : 100;
    accVal.textContent = `${acc}%`;
  }

  function completeParagraph() {
    isCompleted = true;
    clearInterval(timerInterval);

    const minutes = Math.max(timeElapsed, 1) / 60;
    const wpm = Math.round((correctChars / 5) / minutes);
    const acc = totalInput > 0 ? Math.round((correctChars / totalInput) * 100) : 100;

    sumWpm.textContent = wpm;
    sumAcc.textContent = `${acc}%`;
    sumTime.textContent = `${timeElapsed}s`;

    // Error chars
    sumErrChars.innerHTML = "";
    const errKeys = Object.keys(errorCharsMap);
    if (errKeys.length === 0) {
      sumErrChars.innerHTML = "<li class='focus-instruction'>لا أخطاء! أداء ممتاز 🌟</li>";
    } else {
      errKeys.sort((a, b) => errorCharsMap[b] - errorCharsMap[a]);
      errKeys.forEach(ch => {
        const disp = ch === " " ? "Space" : ch;
        const li = document.createElement("li");
        li.className = "error-tag";
        li.innerHTML = `"${disp}" <span>x${errorCharsMap[ch]}</span>`;
        sumErrChars.appendChild(li);
      });
    }

    // Error words
    sumErrWords.innerHTML = "";
    const wordKeys = Object.keys(errorWordsMap);
    if (wordKeys.length === 0) {
      sumErrWords.innerHTML = "<li class='focus-instruction'>لم تخطئ في أي كلمة 🎯</li>";
    } else {
      wordKeys.sort((a, b) => errorWordsMap[b] - errorWordsMap[a]);
      wordKeys.slice(0, 12).forEach(w => {
        const li = document.createElement("li");
        li.className = "error-tag";
        li.innerHTML = `${w} <span>x${errorWordsMap[w]}</span>`;
        sumErrWords.appendChild(li);
      });
    }

    saveAttempt(wpm, acc, timeElapsed);
    markProgress(currentIndex);

    // Compute and show avg
    const all = historyData.filter(h => sameContext(h));
    if (all.length > 0) {
      const avg = Math.round(all.reduce((s, h) => s + h.wpm, 0) / all.length);
      sumAvg.textContent = avg;
    } else {
      sumAvg.textContent = wpm;
    }

    // v2.6: respect advance mode
    const mode = profile?.advanceMode || "enter";
    if (mode === "auto") {
      // Jump straight to next paragraph without showing summary
      setTimeout(() => nextParagraph(), 200);
    } else {
      // Show summary panel (for both 'enter' and 'button' modes)
      setTimeout(() => {
        workbench.style.display = "none";
        summary.style.display = "flex";
      }, 350);
    }
  }

  function sameContext(h) {
    if (!h.context) return false;
    if (profile.goal === "english") {
      return h.context.goal === "english"
          && h.context.reason === profile.reason
          && h.context.level === profile.level;
    }
    return h.context.goal === "typing";
  }

  function saveAttempt(wpm, acc, time) {
    const attempt = {
      username: currentUser ? currentUser.username : "guest",
      ts: Date.now(),
      date: new Date().toLocaleString("ar-EG", {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }),
      context: {
        goal: profile.goal,
        reason: profile.reason || null,
        level: profile.level || null,
        size: profile.size,
        paragraphIndex: currentIndex
      },
      wpm, accuracy: acc, time,
      errorChars: { ...errorCharsMap },
      errorWords: { ...errorWordsMap }
    };
    historyData.unshift(attempt);
    if (historyData.length > 200) historyData.pop();
    localStorage.setItem(STORAGE.history, JSON.stringify(historyData));
    renderHistory();
  }

  // ============================ HISTORY ============================
  function renderHistory() {
    historyBody.innerHTML = "";
    const target = currentUser ? currentUser.username : "guest";
    const items = historyData.filter(h => (h.username || "guest") === target).slice(0, 15);

    if (items.length === 0) {
      historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); font-style: italic;">لا توجد محاولات بعد — ابدأ التدريب الآن.</td></tr>`;
      return;
    }

    items.forEach(it => {
      const ctx = it.context || {};
      const trackName = ctx.goal === "english"
        ? (REASONS.find(r => r.id === ctx.reason)?.name_ar || "إنجليزي")
        : "تعلم الكتابة";
      const lvl = ctx.level || "—";
      const size = SIZE_OPTIONS.find(s => s.id === ctx.size)?.name_ar || ctx.size || "—";
      const accClass = it.accuracy >= 95 ? "accuracy-high" : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.date}</td>
        <td>${trackName}</td>
        <td>${lvl}</td>
        <td>${size}</td>
        <td><strong>${it.wpm}</strong></td>
        <td class="${accClass}"><strong>${it.accuracy}%</strong></td>
      `;
      historyBody.appendChild(tr);
    });
  }

  // ============================ AUTH ============================
  function handleAuthBtnClick() {
    if (currentUser) {
      currentUser = null;
      localStorage.removeItem(STORAGE.current);
      try { sessionStorage.removeItem("typeflow_admin_key"); } catch {}
      updateAuthUI();
      renderHistory();
      showLanding();  // v2.5
    } else {
      resetAuthForms();
      authModal.style.display = "flex";
    }
  }

  function closeAuthModal() {
    authModal.style.display = "none";
    setTimeout(() => { if (profile) typingInput.focus(); }, 50);
  }

  function resetAuthForms() {
    loginForm.reset();
    signupForm.reset();
    loginErr.style.display = "none";
    signupErr.style.display = "none";
    switchAuthTab("login");
  }

  function switchAuthTab(tab) {
    if (tab === "login") {
      tabLoginBtn.classList.add("active");
      tabSignupBtn.classList.remove("active");
      loginForm.style.display = "flex";
      signupForm.style.display = "none";
    } else {
      tabLoginBtn.classList.remove("active");
      tabSignupBtn.classList.add("active");
      loginForm.style.display = "none";
      signupForm.style.display = "flex";
    }
  }

  // ============================ PASSWORD HASHING ============================
  // SHA-256 with a per-user random salt. Note: this still runs in the browser,
  // so it is NOT a substitute for a real backend — but it removes plain-text
  // passwords from localStorage. Falls back to plain text in insecure contexts
  // (e.g. opening index.html via file://, where crypto.subtle is unavailable).
  function randomSalt() {
    const a = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function hashPassword(password, salt) {
    if (!(window.crypto && window.crypto.subtle)) return null; // insecure context
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ":" + password));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function upgradeUserPassword(user, password) {
    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    if (!hash) return; // can't hash here; leave the legacy field as-is
    user.salt = salt;
    user.passwordHash = hash;
    delete user.password;
    const idx = usersDB.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (idx >= 0) { usersDB[idx] = user; localStorage.setItem(STORAGE.users, JSON.stringify(usersDB)); }
    if (currentUser && currentUser.username.toLowerCase() === user.username.toLowerCase()) {
      currentUser = user;
      localStorage.setItem(STORAGE.current, JSON.stringify(user));
    }
  }

  // Verify a password against a user record; migrates legacy plain-text on success.
  async function verifyPassword(password, user) {
    if (!user) return false;
    if (user.passwordHash && user.salt) {
      const h = await hashPassword(password, user.salt);
      return h !== null && h === user.passwordHash;
    }
    if (typeof user.password === "string") {
      if (user.password === password) { await upgradeUserPassword(user, password); return true; }
      return false;
    }
    return false;
  }

  async function handleLogin(e) {
    e.preventDefault();
    loginErr.style.display = "none";
    const u = $("login-username").value.trim();
    const p = $("login-password").value;

    const loginSucceeded = (sessionUser, isAdmin) => {
      currentUser = sessionUser;
      localStorage.setItem(STORAGE.current, JSON.stringify(sessionUser));
      if (isAdmin) setAdminCreds(u, p);
      updateAuthUI();
      renderHistory();
      closeAuthModal();
      // v2.5 routing: send user to practice or onboarding based on profile
      if (profile) enterPracticeMode();
      else showOnboarding("goal");
    };

    if (SUPA_ON) {
      try {
        const r = await supaRpc("app_login", { p_username: u, p_password: p });
        if (r && r.id) {
          loginSucceeded({ id: r.id, username: r.username, email: r.email }, r.username.toLowerCase() === "admin");
          return;
        }
        // Not in the shared DB. A legacy local-only account may still verify here —
        // if so, migrate it into the shared DB (we have the plaintext at this moment).
        const localUser = usersDB.find(x => x.username.toLowerCase() === u.toLowerCase());
        if (localUser && await verifyPassword(p, localUser)) {
          try { await supaRpc("app_signup", { p_username: localUser.username, p_email: localUser.email || "", p_password: p }); } catch {}
          loginSucceeded(localUser, localUser.username.toLowerCase() === "admin");
          return;
        }
        loginErr.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
        loginErr.style.display = "block";
        typingAudio.playKeySound(true);
        return;
      } catch (err) {
        // Network/Supabase unavailable → fall through to the local store.
        console.warn("Supabase login failed; using local store.", err);
      }
    }

    const user = usersDB.find(x => x.username.toLowerCase() === u.toLowerCase());
    const ok = user ? await verifyPassword(p, user) : false;
    if (ok) {
      loginSucceeded(user, user.username.toLowerCase() === "admin");
    } else {
      loginErr.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة";
      loginErr.style.display = "block";
      typingAudio.playKeySound(true);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    signupErr.style.display = "none";
    const u = $("signup-username").value.trim();
    const em = $("signup-email").value.trim().toLowerCase();
    const p = $("signup-password").value;
    if (u.length < 3) {
      signupErr.textContent = "اسم المستخدم يجب أن يكون 3 أحرف فأكثر";
      signupErr.style.display = "block";
      return;
    }
    if (SUPA_ON) {
      try {
        const r = await supaRpc("app_signup", { p_username: u, p_email: em, p_password: p });
        if (r && r.error) {
          signupErr.textContent =
            r.error === "exists"          ? "اسم المستخدم أو البريد مسجل مسبقاً"
          : r.error === "password_short"  ? "كلمة المرور يجب أن تكون 6 أحرف فأكثر"
          : r.error === "username_short"  ? "اسم المستخدم يجب أن يكون 3 أحرف فأكثر"
          : r.error === "email_invalid"   ? "البريد الإلكتروني غير صالح"
          : "تعذّر إنشاء الحساب، حاول لاحقاً";
          signupErr.style.display = "block";
          return;
        }
        currentUser = { id: r.id, username: r.username, email: r.email };
        localStorage.setItem(STORAGE.current, JSON.stringify(currentUser));
        updateAuthUI();
        renderHistory();
        closeAuthModal();
        showOnboarding("goal");
        return;
      } catch (err) {
        // Network/Supabase unavailable → fall through to the local store.
        console.warn("Supabase signup failed; using local store.", err);
      }
    }
    if (usersDB.some(x => x.username.toLowerCase() === u.toLowerCase() || x.email === em)) {
      signupErr.textContent = "اسم المستخدم أو البريد مسجل مسبقاً";
      signupErr.style.display = "block";
      return;
    }
    const salt = randomSalt();
    const hash = await hashPassword(p, salt);
    const nu = hash
      ? { username: u, email: em, salt, passwordHash: hash }
      : { username: u, email: em, password: p }; // insecure-context fallback
    usersDB.push(nu);
    localStorage.setItem(STORAGE.users, JSON.stringify(usersDB));
    currentUser = nu;
    localStorage.setItem(STORAGE.current, JSON.stringify(nu));
    updateAuthUI();
    renderHistory();
    closeAuthModal();
    // v2.5: new signup → onboarding always
    showOnboarding("goal");
  }

  function updateAuthUI() {
    if (currentUser) {
      authBtnText.textContent = `خروج (${currentUser.username})`;
      adminProfile.style.display = currentUser.username.toLowerCase() === "admin" ? "flex" : "none";
      profileBtn.style.display = "inline-flex";
      $("profile-btn-text").textContent = currentUser.username;
    } else {
      authBtnText.textContent = "دخول / Login";
      adminProfile.style.display = "none";
      profileBtn.style.display = "none";
    }
  }

  // ============================ ADMIN ============================
  function openAdmin() {
    if (isFocusMode) toggleFocus();
    hideAllSections();
    adminSec.style.display = "flex";
    restartOnboardingBtn.style.display = "none";
    populateAdminFormSelects();
    updateAdminFormVisibility();
    renderAdminContent();
    renderAdminUsers();
    switchAdminTab("content");
  }

  function closeAdmin() {
    adminSec.style.display = "none";
    if (profile) enterPracticeMode();
    else showOnboarding("goal");
  }

  function switchAdminTab(tab) {
    const map = {
      content: [adminTabContent, adminPanelContent],
      users:   [adminTabUsers, adminPanelUsers],
      grammar: [adminTabGrammar, adminPanelGrammar]
    };
    Object.entries(map).forEach(([k, [btn, panel]]) => {
      if (!btn || !panel) return;
      btn.classList.toggle("active", k === tab);
      panel.style.display = (k === tab) ? "block" : "none";
    });
    if (tab === "users") renderAdminUsers();
    if (tab === "grammar") renderGqAdminList();
  }

  function populateAdminFormSelects() {
    adminReason.innerHTML = REASONS.map(r => `<option value="${r.id}">${r.icon} ${r.name_ar}</option>`).join("");
    adminLevel.innerHTML = CEFR_LEVELS.map(l => `<option value="${l.id}">${l.id} — ${l.name_ar}</option>`).join("");
    adminSize.innerHTML = SIZE_OPTIONS.map(s => `<option value="${s.id}">${s.icon} ${s.name_ar}</option>`).join("");
  }

  function updateAdminFormVisibility() {
    const isEnglish = adminTrack.value === "english";
    document.querySelectorAll(".english-only").forEach(el => {
      el.style.display = isEnglish ? "flex" : "none";
    });
  }

  function handleAddContent(e) {
    e.preventDefault();
    const track = adminTrack.value;
    const item = {
      id: Date.now(),
      track,
      size: adminSize.value,
      content: adminContent.value.trim()
    };
    if (track === "english") {
      item.reason = adminReason.value;
      item.level = adminLevel.value;
    }
    customCtnt.push(item);
    localStorage.setItem(STORAGE.customCtnt, JSON.stringify(customCtnt));
    addContentForm.reset();
    updateAdminFormVisibility();
    renderAdminContent();
    typingAudio.playKeySound(false);
  }

  function renderAdminContent() {
    adminContentBody.innerHTML = "";
    if (customCtnt.length === 0) {
      adminContentBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">لا يوجد محتوى مخصص بعد</td></tr>`;
      return;
    }
    customCtnt.forEach(c => {
      const tr = document.createElement("tr");
      let details = "";
      if (c.track === "english") {
        const r = REASONS.find(x => x.id === c.reason);
        details = `${r?.icon || ""} ${r?.name_ar || c.reason} · ${c.level} · ${c.size}`;
      } else {
        details = `${c.track} · ${c.size}`;
      }
      tr.innerHTML = `
        <td>${c.track}</td>
        <td><div style="max-width: 320px;">${details}<br><span style="color: var(--text-muted); font-size: 0.75rem;">${c.content.slice(0, 60)}${c.content.length > 60 ? "…" : ""}</span></div></td>
        <td><button class="btn-delete" data-id="${c.id}">حذف</button></td>
      `;
      tr.querySelector(".btn-delete").addEventListener("click", () => {
        customCtnt = customCtnt.filter(x => x.id !== c.id);
        localStorage.setItem(STORAGE.customCtnt, JSON.stringify(customCtnt));
        renderAdminContent();
      });
      adminContentBody.appendChild(tr);
    });
  }

  async function renderAdminUsers() {
    adminUsersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">جارٍ التحميل…</td></tr>`;
    let users = null;
    if (SUPA_ON) {
      const creds = getAdminCreds();
      if (creds) {
        try {
          const r = await supaRpc("app_list_users", { p_admin_user: creds.username, p_admin_pass: creds.password });
          if (Array.isArray(r)) users = r;
        } catch (err) { console.warn("Supabase list users failed; using local store.", err); }
      }
    }
    // Fallback when the shared store isn't reachable / no admin session: use the local mirror.
    if (users === null) {
      if (SUPA_ON && !getAdminCreds()) {
        adminUsersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">أعد تسجيل الدخول كأدمن لعرض قائمة المستخدمين من القاعدة.</td></tr>`;
        return;
      }
      users = usersDB.map(u => ({ username: u.username, email: u.email }));
    }

    adminUsersBody.innerHTML = "";
    if (!users.length) {
      adminUsersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">لا مستخدمين</td></tr>`;
      return;
    }
    users.forEach(u => {
      const attempts = historyData.filter(h => (h.username || "").toLowerCase() === u.username.toLowerCase());
      const lastCtx = attempts[0]?.context || {};
      const avgWpm = attempts.length ? Math.round(attempts.reduce((s, h) => s + h.wpm, 0) / attempts.length) : 0;
      const avgAcc = attempts.length ? Math.round(attempts.reduce((s, h) => s + h.accuracy, 0) / attempts.length) : 0;
      const trackName = lastCtx.goal === "english"
        ? (REASONS.find(r => r.id === lastCtx.reason)?.name_ar || "إنجليزي")
        : lastCtx.goal === "typing" ? "كتابة" : "—";
      const isAdmin = u.username.toLowerCase() === "admin";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${u.username}</strong>${isAdmin ? ` <span class="badge en">Admin</span>` : ""}</td>
        <td>${u.email || "—"}</td>
        <td>${trackName}</td>
        <td>${lastCtx.level || "—"}</td>
        <td>${attempts.length}</td>
        <td>${avgWpm}</td>
        <td>${avgAcc}%</td>
        <td><button class="btn-delete" ${isAdmin ? "disabled" : ""}>حذف</button></td>
      `;
      if (!isAdmin) {
        tr.querySelector(".btn-delete").addEventListener("click", async () => {
          if (SUPA_ON) {
            const creds = getAdminCreds();
            if (creds) {
              try { await supaRpc("app_delete_user", { p_admin_user: creds.username, p_admin_pass: creds.password, p_target: u.username }); }
              catch (err) { console.warn("Supabase delete failed.", err); }
            }
          }
          // Keep the local mirror tidy too.
          usersDB = usersDB.filter(x => x.username.toLowerCase() !== u.username.toLowerCase());
          localStorage.setItem(STORAGE.users, JSON.stringify(usersDB));
          historyData = historyData.filter(h => (h.username || "").toLowerCase() !== u.username.toLowerCase());
          localStorage.setItem(STORAGE.history, JSON.stringify(historyData));
          renderAdminUsers();
        });
      }
      adminUsersBody.appendChild(tr);
    });
  }

  // ============================ PROFILE / USER SETTINGS ============================
  function openProfile() {
    if (isFocusMode) toggleFocus();
    hideAllSections();
    profileSec.style.display = "flex";
    restartOnboardingBtn.style.display = "none";
    renderProfile();
    switchProfilePanel("account");  // always start on the Account tab
  }

  function closeProfile(forcedIndex) {
    profileSec.style.display = "none";
    if (profile) enterPracticeMode(forcedIndex);
    else showOnboarding("goal");
  }

  function renderProfile() {
    renderAccountInfo();
    renderLearningPrefs();
    populateDefaultFilters();
    updateDefaultFiltersVisibility();
    renderDefaultContentList();
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentFilter();
    renderUserContentList();
    closeDeleteAllPanel();
    updateClassifyPreview();
    // v2.7: default to "ready texts" sub-tab inside the library
    switchTextsSubtab("default");

    if (!currentUser) {
      guestNotice.style.display = "flex";
    } else {
      guestNotice.style.display = "none";
    }
  }

  // ============================ FOLDERS RENDERING ============================
  function renderFoldersList() {
    const folders = getUserFolders();
    const items = getUserContent();
    foldersCount.textContent = `(${folders.length})`;
    foldersList.innerHTML = "";

    folders.forEach(f => {
      const count = items.filter(i => (i.folderId || "default") === f.id).length;
      const chip = document.createElement("div");
      chip.className = "folder-chip" + (f.locked ? " locked" : "");
      const isActive = profile && profile.workspace
        && profile.workspace.type === "user"
        && profile.workspace.folderId === f.id;
      chip.classList.toggle("active", isActive);
      chip.innerHTML = `
        <span class="folder-chip-icon">${f.icon || "📁"}</span>
        <span class="folder-chip-name"></span>
        <span class="folder-chip-count">${count}</span>
        <span class="folder-chip-actions">
          <button class="folder-chip-btn open" title="افتح هذا المجلد للتدريب">▶</button>
          ${f.locked ? "" : `
            <button class="folder-chip-btn rename" title="إعادة تسمية">✏️</button>
            <button class="folder-chip-btn delete" title="حذف المجلد">🗑</button>
          `}
        </span>
      `;
      chip.querySelector(".folder-chip-name").textContent = f.name;
      chip.querySelector(".open").addEventListener("click", (e) => {
        e.stopPropagation();
        handleEnterFolder(f.id);
      });
      if (!f.locked) {
        chip.querySelector(".rename").addEventListener("click", (e) => { e.stopPropagation(); handleRenameFolder(f.id); });
        chip.querySelector(".delete").addEventListener("click", (e) => { e.stopPropagation(); handleDeleteFolder(f.id, count); });
      }
      foldersList.appendChild(chip);
    });
  }

  function populateFolderSelectors() {
    const folders = getUserFolders();
    const items = getUserContent();
    const options = folders.map(f =>
      `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)}</option>`
    ).join("");

    // Add-content target
    if (addFolderTarget) {
      const prev = addFolderTarget.value;
      addFolderTarget.innerHTML = options;
      if ([...addFolderTarget.options].some(o => o.value === prev)) addFolderTarget.value = prev;
    }
    // Excel target
    if (uploadFolderTarget) {
      const prev = uploadFolderTarget.value;
      uploadFolderTarget.innerHTML = options;
      if ([...uploadFolderTarget.options].some(o => o.value === prev)) uploadFolderTarget.value = prev;
    }
    // Library filter — has "all" option
    if (filterFolder) {
      const prev = filterFolder.value || "all";
      filterFolder.innerHTML = `<option value="all">📂 كل المجلدات (${items.length})</option>` + folders.map(f => {
        const count = items.filter(i => (i.folderId || "default") === f.id).length;
        return `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)} (${count})</option>`;
      }).join("");
      filterFolder.value = folders.some(f => f.id === prev) || prev === "all" ? prev : "all";
    }
    // Practice bar selector (also includes "all")
    if (folderSelect) {
      const prev = profile?.folderId || "all";
      folderSelect.innerHTML = `<option value="all">📂 كل المجلدات</option>` + folders.map(f =>
        `<option value="${f.id}">${f.icon} ${escapeHtml(f.name)}</option>`
      ).join("");
      folderSelect.value = folders.some(f => f.id === prev) || prev === "all" ? prev : "all";
    }
  }

  function handleEnterFolder(folderId) {
    // Switch the active workspace to this folder and start practice
    profile.workspace = { type: "user", folderId };
    syncProfileLegacy();
    localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    closeProfile(0);
  }

  function handleAddFolder(e) {
    e.preventDefault();
    const name = newFolderName.value.trim();
    const icon = newFolderIcon.value.trim() || "📁";
    if (!name) return;
    // Prevent duplicate names (case-insensitive)
    const exists = getUserFolders().some(f => f.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      newFolderName.style.borderColor = "var(--error-color)";
      setTimeout(() => { newFolderName.style.borderColor = ""; }, 1500);
      return;
    }
    addUserFolder(name, icon);
    newFolderName.value = "";
    newFolderIcon.value = "📁";
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentFilter();
    typingAudio.playKeySound(false);
  }

  function handleRenameFolder(id) {
    const f = getUserFolders().find(x => x.id === id);
    if (!f || f.locked) return;
    const newName = prompt("اسم المجلد الجديد:", f.name);
    if (newName === null) return;
    renameUserFolder(id, newName.trim());
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentList();
  }

  function handleDeleteFolder(id, count) {
    const f = getUserFolders().find(x => x.id === id);
    if (!f || f.locked) return;
    const msg = count > 0
      ? `سيتم حذف المجلد "${f.name}" ونقل (${count}) نص فيه إلى المجلد الرئيسي. هل تريد المتابعة؟`
      : `سيتم حذف المجلد "${f.name}". هل تريد المتابعة؟`;
    if (!confirm(msg)) return;
    deleteUserFolder(id);
    // If practice was using this folder, switch back to all
    if (profile && profile.folderId === id) {
      profile.folderId = "all";
      localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
    }
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentList();
    renderUserContentFilter();
  }

  // ============================ DELETE ALL (password-protected) ============================
  function openDeleteAllPanel() {
    const items = getUserContent();
    if (items.length === 0) return;
    deleteAllCount.textContent = items.length;
    deleteAllPassword.value = "";
    deleteAllError.style.display = "none";
    deleteAllPanel.style.display = "flex";
    setTimeout(() => deleteAllPassword.focus(), 100);
  }

  function closeDeleteAllPanel() {
    deleteAllPanel.style.display = "none";
    deleteAllPassword.value = "";
    deleteAllError.style.display = "none";
  }

  async function confirmDeleteAll() {
    deleteAllError.style.display = "none";

    // Guests have no password — block them entirely
    if (!currentUser) {
      deleteAllError.textContent = "يجب تسجيل الدخول أولاً لاستخدام هذه الميزة.";
      deleteAllError.style.display = "block";
      return;
    }

    const pw = deleteAllPassword.value;
    if (!pw) {
      deleteAllError.textContent = "اكتب كلمة المرور للتأكيد.";
      deleteAllError.style.display = "block";
      return;
    }
    if (!(await verifyPassword(pw, currentUser))) {
      deleteAllError.textContent = "كلمة المرور غير صحيحة.";
      deleteAllError.style.display = "block";
      typingAudio.playKeySound(true);
      return;
    }

    // Wipe items but keep folders intact
    setUserContent([]);
    closeDeleteAllPanel();
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentList();
    renderUserContentFilter();
    renderDefaultContentList();
    typingAudio.playKeySound(false);
  }

  // ============================ CONTENT TABS ============================
  function switchTextsSubtab(sub) {
    textsSubtabs.forEach(b => b.classList.toggle("active", b.dataset.subtab === sub));
    if (sub === "default") {
      panelDefault.style.display = "block";
      panelMine.style.display = "none";
    } else {
      panelDefault.style.display = "none";
      panelMine.style.display = "block";
    }
  }

  // ============================ DEFAULT CONTENT BROWSER ============================
  function populateDefaultFilters() {
    // Track: pre-select based on user's current goal
    if (profile && profile.goal === "english") {
      dfTrackSel.value = "english";
    } else if (profile && profile.goal === "typing") {
      const lang = profile.lang || "en";
      dfTrackSel.value = `typing-${lang}`;
    }

    // Reason
    dfReasonSel.innerHTML = REASONS.map(r =>
      `<option value="${r.id}">${r.icon} ${r.name_ar}</option>`
    ).join("");
    if (profile && profile.reason) dfReasonSel.value = profile.reason;

    // Level
    dfLevelSel.innerHTML = CEFR_LEVELS.map(l =>
      `<option value="${l.id}">${l.id} — ${l.name_ar}</option>`
    ).join("");
    if (profile && profile.level) dfLevelSel.value = profile.level;

    // Size
    dfSizeSel.innerHTML = SIZE_OPTIONS.map(s =>
      `<option value="${s.id}">${s.icon} ${s.name_ar}</option>`
    ).join("");
    if (profile && profile.size) dfSizeSel.value = profile.size;
  }

  function updateDefaultFiltersVisibility() {
    const isEnglish = dfTrackSel.value === "english";
    document.querySelectorAll(".english-filter").forEach(el => {
      el.style.display = isEnglish ? "flex" : "none";
    });
  }

  function renderDefaultContentList() {
    const track  = dfTrackSel.value;
    const size   = dfSizeSel.value;

    let pool = [];
    let metaParts = [];

    if (track === "english") {
      const reason = dfReasonSel.value;
      const level  = dfLevelSel.value;
      pool = getContent(reason, level, size).slice();

      const adminAdded = customCtnt
        .filter(c => c.track === "english" && c.reason === reason && c.level === level && c.size === size)
        .map(c => c.content);
      pool = [...pool, ...adminAdded];

      const r = REASONS.find(x => x.id === reason);
      const lvl = CEFR_LEVELS.find(x => x.id === level);
      const sz  = SIZE_OPTIONS.find(x => x.id === size);
      metaParts.push(`${r?.icon || ""} ${r?.name_ar || ""}`);
      metaParts.push(`${lvl?.id || ""}`);
      metaParts.push(`${sz?.name_ar || ""}`);
    } else {
      const lang = track === "typing-ar" ? "ar" : "en";
      const drillType = size === "chunks" ? "chunks" : size;
      const base = (TYPING_DRILLS[lang] && TYPING_DRILLS[lang][drillType]) || [];
      const adminAdded = customCtnt
        .filter(c => c.track === track && c.size === size)
        .map(c => c.content);
      pool = [...base.slice(), ...adminAdded];

      const sz = SIZE_OPTIONS.find(x => x.id === size);
      metaParts.push(`⌨️ تعلم الكتابة (${lang.toUpperCase()})`);
      metaParts.push(`${sz?.name_ar || ""}`);
    }

    dfMeta.innerHTML = `<strong>${pool.length}</strong> نص متاح — ${metaParts.join(" · ")}`;

    // Mark which items the current user has completed (for matching context only)
    const doneList = (profile
      && ((track === "english" && profile.goal === "english"
            && profile.reason === dfReasonSel.value
            && profile.level === dfLevelSel.value
            && profile.size === size)
        || (track !== "english" && profile.goal === "typing" && profile.size === size)))
      ? (progress[progressKey()] || [])
      : [];

    dfList.innerHTML = "";
    if (pool.length === 0) {
      dfList.innerHTML = `<p class="focus-instruction" style="padding: 1rem; text-align:center;">لا توجد نصوص لهذه التركيبة.</p>`;
      return;
    }
    pool.forEach((text, i) => {
      const item = document.createElement("div");
      item.className = "default-content-item";
      const isDone = doneList.includes(i);
      item.innerHTML = `
        <span class="item-lock">🔒 افتراضي</span>
        <span class="item-index">${i + 1}</span>
        ${isDone ? '<span class="item-done">✓</span>' : ''}
        <span class="item-text">${escapeHtml(text)}</span>
      `;
      item.title = "اضغط لبدء التدريب على هذا النص";
      item.addEventListener("click", () => {
        if (!profile) return;
        // Switch workspace to match the filter and open this index
        if (track === "english") {
          profile.workspace = { type: "default", reason: dfReasonSel.value, level: dfLevelSel.value };
        } else {
          profile.workspace = { type: "typing", lang: track === "typing-ar" ? "ar" : "en" };
        }
        profile.sizes = [size];
        profile.size = size;
        syncProfileLegacy();
        localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
        closeProfile(i);
      });
      dfList.appendChild(item);
    });
  }

  function renderAccountInfo() {
    if (currentUser) {
      profUsername.textContent = currentUser.username;
      profEmail.textContent = currentUser.email || "—";
      changePassBtn.style.display = "inline-flex";
    } else {
      profUsername.textContent = "زائر / Guest";
      profEmail.textContent = "غير مسجل";
      changePassBtn.style.display = "none";
    }
    changePassForm.style.display = "none";
    changePassForm.reset();
    changePassErr.style.display = "none";
    changePassOk.style.display = "none";
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    changePassErr.style.display = "none";
    changePassOk.style.display = "none";
    if (!currentUser) return;
    if (newPassInput.value !== confPassInput.value) {
      changePassErr.textContent = "كلمتا المرور الجديدتان غير متطابقتين";
      changePassErr.style.display = "block";
      return;
    }
    if (newPassInput.value.length < 6) {
      changePassErr.textContent = "كلمة المرور يجب أن تكون 6 أحرف فأكثر";
      changePassErr.style.display = "block";
      return;
    }

    let handled = false;
    if (SUPA_ON) {
      try {
        const r = await supaRpc("app_change_password", {
          p_username: currentUser.username, p_old: curPassInput.value, p_new: newPassInput.value
        });
        if (r && r.error) {
          changePassErr.textContent =
            r.error === "wrong_password"  ? "كلمة المرور الحالية غير صحيحة"
          : r.error === "password_short"  ? "كلمة المرور يجب أن تكون 6 أحرف فأكثر"
          : "تعذّر تحديث كلمة المرور";
          changePassErr.style.display = "block";
          return;
        }
        // Keep the cached admin session password in sync if the admin changed their own.
        if (currentUser.username.toLowerCase() === "admin") setAdminCreds(currentUser.username, newPassInput.value);
        handled = true;
      } catch (err) {
        console.warn("Supabase change-password failed; using local store.", err);
      }
    }

    if (!handled) {
      // Local fallback: verify the current password, then update the local record.
      if (!(await verifyPassword(curPassInput.value, currentUser))) {
        changePassErr.textContent = "كلمة المرور الحالية غير صحيحة";
        changePassErr.style.display = "block";
        return;
      }
      const idx = usersDB.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
      if (idx >= 0) {
        const salt = randomSalt();
        const hash = await hashPassword(newPassInput.value, salt);
        if (hash) {
          usersDB[idx].salt = salt;
          usersDB[idx].passwordHash = hash;
          delete usersDB[idx].password;
        } else {
          usersDB[idx].password = newPassInput.value;
        }
        localStorage.setItem(STORAGE.users, JSON.stringify(usersDB));
        currentUser = usersDB[idx];
        localStorage.setItem(STORAGE.current, JSON.stringify(currentUser));
      }
    }
    changePassOk.textContent = "✓ تم تحديث كلمة المرور بنجاح";
    changePassOk.style.display = "block";
    changePassForm.reset();
    setTimeout(() => {
      changePassForm.style.display = "none";
      changePassBtn.style.display = "inline-flex";
      changePassOk.style.display = "none";
    }, 1800);
  }

  function renderLearningPrefs() {
    if (!profile) {
      prefGoalEl.textContent = "—";
      prefLevelEl.textContent = "—";
      prefReasonEl.textContent = "—";
      prefLevelRow.style.display = "none";
      prefReasonRow.style.display = "none";
      return;
    }
    const ws = profile.workspace || { type: "default" };
    if (ws.type === "user") {
      const f = getUserFolders().find(x => x.id === ws.folderId);
      prefGoalEl.textContent = `📂 مجلدي: ${f ? f.icon + " " + f.name : ws.folderId}`;
      prefLevelRow.style.display = "none";
      prefReasonRow.style.display = "none";
    } else if (ws.type === "typing") {
      prefGoalEl.textContent = "⌨️ تعلم الكتابة فقط";
      prefLevelRow.style.display = "none";
      prefReasonRow.style.display = "none";
    } else {
      prefGoalEl.textContent = "🌍 تعلم الإنجليزية";
      prefLevelRow.style.display = "flex";
      prefReasonRow.style.display = "flex";
      const lvl = CEFR_LEVELS.find(l => l.id === ws.level);
      prefLevelEl.textContent = lvl ? `${lvl.id} — ${lvl.name_ar}` : "—";
      const r = getReasons().find(x => x.id === ws.reason);
      prefReasonEl.textContent = r ? `${r.icon} ${r.name_ar}` : "—";
    }
    // Size dropdown removed in v2.6 — null-safe
    if (prefSizeSel) {
      prefSizeSel.innerHTML = "";
      SIZE_OPTIONS.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.icon} ${s.name_ar}`;
        if (s.id === (profile.sizes && profile.sizes[0])) opt.selected = true;
        prefSizeSel.appendChild(opt);
      });
    }
  }

  // Inline editor modal for goal/level/reason
  function openInlineEditor(field) {
    const overlay = document.createElement("div");
    overlay.className = "inline-editor-overlay";
    const card = document.createElement("div");
    card.className = "inline-editor-card";

    let title = "";
    let bodyHTML = "";
    if (field === "goal") {
      title = "تعديل الهدف";
      bodyHTML = `
        <button class="option-card option-card-lg" data-val="english">
          <span class="option-icon">🌍</span>
          <span class="option-title">تعلم اللغة الإنجليزية</span>
        </button>
        <button class="option-card option-card-lg" data-val="typing">
          <span class="option-icon">⌨️</span>
          <span class="option-title">تعلم الكتابة فقط</span>
        </button>`;
    } else if (field === "level") {
      title = "تعديل المستوى";
      bodyHTML = CEFR_LEVELS.map(l => `
        <button class="option-card" data-val="${l.id}">
          <span class="option-title" style="font-family: var(--font-mono); font-size: 1.4rem;">${l.id}</span>
          <span class="option-desc">${l.name_ar}</span>
        </button>`).join("");
    } else if (field === "reason") {
      title = "تعديل السبب";
      bodyHTML = REASONS.map(r => `
        <button class="option-card" data-val="${r.id}">
          <span class="option-icon">${r.icon}</span>
          <span class="option-title">${r.name_ar}</span>
        </button>`).join("");
    }

    card.innerHTML = `
      <div class="inline-editor-title">${title}</div>
      <div class="options-grid ${field === 'goal' ? 'options-grid-2' : field === 'level' ? 'options-grid-3' : 'options-grid-4'}">
        ${bodyHTML}
      </div>
      <button class="btn-secondary" data-cancel>إلغاء</button>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    card.querySelectorAll("[data-val]").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.val;
        if (field === "goal") {
          if (val === "typing") {
            profile.workspace = { type: "typing", lang: "en" };
          } else {
            const cur = profile.workspace || {};
            profile.workspace = {
              type: "default",
              reason: cur.reason || "jobs",
              level: cur.level || "A1"
            };
          }
        } else if (field === "level") {
          if (!profile.workspace || profile.workspace.type !== "default") {
            profile.workspace = { type: "default", reason: "jobs", level: val };
          } else {
            profile.workspace.level = val;
          }
        } else if (field === "reason") {
          if (!profile.workspace || profile.workspace.type !== "default") {
            profile.workspace = { type: "default", reason: val, level: "A1" };
          } else {
            profile.workspace.reason = val;
          }
        }
        syncProfileLegacy();
        localStorage.setItem(STORAGE.profile, JSON.stringify(profile));
        overlay.remove();
        renderLearningPrefs();
        populateDefaultFilters();
        updateDefaultFiltersVisibility();
        renderDefaultContentList();
        renderUserContentList();
      });
    });
    card.querySelector("[data-cancel]").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  // ============================ ADD CUSTOM CONTENT ============================
  function updateClassifyPreview() {
    const text = userContentInput.value.trim();
    const size = classifySize(text);
    classifyBadge.textContent = sizeLabel(size);
    classifyBadge.className = `size-badge size-${size}`;
    const wc = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const cc = text.length;
    classifyStats.textContent = `${cc} حرف · ${wc} كلمة`;
  }

  function handleAddUserContent(e) {
    e.preventDefault();
    const text = userContentInput.value.trim();
    if (!text) return;
    const size = classifySize(text);
    const folderId = addFolderTarget.value || "default";
    const items = getUserContent();
    items.push({
      id: Date.now() + Math.floor(Math.random() * 999),
      content: text,
      size,
      folderId,
      addedAt: new Date().toISOString(),
      source: "manual"
    });
    setUserContent(items);
    // Reset only the textarea, keep the folder selection for fast batch entry
    userContentInput.value = "";
    updateClassifyPreview();
    renderFoldersList();
    populateFolderSelectors();
    renderUserContentList();
    renderUserContentFilter();
    renderDefaultContentList();
    typingAudio.playKeySound(false);
  }

  // ============================ EXCEL UPLOAD ============================
  function handleExcelFile(file) {
    if (typeof XLSX === "undefined") {
      showUploadResult("error", "مكتبة Excel لم تُحمَّل. تحقق من اتصال الإنترنت ثم أعد المحاولة.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });

        const items = getUserContent();
        let added = 0;
        const breakdown = { words: 0, chunks: 0, small: 0, medium: 0, large: 0 };
        const targetFolder = uploadFolderTarget.value || "default";
        const baseTime = Date.now();

        rows.forEach((row, idx) => {
          // Skip header row if first row looks like a header
          if (idx === 0 && typeof row[0] === "string" && /text|content|نص|محتوى/i.test(row[0])) return;
          const text = (row[0] || "").toString().trim();
          if (!text) return;
          const size = classifySize(text);
          // Use baseTime + idx to GUARANTEE insertion order (no random collisions)
          items.push({
            id: baseTime + idx,
            content: text,
            size,
            folderId: targetFolder,
            addedAt: new Date(baseTime + idx).toISOString(),
            source: "excel"
          });
          added++;
          breakdown[size]++;
        });

        setUserContent(items);
        renderFoldersList();
        populateFolderSelectors();
        renderUserContentList();
        renderUserContentFilter();
        renderDefaultContentList();

        const breakdownHTML = Object.entries(breakdown)
          .filter(([, n]) => n > 0)
          .map(([s, n]) => `${sizeLabel(s)}: <strong>${n}</strong>`)
          .join(" · ");
        showUploadResult("success",
          `✓ تم إضافة <strong>${added}</strong> نص بنجاح.<br>${breakdownHTML}`);
        excelFileInput.value = "";
      } catch (err) {
        console.error(err);
        showUploadResult("error", `حدث خطأ في قراءة الملف: ${err.message}`);
      }
    };
    reader.onerror = () => showUploadResult("error", "فشل قراءة الملف.");
    reader.readAsArrayBuffer(file);
  }

  function showUploadResult(kind, html) {
    uploadResult.style.display = "block";
    uploadResult.className = kind === "success" ? "upload-result-success" : "upload-result-error";
    uploadResult.innerHTML = html;
    setTimeout(() => { uploadResult.style.display = "none"; }, 8000);
  }

  function downloadExcelTemplate() {
    if (typeof XLSX === "undefined") return;
    const aoa = [
      ["text"],
      ["practice"],
      ["good morning"],
      ["This is a short sentence to practice."],
      ["This is a medium paragraph for practice. It contains three or four sentences. You can edit it freely. The classifier will pick the right size for you."],
      ["This is a longer passage that simulates a real paragraph you might read in a book or article. It will be auto-classified as 'large' because of its length and number of sentences. Replace it with any text you want to practice. The first column is all that matters. Other columns are ignored."]
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TypeFlow Template");
    XLSX.writeFile(wb, "typeflow_template.xlsx");
  }

  // ============================ USER CONTENT LIST ============================
  function renderUserContentFilter() {
    const items = getUserContent();
    const sizes = new Set(items.map(i => i.size));
    const prevVal = filterUserContent.value || "all";
    filterUserContent.innerHTML = `<option value="all">الكل (${items.length})</option>`;
    SIZE_OPTIONS.forEach(s => {
      const count = items.filter(i => i.size === s.id).length;
      if (count > 0) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.icon} ${s.name_ar} (${count})`;
        filterUserContent.appendChild(opt);
      }
    });
    filterUserContent.value = sizes.has(prevVal) || prevVal === "all" ? prevVal : "all";
  }

  function renderUserContentList() {
    const allItems = getUserContent();
    userContentCount.textContent = `(${allItems.length})`;
    const sizeFilter   = filterUserContent.value || "all";
    const folderFilter = filterFolder.value || "all";

    let filtered = allItems;
    if (folderFilter !== "all") filtered = filtered.filter(i => (i.folderId || "default") === folderFilter);
    if (sizeFilter !== "all")   filtered = filtered.filter(i => i.size === sizeFilter);

    // Disable delete-all when there's nothing to delete
    deleteAllBtn.disabled = allItems.length === 0;

    userContentBody.innerHTML = "";
    if (filtered.length === 0) {
      userContentBody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; color: var(--text-muted); font-style: italic;">
          ${allItems.length === 0 ? "لم تضف أي محتوى بعد. ابدأ من الحقل أعلاه أو ارفع ملف Excel." : "لا توجد نصوص مطابقة للفلتر."}
        </td></tr>`;
      return;
    }

    // Display in insertion order — preserves Excel row order
    filtered.forEach((item, displayIdx) => {
      const tr = document.createElement("tr");
      const date = new Date(item.addedAt).toLocaleDateString("ar-EG", {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const preview = item.content.length > 80
        ? item.content.slice(0, 80) + "…"
        : item.content;
      const src = item.source === "excel" ? "📤 Excel" : "✍️ يدوي";
      const folderTxt = folderName(item.folderId);
      tr.innerHTML = `
        <td style="opacity:0.6; font-family: var(--font-mono); font-size: 0.8rem;">${displayIdx + 1}</td>
        <td><span style="font-family: var(--font-mono); font-size: 0.85rem;">${escapeHtml(preview)}</span></td>
        <td><span class="item-folder-badge">${folderTxt}</span></td>
        <td><span class="size-badge size-${item.size}">${sizeLabel(item.size)}</span></td>
        <td>${src}</td>
        <td>${date}</td>
        <td><button class="btn-delete">🗑</button></td>
      `;
      tr.querySelector(".btn-delete").addEventListener("click", () => {
        const all = getUserContent().filter(x => x.id !== item.id);
        setUserContent(all);
        renderFoldersList();
        renderUserContentList();
        renderUserContentFilter();
        renderDefaultContentList();
      });
      userContentBody.appendChild(tr);
    });
  }

});
