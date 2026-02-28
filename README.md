# 🇮🇳 India Network Map

Interactive India State & District Map built using:

- ⚛️ React
- 🟦 TypeScript
- 🗺 Leaflet (Canvas Renderer)
- ⚡ Vite
- 🚀 Static Hosting via GitHub Pages

This project follows a **strict release discipline**:

- Source code lives only on `main`
- Every release is built and pushed to a dedicated branch: `vX.X.X`
- No production artifacts remain on `main`
- No untracked or unstaged files after release
- Fully reproducible builds

---

# 📦 Tech Stack

| Technology | Purpose |
|------------|----------|
| React | UI Framework |
| TypeScript | Type Safety |
| Leaflet | Map Rendering |
| Vite | Build Tool |
| Git | Versioning Strategy |

---

# 📁 Repository Structure

```
india-network-map/
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
│
├── scripts/
│   └── release.js
│
├── vite.config.ts
├── package.json
├── .gitignore
└── README.md
```

---

# 🌿 Branching Strategy

| Branch | Purpose |
|--------|----------|
| `main` | Source code only |
| `v1.0.0` | Production build snapshot |
| `v1.0.1` | Production build snapshot |
| `vX.X.X` | Immutable release branch |

Each version branch contains only:

```
index.html
assets/
```

No source code.

---

# 🧾 .gitignore (Required)

Ensure `.gitignore` contains:

```
node_modules/
dist/
dist-versions/
.env
.DS_Store
*.log
coverage/
```

> `dist/` must NEVER be committed to `main`.

---

# 🚀 Development Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/india-network-map.git
cd india-network-map
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Run Development Server

```bash
npm run dev
```

Application runs at:

```
http://localhost:5173
```

---

# 🏗 Production Build (Manual)

```bash
npm run build
```

Build output:

```
/dist
```

Preview:

```bash
npm run preview
```

---

# 🔐 Strict Release Workflow

This project enforces:

- Clean working directory
- Dedicated version branch
- No residual files
- Automatic tag creation
- Clean return to `main`

---

# 📌 Step-By-Step Release Guide

---

## ✅ 1. Ensure Working Directory Is Clean

```bash
git status
```

Must show:

```
nothing to commit, working tree clean
```

If not, commit or stash changes first.

---

## ✅ 2. Release Command

Choose version type:

```bash
npm run release:patch
```

or

```bash
npm run release:minor
```

or

```bash
npm run release:major
```

---

# 🔄 What Happens Automatically

The release process will:

1. Verify git working tree is clean
2. Bump version in `package.json`
3. Create Git tag
4. Build production bundle
5. Create orphan branch `vX.X.X`
6. Remove all files except `.git`
7. Copy `/dist` contents into branch root
8. Commit release
9. Push version branch to origin
10. Return to `main`
11. Clean any untracked files
12. Push tag to remote

---

# 📌 After Release

Check branches:

```bash
git branch
```

Example output:

```
* main
  v1.0.0
  v1.0.1
```

Check working directory:

```bash
git status
```

Must show:

```
nothing to commit, working tree clean
```

---

# 🌍 Deploying a Specific Version to GitHub Pages

1. Go to GitHub → Repository Settings
2. Navigate to **Pages**
3. Select branch: `vX.X.X`
4. Save

That specific version is now live.

---

# 📜 Available Scripts

| Command | Purpose |
|----------|----------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production |
| `npm run release:patch` | Patch release |
| `npm run release:minor` | Minor release |
| `npm run release:major` | Major release |

---

# 🏷 Versioning Strategy

Semantic Versioning:

```
MAJOR.MINOR.PATCH
```

Examples:

- `1.0.0` → Initial release
- `1.0.1` → Bug fix
- `1.1.0` → Feature
- `2.0.0` → Breaking change

Each release produces:

- Git tag
- Dedicated branch
- Immutable build snapshot

---

# 🧠 Clean Git Discipline Rules

Before every release:

```
git pull origin main
npm install
git status
```

Never:

- Commit `dist/` to main
- Release from dirty working tree
- Modify version branch manually

---

# 🔍 Verification Checklist

After release:

- `main` has only source code
- `vX.X.X` has only production files
- No untracked files
- Tag exists
- Branch pushed

---

# 📋 Requirements

- Node.js 18+
- npm 9+
- Git 2.25+

Check:

```bash
node -v
npm -v
git --version
```

---

# 🛡 Production Guarantees

This workflow guarantees:

- Reproducible releases
- Immutable version branches
- Clean repository state
- No artifact leakage
- No accidental staging
- Deterministic deployment

---

# 📬 Maintainer

YOUR_NAME  
YOUR_EMAIL  

---

# 📜 License

MIT