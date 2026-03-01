"""
wanderdebate_adapter.py - Benchmarks WanderDebate vs TravelPlanner (ICML'24).

THE SANDBOX PROBLEM:
  TravelPlanner's eval checks venues exist in THEIR database, not the real world.
  FIX: In sole-planning mode, we inject TravelPlanner's reference_information
  as user constraints so agents pick from those specific venues.

Usage:
    python wanderdebate_adapter.py --mode sole-planning --set_type validation --max-queries 3
    python wanderdebate_adapter.py --mode sole-planning --set_type validation
    python wanderdebate_adapter.py --mode sole-planning --set_type validation --dry-run
"""

import argparse, json, os, re, sys, time, requests
from datasets import load_dataset

BASE_URL = os.environ.get("WANDERDEBATE_URL", "http://localhost:3000")
DELAY_BETWEEN_TURNS = 2
DELAY_BETWEEN_QUERIES = 3
REQUEST_TIMEOUT = 180

def parse_query(query: str) -> dict:
    info = {"origin": None, "destination": None, "days": None, "budget": None,
            "num_people": 1, "num_cities": 1}
    m = re.search(r'\$([0-9,]+)', query)
    if m: info["budget"] = int(m.group(1).replace(",", ""))
    m = re.search(r'(\d+)[- ]day', query)
    if m: info["days"] = int(m.group(1))
    m = re.search(r'(?:departing|starting|leaving|depart|start|begins?|commenc)\w*\s+(?:from|in)\s+([A-Z][a-zA-Z\s\.]+?)(?:\s+and|\s+to|\s+heading|\s+visiting|\s+for|\s+,)', query)
    if m: info["origin"] = m.group(1).strip().rstrip(",.")
    m = re.search(r'(?:heading|going|traveling|visiting|to|covering)\s+(?:to\s+)?([A-Z][a-zA-Z\s\.]+?)(?:\s+for|\s+from|\s+spanning|\s+,|\s+between|\s+with|\s+lasting|\s+that|\s+intending|\s+taking|\.|$)', query)
    if m: info["destination"] = m.group(1).strip().rstrip(",.")
    m = re.search(r'(?:visiting|covering|visit)\s+(\d+)\s+(?:\w+\s+)?cit', query)
    if m: info["num_cities"] = int(m.group(1))
    m = re.search(r'(\d+)\s+(?:person|people|traveler)', query)
    if m: info["num_people"] = int(m.group(1))
    return info

def build_travelplanner_constraint(query, parsed, reference_info):
    budget_str = f"${parsed['budget']}" if parsed['budget'] else "not specified"
    return f"""=== TRAVEL PLANNING BENCHMARK TASK ===
ORIGINAL REQUEST: {query}

HARD CONSTRAINTS (must satisfy ALL):
- Budget: {budget_str} total (including flights, hotels, meals, transport)
- Trip: {parsed.get('days','?')} days, {parsed.get('num_people',1)} traveler(s)
- Origin city: {parsed.get('origin','?')}
- Number of destination cities to visit: {parsed.get('num_cities',1)}
- Trip must be a round trip (return to origin)
- Last day: accommodation must be "-" (going home)
- No duplicate restaurants across the entire trip
- No duplicate attractions across the entire trip
- Transportation must be consistent (don't mix self-driving with flights)
- Every non-travel day must have breakfast, lunch, dinner, and at least 1 attraction
- Travel days (with "from X to Y") must have transportation specified

CRITICAL: You MUST select restaurants, attractions, flights, and accommodations
ONLY from the reference database below. Do NOT invent or hallucinate venues.
Use the EXACT names as they appear in the database.

FORMAT REQUIREMENTS:
- Restaurants: "Restaurant Name, City"
- Attractions: "Attraction Name, City" (separate multiple with ";")
- Flights: "Flight Number: FXXXXXXX, from CityA to CityB, Departure Time: HH:MM, Arrival Time: HH:MM"
- Self-driving: "self-driving, from CityA to CityB, duration: X hours, distance: Z km, cost: $N"
- Accommodation: "Accommodation Name, City"

=== REFERENCE DATABASE (use ONLY these options) ===
{reference_info}
=== END REFERENCE DATABASE ==="""

