"use strict";

const searchInput    = document.getElementById("search");
const btnSearch      = document.getElementById("btn-search");
const resultsEl      = document.getElementById("results");
const detailsSection = document.getElementById("details-section");
const movieDetailsEl = document.getElementById("movie-details");
const closeBtn       = document.getElementById("close-details");
const resultCountEl  = document.getElementById("result-count");
const statusEl       = document.getElementById("status-msg");

const API_KEY = "trilogy";
const BASE    = "https://www.omdbapi.com/";

let currentSelectedLi = null;

// ── TOP 10 ON LOAD ─────────────────────────────────────────────────────────

const SEED_TERMS = ["space", "alien", "robot", "future", "star", "mars", "cyber", "time machine"];

async function loadTopScifi() {
  setStatus("Carregando top filmes Sci-Fi...", false);
  resultsEl.innerHTML = "";
  resultCountEl.textContent = "";

  try {
    const searchResults = await Promise.all(
      SEED_TERMS.map(term =>
        fetch(`${BASE}?s=${encodeURIComponent(term)}&type=movie&apikey=${API_KEY}&page=1`)
          .then(r => r.json())
      )
    );

    const seenIds = new Set();
    const allMovies = [];
    for (const data of searchResults) {
      if (data.Search) {
        for (const m of data.Search) {
          if (!seenIds.has(m.imdbID)) {
            seenIds.add(m.imdbID);
            allMovies.push(m);
          }
        }
      }
    }

    const details = await Promise.all(
      allMovies.map(m =>
        fetch(`${BASE}?i=${m.imdbID}&apikey=${API_KEY}&plot=full`).then(r => r.json())
      )
    );

    const scifi = details.filter(d =>
      d.Response === "True" &&
      d.Genre?.toLowerCase().includes("sci-fi") &&
      d.imdbRating && d.imdbRating !== "N/A"
    );

    const top10 = scifi
      .sort((a, b) => parseFloat(b.imdbRating) - parseFloat(a.imdbRating))
      .slice(0, 10);

    if (top10.length === 0) {
      setStatus("", false);
      resultsEl.innerHTML = `<li class="empty-state">Digite um termo e pressione Pesquisar.</li>`;
      return;
    }

    setStatus("", false);
    resultCountEl.textContent = `· TOP RANK MELHORES AVALIADOS ·`;
    renderResults(top10);

  } catch (err) {
    console.error(err);
    setStatus("", false);
    resultsEl.innerHTML = `<li class="empty-state">Digite um termo e pressione Pesquisar.</li>`;
  }
}

// ── LATEST 10 SCI-FI ───────────────────────────────────────────────────────

const LATEST_SEED_TERMS = ["sci-fi", "space", "alien", "robot", "future"];
const CURRENT_YEAR = new Date().getFullYear();
const RECENT_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

async function loadLatestScifi() {
  const latestListEl   = document.getElementById("latest-results");
  const latestCountEl  = document.getElementById("latest-count");
  if (!latestListEl || !latestCountEl) return;

  latestListEl.innerHTML = `<li class="empty-state">Carregando lançamentos...</li>`;
  latestCountEl.textContent = "";

  try {
    const queries = [];
    for (const year of RECENT_YEARS) {
      for (const term of LATEST_SEED_TERMS) {
        queries.push(
          fetch(`${BASE}?s=${encodeURIComponent(term)}&type=movie&y=${year}&apikey=${API_KEY}&page=1`)
            .then(r => r.json())
        );
      }
    }

    const searchResults = await Promise.all(queries);

    const seenIds = new Set();
    const allMovies = [];
    for (const data of searchResults) {
      if (data.Search) {
        for (const m of data.Search) {
          if (!seenIds.has(m.imdbID)) {
            seenIds.add(m.imdbID);
            allMovies.push(m);
          }
        }
      }
    }

    const details = await Promise.all(
      allMovies.map(m =>
        fetch(`${BASE}?i=${m.imdbID}&apikey=${API_KEY}&plot=full`).then(r => r.json())
      )
    );

    const scifi = details.filter(d =>
      d.Response === "True" &&
      d.Genre?.toLowerCase().includes("sci-fi") &&
      d.Year && RECENT_YEARS.includes(parseInt(d.Year))
    );

    const latest10 = scifi
      .sort((a, b) => {
        const yearDiff = parseInt(b.Year) - parseInt(a.Year);
        if (yearDiff !== 0) return yearDiff;
        const rA = parseFloat(a.imdbRating) || 0;
        const rB = parseFloat(b.imdbRating) || 0;
        return rB - rA;
      })
      .slice(0, 10);

    if (latest10.length === 0) {
      latestListEl.innerHTML = `<li class="empty-state">Nenhum lançamento recente encontrado.</li>`;
      return;
    }

    latestCountEl.textContent = `· ÚLTIMOS LANÇAMENTOS ·`;
    renderLatestResults(latest10);

  } catch (err) {
    console.error(err);
    latestListEl.innerHTML = `<li class="empty-state">Erro ao carregar lançamentos.</li>`;
  }
}

function renderLatestResults(movies) {
  const latestListEl = document.getElementById("latest-results");
  if (!latestListEl) return;
  latestListEl.innerHTML = "";
  movies.forEach(movie => {
    const li = document.createElement("li");
    const rating = movie.imdbRating && movie.imdbRating !== "N/A"
      ? ` · ★ ${movie.imdbRating}` : "";
    li.innerHTML = `
      <div class="movie-title">${movie.Title}</div>
      <div class="movie-meta">${movie.Year} · ${movie.Runtime}${rating}</div>
    `;
    li.addEventListener("click", () => {
      if (currentSelectedLi) currentSelectedLi.classList.remove("active");
      li.classList.add("active");
      currentSelectedLi = li;
      displayDetails(movie);
    });
    latestListEl.appendChild(li);
  });
}

