"use strict";

/* ---------- Helpers ---------- */
const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* =====================================================================
   1. TOAST NOTIFICATIONS
   A toast slides in, waits, then slides out (classList + setTimeout)
   ===================================================================== */
const toastBox = $("#toast-container");
const TOAST_ICONS = { success: "\u2713", info: "i", warning: "!" };

function showToast(message, type = "info", duration = 3500) {
  // keep the screen tidy: at most 4 notifications at once
  if (toastBox.children.length >= 4) toastBox.firstElementChild.remove();

  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.setAttribute("role", "status");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = TOAST_ICONS[type] || "i";

  const text = document.createElement("span");
  text.className = "toast-text";
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss notification");
  close.innerHTML = "&times;";

  toast.append(icon, text, close);
  toastBox.appendChild(toast);

  // small delay so the browser can start the slide-in transition
  setTimeout(() => toast.classList.add("show"), 20);

  let closed = false;
  function dismiss() {
    if (closed) return;
    closed = true;
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 400);
  }

  close.addEventListener("click", dismiss);
  setTimeout(dismiss, duration);
}

/* =====================================================================
   2. SCROLL REVEAL + SCROLL PROGRESS BAR
   ===================================================================== */
const revealItems = $$(".reveal");
const progressBar = $("#scroll-progress");

// give every child of a .stagger group its own index for the animation delay
$$(".stagger").forEach(group => {
  Array.from(group.children).forEach((child, index) => child.style.setProperty("--i", index));
});

function onScroll() {
  const trigger = window.innerHeight * 0.88;

  revealItems.forEach(item => {
    if (!item.classList.contains("visible") && item.getBoundingClientRect().top < trigger) {
      item.classList.add("visible");
    }
  });

  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const percent = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  progressBar.style.width = percent + "%";
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* =====================================================================
   3. MOBILE MENU: close after choosing a link
   ===================================================================== */
const menuToggle = $("#menu-toggle");
$$(".nav-links a").forEach(link => {
  link.addEventListener("click", () => { menuToggle.checked = false; });
});

/* =====================================================================
   4. COURSE CARDS: open / close details
   ===================================================================== */
$$(".btn-details").forEach(button => {
  button.addEventListener("click", () => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    const isOpen = panel.classList.toggle("open");

    button.classList.toggle("active", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    $(".btn-label", button).textContent = isOpen ? "Hide Details" : "View Details";
  });
});

/* =====================================================================
   5. COURSE CARDS: enroll / cancel with animated feedback
   ===================================================================== */
function bump(element) {
  element.classList.remove("bump");
  void element.offsetWidth;                 // restart the animation
  element.classList.add("bump");
  setTimeout(() => element.classList.remove("bump"), 500);
}

$$(".btn-enroll").forEach(button => {
  button.addEventListener("click", () => {
    const card = button.closest("article");
    const seats = $(".seats", card);
    const label = $(".btn-label", button);
    const courseSelect = $("#course");

    const enrolled = button.classList.toggle("enrolled");

    // update the seat counter and animate it
    const current = parseInt(seats.textContent, 10);
    seats.textContent = enrolled ? current - 1 : current + 1;
    bump(seats);

    label.textContent = enrolled ? "Enrolled \u2713" : "Enroll";

    // button click animation
    button.classList.add("clicked");
    setTimeout(() => button.classList.remove("clicked"), 450);

    if (enrolled) {
      courseSelect.value = button.dataset.course;
      showToast("You are enrolled in " + button.dataset.title + ". Complete the form below to confirm.", "success");
    } else {
      if (courseSelect.value === button.dataset.course) courseSelect.value = "";
      showToast("Enrollment cancelled for " + button.dataset.title + ".", "info");
    }
  });
});

/* =====================================================================
   6. FAQ ACCORDION (open / close sections)
   ===================================================================== */
const faqItems = $$(".faq-item");

function setFaq(item, open) {
  const question = $(".faq-q", item);
  $(".faq-a", item).classList.toggle("open", open);
  question.classList.toggle("active", open);
  question.setAttribute("aria-expanded", String(open));
}

faqItems.forEach(item => {
  $(".faq-q", item).addEventListener("click", () => {
    const isOpen = $(".faq-a", item).classList.contains("open");
    setFaq(item, !isOpen);
  });
});

// open or close all answers one after another
$("#faq-expand").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, true), index * 150));
});
$("#faq-collapse").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, false), index * 150));
});

/* =====================================================================
   7. GALLERY LIGHTBOX (open / close with animation)
   ===================================================================== */
const lightbox = $("#lightbox");
const lightboxImg = $("#lightbox-img");
const lightboxCaption = $("#lightbox-caption");
const lightboxClose = $("#lightbox-close");
let lastFocused = null;

