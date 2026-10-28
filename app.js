// 화면 표시 로직 — 내용 수정은 data.js에서 하세요.

const app = document.getElementById("app");
const state = { dept: "all", query: "" };

const deptName = (id) => DATA.departments.find((d) => d.id === id)?.name ?? id;
const certById = (id) => DATA.certificates.find((c) => c.id === id);
const companyById = (id) => DATA.companies.find((c) => c.id === id);
const multiDept = () => DATA.departments.length > 1;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[ch]);
}

function deptTags(ids) {
  return multiDept() ? ids.map((d) => `<span class="tag">${esc(deptName(d))}</span>`).join("") : "";
}

function certLinks(ids, cls = "") {
  return ids.map(certById).filter(Boolean)
    .map((c) => `<a class="tag ${cls}" href="#/certificate/${esc(c.id)}">${esc(c.name)}</a>`).join("");
}

function matches(item) {
  const inDept = state.dept === "all" || item.departments.includes(state.dept);
  const q = state.query.trim().toLowerCase();
  const inQuery = !q || item.name.toLowerCase().includes(q);
  return inDept && inQuery;
}

function filtersHtml(placeholder) {
  const chips = multiDept()
    ? `<div class="filters">${[{ id: "all", name: "전체" }, ...DATA.departments]
        .map((d) => `<button class="chip ${state.dept === d.id ? "active" : ""}" data-dept="${esc(d.id)}">${esc(d.name)}</button>`)
        .join("")}</div>`
    : "";
  return `${chips}<input class="search" type="search" placeholder="${esc(placeholder)}" value="${esc(state.query)}">`;
}

// 학과 버튼은 화면 전체를, 검색창은 목록만 다시 그림 (입력 중 포커스 유지)
function bindFilters(rerender, listHtml) {
  app.querySelectorAll(".chip").forEach((btn) =>
    btn.addEventListener("click", () => { state.dept = btn.dataset.dept; rerender(); })
  );
  const input = app.querySelector(".search");
  input.addEventListener("input", () => {
    state.query = input.value;
    app.querySelector(".list-wrap").innerHTML = listHtml();
  });
}

// ---------------- 로드맵 ----------------

function mandatoryExamHtml() {
  return `
    <table class="table wide-th">
      ${DATA.mandatoryExam.map((m) => `<tr><th>${esc(m.status)}</th><td>${esc(m.recommend)}${
        m.note ? `<div class="muted small">${esc(m.note)}</div>` : ""}</td></tr>`).join("")}
    </table>`;
}

const typeColor = (type) => (DATA.legend ?? []).find((l) => l.types.includes(type))?.color ?? "gray";

function stepHtml(s) {
  const branches = (s.branches ?? []).map((b) =>
    `<li><b>${esc(b.if)}</b> → ${esc(b.then)}</li>`).join("");
  const body = `<span class="step-type">${esc(s.type)}</span><span class="step-text">${esc(s.text)}</span>${
    s.when ? `<small>${esc(s.when)}</small>` : ""}${branches ? `<ul class="branches">${branches}</ul>` : ""}`;
  const cls = `step c-${esc(typeColor(s.type))}${s.optional ? " optional" : ""}`;
  return s.cert && certById(s.cert)
    ? `<a class="${cls}" href="#/certificate/${esc(s.cert)}">${body}</a>`
    : `<div class="${cls}">${body}</div>`;
}

// ---------------- 다가오는 시험 일정 ----------------

const SCHEDULE_FIELDS = [
  ["writtenApply", "필기 원서접수"], ["written", "필기시험"], ["writtenResult", "필기 합격발표"],
  ["practicalApply", "실기 원서접수"], ["practical", "실기시험"], ["practicalResult", "실기 합격발표"],
];

// "11.14 ~ 12.2" 또는 "4.22" → { start, end }
function parseRange(text, year) {
  const parts = String(text ?? "").split("~").map((p) => p.trim().match(/^(\d{1,2})\.(\d{1,2})/)).filter(Boolean);
  if (!parts.length) return null;
  const toDate = (m) => new Date(year, Number(m[1]) - 1, Number(m[2]));
  const start = toDate(parts[0]);
  const end = toDate(parts[parts.length - 1]);
  if (end < start) end.setFullYear(year + 1);
  return { start, end };
}

