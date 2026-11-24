// script.js (Practicum 14: Interactive Course Finder and Comparison Tool)
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
  refreshTaskCourses();

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
    refreshTaskCourses();
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
   15. TASK MANAGER (Practicum 13)
   CRUD: Create (push), Read (createElement + appendChild),
         Update (find), Delete (remove + filter)
   Storage: localStorage.setItem(), localStorage.getItem(),
            JSON.stringify(), JSON.parse()
   ===================================================================== */
const TASK_KEY = "skillbridge.training.tasks";
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

/* Page elements */
const taskForm = document.getElementById("task-form");
const taskFormTitle = document.getElementById("task-form-title");
const taskTitle = document.getElementById("task-title");
const taskAssignee = document.getElementById("task-assignee");
const taskCourse = document.getElementById("task-course");
const taskPriority = document.getElementById("task-priority");
const taskDue = document.getElementById("task-due");
const taskStatus = document.getElementById("task-status");
const taskDesc = document.getElementById("task-desc");
const taskSubmit = document.getElementById("task-submit");
const taskCancel = document.getElementById("task-cancel");
const taskMsg = document.getElementById("task-msg");

const taskSearch = document.getElementById("task-search");
const taskFilterStatus = document.getElementById("task-filter-status");
const taskFilterPriority = document.getElementById("task-filter-priority");
const taskSort = document.getElementById("task-sort");
const taskBody = document.getElementById("task-tbody");
const taskCaption = document.getElementById("task-caption");
const taskEmpty = document.getElementById("task-empty");
const taskDeadlines = document.getElementById("task-deadlines");

const taskStatTotal = document.getElementById("task-stat-total");
const taskStatTodo = document.getElementById("task-stat-todo");
const taskStatProgress = document.getElementById("task-stat-progress");
const taskStatDone = document.getElementById("task-stat-done");

/* Application state */
let tasks = [];
let editingId = null;
let idCounter = 0;

