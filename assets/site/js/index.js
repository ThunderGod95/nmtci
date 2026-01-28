const CONFIG = {
    chaptersPerPage: 100,
    storageKeys: {
        settings: "reader-settings",
        lastRead: "nmtci-last-read",
        pwaDismissed: "pwa-install-dismissed",
    },
    themes: {
        light: { bg: "#fdfdfd", text: "#333333" },
        sepia: { bg: "#f4ecd8", text: "#5b4636" },
        dark: { bg: "#222222", text: "#d1d1d1" },
        midnight: { bg: "#2b323b", text: "#c4cdd5" },
        forest: { bg: "#e8f5e9", text: "#2d3b2d" },
        amoled: { bg: "#000000", text: "#b3b3b3" },
    },
};

const DOM = {
    root: document.documentElement,

    settingsMenu: document.getElementById("settingsMenu"),
    toggleSettingsBtn: document.getElementById("toggleSettings"),
    themeBtns: document.querySelectorAll(".theme-btn"),

    resumeBtn: document.getElementById("resumeBtn"),
    resumeDisplay: document.getElementById("resumeChapterDisplay"),

    chapterList: document.getElementById("chapterList"),
    rangeSelect: document.getElementById("rangeSelect"),
    searchInput: document.getElementById("searchInput"),
    sortBtn: document.getElementById("sortBtn"),
    sortLabel: document.getElementById("sortLabel"),
    firstChapterBtn: document.getElementById("firstChapterBtn"),
    latestChapterBtn: document.getElementById("latestChapterBtn"),

    installFab: document.getElementById("installFab"),
    installMenu: document.getElementById("installMenu"),
    installAction: document.getElementById("pwaInstallAction"),
    dismissAction: document.getElementById("pwaDismissAction"),
};

const ThemeManager = {
    init() {
        this.load();
        this.bindEvents();
    },

    bindEvents() {
        DOM.toggleSettingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            DOM.settingsMenu.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (
                DOM.settingsMenu.classList.contains("active") &&
                !DOM.settingsMenu.contains(e.target)
            ) {
                DOM.settingsMenu.classList.remove("active");
            }
        });

        DOM.settingsMenu.addEventListener("click", (e) => e.stopPropagation());

        DOM.themeBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const themeName = e.target.dataset.theme;
                this.apply(themeName);
                this.save();
            });
        });
    },

    apply(themeName) {
        const theme = CONFIG.themes[themeName] || CONFIG.themes.light;

        DOM.root.style.setProperty("--bg-color", theme.bg);
        DOM.root.style.setProperty("--text-color", theme.text);
        DOM.root.setAttribute("data-theme", themeName);

        const metaThemeColor = document.querySelector(
            'meta[name="theme-color"]',
        );
        if (metaThemeColor) metaThemeColor.setAttribute("content", theme.bg);

        DOM.themeBtns.forEach((btn) => {
            if (btn.dataset.theme === themeName) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    },

    load() {
        const savedSettings = localStorage.getItem(CONFIG.storageKeys.settings);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.fontFamily) {
                DOM.root.style.setProperty(
                    "--font-family",
                    settings.fontFamily,
                );
            }
            this.apply(settings.theme || "light");
        } else {
            this.apply("light");
        }
    },

    save() {
        const savedRaw = localStorage.getItem(CONFIG.storageKeys.settings);
        let settings = savedRaw
            ? JSON.parse(savedRaw)
            : { fontSize: 18, lineHeight: 1.6 };

        const activeBtn = document.querySelector(".theme-btn.active");
        settings.theme = activeBtn ? activeBtn.dataset.theme : "light";

        localStorage.setItem(
            CONFIG.storageKeys.settings,
            JSON.stringify(settings),
        );
    },
};

const ResumeManager = {
    init() {
        try {
            const lastRead = JSON.parse(
                localStorage.getItem(CONFIG.storageKeys.lastRead),
            );

            if (lastRead && lastRead.url) {
                DOM.resumeBtn.href = lastRead.url;

                let chapterText =
                    lastRead.id !== null && lastRead.id !== undefined
                        ? `Ch. ${lastRead.id}`
                        : "Unknown Chapter";

                if (lastRead.title) {
                    chapterText += `: ${lastRead.title}`;
                }

                DOM.resumeDisplay.textContent = chapterText;
                DOM.resumeBtn.classList.remove("resume-hidden");
            }
        } catch (e) {
            console.error("Error reading history", e);
        }
    },
};

