const jobsContainer = document.getElementById("jobs");
const statusMessage = document.getElementById("status");
const filterButtons = document.querySelectorAll(".filter-button");

let allJobs = [];


/*
 * Convert the YYYY-MM-DD value stored in jobs.json
 * into a more readable British date.
 */
function formatDeadline(value) {
  if (!value) {
    return "No fixed deadline";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}


/*
 * Protect the page from accidentally interpreting vacancy
 * data as HTML.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
 * Sort vacancies by application deadline.
 *
 * 1. Vacancies with known deadlines appear first.
 * 2. The earliest upcoming deadline appears first.
 * 3. Vacancies with no stated deadline appear at the bottom.
 */
function sortByDeadline(jobs) {
  return [...jobs].sort((a, b) => {

    const deadlineA = a.deadline_for_application;
    const deadlineB = b.deadline_for_application;

    // Neither vacancy has a deadline.
    if (!deadlineA && !deadlineB) {
      return 0;
    }

    // A has no deadline, so move it below B.
    if (!deadlineA) {
      return 1;
    }

    // B has no deadline, so move it below A.
    if (!deadlineB) {
      return -1;
    }

    // Both have deadlines, so sort earliest first.
    const dateA = new Date(`${deadlineA}T00:00:00`);
    const dateB = new Date(`${deadlineB}T00:00:00`);

    return dateA - dateB;
  });
}


/*
 * Build the vacancy cards that appear on the page.
 */
function renderJobs(jobs, selectedFilter = "all") {

  const sortedJobs = sortByDeadline(jobs);

  if (sortedJobs.length === 0) {
    jobsContainer.innerHTML =
      "<p>No vacancies match this organisation focus.</p>";

    statusMessage.textContent = "0 vacancies shown";
    return;
  }

  jobsContainer.innerHTML = sortedJobs.map(job => {

    const organisationFocus =
      Array.isArray(job.focus_of_organisation)
        ? job.focus_of_organisation.join(", ")
        : (job.focus_of_organisation || "Not stated");

    const workFocus =
      Array.isArray(job.focus_of_work)
        ? job.focus_of_work.join(", ")
        : (job.focus_of_work || "Not stated");

    return `
      <article class="job-card">

        <h2>
          ${escapeHtml(job.job_title || "Untitled vacancy")}
        </h2>

        <p class="job-meta">
          <strong>Organisation:</strong>
          ${escapeHtml(job.organisation || "Not stated")}
        </p>

        <p class="job-meta">
          <strong>Organisation focus:</strong>
          ${escapeHtml(organisationFocus)}
        </p>

        <p class="job-meta">
          <strong>Work focus:</strong>
          ${escapeHtml(workFocus)}
        </p>

        <p class="job-meta">
          <strong>Location:</strong>
          ${escapeHtml(job.location || "Not stated")}
        </p>

        <p class="job-meta">
          <strong>Salary:</strong>
          ${escapeHtml(job.salary || "Not stated")}
        </p>

        <p class="job-meta">
          <strong>Application deadline:</strong>
          ${escapeHtml(
            formatDeadline(job.deadline_for_application)
          )}
        </p>

        <p class="job-summary">
          ${escapeHtml(job.summary_note || "")}
        </p>

        ${
          job.URL
            ? `<a
                 class="job-link"
                 href="${escapeHtml(job.URL)}"
                 >
                 View vacancy
               </a>`
            : ""
        }

      </article>
    `;

  }).join("");


  const categoryText =
    selectedFilter === "all"
      ? ""
      : ` for ${selectedFilter}`;

  statusMessage.textContent =
    `${sortedJobs.length} ${
      sortedJobs.length === 1 ? "vacancy" : "vacancies"
    } shown${categoryText}`;
}


/*
 * Filter the vacancies according to the organisation
 * category selected by the user.
 */
function applyFilter(selectedFilter) {

  const filteredJobs =
    selectedFilter === "all"
      ? allJobs
      : allJobs.filter(job => {

          const focuses =
            Array.isArray(job.focus_of_organisation)
              ? job.focus_of_organisation
              : [job.focus_of_organisation];

          return focuses.includes(selectedFilter);
        });


  /*
   * Update the appearance and accessibility state
   * of the filter buttons.
   */
  filterButtons.forEach(button => {

    const isActive =
      button.dataset.filter === selectedFilter;

    button.classList.toggle("active", isActive);

    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });


  renderJobs(filteredJobs, selectedFilter);
}


/*
 * Listen for clicks on the organisation filter buttons.
 */
filterButtons.forEach(button => {

  button.addEventListener("click", () => {
    applyFilter(button.dataset.filter);
  });

});


/*
 * Load the vacancy data.
 */
fetch("jobs.json")

  .then(response => {

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  })

  .then(data => {

    if (!data || !Array.isArray(data.jobs)) {
      throw new Error(
        "jobs.json must contain a jobs array"
      );
    }

    allJobs = data.jobs;

    // Display everything when the page first loads.
    applyFilter("all");
  })

.catch(error => {

  console.error(
    "Unable to load jobs.json:",
    error
  );

  jobsContainer.innerHTML =
    `<p>
      Unable to load vacancies.
      Check that jobs.json is in the same folder
      and that the page is running through Live Server
      or another local server.
    </p>`;

  statusMessage.textContent = "";
});