/* ----- Date helpers (local time, so the day never shifts) ----- */
function localISO(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function daysFromToday(isoDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoDate + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

function formatDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function dueLabel(isoDate) {
  const days = daysFromToday(isoDate);
  if (days < 0)  return "Overdue by " + Math.abs(days) + (Math.abs(days) === 1 ? " day" : " days");
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return "Due in " + days + " days";
}

function newTaskId() {
  idCounter += 1;
  return "task-" + Date.now() + "-" + idCounter;
}

/* ----- Local Storage: load and save ----- */
function sampleTasks() {
  const base = new Date();
  function inDays(count) {
    const date = new Date(base);
    date.setDate(date.getDate() + count);
    return localISO(date);
  }

  return [
    { id: newTaskId(), title: "Prepare Leadership slides", assignee: "Rahul Khanna", course: "Leadership Essentials",
      priority: "High", due: inDays(3), status: "In Progress",
      desc: "Create the day-one slide deck and group exercises.", created: Date.now() - 3000 },
    { id: newTaskId(), title: "Book classroom for January batch", assignee: "Admin Office", course: "Effective Communication",
      priority: "Medium", due: inDays(10), status: "To Do",
      desc: "Reserve Room 4 and confirm the projector.", created: Date.now() - 2000 },
    { id: newTaskId(), title: "Update phishing quiz questions", assignee: "Meera Iyer", course: "Cybersecurity Awareness",
      priority: "High", due: inDays(-2), status: "To Do",
      desc: "Add five new questions on QR-code phishing.", created: Date.now() - 1000 },
    { id: newTaskId(), title: "Send certificates to last batch", assignee: "Priya Nair", course: "General Training",
      priority: "Low", due: inDays(-5), status: "Completed",
      desc: "", created: Date.now() }
  ];
}

function loadTasks() {
  try {
    const saved = localStorage.getItem(TASK_KEY);
    if (saved === null) return sampleTasks();
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read saved tasks:", error);
    return sampleTasks();
  }
}

function saveTasks() {
  try {
    localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Could not save tasks:", error);
    showToast("Tasks could not be saved in this browser.", "warning");
  }
}

/* ----- Course drop-down (kept in step with the course cards) ----- */
function refreshTaskCourses() {
  const previous = taskCourse.value;
  taskCourse.innerHTML = "";
  addCourseOption(taskCourse, "", "-- Choose a course --");
  $$("article h3", courseGrid).forEach(title => {
    addCourseOption(taskCourse, title.textContent, title.textContent);
  });
  addCourseOption(taskCourse, "General Training", "General Training");

  if ($$("option", taskCourse).some(option => option.value === previous)) {
    taskCourse.value = previous;
  }
}

/* ----- READ: filter, sort and draw the table ----- */
function getVisibleTasks() {
  const term = taskSearch.value.trim().toLowerCase();
  const statusFilter = taskFilterStatus.value;
  const priorityFilter = taskFilterPriority.value;

  const result = tasks.filter(task => {
    const text = (task.title + " " + task.assignee + " " + task.course + " " + task.desc).toLowerCase();
    return text.includes(term) &&
      (!statusFilter || task.status === statusFilter) &&
      (!priorityFilter || task.priority === priorityFilter);
  });

  result.sort((a, b) => {
    if (taskSort.value === "priority") {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.due.localeCompare(b.due);
    }
    if (taskSort.value === "newest") return b.created - a.created;
    return a.due.localeCompare(b.due);
  });

  return result;
}

function makeCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function createTaskRow(task) {
  const row = document.createElement("tr");
  row.className = "task-row";
  row.setAttribute("data-id", task.id);
  if (task.status === "Completed") row.classList.add("done");
  if (task.id === editingId) row.classList.add("editing");

  /* Task title + description */
  const titleCell = document.createElement("td");
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;
  titleCell.appendChild(title);
  if (task.desc) {
    const desc = document.createElement("span");
    desc.className = "task-desc";
    desc.textContent = task.desc;
    titleCell.appendChild(desc);
  }
  row.appendChild(titleCell);

  row.appendChild(makeCell(task.assignee));
  row.appendChild(makeCell(task.course));

  /* Priority pill */
  const priorityCell = document.createElement("td");
  const pill = document.createElement("span");
  pill.className = "prio-pill prio-" + task.priority.toLowerCase();
  pill.textContent = task.priority;
  priorityCell.appendChild(pill);
  row.appendChild(priorityCell);

  /* Due date (red when overdue) */
  const dueCell = document.createElement("td");
  dueCell.textContent = formatDate(task.due);
  if (task.status !== "Completed" && daysFromToday(task.due) < 0) {
    dueCell.classList.add("overdue");
    dueCell.setAttribute("title", dueLabel(task.due));
  }
  row.appendChild(dueCell);

  /* UPDATE status: drop-down inside the row */
  const statusCell = document.createElement("td");
  const select = document.createElement("select");
  select.className = "status-select";
  select.setAttribute("aria-label", "Change status of " + task.title);
  ["To Do", "In Progress", "Completed"].forEach(label => addCourseOption(select, label, label));
  select.value = task.status;
  statusCell.appendChild(select);
  row.appendChild(statusCell);

  /* Edit and Delete buttons */
  const actionCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "plan-actions";
  actions.appendChild(makeButton("Edit", "edit", ""));
  actions.appendChild(makeButton("Delete", "delete", "btn-danger"));
  actionCell.appendChild(actions);
  row.appendChild(actionCell);

  return row;
}

function renderTasks() {
  taskBody.innerHTML = "";
  getVisibleTasks().forEach(task => taskBody.appendChild(createTaskRow(task)));
  refreshTaskInfo();
}

/* Statistics, deadline list and empty message */
function refreshTaskInfo() {
  const todo = tasks.filter(task => task.status === "To Do").length;
  const progress = tasks.filter(task => task.status === "In Progress").length;
  const done = tasks.filter(task => task.status === "Completed").length;

  setStat(taskStatTotal, tasks.length);
  setStat(taskStatTodo, todo);
  setStat(taskStatProgress, progress);
  setStat(taskStatDone, done);

  const shown = $$(".task-row:not(.removing)", taskBody).length;
  taskCaption.textContent = "Showing " + shown + " of " + tasks.length + " tasks";

  if (shown === 0) {
    taskEmpty.textContent = tasks.length === 0
      ? "No tasks yet. Add your first task above."
      : "No tasks match your search or filters.";
    taskEmpty.removeAttribute("hidden");
  } else {
    taskEmpty.setAttribute("hidden", "");
  }

  /* Upcoming deadlines: open tasks, earliest first */
  taskDeadlines.innerHTML = "";
  const upcoming = tasks
    .filter(task => task.status !== "Completed")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  if (upcoming.length === 0) {
    const empty = document.createElement("li");
    empty.className = "deadline-empty";
    empty.textContent = "No open tasks. Great work!";
    taskDeadlines.appendChild(empty);
    return;
  }

  upcoming.forEach(task => {
    const item = document.createElement("li");
    const days = daysFromToday(task.due);
    if (days < 0) item.classList.add("late");
    else if (days <= 3) item.classList.add("soon");

    const name = document.createElement("span");
    name.textContent = task.title + " (" + task.assignee + ")";

    const when = document.createElement("span");
    when.className = "deadline-when";
    when.textContent = dueLabel(task.due) + " \u2022 " + formatDate(task.due);

    item.appendChild(name);
    item.appendChild(when);
    taskDeadlines.appendChild(item);
  });
}

/* ----- Form state ----- */
function resetTaskForm() {
  editingId = null;
  taskForm.reset();
  taskDue.value = localISO(new Date());
  taskFormTitle.textContent = "Add a New Task";
  taskSubmit.textContent = "Add Task";
  taskCancel.textContent = "Clear Form";
  renderTasks();
}

/* ----- CREATE and UPDATE (one form, two modes) ----- */
function saveTaskFromForm() {
  const title = taskTitle.value.trim();
  const assignee = taskAssignee.value.trim();

  if (title.length < 3) {
    showFormMessage(taskMsg, "Enter a task title (at least 3 characters).", "error", taskTitle);
    return;
  }
  if (assignee.length < 2) {
    showFormMessage(taskMsg, "Enter who the task is assigned to.", "error", taskAssignee);
    return;
  }
  if (!taskCourse.value) {
    showFormMessage(taskMsg, "Please choose a related course.", "error", taskCourse);
    return;
  }
  if (!taskDue.value) {
    showFormMessage(taskMsg, "Please choose a due date.", "error", taskDue);
    return;
  }

  if (editingId) {
    const task = tasks.find(item => item.id === editingId);
    if (task) {
      task.title = title;
      task.assignee = assignee;
      task.course = taskCourse.value;
      task.priority = taskPriority.value;
      task.due = taskDue.value;
      task.status = taskStatus.value;
      task.desc = taskDesc.value.trim();
      saveTasks();
      showToast('Task "' + title + '" was updated.', "success");
    }
  } else {
    tasks.push({
      id: newTaskId(),
      title: title,
      assignee: assignee,
      course: taskCourse.value,
      priority: taskPriority.value,
      due: taskDue.value,
      status: taskStatus.value,
      desc: taskDesc.value.trim(),
      created: Date.now()
    });
    saveTasks();
    showToast('Task "' + title + '" was added.', "success");
  }

  resetTaskForm();
  showFormMessage(taskMsg, "Saved. Your tasks are stored in this browser.", "ok");
}

/* ----- UPDATE: load a task into the form ----- */
function startEditTask(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  editingId = id;

  if (!$$("option", taskCourse).some(option => option.value === task.course)) {
    addCourseOption(taskCourse, task.course, task.course);
  }

  taskTitle.value = task.title;
  taskAssignee.value = task.assignee;
  taskCourse.value = task.course;
  taskPriority.value = task.priority;
  taskDue.value = task.due;
  taskStatus.value = task.status;
  taskDesc.value = task.desc;

  taskFormTitle.textContent = "Edit Task";
  taskSubmit.textContent = "Update Task";
  taskCancel.textContent = "Cancel Edit";

  renderTasks();
  taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
  taskTitle.focus();
}

/* ----- UPDATE: change only the status ----- */
function changeTaskStatus(id, status) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;

  task.status = status;
  saveTasks();
  showToast('"' + task.title + '" is now ' + status + ".", "info", 2500);
  renderTasks();
}

/* ----- DELETE ----- */
function deleteTask(id, row) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  if (!window.confirm('Delete the task "' + task.title + '"?')) return;

  if (editingId === id) resetTaskForm();

  row.classList.add("removing");
  setTimeout(() => {
    row.remove();
    tasks = tasks.filter(item => item.id !== id);
    saveTasks();
    refreshTaskInfo();
  }, 300);
  showToast('Task "' + task.title + '" was deleted.', "info");
}