function nowBannerHtml() {
  const s = DATA.examSchedule;
  if (!s?.year) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = s.rounds.flatMap((r) => SCHEDULE_FIELDS.map(([key, label]) => {
    const range = parseRange(r[key], s.year);
    return range && { ...range, label: `${r.round} ${label}`, text: r[key] };
  })).filter(Boolean).sort((a, b) => a.start - b.start);

  const ongoing = events.filter((e) => e.start <= today && today <= e.end);
  const upcoming = events.filter((e) => e.start > today).slice(0, ongoing.length ? 1 : 2);
  if (!ongoing.length && !upcoming.length) return "";

  const dday = (d) => `D-${Math.round((d - today) / 86400000)}`;
  const rows = [
    ...ongoing.map((e) => `<li><span class="badge live">진행 중</span>${esc(e.label)} <span class="muted">${esc(e.text)}</span></li>`),
    ...upcoming.map((e) => `<li><span class="badge">${dday(e.start)}</span>${esc(e.label)} <span class="muted">${esc(e.text)}</span></li>`),
  ].join("");
  return `
    <a class="now card" href="#/guide">
      <div class="now-title">📌 다가오는 시험 일정</div>
      <ul>${rows}</ul>
    </a>`;
}

function renderRoadmap() {
  const legend = (DATA.legend ?? [])
    .map((l) => `<span class="legend-item c-${esc(l.color)}"><i></i>${esc(l.label)}</span>`).join("");
  const hasOptional = DATA.roadmap.some((y) => y.steps.some((s) => s.optional));

  const grades = DATA.roadmap.map((y) => {
    // 공통 과정 먼저, 선택·보충 과정은 각 칸 아래쪽에
    const bySem = (n) => y.steps.filter((s) => (s.sem ?? 0) === n)
      .sort((a, b) => Number(!!a.optional) - Number(!!b.optional));
    const all = bySem(0);
    const semCol = (n) => {
      const steps = bySem(n);
      return `<div class="sem${steps.length ? "" : " sem-empty"}"><div class="sem-label">${n}학기</div>${
        steps.length ? steps.map(stepHtml).join("") : `<div class="none">-</div>`}</div>`;
    };
    return `
      <div class="grade-row">
        <div class="grade-label">${y.grade}학년</div>
        <div class="grade-body">
          ${all.length ? `<div class="sem all"><div class="sem-label">학년 전체</div><div class="all-steps">${all.map(stepHtml).join("")}</div></div>` : ""}
          <div class="sems">${semCol(1)}${semCol(2)}</div>
        </div>
      </div>`;
  }).join("");

  app.innerHTML = `
    ${nowBannerHtml()}
    <div class="card">
      <h2 class="page-title">${multiDept() ? "" : esc(DATA.departments[0]?.name ?? "") + " "}학년별 자격증 로드맵</h2>
      <p class="lead">항목을 누르면 자격증 상세 안내로 이동합니다.</p>
      ${legend || hasOptional ? `<div class="legend">${legend}${
        hasOptional ? `<span class="legend-item legend-optional"><i></i>점선 = 선택·보충 과정</span>` : ""}</div>` : ""}
      <div class="section timeline">${grades}</div>
      <div class="section">
        <h4>3학년 의무검정 추천 종목</h4>
        ${mandatoryExamHtml()}
      </div>
    </div>
  `;
}

// ---------------- 시험 안내 ----------------

function scheduleHtml() {
  const s = DATA.examSchedule;
  const rows = s.rounds.map((r) => {
    const written = r.writtenNote
      ? `<td colspan="3" class="muted">${esc(r.writtenNote)}</td>`
      : `<td>${esc(r.writtenApply)}</td><td class="hl">${esc(r.written)}</td><td>${esc(r.writtenResult)}</td>`;
    return `<tr><th>${esc(r.round)}</th>${written}<td>${esc(r.practicalApply)}</td><td class="hl">${esc(r.practical)}</td><td>${esc(r.practicalResult)}</td></tr>`;
  }).join("");
  return `
    <h4>${esc(s.title)}</h4>
    <div class="scroll-x">
      <table class="schedule">
        <thead><tr><th>회차</th><th>필기 접수</th><th>필기시험</th><th>필기 발표</th><th>실기 접수</th><th>실기시험</th><th>실기 발표</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${s.note ? `<p class="muted small">${esc(s.note)}</p>` : ""}`;
}

