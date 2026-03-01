"""compare_results.py -- Show WanderDebate vs TravelPlanner baselines."""
import argparse
BASELINES = {
    "GPT-3.5-Turbo + Direct":    (100.0,42.7,0.0,13.3,3.3,0.0),
    "GPT-3.5-Turbo + CoT":       (100.0,48.3,0.6,8.6,1.7,0.0),
    "GPT-4-Turbo + Direct":      (100.0,52.5,4.4,17.5,2.8,0.6),
    "GPT-4-Turbo + Reflexion":   (100.0,55.3,5.0,16.2,5.6,2.2),
    "Gemini Pro + Direct":        (100.0,39.4,1.1,12.2,2.8,0.0),
    "Mistral-7B-32K + Direct":    (100.0,20.7,0.0,3.3,0.0,0.0),
    "Llama3.1-8B + SFT":         (100.0,78.3,17.8,19.3,6.1,3.8),
}
def print_table(wd):
    hdr = f"{'Model':<35} {'Dlvr':>5} {'CS-u':>5} {'CS-M':>5} {'H-u':>5} {'H-M':>5} {'Pass':>5}"
    print(f"\n{'='*len(hdr)}"); print("TravelPlanner Sole-Planning (Validation)"); print(f"{'='*len(hdr)}\n"); print(hdr); print("-"*len(hdr))
    for model, s in BASELINES.items():
        d,cm,cM,hm,hM,fp = s; print(f"{model:<35} {d:>4.0f}% {cm:>4.1f}% {cM:>4.1f}% {hm:>4.1f}% {hM:>4.1f}% {fp:>4.1f}%")
    print("-"*len(hdr))
    for name, s in wd.items():
        d,cm,cM,hm,hM,fp = s; print(f"\033[1m{name:<35} {d:>4.0f}% {cm:>4.1f}% {cM:>4.1f}% {hm:>4.1f}% {hM:>4.1f}% {fp:>4.1f}%\033[0m")
    if wd:
        fp = list(wd.values())[0][5]
        if fp > 3.8: print("\nBEATS Llama3.1 fine-tuned (3.8%)")
        elif fp > 0.6: print("\nBeats GPT-4-Turbo Direct (0.6%)")
        elif fp > 0: print("\nSome plans pass")
        else: print("\n0% -- check format conversion")

if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("--interactive", action="store_true"); args = p.parse_args()
    wd = {}
    if args.interactive:
        try:
            d=float(input("Delivery Rate (%): ") or "0"); cm=float(input("CS Micro (%): ") or "0")
            cM=float(input("CS Macro (%): ") or "0"); hm=float(input("Hard Micro (%): ") or "0")
            hM=float(input("Hard Macro (%): ") or "0"); fp=float(input("Final Pass (%): ") or "0")
            wd["WanderDebate (Debate)"] = (d,cm,cM,hm,hM,fp)
        except: pass
    print_table(wd)