/* ----- Events ----- */
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  saveTaskFromForm();
});

taskCancel.addEventListener("click", () => {
  const wasEditing = editingId !== null;
  resetTaskForm();
  if (wasEditing) showToast("Edit cancelled.", "info", 2000);
});

taskBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest(".task-row");
  const id = row.getAttribute("data-id");

  if (button.getAttribute("data-action") === "edit") startEditTask(id);
  if (button.getAttribute("data-action") === "delete") deleteTask(id, row);
});

taskBody.addEventListener("change", event => {
  if (!event.target.classList.contains("status-select")) return;
  const row = event.target.closest(".task-row");
  changeTaskStatus(row.getAttribute("data-id"), event.target.value);
});

[taskSearch, taskFilterStatus, taskFilterPriority, taskSort].forEach(control => {
  control.addEventListener(control === taskSearch ? "input" : "change", renderTasks);
});

document.getElementById("task-clear-done").addEventListener("click", () => {
  const finished = tasks.filter(task => task.status === "Completed");
  if (finished.length === 0) {
    showToast("There are no completed tasks to remove.", "warning");
    return;
  }
  tasks = tasks.filter(task => task.status !== "Completed");
  if (editingId && !tasks.some(task => task.id === editingId)) editingId = null;
  saveTasks();
  renderTasks();
  showToast(finished.length + " completed task(s) removed.", "info");
});