function renderGuide() {
  app.innerHTML = `
    <div class="card">
      <div class="section" style="margin-top:0">${scheduleHtml()}</div>
      ${DATA.guide.map((g) => `
        <div class="section">
          <h4>${esc(g.title)}</h4>
          <ul class="plain">${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          ${g.title.startsWith("의무검정") ? `<div class="sub"><strong>추천 종목</strong>${mandatoryExamHtml()}</div>` : ""}
        </div>`).join("")}
    </div>
  `;
}

// ---------------- 취업처 ----------------

function companyListHtml() {
  if (!DATA.companies.length) return `<p class="empty">공채 정보는 준비 중입니다.</p>`;
  const items = DATA.companies.filter(matches);
  if (!items.length) return `<p class="empty">조건에 맞는 취업처가 없습니다.</p>`;
  return `<div class="list">${items.map((c) => `
    <a class="card" href="#/company/${esc(c.id)}">
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.description)}</p>
      <div class="meta">
        ${c.type ? `<span class="tag">${esc(c.type)}</span>` : ""}
        ${deptTags(c.departments)}
      </div>
    </a>`).join("")}</div>`;
}

function renderCompanies() {
  if (!DATA.companies.length) {
    app.innerHTML = companyListHtml();
    return;
  }
  app.innerHTML = `${filtersHtml("취업처 이름 검색")}<div class="list-wrap">${companyListHtml()}</div>`;
  bindFilters(renderCompanies, companyListHtml);
}

function companyRoadmapHtml(certIds, requiredIds) {
  const certs = certIds.map(certById).filter(Boolean);
  // 선수 자격증도 로드맵에 함께 표시
  certs.slice().forEach((c) =>
    (c.prerequisites ?? []).forEach((p) => {
      const pc = certById(p);
      if (pc && !certs.includes(pc)) certs.push(pc);
    })
  );
  const years = [1, 2, 3].map((g) => {
    const inYear = certs.filter((c) => c.grade === g);
    const items = inYear.length
      ? inYear.map((c) => {
          const kind = requiredIds.includes(c.id) ? "필수" : certIds.includes(c.id) ? "우대" : "선수 과정";
          return `<a class="item" href="#/certificate/${esc(c.id)}">${esc(c.name)}<small>${esc(c.term)} · ${kind}</small></a>`;
        }).join("")
      : `<div class="none">해당 없음</div>`;
    return `<div class="year"><div class="label">${g}학년</div>${items}</div>`;
  });
  return `<div class="roadmap">${years.join("")}</div>`;
}

