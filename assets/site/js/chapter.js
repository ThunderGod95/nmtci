const STORAGE_KEY_SETTINGS = "reader-settings";
const STORAGE_KEY_SCROLL_PREFIX = "reader-scroll-";
const SCROLL_KEY =
    STORAGE_KEY_SCROLL_PREFIX +
    window.location.pathname +
    window.location.search;

const THEMES = {
    light: { bg: "#fdfdfd", text: "#333333" },
    sepia: { bg: "#f4ecd8", text: "#5b4636" },
    dark: { bg: "#222222", text: "#d1d1d1" },
    midnight: { bg: "#2b323b", text: "#c4cdd5" },
    forest: { bg: "#e8f5e9", text: "#2d3b2d" },
    amoled: { bg: "#000000", text: "#b3b3b3" },
};

const PREV_CHAPTER_NUM = "{{ page.prev }}";
const NEXT_CHAPTER_NUM = "{{ page.next }}";
const PREV_CHAPTER_URL = PREV_CHAPTER_NUM ? `${PREV_CHAPTER_NUM}.html` : "";
const NEXT_CHAPTER_URL = NEXT_CHAPTER_NUM ? `${NEXT_CHAPTER_NUM}.html` : "";

const root = document.documentElement;
const fabContainer = document.querySelector(".fab-container");

// Navigation
const navBar = document.getElementById("topNav");
const sentinel = document.getElementById("sentinel");
const prevLinks = document.querySelectorAll(".nav-prev");
const nextLinks = document.querySelectorAll(".nav-next");

// Settings Menu UI
const menu = document.getElementById("settingsMenu");
const toggleBtn = document.getElementById("toggleSettings");
const themeBtns = document.querySelectorAll(".theme-btn");
const progressBar = document.getElementById("progress-bar");

// Inputs & Displays
const inputs = {
    fontSize: document.getElementById("input-fontsize"),
    lineHeight: document.getElementById("input-lineheight"),
    fontFamily: document.getElementById("input-font"),
    spacing: document.getElementById("input-spacing"),
    paraStyle: document.getElementById("input-para-style"),
};

const displays = {
    fontSize: document.getElementById("fs-val"),
    lineHeight: document.getElementById("lh-val"),
    spacing: document.getElementById("spacing-val"),
};

// Audio
const audioBtn = document.getElementById("toggleAudio");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const voiceSelect = document.getElementById("input-voice");
const rateInput = document.getElementById("input-rate");
const pitchInput = document.getElementById("input-pitch");
const rateValDisplay = document.getElementById("rate-val");
const pitchValDisplay = document.getElementById("pitch-val");
const audioSettingsBtn = document.getElementById("toggleAudioSettings");
const audioMenu = document.getElementById("audioSettingsMenu");
const audioStatusText = document.getElementById("audio-status-text");

let lastScrollTop = 0;
let synth = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;
let isPaused = false;
let paraObjects = [];
let currentParaIndex = 0;
let voices = [];

function populateVoiceList() {
    voices = synth.getVoices();
    voiceSelect.innerHTML = "";

    const englishVoices = voices.filter((v) => v.lang.includes("en"));

    englishVoices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.textContent = `${voice.name} (${voice.lang})`;
        const globalIndex = voices.indexOf(voice);
        option.setAttribute("data-index", globalIndex);
        voiceSelect.appendChild(option);
    });

    loadAudioSettings();

    if (voiceSelect.selectedIndex === -1 && voiceSelect.options.length > 0) {
        voiceSelect.selectedIndex = 0;
    }
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
} else {
    populateVoiceList();
}

function saveAudioSettings() {
    const settings = {
        rate: rateInput.value,
        pitch: pitchInput.value,
        voiceName: voiceSelect.selectedOptions[0]?.textContent,
    };
    localStorage.setItem("reader-audio-settings", JSON.stringify(settings));
}

function loadAudioSettings() {
    const saved = JSON.parse(localStorage.getItem("reader-audio-settings"));
    if (saved) {
        rateInput.value = saved.rate;
        pitchInput.value = saved.pitch;
        rateValDisplay.textContent = saved.rate + "x";
        pitchValDisplay.textContent = saved.pitch;

        for (let i = 0; i < voiceSelect.options.length; i++) {
            if (voiceSelect.options[i].textContent === saved.voiceName) {
                voiceSelect.selectedIndex = i;
                break;
            }
        }
    }
}

function loadParagraphs() {
    const contentDiv = document.getElementById("content");
    paraObjects = Array.from(contentDiv.getElementsByTagName("p"))
        .filter((p) => p.innerText.trim().length > 0)
        .map((p) => ({ element: p, text: p.innerText }));
}

function clearHighlights() {
    paraObjects.forEach((obj) =>
        obj.element.classList.remove("active-reading"),
    );
}