document.getElementById("task-reset").addEventListener("click", () => {
  if (!window.confirm("Replace all tasks with the sample data?")) return;
  tasks = sampleTasks();
  saveTasks();
  resetTaskForm();
  showToast("Sample tasks restored.", "info");
});

/* ----- Start-up: read from Local Storage and draw ----- */
tasks = loadTasks();
saveTasks();
refreshTaskCourses();
taskDue.value = localISO(new Date());
renderTasks();

/* =====================================================================
   15B. COURSE FINDER AND COMPARISON TOOL (Practicum 14)
   Methods: addEventListener(), querySelector(), querySelectorAll(),
            classList.toggle(), classList.add(), classList.remove(),
            filter(), forEach(), find()
   ===================================================================== */
const FINDER_COURSES = [
  { id: 1, title: "Effective Communication", category: "Soft Skills", mode: "Hybrid", level: "Beginner",
    hours: 12, price: 4500, rating: 4.7, trainer: "Priya Nair", img: 20,
    outcomes: ["Write clear business emails", "Run focused team meetings", "Give and receive feedback"] },
  { id: 2, title: "Leadership Essentials", category: "Management", mode: "Classroom", level: "Intermediate",
    hours: 18, price: 8500, rating: 4.8, trainer: "Rahul Khanna", img: 60,
    outcomes: ["Delegate work with clarity", "Motivate and mentor a team", "Handle conflict calmly"] },
  { id: 3, title: "Cybersecurity Awareness", category: "Technical", mode: "Online", level: "Beginner",
    hours: 6, price: 2500, rating: 4.5, trainer: "Meera Iyer", img: 119,
    outcomes: ["Spot phishing attempts", "Use strong passwords and MFA", "Report incidents correctly"] },
  { id: 4, title: "Time Management", category: "Soft Skills", mode: "Online", level: "Beginner",
    hours: 8, price: 2000, rating: 4.3, trainer: "Priya Nair", img: 48,
    outcomes: ["Plan the day with priorities", "Avoid common time traps", "Use simple planning tools"] },
  { id: 5, title: "Project Management Basics", category: "Management", mode: "Hybrid", level: "Intermediate",
    hours: 20, price: 9500, rating: 4.6, trainer: "Rahul Khanna", img: 180,
    outcomes: ["Define scope and milestones", "Track risks and deadlines", "Report progress to sponsors"] },
  { id: 6, title: "Data Privacy and Compliance", category: "Technical", mode: "Classroom", level: "Advanced",
    hours: 16, price: 11000, rating: 4.4, trainer: "Meera Iyer", img: 1,
    outcomes: ["Understand data-protection rules", "Classify sensitive data", "Run a basic privacy audit"] },
  { id: 7, title: "Presentation Skills", category: "Soft Skills", mode: "Classroom", level: "Intermediate",
    hours: 10, price: 5000, rating: 4.6, trainer: "Priya Nair", img: 26,
    outcomes: ["Structure a clear talk", "Design simple slides", "Handle questions confidently"] },
  { id: 8, title: "Advanced Team Leadership", category: "Management", mode: "Online", level: "Advanced",
    hours: 24, price: 14000, rating: 4.9, trainer: "Rahul Khanna", img: 160,
    outcomes: ["Coach high-performing teams", "Lead through change", "Measure team outcomes"] }
];

