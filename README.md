# HandoffHQ — Sales-to-Delivery Handover Command Center

**HandoffHQ** centralizes client deal handovers for digital agencies and enforces an explainable, deterministic **6-Gate Readiness Engine** before the delivery team accepts responsibility.

---

## 1. Differentiator: Deterministic 6-Gate Readiness Engine

Unlike generic CRMs or LLM-based guesswork, HandoffHQ evaluates six deterministic operational rules (`src/lib/readinessEngine.js`) on every change and before every state transition:

| Gate ID | Rule Title | Deterministic Pass Condition |
| :--- | :--- | :--- |
| **R-01** | **Commercial & Timeline Baseline** | Non-empty `client_name` (`>= 2` chars), positive `deal_value > 0`, and valid `target_launch_date` (`YYYY-MM-DD`). |
| **R-02** | **Detailed Scope Summary** | `scope_summary` contains at least **30 non-whitespace characters**. |
| **R-03** | **Agreed Deliverables** | At least **2 deliverables**, each with a valid title (`>= 3` chars) and valid `due_date` (`YYYY-MM-DD`). |
| **R-04** | **Mandatory Client Dependencies** | At least **1 mandatory dependency** exists, and **all** mandatory dependencies have `is_resolved === true`. |
| **R-05** | **Supporting Documents Linked** | At least **1 document link** with a label (`>= 2` chars) and a valid `http://` or `https://` URL. |
| **R-06** | **Assigned Delivery Owner** | Both `delivery_owner_id` and `delivery_owner_name` are assigned. |

---

## 2. Handover Lifecycle & Role Rules (`src/lib/workflowRules.js`)

1. **`Draft` / `Blocked` → `Ready for Delivery`**
   - Requires **all 6 gates passed (100%)** and active persona role in `['sales', 'ops']`.
2. **Auto-Downgrade Guard (`Ready for Delivery` → `Blocked`)**
   - If an editable handover in `Ready for Delivery` is modified such that any gate fails (`passedCount < 6`), it automatically reverts to `Blocked` and logs the downgrade reason.
3. **`Ready for Delivery` → `Handed Over` (Accept) or `Blocked` (Send Back)**
   - Permitted only for `['delivery', 'ops']`.
   - **Send Back to Sales** requires a non-empty reason (`>= 5` characters).
   - **Accept & Complete Handover** locks the record into **`Handed Over`** (strictly read-only in the MVP).

---

## 3. The 60-Second Judge Demo Flow ("Acme Website Redesign")

1. **Open the Dashboard** as **Aarav Mehta (Sales)** and click **Acme Website Redesign ($45,000)** (`Blocked` — `3/6 Gates Passed, 50%`).
2. **Inspect the 3 Explainable Blockers** in the right-hand Readiness Engine panel (`R-02`, `R-04`, `R-06`).
3. **Resolve all 3 Blockers in seconds:**
   - Click **`✨ Insert Full Scope Summary`** (resolves **R-02**).
   - Check **`Production DNS & Webflow Workspace Admin Access`** in Section 3 (resolves **R-04**).
   - Select **`Priya Nair (Delivery Lead)`** in the Delivery Owner dropdown in Section 1 (resolves **R-06**).
4. **Mark Ready:** Click **`🚀 Mark Ready for Delivery (6/6 Passed)`**.
5. **Switch Persona & Accept:** Switch the top-bar persona to **`Priya Nair (Delivery)`** and click **`✅ Accept & Complete Handover`**. Observe the read-only lock and **Handover Activity History**.
6. **Replay Anytime:** Click **`Reset Demo Data`** in the top bar to restore all 4 seeded handovers in one click.

---

## 4. Quick Start & Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated unit tests (Readiness Engine, Workflow Rules, Service Layer)
npm test

# 3. Start local development server
npm run dev

# 4. Build for production
npm run build
```

---

## 5. Persistence & Security Notes (`LOCAL_DEMO` vs. `SUPABASE_CONNECTED`)

- **`LOCAL_DEMO` Mode (Default / Zero-Config):** Works out of the box using browser `localStorage` (`handoffhq_v1_handovers`).
- **`SUPABASE_CONNECTED` Mode (Optional Cloud Persistence):**
  1. Create a free Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
  2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Important Security Limitations:**
  - Never place a Supabase `service_role` or `sb_secret_` key in `.env` or browser code. `src/lib/supabaseClient.js` actively detects and rejects `service_role` keys.
  - The RLS policies in `supabase/schema.sql` permit anonymous `SELECT`, `INSERT`, and `UPDATE` (while forbidding `DELETE`) so hackathon judges can test role switching without a login wall. **This configuration is for public hackathon demos with fictional data only and is unsafe for real or sensitive client data.**
  - Activity history is an application-level demo history, not a tamperproof cryptographic audit log.

