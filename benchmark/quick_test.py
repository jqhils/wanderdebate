"""quick_test.py -- Validate setup before running full benchmark."""
import json, sys
from wanderdebate_adapter import parse_query, convert_to_travelplanner, build_travelplanner_constraint

def test_parsing():
    print("="*50); print("TEST 1: Query Parsing"); print("="*50)
    cases = [
        ("Please create a travel plan for me where I'll be departing from Washington and heading to Myrtle Beach for a 3-day trip from March 13th to March 15th, 2022. Can you help me keep this journey within a budget of $1,400?",
         {"days": 3, "budget": 1400}),
    ]
    ok = True
    for q, expected in cases:
        p = parse_query(q)
        print(f"\n  {q[:60]}...")
        print(f"  -> {p['origin']} -> {p['destination']} | {p['days']}d | ${p['budget']}")
        for k, v in expected.items():
            if p.get(k) != v: print(f"  FAIL {k}: expected {v}, got {p.get(k)}"); ok = False
    print(f"\n  {'PASS' if ok else 'FAIL'}")
    return ok

def test_dataset():
    print("\n"+"="*50); print("TEST 2: HuggingFace Dataset"); print("="*50)
    try:
        from datasets import load_dataset
        data = load_dataset("osunlp/TravelPlanner", "validation")["validation"]
        print(f"  {len(data)} validation queries"); print(f"  Keys: {list(data[0].keys())}")
        print("  PASS"); return True
    except Exception as e: print(f"  FAIL: {e}"); return False

def test_ref_info():
    print("\n"+"="*50); print("TEST 3: Reference Info JSONL"); print("="*50)
    import os
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "TravelPlanner", "database", "validation_ref_info.jsonl")
    if not os.path.exists(path): print(f"  FAIL: {path} not found"); return False
    with open(path) as f: first = json.loads(f.readline())
    print(f"  Type: {type(first).__name__}"); print(f"  Snippet: {json.dumps(first)[:200]}...")
    print("  PASS"); return True

def test_format():
    print("\n"+"="*50); print("TEST 4: Format Conversion"); print("="*50)
    mock = {"final_version": {"days": [
        {"theme": "Arrival", "activities": [
            {"id":"a1","title":"Fly to Myrtle Beach","category":"transit","location":"Myrtle Beach"},
            {"id":"a2","title":"SkyWheel","category":"landmark","location":"Myrtle Beach"},
            {"id":"a3","title":"Sea Captain's House","category":"dinner","location":"Myrtle Beach"},
            {"id":"a4","title":"Beach House Inn","category":"accommodation","location":"Myrtle Beach"},
        ]},
        {"theme": "Beach Day", "activities": [
            {"id":"b1","title":"Johnny D's","category":"breakfast","location":"Myrtle Beach"},
            {"id":"b2","title":"Ripley's Aquarium","category":"landmark","location":"Myrtle Beach"},
        ]},
    ]}}
    parsed = {"origin":"Washington","destination":"Myrtle Beach","days":2,"budget":1400}
    result = convert_to_travelplanner(1, "test", mock, parsed)
    if not result["plan"]: print("  FAIL: no plan"); return False
    assert result["plan"][-1]["accommodation"] == "-"
    print(f"  Day 1: {json.dumps(result['plan'][0])[:200]}"); print("  PASS"); return True

def main():
    dry = "--dry-run" in sys.argv
    tests = {"Parsing": test_parsing(), "Dataset": test_dataset(), "RefInfo": test_ref_info(), "Format": test_format()}
    print("\n"+"="*50); print("SUMMARY"); print("="*50)
    for n, ok in tests.items(): print(f"  {n:15s} {'PASS' if ok else 'FAIL'}")
    if all(tests.values()):
        print(f"\n  Ready! Run:")
        print(f"    python wanderdebate_adapter.py --mode sole-planning --set_type validation --max-queries 3")
    return 0 if all(tests.values()) else 1

if __name__ == "__main__": sys.exit(main())