function openLightbox(image) {
  lastFocused = image;
  lightboxImg.src = image.src.replace("/400/300", "/800/600");   // larger version of the picture
  lightboxImg.alt = image.alt;
  lightboxCaption.textContent = $("figcaption", image.parentElement).textContent;

  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  setTimeout(() => lightboxClose.focus(), 50);
}

function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");

  // wait for the closing animation, then tidy up
  setTimeout(() => {
    lightboxImg.removeAttribute("src");
    if (lastFocused) lastFocused.focus();
  }, 380);
}

$$(".gallery-item img").forEach(image => {
  image.addEventListener("click", () => openLightbox(image));
  image.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox(image);
    }
  });
});

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", event => {
  if (event.target === lightbox) closeLightbox();                // click on the dark background
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
});

/* =====================================================================
   8. ANIMATION LAB: playground buttons
   ===================================================================== */
const labBox = $("#lab-box");
const labName = $("#lab-name");
const labClasses = ["anim-fade", "anim-slide", "anim-bounce", "anim-shake", "anim-spin", "anim-pulse"];
let labTimer = null;

$$("[data-anim]").forEach(button => {
  button.addEventListener("click", () => {
    clearTimeout(labTimer);
    labBox.classList.remove(...labClasses);
    void labBox.offsetWidth;                                     // restart the animation
    labBox.classList.add(button.dataset.anim);
    labName.textContent = button.textContent;

    // remove the class when the animation has finished
    labTimer = setTimeout(() => labBox.classList.remove(button.dataset.anim), 1100);
  });
});

/* ---------- Notification demo buttons ---------- */
const demoMessages = {
  success: "Success! Your action was completed.",
  info: "Info: new batches open every Tuesday.",
  warning: "Warning: only a few seats are left."
};
$$("[data-toast]").forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.toast;
    showToast(demoMessages[type], type);
  });
});

/* =====================================================================
   9. ENROLLMENT SEQUENCE (steps light up one after another)
   ===================================================================== */
const steps = $$(".step");
const stepBar = $("#progress-bar");
const runButton = $("#run-steps");
const resetButton = $("#reset-steps");
let sequenceTimers = [];

function resetSteps() {
  sequenceTimers.forEach(clearTimeout);
  sequenceTimers = [];
  steps.forEach(step => step.classList.remove("active", "done"));
  stepBar.style.width = "0%";
  runButton.disabled = false;
}

function runSteps() {
  resetSteps();
  runButton.disabled = true;

  steps.forEach((step, index) => {
    sequenceTimers.push(setTimeout(() => {
      if (index > 0) steps[index - 1].classList.replace("active", "done");
      step.classList.add("active");
      stepBar.style.width = ((index + 1) / steps.length) * 100 + "%";
    }, index * 1000));
  });

  // finish the last step
  sequenceTimers.push(setTimeout(() => {
    steps[steps.length - 1].classList.replace("active", "done");
    showToast("Enrollment sequence complete!", "success");
    runButton.disabled = false;
  }, steps.length * 1000));
}

runButton.addEventListener("click", runSteps);
resetButton.addEventListener("click", resetSteps);

/* =====================================================================
   10. REGISTRATION FORM: loading, success and invalid-field animations
   ===================================================================== */
const form = $("#reg-form");
const submitButton = $("#submit-btn");
const submitText = $(".btn-text", submitButton);
let invalidToastShown = false;

// runs only when every field is valid
form.addEventListener("submit", event => {
  event.preventDefault();

  submitButton.classList.add("loading");
  submitButton.disabled = true;
  submitText.textContent = "Sending...";

  setTimeout(() => {
    submitButton.classList.remove("loading");
    submitButton.classList.add("success");
    submitText.textContent = "Registered \u2713";
    showToast("Registration submitted. Check your email for confirmation.", "success", 4500);
    form.reset();

    setTimeout(() => {
      submitButton.classList.remove("success");
      submitText.textContent = "Register";
      submitButton.disabled = false;
    }, 2000);
  }, 1500);
});

// shake every field that fails validation (the invalid event does not bubble, so use capture)
form.addEventListener("invalid", event => {
  const field = event.target;
  field.classList.add("shake");
  setTimeout(() => field.classList.remove("shake"), 500);

  if (!invalidToastShown) {
    invalidToastShown = true;
    showToast("Please check the highlighted fields.", "warning");
    setTimeout(() => { invalidToastShown = false; }, 1500);
  }
}, true);

$("#clear-btn").addEventListener("click", () => showToast("The form has been cleared.", "info", 2500));

/* =====================================================================
   11. WELCOME NOTIFICATION
   ===================================================================== */
setTimeout(() => {
  showToast("Welcome to SkillBridge! Enrollment is open for the January batch.", "info", 4000);
}, 1200);