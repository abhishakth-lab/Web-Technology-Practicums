"use strict";

/* ---------- Helpers ---------- */
const $  = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/* =====================================================================
   1. TOAST NOTIFICATIONS
   A toast slides in, waits, then slides out (classList + setTimeout)
   ===================================================================== */
const toastBox = document.getElementById("toast-container");
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

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(close);
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

/* Small helper: replay the "bump" animation on a number */
function bump(element) {
  element.classList.remove("bump");
  void element.offsetWidth;                 // restart the animation
  element.classList.add("bump");
  setTimeout(() => element.classList.remove("bump"), 500);
}

/* =====================================================================
   2. SCROLL REVEAL + SCROLL PROGRESS BAR
   ===================================================================== */
const revealItems = $$(".reveal");
const progressBar = document.getElementById("scroll-progress");

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
const menuToggle = document.getElementById("menu-toggle");
$$(".nav-links a").forEach(link => {
  link.addEventListener("click", () => { menuToggle.checked = false; });
});

/* =====================================================================
   4. SHARED FORM HELPERS (Practicum 10)
   ===================================================================== */
const regCourse = document.getElementById("course");        // select in the registration form

// show a validation / success message under a form panel
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

// create an <option> and add it to a <select>
function addCourseOption(select, value, label) {
  const option = document.createElement("option");
  option.setAttribute("value", value);
  option.textContent = label;
  select.appendChild(option);
}

// remove the <option> that has a given value
function removeCourseOption(select, value) {
  const option = $$("option", select).find(item => item.value === value);
  if (option) option.remove();
}

/* =====================================================================
   5. COURSE CARDS: details, enroll and remove (also used for new cards)
   ===================================================================== */
function initCourseCard(card) {
  const detailsButton = $(".btn-details", card);
  const enrollButton = $(".btn-enroll", card);
  const removeButton = $(".btn-remove-course", card);

  // open / close details
  detailsButton.addEventListener("click", () => {
    const panel = document.getElementById(detailsButton.getAttribute("aria-controls"));
    const isOpen = panel.classList.toggle("open");

    detailsButton.classList.toggle("active", isOpen);
    detailsButton.setAttribute("aria-expanded", String(isOpen));
    $(".btn-label", detailsButton).textContent = isOpen ? "Hide Details" : "View Details";
  });

  // enroll / cancel
  enrollButton.addEventListener("click", () => {
    const seats = $(".seats", card);
    const label = $(".btn-label", enrollButton);
    const enrolled = enrollButton.classList.toggle("enrolled");

    // update the seat counter and animate it
    const current = parseInt(seats.textContent, 10);
    seats.textContent = enrolled ? current - 1 : current + 1;
    bump(seats);

    label.textContent = enrolled ? "Enrolled \u2713" : "Enroll";

    // button click animation
    enrollButton.classList.add("clicked");
    setTimeout(() => enrollButton.classList.remove("clicked"), 450);

    if (enrolled) {
      regCourse.value = enrollButton.dataset.course;
      showToast("You are enrolled in " + enrollButton.dataset.title + ". Complete the form below to confirm.", "success");
    } else {
      if (regCourse.value === enrollButton.dataset.course) regCourse.value = "";
      showToast("Enrollment cancelled for " + enrollButton.dataset.title + ".", "info");
    }
  });

  // remove (only custom cards have this button)
  if (removeButton) {
    removeButton.addEventListener("click", () => removeCourseCard(card));
  }
}

const courseGrid = $(".course-grid");
$$("article", courseGrid).forEach(initCourseCard);

/* =====================================================================
   6. TRAINING PLANNER: course drop-down (built from the course cards)
   ===================================================================== */
const empCourse = document.getElementById("emp-course");

function loadCourseOptions() {
  empCourse.innerHTML = "";                                   // clear the old options
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

// change a number on the dashboard only when it really changed
function setStat(element, value) {
  if (element.textContent !== String(value)) {
    element.textContent = value;
    bump(element);
  }
}

// change the label and action of a button
function setButton(button, label, action) {
  button.textContent = label;
  button.setAttribute("data-action", action);
}

// build one button for a plan item
function makeButton(label, action, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm " + extraClass;
  button.setAttribute("data-action", action);
  button.textContent = label;
  return button;
}

// build one <li> for the plan list
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

/* ----- ADD ----- */
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

  planSearch.value = "";                                      // show every item again
  planList.appendChild(createPlanItem(name, course));
  nameInput.value = "";
  nameInput.focus();

  showFormMessage(plannerMsg, name + " was added to " + course + ".", "ok");
  showToast(name + " assigned to " + course + ".", "success");
  updatePlan();
}

