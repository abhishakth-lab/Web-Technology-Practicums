// script.js (Practicum 12: API-integrated Corporate Training Portal)
"use strict";

/* ---------- Helpers ---------- */
const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* =====================================================================
   1. TOAST NOTIFICATIONS
   ===================================================================== */
const toastBox = document.getElementById("toast-container");
const TOAST_ICONS = { success: "\u2713", info: "i", warning: "!" };

function showToast(message, type = "info", duration = 3500) {
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

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(close);
  toastBox.appendChild(toast);

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

function bump(element) {
  element.classList.remove("bump");
  void element.offsetWidth;
  element.classList.add("bump");
  setTimeout(() => element.classList.remove("bump"), 500);
}

/* =====================================================================
   2. SCROLL REVEAL + SCROLL PROGRESS BAR
   ===================================================================== */
const revealItems = $$(".reveal");
const progressBar = document.getElementById("scroll-progress");

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
   3. MOBILE MENU
   ===================================================================== */
const menuToggle = document.getElementById("menu-toggle");
$$(".nav-links a").forEach(link => {
  link.addEventListener("click", () => { menuToggle.checked = false; });
});

/* =====================================================================
   4. SHARED FORM HELPERS
   ===================================================================== */
const regCourse = document.getElementById("course");

function showFormMessage(box, text, type, field) {
  clearTimeout(box.hideTimer);
  box.textContent = text;
  box.className = "form-msg " + type;
  box.setAttribute("data-type", type);

  if (type === "error" && field) {
    field.classList.add("shake");
    setTimeout(() => field.classList.remove("shake"), 500);
    field.focus();
  }
  box.hideTimer = setTimeout(() => { box.textContent = ""; box.className = "form-msg"; }, 4500);
}

function addCourseOption(select, value, label) {
  const option = document.createElement("option");
  option.setAttribute("value", value);
  option.textContent = label;
  select.appendChild(option);
}

function removeCourseOption(select, value) {
  const option = $$("option", select).find(item => item.value === value);
  if (option) option.remove();
}

/* =====================================================================
   5. COURSE CARDS
   ===================================================================== */
function initCourseCard(card) {
  const detailsButton = $(".btn-details", card);
  const enrollButton = $(".btn-enroll", card);
  const removeButton = $(".btn-remove-course", card);

  detailsButton.addEventListener("click", () => {
    const panel = document.getElementById(detailsButton.getAttribute("aria-controls"));
    const isOpen = panel.classList.toggle("open");

    detailsButton.classList.toggle("active", isOpen);
    detailsButton.setAttribute("aria-expanded", String(isOpen));
    $(".btn-label", detailsButton).textContent = isOpen ? "Hide Details" : "View Details";
  });

  enrollButton.addEventListener("click", () => {
    const seats = $(".seats", card);
    const label = $(".btn-label", enrollButton);
    const enrolled = enrollButton.classList.toggle("enrolled");

    const current = parseInt(seats.textContent, 10);
    seats.textContent = enrolled ? current - 1 : current + 1;
    bump(seats);

    label.textContent = enrolled ? "Enrolled \u2713" : "Enroll";

    enrollButton.classList.add("clicked");
    setTimeout(() => enrollButton.classList.remove("clicked"), 450);

    if (enrolled) {
      regCourse.value = enrollButton.dataset.course;
      showToast("You are enrolled in " + enrollButton.dataset.title + ". Complete the form below to confirm.", "success");
    } else {
      if (regCourse.value === enrollButton.dataset.course) regCourse.value = "";
      showToast("Enrollment cancelled for " + enrollButton.dataset.title + ".", "info");
    }

    // Practicum 11: keep the form's course validation in step with the Enroll button
    if (regCourse.classList.contains("touched")) regCourse.dispatchEvent(new Event("change"));
  });

  if (removeButton) {
    removeButton.addEventListener("click", () => removeCourseCard(card));
  }
}

const courseGrid = $(".course-grid");
$$("article", courseGrid).forEach(initCourseCard);

/* =====================================================================
   6. TRAINING PLANNER: course drop-down
   ===================================================================== */
const empCourse = document.getElementById("emp-course");

function loadCourseOptions() {
  empCourse.innerHTML = "";
  addCourseOption(empCourse, "", "-- Choose a course --");
  $$("article h3", courseGrid).forEach(title => {
    addCourseOption(empCourse, title.textContent, title.textContent);
  });
}
loadCourseOptions();

/* =====================================================================
   7. TRAINING PLANNER: add, edit, complete and remove assignments
   ===================================================================== */
const planList = document.getElementById("plan-list");
const planEmpty = document.getElementById("plan-empty");
const planSummary = document.getElementById("plan-summary");
const planSearch = document.getElementById("plan-search");
const nameInput = document.getElementById("emp-name");
const plannerMsg = document.getElementById("planner-msg");
const statCourses = document.getElementById("stat-courses");
const statTotal = document.getElementById("stat-total");
const statDone = document.getElementById("stat-done");
let lastSummary = "";

function setStat(element, value) {
  if (element.textContent !== String(value)) {
    element.textContent = value;
    bump(element);
  }
}

function setButton(button, label, action) {
  button.textContent = label;
  button.setAttribute("data-action", action);
}

function makeButton(label, action, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm " + extraClass;
  button.setAttribute("data-action", action);
  button.textContent = label;
  return button;
}

function createPlanItem(name, course, done = false) {
  const item = document.createElement("li");
  item.className = "plan-item added";
  item.setAttribute("data-course", course);
  item.setAttribute("data-done", String(done));
  if (done) item.classList.add("done");

  const info = document.createElement("div");
  info.className = "plan-info";

  const nameEl = document.createElement("span");
  nameEl.className = "plan-name";
  nameEl.textContent = name;

  const courseEl = document.createElement("span");
  courseEl.className = "plan-course";
  courseEl.textContent = course;

  const statusEl = document.createElement("span");
  statusEl.className = "plan-status";
  statusEl.textContent = done ? "Completed" : "Pending";

  info.appendChild(nameEl);
  info.appendChild(courseEl);
  info.appendChild(statusEl);

  const actions = document.createElement("div");
  actions.className = "plan-actions";
  actions.appendChild(makeButton(done ? "Undo" : "Mark Done", "toggle", "act-done"));
  actions.appendChild(makeButton("Edit", "edit", "act-edit"));
  actions.appendChild(makeButton("Remove", "remove", "act-remove btn-danger"));

  item.appendChild(info);
  item.appendChild(actions);

  setTimeout(() => item.classList.remove("added"), 600);
  return item;
}

function addAssignment() {
  const name = nameInput.value.trim();
  const course = empCourse.value;

  if (name.length < 3) {
    showFormMessage(plannerMsg, "Enter the employee name (at least 3 characters).", "error", nameInput);
    return;
  }
  if (!course) {
    showFormMessage(plannerMsg, "Please choose a course.", "error", empCourse);
    return;
  }
  const duplicate = $$(".plan-item:not(.removing)", planList).some(item =>
    $(".plan-name", item) &&
    $(".plan-name", item).textContent.toLowerCase() === name.toLowerCase() &&
    item.getAttribute("data-course") === course
  );
  if (duplicate) {
    showFormMessage(plannerMsg, name + " is already assigned to " + course + ".", "error", nameInput);
    return;
  }

  planSearch.value = "";
  planList.appendChild(createPlanItem(name, course));
  nameInput.value = "";
  nameInput.focus();

  showFormMessage(plannerMsg, name + " was added to " + course + ".", "ok");
  showToast(name + " assigned to " + course + ".", "success");
  updatePlan();
}

function toggleDone(item) {
  const done = item.classList.toggle("done");
  item.setAttribute("data-done", String(done));
  $(".plan-status", item).textContent = done ? "Completed" : "Pending";
  $(".act-done", item).textContent = done ? "Undo" : "Mark Done";
  updatePlan();
}

function startEdit(item) {
  if (item.classList.contains("editing")) return;

  const nameEl = $(".plan-name", item);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = nameEl.textContent;
  input.setAttribute("maxlength", "40");
  input.setAttribute("aria-label", "Edit employee name");
  input.setAttribute("data-original", nameEl.textContent);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") saveEdit(item);
    if (event.key === "Escape") cancelEdit(item);
  });

  nameEl.replaceWith(input);
  item.classList.add("editing");
  setButton($(".act-edit", item), "Save", "save");
  setButton($(".act-remove", item), "Cancel", "cancel");
  $(".act-done", item).disabled = true;
  input.focus();
  input.select();
}