const MAX_COMPARE = 3;

/* Page elements */
const finderSearch = document.getElementById("finder-search");
const finderMode = document.getElementById("finder-mode");
const finderLevel = document.getElementById("finder-level");
const finderSort = document.getElementById("finder-sort");
const finderGrid = document.getElementById("finder-grid");
const finderCount = document.getElementById("finder-count");
const finderEmpty = document.getElementById("finder-empty");
const finderChips = $$(".chip-btn");
const compareTray = document.getElementById("compare-tray");
const compareCount = document.getElementById("compare-count");
const compareHead = document.getElementById("compare-thead");
const compareBody = document.getElementById("compare-tbody");

/* Application state */
let finderCategory = "all";
let compareIds = [];

function formatPrice(amount) {
  return "\u20B9" + amount.toLocaleString("en-IN");
}

/* ----- Filter + sort ----- */
function getFinderResults() {
  const term = finderSearch.value.trim().toLowerCase();

  const results = FINDER_COURSES.filter(course => {
    const text = (course.title + " " + course.trainer + " " + course.category + " " +
                  course.outcomes.join(" ")).toLowerCase();
    return text.includes(term) &&
      (finderCategory === "all" || course.category === finderCategory) &&
      (!finderMode.value || course.mode === finderMode.value) &&
      (!finderLevel.value || course.level === finderLevel.value);
  });

  results.sort((a, b) => {
    switch (finderSort.value) {
      case "hours":      return a.hours - b.hours;
      case "price-low":  return a.price - b.price;
      case "price-high": return b.price - a.price;
      case "title":      return a.title.localeCompare(b.title);
      default:           return b.rating - a.rating;
    }
  });
  return results;
}