function speakParagraph(index) {
    if (index > paraObjects.length) {
        stopAudio();
        return;
    }

    if (currentUtterance) {
        currentUtterance.onend = null;
        currentUtterance.onerror = null;
    }

    synth.cancel();

    currentParaIndex = index;
    const pObj = paraObjects[index];

    clearHighlights();
    pObj.element.classList.add("active-reading");
    pObj.element.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });

    currentUtterance = new SpeechSynthesisUtterance(pObj.text);

    const selectedOption = voiceSelect.selectedOptions[0];
    if (selectedOption) {
        const voiceIndex = selectedOption.getAttribute("data-index");
        currentUtterance.voice = voices[voiceIndex];
    }
    currentUtterance.rate = parseFloat(rateInput.value);
    currentUtterance.pitch = parseFloat(pitchInput.value);

    currentUtterance.onend = () => {
        if (isPlaying && !isPaused) {
            speakParagraph(currentParaIndex + 1);
        }
    };

    currentUtterance.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return;

        console.error("Audio error", e);
        stopAudio();
    };

    synth.speak(currentUtterance);
}

function toggleAudio() {
    if (!isPlaying) {
        loadParagraphs();
        if (paraObjects.length === 0) return;

        isPlaying = true;
        isPaused = false;
        updateAudioUI();
        speakParagraph(currentParaIndex);
    } else if (isPlaying && !isPaused) {
        synth.pause();
        isPaused = true;
        updateAudioUI();
    } else if (isPlaying && isPaused) {
        if (synth.paused) {
            synth.resume();
        } else {
            speakParagraph(currentParaIndex);
        }
        isPaused = false;
        updateAudioUI();
    }
}

function stopAudio() {
    synth.cancel();
    isPlaying = false;
    isPaused = false;
    currentParaIndex = 0;
    clearHighlights();
    updateAudioUI();
}

function updateAudioUI() {
    const wrapper = document.querySelector(".audio-toolbar-wrapper");
    const statusText = document.getElementById("audio-status-text");

    if (isPlaying) {
        wrapper.classList.add("floating");
    } else {
        wrapper.classList.remove("floating");
    }

    if (isPlaying && !isPaused) {
        iconPlay.style.display = "none";
        iconPause.style.display = "block";
        statusText.textContent = "Pause";
    } else if (isPlaying && isPaused) {
        iconPlay.style.display = "block";
        iconPause.style.display = "none";
        statusText.textContent = "Resume";
    } else {
        iconPlay.style.display = "block";
        iconPause.style.display = "none";
        statusText.textContent = "Listen";
    }
}

function applyTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.light;

    root.style.setProperty("--bg-color", theme.bg);
    root.style.setProperty("--text-color", theme.text);
    root.setAttribute("data-theme", themeName);

    themeBtns.forEach((btn) => {
        if (btn.dataset.theme === themeName) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute("content", theme.bg);
    }

    return themeName;
}

function applyParaStyle(style) {
    if (style === "indent") {
        root.style.setProperty("--para-indent", "2em");
        root.style.setProperty("--para-margin", "0");
    } else {
        root.style.setProperty("--para-indent", "0");
        root.style.setProperty("--para-margin", "1em");
    }
}

function saveSettings() {
    const activeBtn = document.querySelector(".theme-btn.active");
    const currentTheme = activeBtn ? activeBtn.dataset.theme : "light";

    const settings = {
        fontSize: inputs.fontSize.value,
        lineHeight: inputs.lineHeight.value,
        theme: currentTheme,
        fontFamily: inputs.fontFamily.value,
        letterSpacing: inputs.spacing.value,
        paraStyle: inputs.paraStyle.value,
    };

    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

    if (savedSettings) {
        const settings = JSON.parse(savedSettings);

        root.style.setProperty("--text-size", settings.fontSize + "px");
        root.style.setProperty("--line-height", settings.lineHeight);

        if (settings.fontFamily) {
            root.style.setProperty("--font-family", settings.fontFamily);
            inputs.fontFamily.value = settings.fontFamily;
        }

        if (settings.letterSpacing) {
            root.style.setProperty(
                "--letter-spacing",
                settings.letterSpacing + "px",
            );
            inputs.spacing.value = settings.letterSpacing;
            displays.spacing.textContent = settings.letterSpacing + "px";
        }

        if (settings.paraStyle) {
            inputs.paraStyle.value = settings.paraStyle;
            applyParaStyle(settings.paraStyle);
        }

        inputs.fontSize.value = settings.fontSize;
        inputs.lineHeight.value = settings.lineHeight;
        displays.fontSize.textContent = settings.fontSize + "px";
        displays.lineHeight.textContent = settings.lineHeight;

        applyTheme(settings.theme || "light");
    } else {
        applyTheme("light");
    }

    const savedScroll = localStorage.getItem(SCROLL_KEY);
    if (savedScroll) {
        setTimeout(() => {
            window.scrollTo(0, parseInt(savedScroll));
        }, 100);
    }
}

function changeFontSize(delta) {
    const currentVal = parseInt(inputs.fontSize.value);
    const minVal = parseInt(inputs.fontSize.min);
    const maxVal = parseInt(inputs.fontSize.max);

    let newVal = currentVal + delta;

    if (newVal >= minVal && newVal <= maxVal) {
        inputs.fontSize.value = newVal;
        inputs.fontSize.dispatchEvent(new Event("input"));
    }
}

