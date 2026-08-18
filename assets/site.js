const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.dataset.open === "true";
    navLinks.dataset.open = isOpen ? "false" : "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
  });
}

// Dropdown menus — click toggle for mobile, hover handled by CSS on desktop
const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

function closeAllDropdowns() {
  document.querySelectorAll(".nav-dropdown__menu").forEach((m) => {
    m.dataset.open = "false";
    m.previousElementSibling.setAttribute("aria-expanded", "false");
  });
}

document.querySelectorAll(".nav-dropdown__toggle").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (!isMobile()) return;
    e.stopPropagation();
    const menu = btn.nextElementSibling;
    const isOpen = menu.dataset.open === "true";
    closeAllDropdowns();
    if (!isOpen) {
      menu.dataset.open = "true";
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

// Close dropdowns when clicking outside (mobile)
document.addEventListener("click", () => {
  closeAllDropdowns();
});