/* ----- Build one card ----- */
function createFinderCard(course, index) {
  const card = document.createElement("li");
  card.className = "finder-card";
  card.setAttribute("data-id", course.id);
  card.style.animationDelay = index * 60 + "ms";
  if (compareIds.includes(course.id)) card.classList.add("selected");

  const picture = document.createElement("img");
  picture.src = "https://picsum.photos/id/" + course.img + "/400/260";
  picture.alt = "Image for the course " + course.title;
  picture.width = 400;
  picture.height = 130;
  picture.loading = "lazy";
  card.appendChild(picture);

  const body = document.createElement("div");
  body.className = "finder-body";

  const title = document.createElement("h3");
  title.textContent = course.title;
  body.appendChild(title);

  const tags = document.createElement("div");
  tags.className = "finder-tags";
  [[course.category, "cat"], [course.mode, ""], [course.level, ""]].forEach(pair => {
    const tag = document.createElement("span");
    tag.className = "finder-tag " + pair[1];
    tag.textContent = pair[0];
    tags.appendChild(tag);
  });
  body.appendChild(tags);

  const meta = document.createElement("p");
  meta.className = "finder-meta";
  meta.textContent = course.hours + " hours \u2022 Trainer: " + course.trainer;
  body.appendChild(meta);

  const rating = document.createElement("p");
  rating.className = "finder-meta";
  const star = document.createElement("span");
  star.className = "finder-rating";
  star.textContent = "\u2605 " + course.rating.toFixed(1);
  const price = document.createElement("span");
  price.className = "finder-price";
  price.textContent = "  " + formatPrice(course.price);
  rating.appendChild(star);
  rating.appendChild(price);
  body.appendChild(rating);

  /* details / summary accordion */
  const more = document.createElement("details");
  more.className = "finder-more";
  const summary = document.createElement("summary");
  summary.textContent = "Learning outcomes";
  const list = document.createElement("ul");
  course.outcomes.forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
  more.appendChild(summary);
  more.appendChild(list);
  body.appendChild(more);

  const actions = document.createElement("div");
  actions.className = "finder-actions";

  const compareBtn = document.createElement("button");
  compareBtn.type = "button";
  compareBtn.className = "btn btn-sm btn-compare";
  compareBtn.setAttribute("data-action", "compare");
  actions.appendChild(compareBtn);

  const registerLink = document.createElement("a");
  registerLink.href = "#register";
  registerLink.className = "btn btn-sm btn-solid";
  registerLink.textContent = "Register";
  actions.appendChild(registerLink);

  body.appendChild(actions);
  card.appendChild(body);
  setCompareButton(compareBtn, compareIds.includes(course.id));
  return card;
}

function setCompareButton(button, selected) {
  button.classList.toggle("on", selected);
  button.setAttribute("aria-pressed", String(selected));
  button.textContent = selected ? "\u2713 Comparing" : "Compare";
}

/* ----- Draw the results ----- */
function renderFinder() {
  const results = getFinderResults();
  finderGrid.innerHTML = "";
  results.forEach((course, index) => finderGrid.appendChild(createFinderCard(course, index)));

  finderCount.textContent = "Showing " + results.length + " of " + FINDER_COURSES.length + " courses";
  if (results.length === 0) finderEmpty.removeAttribute("hidden");
  else finderEmpty.setAttribute("hidden", "");
}

