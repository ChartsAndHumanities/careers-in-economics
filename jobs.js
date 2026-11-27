const jobsContainer = document.getElementById("jobs");
const statusMessage = document.getElementById("status");
const filterButtons = document.querySelectorAll(".filter-button");
const sortButtons = document.querySelectorAll(".sort-button");

let selectedSort = "earliest";

let allJobs = [];

const SUMMARY_PREVIEW_LENGTH = 160;


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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date).replace(",", "");
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
 * Shorten long vacancy summaries for the initial display.
 * The text is cut at a word boundary rather than in the
 * middle of a word.
 */
function truncateSummary(
  text,
  maxLength = SUMMARY_PREVIEW_LENGTH
) {
  const value = String(text ?? "").trim();

  if (value.length <= maxLength) {
    return value;
  }

  const shortened = value.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(" ");

  if (lastSpace === -1) {
    return shortened + "...";
  }

  return shortened.slice(0, lastSpace) + "...";
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

    // No fixed deadline always goes at the bottom.
    if (!deadlineA && !deadlineB) return 0;
    if (!deadlineA) return 1;
    if (!deadlineB) return -1;

    const dateA = new Date(`${deadlineA}T00:00:00`);
    const dateB = new Date(`${deadlineB}T00:00:00`);

    // Reverse the chronological order when Latest first is selected.
    if (selectedSort === "latest") {
      return dateB - dateA;
    }

    // Default: earliest deadline first.
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

    const fullSummary =
      String(job.summary_note || "").trim();

    const summaryIsLong =
      fullSummary.length > SUMMARY_PREVIEW_LENGTH;

    const summaryPreview =
      truncateSummary(fullSummary);

    return `
      <article class="job-card">

       <!-- <h2>
         ${escapeHtml(job.job_title || "Untitled vacancy")}
        </h2>
       -->
      
       <h2>
         <a
            class="job-title-link"
            href="${escapeHtml(job.URL || "#")}"  
          >
         ${escapeHtml(job.job_title || "Untitled vacancy")}
          </a>
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
          <strong>Career stage:</strong>
          ${escapeHtml(job.career_stage || "Not stated")}
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

        <p class="job-meta">
          <strong>Deadline type:</strong>
          ${escapeHtml(job.deadline_type || "Not stated")}
        </p>

        <div class="job-summary-wrapper">

          <p
            class="job-summary"
            data-preview="${escapeHtml(summaryPreview)}"
            data-full="${escapeHtml(fullSummary)}"
          >
            ${escapeHtml(summaryPreview)}
          </p>

          ${
            summaryIsLong
              ? `
                <button
                  class="read-more-button"
                  type="button"
                  aria-expanded="false"
                >
                  Read more
                </button>
              `
              : ""
          }

        </div>

        ${
          job.URL
            ? `
              <a
                class="job-link"
                href="${escapeHtml(job.URL)}"
                
              >
                View vacancy
              </a>
            `
            : ""
        }

      </article>
    `;

  }).join("");


  /*
   * Expand and collapse individual vacancy summaries.
   */
  jobsContainer
    .querySelectorAll(".read-more-button")
    .forEach(button => {

      button.addEventListener("click", () => {

        const summary =
          button.previousElementSibling;

        const isExpanded =
          button.getAttribute("aria-expanded") === "true";

        if (isExpanded) {
          summary.textContent =
            summary.dataset.preview;

          button.textContent = "Read more";

          button.setAttribute(
            "aria-expanded",
            "false"
          );

        } else {
          summary.textContent =
            summary.dataset.full;

          button.textContent = "Show less";

          button.setAttribute(
            "aria-expanded",
            "true"
          );
        }

      });

    });


  const categoryText =
    selectedFilter === "all"
      ? ""
      : ` for ${selectedFilter}`;

  statusMessage.textContent =
    `${sortedJobs.length} ${
      sortedJobs.length === 1
        ? "vacancy"
        : "vacancies"
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

    button.classList.toggle(
      "active",
      isActive
    );

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
 * Listen for changes to deadline sorting.
 */
sortButtons.forEach(button => {

  button.addEventListener("click", () => {

    selectedSort = button.dataset.sort;

    sortButtons.forEach(sortButton => {

      const isActive =
        sortButton.dataset.sort === selectedSort;

      sortButton.classList.toggle(
        "active",
        isActive
      );

      sortButton.setAttribute(
        "aria-pressed",
        String(isActive)
      );

    });

    applyFilter("all");
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