/* ----- COMPLETE / UNDO ----- */
function toggleDone(item) {
  const done = item.classList.toggle("done");
  item.setAttribute("data-done", String(done));
  $(".plan-status", item).textContent = done ? "Completed" : "Pending";
  $(".act-done", item).textContent = done ? "Undo" : "Mark Done";
  updatePlan();
}

/* ----- EDIT (replace the name with an input, then back again) ----- */
function startEdit(item) {
  if (item.classList.contains("editing")) return;

  const nameEl = $(".plan-name", item);
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = nameEl.textContent;
  input.setAttribute("maxlength", "40");
  input.setAttribute("aria-label", "Edit employee name");
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
  const original = item.getAttribute("data-original") || "";
  const input = $(".edit-input", item);
  finishEdit(item, input.getAttribute("data-original") || original || input.defaultValue);
}

/* ----- REMOVE ----- */
function removeItem(item, silent = false) {
  if (item.classList.contains("removing")) return;
  const name = $(".plan-name", item) ? $(".plan-name", item).textContent : "Entry";

  item.classList.add("removing");                             // play the slide-out animation
  updatePlan();
  setTimeout(() => {
    item.remove();                                            // then delete the element
    updatePlan();
  }, 350);

  if (!silent) showToast(name + " was removed from the plan.", "info");
}

/* ----- ONE LISTENER FOR EVERY BUTTON IN THE LIST (event delegation) ----- */
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

/* ----- REFRESH: counters, summary chips, search filter, empty message ----- */
function updatePlan() {
  const items = $$(".plan-item:not(.removing)", planList);
  const doneCount = items.filter(item => item.classList.contains("done")).length;

  // dashboard numbers
  setStat(statCourses, $$("article", courseGrid).length);
  setStat(statTotal, items.length);
  setStat(statDone, doneCount);

  // summary chips (rebuilt only when the counts change)
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

  // search filter
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

  // empty / no-match message
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

/* ----- Buttons and inputs of the planner ----- */
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

// sample entries so the list is not empty at the start
planList.appendChild(createPlanItem("Anita Raj", "Effective Communication"));
planList.appendChild(createPlanItem("Karthik S", "Cybersecurity Awareness", true));
updatePlan();

/* =====================================================================
   8. COURSE BUILDER: create and remove course cards
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

  // fixed template (no user text inside)
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

  // typed text is inserted with textContent, so it is always safe
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

  // keep both drop-down lists in step with the new card
  addCourseOption(regCourse, card.getAttribute("data-slug"), title);
  addCourseOption(empCourse, title, title);

  newTitle.value = "";
  newDuration.value = "";
  newOutcomes.value = "";
  showFormMessage(courseMsg, '"' + title + '" was added to Available Courses.', "ok");
  showToast('New course card added: "' + title + '".', "success");
  updatePlan();

  // show the new card and highlight it
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
   9. FAQ ACCORDION (open / close sections)
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
document.getElementById("faq-expand").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, true), index * 150));
});
document.getElementById("faq-collapse").addEventListener("click", () => {
  faqItems.forEach((item, index) => setTimeout(() => setFaq(item, false), index * 150));
});

/* =====================================================================
   10. GALLERY LIGHTBOX (open / close with animation)
   ===================================================================== */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
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
   11. ANIMATION LAB: playground buttons
   ===================================================================== */
const labBox = document.getElementById("lab-box");
const labName = document.getElementById("lab-name");
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
   12. ENROLLMENT SEQUENCE (steps light up one after another)
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
   13. REGISTRATION FORM: loading, success and invalid-field animations
   ===================================================================== */
const form = document.getElementById("reg-form");
const submitButton = document.getElementById("submit-btn");
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

document.getElementById("clear-btn").addEventListener("click", () => showToast("The form has been cleared.", "info", 2500));

/* =====================================================================
   14. WELCOME NOTIFICATION
   ===================================================================== */
setTimeout(() => {
  showToast("Welcome to SkillBridge! Enrollment is open for the January batch.", "info", 4000);
}, 1200);