function updateNavigation() {
    const updateLinks = (links, url) => {
        links.forEach((link) => {
            if (url && url.trim() !== "") {
                link.href = url;
                link.classList.remove("disabled");
            } else {
                link.removeAttribute("href");
                link.classList.add("disabled");
            }
        });
    };

    updateLinks(prevLinks, PREV_CHAPTER_URL);
    updateLinks(nextLinks, NEXT_CHAPTER_URL);
}

function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    progressBar.style.width = scrollPercent + "%";
    localStorage.setItem(SCROLL_KEY, scrollTop);
}

function handleScrollFAB() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (Math.abs(scrollTop - lastScrollTop) < 10) return;

    const isScrollingDown = scrollTop > lastScrollTop;
    const isMenuOpen = menu.classList.contains("active");

    if (isScrollingDown && scrollTop > 50 && !isMenuOpen) {
        fabContainer.classList.add("fab-hidden");
    } else if (!isScrollingDown) {
        fabContainer.classList.remove("fab-hidden");
    }

    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

function saveReadingHistory() {
    const pathSegments = window.location.pathname.split("/");
    const fileName = pathSegments[pathSegments.length - 1];
    const chapterId = parseInt(fileName.replace(".html", ""), 10);

    const titleEl = document.querySelector("#content > h1").innerText;
    const separatorIndex = titleEl.indexOf(": ");
    const chapterTitle = titleEl.slice(separatorIndex + 2);

    const history = {
        id: chapterId,
        title: chapterTitle,
        url: window.location.href,
        timestamp: Date.now(),
    };

    localStorage.setItem("nmtci-last-read", JSON.stringify(history));
}

audioSettingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    audioMenu.classList.toggle("active");
    menu.classList.remove("active");
});

document.addEventListener("click", (e) => {
    if (
        audioMenu.classList.contains("active") &&
        !audioMenu.contains(e.target) &&
        e.target !== audioSettingsBtn
    ) {
        audioMenu.classList.remove("active");
    }
});

audioMenu.addEventListener("click", (e) => {
    e.stopPropagation();
});

rateInput.addEventListener("input", (e) => {
    rateValDisplay.textContent = e.target.value + "x";
    saveAudioSettings();
    if (isPlaying && !isPaused) speakParagraph(currentParaIndex);
});

pitchInput.addEventListener("input", (e) => {
    pitchValDisplay.textContent = e.target.value;
    saveAudioSettings();
    if (isPlaying && !isPaused) speakParagraph(currentParaIndex);
});

voiceSelect.addEventListener("change", () => {
    saveAudioSettings();
    if (isPlaying && !isPaused) speakParagraph(currentParaIndex);
});

audioBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAudio();
});

window.addEventListener("beforeunload", () => {
    synth.cancel();
});

inputs.fontSize.addEventListener("input", (e) => {
    const val = e.target.value;
    root.style.setProperty("--text-size", val + "px");
    displays.fontSize.textContent = val + "px";
    saveSettings();
});

inputs.lineHeight.addEventListener("input", (e) => {
    const val = e.target.value;
    root.style.setProperty("--line-height", val);
    displays.lineHeight.textContent = val;
    saveSettings();
});

inputs.spacing.addEventListener("input", (e) => {
    const val = e.target.value;
    root.style.setProperty("--letter-spacing", val + "px");
    displays.spacing.textContent = val + "px";
    saveSettings();
});

inputs.fontFamily.addEventListener("change", (e) => {
    root.style.setProperty("--font-family", e.target.value);
    saveSettings();
});

inputs.paraStyle.addEventListener("change", (e) => {
    applyParaStyle(e.target.value);
    saveSettings();
});

themeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        applyTheme(e.target.dataset.theme);
        saveSettings();
    });
});

toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("active");
});

document.addEventListener("click", (e) => {
    if (menu.classList.contains("active") && !menu.contains(e.target)) {
        menu.classList.remove("active");
    }
});

menu.addEventListener("click", (e) => {
    e.stopPropagation();
});

document.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowLeft":
            if (PREV_CHAPTER_URL) window.location.href = PREV_CHAPTER_URL;
            break;
        case "ArrowRight":
            if (NEXT_CHAPTER_URL) window.location.href = NEXT_CHAPTER_URL;
            break;
        case "-":
        case "_":
            changeFontSize(-1);
            break;
        case "=":
        case "+":
            changeFontSize(1);
            break;
    }
});

window.addEventListener(
    "scroll",
    () => {
        updateProgress();
        handleScrollFAB();
    },
    { passive: true },
);

window.addEventListener("resize", updateProgress);

const navObserver = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) {
        navBar.classList.add("stuck");
    } else {
        navBar.classList.remove("stuck");
    }
});

function init() {
    updateNavigation();
    loadSettings();
    navObserver.observe(sentinel);
    saveReadingHistory();
}

init();