function renderCompany(id) {
  const c = companyById(id);
  if (!c) return renderNotFound();
  const required = c.certificates?.required ?? [];
  const preferred = c.certificates?.preferred ?? [];

  app.innerHTML = `
    <a class="back" href="#/companies">← 취업처 목록</a>
    <div class="detail card">
      <h2>${esc(c.name)}</h2>
      <p class="lead">${esc(c.description)}</p>
      <div class="meta">
        ${c.type ? `<span class="tag">${esc(c.type)}</span>` : ""}
        ${deptTags(c.departments)}
      </div>

      <div class="section">
        <h4>요구 조건</h4>
        <table class="table">
          <tr><th>필수 자격증</th><td><div class="meta" style="margin:0">${certLinks(required, "required") || "-"}</div></td></tr>
          <tr><th>우대 자격증</th><td><div class="meta" style="margin:0">${certLinks(preferred, "preferred") || "-"}</div></td></tr>
          ${(c.requirements ?? []).map((r) => `<tr><th>${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("")}
        </table>
      </div>

      <div class="section">
        <h4>학년별 자격증 로드맵</h4>
        ${companyRoadmapHtml([...required, ...preferred], required)}
      </div>

      ${c.notes ? `<div class="section"><h4>참고 사항</h4><p>${esc(c.notes)}</p></div>` : ""}
    </div>
  `;
}

// ---------------- 자격증 ----------------

function certListHtml() {
  const items = DATA.certificates.filter(matches);
  if (!items.length) return `<p class="empty">조건에 맞는 자격증이 없습니다.</p>`;
  return [1, 2, 3].map((g) => {
    const inYear = items.filter((c) => c.grade === g);
    if (!inYear.length) return "";
    return `
      <div class="section"><h4>${g}학년</h4>
      <div class="list">${inYear.map((c) => `
        <a class="card" href="#/certificate/${esc(c.id)}">
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.term)}</p>
          <div class="meta">${deptTags(c.departments)}</div>
        </a>`).join("")}</div></div>`;
  }).join("");
}

function renderCertificates() {
  app.innerHTML = `${filtersHtml("자격증 이름 검색")}<div class="list-wrap">${certListHtml()}</div>`;
  bindFilters(renderCertificates, certListHtml);
}

function renderCertificate(id) {
  const c = certById(id);
  if (!c) return renderNotFound();
  const usedBy = DATA.companies.filter((co) =>
    (co.certificates?.required ?? []).includes(c.id) || (co.certificates?.preferred ?? []).includes(c.id)
  );

  app.innerHTML = `
    <a class="back" href="#/certificates">← 자격증 목록</a>
    <div class="detail card">
      <h2>${esc(c.name)}</h2>
      <p class="lead">${esc(c.description)}</p>
      <div class="meta">${deptTags(c.departments)}</div>

      <div class="section">
        <table class="table">
          <tr><th>취득 시기</th><td>${esc(c.term)}</td></tr>
          <tr><th>시행</th><td>${esc(c.org)}</td></tr>
          <tr><th>시험 구성</th><td>${esc(c.exam)}</td></tr>
          <tr><th>시험 일정</th><td>${esc(c.schedule)}</td></tr>
          ${c.prerequisites?.length ? `<tr><th>먼저 취득</th><td><div class="meta" style="margin:0">${certLinks(c.prerequisites)}</div></td></tr>` : ""}
          ${c.related?.length ? `<tr><th>연계 자격증</th><td><div class="meta" style="margin:0">${certLinks(c.related)}</div></td></tr>` : ""}
        </table>
      </div>

      ${c.howto?.length ? `
      <div class="section">
        <h4>취득 방법</h4>
        <ul class="plain">${c.howto.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      </div>` : ""}

      ${c.notes?.length ? `
      <div class="section">
        <h4>참고 사항</h4>
        <ul class="plain">${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      </div>` : ""}

      ${usedBy.length ? `
      <div class="section">
        <h4>이 자격증이 필요한 취업처</h4>
        <div class="meta">${usedBy.map((co) => {
          const req = (co.certificates?.required ?? []).includes(c.id);
          return `<a class="tag ${req ? "required" : "preferred"}" href="#/company/${esc(co.id)}">${esc(co.name)} (${req ? "필수" : "우대"})</a>`;
        }).join("")}</div>
      </div>` : ""}
    </div>
  `;
}

function renderNotFound() {
  app.innerHTML = `<p class="empty">페이지를 찾을 수 없습니다. <a class="back" href="#/">처음으로</a></p>`;
}

// ---------------- 라우팅 ----------------

function route() {
  const [, page, id] = (location.hash || "#/").split("/");
  const tab = { certificate: "certificates", certificates: "certificates", guide: "guide",
                company: "companies", companies: "companies" }[page] ?? "roadmap";
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));

  if (page === "company" && id) renderCompany(decodeURIComponent(id));
  else if (page === "certificate" && id) renderCertificate(decodeURIComponent(id));
  else if (page === "certificates") renderCertificates();
  else if (page === "companies") renderCompanies();
  else if (page === "guide") renderGuide();
  else renderRoadmap();
  window.scrollTo(0, 0);
}

document.getElementById("school-name").textContent = DATA.school;
document.getElementById("foot").textContent = `${DATA.school} · 최종 수정 ${DATA.updated}`;
window.addEventListener("hashchange", route);
route();