/* ----- Comparison tray ----- */
function renderCompare() {
  const chosen = compareIds
    .map(id => FINDER_COURSES.find(course => course.id === id))
    .filter(Boolean);

  compareCount.textContent = chosen.length;
  if (chosen.length === 0) {
    compareTray.setAttribute("hidden", "");
    return;
  }
  compareTray.removeAttribute("hidden");

  /* header row: course names with a remove button */
  compareHead.innerHTML = "";
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.textContent = "Feature";
  headRow.appendChild(corner);

  chosen.forEach(course => {
    const th = document.createElement("th");
    th.textContent = course.title;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "compare-remove";
    remove.setAttribute("data-remove", course.id);
    remove.setAttribute("aria-label", "Remove " + course.title + " from comparison");
    remove.innerHTML = "&times;";
    th.appendChild(remove);
    headRow.appendChild(th);
  });
  compareHead.appendChild(headRow);

  /* body rows; "best" marks the winning value when 2+ courses are compared */
  const rows = [
    { label: "Category", get: c => c.category },
    { label: "Trainer",  get: c => c.trainer },
    { label: "Mode",     get: c => c.mode },
    { label: "Level",    get: c => c.level },
    { label: "Duration", get: c => c.hours + " hours", best: c => -c.hours },
    { label: "Price",    get: c => formatPrice(c.price), best: c => -c.price },
    { label: "Rating",   get: c => "\u2605 " + c.rating.toFixed(1), best: c => c.rating }
  ];

  compareBody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = row.label;
    label.style.background = "#f3f7f9";
    label.style.color = "var(--ink)";
    label.style.position = "static";
    tr.appendChild(label);

    let bestScore = null;
    if (row.best && chosen.length > 1) bestScore = Math.max(...chosen.map(row.best));

    chosen.forEach(course => {
      const td = document.createElement("td");
      td.textContent = row.get(course);
      if (bestScore !== null && row.best(course) === bestScore) {
        td.classList.add("compare-best");
        td.setAttribute("title", "Best value in this row");
      }
      tr.appendChild(td);
    });
    compareBody.appendChild(tr);
  });
}

function toggleCompare(id) {
  const course = FINDER_COURSES.find(item => item.id === id);
  if (!course) return;

  if (compareIds.includes(id)) {
    compareIds = compareIds.filter(item => item !== id);
    showToast(course.title + " removed from comparison.", "info", 2200);
  } else {
    if (compareIds.length >= MAX_COMPARE) {
      showToast("You can compare up to " + MAX_COMPARE + " courses. Remove one first.", "warning");
      return;
    }
    compareIds.push(id);
    showToast(course.title + " added to comparison.", "success", 2200);
  }

  /* update only the cards that changed, without redrawing the grid */
  $$(".finder-card", finderGrid).forEach(card => {
    const selected = compareIds.includes(Number(card.getAttribute("data-id")));
    card.classList.toggle("selected", selected);
    setCompareButton($(".btn-compare", card), selected);
  });
  renderCompare();
}

/* ----- Events ----- */
finderSearch.addEventListener("input", renderFinder);
[finderMode, finderLevel, finderSort].forEach(control => {
  control.addEventListener("change", renderFinder);
});

finderChips.forEach(chip => {
  chip.addEventListener("click", () => {
    finderCategory = chip.getAttribute("data-cat");
    finderChips.forEach(item => {
      const active = item === chip;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderFinder();
  });
});

document.getElementById("finder-reset").addEventListener("click", () => {
  finderSearch.value = "";
  finderMode.value = "";
  finderLevel.value = "";
  finderSort.value = "rating";
  finderCategory = "all";
  finderChips.forEach(item => {
    const active = item.getAttribute("data-cat") === "all";
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderFinder();
  showToast("Filters reset.", "info", 2000);
});

finderGrid.addEventListener("click", event => {
  const button = event.target.closest('button[data-action="compare"]');
  if (!button) return;
  toggleCompare(Number(button.closest(".finder-card").getAttribute("data-id")));
});

compareHead.addEventListener("click", event => {
  const remove = event.target.closest("button[data-remove]");
  if (remove) toggleCompare(Number(remove.getAttribute("data-remove")));
});

document.getElementById("compare-clear").addEventListener("click", () => {
  compareIds = [];
  $$(".finder-card", finderGrid).forEach(card => {
    card.classList.remove("selected");
    setCompareButton($(".btn-compare", card), false);
  });
  renderCompare();
  showToast("Comparison cleared.", "info", 2000);
});

/* Start-up */
renderFinder();
renderCompare();

/* =====================================================================
   16. WELCOME NOTIFICATION
   ===================================================================== */
setTimeout(() => {
  showToast("Welcome to SkillBridge! Enrollment is open for the January batch.", "info", 4000);
}, 1200);