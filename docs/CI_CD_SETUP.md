# CI/CD Setup — HomePro Manager

## Trạng thái hiện tại: ✅ ACTIVE

### Pipeline hiện có (Vercel GitHub Integration)

```
git push main
    ↓
Vercel GitHub App (auto-triggered)
    ↓
npm ci → npm run build
    (Next.js build = TypeScript check + bundle)
    ↓
Build FAIL → ❌ Deploy cancelled (no downtime)
Build PASS → ✅ Deploy to production
```

**Xác nhận:** Mọi commit từ P1→P4 đã được verified qua pipeline này.

---

## GitHub Actions CI (chờ push)

File `D:\homepro\.github\workflows\ci.yml` đã sẵn sàng nhưng chưa push được do PAT thiếu `workflow` scope.

### Cách kích hoạt (1 trong 2):

**Option A — PAT mới:**
1. https://github.com/settings/tokens/new
2. Scopes: ✅ `repo` + ✅ `workflow`
3. Cung cấp token → agent push ngay

**Option B — GitHub UI (3 phút):**
1. https://github.com/dongquanghuy77-ctrl/homepro-manager/new/main
2. Filename: `.github/workflows/ci.yml`
3. Paste nội dung từ `D:\homepro\.github\workflows\ci.yml`
4. Commit → Done

---

## Vercel Production Protection

Sau khi GitHub Actions được push, bật **"Wait for CI"**:
1. Vercel Dashboard → Project → Settings → Git
2. **Deployment Protection Rules** → Enable
3. Required check: `build` (tên job trong ci.yml)

→ Khi đó: Build fail → CI fail → Vercel không deploy

---

## Secrets cần thiết

| Secret | Nơi | Giá trị |
|--------|-----|---------|
| `DATABASE_URL` | GitHub Secrets | NeonDB connection string |
| *(không cần thêm)* | Vercel | Đã có trong project env |

Thêm GitHub Secret tại:
https://github.com/dongquanghuy77-ctrl/homepro-manager/settings/secrets/actions