// ── SEARCH ─────────────────────────────────────────────────────────────────

async function searchMovies(query) {
  setStatus("Buscando...", false);
  resultsEl.innerHTML = "";
  resultCountEl.textContent = "";
  hideDetails();

  // Hide latest rank during search
  const latestCol = document.querySelector(".latest-col");
  if (latestCol) latestCol.style.display = "none";

  try {
    const res1 = await fetch(`${BASE}?s=${encodeURIComponent(query)}&type=movie&apikey=${API_KEY}&page=1`);
    const data1 = await res1.json();

    if (data1.Response === "False" || !data1.Search) {
      setStatus(data1.Error ?? "Nenhum resultado encontrado.", true);
      resultsEl.innerHTML = `<li class="empty-state">Nenhum resultado.</li>`;
      return;
    }

    let allMovies = [...data1.Search];
    const total = Math.min(parseInt(data1.totalResults ?? "0"), 50);
    const pages = Math.ceil(total / 10);

    const extras = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        fetch(`${BASE}?s=${encodeURIComponent(query)}&type=movie&apikey=${API_KEY}&page=${i + 2}`)
          .then(r => r.json())
      )
    );
    for (const p of extras) if (p.Search) allMovies.push(...p.Search);

    setStatus(`Filtrando ${allMovies.length} resultados...`, false);

    const details = await Promise.all(
      allMovies.map(m =>
        fetch(`${BASE}?i=${m.imdbID}&apikey=${API_KEY}&plot=full`).then(r => r.json())
      )
    );

    const scifi = details.filter(d =>
      d.Response === "True" && d.Genre?.toLowerCase().includes("sci-fi")
    );

    if (scifi.length === 0) {
      setStatus("Nenhum filme Sci-Fi encontrado para esse termo.", true);
      resultsEl.innerHTML = `<li class="empty-state">Sem resultados Sci-Fi.</li>`;
      resultCountEl.textContent = "";
      return;
    }

    setStatus("", false);
    resultCountEl.textContent = `${scifi.length} filme${scifi.length !== 1 ? "s" : ""}`;
    renderResults(scifi);

  } catch (err) {
    console.error(err);
    setStatus("Erro de conexão.", true);
  }
}

// ── RENDER ─────────────────────────────────────────────────────────────────

function renderResults(movies) {
  resultsEl.innerHTML = "";
  movies.forEach(movie => {
    const li = document.createElement("li");
    const rating = movie.imdbRating && movie.imdbRating !== "N/A"
      ? ` · ★ ${movie.imdbRating}` : "";
    li.innerHTML = `
      <div class="movie-title">${movie.Title}</div>
      <div class="movie-meta">${movie.Year} · ${movie.Runtime}${rating}</div>
    `;
    li.addEventListener("click", () => {
      if (currentSelectedLi) currentSelectedLi.classList.remove("active");
      li.classList.add("active");
      currentSelectedLi = li;
      displayDetails(movie);
    });
    resultsEl.appendChild(li);
  });
}

function displayDetails(movie) {
  detailsSection.classList.remove("hidden");
  detailsSection.querySelector(".details-placeholder").style.display = "none";

  const ratings = movie.Ratings?.map(r => `
    <div class="rating-chip">
      <span class="rating-source">${r.Source.replace("Internet Movie Database", "IMDb")}</span>
      <span class="rating-value">${r.Value}</span>
    </div>`).join("") ?? "";

  movieDetailsEl.innerHTML = `
    <h3 class="detail-title">${movie.Title}</h3>
    <div class="detail-meta-row">${movie.Year} · ${movie.Runtime} · ${movie.Rated} · ${movie.Country}</div>
    ${field("Sinopse",   movie.Plot)}
    ${field("Diretor",   movie.Director)}
    ${field("Elenco",    movie.Actors)}
    ${field("Gênero",    movie.Genre)}
    ${movie.Awards && movie.Awards !== "N/A" ? field("Prêmios", movie.Awards) : ""}
    ${movie.BoxOffice && movie.BoxOffice !== "N/A" ? field("Bilheteria", movie.BoxOffice) : ""}
    ${ratings ? `<div class="detail-block">
      <span class="detail-label">Avaliações</span>
      <div class="ratings-row">${ratings}</div>
    </div>` : ""}
  `;
}

function field(label, value) {
  if (!value || value === "N/A") return "";
  return `<div class="detail-block">
    <span class="detail-label">${label}</span>
    <p class="detail-value">${value}</p>
  </div>`;
}

function hideDetails() {
  detailsSection.classList.add("hidden");
  detailsSection.querySelector(".details-placeholder").style.display = "";
  movieDetailsEl.innerHTML = "";
  if (currentSelectedLi) { currentSelectedLi.classList.remove("active"); currentSelectedLi = null; }
}

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
}

// ── EVENTS ─────────────────────────────────────────────────────────────────

function doSearch() {
  const q = searchInput.value.trim();
  if (!q) { setStatus("Digite um termo para pesquisar.", true); return; }
  searchMovies(q);
}

btnSearch.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
closeBtn.addEventListener("click", hideDetails);

// Load on page load
loadTopScifi();
loadLatestScifi();