const ContentManager = {
    chapters: [],
    state: {
        sortDesc: false,
        searchQuery: "",
        currentRange: 0,
    },

    async init() {
        try {
            const response = await fetch("chapters.json");
            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            this.chapters = await response.json();
            this.chapters.sort((a, b) => a.id - b.id);

            this.updateNavButtons();
            this.render();
            this.bindEvents();
        } catch (error) {
            console.error("Unable to fetch data:", error);
            DOM.chapterList.innerHTML = `<li class="error-state">Error loading chapters.</li>`;
        }
    },

    bindEvents() {
        DOM.searchInput.addEventListener("input", (e) => {
            this.state.searchQuery = e.target.value.trim();
            this.render();
        });

        DOM.rangeSelect.addEventListener("change", (e) => {
            this.state.currentRange = parseInt(e.target.value);
            DOM.searchInput.value = "";
            this.state.searchQuery = "";
            this.render();
        });

        DOM.sortBtn.addEventListener("click", () => {
            this.state.sortDesc = !this.state.sortDesc;
            this.render();
        });
    },

    updateNavButtons() {
        if (this.chapters.length > 0) {
            DOM.firstChapterBtn.href = this.chapters[0].url;
            DOM.latestChapterBtn.href =
                this.chapters[this.chapters.length - 1].url;
        } else {
            DOM.firstChapterBtn.classList.add("disabled");
            DOM.latestChapterBtn.classList.add("disabled");
        }
    },

    render() {
        this.renderRanges();
        this.renderList();
        DOM.sortLabel.textContent = this.state.sortDesc
            ? "Newest First"
            : "Oldest First";
    },

    renderRanges() {
        DOM.rangeSelect.innerHTML = "";

        if (this.state.searchQuery.length > 0) {
            const opt = document.createElement("option");
            opt.text = "Search Results";
            DOM.rangeSelect.add(opt);
            DOM.rangeSelect.disabled = true;
            return;
        }

        DOM.rangeSelect.disabled = false;
        const totalRanges = Math.ceil(
            this.chapters.length / CONFIG.chaptersPerPage,
        );

        for (let i = 0; i < totalRanges; i++) {
            const startIndex = i * CONFIG.chaptersPerPage;
            const endIndex =
                Math.min(
                    (i + 1) * CONFIG.chaptersPerPage,
                    this.chapters.length,
                ) - 1;
            const startChapter = this.chapters[startIndex];
            const endChapter = this.chapters[endIndex];

            if (startChapter && endChapter) {
                const opt = document.createElement("option");
                opt.value = i;
                opt.text = `Ch. ${startChapter.id} - ${endChapter.id}`;
                if (i === this.state.currentRange) opt.selected = true;
                DOM.rangeSelect.add(opt);
            }
        }
    },

    renderList() {
        DOM.chapterList.innerHTML = "";
        let filtered = this.chapters;

        if (this.state.searchQuery) {
            const q = this.state.searchQuery.toLowerCase();
            filtered = this.chapters.filter(
                (ch) =>
                    ch.id.toString().includes(q) ||
                    ch.title.toLowerCase().includes(q),
            );
        } else {
            const start = this.state.currentRange * CONFIG.chaptersPerPage;
            const end = start + CONFIG.chaptersPerPage;
            filtered = this.chapters.slice(start, end);
        }

        const displayList = [...filtered];
        displayList.sort((a, b) =>
            this.state.sortDesc ? b.id - a.id : a.id - b.id,
        );

        if (displayList.length === 0) {
            DOM.chapterList.innerHTML = `<li class="empty-state">No chapters found.</li>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        displayList.forEach((ch) => {
            const li = document.createElement("li");
            li.className = "chapter-item";
            li.innerHTML = `
                <a href="${ch.url}">
                    <span class="chapter-num">Ch. ${ch.id}</span>
                    <span class="chapter-title">${ch.title}</span>
                </a>`;
            fragment.appendChild(li);
        });
        DOM.chapterList.appendChild(fragment);
    },
};

const PWAManager = {
    deferredPrompt: null,

    init() {
        if (!DOM.installFab) return;

        const isDismissed =
            localStorage.getItem(CONFIG.storageKeys.pwaDismissed) === "true";

        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            if (!isDismissed) DOM.installFab.style.display = "flex";
        });

        this.bindEvents();
    },

    bindEvents() {
        DOM.installFab.addEventListener("click", (e) => {
            e.stopPropagation();
            DOM.installMenu.classList.toggle("active");
            DOM.settingsMenu.classList.remove("active");
        });

        document.addEventListener("click", (e) => {
            if (
                DOM.installMenu &&
                DOM.installMenu.classList.contains("active") &&
                !DOM.installMenu.contains(e.target)
            ) {
                DOM.installMenu.classList.remove("active");
            }
        });

        if (DOM.installAction) {
            DOM.installAction.addEventListener("click", async () => {
                if (!this.deferredPrompt) return;
                DOM.installMenu.classList.remove("active");

                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log(`User response: ${outcome}`);

                this.deferredPrompt = null;
                if (outcome === "accepted")
                    DOM.installFab.style.display = "none";
            });
        }

        if (DOM.dismissAction) {
            DOM.dismissAction.addEventListener("click", () => {
                DOM.installMenu.classList.remove("active");
                DOM.installFab.style.display = "none";
                localStorage.setItem(CONFIG.storageKeys.pwaDismissed, "true");
                alert("Button hidden. You can install later via browser menu.");
            });
        }
    },
};

document.addEventListener("DOMContentLoaded", () => {
    ThemeManager.init();
    ResumeManager.init();
    ContentManager.init();
    PWAManager.init();
});
