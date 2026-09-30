import sys
from datetime import datetime
from license_manager import create_license

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python license_tool.py <licensee> <YYYY-MM-DD_from> <YYYY-MM-DD_until>")
        sys.exit(1)
    licensee = sys.argv[1]
    valid_from = datetime.fromisoformat(sys.argv[2])
    valid_until = datetime.fromisoformat(sys.argv[3])
    lic = create_license(licensee, valid_from, valid_until)
    filename = f"license_{licensee.replace(' ', '_')}.lic"
    with open(filename, "w") as f:
        f.write(lic)
    print(f"✅ License file created: {filename}")
    print(f"   Valid from : {valid_from.date()}")
    print(f"   Valid until: {valid_until.date()}")