class WanderDebateClient:
    def __init__(self, base_url=BASE_URL):
        self.base = base_url.rstrip("/")
        self.s = requests.Session()
        self.s.headers["Content-Type"] = "application/json"

    def _post(self, path, body):
        r = self.s.post(f"{self.base}{path}", json=body, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        return r.json()

    def create_session(self, destination, duration_hours):
        data = self._post("/api/sessions", {"destination": destination, "durationHours": duration_hours, "agents": ["flaneur","completionist","master"]})
        sid = data.get("id")
        if not sid: raise RuntimeError(f"No session ID: {data}")
        return sid

    def inject_constraint(self, sid, content):
        return self._post("/api/debate/user-input", {"sessionId": sid, "content": content})

    def propose(self, sid, agent, version):
        return self._post("/api/debate/propose", {"sessionId": sid, "agentId": agent, "versionNumber": version})

    def merge(self, sid, version):
        return self._post("/api/debate/merge", {"sessionId": sid, "versionNumber": version})

    def critique(self, sid, agent, version):
        return self._post("/api/debate/critique", {"sessionId": sid, "agentId": agent, "versionNumber": version})

    def run_debate_for_benchmark(self, destination, duration_hours, constraint, skip_grounding=True):
        sid = self.create_session(destination, duration_hours)
        print(f"    Session: {sid[:12]}...")
        print(f"    -> Injecting constraints...", end=" ", flush=True)
        try:
            self.inject_constraint(sid, constraint)
            print("ok")
        except Exception as e:
            print(f"WARN {e}")

        steps = [
            ("Flaneur propose",       lambda: self.propose(sid, "flaneur", 0)),
            ("Completionist propose", lambda: self.propose(sid, "completionist", 1)),
            ("Master merge",          lambda: self.merge(sid, 2)),
            ("Flaneur critique",      lambda: self.critique(sid, "flaneur", 3)),
            ("Completionist critique",lambda: self.critique(sid, "completionist", 4)),
        ]
        last = None
        for name, fn in steps:
            print(f"    -> {name}...", end=" ", flush=True)
            t0 = time.time()
            try:
                last = fn()
                print(f"ok ({time.time()-t0:.1f}s)")
            except Exception as e:
                print(f"FAIL ({time.time()-t0:.1f}s) -- {e}")
                break
            time.sleep(DELAY_BETWEEN_TURNS)
        return {"session_id": sid, "final_version": last.get("version", {}) if last else {}}

def convert_to_travelplanner(idx, query, wd, parsed):
    version = wd.get("final_version", {})
    days_data = version.get("days", [])
    if not days_data: return {"idx": idx, "query": query, "plan": None}
    plan = []
    origin = parsed.get("origin", "")
    dest = parsed.get("destination", "")
    for di, day in enumerate(days_data):
        day_num = di + 1
        activities = day.get("activities", [])
        meals = {"breakfast": "-", "lunch": "-", "dinner": "-"}
        attractions = []
        transports = []
        accommodation = "-"
        for a in activities:
            cat = (a.get("category") or "").lower()
            name = a.get("title", "")
            city = _extract_city(a, dest)
            fmt = f"{name}, {city}" if city else name
            if cat in ("breakfast","lunch","dinner"):
                meals[cat] = fmt
            elif cat in ("food","restaurant","cafe","dining","meal"):
                hour = _parse_hour(a.get("timeBlock","") or "")
                if hour is not None and hour < 11: meals["breakfast"] = fmt
                elif hour is not None and hour < 15: meals["lunch"] = fmt
                else: meals["dinner"] = fmt
            elif cat in ("transit","transport","transportation","travel","flight"):
                transports.append(_format_transport(name))
            elif cat in ("accommodation","hotel","stay","lodging","sleep","airbnb","hostel"):
                accommodation = fmt
            else:
                attractions.append(fmt)
        if day_num == 1 and origin: current_city = f"from {origin} to {dest}"
        else: current_city = dest
        plan.append({
            "day": day_num, "current_city": current_city,
            "transportation": "; ".join(transports) if transports else "-",
            "breakfast": meals["breakfast"],
            "attraction": ";".join(attractions) + ";" if attractions else "-",
            "lunch": meals["lunch"], "dinner": meals["dinner"],
            "accommodation": accommodation if day_num < len(days_data) else "-",
        })
    return {"idx": idx, "query": query, "plan": plan}

def _extract_city(activity, default_city):
    loc = activity.get("location", "")
    if loc and "," in loc: return loc.split(",")[0].strip()
    if loc: return loc
    return default_city

def _format_transport(name):
    nl = name.lower()
    if "flight" in nl or "fly" in nl:
        m = re.search(r'F\d{7}', name)
        fnum = m.group(0) if m else "F0000000"
        return f"Flight Number: {fnum}, {name}"
    elif any(kw in nl for kw in ("driv","taxi","uber","car")):
        return f"self-driving, {name}"
    return name

def _parse_hour(time_str):
    if not time_str: return None
    m = re.match(r'(\d{1,2}):(\d{2})', time_str)
    if m:
        h = int(m.group(1))
        if "pm" in time_str.lower() and h < 12: h += 12
        return h
    return None

def load_ref_info(travelplanner_dir, set_type):
    path = os.path.join(travelplanner_dir, "database", f"{set_type}_ref_info.jsonl")
    if not os.path.exists(path):
        print(f"  WARNING: {path} not found")
        return []
    data = []
    with open(path, 'r') as f:
        for line in f.read().strip().split('\n'):
            data.append(json.loads(line))
    print(f"  -> Loaded {len(data)} reference info entries from {path}")
    return data

def run_benchmark(mode, set_type, max_queries=None, dry_run=False):
    print(f"\n{'='*60}")
    print(f"  WanderDebate x TravelPlanner Benchmark")
    print(f"  Mode: {mode} | Set: {set_type}")
    print(f"{'='*60}\n")

    print("[1/3] Loading TravelPlanner dataset...")
    data = load_dataset("osunlp/TravelPlanner", set_type)[set_type]
    total = min(len(data), max_queries) if max_queries else len(data)
    print(f"  -> {len(data)} queries, running {total}")

    # Load reference info from JSONL files
    tp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "TravelPlanner")
    ref_info_list = []
    if mode == "sole-planning":
        ref_info_list = load_ref_info(tp_dir, set_type)

    if not dry_run:
        print("\n[2/3] Checking WanderDebate server...")
        try:
            requests.get(BASE_URL, timeout=5)
            print(f"  -> {BASE_URL} ok\n")
        except Exception:
            print(f"  -> FAIL: Can't reach {BASE_URL}")
            print(f"    Start: cd ~/wanderdebate && npm run dev\n")
            sys.exit(1)

    client = WanderDebateClient(BASE_URL)
    results = []
    ok = fail = 0

    print(f"[3/3] Running benchmark...\n")
    bench_start = time.time()

    for i in range(total):
        entry = data[i]
        idx = entry.get("idx", i + 1)
        query = entry["query"]
        parsed = parse_query(query)
        days = parsed["days"] or 3
        destination = parsed["destination"] or "Unknown"
        duration_hours = days * 24

        print(f"[{i+1}/{total}] idx={idx}")
        print(f"  {query[:90]}...")
        print(f"  -> {parsed['origin']} -> {destination} | {days}d | ${parsed.get('budget','?')}")

        if dry_run:
            results.append({"idx": idx, "query": query, "plan": None})
            continue

        ref_info = ""
        if mode == "sole-planning" and i < len(ref_info_list):
            ref_raw = ref_info_list[i]
            ref_info = json.dumps(ref_raw, indent=2) if isinstance(ref_raw, (dict,list)) else str(ref_raw)
            if len(ref_info) > 30000: ref_info = ref_info[:30000] + "\n... [truncated]"
            print(f"  -> Reference info: {len(ref_info)} chars")

        constraint = build_travelplanner_constraint(query, parsed, ref_info) if ref_info else f"Plan a trip: {query}"

        try:
            t0 = time.time()
            wd = client.run_debate_for_benchmark(destination, duration_hours, constraint)
            result = convert_to_travelplanner(idx, query, wd, parsed)
            if result["plan"]:
                ok += 1; print(f"  OK {len(result['plan'])}-day plan ({time.time()-t0:.0f}s)")
            else:
                fail += 1; print(f"  FAIL no plan ({time.time()-t0:.0f}s)")
            results.append(result)
        except Exception as e:
            fail += 1; results.append({"idx": idx, "query": query, "plan": None})
            print(f"  FAIL: {e}")
        time.sleep(DELAY_BETWEEN_QUERIES)

    out = f"wanderdebate_{mode}_submission.jsonl"
    with open(out, "w") as f:
        for r in results: f.write(json.dumps(r) + "\n")

    print(f"\n{'='*60}")
    print(f"  DONE -- {(time.time()-bench_start)/60:.1f} min")
    print(f"  Success: {ok} | Failed: {fail} | Output: {out}")
    print(f"\n  Evaluate:")
    print(f"    cd ../TravelPlanner/evaluation")
    print(f"    python eval.py --set_type {set_type} --evaluation_file_path ../../benchmark/{out}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["sole-planning","two-stage"], required=True)
    p.add_argument("--set_type", choices=["validation","test"], default="validation")
    p.add_argument("--max-queries", type=int, default=None)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--url", type=str, default=None)
    args = p.parse_args()
    if args.url: BASE_URL = args.url
    run_benchmark(args.mode, args.set_type, args.max_queries, args.dry_run)
