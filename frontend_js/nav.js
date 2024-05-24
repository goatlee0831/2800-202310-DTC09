document.addEventListener("click", e => {
  const isDropdownButton = e.target.matches("[data-dropdown-button]")
  if (!isDropdownButton && e.target.closest("[data-dropdown]") != null) return

  let currentDropdown
  if (isDropdownButton) {
    currentDropdown = e.target.closest("[data-dropdown]")
    currentDropdown.classList.toggle("active")
  }

  document.querySelectorAll("[data-dropdown].active").forEach(dropdown => {
    if (dropdown === currentDropdown) return
    dropdown.classList.remove("active")
  })
})

function activateUser(mode) {
  mode = 'user';
  document.getElementById('goferLinks').style.display = 'none';
  document.getElementById('userLinks').style.display = 'flex';
  document.getElementById('goferMobile').style.display = 'none';
  document.getElementById('userMobile').style.display = 'flex';
  console.log('mode: ' + mode);

}

function activateGofer(mode) {
  mode = 'gofer';
  document.getElementById('userLinks').style.display = 'none';
  document.getElementById('goferLinks').style.display = 'flex';
  document.getElementById('userMobile').style.display = 'none';
  document.getElementById('goferMobile').style.display = 'flex';
  console.log('mode: ' + mode);
} 