function finishEdit(item, newName) {
  const input = $(".edit-input", item);
  const nameEl = document.createElement("span");
  nameEl.className = "plan-name";
  nameEl.textContent = newName;
  input.replaceWith(nameEl);

  item.classList.remove("editing");
  setButton($(".act-edit", item), "Edit", "edit");
  setButton($(".act-remove", item), "Remove", "remove");
  $(".act-done", item).disabled = false;
}

function saveEdit(item) {
  const input = $(".edit-input", item);
  const newName = input.value.trim();

  if (newName.length < 3) {
    input.classList.add("shake");
    setTimeout(() => input.classList.remove("shake"), 500);
    showToast("A name needs at least 3 characters.", "warning");
    return;
  }

  finishEdit(item, newName);
  item.classList.add("flash");
  setTimeout(() => item.classList.remove("flash"), 1000);
  showToast("Name updated to " + newName + ".", "success");
  updatePlan();
}

function cancelEdit(item) {
  const input = $(".edit-input", item);
  finishEdit(item, input.getAttribute("data-original") || input.defaultValue);
  updatePlan();
}

function removeItem(item, silent = false) {
  if (item.classList.contains("removing")) return;
  const name = $(".plan-name", item) ? $(".plan-name", item).textContent : "Entry";

  item.classList.add("removing");
  updatePlan();
  setTimeout(() => {
    item.remove();
    updatePlan();
  }, 350);

  if (!silent) showToast(name + " was removed from the plan.", "info");
}

