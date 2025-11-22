const postsContainer = document.getElementById("posts");
const form = document.getElementById("post-form");
const charCount = document.getElementById("char-count");
const searchInput = document.getElementById("search");
const sortBtn = document.getElementById("sort-btn");
const clearBtn = document.getElementById("clear-btn");
const resetBtn = document.getElementById("reset-btn");
const tagCloud = document.getElementById("tag-cloud");

const preview = {
  title: document.getElementById("preview-title"),
  author: document.getElementById("preview-author"),
  content: document.getElementById("preview-content"),
  tags: document.getElementById("preview-tags"),
  date: document.getElementById("preview-date"),
};

const metrics = {
  posts: document.getElementById("metric-posts"),
  readers: document.getElementById("metric-readers"),
};

const storageKey = "open-ledger-posts";

const seedPosts = [
  {
    id: crypto.randomUUID(),
    title: "Як тримати seed-фрази у безпеці",
    author: "Марина",
    tags: ["безпека", "гайд"],
    content:
      "Поділилася простими порадами, як не загубити seed-фразу та не зберігати її у хмарі. Від паперових копій до сейфів — працює все, що дає фізичну ізоляцію.",
    createdAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: "Ethereum Layer 2 для початківців",
    author: "Роман",
    tags: ["ethereum", "layer2", "оптимізація"],
    content:
      "Короткий огляд rollups, з чого почати робити перші транзакції в Optimism та Arbitrum і як не переплачувати за газ.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

let posts = loadPosts();
let sortNewest = true;
let activeTagFilter = null;

function loadPosts() {
  const stored = localStorage.getItem(storageKey);
  if (!stored) {
    return seedPosts;
  }

  try {
    const parsed = JSON.parse(stored);
    return parsed.length ? parsed : seedPosts;
  } catch (error) {
    console.error("Cannot parse stored posts", error);
    return seedPosts;
  }
}

function persistPosts() {
  localStorage.setItem(storageKey, JSON.stringify(posts));
}

function parseTags(tagString) {
  return tagString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
  });
}

function readingTime(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function renderTags(tags, target) {
  target.innerHTML = "";
  tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = `#${tag}`;
    span.addEventListener("click", () => {
      activeTagFilter = tag;
      searchInput.value = "";
      renderPosts();
    });
    target.appendChild(span);
  });
}

function updatePreview() {
  const title = form.title.value.trim();
  const author = form.author.value.trim() || "Гість";
  const content = form.content.value.trim();
  const tags = parseTags(form.tags.value);

  preview.title.textContent = title || "Ще без назви";
  preview.author.textContent = `Автор: ${author}`;
  preview.content.textContent = content || "Почніть вводити текст, щоб побачити, як виглядатиме ваша публікація.";
  preview.date.textContent = formatDate(new Date().toISOString());
  renderTags(tags, preview.tags);
}

function buildCard(post) {
  const card = document.createElement("article");
  card.className = "post-card";

  const title = document.createElement("h3");
  title.textContent = post.title;
  card.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<span>${post.author || "Гість"}</span><span>${formatDate(post.createdAt)}</span><span>${readingTime(
    post.content
  )} хв читання</span>`;
  card.appendChild(meta);

  const excerpt = document.createElement("p");
  excerpt.textContent = post.content.length > 160 ? `${post.content.slice(0, 158)}…` : post.content;
  card.appendChild(excerpt);

  const tagBar = document.createElement("div");
  tagBar.className = "tags";
  renderTags(post.tags, tagBar);
  card.appendChild(tagBar);

  return card;
}

function filteredPosts() {
  const query = searchInput.value.toLowerCase();

  return posts
    .filter((post) => {
      const matchesQuery = post.title.toLowerCase().includes(query) || post.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesTag = activeTagFilter ? post.tags.includes(activeTagFilter) : true;
      return matchesQuery && matchesTag;
    })
    .sort((a, b) =>
      sortNewest ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

function renderPosts() {
  postsContainer.innerHTML = "";
  const visible = filteredPosts();

  metrics.posts.textContent = visible.length.toString();
  metrics.readers.textContent = (2184 + visible.length * 4).toLocaleString("uk-UA");

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Нічого не знайдено. Спробуйте інші теги чи заголовок.";
    postsContainer.appendChild(empty);
    return;
  }

  visible.forEach((post) => postsContainer.appendChild(buildCard(post)));
  renderTagCloud();
}

function renderTagCloud() {
  const tags = Array.from(new Set(posts.flatMap((p) => p.tags)));
  tagCloud.innerHTML = "";

  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = `#${tag}`;
    btn.ariaPressed = activeTagFilter === tag;
    btn.addEventListener("click", () => {
      activeTagFilter = activeTagFilter === tag ? null : tag;
      searchInput.value = "";
      renderPosts();
    });
    tagCloud.appendChild(btn);
  });
}

form.addEventListener("input", (event) => {
  if (event.target.id === "content") {
    charCount.textContent = `${event.target.value.length} символів`;
  }
  updatePreview();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = form.title.value.trim();
  const author = form.author.value.trim() || "Гість";
  const tags = parseTags(form.tags.value);
  const content = form.content.value.trim();

  if (!title || !content) {
    return;
  }

  const newPost = {
    id: crypto.randomUUID(),
    title,
    author,
    tags,
    content,
    createdAt: new Date().toISOString(),
  };

  posts = [newPost, ...posts];
  persistPosts();
  renderPosts();
  form.reset();
  charCount.textContent = "0 символів";
  activeTagFilter = null;
  updatePreview();
});

searchInput.addEventListener("input", () => {
  activeTagFilter = null;
  renderPosts();
});

sortBtn.addEventListener("click", () => {
  sortNewest = !sortNewest;
  sortBtn.textContent = sortNewest ? "Спочатку нові" : "Спочатку старі";
  renderPosts();
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  activeTagFilter = null;
  sortNewest = true;
  sortBtn.textContent = "Спочатку нові";
  renderPosts();
});

resetBtn.addEventListener("click", () => {
  form.reset();
  charCount.textContent = "0 символів";
  updatePreview();
});

updatePreview();
renderPosts();
