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
    <table class="table">
      ${DATA.mandatoryExam.map((m) => `<tr><th>${esc(m.status)}</th><td>${esc(m.recommend)}${
        m.note ? `<div class="muted small">${esc(m.note)}</div>` : ""}</td></tr>`).join("")}
    </table>`;
}

function renderRoadmap() {
  const years = DATA.roadmap.map((y) => `
    <div class="year">
      <div class="label">${y.grade}학년</div>
      ${y.steps.map((s) => {
        const body = `<span class="step-type">${esc(s.type)}</span>${esc(s.text)}${s.when ? `<small>${esc(s.when)}</small>` : ""}`;
        return s.cert && certById(s.cert)
          ? `<a class="item" href="#/certificate/${esc(s.cert)}">${body}</a>`
          : `<div class="item">${body}</div>`;
      }).join("")}
    </div>`).join("");

  app.innerHTML = `
    <div class="card">
      <h2 class="page-title">${multiDept() ? "" : esc(DATA.departments[0]?.name ?? "") + " "}학년별 자격증 로드맵</h2>
      <p class="lead">항목을 누르면 자격증 상세 안내로 이동합니다.</p>
      <div class="section"><div class="roadmap">${years}</div></div>
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