planList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = button.closest(".plan-item");

  switch (button.getAttribute("data-action")) {
    case "toggle": toggleDone(item); break;
    case "edit":   startEdit(item); break;
    case "save":   saveEdit(item); break;
    case "cancel": cancelEdit(item); break;
    case "remove": removeItem(item); break;
  }
});

function updatePlan() {
  const items = $$(".plan-item:not(.removing)", planList);
  const doneCount = items.filter(item => item.classList.contains("done")).length;

  setStat(statCourses, $$("article", courseGrid).length);
  setStat(statTotal, items.length);
  setStat(statDone, doneCount);

  const counts = {};
  items.forEach(item => {
    const course = item.getAttribute("data-course");
    counts[course] = (counts[course] || 0) + 1;
  });
  const signature = JSON.stringify(counts);
  if (signature !== lastSummary) {
    lastSummary = signature;
    planSummary.innerHTML = "";
    Object.keys(counts).forEach(course => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = course + ": " + counts[course];
      planSummary.appendChild(chip);
    });
  }

  const term = planSearch.value.trim().toLowerCase();
  let visible = 0;
  items.forEach(item => {
    const match = item.textContent.toLowerCase().includes(term) || $(".edit-input", item) !== null;
    if (match) {
      item.removeAttribute("hidden");
      visible += 1;
    } else {
      item.setAttribute("hidden", "");
    }
  });

  if (items.length === 0) {
    planEmpty.textContent = "No assignments yet. Add one above.";
    planEmpty.removeAttribute("hidden");
  } else if (visible === 0) {
    planEmpty.textContent = "No assignments match your search.";
    planEmpty.removeAttribute("hidden");
  } else {
    planEmpty.setAttribute("hidden", "");
  }
}

document.getElementById("add-assignment").addEventListener("click", addAssignment);
nameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addAssignment();
});
planSearch.addEventListener("input", updatePlan);

document.getElementById("clear-done").addEventListener("click", () => {
  const finished = $$(".plan-item.done:not(.removing)", planList);
  if (finished.length === 0) {
    showToast("There are no completed items to remove.", "warning");
    return;
  }
  finished.forEach((item, index) => setTimeout(() => removeItem(item, true), index * 120));
  showToast(finished.length + " completed item(s) removed.", "info");
});

document.getElementById("clear-all").addEventListener("click", () => {
  const all = $$(".plan-item:not(.removing)", planList);
  if (all.length === 0) {
    showToast("The plan is already empty.", "warning");
    return;
  }
  all.forEach((item, index) => setTimeout(() => removeItem(item, true), index * 120));
  showToast("The training plan was cleared.", "info");
});

planList.appendChild(createPlanItem("Anita Raj", "Effective Communication"));
planList.appendChild(createPlanItem("Karthik S", "Cybersecurity Awareness", true));
updatePlan();

/* =====================================================================
   8. COURSE BUILDER
   ===================================================================== */
const newTitle = document.getElementById("new-title");
const newDuration = document.getElementById("new-duration");
const newOutcomes = document.getElementById("new-outcomes");
const courseMsg = document.getElementById("course-msg");
let customCount = 0;

function createCourseCard(title, duration, outcomes) {
  customCount += 1;
  const slug = "custom-" + customCount;
  const detailsId = "details-" + slug;

  const card = document.createElement("article");
  card.setAttribute("data-slug", slug);

  card.innerHTML =
    '<span class="badge badge-custom">Custom</span>' +
    "<h3></h3>" +
    '<p><strong>Duration:</strong> <span class="c-duration"></span></p>' +
    '<p><strong>Seats left:</strong> <span class="seats">15</span></p>' +
    "<h4>Learning Outcomes</h4>" +
    '<ul class="c-outcomes"></ul>' +
    '<div class="card-actions">' +
      '<button type="button" class="btn btn-details" aria-expanded="false">' +
        '<span class="btn-label">View Details</span>' +
        '<span class="arrow" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<button type="button" class="btn btn-solid btn-enroll"><span class="btn-label">Enroll</span></button>' +
      '<button type="button" class="btn btn-danger btn-remove-course">Remove</button>' +
    "</div>" +
    '<div class="details"><div class="details-inner">' +
      "<p><strong>Trainer:</strong> To be announced</p>" +
      "<p><strong>Mode:</strong> Online / Classroom</p>" +
      "<p><strong>Added by:</strong> You, just now</p>" +
    "</div></div>";

  $("h3", card).textContent = title;
  $(".c-duration", card).textContent = duration;

  const outcomeList = $(".c-outcomes", card);
  outcomes.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    outcomeList.appendChild(li);
  });

  $(".details", card).setAttribute("id", detailsId);
  $(".btn-details", card).setAttribute("aria-controls", detailsId);
  const enrollButton = $(".btn-enroll", card);
  enrollButton.setAttribute("data-course", slug);
  enrollButton.setAttribute("data-title", title);

  return card;
}

function addCourse() {
  const title = newTitle.value.trim();
  const duration = newDuration.value.trim();
  const outcomes = newOutcomes.value.split(",").map(text => text.trim()).filter(Boolean).slice(0, 5);

  if (title.length < 3) {
    showFormMessage(courseMsg, "Enter a course title (at least 3 characters).", "error", newTitle);
    return;
  }
  if (!duration) {
    showFormMessage(courseMsg, "Enter the course duration.", "error", newDuration);
    return;
  }
  if (outcomes.length === 0) {
    showFormMessage(courseMsg, "Enter at least one learning outcome.", "error", newOutcomes);
    return;
  }
  const exists = $$("article h3", courseGrid).some(h3 => h3.textContent.toLowerCase() === title.toLowerCase());
  if (exists) {
    showFormMessage(courseMsg, "A course with this title already exists.", "error", newTitle);
    return;
  }

  const card = createCourseCard(title, duration, outcomes);
  courseGrid.appendChild(card);
  initCourseCard(card);

  addCourseOption(regCourse, card.getAttribute("data-slug"), title);
  addCourseOption(empCourse, title, title);

  newTitle.value = "";
  newDuration.value = "";
  newOutcomes.value = "";
  showFormMessage(courseMsg, '"' + title + '" was added to Available Courses.', "ok");
  showToast('New course card added: "' + title + '".', "success");
  updatePlan();

  setTimeout(() => {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("flash");
    setTimeout(() => card.classList.remove("flash"), 1000);
  }, 250);
}

function removeCourseCard(card) {
  const title = $("h3", card).textContent;
  const slug = card.getAttribute("data-slug");

  card.classList.add("removing");
  setTimeout(() => {
    card.remove();
    removeCourseOption(regCourse, slug);
    removeCourseOption(empCourse, title);
    updatePlan();
  }, 350);
  showToast('Course "' + title + '" was removed.', "info");
}

document.getElementById("add-course").addEventListener("click", addCourse);
[newTitle, newDuration, newOutcomes].forEach(field => {
  field.addEventListener("keydown", event => {
    if (event.key === "Enter") addCourse();
  });
});

/* =====================================================================
   9. FAQ ACCORDION
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

document.getElementById("faq-expand").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, true), index * 150));
});
document.getElementById("faq-collapse").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, false), index * 150));
});

/* =====================================================================
   10. GALLERY LIGHTBOX
   ===================================================================== */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
let lastFocused = null;

function openLightbox(image) {
  lastFocused = image;
  lightboxImg.src = image.src.replace("/400/300", "/800/600");
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
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
});

/* =====================================================================
   11. ANIMATION LAB
   ===================================================================== */
const labBox = document.getElementById("lab-box");
const labName = document.getElementById("lab-name");
const labClasses = ["anim-fade", "anim-slide", "anim-bounce", "anim-shake", "anim-spin", "anim-pulse"];
let labTimer = null;

$$("[data-anim]").forEach(button => {
  button.addEventListener("click", () => {
    clearTimeout(labTimer);
    labBox.classList.remove(...labClasses);
    void labBox.offsetWidth;
    labBox.classList.add(button.dataset.anim);
    labName.textContent = button.textContent;

    labTimer = setTimeout(() => labBox.classList.remove(button.dataset.anim), 1100);
  });
});

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
   12. ENROLLMENT SEQUENCE
   ===================================================================== */
const steps = $$(".step");
const stepBar = document.getElementById("progress-bar");
const runButton = document.getElementById("run-steps");
const resetButton = document.getElementById("reset-steps");
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

  sequenceTimers.push(setTimeout(() => {
    steps[steps.length - 1].classList.replace("active", "done");
    showToast("Enrollment sequence complete!", "success");
    runButton.disabled = false;
  }, steps.length * 1000));
}

runButton.addEventListener("click", runSteps);
resetButton.addEventListener("click", resetSteps);

/* =====================================================================
   13. REGISTRATION FORM VALIDATION (Practicum 11)
   Methods: addEventListener(), preventDefault(), checkValidity(),
            reportValidity(), setCustomValidity()
   ===================================================================== */
const form = document.getElementById("reg-form");
const submitButton = document.getElementById("submit-btn");
const submitText = $(".btn-text", submitButton);
const formAlert = document.getElementById("form-alert");
const formSuccess = document.getElementById("form-success");
const successText = document.getElementById("success-text");
const commentBox = document.getElementById("comments");
const commentCount = document.getElementById("comment-count");
const formFields = $$("input, select, textarea", form);

const todayISO = new Date().toISOString().split("T")[0];
document.getElementById("dob").setAttribute("max", todayISO);
document.getElementById("startdate").setAttribute("min", todayISO);

/* Custom rules (setCustomValidity) */
function applyCustomRules(field) {
  field.setCustomValidity("");
  const value = field.value;

  switch (field.id) {
    case "email":
      if (value && /@(gmail|yahoo|hotmail|outlook|rediffmail)\./i.test(value)) {
        field.setCustomValidity("Please use your company email, not a personal one.");
      }
      break;

    case "confirm":
      if (value && value !== document.getElementById("password").value) {
        field.setCustomValidity("The two passwords do not match.");
      }
      break;

    case "dob": {
      if (!value) break;
      const born = new Date(value);
      const now = new Date();
      let years = now.getFullYear() - born.getFullYear();
      const birthdayPassed = now.getMonth() > born.getMonth() ||
        (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
      if (!birthdayPassed) years -= 1;

      const ageValue = document.getElementById("age").value;
      if (born > now)                      field.setCustomValidity("Date of birth cannot be in the future.");
      else if (years < 18 || years > 65)   field.setCustomValidity("You must be between 18 and 65 years old.");
      else if (ageValue && Number(ageValue) !== years) {
        field.setCustomValidity("Date of birth gives age " + years + ", but you entered " + ageValue + ".");
      }
      break;
    }

    case "startdate":
      if (value) {
        const day = new Date(value + "T00:00:00").getDay();
        if (day === 0 || day === 6) field.setCustomValidity("Training starts on weekdays only (Monday to Friday).");
      }
      break;

    case "idproof":
      if (field.files.length > 0 && field.files[0].size > 2 * 1024 * 1024) {
        field.setCustomValidity("The file is larger than 2 MB. Choose a smaller file.");
      }
      break;
  }

  if (field.name === "interest") {
    const boxes = $$('input[name="interest"]', form);
    const anyTicked = boxes.some(box => box.checked);
    boxes.forEach(box => box.setCustomValidity(anyTicked ? "" : "Choose at least one area of interest."));
  }
}

/* Friendly error messages */
function getMessage(field) {
  const v = field.validity;

  if (v.customError)    return field.validationMessage;
  if (v.valueMissing) {
    if (field.type === "radio")    return "Please choose a training mode.";
    if (field.type === "checkbox") return "You must accept the terms and conditions.";
    if (field.type === "file")     return "Please upload your ID proof.";
    if (field.tagName === "SELECT") return "Please select a course.";
    return "This field is required.";
  }
  if (v.typeMismatch)   return "Enter a valid " + (field.type === "email" ? "email address (name@company.com)." : "value.");
  if (v.tooShort)       return "Enter at least " + field.minLength + " characters (you typed " + field.value.length + ").";
  if (v.tooLong)        return "Enter no more than " + field.maxLength + " characters.";
  if (v.patternMismatch) return field.title || "The format of this field is not correct.";
  if (v.rangeUnderflow) return "The smallest allowed value is " + field.min + ".";
  if (v.rangeOverflow)  return "The largest allowed value is " + field.max + ".";
  if (v.stepMismatch)   return "Enter a whole number.";
  if (v.badInput)       return "Enter a valid value.";
  return "Invalid value.";
}

/* Validate one field */
function validateField(field) {
  applyCustomRules(field);
  const isValid = field.checkValidity();

  const isGroup = field.type === "radio" || (field.type === "checkbox" && field.name === "interest");
  const group = isGroup ? $$('input[name="' + field.name + '"]', form) : [field];
  const messageBox = document.getElementById((isGroup ? field.name : field.id) + "-error");

  group.forEach(item => {
    item.classList.add("touched");
    item.setAttribute("aria-invalid", String(!isValid));
  });
  if (messageBox) messageBox.textContent = isValid ? "" : getMessage(field);
  return isValid;
}

/* Live validation */
formFields.forEach(field => {
  const liveEvent = (field.type === "checkbox" || field.type === "radio" ||
                     field.type === "file" || field.tagName === "SELECT") ? "change" : "input";

  field.addEventListener("blur", () => {
    if (field.value !== "" || field.classList.contains("touched")) validateField(field);
  });
  field.addEventListener(liveEvent, () => {
    if (field.classList.contains("touched") || liveEvent === "change") validateField(field);
  });
});

document.getElementById("password").addEventListener("input", () => {
  const confirm = document.getElementById("confirm");
  if (confirm.classList.contains("touched")) validateField(confirm);
});
document.getElementById("age").addEventListener("input", () => {
  const dob = document.getElementById("dob");
  if (dob.classList.contains("touched")) validateField(dob);
});
document.getElementById("dob").addEventListener("change", () => {
  const age = document.getElementById("age");
  if (age.classList.contains("touched")) validateField(age);
});

commentBox.addEventListener("input", () => { commentCount.textContent = commentBox.value.length; });

function resetFormUI() {
  formFields.forEach(field => {
    field.classList.remove("touched", "shake");
    field.removeAttribute("aria-invalid");
    field.setCustomValidity("");
  });
  $$(".error-msg", form).forEach(box => { box.textContent = ""; });
  formAlert.setAttribute("hidden", "");
  commentCount.textContent = "0";
}

/* Submit */
form.addEventListener("submit", event => {
  event.preventDefault();

  const badFields = [];
  formFields.forEach(field => {
    if (!validateField(field)) badFields.push(field);
  });

  if (badFields.length > 0) {
    formAlert.textContent = "Please fix " + badFields.length + " problem" +
      (badFields.length > 1 ? "s" : "") + " in the form before submitting.";
    formAlert.removeAttribute("hidden");
    badFields.forEach(field => {
      field.classList.add("shake");
      setTimeout(() => field.classList.remove("shake"), 500);
    });
    badFields[0].scrollIntoView({ behavior: "smooth", block: "center" });
    badFields[0].reportValidity();
    badFields[0].focus();
    showToast("Please check the highlighted fields.", "warning");
    return;
  }

  formAlert.setAttribute("hidden", "");
  submitButton.classList.add("loading");
  submitButton.disabled = true;
  submitText.textContent = "Sending...";

  const studentName = document.getElementById("name").value.trim();
  const courseName = regCourse.options[regCourse.selectedIndex].textContent;
  const startDate = document.getElementById("startdate").value;

  setTimeout(() => {
    submitButton.classList.remove("loading");
    submitButton.disabled = false;
    submitText.textContent = "Register";

    successText.textContent = " Thank you, " + studentName + ". You are registered for " +
      courseName + " starting " + startDate + ". A confirmation email will be sent shortly.";
    formSuccess.removeAttribute("hidden");
    formSuccess.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Registration submitted successfully.", "success", 4500);

    form.reset();
    resetFormUI();
  }, 1500);
});

/* Reset and "Register Another Employee" */
form.addEventListener("reset", () => {
  setTimeout(resetFormUI, 0);
  formSuccess.setAttribute("hidden", "");
  showToast("The form has been cleared.", "info", 2500);
});

document.getElementById("new-reg").addEventListener("click", () => {
  formSuccess.setAttribute("hidden", "");
  document.getElementById("name").focus();
});

/* =====================================================================
   14. API INTEGRATION (Practicum 12)
   Methods: fetch(), async/await, response.ok, response.json(),
            try / catch / finally, createElement(), appendChild(),
            textContent
   Endpoint: JSONPlaceholder (free public REST API returning JSON)
   ===================================================================== */
const API_BASE = "https://jsonplaceholder.typicode.com";
const API_TIMEOUT = 8000;

/* Turn text such as "sunt aut facere" into "Sunt aut facere" */
function capitalise(text) {
  const clean = String(text).trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/* Each data set: where to fetch, how to rename the JSON fields for the
   corporate-training industry, which columns to show, and which summary
   cards to build. */
const DATASETS = {
  trainers: {
    label: "Trainer Directory",
    path: "/users",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Trainer" },
      { key: "email", label: "Email" },
      { key: "partner", label: "Training Partner" },
      { key: "city", label: "City" },
      { key: "phone", label: "Phone" }
    ],
    map: user => ({
      id: user.id,
      name: user.name,
      email: String(user.email).toLowerCase(),
      partner: user.company && user.company.name ? user.company.name : "Not listed",
      city: user.address && user.address.city ? user.address.city : "Not listed",
      phone: String(user.phone).split(" x")[0]
    }),
    stats: rows => [
      ["Trainers", rows.length],
      ["Cities", new Set(rows.map(row => row.city)).size],
      ["Partner companies", new Set(rows.map(row => row.partner)).size]
    ]
  },

  modules: {
    label: "Course Modules",
    path: "/posts?_limit=12",
    columns: [
      { key: "code", label: "Module" },
      { key: "topic", label: "Topic" },
      { key: "outline", label: "Outline" },
      { key: "trainer", label: "Trainer ID" }
    ],
    map: post => ({
      code: "MOD-" + String(post.id).padStart(3, "0"),
      topic: capitalise(post.title),
      outline: capitalise(String(post.body).replace(/\s+/g, " ")).slice(0, 90) + "...",
      trainer: "Trainer " + post.userId
    }),
    stats: rows => [
      ["Modules", rows.length],
      ["Trainers involved", new Set(rows.map(row => row.trainer)).size]
    ]
  },

  progress: {
    label: "Learner Progress",
    path: "/todos?_limit=20",
    columns: [
      { key: "id", label: "Task ID" },
      { key: "task", label: "Training Task" },
      { key: "learner", label: "Employee" },
      { key: "status", label: "Status" }
    ],
    map: todo => ({
      id: todo.id,
      task: capitalise(todo.title),
      learner: "Employee " + todo.userId,
      status: todo.completed ? "Completed" : "Pending"
    }),
    stats: rows => {
      const done = rows.filter(row => row.status === "Completed").length;
      const percent = rows.length ? Math.round((done / rows.length) * 100) : 0;
      return [
        ["Total tasks", rows.length],
        ["Completed", done],
        ["Pending", rows.length - done],
        ["Completion rate", percent + "%"]
      ];
    }
  }
};

/* Page elements */
const apiTabs = $$(".api-tab");
const apiSearch = document.getElementById("api-search");
const apiUrl = document.getElementById("api-url");
const apiMeta = document.getElementById("api-meta");
const apiLoader = document.getElementById("api-loader");
const apiError = document.getElementById("api-error");
const apiErrorText = document.getElementById("api-error-text");
const apiSummary = document.getElementById("api-summary");
const apiCaption = document.getElementById("api-caption");
const apiHead = document.getElementById("api-thead");
const apiBody = document.getElementById("api-tbody");
const apiButtons = [
  document.getElementById("api-refresh"),
  document.getElementById("api-test-404"),
  document.getElementById("api-test-network"),
  document.getElementById("api-retry")
];

/* Application state */
let currentKey = "trainers";
let currentUrlOverride = null;
let apiRows = [];
let sortKey = null;
let sortAsc = true;
let requestCounter = 0;

function setApiMeta(text, state) {
  apiMeta.textContent = text;
  apiMeta.className = "api-meta" + (state ? " " + state : "");
}

function setLoading(isLoading) {
  if (isLoading) apiLoader.removeAttribute("hidden");
  else apiLoader.setAttribute("hidden", "");

  apiButtons.forEach(button => { button.disabled = isLoading; });
  apiTabs.forEach(tab => { tab.disabled = isLoading; });
}

function showApiError(message) {
  apiErrorText.textContent = message;
  apiError.removeAttribute("hidden");
}

function hideApiError() {
  apiError.setAttribute("hidden", "");
  apiErrorText.textContent = "";
}

/* Build a friendly message for each kind of failure */
function describeError(error) {
  if (error.name === "AbortError") {
    return "The request took longer than " + (API_TIMEOUT / 1000) + " seconds and was cancelled. Please try again.";
  }
  if (error instanceof TypeError) {
    return "Network problem: the server could not be reached. Check your internet connection and try again.";
  }
  return error.message || "Something went wrong while loading the data.";
}

/* Summary cards (div elements built with createElement) */
function renderSummary(rows) {
  apiSummary.innerHTML = "";
  DATASETS[currentKey].stats(rows).forEach(pair => {
    const card = document.createElement("div");
    card.className = "api-stat";

    const number = document.createElement("span");
    number.className = "api-stat-num";
    number.textContent = pair[1];

    const label = document.createElement("span");
    label.className = "api-stat-label";
    label.textContent = pair[0];

    card.appendChild(number);
    card.appendChild(label);
    apiSummary.appendChild(card);
  });
}

/* Table (thead, tbody, tr, th, td built with createElement) */
function renderHead() {
  apiHead.innerHTML = "";
  const headRow = document.createElement("tr");

  DATASETS[currentKey].columns.forEach(column => {
    const th = document.createElement("th");
    th.textContent = column.label;
    th.setAttribute("scope", "col");
    th.setAttribute("data-key", column.key);
    th.setAttribute("title", "Sort by " + column.label);
    if (column.key === sortKey) th.classList.add(sortAsc ? "sorted-asc" : "sorted-desc");
    headRow.appendChild(th);
  });

  apiHead.appendChild(headRow);
}

function renderRows() {
  const columns = DATASETS[currentKey].columns;
  const term = apiSearch.value.trim().toLowerCase();

  let rows = apiRows.filter(row =>
    columns.some(column => String(row[column.key]).toLowerCase().includes(term))
  );

  if (sortKey) {
    rows = rows.slice().sort((a, b) => {
      const first = a[sortKey];
      const second = b[sortKey];
      const result = (typeof first === "number" && typeof second === "number")
        ? first - second
        : String(first).localeCompare(String(second));
      return sortAsc ? result : -result;
    });
  }

  apiBody.innerHTML = "";

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = columns.length;
    emptyCell.className = "api-empty-cell";
    emptyCell.textContent = apiRows.length === 0
      ? "No data to display."
      : "No records match your filter.";
    emptyRow.appendChild(emptyCell);
    apiBody.appendChild(emptyRow);
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");

    columns.forEach(column => {
      const td = document.createElement("td");
      const value = row[column.key];

      if (column.key === "status") {
        const pill = document.createElement("span");
        pill.className = "status-pill " + (value === "Completed" ? "status-done" : "status-pending");
        pill.textContent = value;
        td.appendChild(pill);
      } else {
        td.textContent = value;
      }
      tr.appendChild(td);
    });

    apiBody.appendChild(tr);
  });
}

function clearApiTable() {
  apiSummary.innerHTML = "";
  apiHead.innerHTML = "";
  apiBody.innerHTML = "";
}

/* The main request: async function using fetch + await */
async function loadData(key, urlOverride = null) {
  currentKey = key;
  currentUrlOverride = urlOverride;
  const dataset = DATASETS[key];
  const url = urlOverride || API_BASE + dataset.path;
  const thisRequest = ++requestCounter;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT);

  apiUrl.textContent = url;
  setApiMeta("Requesting data...", "");
  hideApiError();
  clearApiTable();
  setLoading(true);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("The server replied with status " + response.status +
        (response.statusText ? " (" + response.statusText + ")" : "") + ". The data could not be loaded.");
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The server returned data in an unexpected format.");
    }

    if (thisRequest !== requestCounter) return;

    apiRows = data.map(dataset.map);
    sortKey = null;
    sortAsc = true;
    apiSearch.value = "";

    apiCaption.textContent = dataset.label + ": " + apiRows.length +
      " records (click a column heading to sort)";
    renderSummary(apiRows);
    renderHead();
    renderRows();

    setApiMeta("Loaded " + apiRows.length + " records at " + new Date().toLocaleTimeString() + ".", "ok");
    if (apiRows.length === 0) showToast("The server returned no records.", "warning");
  } catch (error) {
    if (thisRequest !== requestCounter) return;

    apiRows = [];
    const message = describeError(error);
    showApiError(message);
    setApiMeta("Request failed.", "fail");
    showToast("Data could not be loaded.", "warning");
    console.error("API error:", error);
  } finally {
    clearTimeout(timer);
    if (thisRequest === requestCounter) setLoading(false);
  }
}

/* Events */
apiTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    apiTabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    loadData(tab.dataset.endpoint);
  });
});

document.getElementById("api-refresh").addEventListener("click", () => loadData(currentKey));
document.getElementById("api-retry").addEventListener("click", () => loadData(currentKey, currentUrlOverride));
document.getElementById("api-test-404").addEventListener("click", () => {
  loadData(currentKey, API_BASE + "/this-endpoint-does-not-exist");
});
document.getElementById("api-test-network").addEventListener("click", () => {
  loadData(currentKey, "https://no-such-server.invalid/data");
});

apiSearch.addEventListener("input", renderRows);

apiHead.addEventListener("click", event => {
  const th = event.target.closest("th");
  if (!th) return;

  const key = th.getAttribute("data-key");
  sortAsc = sortKey === key ? !sortAsc : true;
  sortKey = key;
  renderHead();
  renderRows();
});

/* First request when the page opens */
loadData("trainers");

/* =====================================================================
   15. WELCOME NOTIFICATION
   ===================================================================== */
setTimeout(() => {
  showToast("Welcome to SkillBridge! Enrollment is open for the January batch.", "info", 4000);
}, 1200);